import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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


test("Pages release requires live database migration attestation inputs",()=>{
  assert.match(pagesWorkflow,/database_migration_head:/);
  assert.match(pagesWorkflow,/database_migration_name:/);
  assert.match(pagesWorkflow,/DATANEST_EXPECTED_DB_MIGRATION_HEAD:/);
  assert.match(pagesWorkflow,/DATANEST_EXPECTED_DB_MIGRATION_NAME:/);
  assert.match(pagesWorkflow,/verify-production-release-attestation\.mjs/);
  assert.match(pagesWorkflow,/DATANEST_DB_ATTESTATION_FILE: \.datanest\/release-attestation\.json/);
  assert.match(pagesWorkflow,/releaseAttestation\?\.database\?\.status!==\"verified\"/);
});

test("release manifest carries verified database attestation without overstating edge-function state",()=>{
  const dir=mkdtempSync(join(tmpdir(),"datanest-release-attestation-"));
  const target=join(dir,"release-manifest.json");
  const attestationPath=join(dir,"attestation.json");
  writeFileSync(attestationPath,JSON.stringify({
    schemaVersion:"release-attestation-v1",
    status:"verified",
    source:"live-production-database",
    verifiedAt:"2026-09-30T11:00:00.000Z",
    fingerprint:"a".repeat(64)
  }));
  const env={...process.env,DATANEST_DB_ATTESTATION_FILE:attestationPath};
  for(const key of Object.keys(env)){
    if(key.startsWith("DATANEST_UI_"))delete env[key];
  }
  const result=spawnSync(process.execPath,[manifestWriter,target],{env,encoding:"utf8"});
  const json=result.status===0?JSON.parse(readFileSync(target,"utf8")):null;
  assert.equal(result.status,0,result.stderr);
  assert.equal(json.releaseAttestation.database.status,"verified");
  assert.equal(json.releaseAttestation.database.fingerprint,"a".repeat(64));
  assert.equal(json.releaseAttestation.edgeFunctions.status,"unverified");
  rmSync(dir,{recursive:true,force:true});
});
