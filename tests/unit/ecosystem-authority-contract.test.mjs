import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const authorityPath=path.join(root,"src/lib/ecosystemAuthority.ts");
const products=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");
const app=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");

test("canonical ecosystem authority constants are exported with exact approved values", async()=>{
  assert.equal(
    fs.existsSync(authorityPath),
    true,
    "src/lib/ecosystemAuthority.ts must define the canonical authority copy"
  );
  const authority=await import(pathToFileURL(authorityPath).href);
  assert.equal(authority.DATANEST_PLATFORM_NAME,"Resonance DataNest");
  assert.equal(authority.RONSAS_PRODUCT_NAME,"RONSAS");
  assert.equal(authority.RONSAS_FULL_NAME,"Resonance Open Nova Sovereign Application Suite");
  assert.equal(authority.RONSAS_PRODUCT_PATH,"DataNest > Products > RONSAS");
  assert.equal(authority.FREE_PROMOTION_LABEL,"FREE PROMOTION · BILLING OFF");
  assert.equal(authority.SPARKS_WORKSPACE_DESCRIPTION,"Use earned contribution utility for approved project services.");
  assert.equal(authority.SPARKS_TASK_START,"Review earned Sparks and approved project services before reserving utility for a governed service.");
  assert.equal(authority.SPARKS_TASK_COMPLETE,"The intended Spark service is reserved, fulfilled, cancelled, or intentionally left unchanged.");
  assert.equal(authority.SPARKS_TASK_EVIDENCE,"Append-only Spark ledger, balances, reservations, and approved service records.");
});

test("Products consumes the canonical RONSAS and free-promotion authority copy",()=>{
  assert.match(products,/from "@\/lib\/ecosystemAuthority"/);
  assert.match(products,/RONSAS_FULL_NAME/);
  assert.match(products,/FREE_PROMOTION_LABEL/);
  assert.doesNotMatch(products,/const RONSAS_FULL_NAME=/);
});

test("Sparks workspace guidance consumes canonical internal-utility copy",()=>{
  for(const symbol of [
    "SPARKS_WORKSPACE_DESCRIPTION",
    "SPARKS_TASK_START",
    "SPARKS_TASK_COMPLETE",
    "SPARKS_TASK_EVIDENCE"
  ]){
    assert.match(app,new RegExp(symbol));
  }
});


test("authority documentation keeps target-state concepts honest and Sparks aligned",()=>{
  const readme=fs.readFileSync(path.join(root,"README.md"),"utf8");
  const architecture=fs.readFileSync(path.join(root,"docs/ARCHITECTURE.md"),"utf8");
  const ux=fs.readFileSync(path.join(root,"docs/UX_WORKFLOW_ARCHITECTURE.md"),"utf8");

  for(const source of [readme,architecture]){
    assert.match(source,/DataNest[\s\S]{0,120}(parent platform|control plane)/i);
    assert.match(source,/RONSAS[\s\S]{0,160}governed product/i);
    assert.match(source,/Cloud-Nest/);
    assert.match(source,/Supository/);
    assert.match(source,/\bILM\b/);
    assert.match(source,/(target-state|not yet live)/i);
    assert.doesNotMatch(source,/Cloud-Nest[^\n]{0,100}\b(live|implemented)\b/i);
    assert.doesNotMatch(source,/Supository[^\n]{0,100}\b(live|implemented)\b/i);
    assert.doesNotMatch(source,/\bILM\b[^\n]{0,100}\b(live|implemented)\b/i);
  }

  assert.match(ux,/Sparks — earned contribution utility for approved project services\./);
  assert.doesNotMatch(ux,/Sparks — capture intent and raw ideas\./);

  assert.match(readme,/https:\/\/datanest-supository\.github\.io\/DataNest\//);
  assert.match(readme,/GitHub Pages.*current public delivery target/i);
  assert.match(readme,/Supabase/i);
});
