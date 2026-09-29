import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const verifier=fileURLToPath(
  new URL("../../scripts/verify-ui-production-authorization.mjs",import.meta.url)
);
const pagesWorkflow=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);

const valid={
  DATANEST_UI_RELEASE_SHA:"c".repeat(40),
  DATANEST_UI_PRODUCTION_CONFIRMATION:"AUTHORIZE PRODUCTION",
  DATANEST_UI_PR_VERIFICATION_REF:"PR Verification #1293",
  DATANEST_UI_SECURITY_REF:"Security scan #820",
  DATANEST_UI_RONSAS_VALIDATION_REF:"RONSAS Application Validation #158",
  DATANEST_UI_VISUAL_REVIEW_REF:"ui-governance-review-36619224572",
  DATANEST_UI_GOVERNANCE_REVIEW_REF:"DN-GOV-REVIEW-001",
  DATANEST_UI_LEGAL_REVIEW_REF:"DN-LEGAL-REVIEW-001",
  DATANEST_UI_EXTERNAL_REVIEW_REF:"DN-EXTERNAL-REVIEW-001",
  DATANEST_UI_AUTHORIZATION_REF:"DN-PROD-AUTH-001"
};

function verify(extra={}){
  return spawnSync(process.execPath,[verifier],{
    env:{...process.env,...valid,...extra},
    encoding:"utf8"
  });
}

test("production authorization rejects malformed SHA",()=>{
  const result=verify({DATANEST_UI_RELEASE_SHA:"not-a-sha"});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/40-character Git commit SHA/);
});

test("production authorization rejects wrong confirmation text",()=>{
  const result=verify({DATANEST_UI_PRODUCTION_CONFIRMATION:"authorize production"});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/AUTHORIZE PRODUCTION/);
});

test("production authorization rejects missing and placeholder references",()=>{
  for (const [key,value] of [
    ["DATANEST_UI_SECURITY_REF",""],
    ["DATANEST_UI_RONSAS_VALIDATION_REF","pending"],
    ["DATANEST_UI_LEGAL_REVIEW_REF","todo"],
    ["DATANEST_UI_EXTERNAL_REVIEW_REF","tbd"]
  ]) {
    const result=verify({[key]:value});
    assert.notEqual(result.status,0,`${key} should fail closed`);
    assert.match(result.stderr,new RegExp(key));
  }
});

test("production authorization accepts a complete structural payload",()=>{
  const result=verify();
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Validated UI production authorization payload/);
});

test("Pages production deployment is manual exact-SHA and environment gated",()=>{
  assert.doesNotMatch(pagesWorkflow,/\n\s+push:\s*\n/);
  assert.match(pagesWorkflow,/workflow_dispatch:/);
  for (const input of [
    "release_sha",
    "pr_verification_reference",
    "security_scan_reference",
    "ronsas_validation_reference",
    "visual_review_reference",
    "governance_review_reference",
    "legal_review_reference",
    "external_review_reference",
    "production_authorization_reference",
    "confirmation"
  ]) {
    assert.match(pagesWorkflow,new RegExp(`\\n      ${input}:\\n`));
  }
  assert.match(pagesWorkflow,/ref: \$\{\{ inputs\.release_sha \}\}/);
  assert.match(pagesWorkflow,/git merge-base --is-ancestor "\$\{\{ inputs\.release_sha \}\}" origin\/main/);
  assert.match(pagesWorkflow,/name: github-pages/);
  assert.match(pagesWorkflow,/DATANEST_UI_PRODUCTION_CONFIRMATION: \$\{\{ inputs\.confirmation \}\}/);
});
