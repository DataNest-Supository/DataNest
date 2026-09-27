import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const aiPath=path.join(root,"supabase/functions/datanest-ai-chat/index.ts");
const fileAccessPath=path.join(root,"supabase/migrations/20260925191008_datanest_ai_file_access_gateway.sql");

test("DataNest AI keeps Phase C visibility and reuse metadata independent",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/visibility_class:visibilityClass/);
  assert.match(source,/reuse_state:reuseState/);
  assert.match(source,/learning_eligible:learningEligible/);
});

test("external provider routing requires Phase C service evaluation before existing provider authorization",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  const phase=source.indexOf("service_evaluate_data_policy_v1");
  const authz=source.indexOf("service_authorize_ai_request");
  const call=source.indexOf("callOpenAiCompatibleProvider({",source.indexOf("callProvider:async"));
  assert.ok(phase>=0,"Phase C evaluator must be called");
  assert.ok(authz>phase,"existing provider authorization must remain after Phase C evaluation");
  assert.ok(call>authz,"provider call must occur only after both gates");
  assert.match(source,/target_purpose:"external_provider_processing"/);
  assert.match(source,/target_operation:"process"/);
  assert.match(source,/target_provider_connection:connection\.id/);
});

test("Phase C denial degrades to embedded fallback without fabricating external success",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/String\(phaseCPolicy\.outcome\|\|"deny"\)!=="allow"/);
  assert.match(source,/provider_trust_policy_denied/);
  assert.match(source,/embeddedResponse\(job,message,productMode,jurisdiction\)/);
  assert.doesNotMatch(source,/phaseCPolicy[\s\S]*requestStatus="succeeded"[\s\S]*callOpenAiCompatibleProvider/);
});

test("project learning is separately evaluated before trend extraction",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  const learning=source.indexOf('target_purpose:"project_learning"');
  const trend=source.indexOf("updateTrendCandidate({");
  assert.ok(learning>=0,"project learning evaluator must exist");
  assert.ok(trend>learning,"learning policy evaluation must precede trend extraction");
  assert.match(source,/target_operation:"reuse"/);
  assert.match(source,/target_hard_learning_exclusion:!learningEligible/);
  assert.match(source,/learningPolicy\.outcome/);
});

test("Legal Eagle remains a hard non-learning mode",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/const learningEligible=!legalMode/);
  assert.match(source,/product_mode:legalMode\?"legal_eagle":"datanest_ai"/);
  assert.match(source,/learning_eligible:learningEligible/);
  assert.match(source,/target_hard_learning_exclusion:!learningEligible/);
});

test("certified memory remains on the existing governed retrieval path",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/get_certified_memory_context/);
  assert.doesNotMatch(source,/from\("trust_manifests"\)[\s\S]*normalized_knowledge/);
  assert.doesNotMatch(source,/from\("certified_memory"\)\s*\.insert\(/);
});

test("Phase C does not replace Job file authorization",()=>{
  const fileAccess=fs.readFileSync(fileAccessPath,"utf8");
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(fileAccess,/authorize_datanest_ai_file_access/);
  assert.doesNotMatch(source,/service_evaluate_data_policy_v1[\s\S]*bypass.*file/i);
});
