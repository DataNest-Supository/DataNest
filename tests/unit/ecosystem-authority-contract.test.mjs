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
