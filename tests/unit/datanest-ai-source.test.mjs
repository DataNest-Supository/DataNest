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
