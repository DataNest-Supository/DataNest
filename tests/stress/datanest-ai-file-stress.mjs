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
if(signed.error||!signed.data.user)throw signed.error||new Error("E2E sign-in failed.");
const userId=signed.data.user.id;

const projectResult=await client.from("projects").select("id").eq("slug","resonance-datanest").single();
if(projectResult.error)throw projectResult.error;
const projectId=projectResult.data.id;

const jobResult=await client.from("jobs")
  .select("id")
  .eq("project_id",projectId)
  .eq("title","DataNest AI E2E Job")
  .single();
if(jobResult.error)throw jobResult.error;
const jobId=jobResult.data.id;

const context=await client.functions.invoke("datanest-ai-chat",{body:{action:"context",jobId,sessionId:null}});
if(context.error||!context.data?.sessionId)throw context.error||new Error("E2E session unavailable.");
const sessionId=context.data.sessionId;

const marker="file-worker-stress-"+Date.now()+"-"+crypto.randomUUID().slice(0,8);
const duplicate=Buffer.from(marker+" duplicate payload ".repeat(16),"utf8");
const payloads=[
  duplicate,
  duplicate,
  ...Array.from({length:4},(_,index)=>Buffer.from(marker+" unique "+index+" ".repeat(32),"utf8"))
];

const submission=await admin.from("ai_file_submissions").insert({
  trace_id:"DN-FILE-STRESS-"+marker,
  project_id:projectId,
  job_id:jobId,
  session_id:sessionId,
  user_id:userId,
  client_request_id:crypto.randomUUID(),
  instruction:"Worker durability stress fixture.",
  status:"UPLOADING",
  file_count:payloads.length
}).select("id").single();
if(submission.error)throw submission.error;

const submissionId=submission.data.id;
let artifactIds=[];
let canonicalPaths=[];

try{
  for(let index=0;index<payloads.length;index++){
    const item=await admin.from("ai_file_submission_items").insert({
      submission_id:submissionId,
      trace_id:"DN-FILE-STRESS-"+marker+"-F"+String(index+1).padStart(2,"0"),
      client_index:index,
      original_name:"fixture-"+index+".txt",
      declared_mime:"text/plain",
      byte_size:payloads[index].byteLength,
      client_sha256:"0".repeat(64),
      status:"UPLOADING"
    }).select("id").single();
    if(item.error)throw item.error;

    const tempPath="incoming/"+submissionId+"/"+item.data.id+"/fixture-"+index+".txt";
    const uploaded=await admin.storage.from("datanest-ai-staging-files")
      .upload(tempPath,payloads[index],{contentType:"text/plain",upsert:false});
    if(uploaded.error)throw uploaded.error;

    const updated=await admin.from("ai_file_submission_items")
      .update({storage_object_path:tempPath,status:"QUEUED"})
      .eq("id",item.data.id);
    if(updated.error)throw updated.error;

    const queued=await admin.rpc("service_enqueue_datanest_file_item",{
      target_queue:"datanest_file_ingestion",
      target_item:item.data.id
    });
    if(queued.error)throw queued.error;
  }

  for(let pass=0;pass<3;pass++){
    const response=await fetch(url.replace(/\/$/,"")+"/functions/v1/datanest-ai-file-worker",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-datanest-worker-auth":serviceKey
      },
      body:JSON.stringify({action:"drain"})
    });
    if(!response.ok)throw new Error("Worker drain failed: "+await response.text());
  }

  const items=await admin.from("ai_file_submission_items")
    .select("id,trace_id,status,verified_sha256,client_hash_matches,storage_object_path,artifact_id")
    .eq("submission_id",submissionId)
    .order("client_index",{ascending:true});
  if(items.error)throw items.error;
  if(items.data.some(item=>item.status!=="READY")){
    throw new Error("Expected every worker stress item to be READY.");
  }
  if(items.data.some(item=>item.client_hash_matches!==false)){
    throw new Error("Server digest did not override the deliberately wrong client digest.");
  }
  if(items.data[0].verified_sha256!==items.data[1].verified_sha256){
    throw new Error("Duplicate bytes did not converge on one server SHA-256.");
  }
  if(items.data[0].artifact_id!==items.data[1].artifact_id){
    throw new Error("Duplicate bytes did not reuse the same normalized artifact.");
  }
  if(items.data[0].trace_id===items.data[1].trace_id){
    throw new Error("Duplicate bytes lost distinct logical submission traces.");
  }

  artifactIds=[...new Set(items.data.map(item=>item.artifact_id).filter(Boolean))];
  canonicalPaths=[...new Set(items.data.map(item=>item.storage_object_path).filter(Boolean))];

  const chunkCountBefore=await admin.from("datanest_chunks")
    .select("id",{count:"exact",head:true})
    .in("artifact_id",artifactIds);
  if(chunkCountBefore.error)throw chunkCountBefore.error;

  const redelivery=await admin.rpc("service_enqueue_datanest_file_item",{
    target_queue:"datanest_file_ingestion",
    target_item:items.data[0].id
  });
  if(redelivery.error)throw redelivery.error;

  const redeliveryResponse=await fetch(url.replace(/\/$/,"")+"/functions/v1/datanest-ai-file-worker",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-datanest-worker-auth":serviceKey},
    body:JSON.stringify({action:"drain"})
  });
  if(!redeliveryResponse.ok)throw new Error("READY redelivery drain failed.");

  const chunkCountAfter=await admin.from("datanest_chunks")
    .select("id",{count:"exact",head:true})
    .in("artifact_id",artifactIds);
  if(chunkCountAfter.error)throw chunkCountAfter.error;
  if(chunkCountAfter.count!==chunkCountBefore.count){
    throw new Error("READY redelivery duplicated normalized chunks.");
  }

  console.log(JSON.stringify({
    marker,
    logicalItems:items.data.length,
    duplicatePhysicalHash:items.data[0].verified_sha256,
    duplicateArtifactReused:true,
    distinctLogicalTraces:true,
    clientHashOverriddenByServer:true,
    readyRedeliveryChunkDelta:0
  }));
}finally{
  await admin.from("ai_file_submissions").delete().eq("id",submissionId);
  if(artifactIds.length)await admin.from("datanest_artifacts").delete().in("id",artifactIds);
  if(canonicalPaths.length)await admin.storage.from("datanest-ai-staging-files").remove(canonicalPaths);
}
