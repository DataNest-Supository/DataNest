import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const migrationPath=path.join(root,"supabase/migrations/20260927115000_add_trust_policy_governed_operations.sql");
function sql(){return fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,"utf8"):"";}

test("Phase C governed operations migration exists",()=>{
  assert.equal(fs.existsSync(migrationPath),true,"20260927115000_add_trust_policy_governed_operations.sql must exist");
});

test("all approved governed operations exist",()=>{
  const source=sql(); if(!source)return;
  for(const fn of [
    "propose_data_policy_binding_v1","approve_data_policy_binding_v1","reject_data_policy_binding_v1",
    "create_trust_manifest_draft_v1","activate_trust_manifest_v1","reject_trust_manifest_v1",
    "create_provider_trust_profile_v1","activate_provider_trust_profile_v1","suspend_provider_trust_profile_v1","retire_provider_trust_profile_v1",
    "propose_retention_policy_v1","approve_retention_policy_v1","reject_retention_policy_v1",
    "place_retention_hold_v1","release_retention_hold_v1","request_retention_review_v1","resolve_retention_review_v1",
    "record_data_policy_lineage_v1","get_trust_policy_workspace_v1","service_evaluate_data_policy_v1"
  ]) assert.match(source,new RegExp("create or replace function public\\."+fn+"\\(","i"));
});

test("private helpers are not browser executable and service evaluator is service-role only",()=>{
  const source=sql(); if(!source)return;
  for(const fn of [
    "trust_validate_subject","trust_active_manifest","trust_effective_binding","trust_has_active_retention_hold",
    "trust_lineage_state","trust_validate_manifest_evidence","trust_validate_provider_profile","trust_resolve_effective_policy"
  ]){
    assert.match(source,new RegExp("create or replace function private\\."+fn+"\\(","i"));
    assert.match(source,new RegExp("revoke all on function private\\."+fn+"\\(","i"));
  }
  assert.match(source,/revoke all on function public\.service_evaluate_data_policy_v1\([^;]+from public,anon,authenticated/i);
  assert.match(source,/grant execute on function public\.service_evaluate_data_policy_v1\([^;]+to service_role/i);
});

test("subject, product, and provider connection validation fail closed across projects",()=>{
  const source=sql(); if(!source)return;
  assert.match(source,/Object project mismatch/i);
  assert.match(source,/Product subject not found in project/i);
  assert.match(source,/Job subject not found in project/i);
  assert.match(source,/Certified memory subject not found in project/i);
  assert.match(source,/Portfolio Item subject not found in project/i);
  assert.match(source,/Provider connection project mismatch/i);
});

test("high-impact widening requires owner/admin and independent approval",()=>{
  const source=sql(); if(!source)return;
  assert.match(source,/target\.visibility_class='public'/i);
  assert.match(source,/target\.reuse_state in \('platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'\)/i);
  assert.match(source,/target\.publication_authorized/i);
  assert.match(source,/A proposer cannot approve their own high-impact policy widening/i);
  assert.match(source,/array\['owner','admin'\]/i);
});

test("activation supersedes prior active history instead of overwriting it",()=>{
  const source=sql(); if(!source)return;
  assert.match(source,/update public\.data_policy_bindings[\s\S]*status='superseded'/i);
  assert.match(source,/update public\.trust_manifests[\s\S]*status='superseded'/i);
  assert.match(source,/update public\.provider_trust_profiles[\s\S]*status='restricted'/i);
  assert.match(source,/update public\.retention_policies[\s\S]*status='superseded'/i);
});

test("service evaluator is deny preserving for unresolved policy, external routing, learning, publication, and retention",()=>{
  const source=sql(); if(!source)return;
  for(const token of [
    "policy_unresolved","local_only_external_denied","provider_profile_missing","provider_profile_inactive",
    "provider_visibility_denied","provider_purpose_denied","hard_learning_exclusion",
    "project_learning_not_authorized","platform_learning_not_authorized",
    "publication_not_authorized","retention_hold_active","lineage_review_unresolved"
  ]) assert.match(source,new RegExp(token,"i"));
  assert.match(source,/outcome','review_required'/i);
  assert.match(source,/outcome','deny'/i);
  assert.doesNotMatch(source,/delete from/i);
  assert.doesNotMatch(source,/truncate\s+/i);
});

test("policy evaluation never returns raw content and emits trace-safe evidence",()=>{
  const source=sql(); if(!source)return;
  assert.match(source,/DATA_POLICY_EVALUATED/i);
  assert.match(source,/decision_trace/i);
  assert.doesNotMatch(source,/jsonb_build_object\([^;]*content/i);
});

test("Legal Eagle style hard learning exclusions override broader manifest defaults",()=>{
  const source=sql(); if(!source)return;
  assert.match(source,/target_hard_learning_exclusion boolean/i);
  assert.match(source,/target_hard_learning_exclusion[\s\S]*hard_learning_exclusion/i);
});

test("authenticated mutations are RPC-only and every significant change emits an audit event",()=>{
  const source=sql(); if(!source)return;
  for(const event of [
    "DATA_POLICY_PROPOSED","DATA_POLICY_APPROVED","DATA_POLICY_REJECTED","TRUST_MANIFEST_ACTIVATED",
    "PROVIDER_TRUST_PROFILE_ACTIVATED","PROVIDER_TRUST_PROFILE_SUSPENDED","RETENTION_POLICY_APPROVED",
    "RETENTION_HOLD_PLACED","RETENTION_HOLD_RELEASED","RETENTION_REVIEW_REQUESTED",
    "RETENTION_REVIEW_RESOLVED","DATA_POLICY_LINEAGE_RECORDED"
  ]) assert.match(source,new RegExp(event,"i"));
  assert.match(source,/insert into public\.events/i);
});

test("Phase C operations expose no destructive retention executor",()=>{
  const source=sql(); if(!source)return;
  assert.doesNotMatch(source,/create or replace function public\.(?:delete|purge|anonymize|execute_retention|apply_retention)/i);
  assert.doesNotMatch(source,/storage\.objects[\s\S]*(?:delete|update)/i);
});
