import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
const products=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");
const gateway=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");
const productMigration=fs.readFileSync(path.join(root,"supabase/migrations/20260926061000_governed_product_catalog.sql"),"utf8");
const ronsasSnapshot=fs.readFileSync(path.join(root,"data/imports/ronsas-product-20260926.jsonl"),"utf8");

test("Products is a first-class DataNest workspace",()=>{
  assert.match(app,/key:"products",label:"Products"/);
  assert.match(app,/view==="products"&&<ProductsWorkspace projectId={project.id}\/>/);
  assert.match(app,/Inspect governed products, linked architecture, controls, evidence and specialist experiences/);
  assert.match(app,/Inspect governed Resonance products, their architecture, controls, evidence, risks and promotion branches/);
});

test("Resonance Assistance stays concept 01 while Legal Eagle is its first live specialist",()=>{
  assert.match(products,/CONCEPT 01/);
  assert.match(products,/Product Concept Incubator/);
  assert.doesNotMatch(products,/PRODUCT 01/);
  assert.match(products,/Resonance Assistance/);
  assert.match(products,/FIRST SPECIALIST · LIVE/);
  assert.match(products,/Legal Eagle/);
  assert.match(products,/GOVERNED ASSISTANT/);
  assert.match(products,/live or incubating but not yet promoted as standalone catalog products/);
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
  assert.match(products,/not be relied on as a substitute for advice from a\s+qualified lawyer/);
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
  assert.match(gateway,/filter\(item=>item\.metadata\.learning_eligible!==false\)/);
  assert.match(gateway,/if\(legalMode\)\{\s*trendAnalysis=\{status:"not_applicable"\};\s*return;/);
  assert.match(gateway,/learningEligible:!legalMode/);
});


test("Products reads the governed product catalog from Supabase",()=>{
  assert.match(products,/from\("products"\)/);
  assert.match(products,/from\("product_records"\)/);
  assert.match(products,/GOVERNED PRODUCT CATALOG/);
  assert.match(products,/FREE PROMOTION · BILLING OFF/);
  assert.match(products,/PARENT PLATFORM/);
  assert.match(products,/RESONANCE DATANEST/);
  assert.match(products,/EXECUTION AUTHORITY/);
  assert.match(products,/\["intake","staging","audit","main"\]/);
  assert.match(products,/className="catalogNavigator"/);
  assert.match(products,/selectedProductId/);
  assert.match(products,/Search governed product records/);
  assert.match(products,/Filter governed record type/);
  assert.match(products,/visibleRecords/);
  assert.match(products,/No governed records match this view/);
  assert.match(products,/catalogDetailsOpen/);
  assert.match(products,/setCatalogDetailsOpen\(Boolean\(requestedQuery\)\|\|nextType!=="all"\)/);
  assert.match(products,/copyCatalogViewLink/);
  assert.match(products,/navigator\.clipboard\?\.writeText/);
  assert.match(products,/Copy view link/);
  assert.match(products,/View link copied\./);
  assert.match(products,/searchParams\.set\("product",nextProduct\)/);
  assert.match(products,/searchParams\.set\("recordType",recordTypeFilter\)/);
  assert.match(products,/searchParams\.set\("q",query\)/);
  assert.match(products,/SHAREABLE VIEW · URL SYNCED/);
});

test("governed product catalog schema is versioned with project-scoped RLS",()=>{
  assert.match(productMigration,/create table if not exists public\.products/);
  assert.match(productMigration,/create table if not exists public\.product_records/);
  assert.match(productMigration,/alter table public\.products enable row level security/);
  assert.match(productMigration,/private\.has_project_role\(project_id/);
  assert.match(productMigration,/private\.is_project_member\(project_id\)/);
});

test("RONSAS import snapshot remains complete and preserves commercial governance",()=>{
  const rows=ronsasSnapshot.trim().split("\n").map(line=>JSON.parse(line));
  assert.equal(rows.length,72);
  const product=rows.find(row=>row.record_type==="product");
  assert.ok(product);
  assert.equal(product.slug,"ronsas");
  assert.equal(product.billing_enabled,false);
  assert.equal(product.commercial_mode,"free promotion / no billing until pricing is established");
  assert.equal(product.parent_platform,"Resonance DataNest");
  assert.equal(product.product_role,"governed_product");
  assert.equal(product.execution_authority,"DataNest");
  assert.equal(product.promotion_authority,"DataNest");
  assert.equal(product.hosting_model,"replaceable_delivery_infrastructure");
  assert.equal(product.primary_runtime,"Windows local environment");

  const children=rows.filter(row=>row.record_type!=="product");
  assert.equal(children.length,71);
  assert.equal(children.filter(row=>row.record_type==="application").length,9);
  assert.equal(children.filter(row=>row.record_type==="governance_control").length,8);
  assert.equal(children.filter(row=>row.record_type==="risk").length,6);
  assert.equal(children.filter(row=>row.record_type==="roadmap_item").length,7);
  assert.deepEqual(
    children.filter(row=>row.record_type==="datanest_branch").map(row=>row.name).sort(),
    ["audit","intake","main","staging"]
  );
});
