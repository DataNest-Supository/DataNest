import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const manifestScript=readFileSync(
  new URL("../../scripts/write-release-manifest.mjs",import.meta.url),
  "utf8"
);
const pagesWorkflow=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);
const manifestWriter=fileURLToPath(
  new URL("../../scripts/write-release-manifest.mjs",import.meta.url)
);
const edgeAttestationScript=readFileSync(
  new URL("../../scripts/verify-production-edge-function-attestation.mjs",import.meta.url),
  "utf8"
);

test("project invite Edge Function v2 is the enforced release version",()=>{
  assert.match(
    manifestScript,
    /projectInvitations:process\.env\.DATANEST_EDGE_PROJECT_INVITES \|\| "send-project-member-invite@3"/
  );
  assert.match(
    pagesWorkflow,
    /DATANEST_EDGE_PROJECT_INVITES: send-project-member-invite@3/
  );
  assert.match(
    pagesWorkflow,
    /projectInvitations.*send-project-member-invite@3/
  );
  assert.doesNotMatch(manifestScript,/send-project-member-invite@1/);
  assert.doesNotMatch(pagesWorkflow,/send-project-member-invite@1/);
});

test("release manifest identifies the current TranScheduler interests database release",()=>{
  assert.match(
    manifestScript,
    /databaseRelease:process\.env\.DATANEST_DB_RELEASE \|\| "link-transcheduler-job-requirements-user-interests"/
  );
  assert.match(
    pagesWorkflow,
    /DATANEST_DB_RELEASE: link-transcheduler-job-requirements-user-interests/
  );
  assert.match(
    pagesWorkflow,
    /databaseRelease.*link-transcheduler-job-requirements-user-interests/
  );
  assert.doesNotMatch(manifestScript,/add-mutation-recovery-observability/);
  assert.doesNotMatch(pagesWorkflow,/add-mutation-recovery-observability/);
});

function writeManifest(extraEnv={}){
  const dir=mkdtempSync(join(tmpdir(),"datanest-release-manifest-"));
  const target=join(dir,"release-manifest.json");
  const env={...process.env};
  for (const key of Object.keys(env)) {
    if (key.startsWith("DATANEST_UI_")) delete env[key];
  }
  Object.assign(env,extraEnv);
  const result=spawnSync(process.execPath,[manifestWriter,target],{
    env,
    encoding:"utf8"
  });
  const json=result.status===0 ? JSON.parse(readFileSync(target,"utf8")) : null;
  rmSync(dir,{recursive:true,force:true});
  return {result,json};
}

test("release manifest preserves legacy shape when no UI governance environment is supplied",()=>{
  const {result,json}=writeManifest();
  assert.equal(result.status,0,result.stderr);
  assert.equal("uiGovernance" in json,false);
});

test("release manifest embeds UI governance traceability when UI release environment is supplied",()=>{
  const {result,json}=writeManifest({
    DATANEST_UI_RELEASE_SHA:"b".repeat(40),
    DATANEST_UI_RELEASE_STATE:"candidate",
    DATANEST_UI_PR_VERIFICATION_REF:"PR Verification #1291"
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(json.uiGovernance.releaseSha,"b".repeat(40));
  assert.equal(json.uiGovernance.releaseState,"candidate");
  assert.equal(json.uiGovernance.authorized,false);
  assert.equal(
    json.uiGovernance.evidence.prVerification.reference,
    "PR Verification #1291"
  );
});


test("Pages release wiring requires live database and Edge Function attestation",()=>{
  assert.match(pagesWorkflow,/database_migration_head:/);
  assert.match(pagesWorkflow,/default:\s*20260930105423/);
  assert.match(pagesWorkflow,/database_migration_name:/);
  assert.match(pagesWorkflow,/default:\s*datanest_release_attestation_v1/);
  assert.match(pagesWorkflow,/verify-production-release-attestation\.mjs/);
  assert.match(pagesWorkflow,/verify-production-edge-function-attestation\.mjs/);
  assert.match(pagesWorkflow,/SUPABASE_ACCESS_TOKEN:\s*\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(pagesWorkflow,/DATANEST_DB_ATTESTATION_FILE: \.datanest\/release-attestation\.json/);
  assert.match(pagesWorkflow,/DATANEST_EDGE_ATTESTATION_FILE: \.datanest\/edge-function-attestation\.json/);
  assert.match(edgeAttestationScript,/api\.supabase\.com\/v1\/projects/);
  assert.match(edgeAttestationScript,/SUPABASE_ACCESS_TOKEN/);
  assert.match(edgeAttestationScript,/ezbr_sha256/);
});

test("release manifest records verified database and Edge Function attestations",()=>{
  const dir=mkdtempSync(join(tmpdir(),"datanest-release-attestation-"));
  const target=join(dir,"release-manifest.json");
  const dbPath=join(dir,"db.json");
  const edgePath=join(dir,"edge.json");
  const env={...process.env,DATANEST_DB_ATTESTATION_FILE:dbPath,DATANEST_EDGE_ATTESTATION_FILE:edgePath};
  writeFileSync(dbPath,JSON.stringify({
    schemaVersion:"release-attestation-v1",
    status:"verified",
    source:"live-production-database",
    verifiedAt:"2026-09-30T10:54:23.000Z",
    fingerprint:"a".repeat(64)
  }));
  writeFileSync(edgePath,JSON.stringify({
    schemaVersion:"edge-function-attestation-v1",
    status:"verified",
    source:"supabase-management-api",
    verifiedAt:"2026-09-30T10:54:24.000Z",
    baselineFingerprint:"b".repeat(64),
    functions:{"datanest-ai-chat":{version:258,ezbr_sha256:"c".repeat(64)}}
  }));
  const result=spawnSync(process.execPath,[manifestWriter,target],{env,encoding:"utf8"});
  const json=result.status===0?JSON.parse(readFileSync(target,"utf8")):null;
  assert.equal(result.status,0,result.stderr);
  assert.equal(json.releaseAttestation.database.status,"verified");
  assert.equal(json.releaseAttestation.database.fingerprint,"a".repeat(64));
  assert.equal(json.releaseAttestation.edgeFunctions.status,"verified");
  assert.equal(json.releaseAttestation.edgeFunctions.functionCount,1);
  rmSync(dir,{recursive:true,force:true});
});
