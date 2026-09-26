import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
const products=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");
const productMigration=fs.readFileSync(path.join(root,"supabase/migrations/20260926061000_governed_product_catalog.sql"),"utf8");
const ronsasSnapshot=fs.readFileSync(path.join(root,"data/imports/ronsas-product-20260926.jsonl"),"utf8");

test("Products is a first-class DataNest workspace",()=>{
  assert.match(app,/key:"products",label:"Products"/);
  assert.match(app,/view==="products"&&<ProductsWorkspace projectId={project.id}\/>/);
  assert.match(app,/Explore Resonance Assistance and specialist product experiences/);
});

test("Resonance Assistance is clearly separated as concept 01 and Legal Eagle is its first specialist",()=>{
  assert.match(products,/CONCEPT 01/);
  assert.match(products,/Product Concept Incubator/);
  assert.doesNotMatch(products,/PRODUCT 01/);
  assert.match(products,/Resonance Assistance/);
  assert.match(products,/FIRST SPECIALIST/);
  assert.match(products,/Legal Eagle/);
  assert.match(products,/Legal information \+ preparation/);
});

test("Legal Eagle keeps legal decisions and representation with humans",()=>{
  assert.match(products,/does not create an attorney-client relationship/);
  assert.match(products,/not be relied on as a substitute for advice from a qualified lawyer/);
  assert.match(products,/No autonomous deadlines/);
  assert.match(products,/No representation/);
  assert.match(products,/Human escalation/);
  assert.match(products,/NO LEGAL CONCLUSION GENERATED/);
});


test("Products reads the governed product catalog from Supabase",()=>{
  assert.match(products,/from\("products"\)/);
  assert.match(products,/from\("product_records"\)/);
  assert.match(products,/GOVERNED PRODUCT CATALOG/);
  assert.match(products,/FREE PROMOTION · BILLING OFF/);
  assert.match(products,/\["intake","staging","audit","main"\]/);
  assert.match(products,/className="catalogNavigator"/);
  assert.match(products,/selectedProductId/);
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
