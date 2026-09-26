import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.tsx"),"utf8");
const css=fs.readFileSync(path.join(root,"src/components/ProductsWorkspace.module.css"),"utf8");

test("Products workspace opts into narrow-screen overflow containment",()=>{
  assert.match(source,/ProductsWorkspace\.module\.css/);
  assert.match(source,/styles\.workspace/);
  assert.match(css,/min-width:0/);
  assert.match(css,/legalTaskHeader > span/);
  assert.match(css,/white-space:normal/);
  assert.match(css,/legalChatTurnHead span/);
  assert.match(css,/overflow-wrap:anywhere/);
});
