import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";

const inventoryPath=resolve(process.argv[2] || ".datanest/connector-edge-inventory.json");
const target=resolve(process.argv[3] || "config/production-edge-function-attestation.json");
const sourceCommit=(process.env.DATANEST_CONNECTOR_EDGE_SOURCE_COMMIT || "").trim();
const evidenceRef=(process.env.DATANEST_CONNECTOR_EDGE_EVIDENCE_REF || "").trim();
const repository=(process.env.GITHUB_REPOSITORY || "DataNest-Supository/DataNest").trim();
const project=(process.env.DATANEST_SUPABASE_PROJECT || "sgqdmfgjbprsoqsmgigi").trim();

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

if(!/^[0-9a-f]{40}$/i.test(sourceCommit))throw new Error("DATANEST_CONNECTOR_EDGE_SOURCE_COMMIT must be an exact 40-character Git SHA.");
if(!evidenceRef)throw new Error("DATANEST_CONNECTOR_EDGE_EVIDENCE_REF is required.");

function filesUnder(root){
  const output=[];
  function visit(current){
    for(const name of readdirSync(current).sort()){
      const path=resolve(current,name);
      const rel=relative(root,path).split("\\").join("/");
      const stat=statSync(path);
      if(stat.isDirectory())visit(path);
      else if(stat.isFile())output.push({path:rel,bytes:readFileSync(path)});
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

const inventory=JSON.parse(readFileSync(inventoryPath,"utf8"));
const observedBySlug=new Map((Array.isArray(inventory.functions)?inventory.functions:[]).map(fn=>[String(fn.slug||""),fn]));
const sourceTreeSha256=sha256Tree(resolve("supabase/functions"));
const functions={};

for(const slug of requiredFunctions){
  const fn=observedBySlug.get(slug);
  if(!fn)throw new Error("Connector inventory is missing "+slug+".");
  const version=Number(fn.version);
  const digest=String(fn.ezbr_sha256||"");
  if(String(fn.status||"")!=="ACTIVE")throw new Error(slug+" is not ACTIVE.");
  if(fn.verify_jwt!==true)throw new Error(slug+" JWT verification is not enabled.");
  if(!Number.isInteger(version)||version<=0)throw new Error(slug+" has an invalid version.");
  if(!/^[0-9a-f]{64}$/i.test(digest))throw new Error(slug+" has an invalid ezbr_sha256.");
  functions[slug]={
    version,
    ezbr_sha256:digest,
    status:"ACTIVE",
    verify_jwt:true,
    sourceTreeSha256
  };
}

const attestation={
  schemaVersion:"edge-function-connector-attestation-v1",
  status:"verified",
  source:"supabase-connected-admin-release",
  repository,
  project,
  sourceCommit,
  releaseReference:"connector:"+sourceCommit,
  connectorEvidenceRef:evidenceRef,
  sourceTreeSha256,
  functions,
  verifiedAt:new Date().toISOString()
};

mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(attestation,null,2)+"\n","utf8");
console.log("Wrote connector Edge Function attestation for",sourceCommit);
