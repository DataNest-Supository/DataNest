import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const writer=fileURLToPath(new URL("../../scripts/write-ui-governance-evidence.mjs",import.meta.url));
const sha="a".repeat(40);
const reviewRefs={
  DATANEST_UI_PR_VERIFICATION_REF:"PR Verification #1291",
  DATANEST_UI_SECURITY_REF:"Security scan #817",
  DATANEST_UI_RONSAS_VALIDATION_REF:"RONSAS Application Validation #156",
  DATANEST_UI_VISUAL_REVIEW_REF:"ui-governance-review-36616655300",
  DATANEST_UI_GOVERNANCE_REVIEW_REF:"DN-GOV-REVIEW-001",
  DATANEST_UI_LEGAL_REVIEW_REF:"DN-LEGAL-REVIEW-001",
  DATANEST_UI_EXTERNAL_REVIEW_REF:"DN-EXTERNAL-REVIEW-001",
  DATANEST_UI_AUTHORIZATION_REF:"DN-PROD-AUTH-001"
};

function runWriter(extraEnv){
  const dir=mkdtempSync(join(tmpdir(),"datanest-ui-evidence-"));
  const target=join(dir,"ui-governance-release.json");
  const result=spawnSync(process.execPath,[writer,target],{
    env:{...process.env,...extraEnv},
    encoding:"utf8"
  });
  const json=result.status===0 ? JSON.parse(readFileSync(target,"utf8")) : null;
  rmSync(dir,{recursive:true,force:true});
  return {result,json};
}

test("candidate evidence remains non-authoritative and leaves independent gates pending",()=>{
  const {result,json}=runWriter({
    DATANEST_UI_RELEASE_SHA:sha,
    DATANEST_UI_RELEASE_STATE:"candidate",
    DATANEST_UI_PR_VERIFICATION_REF:"PR Verification #1291",
    DATANEST_UI_AUTHORIZATION_REF:"must-not-be-promoted"
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(json.releaseState,"candidate");
  assert.equal(json.authorized,false);
  assert.deepEqual(json.evidence.prVerification,{
    status:"supplied",
    reference:"PR Verification #1291"
  });
  assert.deepEqual(json.evidence.securityScan,{status:"pending",reference:null});
  assert.deepEqual(json.evidence.productionAuthorization,{status:"pending",reference:null});
});

test("evidence identifies the approved design spec and all four implementation plans exactly",()=>{
  const {result,json}=runWriter({
    DATANEST_UI_RELEASE_SHA:sha,
    DATANEST_UI_RELEASE_STATE:"candidate"
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(
    json.designSpec,
    "docs/superpowers/specs/2026-09-29-resonance-datanest-ui-governance-system-design.md"
  );
  assert.deepEqual(json.implementationPlans,[
    "docs/superpowers/plans/2026-09-29-resonance-datanest-ui-foundation-shell.md",
    "docs/superpowers/plans/2026-09-29-resonance-datanest-governance-legal-centre.md",
    "docs/superpowers/plans/2026-09-29-resonance-datanest-ronsas-ui-migration.md",
    "docs/superpowers/plans/2026-09-29-resonance-datanest-certification-production-gates.md"
  ]);
});

test("authorized evidence fails closed on placeholder review references",()=>{
  const {result}=runWriter({
    DATANEST_UI_RELEASE_SHA:sha,
    DATANEST_UI_RELEASE_STATE:"authorized",
    ...reviewRefs,
    DATANEST_UI_LEGAL_REVIEW_REF:"pending"
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/DATANEST_UI_LEGAL_REVIEW_REF/);
});

test("authorized evidence requires and records the complete review chain",()=>{
  const {result,json}=runWriter({
    DATANEST_UI_RELEASE_SHA:sha,
    DATANEST_UI_RELEASE_STATE:"authorized",
    ...reviewRefs
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(json.authorized,true);
  for (const item of Object.values(json.evidence)) {
    assert.equal(item.status,"supplied");
    assert.ok(item.reference);
  }
});


test("human review dossier covers every production-chain stage without default approval",()=>{
  const review=readFileSync(
    new URL("../../docs/governance/platform-dossier/UI_GOVERNANCE_RELEASE_REVIEW.md",import.meta.url),
    "utf8"
  );
  const schema=readFileSync(
    new URL("../../docs/governance/platform-dossier/UI_GOVERNANCE_EVIDENCE_SCHEMA.md",import.meta.url),
    "utf8"
  );
  for(const phrase of [
    "Self-audit",
    "Automated verification",
    "Security validation",
    "Visual / UX review",
    "Governance-impact review",
    "Legal review",
    "External / independent human review",
    "Production authorization",
    "Deployment run",
    "Post-deployment verification",
    "Dossier / evidence update"
  ]){
    assert.ok(review.toLowerCase().includes(phrase.toLowerCase()),phrase);
  }
  assert.match(schema,/self-audit.*automated verification.*security validation.*visual\/UX review.*governance-impact review.*legal review.*external\/human review.*production authorization.*deployment.*post-deployment verification.*dossier\/evidence update/is);
  assert.match(review,/Empty fields mean \*\*not yet reviewed or approved\*\*/i);
  assert.doesNotMatch(review,/Decision:\s*(approved|accepted|authorized)/i);
});
