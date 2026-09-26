import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const home=fs.readFileSync(path.join(root,"src/components/ResonanceHome.tsx"),"utf8");
const visual=fs.readFileSync(path.join(root,"src/components/CollaborationVisual.tsx"),"utf8");
const css=fs.readFileSync(path.join(root,"src/components/CollaborationVisual.module.css"),"utf8");

test("AI & I hero keeps DataNest AI at the core and renders governed products as product nodes",()=>{
  assert.match(home,/CollaborationVisual projectId={project\.id}/);
  assert.match(home,/onOpenProducts={\(\)=>onNavigate\("products"\)}/);
  assert.match(visual,/from\("products"\)/);
  assert.match(visual,/from\("product_records"\)/);
  assert.match(visual,/\.eq\("record_type","application"\)/);
  assert.match(visual,/MAX_ORBIT_PRODUCTS=9/);
  assert.match(visual,/const orbitProducts=useMemo/);
  assert.match(visual,/applicationCounts/);
  assert.match(visual,/DATANEST CORE/);
  assert.match(visual,/DataNest AI/);
  assert.match(visual,/Shared intelligence/);
  assert.match(visual,/Open Products/);
  assert.doesNotMatch(visual,/primary\?\.name/);
  assert.doesNotMatch(visual,/GOVERNED PRODUCT/);
});

test("product hero animation is responsive and respects reduced motion",()=>{
  assert.match(css,/\.portfolioProductCard/);
  assert.match(css,/@keyframes portfolioSweep/);
  assert.match(css,/@container datanest-main \(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*\.portfolioRingOuter/);
});

test("value network has one subordinate styling authority",()=>{
  const valueNetworkBlocks=[...css.matchAll(/\.valueNetwork\{([^}]*)\}/g)].map(match=>match[1]);
  const authorityBlocks=valueNetworkBlocks.filter(block=>/position:absolute/.test(block));
  assert.equal(authorityBlocks.length,1);
  assert.match(authorityBlocks[0],/z-index:2/);
});
