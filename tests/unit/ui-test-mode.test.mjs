import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const testModeWorkflow=readFileSync(
  new URL("../../.github/workflows/ui-test-mode.yml",import.meta.url),
  "utf8"
);
const productionWorkflow=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);
const ronsasWorkflow=readFileSync(
  new URL("../../.github/workflows/ronsas-app-validation.yml",import.meta.url),
  "utf8"
);
const expiryWorkflow=readFileSync(
  new URL("../../.github/workflows/ui-owner-test-mode-expiry.yml",import.meta.url),
  "utf8"
);

test("UI Test Mode is explicit, candidate-only, and produces review evidence",()=>{
  assert.match(testModeWorkflow,/name: DataNest UI Test Mode/);
  assert.match(testModeWorkflow,/workflow_dispatch:/);
  assert.match(testModeWorkflow,/release_sha:/);
  assert.match(testModeWorkflow,/DATANEST_TEST_MODE: "true"/);
  assert.match(testModeWorkflow,/DATANEST_UI_RELEASE_STATE: candidate/);
  assert.match(testModeWorkflow,/npm test/);
  assert.match(testModeWorkflow,/npm run check/);
  assert.match(testModeWorkflow,/Run browser verification/);
  assert.match(testModeWorkflow,/Run UI governance visual review/);
  assert.match(testModeWorkflow,/ui-test-mode-evidence-/);
  assert.match(testModeWorkflow,/HUMAN_REVIEW_EVIDENCE\.md/);
});

test("UI Test Mode cannot deploy or authorize production",()=>{
  assert.doesNotMatch(testModeWorkflow,/actions\/deploy-pages/);
  assert.doesNotMatch(testModeWorkflow,/actions\/upload-pages-artifact/);
  assert.doesNotMatch(testModeWorkflow,/pages:\s*write/);
  assert.doesNotMatch(testModeWorkflow,/id-token:\s*write/);
  assert.doesNotMatch(testModeWorkflow,/name:\s*github-pages/);
  assert.doesNotMatch(testModeWorkflow,/AUTHORIZE PRODUCTION/);
  assert.doesNotMatch(testModeWorkflow,/verify-ui-production-authorization\.mjs/);
  assert.match(testModeWorkflow,/authorized:false/);
  assert.match(testModeWorkflow,/productionDeployment:false/);
});

test("production governance remains fail-closed after Test Mode is enabled",()=>{
  for (const input of [
    "governance_review_reference",
    "legal_review_reference",
    "external_review_reference",
    "production_authorization_reference",
    "confirmation"
  ]) {
    assert.match(productionWorkflow,new RegExp(`\\n      ${input}:\\n`));
  }
  assert.match(productionWorkflow,/Verify production authorization payload/);
  assert.match(productionWorkflow,/verify-ui-production-authorization\.mjs/);
  assert.match(productionWorkflow,/'github-pages'/);
  assert.match(productionWorkflow,/'github-pages-owner-test-mode'/);
  assert.match(productionWorkflow,/actions\/deploy-pages/);
});

test("RONSAS validation follows Test Mode workflow changes",()=>{
  assert.match(
    ronsasWorkflow,
    /pull_request:[\s\S]*?paths:[\s\S]*?"\.github\/workflows\/ui-test-mode\.yml"/
  );
  assert.match(
    ronsasWorkflow,
    /push:[\s\S]*?paths:[\s\S]*?"\.github\/workflows\/ui-test-mode\.yml"/
  );
});


test("Owner Live Test Mode is time bounded and explicitly temporary",()=>{
  assert.match(productionWorkflow,/release_mode:/);
  assert.match(productionWorkflow,/owner_test_mode/);
  assert.match(productionWorkflow,/owner_test_mode_expires_at:/);
  assert.match(productionWorkflow,/owner_test_mode_owner_login:/);
  assert.match(productionWorkflow,/owner_test_mode_reference:/);
  assert.match(productionWorkflow,/AUTHORIZE OWNER TEST MODE/);
  assert.match(productionWorkflow,/collaborators\/\$GITHUB_ACTOR\/permission/);
});

test("expired Owner Live Test Mode is automatically replaced by a holding page",()=>{
  assert.match(expiryWorkflow,/schedule:/);
  assert.match(expiryWorkflow,/17 \* \* \* \*/);
  assert.match(expiryWorkflow,/owner_test_mode_expired/);
  assert.match(expiryWorkflow,/productionDeploymentAllowed:false/);
  assert.match(expiryWorkflow,/actions\/upload-pages-artifact/);
  assert.match(expiryWorkflow,/actions\/deploy-pages/);
  assert.match(expiryWorkflow,/Full governance review is required/);
});


test("Owner Live Test Mode exposes AI proposal controls while preserving bounded overrides",()=>{
  assert.match(productionWorkflow,/owner_test_mode_window_strategy:/);
  assert.match(productionWorkflow,/owner_test_mode_task_complexity:/);
  assert.match(productionWorkflow,/owner_test_mode_reporting_complexity:/);
  assert.match(productionWorkflow,/ai_proposed/);
  assert.match(productionWorkflow,/explicit/);
  assert.match(productionWorkflow,/propose-owner-test-mode-window\.mjs/);
  assert.match(productionWorkflow,/timeframeProposal/);
});
