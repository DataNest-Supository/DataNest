import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const aiPath=path.join(root,"supabase/functions/datanest-ai-chat/index.ts");
const intakePath=path.join(root,"supabase/functions/datanest-ai-intake/index.ts");
const fileAccessPath=path.join(root,"supabase/migrations/20260925191008_datanest_ai_file_access_gateway.sql");

test("DataNest AI keeps visibility and reuse metadata independent while initial learning is fail closed",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/visibility_class:visibilityClass/);
  assert.match(source,/reuse_state:reuseState/);
  assert.match(source,/requested_learning_eligible:learningEligible/);
  assert.match(source,/learning_eligible:false/);
});

test("external provider routing records Phase C before existing provider authorization",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  const phase=source.indexOf("service_evaluate_data_policy_v1");
  const authz=source.indexOf("service_authorize_ai_request");
  const call=source.indexOf("callOpenAiCompatibleProvider({",source.indexOf("callProvider:async"));
  assert.ok(phase>=0,"Phase C evaluator must be called");
  assert.ok(authz>phase,"existing provider authorization must remain after Phase C evaluation");
  assert.ok(call>authz,"provider call must occur only after both gates");
  assert.match(source,/const providerKey=connection\.provider\.toLowerCase\(\)\+":"\+connection\.endpoint_host\.toLowerCase\(\)/);
  assert.match(source,/target_actor_user:user\.id/);
  assert.match(source,/target_subject_type:"job"/);
  assert.match(source,/target_subject_id:job\.id/);
  assert.match(source,/target_purpose:"external_provider_processing"/);
  assert.match(source,/target_requested_operation:"process"/);
  assert.match(source,/target_trace_id:stagedInputTraceId/);
  assert.match(source,/target_provider_connection:connection\.id/);
  assert.match(source,/target_provider_key:providerKey/);
});

test("report-only external findings do not override existing provider authorization",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/String\(phaseCPolicy\.enforcement_mode\|\|"report_only"\)==="enforced"/);
  assert.match(source,/String\(phaseCPolicy\.outcome\|\|"deny"\)!=="allow"/);
  assert.match(source,/provider_trust_policy_denied/);
  assert.match(source,/service_authorize_ai_request/);
  assert.match(source,/embeddedResponse\(job,message,productMode,jurisdiction\)/);
});

test("project learning is fail closed regardless of report-only rollout and stamps decision evidence before trends",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  const learning=source.indexOf('target_purpose:"project_learning"');
  const stamp=source.indexOf("learning_eligible:finalLearningEligible");
  const trend=source.indexOf("updateTrendCandidate({");
  assert.ok(learning>=0,"project learning evaluator must exist");
  assert.ok(stamp>learning,"final learning stamp must follow evaluation");
  assert.ok(trend>stamp,"learning metadata must be stamped before trend extraction");
  assert.match(source,/target_actor_user:user\.id/);
  assert.match(source,/target_subject_type:"job"/);
  assert.match(source,/target_subject_id:job\.id/);
  assert.match(source,/target_requested_operation:"reuse"/);
  assert.match(source,/target_trace_id:String\(inputEvent\.traceId\|\|stagedInputTraceId\)/);
  assert.match(source,/target_hard_learning_exclusion:!learningEligible/);
  assert.match(source,/const finalLearningEligible=learningEligible&&String\(learningPolicy\.outcome\|\|"deny"\)==="allow"/);
  assert.match(source,/decision_record_id:learningPolicy\.decision_record_id/);
  assert.match(source,/effective_reuse_state:learningPolicy\.reuse_state/);
  assert.match(source,/policy_version:learningPolicy\.policy_version\|\|policyVersion/);
  assert.match(source,/if\(!finalLearningEligible\)\{[\s\S]{0,120}trendAnalysis=\{status:"not_applicable"\}/);
});

test("Legal Eagle remains a hard non-learning mode",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/const learningEligible=!legalMode&&reuseState==="project_learning_eligible"/);
  assert.match(source,/product_mode:legalMode\?"legal_eagle":"datanest_ai"/);
  assert.match(source,/target_hard_learning_exclusion:!learningEligible/);
  assert.match(source,/if\(legalMode\)\{\s*trendAnalysis=\{status:"not_applicable"\};\s*return;/);
});

test("automatic learning only admits explicitly authorized evidence",()=>{
  const source=fs.readFileSync(aiPath,"utf8");
  assert.match(source,/\.filter\(item=>item\.metadata\.learning_eligible===true\)/);
  assert.doesNotMatch(source,/item\.metadata\.learning_eligible!==false/);
  assert.match(source,/projectLearningReuseStates\.has\(reuseState\)/);
});

test("AI Companion intake uses the same Job-scoped project-learning policy",()=>{
  const source=fs.readFileSync(intakePath,"utf8");
  assert.match(source,/service_evaluate_data_policy_v1/);
  assert.match(source,/target_actor_user:user\.id/);
  assert.match(source,/target_subject_type:"job"/);
  assert.match(source,/target_subject_id:String\(session\.job_id\)/);
  assert.match(source,/target_purpose:"project_learning"/);
  assert.match(source,/target_requested_operation:"reuse"/);
  assert.match(source,/target_trace_id:traceKey/);
  assert.match(source,/learning_eligible:learningAllowed/);
  assert.match(source,/decision_record_id:learningPolicy\.decision_record_id/);
  assert.match(source,/effective_reuse_state:learningPolicy\.reuse_state/);
  assert.match(source,/policy_version:learningPolicy\.policy_version/);
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
