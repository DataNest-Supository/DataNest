import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const migrationPath=path.join(root,"supabase/migrations/20260927100000_add_trust_data_policy_foundations.sql");

function sql(){
  return fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,"utf8"):"";
}

test("Phase C trust and data policy foundation migration exists",()=>{
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    "20260927100000_add_trust_data_policy_foundations.sql must exist"
  );
});

test("Phase C keeps visibility and reuse as independent canonical policy dimensions",()=>{
  const source=sql();
  if(!source)return;

  for(const value of [
    "public","nest_private","project_restricted","organization_restricted","high_sensitivity","local_only"
  ])assert.match(source,new RegExp(value,"i"));

  for(const value of [
    "runtime_only","session_context","project_learning_eligible","project_certified_memory",
    "platform_learning_eligible","datanest_certified_knowledge","publicly_reusable"
  ])assert.match(source,new RegExp(value,"i"));

  assert.match(source,/create table public\.data_policy_assignments/i);
  assert.match(source,/visibility_class text not null/i);
  assert.match(source,/reuse_state text not null/i);
});

test("Phase C trust policy history is RLS protected and authenticated clients are read-only",()=>{
  const source=sql();
  if(!source)return;

  for(const table of [
    "retention_policies","data_policy_assignments","provider_trust_profiles",
    "trust_manifests","retention_evaluations"
  ]){
    assert.match(source,new RegExp("alter table public\\."+table+" enable row level security","i"));
    assert.match(source,new RegExp("grant select on table public\\."+table+" to authenticated","i"));
  }

  assert.match(source,/private\.is_project_stakeholder\(project_id\)[\s\S]*private\.is_project_member\(project_id\)/i);
  assert.doesNotMatch(
    source,
    /grant\s+[^;]*(?:insert|update|delete)[^;]*on table public\.(?:retention_policies|data_policy_assignments|provider_trust_profiles|trust_manifests|retention_evaluations)[^;]*to authenticated/i
  );
  assert.match(source,/service_role/i);
});

test("Provider Trust Profiles contain policy metadata but no credential fields",()=>{
  const source=sql();
  if(!source)return;
  const match=source.match(/create table public\.provider_trust_profiles\s*\(([\s\S]*?)\n\);/i);
  assert.ok(match,"provider_trust_profiles table definition must exist");
  const table=match[1];
  assert.match(table,/permitted_visibility_classes text\[\]/i);
  assert.match(table,/permitted_purposes text\[\]/i);
  assert.match(table,/retention_policy text not null/i);
  assert.match(table,/training_reuse_policy text not null/i);
  assert.match(table,/security_posture text not null/i);
  assert.doesNotMatch(table,/api_key|secret|password|credential|access_token|refresh_token/i);
});

test("Trust Manifest public publication is evidence-backed and owner-authorized",()=>{
  const source=sql();
  if(!source)return;
  assert.match(source,/create table public\.trust_manifests/i);
  assert.match(source,/publication_state[\s\S]*draft[\s\S]*internal[\s\S]*public/i);
  assert.match(source,/approve_trust_manifest_v1/i);
  assert.match(source,/target_public[\s\S]*array\['owner'\]/i);
  assert.match(source,/jsonb_object_length\(manifest\.evidence\)\s*=\s*0/i);
  assert.match(source,/Public Trust Manifest requires evidence/i);
});

test("retention evaluation is append-only dry-run evidence and never deletes governed source objects",()=>{
  const source=sql();
  if(!source)return;
  assert.match(source,/create table public\.retention_evaluations/i);
  assert.match(source,/execution_authorized boolean not null default false/i);
  assert.match(source,/run_retention_evaluation_v1/i);
  assert.match(source,/insert into public\.retention_evaluations/i);
  assert.doesNotMatch(source,/delete from public\.(?:ai_intake_events|certified_memory|portfolio_items|products|product_records)/i);
  assert.doesNotMatch(source,/truncate\s+/i);
});

test("Phase C governed operations fail closed on cross-project and high-reuse authority",()=>{
  const source=sql();
  if(!source)return;
  for(const fn of [
    "propose_data_policy_assignment_v1","approve_data_policy_assignment_v1","reject_data_policy_assignment_v1",
    "propose_retention_policy_v1","approve_retention_policy_v1","reject_retention_policy_v1",
    "propose_provider_trust_profile_v1","approve_provider_trust_profile_v1",
    "save_trust_manifest_draft_v1","approve_trust_manifest_v1",
    "run_retention_evaluation_v1","evaluate_provider_policy_v1"
  ]){
    assert.match(source,new RegExp("create or replace function public\\."+fn+"\\(","i"));
    assert.match(source,new RegExp("revoke all on function public\\."+fn+"\\(","i"));
  }
  assert.match(source,/Object project mismatch/i);
  assert.match(source,/platform_learning_eligible[\s\S]*datanest_certified_knowledge[\s\S]*publicly_reusable/i);
  assert.match(source,/array\['owner'\]/i);
  assert.match(source,/Authentication is required/i);
  assert.match(source,/insert into public\.events/i);
});

test("provider policy preflight fails closed and respects Local Only",()=>{
  const source=sql();
  if(!source)return;
  assert.match(source,/evaluate_provider_policy_v1/i);
  assert.match(source,/No active Provider Trust Profile permits this route/i);
  assert.match(source,/target_visibility_class='local_only'/i);
  assert.match(source,/region_locality[\s\S]*local/i);
  assert.match(source,/jsonb_build_object\('permitted',false/i);
});
