import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const home=fs.readFileSync(path.join(root,"src/components/ResonanceHome.tsx"),"utf8");
const visual=fs.readFileSync(path.join(root,"src/components/CollaborationVisual.tsx"),"utf8");
const css=fs.readFileSync(path.join(root,"src/components/CollaborationVisual.module.css"),"utf8");

test("AI & I hero renders governed Resonance products from the live catalog",()=>{
  assert.match(home,/<CollaborationVisual[\s\S]*projectId={project\.id}/);
  assert.match(home,/onOpenProducts={\(target\?:ProductHeroTarget\)=>/);
  assert.match(visual,/from\("products"\)/);
  assert.match(visual,/from\("product_records"\)/);
  assert.match(visual,/id,product_id,name,status,sort_order,payload/);
  assert.match(visual,/recordType:"application"/);
  assert.match(visual,/q:item\.name\|\|undefined/);
  assert.match(visual,/portfolioProductDomain/);
  assert.match(visual,/portfolioProductDescription/);
  assert.match(visual,/\.eq\("record_type","application"\)/);
  assert.match(visual,/MAX_ORBIT_ITEMS=9/);
  assert.match(visual,/GOVERNED PRODUCT/);
  assert.match(visual,/Open Products/);
});

test("product hero animation is responsive and respects reduced motion",()=>{
  assert.match(css,/\.portfolioProductCard/);
  assert.match(css,/\.portfolioProductDomain/);
  assert.match(css,/\.portfolioProductState/);
  assert.match(css,/@keyframes portfolioSweep/);
  assert.match(css,/@container datanest-main \(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*\.portfolioRingOuter/);
});

test("product hero deep-links an application into the governed Products workspace",()=>{
  assert.match(home,/url\.searchParams\.set\("product",target\.product\)/);
  assert.match(home,/url\.searchParams\.set\("recordType",target\.recordType\)/);
  assert.match(home,/url\.searchParams\.set\("q",target\.q\)/);
  assert.match(home,/window\.history\.replaceState/);
  assert.match(home,/onNavigate\("products"\)/);
});
