import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";

const target=resolve(process.argv[2] || ".datanest/edge-function-release.json");
const releaseSha=(process.env.DATANEST_RELEASE_SHA || "").trim();
const supabaseToken=(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const projectRef=(process.env.DATANEST_SUPABASE_PROJECT || "sgqdmfgjbprsoqsmgigi").trim();
const workflowRunId=Number(process.env.GITHUB_RUN_ID || 0);
const repository=(process.env.GITHUB_REPOSITORY || "").trim();
const baselinePath=resolve(
  process.env.DATANEST_EDGE_ATTESTATION_BASELINE ||
  "config/production-edge-function-attestation.json"
);

const functions=[
  "datanest-ai-chat",
  "datanest-ai-intake",
  "datanest-ai-certification",
  "manage-ai-provider-v2",
  "send-job-invite",
  "send-project-member-invite",
  "ronsas-status",
  "external-audit"
];

if(!/^[0-9a-f]{40}$/i.test(releaseSha)){
  throw new Error("DATANEST_RELEASE_SHA must be an exact 40-character Git commit SHA.");
}
if(!Number.isInteger(workflowRunId)||workflowRunId<=0){
  throw new Error("GITHUB_RUN_ID is required for production Edge Function release attestation.");
}
if(!repository){
  throw new Error("GITHUB_REPOSITORY is required for production Edge Function release attestation.");
}

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

function validateObservedFunction(slug,observed,mismatches){
  if(!observed){
    mismatches.push({slug,reason:"missing"});
    return null;
  }
  const version=Number(observed.version);
  const digest=String(observed.ezbr_sha256||"");
  const status=String(observed.status||"");
  const verifyJwt=observed.verify_jwt===true;
  if(status!=="ACTIVE")mismatches.push({slug,field:"status",expected:"ACTIVE",observed:status});
  if(!verifyJwt)mismatches.push({slug,field:"verify_jwt",expected:true,observed:Boolean(observed.verify_jwt)});
  if(!Number.isInteger(version)||version<=0)mismatches.push({slug,field:"version",reason:"missing_or_invalid"});
  if(!/^[0-9a-f]{64}$/i.test(digest))mismatches.push({slug,field:"ezbr_sha256",reason:"missing_or_invalid"});
  return {version,ezbr_sha256:digest,status,verify_jwt:verifyJwt};
}

const sourceRoot=resolve("supabase/functions");
if(!existsSync(sourceRoot))throw new Error("supabase/functions source tree is missing.");
const sourceTreeSha256=sha256Tree(sourceRoot);

let source;
let verificationMode;
let connectorObservedAt=null;
let releaseFunctions={};

if(supabaseToken){
  const response=await fetch(
    "https://api.supabase.com/v1/projects/"+encodeURIComponent(projectRef)+"/functions",
    {headers:{Authorization:"Bearer "+supabaseToken,Accept:"application/json"}}
  );
  let payload;
  try{payload=await response.json();}catch{payload=null;}
  if(!response.ok){
    throw new Error("Production Edge Function inventory request failed with HTTP "+response.status+".");
  }
  const observedBySlug=new Map((Array.isArray(payload)?payload:[]).map(fn=>[String(fn.slug||""),fn]));
  const mismatches=[];
  for(const slug of functions){
    const normalized=validateObservedFunction(slug,observedBySlug.get(slug),mismatches);
    if(normalized){
      releaseFunctions[slug]={...normalized,sourceCommit:releaseSha,sourceTreeSha256};
    }
  }
  if(mismatches.length){
    throw new Error("Production Edge Function release inventory validation failed: "+JSON.stringify(mismatches));
  }
  source="governed-production-edge-function-release";
  verificationMode="management-api";
}else{
  let baseline;
  try{baseline=JSON.parse(readFileSync(baselinePath,"utf8"));}
  catch(error){throw new Error("Unable to read connector-attested Edge Function baseline: "+error.message);}
  if(Number(baseline.schema_version)!==2){
    throw new Error("Connector-attested Edge Function baseline must use schema_version 2.");
  }
  if(String(baseline.supabase_project||"")!==projectRef){
    throw new Error("Connector-attested Edge Function baseline project mismatch.");
  }
  if(String(baseline.source_tree_sha256||"")!==sourceTreeSha256){
    throw new Error(
      "Connector-attested Edge Function baseline source tree mismatch. Expected "+
      baseline.source_tree_sha256+" but checkout produced "+sourceTreeSha256+"."
    );
  }
  const observedMillis=Date.parse(String(baseline.observed_at||""));
  if(!Number.isFinite(observedMillis))throw new Error("Connector-attested Edge Function baseline observed_at is invalid.");
  const maxAgeHours=Number(baseline.attestation_notes?.max_age_hours||72);
  const ageHours=(Date.now()-observedMillis)/3_600_000;
  if(ageHours<(-5/60))throw new Error("Connector-attested Edge Function baseline observed_at is unexpectedly in the future.");
  if(ageHours>maxAgeHours){
    throw new Error("Connector-attested Edge Function baseline is stale; refresh authenticated Supabase inventory before release.");
  }

  const mismatches=[];
  for(const slug of functions){
    const normalized=validateObservedFunction(slug,baseline.functions?.[slug],mismatches);
    if(normalized){
      releaseFunctions[slug]={...normalized,sourceCommit:releaseSha,sourceTreeSha256};
    }
  }
  if(mismatches.length){
    throw new Error("Connector-attested Edge Function baseline validation failed: "+JSON.stringify(mismatches));
  }
  source="supabase-connector-attested-live-inventory";
  verificationMode="connector-attested";
  connectorObservedAt=new Date(observedMillis).toISOString();
}

const attestation={
  schemaVersion:"edge-function-release-attestation-v2",
  status:"verified",
  source,
  verificationMode,
  repository,
  project:projectRef,
  sourceCommit:releaseSha,
  workflowRunId,
  sourceTreeSha256,
  connectorObservedAt,
  functions:releaseFunctions,
  verifiedAt:new Date().toISOString()
};

mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(attestation,null,2)+"\n","utf8");
console.log(
  "Recorded governed production Edge Function release for",
  releaseSha,
  "using",
  verificationMode
);
