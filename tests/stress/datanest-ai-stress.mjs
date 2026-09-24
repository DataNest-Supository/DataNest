import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url=process.env.DATANEST_AI_STAGING_URL;
const publishableKey=process.env.DATANEST_AI_STAGING_PUBLISHABLE_KEY;
const serviceKey=process.env.DATANEST_AI_STAGING_SERVICE_ROLE_KEY;
const email=process.env.DATANEST_AI_E2E_EMAIL;
const password=process.env.DATANEST_AI_E2E_PASSWORD;

if(!url||!publishableKey||!serviceKey||!email||!password){
  throw new Error("Staging URL, publishable/service keys, and E2E credentials are required.");
}

const client=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

const signed=await client.auth.signInWithPassword({email,password});
if(signed.error)throw signed.error;

const projectResult=await client.from("projects")
  .select("id")
  .eq("slug","resonance-datanest")
  .single();
if(projectResult.error)throw projectResult.error;
const projectId=projectResult.data.id;

const jobsResult=await client.from("jobs")
  .select("id,title")
  .eq("project_id",projectId)
  .eq("title","DataNest AI E2E Job")
  .single();
if(jobsResult.error)throw jobsResult.error;
const jobId=jobsResult.data.id;

const context=await client.functions.invoke("datanest-ai-chat",{
  body:{action:"context",jobId,sessionId:null}
});
if(context.error)throw context.error;
const sessionId=context.data?.sessionId;
if(!sessionId)throw new Error("DataNest AI did not establish an E2E session.");

const marker="stress-"+Date.now()+"-"+crypto.randomUUID().slice(0,8);
const requests=Array.from({length:25},(_,index)=>({
  clientRequestId:crypto.randomUUID(),
  message:marker+"-message-"+index
}));

const results=await Promise.all(requests.map(item=>
  client.functions.invoke("datanest-ai-chat",{
    body:{
      action:"chat",
      jobId,
      sessionId,
      clientRequestId:item.clientRequestId,
      message:item.message
    }
  })
));
if(results.some(result=>result.error)){
  const failures=results.filter(result=>result.error).map(result=>String(result.error?.message||result.error));
  throw new Error("Unique stress request failed: "+failures.join(" | "));
}

const duplicateId=requests[0].clientRequestId;
const duplicates=await Promise.all(Array.from({length:5},()=>
  client.functions.invoke("datanest-ai-chat",{
    body:{
      action:"chat",
      jobId,
      sessionId,
      clientRequestId:duplicateId,
      message:requests[0].message
    }
  })
));
if(duplicates.some(result=>result.error||!result.data?.idempotent)){
  throw new Error("Duplicate request was not returned idempotently.");
}

const human=await admin.from("ai_intake_events")
  .select("id,content,job_id,session_id")
  .eq("job_id",jobId)
  .eq("session_id",sessionId)
  .eq("source_type","human")
  .like("content",marker+"%");
if(human.error)throw human.error;
if(human.data.length!==25){
  throw new Error("Expected 25 distinct human intake events; received "+human.data.length+".");
}

const outputs=await admin.from("ai_intake_events")
  .select("id,parent_event_id,job_id,session_id")
  .eq("job_id",jobId)
  .eq("session_id",sessionId)
  .eq("source_type","datanest_ai")
  .in("parent_event_id",human.data.map(item=>item.id));
if(outputs.error)throw outputs.error;
if(outputs.data.length!==25){
  throw new Error("Expected 25 distinct DataNest AI output events; received "+outputs.data.length+".");
}

const secondJobTitle="DataNest AI Cross-Job Isolation E2E";
let secondJob=(await admin.from("jobs")
  .select("id")
  .eq("project_id",projectId)
  .eq("title",secondJobTitle)
  .maybeSingle());
if(secondJob.error)throw secondJob.error;
if(!secondJob.data){
  const latest=await admin.from("jobs")
    .select("job_number")
    .eq("project_id",projectId)
    .order("job_number",{ascending:false})
    .limit(1);
  if(latest.error)throw latest.error;
  const inserted=await admin.from("jobs").insert({
    project_id:projectId,
    job_number:Number(latest.data?.[0]?.job_number||0)+1,
    title:secondJobTitle,
    description:"Cross-Job isolation acceptance fixture.",
    priority:10,
    status:"READY",
    required_capabilities:["chat"],
    requirements:{environment:"staging"},
    acceptance:{cross_job_isolation:true}
  }).select("id").single();
  if(inserted.error)throw inserted.error;
  secondJob={data:inserted.data,error:null};
}

const leaked=await admin.from("ai_intake_events")
  .select("id")
  .eq("session_id",sessionId)
  .eq("job_id",secondJob.data.id);
if(leaked.error)throw leaked.error;
if(leaked.data.length!==0){
  throw new Error("Cross-Job leakage detected in the first Job/session.");
}

console.log(JSON.stringify({
  marker,
  uniqueRequests:25,
  duplicateRetries:5,
  humanEvents:human.data.length,
  outputEvents:outputs.data.length,
  crossJobLeakage:0
}));
