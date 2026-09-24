import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

test("navigation exposes DataNest AI and not the R&D Dashboard", () => {
  const source=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
  assert.match(source,/label:"DataNest AI"/);
  assert.doesNotMatch(source,/label:"R&D Dashboard"/);
});

test("DataNest AI workspace exposes chat, current job, certified memory and certification", () => {
  const source=fs.readFileSync(path.join(root,"src/components/DataNestAiWorkspace.tsx"),"utf8");
  assert.match(source,/DataNest AI/);
  assert.match(source,/Current Job Context/);
  assert.match(source,/Certified Memory/);
  assert.match(source,/Learning & Certification/);
});

test("old UNIFI Copilot identity is absent from runtime UI source", () => {
  const files=[
    "src/components/DataNestApp.tsx",
    "src/components/DataNestAiWorkspace.tsx",
    "src/components/DataNestAiChatPanel.tsx"
  ];
  for(const file of files){
    const source=fs.readFileSync(path.join(root,file),"utf8");
    assert.doesNotMatch(source,/UNIFI Copilot/);
  }
});


test("active client source no longer references contribution or stake scoring RPCs", () => {
  const files=[
    "src/components/DataNestApp.tsx",
    "src/components/AiOperationsDashboard.tsx",
    "src/components/AiReconciliationPanel.tsx",
    "src/components/ProductLab.tsx"
  ];
  const source=files.map(file=>fs.readFileSync(path.join(root,file),"utf8")).join("\n");
  for(const forbidden of [
    "contribution_ledger",
    "get_stakeholder_summary",
    "submit_external_ai_credit",
    "accept_contribution",
    "reject_contribution",
    "reverse_contribution",
    "suggested_product_stake"
  ]) assert.equal(source.includes(forbidden),false,forbidden+" must be retired from active client source");
});


test("DataNest AI governed E2E and stress harness is wired", () => {
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  assert.equal(pkg.scripts["test:browser:datanest-ai"],"playwright test tests/browser/datanest-ai.spec.ts");
  assert.equal(pkg.scripts["test:stress:datanest-ai"],"node tests/stress/datanest-ai-stress.mjs");
  assert.equal(pkg.scripts["seed:e2e:datanest-ai"],"node scripts/seed-datanest-ai-e2e.mjs");
  for(const file of [
    "scripts/seed-datanest-ai-e2e.mjs",
    "tests/browser/datanest-ai.spec.ts",
    "tests/stress/datanest-ai-stress.mjs"
  ]) assert.equal(fs.existsSync(path.join(root,file)),true,file+" must exist");
});


test("governed release wiring names the certified DataNest AI runtime", () => {
  const ci=fs.readFileSync(path.join(root,".github/workflows/ci.yml"),"utf8");
  const pages=fs.readFileSync(path.join(root,".github/workflows/pages.yml"),"utf8");
  const manifest=fs.readFileSync(path.join(root,"scripts/write-release-manifest.mjs"),"utf8");
  const certification=fs.readFileSync(path.join(root,".github/workflows/datanest-ai-certification.yml"),"utf8");
  const config=fs.readFileSync(path.join(root,"supabase/config.toml"),"utf8");

  assert.match(ci,/Retired Copilot\/contribution-scoring source remains active/);
  assert.match(certification,/DATANEST_AI_STAGING_SERVICE_ROLE_KEY/);
  assert.match(certification,/test:browser:datanest-ai/);
  assert.match(certification,/test:stress:datanest-ai/);

  for(const fn of ["datanest-ai-chat","datanest-ai-intake","datanest-ai-certification"]){
    assert.match(config,new RegExp("\\[functions\\."+fn.replaceAll("-","\\-")+"\\][\\s\\S]*?verify_jwt = true"));
  }

  assert.match(manifest,/datanest-ai-governed-memory-v1/);
  assert.match(manifest,/datanest-ai-chat@1/);
  assert.match(manifest,/datanest-ai-intake@1/);
  assert.match(manifest,/datanest-ai-certification@1/);
  assert.match(pages,/datanest-ai-governed-memory-v1/);
});


test("External AI Companion uses certification language instead of scoring language", () => {
  const source=fs.readFileSync(path.join(root,"src/components/ExternalAiSidebar.tsx"),"utf8");
  assert.doesNotMatch(source,/contribution points|unscored/i);
  assert.match(source,/UNCERTIFIED evidence/);
  assert.match(source,/governed certification/);
});


test("certification workspace scopes evidence rows to project candidates", () => {
  const source=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-certification/index.ts"),"utf8");
  assert.match(source,/const candidateIds=.*candidates/);
  assert.match(source,/ai_validation_runs"\)[\s\S]*?\.in\("candidate_id",candidateIds\)/);
  assert.match(source,/ai_certification_decisions"\)[\s\S]*?\.in\("candidate_id",candidateIds\)/);
});

test("browser certification console cannot self-pass the stress-test gate", () => {
  const panel=fs.readFileSync(path.join(root,"src/components/DataNestAiCertificationPanel.tsx"),"utf8");
  const gateway=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-certification/index.ts"),"utf8");
  assert.match(panel,/gate==="STRESS_TEST"/);
  assert.match(panel,/Recorded by governed stress suite/);
  assert.doesNotMatch(panel,/onClick=.*record_validation[\s\S]{0,900}STRESS_TEST/);
  assert.match(gateway,/gate==="STRESS_TEST"[\s\S]{0,300}governed stress suite/i);
});


test("certification retry reconciles candidate state after an existing decision", () => {
  const source=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-certification/index.ts"),"utf8");
  assert.match(source,/if\(existing\)\{[\s\S]{0,700}lifecycle_state:"CERTIFIED"[\s\S]{0,300}return existing/);
});

test("certification workspace orders validation runs oldest to newest for latest-state reduction", () => {
  const source=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-certification/index.ts"),"utf8");
  assert.match(source,/ai_validation_runs"\)[\s\S]{0,250}order\("created_at",\{ascending:true\}\)/);
});
