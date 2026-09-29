import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../../src/components/DataNestApp.tsx",import.meta.url),"utf8");
const home=readFileSync(new URL("../../src/components/ResonanceHome.tsx",import.meta.url),"utf8");

test("current views are regrouped under mission-oriented Business OS headings",()=>{
  const groups=[...app.matchAll(/group:"([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual([...new Set(groups)],["Home","Explore","Portfolio","Projects","Intelligence","Governance","Assurance","System"]);
  assert.match(app,/key:"external_auditor",label:"External Audit & Optimizer",group:"Assurance"/);
  assert.match(app,/key:"overview",label:"AI & I",group:"Home"/);
  assert.match(app,/key:"ai",label:"DataNest AI",group:"Intelligence"/);
  assert.doesNotMatch(app,/label:"iBank"/);
  assert.doesNotMatch(app,/label:"Barterer Tender"/);
  assert.match(app,/group==="Home"/);
});

test("home fallback uses the canonical Business OS definition",()=>{
  assert.match(home,/DATANEST_PLATFORM_DEFINITION/);
  assert.match(home,/project\.description\|\|DATANEST_PLATFORM_DEFINITION/);
  assert.doesNotMatch(home,/A governed workspace where human direction and DataNest AI meet in one traceable operating system\./);
});
