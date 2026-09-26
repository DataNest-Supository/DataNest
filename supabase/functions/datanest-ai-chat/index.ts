import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveDataNestAiStaging } from "../_shared/datanestAiStaging.ts";
import {
  buildGovernedPrompt,
  executeChatTurn,
  filterCurrentSessionEvidence,
  sha256Text
} from "../_shared/datanestAiRuntime.ts";
import {
  callOpenAiCompatibleProvider,
  type ProviderConnection
} from "../_shared/provider.ts";
import {
  bestCandidateByEvidenceOverlap,
  candidateFromRepeatedEvidence,
  stableCandidateIdFromHash
} from "../_shared/datanestAiTrends.ts";
import { chronologicalFromNewestFirst } from "../_shared/datanestAiContinuity.ts";
import {
  automatedLearningGateResults,
  candidateValidationSeal
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
const policyVersion="datanest-ai-governed-memory-v2";
const mutableLearningStates=new Set([
  "INTAKE","NEEDS_EVIDENCE","AUDITED","VERIFIED","VALIDATED"
]);

type AnyClient=SupabaseClient<any>;

type JobContext={
  id:string;
  project_id:string;
  job_number:number;
  title:string;
  description:string|null;
  priority:number;
  status:string;
  required_capabilities:unknown;
  requirements:unknown;
  acceptance:unknown;
  deadline:string|null;
};

type StagedEvent={
  id:string;
  trace_id:string;
  project_id:string;
  job_id:string;
  session_id:string;
  source_type:string;
  source_user_id:string|null;
  source_provider:string|null;
  parent_event_id:string|null;
  client_request_id:string|null;
  content:string;
  created_at:string;
};

function cors(origin:string|null){
  const allow=origin&&allowedOrigins.has(origin)
    ?origin
    :"https://datanest-supository.github.io";
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
    headers:{
      ...cors(origin),
      "Content-Type":"application/json",
      "Cache-Control":"no-store"
    }
  });
}

function requireEnv(name:string):string{
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

async function loadAuthorizedJob(client:AnyClient,jobId:string):Promise<JobContext>{
  const {data,error}=await client
    .from("jobs")
    .select("id,project_id,job_number,title,description,priority,status,required_capabilities,requirements,acceptance,deadline")
    .eq("id",jobId)
    .single();
  if(error||!data)throw new Error(error?.message||"Job not found or not authorized.");
  return data as JobContext;
}

async function ensureStagingSession(input:{
  staging:AnyClient;
  projectId:string;
  jobId:string;
  userId:string;
  existingSessionId:string|null;
}):Promise<{id:string}>{
  if(input.existingSessionId){
    const {data,error}=await input.staging
      .from("ai_sessions")
      .select("id")
      .eq("id",input.existingSessionId)
      .eq("project_id",input.projectId)
      .eq("job_id",input.jobId)
      .eq("user_id",input.userId)
      .maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("DataNest AI session does not belong to this user and Job.");
    return data as {id:string};
  }

  const {data,error}=await input.staging
    .from("ai_sessions")
    .insert({
      project_id:input.projectId,
      job_id:input.jobId,
      user_id:input.userId,
      client_session_id:crypto.randomUUID()
    })
    .select("id")
    .single();
  if(error||!data)throw error||new Error("Unable to create DataNest AI session.");
  return data as {id:string};
}

async function loadSessionEvents(input:{
  staging:AnyClient;
  projectId:string;
  jobId:string;
  sessionId:string;
}):Promise<StagedEvent[]>{
  const {data,error}=await input.staging
    .from("ai_intake_events")
    .select("id,trace_id,project_id,job_id,session_id,source_type,source_user_id,source_provider,parent_event_id,client_request_id,content,created_at")
    .eq("project_id",input.projectId)
    .eq("job_id",input.jobId)
    .eq("session_id",input.sessionId)
    .order("created_at",{ascending:false})
    .limit(100);
  if(error)throw error;
  const rows=chronologicalFromNewestFirst((data||[]) as StagedEvent[]);
  const mapped=rows.map(row=>({
    ...row,
    projectId:row.project_id,
    jobId:row.job_id,
    sessionId:row.session_id
  }));
  return filterCurrentSessionEvidence(mapped,{
    projectId:input.projectId,
    jobId:input.jobId,
    sessionId:input.sessionId
  });
}

async function loadCertifiedMemory(input:{
  client:AnyClient;
  projectId:string;
  jobId:string;
}):Promise<Array<Record<string,unknown>>>{
  const {data,error}=await input.client.rpc("get_certified_memory_context",{
    target_project:input.projectId,
    target_job:input.jobId,
    target_limit:50
  });
  if(error)throw error;
  const items=(data as {items?:unknown[]}|null)?.items;
  return Array.isArray(items)?items as Array<Record<string,unknown>>:[];
}


async function finishUsageRequest(
  client:AnyClient,
  input:{
    requestId:string;
    target_status:string;
    inputTokens?:number;
    outputTokens?:number;
    errorCategory?:string|null;
    errorMessage?:string|null;
  }
){
  const {error}=await client.rpc("service_finish_ai_request",{
    target_request:input.requestId,
    target_status:input.target_status,
    input_tokens:input.inputTokens||0,
    output_tokens:input.outputTokens||0,
    estimated_cost_minor:null,
    provider_reported_cost_minor:null,
    reconciled_cost_minor:null,
    target_error_category:input.errorCategory||null,
    target_error_message:input.errorMessage||null
  });
  if(error)throw error;
}

async function updateTrendCandidate(input:{
  staging:AnyClient;
  projectId:string;
  inputEventId:string;
}):Promise<{candidateId:string|null;trendKey:string|null;evidenceCount:number}>{
  const {data,error}=await input.staging
    .from("ai_intake_events")
    .select("id,content,job_id,session_id,source_type,source_user_id,metadata")
    .eq("project_id",input.projectId)
    .in("source_type",["human","ai_companion"])
    .order("created_at",{ascending:false})
    .limit(250);
  if(error)throw error;

  const evidence=(data||[]).map(item=>({
    id:String(item.id),
    content:String(item.content),
    jobId:String(item.job_id||""),
    sessionId:String(item.session_id||""),
    sourceType:String(item.source_type||""),
    sourceUserId:item.source_user_id?String(item.source_user_id):null,
    metadata:typeof item.metadata==="object"&&item.metadata!==null
      ?item.metadata as Record<string,unknown>
      :{}
  }));
  const current=evidence.find(item=>item.id===input.inputEventId);
  if(!current)return {candidateId:null,trendKey:null,evidenceCount:0};

  const ordered=[
    current,
    ...evidence.filter(item=>item.id!==input.inputEventId)
  ];
  const candidate=candidateFromRepeatedEvidence(ordered);
  if(!candidate)return {candidateId:null,trendKey:null,evidenceCount:1};

  const {data:cluster,error:clusterError}=await input.staging
    .from("ai_trend_clusters")
    .upsert({
      project_id:input.projectId,
      trend_key:candidate.trendKey,
      category:candidate.category,
      normalized_label:candidate.normalizedKnowledge.slice(0,500),
      evidence_count:candidate.evidenceIds.length,
      last_seen_at:new Date().toISOString()
    },{onConflict:"project_id,trend_key"})
    .select("id")
    .single();
  if(clusterError||!cluster)throw clusterError||new Error("Unable to record DataNest AI trend.");

  const trendEvidence=candidate.evidenceIds.map(eventId=>({
    cluster_id:String(cluster.id),
    event_id:eventId
  }));
  const {error:trendEvidenceError}=await input.staging
    .from("ai_trend_evidence")
    .upsert(trendEvidence,{onConflict:"cluster_id,event_id"});
  if(trendEvidenceError)throw trendEvidenceError;

  const {data:overlapLinks,error:overlapLinksError}=await input.staging
    .from("ai_candidate_evidence")
    .select("candidate_id,event_id")
    .in("event_id",candidate.evidenceIds);
  if(overlapLinksError)throw overlapLinksError;

  const overlapCandidateId=bestCandidateByEvidenceOverlap(
    (overlapLinks||[]).map(link=>({
      candidateId:String(link.candidate_id),
      eventId:String(link.event_id)
    })),
    candidate.evidenceIds
  );

  const contentHash=await sha256Text(candidate.normalizedKnowledge);
  const candidateIdentityHash=await sha256Text(`${input.projectId}\n${candidate.trendKey}`);
  const stableCandidateId=stableCandidateIdFromHash(candidateIdentityHash);
  type MutableCandidate={id:string;lifecycle_state:string;evidence_count:number};

  let existing:MutableCandidate|null=null;
  if(overlapCandidateId){
    const {data,error}=await input.staging
      .from("ai_learning_candidates")
      .select("id,lifecycle_state,evidence_count")
      .eq("id",overlapCandidateId)
      .eq("project_id",input.projectId)
      .maybeSingle();
    if(error)throw error;
    existing=data&&mutableLearningStates.has(String(data.lifecycle_state))
      ?data as MutableCandidate
      :null;
  }

  if(!existing){
    const {data,error}=await input.staging
      .from("ai_learning_candidates")
      .select("id,lifecycle_state,evidence_count")
      .eq("project_id",input.projectId)
      .eq("content_hash",contentHash)
      .limit(1)
      .maybeSingle();
    if(error)throw error;
    existing=data as MutableCandidate|null;
  }

  let candidateId=existing?.id?String(existing.id):"";
  if(!existing){
    const {data:created,error:createError}=await input.staging
      .from("ai_learning_candidates")
      .insert({
        id:stableCandidateId,
        project_id:input.projectId,
        normalized_knowledge:candidate.normalizedKnowledge,
        category:candidate.category,
        risk_class:candidate.riskClass,
        lifecycle_state:"INTAKE",
        evidence_count:candidate.evidenceIds.length,
        has_conflict:candidate.hasConflict,
        confidence:candidate.confidence,
        policy_version:policyVersion,
        content_hash:contentHash
      })
      .select("id,lifecycle_state,evidence_count")
      .single();

    if(createError){
      if(createError.code!=="23505")throw createError;
      const {data:concurrentCandidate,error:concurrentError}=await input.staging
        .from("ai_learning_candidates")
        .select("id,lifecycle_state,evidence_count")
        .eq("id",stableCandidateId)
        .eq("project_id",input.projectId)
        .maybeSingle();
      if(concurrentError)throw concurrentError;
      if(!concurrentCandidate){
        throw new Error("Deterministic candidate identity collided outside the current project.");
      }
      existing=concurrentCandidate as MutableCandidate;
      candidateId=String(concurrentCandidate.id);
    }else if(created){
      candidateId=String(created.id);
    }else{
      throw new Error("Unable to create DataNest AI learning candidate.");
    }
  }

  if(existing?.id){
    if(!mutableLearningStates.has(String(existing.lifecycle_state))){
      return {
        candidateId,
        trendKey:candidate.trendKey,
        evidenceCount:Number(existing.evidence_count||0)
      };
    }
    const {error:updateError}=await input.staging
      .from("ai_learning_candidates")
      .update({
        normalized_knowledge:candidate.normalizedKnowledge,
        content_hash:contentHash,
        evidence_count:candidate.evidenceIds.length,
        category:candidate.category,
        risk_class:candidate.riskClass,
        has_conflict:candidate.hasConflict,
        confidence:candidate.confidence,
        policy_version:policyVersion,
        lifecycle_state:"INTAKE",
        updated_at:new Date().toISOString()
      })
      .eq("id",candidateId);
    if(updateError)throw updateError;
  }

  if(!candidateId){
    throw new Error("Unable to resolve DataNest AI learning candidate.");
  }

  const candidateEvidence=candidate.evidenceIds.map(eventId=>({
    candidate_id:candidateId,
    event_id:eventId
  }));
  const {error:candidateEvidenceError}=await input.staging
    .from("ai_candidate_evidence")
    .upsert(candidateEvidence,{onConflict:"candidate_id,event_id"});
  if(candidateEvidenceError)throw candidateEvidenceError;

  const {data:linkedEvidence,error:linkedEvidenceError}=await input.staging
    .from("ai_candidate_evidence")
    .select("event_id")
    .eq("candidate_id",candidateId);
  if(linkedEvidenceError)throw linkedEvidenceError;
  const activeEvidence=new Set(candidate.evidenceIds);
  const staleEvidence=(linkedEvidence||[])
    .map(item=>String(item.event_id))
    .filter(eventId=>!activeEvidence.has(eventId));
  if(staleEvidence.length){
    const {error:staleEvidenceError}=await input.staging
      .from("ai_candidate_evidence")
      .delete()
      .eq("candidate_id",candidateId)
      .in("event_id",staleEvidence);
    if(staleEvidenceError)throw staleEvidenceError;
  }

  const evidenceHash=await sha256Text([...candidate.evidenceIds].sort().join("\n"));
  const automatedGates=automatedLearningGateResults({
    normalizedKnowledge:candidate.normalizedKnowledge,
    riskClass:candidate.riskClass,
    evidenceCount:candidate.evidenceIds.length,
    independentEvidenceCount:candidate.independentEvidenceCount,
    confidence:candidate.confidence,
    hasConflict:candidate.hasConflict,
    contentHash,
    policyVersion,
    evidenceHash
  });

  if(automatedGates.length){
    const seal=candidateValidationSeal({
      contentHash,
      policyVersion,
      evidenceHash,
      evidenceCount:candidate.evidenceIds.length,
      riskClass:candidate.riskClass,
      hasConflict:candidate.hasConflict
    });
    const {error:validationError}=await input.staging
      .from("ai_validation_runs")
      .insert(automatedGates.map(run=>({
        candidate_id:candidateId,
        gate:run.gate,
        suite_version:policyVersion,
        passed:run.passed,
        results:{
          ...run.checks,
          ...seal,
          automation_version:"datanest-ai-learning-validation-v2"
        },
        actor_type:"automation",
        actor_user_id:null
      })));
    if(validationError)throw validationError;

    const nextState=automatedGates.every(run=>run.passed)
      ?"VALIDATED"
      :"NEEDS_EVIDENCE";
    const {error:validationStateError}=await input.staging
      .from("ai_learning_candidates")
      .update({
        lifecycle_state:nextState,
        updated_at:new Date().toISOString()
      })
      .eq("id",candidateId);
    if(validationStateError)throw validationStateError;
  }

  return {
    candidateId,
    trendKey:candidate.trendKey,
    evidenceCount:candidate.evidenceIds.length
  };
}

function embeddedResponse(
  job:JobContext,
  message:string,
  productMode:string,
  jurisdiction:string
){
  const code="JOB-"+String(job.job_number||0).padStart(5,"0");
  if(productMode==="legal_eagle"){
    return [
      `Legal Eagle recorded this legal-assistance request for ${code} · ${job.title}.`,
      `Jurisdiction supplied: ${jurisdiction}.`,
      "A governed external AI provider is not currently available for substantive reasoning, so Legal Eagle has not generated a legal analysis.",
      "You can still use this matter workspace to organize facts and questions. Verify legal rights, deadlines, procedures and strategy with a qualified lawyer in the relevant jurisdiction.",
      `Current request: “${message.slice(0,500)}”`
    ].join("\n\n");
  }
  return [
    `DataNest AI recorded this request as uncertified evidence for ${code} · ${job.title}.`,
    "It is available to this Job/session immediately but will not become project-wide memory until the governed certification pipeline passes.",
    `Current request: “${message.slice(0,500)}”`
  ].join("\n\n");
}

async function loadCachedTurn(input:{
  staging:AnyClient;
  userId:string;
  clientRequestId:string;
}){
  const {data:human,error:humanError}=await input.staging
    .from("ai_intake_events")
    .select("id,trace_id,session_id")
    .eq("source_type","human")
    .eq("source_user_id",input.userId)
    .eq("client_request_id",input.clientRequestId)
    .maybeSingle();
  if(humanError)throw humanError;
  if(!human)throw new Error("The existing DataNest AI request has no staged intake event.");

  const {data:assistant,error:assistantError}=await input.staging
    .from("ai_intake_events")
    .select("trace_id,content")
    .eq("source_type","datanest_ai")
    .eq("parent_event_id",human.id)
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();
  if(assistantError)throw assistantError;
  if(!assistant){
    throw new Error("The existing request is staged but has no completed response; it will not be sent again automatically.");
  }
  return {
    assistant:String(assistant.content),
    outputTraceId:String(assistant.trace_id),
    inputTraceId:String(human.trace_id),
    sessionId:String(human.session_id)
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
    const staging=stagingConfig(supabaseUrl,serviceKey);

    const userClient=createClient(supabaseUrl,anonKey,{
      global:{headers:{Authorization:authorization}},
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const serviceClient=createClient(supabaseUrl,serviceKey,{
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const stagingClient=createClient(staging.url,staging.key,{
      auth:{persistSession:false,autoRefreshToken:false}
    });

    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user)return json({error:"Authentication is required."},401,origin);
    const user=userData.user;

    const body=await request.json().catch(()=>({})) as Record<string,unknown>;
    const action=String(body.action||"chat");
    const jobId=String(body.jobId||"");
    if(!jobId)return json({error:"jobId is required."},400,origin);

    const productMode=String(body.productMode||"").trim();
    if(productMode&&productMode!=="legal_eagle"){
      return json({error:"Unsupported DataNest AI product mode."},400,origin);
    }
    const legalMode=productMode==="legal_eagle";
    const jurisdiction=legalMode?String(body.jurisdiction||"").trim().slice(0,160):"";
    const legalTask=legalMode?String(body.legalTask||"general").trim().slice(0,80):"";
    if(legalMode&&!jurisdiction){
      return json({error:"Legal Eagle requires a jurisdiction before substantive assistance."},400,origin);
    }

    const job=await loadAuthorizedJob(userClient,jobId);

    if(action==="context"){
      const session=await ensureStagingSession({
        staging:stagingClient,
        projectId:job.project_id,
        jobId:job.id,
        userId:user.id,
        existingSessionId:typeof body.sessionId==="string"&&body.sessionId?body.sessionId:null
      });
      const [events,certifiedMemory]=await Promise.all([
        loadSessionEvents({
          staging:stagingClient,
          projectId:job.project_id,
          jobId:job.id,
          sessionId:session.id
        }),
        loadCertifiedMemory({
          client:userClient,
          projectId:job.project_id,
          jobId:job.id
        })
      ]);
      return json({
        sessionId:session.id,
        job,
        events,
        certifiedMemory
      },200,origin);
    }

    if(action!=="chat")return json({error:"Unsupported DataNest AI action."},400,origin);

    const message=String(body.message||"").trim();
    const clientRequestId=String(body.clientRequestId||"");
    if(!message||!clientRequestId){
      return json({error:"message and clientRequestId are required."},400,origin);
    }
    const requestedConnection=typeof body.providerConnectionId==="string"
      ?body.providerConnectionId
      :null;
    const requestedSessionId=typeof body.sessionId==="string"&&body.sessionId
      ?body.sessionId
      :null;
    const fingerprint=await sha256Text(message);
    let sessionId="";
    let certifiedMemoryIds:string[]=[];
    let provisionalIds:string[]=[];
    let requestStatus="pending";
    let activeRequestId="";
    let trendAnalysis:{status:"not_applicable"|"recorded"|"failed";candidateId?:string|null;trendKey?:string|null;evidenceCount?:number;error?:string}={status:"not_applicable"};

    const result=await executeChatTurn({
      beginRequest:async()=>{
        const {data,error}=await userClient.rpc("begin_datanest_ai_request",{
          target_job:job.id,
          target_client_request_id:clientRequestId,
          message_fingerprint:fingerprint
        });
        if(error)throw error;
        const row=(data||{}) as Record<string,unknown>;
        requestStatus=String(row.status||"pending");
        activeRequestId=String(row.id||"");
        return {
          id:activeRequestId,
          isNew:Boolean(row.is_new),
          status:requestStatus
        };
      },
      loadCachedTurn:async()=>loadCachedTurn({
        staging:stagingClient,
        userId:user.id,
        clientRequestId
      }),
      stageInput:async({requestId})=>{
        const session=await ensureStagingSession({
          staging:stagingClient,
          projectId:job.project_id,
          jobId:job.id,
          userId:user.id,
          existingSessionId:requestedSessionId
        });
        sessionId=session.id;
        const traceId="DN-AI-"+crypto.randomUUID();
        const {data,error}=await stagingClient
          .from("ai_intake_events")
          .insert({
            trace_id:traceId,
            project_id:job.project_id,
            job_id:job.id,
            session_id:session.id,
            source_type:"human",
            source_user_id:user.id,
            client_request_id:clientRequestId,
            content:message,
            content_hash:fingerprint,
            metadata:{
              request_id:requestId,
              trust_state:"uncertified",
              product_mode:legalMode?"legal_eagle":"datanest_ai",
              jurisdiction:legalMode?jurisdiction:null,
              legal_task:legalMode?legalTask:null,
              learning_eligible:!legalMode
            }
          })
          .select("id,trace_id,session_id")
          .single();
        if(error||!data)throw error||new Error("Unable to stage DataNest AI input.");
        return {
          id:String(data.id),
          traceId:String(data.trace_id),
          sessionId:String(data.session_id)
        };
      },
      finishRequest:async(input)=>finishUsageRequest(serviceClient,{
        requestId:input.requestId,
        target_status:input.status,
        errorCategory:input.errorCategory||null,
        errorMessage:input.errorCategory==="staging_intake_failed"
          ?"DataNest AI staging intake failed before provider execution."
          :null
      }),
      callProvider:async()=>{
        const [certifiedMemory,events]=await Promise.all([
          loadCertifiedMemory({
            client:userClient,
            projectId:job.project_id,
            jobId:job.id
          }),
          loadSessionEvents({
            staging:stagingClient,
            projectId:job.project_id,
            jobId:job.id,
            sessionId
          })
        ]);
        certifiedMemoryIds=certifiedMemory.map(item=>String(item.id||"")).filter(Boolean);
        provisionalIds=events.map(item=>item.id);
        const governanceRules=[
          "DATANEST AI GOVERNANCE",
          "Certified memory is reusable project knowledge.",
          "Uncertified current-session evidence is provisional and must not be generalized to other Jobs.",
          "Never claim certification that is not present in the supplied certified-memory context."
        ];
        if(legalMode){
          governanceRules.push(
            "LEGAL EAGLE · RESONANCE ASSISTANCE",
            "You are Legal Eagle, a legal-information and matter-preparation assistant. You are not a lawyer or law firm and do not create an attorney-client relationship or legal privilege.",
            `Relevant jurisdiction supplied by the user: ${jurisdiction}.`,
            `Requested legal workflow: ${legalTask||"general"}.`,
            "Help with plain-language explanation, issue spotting, chronology, document organization, research planning, question preparation and draft structure. Do not claim to represent the user.",
            "Separate user-supplied facts, assumptions, disputed claims and missing information. Do not turn allegations into established facts.",
            "Do not fabricate statutes, cases, citations, court rules, filing requirements or deadlines. When current primary-source verification is unavailable, say what official source or qualified professional should verify the point.",
            "Treat deadlines, limitation periods, court dates, criminal exposure, immigration status, family safety, housing loss and similar high-impact matters as requiring prompt verification by qualified local counsel or the appropriate authority.",
            "Never promise an outcome or present a legal strategy as guaranteed. Present options, uncertainties and questions for a qualified lawyer.",
            "Templates and draft wording must be described as drafts for human review, not filed-ready or lawyer-approved documents.",
            "Do not infer consent to contact courts, regulators, opposing parties or other people. Legal Eagle cannot act as the user's representative.",
            "Keep this legal conversation scoped to the current Job/session. It is not eligible for automatic project-wide learning."
          );
        }
        const governedPrompt=buildGovernedPrompt({
          governance:governanceRules.join("\n"),
          certifiedMemory:certifiedMemory.map(item=>String(item.normalized_knowledge||"")),
          job,
          uncertifiedEvidence:events.map(item=>item.content),
          userMessage:message
        });

        const {data:connectionData,error:connectionError}=await serviceClient.rpc(
          "service_get_ai_provider_connection_v2",{
            target_project:job.project_id,
            target_user:user.id,
            target_connection:requestedConnection
          }
        );
        if(connectionError)throw connectionError;

        if(connectionData){
          const connection=connectionData as ProviderConnection;
          const {data:authz,error:authzError}=await serviceClient.rpc(
            "service_authorize_ai_request",{
              target_request:activeRequestId,
              target_connection:connection.id
            }
          );
          if(authzError)throw authzError;
          if(Boolean((authz as Record<string,unknown>|null)?.allowed)){
            try{
              const ext=await callOpenAiCompatibleProvider({
                connection,
                governedPrompt,
                maxOutputTokens:Number((authz as Record<string,unknown>).max_output_tokens||4000)
              });
              await finishUsageRequest(serviceClient,{
                requestId:activeRequestId,
                target_status:"succeeded",
                inputTokens:ext.inputTokens,
                outputTokens:ext.outputTokens
              });
              requestStatus="succeeded";
              return {
                content:ext.content,
                providerMode:"external",
                providerLabel:connection.label,
                inputTokens:ext.inputTokens,
                outputTokens:ext.outputTokens
              };
            }catch(error){
              const category=(error as Error&{category?:string}).category==="failed"
                ?"failed"
                :"unknown";
              requestStatus=category;
              await finishUsageRequest(serviceClient,{
                requestId:activeRequestId,
                target_status:category,
                errorCategory:category==="failed"?"provider_failure":"provider_outcome_unknown",
                errorMessage:category==="failed"
                  ?"Provider rejected or could not complete the request."
                  :"Provider outcome is unknown; DataNest will not retry automatically."
              });
            }
          }else{
            requestStatus="denied";
            await finishUsageRequest(serviceClient,{
              requestId:activeRequestId,
              target_status:"denied",
              errorCategory:String((authz as Record<string,unknown>|null)?.reason||"policy_denied"),
              errorMessage:"Provider request blocked by DataNest policy."
            });
          }
        }

        if(requestStatus==="pending"){
          await finishUsageRequest(serviceClient,{
            requestId:activeRequestId,
            target_status:"embedded"
          });
          requestStatus="embedded";
        }

        return {
          content:embeddedResponse(job,message,productMode,jurisdiction),
          providerMode:"embedded",
          providerLabel:null,
          inputTokens:0,
          outputTokens:0
        };
      },
      stageOutput:async({inputEvent,provider})=>{
        const traceId="DN-AI-"+crypto.randomUUID();
        const contentHash=await sha256Text(provider.content);
        const {data,error}=await stagingClient
          .from("ai_intake_events")
          .insert({
            trace_id:traceId,
            project_id:job.project_id,
            job_id:job.id,
            session_id:sessionId,
            source_type:"datanest_ai",
            source_provider:provider.providerLabel||provider.providerMode||"embedded",
            parent_event_id:inputEvent.id,
            content:provider.content,
            content_hash:contentHash,
            metadata:{
              trust_state:"uncertified",
              request_status:requestStatus,
              policy_version:policyVersion,
              product_mode:legalMode?"legal_eagle":"datanest_ai",
              jurisdiction:legalMode?jurisdiction:null,
              legal_task:legalMode?legalTask:null,
              learning_eligible:!legalMode
            }
          })
          .select("id,trace_id")
          .single();
        if(error||!data)throw error||new Error("Unable to stage DataNest AI response.");
        return {id:String(data.id),traceId:String(data.trace_id)};
      },
      stageEnvelope:async({inputEvent,outputEvent,provider})=>{
        const ids=[...new Set([...provisionalIds,String(inputEvent.id||"")].filter(Boolean))];
        const {error}=await stagingClient
          .from("ai_reasoning_envelopes")
          .insert({
            project_id:job.project_id,
            job_id:job.id,
            session_id:sessionId,
            output_event_id:outputEvent.id,
            provider_route:provider.providerMode||"embedded",
            policy_version:policyVersion,
            input_event_ids:ids,
            certified_memory_ids:certifiedMemoryIds,
            uncertified_event_ids:ids,
            request_status:requestStatus
          });
        if(error)throw error;

        if(legalMode){
          trendAnalysis={status:"not_applicable"};
          return;
        }
        try{
          const trend=await updateTrendCandidate({
            staging:stagingClient,
            projectId:job.project_id,
            inputEventId:String(inputEvent.id||"")
          });
          trendAnalysis=trend.candidateId
            ?{status:"recorded",...trend}
            :{status:"not_applicable",...trend};
        }catch(trendError){
          trendAnalysis={
            status:"failed",
            error:trendError instanceof Error?trendError.message:"Trend analysis failed."
          };
        }
      }
    },{message});

    return json({
      ...result,
      trustState:"UNCERTIFIED",
      certifiedMemoryIds,
      requestStatus,
      trendAnalysis,
      productMode:legalMode?"legal_eagle":null,
      jurisdiction:legalMode?jurisdiction:null,
      learningEligible:!legalMode
    },200,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to process DataNest AI request.";
    const status=/staging/i.test(message)?503:400;
    return json({error:message},status,origin);
  }
});
