import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const canonicalTarget=new URL(process.env.DATANEST_CERTIFICATION_URL||"https://invalid.invalid");
const stagingTarget=new URL(process.env.DATANEST_AI_STAGING_URL||"https://invalid.invalid");
assert.equal(process.env.DATANEST_CERTIFICATION_TARGET,"local-canonical","Backend acceptance must use the isolated canonical certification target.");
assert.ok(["127.0.0.1","localhost"].includes(canonicalTarget.hostname),"Canonical collaborator authentication must remain loopback-local.");
assert.equal(stagingTarget.href,"https://qchttpcyqlqnhvahprhz.supabase.co/","The AI evidence data plane must remain the dedicated staging project.");
assert.equal(process.env.DATANEST_AI_E2E_EMAIL,"datanest-ai-e2e@resonance.invalid","Only the governed synthetic E2E identity may run this suite.");
for(const name of [
  "DATANEST_CERTIFICATION_PUBLISHABLE_KEY",
  "DATANEST_CERTIFICATION_SERVICE_ROLE_KEY",
  "DATANEST_AI_STAGING_SERVICE_ROLE_KEY",
  "DATANEST_AI_E2E_PASSWORD"
]){
  assert.ok(process.env[name],`${name} is required.`);
}

const {createClient}=await import("@supabase/supabase-js");
const options={auth:{persistSession:false,autoRefreshToken:false}};
const canonical=createClient(canonicalTarget.origin,process.env.DATANEST_CERTIFICATION_PUBLISHABLE_KEY,options);
const canonicalAdmin=createClient(canonicalTarget.origin,process.env.DATANEST_CERTIFICATION_SERVICE_ROLE_KEY,options);
const stagingAdmin=createClient(stagingTarget.origin,process.env.DATANEST_AI_STAGING_SERVICE_ROLE_KEY,options);

function dataOf(result,label){
  if(result.error||!result.data)throw new Error(`${label}: ${result.error?.message||"missing data"}`);
  return result.data;
}
const signed=dataOf(await canonical.auth.signInWithPassword({
  email:process.env.DATANEST_AI_E2E_EMAIL,
  password:process.env.DATANEST_AI_E2E_PASSWORD
}),"Canonical synthetic sign-in");
assert.ok(signed.session?.access_token,"A canonical authenticated user token is required.");

const project=dataOf(await canonical.from("projects")
  .select("id").eq("slug","resonance-datanest").single(),"Canonical fixture project lookup");
const job=dataOf(await canonical.from("jobs")
  .select("id,requirements").eq("project_id",project.id).eq("title","DataNest AI E2E Job").single(),"Canonical fixture job lookup");
assert.equal(job.requirements?.environment,"certification","The job must be an explicit canonical certification fixture.");

const fixtureMarker="backend-acceptance-"+randomUUID();
const results=[];

async function invokeWithToken(token,slug,body){
  const response=await fetch(`${canonicalTarget.origin}/functions/v1/${slug}`,{
    method:"POST",redirect:"error",signal:AbortSignal.timeout(20000),
    headers:{
      "Content-Type":"application/json",
      apikey:process.env.DATANEST_CERTIFICATION_PUBLISHABLE_KEY,
      ...(token?{Authorization:`Bearer ${token}`}:{})
    },
    body:JSON.stringify(body)
  });
  let responseBody={};
  try{responseBody=await response.json();}catch{}
  return {status:response.status,body:responseBody};
}
async function invoke(slug,body){
  return invokeWithToken(signed.session.access_token,slug,body);
}
async function runCase(id,check){
  try{
    await check();
    results.push({id,status:"passed"});
  }catch(error){
    results.push({id,status:"failed",message:error instanceof Error?error.message:"Acceptance check failed."});
  }
}

await runCase("BOUNDARY-canonical-auth-and-staging-service-bridge",async()=>{
  const opened=await invoke("datanest-ai-chat",{action:"context",jobId:job.id,sessionId:null});
  assert.equal(opened.status,200,"Canonical collaborator context request must succeed.");
  assert.ok(opened.body.sessionId,"Canonical request must establish a staging-backed AI session.");
  const staged=dataOf(await stagingAdmin.from("ai_sessions")
    .select("id,project_id,job_id,user_id")
    .eq("id",opened.body.sessionId).single(),"Staging service-bridge session");
  assert.equal(staged.project_id,project.id);
  assert.equal(staged.job_id,job.id);
  assert.equal(staged.user_id,signed.user.id);

  const outsiderEmail=`datanest-ai-outsider-${randomUUID()}@resonance.invalid`;
  const outsiderCreated=await canonicalAdmin.auth.admin.createUser({
    email:outsiderEmail,password:process.env.DATANEST_AI_E2E_PASSWORD,email_confirm:true
  });
  if(outsiderCreated.error||!outsiderCreated.data.user)throw outsiderCreated.error||new Error("Unable to create outsider.");
  try{
    const outsider=createClient(canonicalTarget.origin,process.env.DATANEST_CERTIFICATION_PUBLISHABLE_KEY,options);
    const outsiderSigned=dataOf(await outsider.auth.signInWithPassword({
      email:outsiderEmail,password:process.env.DATANEST_AI_E2E_PASSWORD
    }),"Outsider sign-in");
    const denied=await invokeWithToken(outsiderSigned.session.access_token,"datanest-ai-chat",{
      action:"context",jobId:job.id,sessionId:null
    });
    assert.notEqual(denied.status,200,"A non-member must not obtain canonical Job context.");
  }finally{
    await canonicalAdmin.auth.admin.deleteUser(outsiderCreated.data.user.id);
  }

  const anonymous=await invokeWithToken(null,"datanest-ai-chat",{action:"context",jobId:job.id,sessionId:null});
  assert.equal(anonymous.status,401,"Anonymous canonical AI access must be rejected.");
});

await runCase("AUD-003-content-bound-replay",async()=>{
  const external=dataOf(await canonical.rpc("start_external_ai_sidebar_session",{
    target_job:job.id,target_provider:"chatgpt",target_mode:"companion"
  }),"Canonical external fixture session");
  assert.ok(external.session_id,"Expected a tracked external session.");
  const contentA=fixtureMarker+"-original-A";
  const input={sourceType:"ai_companion",externalAiSessionId:external.session_id,content:contentA};
  const first=await invoke("datanest-ai-intake",input);
  assert.equal(first.status,200,"Initial A import must succeed through canonical authorization.");
  assert.ok(first.body.eventId,"Initial A import must return its staged event identity.");
  assert.ok(first.body.sessionId,"Initial A import must return its staging session.");
  const replay=await invoke("datanest-ai-intake",input);
  assert.equal(replay.status,200,"A/A replay must succeed.");
  assert.equal(replay.body.idempotent,true,"A/A must be an idempotent replay.");
  assert.equal(replay.body.eventId,first.body.eventId,"A/A must preserve the event identity.");
  const changed=await invoke("datanest-ai-intake",{...input,content:fixtureMarker+"-changed-B"});
  assert.equal(changed.status,409,"A/B must conflict.");
  const stored=dataOf(await stagingAdmin.from("ai_intake_events")
    .select("id,content,content_hash,session_id")
    .eq("project_id",project.id).eq("job_id",job.id)
    .eq("source_type","ai_companion").eq("external_ai_session_id",external.session_id),"Staging replay inspection");
  assert.equal(stored.length,1,"A/A/B must leave exactly one immutable event.");
  assert.equal(stored[0].id,first.body.eventId);
  assert.equal(stored[0].content,contentA);
  assert.equal(stored[0].content_hash,createHash("sha256").update(contentA).digest("hex"));
  assert.equal(first.body.trustState,"UNCERTIFIED");
  assert.equal(replay.body.trustState,"UNCERTIFIED");
});

await runCase("AUD-004-recent-130-event-window",async()=>{
  const opened=await invoke("datanest-ai-chat",{action:"context",jobId:job.id,sessionId:null});
  assert.equal(opened.status,200,"Opening an isolated canonical context session must succeed.");
  const sessionId=opened.body.sessionId;
  assert.ok(sessionId,"Expected a new DataNest AI session.");
  const start=Date.now()-131000;
  const rows=Array.from({length:130},(_,index)=>{
    const content=`${fixtureMarker}-event-${String(index+1).padStart(3,"0")}`;
    return {
      id:randomUUID(),trace_id:"DN-AI-"+randomUUID(),
      project_id:project.id,job_id:job.id,session_id:sessionId,
      source_type:"human",source_user_id:signed.user.id,client_request_id:randomUUID(),
      content,content_hash:createHash("sha256").update(content).digest("hex"),
      created_at:new Date(start+index*1000).toISOString(),
      metadata:{test_fixture:fixtureMarker,trust_state:"uncertified",certification_target:"local-canonical"}
    };
  });
  const inserted=await stagingAdmin.from("ai_intake_events").insert(rows);
  if(inserted.error)throw new Error("Seeding the isolated 130-event staging fixture failed: "+inserted.error.message);
  const context=await invoke("datanest-ai-chat",{action:"context",jobId:job.id,sessionId});
  assert.equal(context.status,200,"Retrieving the long session through canonical auth must succeed.");
  assert.equal(context.body.sessionId,sessionId);
  const events=context.body.events;
  assert.ok(Array.isArray(events),"Context must expose its returned evidence.");
  assert.equal(events.length,100,"Context must remain bounded to 100 events.");
  assert.deepEqual(events.map(event=>event.id),rows.slice(-100).map(event=>event.id),"Return events 31-130 chronologically.");
  assert.equal(events.some(event=>event.content===rows[124].content),true,"The correction at event 125 must remain available.");
  assert.ok(events.every(event=>event.project_id===project.id&&event.job_id===job.id&&event.session_id===sessionId),"Context must remain scoped to the canonical Job and staging session.");
});

const evidence={
  suite:"datanest-ai-backend-acceptance-v2",
  canonicalAuthTarget:"local-canonical",
  stagingDataPlane:"qchttpcyqlqnhvahprhz",
  candidateCommit:process.env.DATANEST_CANDIDATE_SHA||null,
  checkoutCommit:process.env.GITHUB_SHA||null,
  fixtureMarker,
  completedAt:new Date().toISOString(),
  results,
  mirrorStagingUserAuthenticationUsed:false,
  stagingServiceBridgeUsed:true,
  productionMutated:false,
  deployedSourceDigestVerified:false,
  status:results.every(item=>item.status==="passed")?"passed":"failed"
};
await mkdir("certification-artifacts",{recursive:true});
await writeFile("certification-artifacts/datanest-ai-backend-acceptance.json",JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence));
if(evidence.status!=="passed")process.exitCode=1;
