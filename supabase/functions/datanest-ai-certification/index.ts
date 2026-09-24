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
const dedicatedStagingRef="qchttpcyqlqnhvahprhz";
const policyVersion="datanest-ai-governed-memory-v1";
const gateOrder:CertificationGate[]=["AUDIT","VERIFY","VALIDATE","STRESS_TEST"];
const lifecycleAfterGate:Record<CertificationGate,string>={
  AUDIT:"AUDITED",
  VERIFY:"VERIFIED",
  VALIDATE:"VALIDATED",
  STRESS_TEST:"CERTIFICATION_REVIEW"
};

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
  const configuredUrl=Deno.env.get("DATANEST_AI_STAGING_URL");
  const configuredKey=Deno.env.get("DATANEST_AI_STAGING_SERVICE_ROLE_KEY");
  if(configuredUrl&&configuredKey)return {url:configuredUrl,key:configuredKey};
  if(supabaseUrl.includes(dedicatedStagingRef))return {url:supabaseUrl,key:serviceKey};
  throw new Error("Dedicated DataNest AI staging credentials are required in production.");
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
function latestGateState(runs:Array<{gate:CertificationGate;passed:boolean}>){
  const state=new Map<CertificationGate,boolean>();
  for(const run of runs)state.set(run.gate,run.passed);
  return state;
}
function assertGatePrerequisites(gate:CertificationGate,runs:Array<{gate:CertificationGate;passed:boolean}>){
  const index=gateOrder.indexOf(gate);
  if(index<0)throw new Error("Invalid certification gate.");
  const latest=latestGateState(runs);
  for(const prior of gateOrder.slice(0,index)){
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
    const sealedContentHash=String(existing.content_hash||"");
    const sealedPolicyVersion=String(existing.policy_version||"");
    const sealedRiskClass=String(existing.risk_class||"");
    if(
      sealedContentHash!==input.candidate.content_hash ||
      sealedPolicyVersion!==input.candidate.policy_version ||
      sealedRiskClass!==input.candidate.risk_class
    ){
      throw new Error("Existing certification is stale for the current candidate state.");
    }
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
      policy_version:policyVersion,
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
      const {data:candidates,error:candidatesError}=await staging
        .from("ai_learning_candidates")
        .select("*")
        .eq("project_id",projectId)
        .order("updated_at",{ascending:false})
        .limit(100);
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
        certificationDecisions:decisions||[]
      },200,origin);
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
      const runs=await loadValidationRuns(staging,candidate.id);
      assertGatePrerequisites(gate,runs);
      const passed=Boolean(body.passed);
      const {data:run,error:runError}=await staging
        .from("ai_validation_runs")
        .insert({
          candidate_id:candidate.id,
          gate,
          suite_version:String(body.suiteVersion||policyVersion),
          passed,
          results:typeof body.results==="object"&&body.results!==null?body.results:{},
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

      const refreshedRuns=await loadValidationRuns(staging,candidate.id);
      const refreshedCandidate=await loadCandidate(staging,projectId,candidate.id);
      let autoCertification:Record<string,unknown>|null=null;
      if(
        allAutomatedCertificationGatesPassed(refreshedRuns) &&
        canAutoCertify({
          category:refreshedCandidate.category,
          riskClass:refreshedCandidate.risk_class,
          hasConflict:refreshedCandidate.has_conflict,
          allGatesPassed:true,
          evidenceCount:refreshedCandidate.evidence_count
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
      const runs=await loadValidationRuns(staging,candidate.id);
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
      if(action==="supersede"&&member.role!=="owner"){
        return json({error:"Owner access is required for explicit knowledge supersession."},403,origin);
      }
      if(candidate.lifecycle_state!=="CERTIFIED"){
        return json({error:"Only certified candidates can be promoted."},409,origin);
      }
      const decision=await existingCertification(staging,candidate.id);
      if(!decision)return json({error:"Certified candidate has no certification decision."},409,origin);

      const lineage=await sourceLineage(staging,candidate.id);
      const supersedesMemoryId=typeof body.supersedesMemoryId==="string"&&body.supersedesMemoryId
        ?body.supersedesMemoryId
        :null;
      const {data:memoryId,error:promotionError}=await serviceClient.rpc(
        "service_promote_certified_memory",{
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
      return json({memoryId,sourceJobIds:lineage.jobIds,sourceTraceIds:lineage.traceIds},200,origin);
    }

    return json({error:"Unsupported certification action."},400,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to process DataNest AI certification.";
    const status=/membership|access|required|authority/i.test(message)?403:400;
    return json({error:message},status,origin);
  }
});
