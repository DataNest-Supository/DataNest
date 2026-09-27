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
  resolveIlm1Route,
  type Ilm1RouteResult,
  type IlmProfile
} from "../_shared/ilm.ts";
import { chronologicalFromNewestFirst } from "../_shared/datanestAiContinuity.ts";
import { updateTrendCandidate } from "../_shared/datanestAiLearning.ts";

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
const visibilityClasses=new Set([
  "public","nest_private","project_restricted","organization_restricted","high_sensitivity","local_only"
]);
const rawReuseStates=new Set([
  "runtime_only","session_context","project_learning_eligible"
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


async function loadActiveIlmProfile(input:{
  serviceClient:AnyClient;
  projectId:string;
}):Promise<IlmProfile|null>{
  const {data,error}=await input.serviceClient
    .from("ilm_profiles")
    .select("id,project_id,version,profile_key,allowed_purposes,default_capability,allowed_resource_kinds,memory_policy,routing_policy,evaluation_policy")
    .eq("project_id",input.projectId)
    .eq("profile_key","ilm-1")
    .eq("status","active")
    .order("version",{ascending:false})
    .limit(1)
    .maybeSingle();
  if(error){
    const code=String((error as {code?:unknown}).code||"");
    const message=String((error as {message?:unknown}).message||"");
    if(code==="42P01"||code==="PGRST205"||/ilm_profiles.*schema cache/i.test(message)){
      return null;
    }
    throw error;
  }
  if(!data)return null;
  return {
    id:String(data.id),
    projectId:String(data.project_id),
    version:Number(data.version),
    profileKey:String(data.profile_key),
    allowedPurposes:Array.isArray(data.allowed_purposes)?data.allowed_purposes.map(String):[],
    defaultCapability:String(data.default_capability||"chat"),
    allowedResourceKinds:Array.isArray(data.allowed_resource_kinds)?data.allowed_resource_kinds.map(String):[],
    memoryPolicy:typeof data.memory_policy==="object"&&data.memory_policy?data.memory_policy as Record<string,unknown>:{},
    routingPolicy:typeof data.routing_policy==="object"&&data.routing_policy?data.routing_policy as Record<string,unknown>:{},
    evaluationPolicy:typeof data.evaluation_policy==="object"&&data.evaluation_policy?data.evaluation_policy as Record<string,unknown>:{}
  };
}

async function resolveActiveIlmRoute(input:{
  serviceClient:AnyClient;
  userId:string;
  job:JobContext;
  requestId:string;
  traceId:string;
  purpose:string;
  visibilityClass:string;
  learningEligible:boolean;
  requestedConnection:string|null;
  certifiedMemory:Array<Record<string,unknown>>;
}):Promise<{route:Ilm1RouteResult|null;connection:ProviderConnection|null;phaseCDecisionRecordId:string|null}>{
  const profile=await loadActiveIlmProfile({
    serviceClient:input.serviceClient,
    projectId:input.job.project_id
  });
  if(!profile)return {route:null,connection:null,phaseCDecisionRecordId:null};

  let selectedConnection:ProviderConnection|null=null;
  let selectedPhaseCDecisionRecordId:string|null=null;
  const requestedCapability=profile.defaultCapability
    ||(Array.isArray(input.job.required_capabilities)&&input.job.required_capabilities.length
      ?String(input.job.required_capabilities[0])
      :"chat");

  const route=await resolveIlm1Route({
    loadCertifiedMemory:async()=>input.certifiedMemory.map(item=>({
      id:String(item.id||""),
      normalizedKnowledge:String(item.normalized_knowledge||"")
    })).filter(item=>Boolean(item.id)),
    evaluateDataPolicy:async()=>{
      const {data,error}=await input.serviceClient.rpc("service_evaluate_data_policy_v1",{
        target_project:input.job.project_id,
        target_actor_user:input.userId,
        target_subject_type:"job",
        target_purpose:input.purpose,
        target_requested_operation:"process",
        target_trace_id:input.traceId,
        target_subject_id:input.job.id,
        target_subject_reference:null,
        target_provider_connection:null,
        target_provider_key:null,
        target_hard_learning_exclusion:!input.learningEligible
      });
      if(error)throw error;
      const policy=(data||{}) as Record<string,unknown>;
      const outcome=String(policy.outcome||"review_required");
      return {
        outcome:outcome==="allow"?"allow":outcome==="deny"?"deny":"review_required",
        enforcementMode:String(policy.enforcement_mode||"report_only"),
        reasonCode:String(policy.reason_code||"policy_review_required"),
        evidence:{
          decision_trace:policy.decision_trace||null,
          decision_record_id:policy.decision_record_id||null,
          visibility_class:policy.visibility_class||input.visibilityClass,
          reuse_state:policy.reuse_state||null,
          policy_version:policy.policy_version||null,
          enforcement_mode:policy.enforcement_mode||null
        }
      };
    },
    resolveResourceCandidates:async(routeInput)=>{
      const effectiveVisibility=String(routeInput.policy.evidence?.visibility_class||input.visibilityClass);
      const {data,error}=await input.serviceClient.rpc("service_resolve_resource_candidates_v1",{
        target_project:input.job.project_id,
        target_capability:requestedCapability,
        target_requested_operation:"prepare",
        target_visibility_class:effectiveVisibility,
        target_trace_id:input.traceId
      });
      if(error)throw error;
      const result=(data||{}) as Record<string,unknown>;
      const rawCandidates=Array.isArray(result.eligible_candidates)?result.eligible_candidates:[];
      return {
        eligibleCandidates:rawCandidates.map(value=>{
          const row=value as Record<string,unknown>;
          return {
            resourceId:String(row.resource_id||""),
            capabilityId:String(row.capability_id||""),
            resourceKind:String(row.resource_kind||""),
            resourceKey:row.resource_key?String(row.resource_key):undefined
          };
        }).filter(candidate=>candidate.resourceId&&candidate.capabilityId&&candidate.resourceKind),
        decisions:Array.isArray(result.decisions)
          ?result.decisions as Array<Record<string,unknown>>
          :[]
      };
    },
    resolveProviderConnection:async(routeInput)=>{
      const {data:connectionData,error:connectionError}=await input.serviceClient.rpc(
        "service_get_ai_provider_connection_v2",{
          target_project:input.job.project_id,
          target_user:input.userId,
          target_connection:input.requestedConnection
        }
      );
      if(connectionError)throw connectionError;
      if(!connectionData)return null;

      const connection=connectionData as ProviderConnection;
      const providerKey=connection.provider.toLowerCase()+":"+connection.endpoint_host.toLowerCase();
      const {data:providerPolicyData,error:providerPolicyError}=await input.serviceClient.rpc(
        "service_evaluate_data_policy_v1",{
          target_project:input.job.project_id,
          target_actor_user:input.userId,
          target_subject_type:"job",
          target_purpose:"external_provider_processing",
          target_requested_operation:"process",
          target_trace_id:input.traceId,
          target_subject_id:input.job.id,
          target_subject_reference:null,
          target_provider_connection:connection.id,
          target_provider_key:providerKey,
          target_hard_learning_exclusion:!input.learningEligible
        }
      );
      if(providerPolicyError)throw providerPolicyError;
      const providerPolicy=(providerPolicyData||{}) as Record<string,unknown>;
      selectedPhaseCDecisionRecordId=providerPolicy.decision_record_id?String(providerPolicy.decision_record_id):null;
      if(String(providerPolicy.outcome||"deny")!=="allow")return null;

      selectedConnection=connection;
      const candidate=routeInput.resources.eligibleCandidates[0]||null;
      return {
        connectionId:connection.id,
        providerKey,
        modelLabel:connection.model,
        resourceId:candidate?.resourceId||null,
        capabilityId:candidate?.capabilityId||null,
        routeKind:"provider_model" as const,
        policyEvidence:{
          provider_decision_trace:providerPolicy.decision_trace||null,
          provider_decision_record_id:providerPolicy.decision_record_id||null,
          provider_profile_id:providerPolicy.provider_profile_id||null,
          provider_policy_version:providerPolicy.policy_version||null,
          provider_enforcement_mode:providerPolicy.enforcement_mode||null
        }
      };
    },
    recordRouteDecision:async(routeInput)=>{
      const {data,error}=await input.serviceClient.rpc("service_record_intelligence_route_v1",{
        target_project:routeInput.projectId,
        target_trace_id:routeInput.traceId,
        target_profile:routeInput.profileId,
        target_purpose:routeInput.purpose,
        target_visibility_class:routeInput.visibilityClass,
        target_requested_operation:routeInput.requestedOperation,
        target_requested_capability:routeInput.requestedCapability,
        target_route_kind:routeInput.routeKind,
        target_decision:routeInput.decision,
        target_reason_codes:routeInput.reasonCodes,
        target_certified_memory_ids:routeInput.certifiedMemoryIds,
        target_job:routeInput.jobId,
        target_ai_usage_request:routeInput.aiUsageRequestId,
        target_resource:routeInput.resourceId,
        target_capability:routeInput.capabilityId,
        target_provider_connection:routeInput.providerConnectionId,
        target_provider_key:routeInput.providerKey,
        target_model_label:routeInput.modelLabel,
        target_policy_evidence:routeInput.policyEvidence,
        target_resource_evidence:routeInput.resourceEvidence
      });
      if(error)throw error;
      return {id:String(data||"")};
    }
  },{
    projectId:input.job.project_id,
    jobId:input.job.id,
    aiUsageRequestId:input.requestId,
    traceId:input.traceId,
    profile,
    purpose:input.purpose,
    visibilityClass:input.visibilityClass,
    requestedOperation:"prepare",
    requestedCapability
  });

  return {route,connection:selectedConnection,phaseCDecisionRecordId:selectedPhaseCDecisionRecordId};
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

    const requestedVisibilityClass=String(body.visibilityClass||"").trim();
    if(requestedVisibilityClass&&!visibilityClasses.has(requestedVisibilityClass)){
      return json({error:"Unsupported DataNest AI visibility class."},400,origin);
    }
    const visibilityClass=requestedVisibilityClass||"project_restricted";

    const requestedReuseState=String(body.reuseState||"").trim();
    if(requestedReuseState&&!rawReuseStates.has(requestedReuseState)){
      return json({error:"Unsupported DataNest AI reuse state."},400,origin);
    }
    const reuseState=legalMode
      ?"session_context"
      :(requestedReuseState||"project_learning_eligible");
    const policyPurpose=legalMode?"user_requested_analysis":"job_execution";
    const learningEligible=!legalMode&&reuseState==="project_learning_eligible";

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
    let stagedInputTraceId="";
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
              requested_learning_eligible:learningEligible,
              learning_eligible:false,
              visibility_class:visibilityClass,
              reuse_state:reuseState,
              purpose:policyPurpose
            }
          })
          .select("id,trace_id,session_id")
          .single();
        if(error||!data)throw error||new Error("Unable to stage DataNest AI input.");
        stagedInputTraceId=String(data.trace_id);
        return {
          id:String(data.id),
          traceId:stagedInputTraceId,
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

        const ilm=await resolveActiveIlmRoute({
          serviceClient,
          userId:user.id,
          job,
          requestId:activeRequestId,
          traceId:stagedInputTraceId,
          purpose:policyPurpose,
          visibilityClass,
          learningEligible,
          requestedConnection,
          certifiedMemory
        });

        if(ilm.route){
          if(
            ilm.route.decision==="selected" &&
            ilm.route.routeKind==="provider_model" &&
            ilm.connection
          ){
            const connection=ilm.connection;
            const providerKey=connection.provider.toLowerCase()+":"+connection.endpoint_host.toLowerCase();
            const {data:ilmPhaseDAuthorityData,error:ilmPhaseDAuthorityError}=await serviceClient.rpc(
              "service_evaluate_execution_authority_v1",{
                target_project:job.project_id,
                target_requesting_user:user.id,
                target_route_key:"external_ai_provider",
                target_actor_type:"service",
                target_actor_reference:"service:datanest-ai",
                target_job:job.id,
                target_operation:"external_provider_call",
                target_consequence_class:"resource_execution",
                target_requested_autonomy:"A3",
                target_trace_id:stagedInputTraceId,
                target_capability_keys:["external_ai:"+providerKey],
                target_target_type:"provider",
                target_target_reference:providerKey,
                target_exact_evidence_identity:null,
                target_phase_c_decision:ilm.phaseCDecisionRecordId,
                target_provider_request:activeRequestId,
                target_require_reservation:false,
                target_consume_operation:true
              }
            );
            if(ilmPhaseDAuthorityError){
              requestStatus="denied";
              await finishUsageRequest(serviceClient,{
                requestId:activeRequestId,
                target_status:"denied",
                errorCategory:"execution_authority_evaluation_failed",
                errorMessage:"Execution authority could not be evaluated; external routing was stopped safely."
              });
            }else{
              const ilmPhaseDAuthority=(ilmPhaseDAuthorityData||{}) as Record<string,unknown>;
              const ilmPhaseDAuthorityEnforced=String(ilmPhaseDAuthority.enforcement_mode||"report_only")==="enforced";
              if(ilmPhaseDAuthorityEnforced&&String(ilmPhaseDAuthority.outcome||"deny")!=="allow"){
                requestStatus="denied";
                await finishUsageRequest(serviceClient,{
                  requestId:activeRequestId,
                  target_status:"denied",
                  errorCategory:"execution_authority_denied",
                  errorMessage:"Execution authority blocked external routing: "+String(ilmPhaseDAuthority.reason_code||"authority_denied")
                });
              }else{
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
            }
          }else if(ilm.route.decision==="rejected"){
            requestStatus="denied";
            await finishUsageRequest(serviceClient,{
              requestId:activeRequestId,
              target_status:"denied",
              errorCategory:ilm.route.reasonCodes[0]||"ilm_route_rejected",
              errorMessage:"ILM-1 rejected external intelligence routing for this request."
            });
          }
        }else{
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
            const providerKey=connection.provider.toLowerCase()+":"+connection.endpoint_host.toLowerCase();
            const {data:phaseCPolicyData,error:phaseCPolicyError}=await serviceClient.rpc(
              "service_evaluate_data_policy_v1",{
                target_project:job.project_id,
                target_actor_user:user.id,
                target_subject_type:"job",
                target_purpose:"external_provider_processing",
                target_requested_operation:"process",
                target_trace_id:stagedInputTraceId,
                target_subject_id:job.id,
                target_subject_reference:null,
                target_provider_connection:connection.id,
                target_provider_key:providerKey,
                target_hard_learning_exclusion:!learningEligible
              }
            );
            if(phaseCPolicyError)throw phaseCPolicyError;
            const phaseCPolicy=(phaseCPolicyData||{}) as Record<string,unknown>;
  
            const phaseCPolicyEnforced=String(phaseCPolicy.enforcement_mode||"report_only")==="enforced";
            if(phaseCPolicyEnforced&&String(phaseCPolicy.outcome||"deny")!=="allow"){
              requestStatus="denied";
              await finishUsageRequest(serviceClient,{
                requestId:activeRequestId,
                target_status:"denied",
                errorCategory:"provider_trust_policy_denied",
                errorMessage:"Provider Trust Profile blocked external routing: "+String(phaseCPolicy.reason_code||"policy_denied")
              });
            }else{
              const {data:phaseDAuthorityData,error:phaseDAuthorityError}=await serviceClient.rpc(
                "service_evaluate_execution_authority_v1",{
                  target_project:job.project_id,
                  target_requesting_user:user.id,
                  target_route_key:"external_ai_provider",
                  target_actor_type:"service",
                  target_actor_reference:"service:datanest-ai",
                  target_job:job.id,
                  target_operation:"external_provider_call",
                  target_consequence_class:"resource_execution",
                  target_requested_autonomy:"A3",
                  target_trace_id:stagedInputTraceId,
                  target_capability_keys:["external_ai:"+providerKey],
                  target_target_type:"provider",
                  target_target_reference:providerKey,
                  target_exact_evidence_identity:null,
                  target_phase_c_decision:phaseCPolicy.decision_record_id||null,
                  target_provider_request:activeRequestId,
                  target_require_reservation:false,
                  target_consume_operation:true
                }
              );
              if(phaseDAuthorityError){
                requestStatus="denied";
                await finishUsageRequest(serviceClient,{
                  requestId:activeRequestId,
                  target_status:"denied",
                  errorCategory:"execution_authority_evaluation_failed",
                  errorMessage:"Execution authority could not be evaluated; external routing was stopped safely."
                });
              }else{
                const phaseDAuthority=(phaseDAuthorityData||{}) as Record<string,unknown>;
                const phaseDAuthorityEnforced=String(phaseDAuthority.enforcement_mode||"report_only")==="enforced";
                if(phaseDAuthorityEnforced&&String(phaseDAuthority.outcome||"deny")!=="allow"){
                  requestStatus="denied";
                  await finishUsageRequest(serviceClient,{
                    requestId:activeRequestId,
                    target_status:"denied",
                    errorCategory:"execution_authority_denied",
                    errorMessage:"Execution authority blocked external routing: "+String(phaseDAuthority.reason_code||"authority_denied")
                  });
                }else{
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
              }                }
              }
            }
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
              requested_learning_eligible:learningEligible,
              learning_eligible:false,
              visibility_class:visibilityClass,
              reuse_state:reuseState,
              purpose:policyPurpose
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

        try{
          const {data:learningPolicyData,error:learningPolicyError}=await serviceClient.rpc(
            "service_evaluate_data_policy_v1",{
              target_project:job.project_id,
              target_actor_user:user.id,
              target_subject_type:"job",
              target_purpose:"project_learning",
              target_requested_operation:"reuse",
              target_trace_id:String(inputEvent.traceId||stagedInputTraceId),
              target_subject_id:job.id,
              target_subject_reference:null,
              target_provider_connection:null,
              target_provider_key:null,
              target_hard_learning_exclusion:!learningEligible
            }
          );
          if(learningPolicyError)throw learningPolicyError;
          const learningPolicy=(learningPolicyData||{}) as Record<string,unknown>;
          const finalLearningEligible=learningEligible&&String(learningPolicy.outcome||"deny")==="allow";
          const {error:learningStampError}=await stagingClient
            .from("ai_intake_events")
            .update({
              metadata:{
                request_id:activeRequestId,
                trust_state:"uncertified",
                product_mode:legalMode?"legal_eagle":"datanest_ai",
                jurisdiction:legalMode?jurisdiction:null,
                legal_task:legalMode?legalTask:null,
                requested_learning_eligible:learningEligible,
                learning_eligible:finalLearningEligible,
                visibility_class:visibilityClass,
                reuse_state:reuseState,
                effective_reuse_state:learningPolicy.reuse_state,
                purpose:policyPurpose,
                policy_version:learningPolicy.policy_version||policyVersion,
                decision_record_id:learningPolicy.decision_record_id
              }
            })
            .eq("id",String(inputEvent.id||""))
            .eq("project_id",job.project_id);
          if(learningStampError)throw learningStampError;

          if(legalMode){
            trendAnalysis={status:"not_applicable"};
            return;
          }
          if(!finalLearningEligible){
            trendAnalysis={status:"not_applicable"};
            return;
          }

          const trend=await updateTrendCandidate({
            staging:stagingClient,
            projectId:job.project_id,
            inputEventId:String(inputEvent.id||""),
            policyVersion
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
      learningEligible,
      visibilityClass,
      reuseState,
      policyPurpose
    },200,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to process DataNest AI request.";
    const status=/staging/i.test(message)?503:400;
    return json({error:message},status,origin);
  }
});
