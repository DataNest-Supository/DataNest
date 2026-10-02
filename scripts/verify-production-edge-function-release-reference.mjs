import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";

const artifactPath=resolve(process.argv[2] || ".datanest/edge-function-release.json");
const releaseSha=(process.env.DATANEST_RELEASE_SHA || "").trim();
const rawReference=(process.env.DATANEST_EDGE_FUNCTION_RELEASE_REFERENCE || "").trim();
const connectorMode=rawReference.startsWith("connector:");
const githubToken=(process.env.GITHUB_TOKEN || "").trim();
const repository=(process.env.GITHUB_REPOSITORY || "").trim();
const projectRef=(process.env.DATANEST_SUPABASE_PROJECT || "sgqdmfgjbprsoqsmgigi").trim();
const supabaseToken=(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const connectorMaxAgeHours=Number(process.env.DATANEST_CONNECTOR_ATTESTATION_MAX_AGE_HOURS || 24);

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

if(!/^[0-9a-f]{40}$/i.test(releaseSha))throw new Error("DATANEST_RELEASE_SHA must be an exact 40-character Git commit SHA.");
if(!repository)throw new Error("GITHUB_REPOSITORY is required to verify the referenced Edge Function release.");

function filesUnder(root){
  const output=[];
  function visit(current){
    const names=readdirSync(current).sort();
    for(const name of names){
      const path=resolve(current,name);
      const relativePath=relative(root,path).split("\\").join("/");
      const stat=statSync(path);
      if(stat.isDirectory())visit(path);
      else if(stat.isFile())output.push({path:relativePath,bytes:readFileSync(path)});
    }
  }
  visit(root);
  return output;
}

function sha256Tree(root){
  const hash=createHash("sha256");
  for(const file of filesUnder(root)){
    const pathBytes=Buffer.from(file.path,"utf8");
    hash.update(Buffer.from(String(pathBytes.byteLength)+":"));
    hash.update(pathBytes);
    hash.update(Buffer.from(":"));
    hash.update(file.bytes);
    hash.update(Buffer.from("\n"));
  }
  return hash.digest("hex");
}

function validateFunctionSet(attestation,expectedSourceTree){
  const attestedFunctions=attestation.functions||{};
  for(const slug of requiredFunctions){
    const fn=attestedFunctions[slug];
    if(!fn)throw new Error("Edge Function release attestation is missing "+slug+".");
    if(String(fn.status||"")!=="ACTIVE")throw new Error(slug+" was not ACTIVE at release verification.");
    if(fn.verify_jwt!==true)throw new Error(slug+" does not have JWT verification enabled.");
    if(!Number.isInteger(Number(fn.version))||Number(fn.version)<=0)throw new Error(slug+" has an invalid deployment version.");
    if(!/^[0-9a-f]{64}$/i.test(String(fn.ezbr_sha256||"")))throw new Error(slug+" has an invalid deployment digest.");
    const fnTree=String(fn.sourceTreeSha256||expectedSourceTree);
    if(fnTree!==expectedSourceTree)throw new Error(slug+" sourceTreeSha256 mismatch.");
  }
  return attestedFunctions;
}

let attestation;
try{attestation=JSON.parse(readFileSync(artifactPath,"utf8"));}
catch(error){throw new Error("Unable to read the referenced Edge Function release attestation: "+error.message);}

let verifiedAttestation;

if(connectorMode){
  if(!/^connector:[0-9a-f]{40}$/i.test(rawReference)){
    throw new Error("Connector Edge Function reference must be connector:<40-character-source-sha>.");
  }
  if(String(attestation.schemaVersion||"")!=="edge-function-connector-attestation-v1"){
    throw new Error("Connector Edge Function release has an unexpected attestation schema.");
  }
  if(String(attestation.status||"")!=="verified"){
    throw new Error("Connector Edge Function release attestation is not verified.");
  }
  if(String(attestation.source||"")!=="supabase-connected-admin-release"){
    throw new Error("Connector Edge Function release source is not trusted.");
  }
  if(String(attestation.releaseReference||"")!==rawReference){
    throw new Error("Connector Edge Function release reference mismatch.");
  }
  if(String(attestation.repository||"")!==repository){
    throw new Error("Connector Edge Function release attestation repository mismatch.");
  }
  if(String(attestation.project||"")!==projectRef){
    throw new Error("Connector Edge Function release attestation project mismatch.");
  }
  const deploymentSourceCommit=String(attestation.sourceCommit||"");
  if(deploymentSourceCommit!==rawReference.slice("connector:".length)){
    throw new Error("Connector Edge Function deployment source commit mismatch.");
  }
  if(!/^[0-9a-f]{40}$/i.test(deploymentSourceCommit)){
    throw new Error("Connector Edge Function sourceCommit is invalid.");
  }
  const ancestry=spawnSync("git",["merge-base","--is-ancestor",deploymentSourceCommit,releaseSha],{encoding:"utf8"});
  if(ancestry.status!==0){
    throw new Error("Connector Edge Function deployment source is not an ancestor of the Pages release SHA.");
  }

  const sourceRoot=resolve("supabase/functions");
  if(!existsSync(sourceRoot))throw new Error("supabase/functions source tree is missing.");
  const observedSourceTree=sha256Tree(sourceRoot);
  const attestedSourceTree=String(attestation.sourceTreeSha256||"");
  if(!/^[0-9a-f]{64}$/i.test(attestedSourceTree)){
    throw new Error("Connector Edge Function sourceTreeSha256 is missing or invalid.");
  }
  if(observedSourceTree!==attestedSourceTree){
    throw new Error("Connector Edge Function source tree does not match the release checkout.");
  }

  const attestedFunctions=validateFunctionSet(attestation,attestedSourceTree);
  const connectorEvidenceRef=String(attestation.connectorEvidenceRef||"").trim();
  if(!connectorEvidenceRef)throw new Error("Connector Edge Function evidence reference is required.");

  verifiedAttestation={
    schemaVersion:"edge-function-release-attestation-v2",
    status:"verified",
    source:attestation.source,
    repository,
    project:projectRef,
    sourceCommit:releaseSha,
    deploymentSourceCommit,
    releaseReference:rawReference,
    connectorEvidenceRef,
    sourceTreeSha256:attestedSourceTree,
    functions:attestedFunctions,
    verifiedAt:new Date().toISOString()
  };
}else{
  const reference=Number(rawReference);
  if(!Number.isInteger(reference)||reference<=0)throw new Error("DATANEST_EDGE_FUNCTION_RELEASE_REFERENCE must be a workflow run ID or connector:<source-sha>.");
  if(!githubToken)throw new Error("GITHUB_TOKEN is required to verify the referenced Edge Function release run.");
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
  const sourceTreeSha256=String(attestation.sourceTreeSha256||"");
  if(!/^[0-9a-f]{64}$/i.test(sourceTreeSha256)){
    throw new Error("Edge Function release attestation sourceTreeSha256 is missing or invalid.");
  }

  const attestedFunctions=validateFunctionSet(attestation,sourceTreeSha256);

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

  verifiedAttestation={
    schemaVersion:"edge-function-release-attestation-v2",
    status:"verified",
    source:attestation.source,
    repository,
    project:projectRef,
    sourceCommit:releaseSha,
    workflowRunId:reference,
    releaseReference:reference,
    sourceTreeSha256,
    functions:attestedFunctions,
    verifiedAt:new Date().toISOString()
  };
}

const target=resolve(".datanest/edge-function-attestation.json");
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(verifiedAttestation,null,2)+"\n","utf8");

console.log(JSON.stringify({
  schemaVersion:verifiedAttestation.schemaVersion,
  status:verifiedAttestation.status,
  sourceCommit:verifiedAttestation.sourceCommit,
  deploymentSourceCommit:verifiedAttestation.deploymentSourceCommit||verifiedAttestation.sourceCommit,
  releaseReference:verifiedAttestation.releaseReference,
  sourceTreeSha256:verifiedAttestation.sourceTreeSha256,
  functionCount:requiredFunctions.length
},null,2));
