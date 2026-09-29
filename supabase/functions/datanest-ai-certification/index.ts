import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  allAutomatedCertificationGatesPassed,
  allCertificationGatesPassed,
  canAutoCertify,
  canHumanCertify,
  requiredCertificationAuthority,
  type CertificationGate,
  type ProjectRole,
  type RiskClass
} from "../_shared/datanestAiPolicy.ts";
import { sha256Text } from "../_shared/datanestAiRuntime.ts";
import { classifyCertifiedMemoryRelation } from "../_shared/datanestAiTrends.ts";
import {
  governedLanguageReviewResult,
  summarizeLanguageReviewEvidence,
  type LanguageReviewSummary
} from "../_shared/datanestLanguageReview.ts";
import { resolveDataNestAiStaging } from "../_shared/datanestAiStaging.ts";
import {
  candidateValidationSeal,
  validationRunMatchesSeal
} from "../_shared/datanestAiValidation.ts";

declare const Deno:{
  env:{get:(name:string)=>string|undefined};
  serve:(handler:(request:Request)=>Response|Promise<Response>)=>void;
};

const allowedOrigins=new Set([
  "https://datanest-supository.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);
const currentPolicyVersion="datanest-ai-governed-memory-v2";
const baseGateOrder:CertificationGate[]=["AUDIT","VERIFY","VALIDATE","STRESS_TEST"];
const lifecycleAfterGate:Partial<Record<CertificationGate,string>>={
  AUDIT:"AUDITED",
  VERIFY:"VERIFIED",
  VALIDATE:"VALIDATED",
  STRESS_TEST:"CERTIFICATION_REVIEW"
};
const emptyLanguageReview:LanguageReviewSummary={
  required:false,
  sourceLanguages:[],
  reasons:[],
  evidenceIds:[]
};
function requiredGateOrder(languageReviewRequired:boolean):CertificationGate[]{
  return languageReviewRequired
    ?["AUDIT","VERIFY","LANGUAGE_REVIEW","VALIDATE","STRESS_TEST"]
    :baseGateOrder;
}

type AnyClient=SupabaseClient<any>;
type Member={role:ProjectRole;status:string};
type Candidate={
  id:string;
  project_id:string;
  normalized_knowledge:string;
  category:string;
  risk_class:RiskClass;
  lifecycle_state:string;
  evidence_count:number;
  has_conflict:boolean;
  confidence:number|null;
  policy_version:string;
  content_hash:string;
  certified_at:string|null;
};

function cors(origin:string|null){
  const allow=origin&&allowedOrigins.has(origin)?origin:"https://datanest-supository.github.io";
  return {
    "Access-Control-Allow-Origin":allow,
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
function json(body:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...cors(origin),"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}
function requireEnv(name:string){
  const value=Deno.env.get(name);
  if(!value)throw new Error(`${name} is not configured.`);
  return value;
}
function stagingConfig(supabaseUrl:string,serviceKey:string){
  return resolveDataNestAiStaging({
    supabaseUrl,
    serviceKey,
    configuredUrl:Deno.env.get("DATANEST_AI_STAGING_URL"),
    configuredKey:Deno.env.get("DATANEST_AI_STAGING_SERVICE_ROLE_KEY")
  });
}
async function loadMember(client:AnyClient,projectId:string,userId:string):Promise<Member>{
  const {data,error}=await client
    .from("project_members")
    .select("role,status")
    .eq("project_id",projectId)
    .eq("user_id",userId)
    .eq("status","active")
    .maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("Active project membership is required.");
  return data as Member;
}
async function loadCandidate(staging:AnyClient,projectId:string,candidateId:string):Promise<Candidate>{
  const {data,error}=await staging
    .from("ai_learning_candidates")
    .select("*")
    .eq("id",candidateId)
    .eq("project_id",projectId)
    .single();
  if(error||!data)throw error||new Error("Candidate not found.");
  return data as Candidate;
}
async function loadValidationRuns(staging:AnyClient,candidateId:string){
  const {data,error}=await staging
    .from("ai_validation_runs")
    .select("id,gate,passed,suite_version,results,actor_type,actor_user_id,created_at")
    .eq("candidate_id",candidateId)
    .order("created_at",{ascending:true});
  if(error)throw error;
  return (data||[]) as Array<{
    id:string;
    gate:CertificationGate;
    passed:boolean;
    suite_version:string;
    results:unknown;
    actor_type:string;
    actor_user_id:string|null;
    created_at:string;
  }>;
}
async function loadCandidateEvidenceIds(staging:AnyClient,candidateId:string):Promise<string[]>{
  const {data,error}=await staging
    .from("ai_candidate_evidence")
    .select("event_id")
    .eq("candidate_id",candidateId);
  if(error)throw error;
  return [...new Set((data||[]).map(item=>String(item.event_id)).filter(Boolean))].sort();
}
async function loadLanguageReviewByCandidate(
  staging:AnyClient,
  candidateIds:string[]
):Promise<Map<string,LanguageReviewSummary>>{
  const summaries=new Map<string,LanguageReviewSummary>();
  for(const candidateId of candidateIds)summaries.set(candidateId,emptyLanguageReview);
  if(!candidateIds.length)return summaries;

  const {data:links,error:linksError}=await staging
    .from("ai_candidate_evidence")
    .select("candidate_id,event_id")
    .in("candidate_id",candidateIds);
  if(linksError)throw linksError;
  const eventIds=[...new Set((links||[]).map(item=>String(item.event_id)).filter(Boolean))];
  if(!eventIds.length)return summaries;

  const {data:events,error:eventsError}=await staging
    .from("ai_intake_events")
    .select("id,content,metadata")
    .in("id",eventIds);
  if(eventsError)throw eventsError;
  const eventById=new Map((events||[]).map(event=>[
    String(event.id),
    {
      id:String(event.id),
      content:String(event.content||""),
      metadata:typeof event.metadata==="object"&&event.metadata!==null
        ?event.metadata as Record<string,unknown>
        :{}
    }
  ]));
  for(const candidateId of candidateIds){
    const evidence=(links||[])
      .filter(link=>String(link.candidate_id)===candidateId)
      .map(link=>eventById.get(String(link.event_id)))
      .filter(Boolean) as Array<{id:string;content:string;metadata:Record<string,unknown>}>;
    summaries.set(candidateId,summarizeLanguageReviewEvidence(evidence));
  }
  return summaries;
}
async function currentValidationRuns(staging:AnyClient,candidate:Candidate){
  const [runs,evidenceIds]=await Promise.all([
    loadValidationRuns(staging,candidate.id),
    loadCandidateEvidenceIds(staging,candidate.id)
  ]);
  const evidenceHash=await sha256Text(evidenceIds.join("\n"));
  const seal=candidateValidationSeal({
    contentHash:candidate.content_hash,
    policyVersion:candidate.policy_version,
    evidenceHash,
    evidenceCount:candidate.evidence_count,
    riskClass:candidate.risk_class,
    hasConflict:candidate.has_conflict
  });
  return {
    seal,
    runs:runs.filter(run=>validationRunMatchesSeal(run.results,seal))
  };
}
function latestGateState(runs:Array<{gate:CertificationGate;passed:boolean}>){
  const state=new Map<CertificationGate,boolean>();
  for(const run of runs)state.set(run.gate,run.passed);
  return state;
}
function assertGatePrerequisites(
  gate:CertificationGate,
  runs:Array<{gate:CertificationGate;passed:boolean}>,
  languageReviewRequired:boolean
){
  const order=requiredGateOrder(languageReviewRequired);
  const index=order.indexOf(gate);
  if(index<0)throw new Error("Invalid certification gate.");
  const latest=latestGateState(runs);
  for(const prior of order.slice(0,index)){
    if(latest.get(prior)!==true){
      throw new Error(`${prior} must pass before ${gate}.`);
    }
  }
}
async function existingCertification(staging:AnyClient,candidateId:string){
  const {data,error}=await staging
    .from("ai_certification_decisions")
    .select("*")
    .eq("candidate_id",candidateId)
    .eq("decision","certified")
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();
  if(error)throw error;
  return data as Record<string,unknown>|null;
}
async function certifyCandidate(input:{
  staging:AnyClient;
  candidate:Candidate;
  authority:"automation"|"admin"|"owner";
  actorUserId:string|null;
  reason:string;
  runs:Array<{id:string;gate:CertificationGate;passed:boolean}>;
}){
  const existing=await existingCertification(input.staging,input.candidate.id);
  if(existing){
    assertCertificationDecisionCurrent(existing,input.candidate);
    const {error:updateError}=await input.staging
      .from("ai_learning_candidates")
      .update({
        lifecycle_state:"CERTIFIED",
        certified_at:input.candidate.certified_at||new Date().toISOString(),
        updated_at:new Date().toISOString()
      })
      .eq("id",input.candidate.id);
    if(updateError)throw updateError;
    return existing;
  }

  const {data:decision,error:decisionError}=await input.staging
    .from("ai_certification_decisions")
    .insert({
      candidate_id:input.candidate.id,
      decision:"certified",
      authority:input.authority,
      actor_user_id:input.actorUserId,
      risk_class:input.candidate.risk_class,
      reason:input.reason,
      policy_version:input.candidate.policy_version,
      content_hash:input.candidate.content_hash,
      evidence:{
        validation_run_ids:input.runs.filter(run=>run.passed).map(run=>run.id),
        required_authority:requiredCertificationAuthority({
          category:input.candidate.category,
          riskClass:input.candidate.risk_class,
          hasConflict:input.candidate.has_conflict
        })
      }
    })
    .select("*")
    .single();
  if(decisionError||!decision)throw decisionError||new Error("Unable to record certification decision.");

  const {error:updateError}=await input.staging
    .from("ai_learning_candidates")
    .update({
      lifecycle_state:"CERTIFIED",
      certified_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
    .eq("id",input.candidate.id);
  if(updateError)throw updateError;
  return decision as Record<string,unknown>;
}
function assertCertificationDecisionCurrent(
  decision:Record<string,unknown>,
  candidate:Candidate
){
  const required=requiredCertificationAuthority({
    category:candidate.category,
    riskClass:candidate.risk_class,
    hasConflict:candidate.has_conflict
  });
  const authority=String(decision.authority||"");
  const authorityValid=
    required==="owner"
      ?authority==="owner"
      :required==="admin"
        ?authority==="owner"||authority==="admin"
        :authority==="owner"||authority==="admin"||authority==="automation";

  if(
    String(decision.content_hash||"")!==candidate.content_hash ||
    String(decision.policy_version||"")!==candidate.policy_version ||
    String(decision.risk_class||"")!==candidate.risk_class ||
    !authorityValid
  ){
    throw new Error("Certification decision is stale for the current candidate seal or required authority.");
  }
}

async function sourceLineage(staging:AnyClient,candidateId:string){
  const {data:links,error:linksError}=await staging
    .from("ai_candidate_evidence")
    .select("event_id")
    .eq("candidate_id",candidateId);
  if(linksError)throw linksError;
  const ids=(links||[]).map(item=>String(item.event_id)).filter(Boolean);
  if(!ids.length)return {jobIds:[] as string[],traceIds:[] as string[]};
  const {data:events,error:eventsError}=await staging
    .from("ai_intake_events")
    .select("id,job_id,trace_id")
    .in("id",ids);
  if(eventsError)throw eventsError;
  return {
    jobIds:[...new Set((events||[]).map(item=>String(item.job_id)).filter(Boolean))],
    traceIds:[...new Set((events||[]).map(item=>String(item.trace_id)).filter(Boolean))]
  };
}

async function loadActiveCertifiedMemory(
  serviceClient:AnyClient,
  projectId:string,
  category:string
):Promise<Array<{id:string;normalized_knowledge:string;content_hash:string}>>{
  const {data,error}=await serviceClient
    .from("certified_memory")
    .select("id,normalized_knowledge,content_hash")
    .eq("project_id",projectId)
    .eq("category",category)
    .eq("active",true)
    .limit(200);
  if(error)throw error;
  return (data||[]).map(item=>({
    id:String(item.id),
    normalized_knowledge:String(item.normalized_knowledge||""),
    content_hash:String(item.content_hash||"")
  }));
}

function certifiedMemoryRelationHints(
  candidate:Candidate,
  memories:Array<{id:string;normalized_knowledge:string;content_hash:string}>
){
  return memories
    .filter(memory=>memory.content_hash!==candidate.content_hash)
    .map(memory=>({
      memoryId:memory.id,
      ...classifyCertifiedMemoryRelation(
        candidate.normalized_knowledge,
        memory.normalized_knowledge
      )
    }))
    .filter(item=>item.relation!=="none")
    .sort((a,b)=>b.similarity-a.similarity||a.memoryId.localeCompare(b.memoryId));
}

async function loadCertifiedMemoryReviewQueue(
  serviceClient:AnyClient,
  projectId:string
){
  const now=new Date().toISOString();
  const {data,error}=await serviceClient
    .from("certified_memory")
    .select("id,normalized_knowledge,category,effective_version,certification_class,confidence,review_after,last_verified_at,promoted_at")
    .eq("project_id",projectId)
    .eq("active",true)
    .not("review_after","is",null)
    .lte("review_after",now)
    .order("review_after",{ascending:true})
    .limit(100);
  if(error)throw error;
  return (data||[]) as Array<Record<string,unknown>>;
}

Deno.serve(async(request:Request)=>{
  const origin=request.headers.get("Origin");
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
  if(request.method!=="POST")return json({error:"Method not allowed."},405,origin);

  try{
    const authorization=request.headers.get("Authorization");
    if(!authorization)return json({error:"Authentication is required."},401,origin);

    const supabaseUrl=requireEnv("SUPABASE_URL");
    const anonKey=requireEnv("SUPABASE_ANON_KEY");
    const serviceKey=requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const stagingEnv=stagingConfig(supabaseUrl,serviceKey);

    const userClient=createClient(supabaseUrl,anonKey,{
      global:{headers:{Authorization:authorization}},
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const serviceClient=createClient(supabaseUrl,serviceKey,{
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const staging=createClient(stagingEnv.url,stagingEnv.key,{
      auth:{persistSession:false,autoRefreshToken:false}
    });

    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user)return json({error:"Authentication is required."},401,origin);
    const user=userData.user;

    const body=await request.json().catch(()=>({})) as Record<string,unknown>;
    const action=String(body.action||"workspace");
    const projectId=String(body.projectId||"");
    if(!projectId)return json({error:"projectId is required."},400,origin);

    const member=await loadMember(userClient,projectId,user.id);
    if(!["owner","admin"].includes(member.role)){
      return json({error:"Owner or admin access is required."},403,origin);
    }

    if(action==="workspace"){
      const [candidateResult,memoryReviewItems]=await Promise.all([
        staging
          .from("ai_learning_candidates")
          .select("*")
          .eq("project_id",projectId)
          .neq("lifecycle_state","REJECTED")
          .order("updated_at",{ascending:false})
          .limit(100),
        loadCertifiedMemoryReviewQueue(serviceClient,projectId)
      ]);
      const {data:candidates,error:candidatesError}=candidateResult;
      if(candidatesError)throw candidatesError;
      const candidateIds=(candidates||[]).map(candidate=>String(candidate.id));
      let runs:Record<string,unknown>[]=[];
      let decisions:Record<string,unknown>[]=[];
      if(candidateIds.length){
        const [runsResult,decisionsResult]=await Promise.all([
          staging.from("ai_validation_runs").select("*").in("candidate_id",candidateIds).order("created_at",{ascending:false}).limit(500),
          staging.from("ai_certification_decisions").select("*").in("candidate_id",candidateIds).order("created_at",{ascending:false}).limit(500)
        ]);
        if(runsResult.error)throw runsResult.error;
        if(decisionsResult.error)throw decisionsResult.error;
        runs=(runsResult.data||[]) as Record<string,unknown>[];
        decisions=(decisionsResult.data||[]) as Record<string,unknown>[];
      }
      return json({
        role:member.role,
        candidates:(candidates||[]).map(candidate=>({
          ...candidate,
          required_authority:requiredCertificationAuthority({
            category:String(candidate.category),
            riskClass:candidate.risk_class as RiskClass,
            hasConflict:Boolean(candidate.has_conflict)
          })
        })),
        validationRuns:runs||[],
        certificationDecisions:decisions||[],
        memoryReviewItems
      },200,origin);
    }

    if(action==="review_memory"){
      const memoryId=String(body.memoryId||"");
      if(!memoryId)return json({error:"memoryId is required."},400,origin);
      const decision=String(body.decision||"reaffirmed");
      if(!["reaffirmed","review_required","retired"].includes(decision)){
        return json({error:"Unsupported Certified Memory review decision."},400,origin);
      }
      if(decision==="retired"&&member.role!=="owner"){
        return json({error:"Owner authority is required to retire Certified Memory."},403,origin);
      }
      const nextReviewAfter=typeof body.nextReviewAfter==="string"&&body.nextReviewAfter
        ?body.nextReviewAfter
        :null;
      const {data:review,error:reviewError}=await serviceClient.rpc(
        "service_review_certified_memory_v1",{
          target_project:projectId,
          target_memory:memoryId,
          target_actor:user.id,
          target_decision:decision,
          target_reason:String(body.reason||"Governed Certified Memory review.").slice(0,2000),
          target_next_review_after:nextReviewAfter,
          target_evidence:{
            source:"datanest_ai_certification_console",
            policy_version:currentPolicyVersion
          }
        }
      );
      if(reviewError)throw reviewError;
      return json({review},200,origin);
    }

    const candidateId=String(body.candidateId||"");
    if(!candidateId)return json({error:"candidateId is required."},400,origin);
    const candidate=await loadCandidate(staging,projectId,candidateId);

    if(action==="record_validation"){
      const gate=String(body.gate||"") as CertificationGate;
      if(!gateOrder.includes(gate))return json({error:"Invalid certification gate."},400,origin);
      if(gate==="STRESS_TEST"){
        return json({error:"STRESS_TEST evidence must be recorded by the governed stress suite."},403,origin);
      }
      const current=await currentValidationRuns(staging,candidate);
      assertGatePrerequisites(gate,current.runs);
      const passed=Boolean(body.passed);
      const providedResults=typeof body.results==="object"&&body.results!==null
        ?body.results as Record<string,unknown>
        :{};
      const {data:run,error:runError}=await staging
        .from("ai_validation_runs")
        .insert({
          candidate_id:candidate.id,
          gate,
          suite_version:String(body.suiteVersion||candidate.policy_version||currentPolicyVersion),
          passed,
          results:{...providedResults,...current.seal},
          actor_type:"human",
          actor_user_id:user.id
        })
        .select("*")
        .single();
      if(runError||!run)throw runError||new Error("Unable to record validation run.");

      const nextState=passed?lifecycleAfterGate[gate]:"NEEDS_EVIDENCE";
      const {error:updateError}=await staging
        .from("ai_learning_candidates")
        .update({lifecycle_state:nextState,updated_at:new Date().toISOString()})
        .eq("id",candidate.id);
      if(updateError)throw updateError;

      const refreshedCandidate=await loadCandidate(staging,projectId,candidate.id);
      const refreshedValidation=await currentValidationRuns(staging,refreshedCandidate);
      const refreshedRuns=refreshedValidation.runs;
      let autoCertification:Record<string,unknown>|null=null;
      if(
        allAutomatedCertificationGatesPassed(refreshedRuns) &&
        canAutoCertify({
          category:refreshedCandidate.category,
          riskClass:refreshedCandidate.risk_class,
          hasConflict:refreshedCandidate.has_conflict,
          allGatesPassed:true,
          evidenceCount:refreshedCandidate.evidence_count,
          confidence:refreshedCandidate.confidence
        })
      ){
        autoCertification=await certifyCandidate({
          staging,
          candidate:refreshedCandidate,
          authority:"automation",
          actorUserId:null,
          reason:"All automated gates passed for repeated low-risk non-conflicting evidence.",
          runs:refreshedRuns
        });
      }
      return json({run,autoCertification},200,origin);
    }

    if(action==="certify"){
      const {runs}=await currentValidationRuns(staging,candidate);
      if(!allCertificationGatesPassed(runs)){
        return json({error:"All audit, verify, validate and stress-test gates must pass before certification."},409,origin);
      }
      const policyInput={
        category:candidate.category,
        riskClass:candidate.risk_class,
        hasConflict:candidate.has_conflict
      };
      if(!canHumanCertify(member.role,policyInput)){
        return json({error:"Certification authority is insufficient."},403,origin);
      }
      const decision=await certifyCandidate({
        staging,
        candidate,
        authority:member.role==="owner"?"owner":"admin",
        actorUserId:user.id,
        reason:String(body.reason||"Human certification after required gates passed.").slice(0,2000),
        runs
      });
      return json({decision},200,origin);
    }

    if(action==="promote"||action==="supersede"){
      const supersedesMemoryId=typeof body.supersedesMemoryId==="string"&&body.supersedesMemoryId
        ?body.supersedesMemoryId
        :null;
      if((action==="supersede"||supersedesMemoryId)&&member.role!=="owner"){
        return json({error:"Owner access is required for explicit knowledge supersession."},403,origin);
      }
      if(action==="supersede"&&!supersedesMemoryId){
        return json({error:"supersedesMemoryId is required for explicit knowledge supersession."},400,origin);
      }
      if(candidate.lifecycle_state!=="CERTIFIED"){
        return json({error:"Only certified candidates can be promoted."},409,origin);
      }
      const decision=await existingCertification(staging,candidate.id);
      if(!decision)return json({error:"Certified candidate has no certification decision."},409,origin);
      assertCertificationDecisionCurrent(decision,candidate);

      const activeMemory=await loadActiveCertifiedMemory(
        serviceClient,
        projectId,
        candidate.category
      );
      const relationHints=certifiedMemoryRelationHints(candidate,activeMemory);
      const contradictions=relationHints.filter(item=>item.relation==="contradicts");
      const duplicates=relationHints.filter(item=>item.relation==="duplicates");

      if(contradictions.length&&!supersedesMemoryId){
        return json({
          error:"Candidate conflicts with active Verified Memory. Owner supersession is required before promotion.",
          conflictMemoryIds:contradictions.map(item=>item.memoryId),
          relationHints
        },409,origin);
      }
      if(duplicates.length&&!supersedesMemoryId){
        return json({
          error:"Candidate substantially duplicates active Verified Memory. Reuse the existing memory or supersede it explicitly.",
          duplicateMemoryIds:duplicates.map(item=>item.memoryId),
          relationHints
        },409,origin);
      }

      const lineage=await sourceLineage(staging,candidate.id);
      const applicability=
        typeof body.applicability==="object"&&body.applicability!==null&&!Array.isArray(body.applicability)
          ?body.applicability as Record<string,unknown>
          :{};
      const validFrom=typeof body.validFrom==="string"&&body.validFrom?body.validFrom:null;
      const validUntil=typeof body.validUntil==="string"&&body.validUntil?body.validUntil:null;
      const reviewAfter=typeof body.reviewAfter==="string"&&body.reviewAfter?body.reviewAfter:null;

      const {data:memoryId,error:promotionError}=await serviceClient.rpc(
        "service_promote_certified_memory_v2",{
          target_project:projectId,
          target_knowledge:candidate.normalized_knowledge,
          target_category:candidate.category,
          target_certification_id:String(decision.id),
          target_source_job_ids:lineage.jobIds,
          target_source_trace_ids:lineage.traceIds,
          target_certification_class:String(decision.authority),
          target_confidence:candidate.confidence,
          target_policy_version:candidate.policy_version,
          target_content_hash:candidate.content_hash,
          target_applicability:applicability,
          target_valid_from:validFrom,
          target_valid_until:validUntil,
          target_review_after:reviewAfter,
          target_supersedes:supersedesMemoryId
        }
      );
      if(promotionError)throw promotionError;

      if(supersedesMemoryId){
        const {error:supersessionError}=await staging
          .from("ai_memory_supersessions")
          .insert({
            project_id:projectId,
            candidate_id:candidate.id,
            production_memory_id:String(memoryId),
            supersedes_memory_id:supersedesMemoryId,
            reason:String(body.reason||"Certified knowledge supersession.").slice(0,2000),
            created_by:user.id
          });
        if(supersessionError)throw supersessionError;
      }
      return json({
        memoryId,
        sourceJobIds:lineage.jobIds,
        sourceTraceIds:lineage.traceIds,
        relationHints
      },200,origin);
    }

    return json({error:"Unsupported certification action."},400,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to process DataNest AI certification.";
    const status=/membership|access|required|authority/i.test(message)?403:400;
    return json({error:message},status,origin);
  }
});
