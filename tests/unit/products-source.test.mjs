import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const app=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
const products=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");

test("Products is a first-class DataNest workspace",()=>{
  assert.match(app,/key:"products",label:"Products"/);
  assert.match(app,/view==="products"&&<ProductsWorkspace/);
  assert.match(app,/Explore Resonance Assistance and specialist product experiences/);
});

test("Resonance Assistance is product 01 and Legal Eagle is its first specialist",()=>{
  assert.match(products,/PRODUCT 01/);
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
