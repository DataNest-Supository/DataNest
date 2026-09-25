import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  candidateFromRepeatedEvidence
} from "../_shared/datanestAiTrends.ts";
import { chronologicalFromNewestFirst } from "../_shared/datanestAiContinuity.ts";

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
  const configuredUrl=Deno.env.get("DATANEST_AI_STAGING_URL");
  const configuredKey=Deno.env.get("DATANEST_AI_STAGING_SERVICE_ROLE_KEY");
  if(configuredUrl&&configuredKey)return {url:configuredUrl,key:configuredKey};

  if(supabaseUrl.includes(dedicatedStagingRef)){
    return {url:supabaseUrl,key:serviceKey};
  }

  throw new Error(
    "Dedicated DataNest AI staging credentials are required in production."
  );
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
    .select("id,content")
    .eq("project_id",input.projectId)
    .in("source_type",["human","ai_companion"])
    .order("created_at",{ascending:false})
    .limit(100);
  if(error)throw error;

  const evidence=(data||[]) as Array<{id:string;content:string}>;
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
  let overlapCandidate:null|{id:string;lifecycle_state:string;evidence_count:number}=null;
  if(overlapCandidateId){
    const {data,error}=await input.staging
      .from("ai_learning_candidates")
      .select("id,lifecycle_state,evidence_count")
      .eq("id",overlapCandidateId)
      .eq("project_id",input.projectId)
      .maybeSingle();
    if(error)throw error;
    overlapCandidate=data&&String(data.lifecycle_state)==="INTAKE"
      ?data as typeof overlapCandidate
      :null;
  }

  const {data:existing,error:existingError}=overlapCandidate
    ?{data:overlapCandidate,error:null}
    :await input.staging
    .from("ai_learning_candidates")
    .select("id,lifecycle_state,evidence_count")
    .eq("project_id",input.projectId)
    .eq("content_hash",contentHash)
    .limit(1)
    .maybeSingle();
  if(existingError)throw existingError;

  let candidateId=existing?.id?String(existing.id):"";
  if(existing?.id){
    if(!["INTAKE","NEEDS_EVIDENCE"].includes(String(existing.lifecycle_state))){
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
        updated_at:new Date().toISOString()
      })
      .eq("id",candidateId);
    if(updateError)throw updateError;
  }else{
    const {data:created,error:createError}=await input.staging
      .from("ai_learning_candidates")
      .insert({
        project_id:input.projectId,
        normalized_knowledge:candidate.normalizedKnowledge,
        category:candidate.category,
        risk_class:candidate.riskClass,
        lifecycle_state:"INTAKE",
        evidence_count:candidate.evidenceIds.length,
        has_conflict:false,
        policy_version:policyVersion,
        content_hash:contentHash
      })
      .select("id")
      .single();
    if(createError||!created)throw createError||new Error("Unable to create DataNest AI learning candidate.");
    candidateId=String(created.id);
  }

  const candidateEvidence=candidate.evidenceIds.map(eventId=>({
    candidate_id:candidateId,
    event_id:eventId
  }));
  const {error:candidateEvidenceError}=await input.staging
    .from("ai_candidate_evidence")
    .upsert(candidateEvidence,{onConflict:"candidate_id,event_id"});
  if(candidateEvidenceError)throw candidateEvidenceError;

  return {
    candidateId,
    trendKey:candidate.trendKey,
    evidenceCount:candidate.evidenceIds.length
  };
}

function embeddedResponse(job:JobContext,message:string){
  const code="JOB-"+String(job.job_number||0).padStart(5,"0");
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
              trust_state:"uncertified"
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
        const governedPrompt=buildGovernedPrompt({
          governance:[
            "DATANEST AI GOVERNANCE",
            "Certified memory is reusable project knowledge.",
            "Uncertified current-session evidence is provisional and must not be generalized to other Jobs.",
            "Never claim certification that is not present in the supplied certified-memory context."
          ].join("\n"),
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
          content:embeddedResponse(job,message),
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
              policy_version:policyVersion
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
      trendAnalysis
    },200,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to process DataNest AI request.";
    const status=/staging/i.test(message)?503:400;
    return json({error:message},status,origin);
  }
});
