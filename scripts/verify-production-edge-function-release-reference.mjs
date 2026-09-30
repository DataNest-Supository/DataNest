import { dirname, resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const artifactPath=resolve(process.argv[2] || ".datanest/edge-function-release.json");
const releaseSha=(process.env.DATANEST_RELEASE_SHA || "").trim();
const reference=Number(process.env.DATANEST_EDGE_FUNCTION_RELEASE_REFERENCE || 0);
const githubToken=(process.env.GITHUB_TOKEN || "").trim();
const repository=(process.env.GITHUB_REPOSITORY || "").trim();
const projectRef=(process.env.DATANEST_SUPABASE_PROJECT || "sgqdmfgjbprsoqsmgigi").trim();
const supabaseToken=(process.env.SUPABASE_ACCESS_TOKEN || "").trim();

if(!/^[0-9a-f]{40}$/i.test(releaseSha))throw new Error("DATANEST_RELEASE_SHA must be an exact 40-character Git commit SHA.");
if(!Number.isInteger(reference)||reference<=0)throw new Error("DATANEST_EDGE_FUNCTION_RELEASE_REFERENCE must be a workflow run ID.");
if(!githubToken)throw new Error("GITHUB_TOKEN is required to verify the referenced Edge Function release run.");
if(!repository)throw new Error("GITHUB_REPOSITORY is required to verify the referenced Edge Function release run.");
if(!supabaseToken)throw new Error("SUPABASE_ACCESS_TOKEN is required to verify live Edge Function deployment state.");

const runResponse=await fetch(
  "https://api.github.com/repos/"+repository+"/actions/runs/"+reference,
  {
    headers:{
      Authorization:"Bearer "+githubToken,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2026-03-10"
    }
  }
);
let run;
try{run=await runResponse.json();}catch{run=null;}
if(!runResponse.ok)throw new Error("Referenced Edge Function release run lookup failed with HTTP "+runResponse.status+".");
if(String(run.name||"")!=="Governed Production Edge Function Release"){
  throw new Error("Referenced workflow is not the governed production Edge Function release workflow.");
}
if(String(run.event||"")!=="workflow_dispatch"){
  throw new Error("Referenced Edge Function release was not a manual release run.");
}
if(String(run.path||"")!==".github/workflows/production-edge-function-release.yml"){
  throw new Error("Referenced run did not execute the governed production Edge Function release workflow.");
}
if(String(run.status||"")!=="completed"||String(run.conclusion||"")!=="success"){
  throw new Error("Referenced Edge Function release run must be completed successfully.");
}

let attestation;
try{
  attestation=JSON.parse(readFileSync(artifactPath,"utf8"));
}catch(error){
  throw new Error("Unable to read the referenced Edge Function release attestation: "+error.message);
}

if(String(attestation.schemaVersion||"")!=="edge-function-release-attestation-v2"){
  throw new Error("Referenced Edge Function release has an unexpected attestation schema.");
}
if(String(attestation.status||"")!=="verified"){
  throw new Error("Referenced Edge Function release attestation is not verified.");
}
if(String(attestation.sourceCommit||"")!==releaseSha){
  throw new Error("Edge Function release attestation sourceCommit does not match Pages release SHA.");
}
if(Number(attestation.workflowRunId)!==reference){
  throw new Error("Edge Function release attestation workflowRunId does not match the referenced run.");
}
if(String(attestation.repository||"")!==repository){
  throw new Error("Edge Function release attestation repository mismatch.");
}
if(String(attestation.project||"")!==projectRef){
  throw new Error("Edge Function release attestation project mismatch.");
}
if(!/^[0-9a-f]{64}$/i.test(String(attestation.sourceTreeSha256||""))){
  throw new Error("Edge Function release attestation sourceTreeSha256 is missing or invalid.");
}

const requiredFunctions=[
  "datanest-ai-chat",
  "datanest-ai-intake",
  "datanest-ai-certification",
  "manage-ai-provider-v2",
  "send-job-invite",
  "send-project-member-invite",
  "ronsas-status",
  "external-audit"
];
const attestedFunctions=attestation.functions||{};
for(const slug of requiredFunctions){
  const fn=attestedFunctions[slug];
  if(!fn)throw new Error("Edge Function release attestation is missing "+slug+".");
  if(String(fn.sourceCommit||"")!==releaseSha)throw new Error(slug+" sourceCommit mismatch.");
  if(String(fn.sourceTreeSha256||"")!==String(attestation.sourceTreeSha256))throw new Error(slug+" sourceTreeSha256 mismatch.");
  if(String(fn.status||"")!=="ACTIVE")throw new Error(slug+" was not ACTIVE at release verification.");
  if(fn.verify_jwt!==true)throw new Error(slug+" does not have JWT verification enabled.");
  if(!Number.isInteger(Number(fn.version))||Number(fn.version)<=0)throw new Error(slug+" has an invalid deployment version.");
  if(!/^[0-9a-f]{64}$/i.test(String(fn.ezbr_sha256||"")))throw new Error(slug+" has an invalid deployment digest.");
}

const response=await fetch(
  "https://api.supabase.com/v1/projects/"+encodeURIComponent(projectRef)+"/functions",
  {headers:{Authorization:"Bearer "+supabaseToken,Accept:"application/json"}}
);
let payload;
try{payload=await response.json();}catch{payload=null;}
if(!response.ok)throw new Error("Live Edge Function inventory request failed with HTTP "+response.status+".");

const observedBySlug=new Map((Array.isArray(payload)?payload:[]).map(fn=>[String(fn.slug||""),fn]));
for(const slug of requiredFunctions){
  const expected=attestedFunctions[slug];
  const observed=observedBySlug.get(slug);
  if(!observed)throw new Error("Live production Edge Function "+slug+" is missing.");
  const observedVersion=Number(observed.version);
  const observedDigest=String(observed.ezbr_sha256||"");
  if(observedVersion!==Number(expected.version)||observedDigest!==String(expected.ezbr_sha256)){
    throw new Error(
      "Live production Edge Function "+slug+" no longer matches the referenced release. "+
      "Expected v"+expected.version+" / "+expected.ezbr_sha256+
      " but observed v"+observedVersion+" / "+observedDigest+"."
    );
  }
  if(String(observed.status||"")!=="ACTIVE")throw new Error("Live production Edge Function "+slug+" is not ACTIVE.");
  if(observed.verify_jwt!==true)throw new Error("Live production Edge Function "+slug+" JWT verification is not enabled.");
}

const verifiedAttestation={
  schemaVersion:"edge-function-release-attestation-v2",
  status:"verified",
  source:attestation.source,
  repository,
  project:projectRef,
  sourceCommit:releaseSha,
  workflowRunId:reference,
  sourceTreeSha256:attestation.sourceTreeSha256,
  functions:attestedFunctions,
  verifiedAt:new Date().toISOString()
};

const target=resolve(".datanest/edge-function-attestation.json");
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(verifiedAttestation,null,2)+"\n","utf8");

console.log(JSON.stringify({
  schemaVersion:verifiedAttestation.schemaVersion,
  status:verifiedAttestation.status,
  sourceCommit:verifiedAttestation.sourceCommit,
  workflowRunId:verifiedAttestation.workflowRunId,
  sourceTreeSha256:verifiedAttestation.sourceTreeSha256,
  functionCount:requiredFunctions.length
},null,2));
