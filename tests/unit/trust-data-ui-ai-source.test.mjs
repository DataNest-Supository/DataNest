import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=()=>fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
const panelPath=path.join(root,"src/components/TrustDataPanel.tsx");
const gateway=()=>fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");

test("Settings nests a Trust & Data surface instead of creating a top-level product",()=>{
  assert.equal(fs.existsSync(panelPath),true,"TrustDataPanel.tsx must exist");
  const source=app();
  assert.doesNotMatch(source,/label:"Trust & Data"/);
  assert.match(source,/TrustDataPanel/);
  assert.match(source,/view==="settings"[\s\S]*<Settings/);
  assert.match(source,/<TrustDataPanel projectId=\{project\.id\}/);
});

test("Trust & Data UI explains independent processing and learning policy",()=>{
  const source=fs.readFileSync(panelPath,"utf8");
  assert.match(source,/TRUST & DATA/);
  assert.match(source,/Processing permission is not learning permission\./);
  assert.match(source,/Retention evaluation is review-only and does not automatically delete data\./);
  for(const value of [
    "Public","Nest Private","Project Restricted","Organization Restricted","High Sensitivity","Local Only"
  ])assert.match(source,new RegExp(value));
  for(const value of [
    "Runtime Only","Session Context","Project Learning Eligible","Project Certified Memory",
    "Platform Learning Eligible","DataNest Certified Knowledge","Publicly Reusable"
  ])assert.match(source,new RegExp(value));
});

test("Trust & Data UI reads governed policy tables and mutates only through RPCs",()=>{
  const source=fs.readFileSync(panelPath,"utf8");
  for(const table of [
    "retention_policies","data_policy_assignments","provider_trust_profiles","trust_manifests","retention_evaluations"
  ])assert.match(source,new RegExp('from\\("'+table+'"\\)'));

  assert.doesNotMatch(source,/from\("(?:retention_policies|data_policy_assignments|provider_trust_profiles|trust_manifests|retention_evaluations)"\)[\s\S]{0,180}\.(?:insert|update|delete)\(/);

  for(const fn of [
    "propose_retention_policy_v1","approve_retention_policy_v1",
    "propose_provider_trust_profile_v1","approve_provider_trust_profile_v1",
    "save_trust_manifest_draft_v1","approve_trust_manifest_v1",
    "run_retention_evaluation_v1"
  ])assert.match(source,new RegExp(fn));
});

test("DataNest AI stages explicit visibility/reuse policy and keeps Legal Eagle learning-ineligible",()=>{
  const source=gateway();
  assert.match(source,/visibilityClass/);
  assert.match(source,/reuseState/);
  assert.match(source,/policyPurpose/);
  assert.match(source,/learningEligible/);
  assert.match(source,/legalMode\s*\?\s*"session_context"/);
  assert.match(source,/learning_eligible:learningEligible/);
  assert.match(source,/visibility_class:visibilityClass/);
  assert.match(source,/reuse_state:reuseState/);
  assert.match(source,/purpose:policyPurpose/);
});

test("DataNest AI trend learning requires an eligible reuse state as well as learning_eligible",()=>{
  const source=gateway();
  assert.match(source,/projectLearningReuseStates/);
  assert.match(source,/metadata\.learning_eligible!==false/);
  assert.match(source,/metadata\.reuse_state\|\|"project_learning_eligible"/);
  assert.match(source,/projectLearningReuseStates\.has/);
});

test("DataNest AI external provider routing is gated by Provider Trust Profile preflight",()=>{
  const source=gateway();
  assert.match(source,/evaluate_provider_policy_v1/);
  assert.match(source,/target_provider_key:connection\.provider/);
  assert.match(source,/target_visibility_class:visibilityClass/);
  assert.match(source,/target_purpose:policyPurpose/);
  assert.match(source,/target_reuse_state:reuseState/);
  assert.match(source,/provider_trust_policy_denied/);
  assert.match(source,/Provider Trust Profile blocked external routing/);
  assert.ok(
    source.indexOf("evaluate_provider_policy_v1") < source.indexOf("service_authorize_ai_request"),
    "Provider Trust Profile preflight must run before provider authorization"
  );
});
