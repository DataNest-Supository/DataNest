import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const importWorkflow=readFileSync(
  new URL("../../.github/workflows/mirror-production-import.yml",import.meta.url),
  "utf8"
);
const pagesWorkflow=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);
const governanceWriter=readFileSync(
  new URL("../../scripts/write-ui-governance-evidence.mjs",import.meta.url),
  "utf8"
);

test("Mirror production import is isolated from main and live deployment",()=>{
  assert.match(importWorkflow,/repository_dispatch:/);
  assert.match(importWorkflow,/mirror-production-candidate/);
  assert.match(importWorkflow,/mirror-promotion\//);
  assert.match(importWorkflow,/git switch -c "\$branch_name" origin\/main/);
  assert.match(importWorkflow,/git push origin "\$branch_name"/);
  assert.doesNotMatch(importWorkflow,/actions\/deploy-pages/);
  assert.doesNotMatch(importWorkflow,/git push origin main/);
});

test("Mirror-only R&D controls are excluded from canonical production patch",()=>{
  for(const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/pages.yml",
    ".github/workflows/production-candidate.yml",
    "config/mirror-rd-policy.json",
    "docs/MIRROR_DATANEST_RD_MODE.md",
    "docs/PRODUCTION_CANDIDATE_HANDOFF.md",
    "README.md"
  ]){
    assert.ok(importWorkflow.includes(`':(exclude)${path}'`),path);
  }
});

test("promotion manifest starts with zero production authority",()=>{
  assert.match(importWorkflow,/auditOptimizer:\{status:"pending",reference:null\}/);
  assert.match(importWorkflow,/governance:\{status:"pending",reference:null\}/);
  assert.match(importWorkflow,/productionAuthorization:\{status:"pending",reference:null\}/);
  assert.match(importWorkflow,/productionDeploymentAllowed:false/);
});

test("live Pages authorization requires Mirror package, live verification, staging certification, and Audit Optimizer evidence",()=>{
  assert.match(pagesWorkflow,/mirror_promotion_reference:/);
  assert.match(pagesWorkflow,/mirror_live_evidence_reference:/);
  assert.match(pagesWorkflow,/datanest_ai_certification_reference:/);
  assert.match(pagesWorkflow,/audit_optimizer_reference:/);
  assert.match(pagesWorkflow,/DATANEST_UI_MIRROR_PROMOTION_REF/);
  assert.match(pagesWorkflow,/DATANEST_UI_MIRROR_LIVE_EVIDENCE_REF/);
  assert.match(pagesWorkflow,/DATANEST_UI_DATANEST_AI_CERTIFICATION_REF/);
  assert.match(pagesWorkflow,/DATANEST_UI_AUDIT_OPTIMIZER_REF/);
  assert.match(governanceWriter,/\["mirrorPromotion","DATANEST_UI_MIRROR_PROMOTION_REF"\]/);
  assert.match(governanceWriter,/\["mirrorLiveEvidence","DATANEST_UI_MIRROR_LIVE_EVIDENCE_REF"\]/);
  assert.match(governanceWriter,/\["datanestAiCertification","DATANEST_UI_DATANEST_AI_CERTIFICATION_REF"\]/);
  assert.match(governanceWriter,/\["auditOptimizer","DATANEST_UI_AUDIT_OPTIMIZER_REF"\]/);
});

test("canonical promotion PR explicitly requires audit and human governance",()=>{
  assert.match(importWorkflow,/DataNest Audit Optimizer review recorded/);
  assert.match(importWorkflow,/Human reviewer approval recorded/);
  assert.match(importWorkflow,/Audit-Optimizer-Reference:\*\* PENDING/);
  assert.match(importWorkflow,/Live deployment initiated only from/);
});
