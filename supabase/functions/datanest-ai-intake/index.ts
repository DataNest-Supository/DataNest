import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sha256Text } from "../_shared/datanestAiRuntime.ts";
import { replayContentMatches } from "../_shared/datanestAiContinuity.ts";

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
type AnyClient=SupabaseClient<any>;

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
async function ensureCompanionSession(input:{
  staging:AnyClient;
  projectId:string;
  jobId:string;
  userId:string;
  externalSessionId:string;
  preferredSessionId:string|null;
}){
  if(input.preferredSessionId){
    const {data,error}=await input.staging
      .from("ai_sessions")
      .select("id,project_id,job_id,user_id")
      .eq("id",input.preferredSessionId)
      .eq("project_id",input.projectId)
      .eq("job_id",input.jobId)
      .eq("user_id",input.userId)
      .maybeSingle();
    if(error)throw error;
    if(!data){
      throw new Error("Active DataNest AI session does not match the authorized user and Job.");
    }
    return {id:String(data.id)};
  }

  const {data,error}=await input.staging
    .from("ai_sessions")
    .upsert({
      project_id:input.projectId,
      job_id:input.jobId,
      user_id:input.userId,
      client_session_id:input.externalSessionId
    },{onConflict:"user_id,client_session_id"})
    .select("id,project_id,job_id,user_id")
    .single();
  if(error||!data)throw error||new Error("Unable to create external AI staging session.");
  if(
    String(data.project_id)!==input.projectId ||
    String(data.job_id)!==input.jobId ||
    String(data.user_id)!==input.userId
  ){
    throw new Error("Existing external AI staging session does not match the authorized Job.");
  }
  return {id:String(data.id)};
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
    const staging=createClient(stagingEnv.url,stagingEnv.key,{
      auth:{persistSession:false,autoRefreshToken:false}
    });

    const {data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user)return json({error:"Authentication is required."},401,origin);
    const user=userData.user;

    const body=await request.json().catch(()=>({})) as Record<string,unknown>;
    if(String(body.sourceType||"")!=="ai_companion"){
      return json({error:"sourceType must be ai_companion."},400,origin);
    }
    const externalAiSessionId=String(body.externalAiSessionId||"");
    const datanestAiSessionId=String(body.datanestAiSessionId||"").trim();
    const content=String(body.content||"").trim();
    if(!externalAiSessionId||!content){
      return json({error:"externalAiSessionId and content are required."},400,origin);
    }

    const {data:session,error:sessionError}=await userClient
      .from("external_ai_sessions")
      .select("id,project_id,job_id,user_id,provider,status,context_snapshot,staging_event_id,staging_trace_id")
      .eq("id",externalAiSessionId)
      .single();
    if(sessionError||!session)return json({error:"External AI session not found."},404,origin);
    if(String(session.user_id)!==user.id){
      return json({error:"External AI session ownership is required."},403,origin);
    }

    const {data:job,error:jobError}=await userClient
      .from("jobs")
      .select("id,project_id")
      .eq("id",session.job_id)
      .eq("project_id",session.project_id)
      .single();
    if(jobError||!job)return json({error:"Job collaboration access is required."},403,origin);

    const contentHash=await sha256Text(content);
    if(session.staging_event_id){
      const {data:linkedEvent,error:linkedEventError}=await staging
        .from("ai_intake_events")
        .select("id,trace_id,content_hash,session_id,external_ai_session_id")
        .eq("id",String(session.staging_event_id))
        .maybeSingle();
      if(linkedEventError)throw linkedEventError;
      if(!linkedEvent||String(linkedEvent.external_ai_session_id)!==String(session.id)){
        return json({error:"The linked external AI evidence could not be verified."},409,origin);
      }
      if(!replayContentMatches(String(linkedEvent.content_hash||""),contentHash)){
        return json({error:"This external AI session is already staged with different content."},409,origin);
      }
      return json({
        eventId:String(linkedEvent.id),
        traceId:String(linkedEvent.trace_id||session.staging_trace_id||""),
        sessionId:String(linkedEvent.session_id||""),
        jobId:String(session.job_id),
        trustState:"UNCERTIFIED",
        idempotent:true
      },200,origin);
    }

    const traceKey=String(
      (session.context_snapshot as Record<string,unknown>|null)?.trace_key||""
    )||"DN-AI-"+crypto.randomUUID();

    const stagingSession=await ensureCompanionSession({
      staging,
      projectId:String(session.project_id),
      jobId:String(session.job_id),
      userId:user.id,
      externalSessionId:String(session.id),
      preferredSessionId:datanestAiSessionId||null
    });

    const {data:existing,error:existingError}=await staging
      .from("ai_intake_events")
      .select("id,trace_id,content_hash,session_id")
      .eq("source_type","ai_companion")
      .eq("external_ai_session_id",String(session.id))
      .limit(1)
      .maybeSingle();
    if(existingError)throw existingError;

    let staged=existing as Record<string,unknown>|null;
    if(staged&&!replayContentMatches(String(staged.content_hash||""),contentHash)){
      return json({error:"This external AI session is already staged with different content."},409,origin);
    }

    if(!staged){
      const {data:created,error:createError}=await staging
        .from("ai_intake_events")
        .insert({
          trace_id:traceKey,
          project_id:String(session.project_id),
          job_id:String(session.job_id),
          session_id:stagingSession.id,
          source_type:"ai_companion",
          source_user_id:user.id,
          source_provider:String(session.provider),
          external_ai_session_id:String(session.id),
          content,
          content_hash:contentHash,
          metadata:{
            trace_key:traceKey,
            trust_state:"uncertified",
            source:"external_ai_companion"
          }
        })
        .select("id,trace_id,content_hash,session_id")
        .single();
      if(createError||!created)throw createError||new Error("Unable to stage external AI evidence.");
      staged=created as Record<string,unknown>;
    }

    const {data:linked,error:linkError}=await userClient.rpc(
      "mark_external_ai_session_staged",{
        target_session:String(session.id),
        target_staging_event:String(staged.id),
        target_trace_id:String(staged.trace_id)
      }
    );
    if(linkError)throw linkError;

    return json({
      eventId:String(staged.id),
      traceId:String(staged.trace_id),
      sessionId:String(staged.session_id||stagingSession.id),
      jobId:String(session.job_id),
      trustState:"UNCERTIFIED",
      idempotent:Boolean((linked as Record<string,unknown>|null)?.idempotent)
    },200,origin);
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to stage external AI evidence.";
    return json({error:message},400,origin);
  }
});
