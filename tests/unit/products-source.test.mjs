import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
const products=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");
const gateway=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");

test("Products is a first-class DataNest workspace with project context",()=>{
  assert.match(app,/key:"products",label:"Products"/);
  assert.match(app,/view==="products"&&<ProductsWorkspace projectId=\{project\.id\}/);
  assert.match(app,/Explore Resonance Assistance and specialist product experiences/);
});

test("Resonance Assistance is product 01 and Legal Eagle is its first live specialist",()=>{
  assert.match(products,/PRODUCT 01/);
  assert.match(products,/Resonance Assistance/);
  assert.match(products,/FIRST SPECIALIST · LIVE/);
  assert.match(products,/Legal Eagle/);
  assert.match(products,/GOVERNED ASSISTANT/);
});

test("Legal Eagle calls the governed AI gateway with matter and jurisdiction scope",()=>{
  assert.match(products,/functions\.invoke\("datanest-ai-chat"/);
  assert.match(products,/productMode:"legal_eagle"/);
  assert.match(products,/jurisdiction:cleanJurisdiction/);
  assert.match(products,/legalTask:selectedTask\.key/);
  assert.match(products,/jobId:selectedJob\.id/);
  assert.match(products,/datanest\.legalEagle\.session/);
});

test("Legal Eagle keeps legal decisions and representation with humans",()=>{
  assert.match(products,/does not create an attorney-client relationship/);
  assert.match(products,/not be relied on as a substitute for advice from a qualified lawyer/);
  assert.match(products,/No fabricated authority/);
  assert.match(products,/No autonomous deadlines/);
  assert.match(products,/No representation/);
  assert.match(products,/Human escalation/);
});

test("Legal Eagle backend requires jurisdiction and blocks automatic learning",()=>{
  assert.match(gateway,/productMode==="legal_eagle"/);
  assert.match(gateway,/Legal Eagle requires a jurisdiction before substantive assistance/);
  assert.match(gateway,/do not create an attorney-client relationship or legal privilege/);
  assert.match(gateway,/Do not fabricate statutes, cases, citations, court rules, filing requirements or deadlines/);
  assert.match(gateway,/learning_eligible:!legalMode/);
  assert.match(gateway,/if\(legalMode\)\{\s*trendAnalysis=\{status:"not_applicable"\};\s*return;/);
  assert.match(gateway,/learningEligible:!legalMode/);
});
