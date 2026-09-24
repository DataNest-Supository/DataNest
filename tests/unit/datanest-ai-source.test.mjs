import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

test("navigation exposes DataNest AI and not the R&D Dashboard", () => {
  const source=fs.readFileSync(path.join(root,"src/components/DataNestApp.tsx"),"utf8");
  assert.match(source,/label:"DataNest AI"/);
  assert.doesNotMatch(source,/label:"R&D Dashboard"/);
});

test("DataNest AI workspace exposes chat, current job, certified memory and certification", () => {
  const source=fs.readFileSync(path.join(root,"src/components/DataNestAiWorkspace.tsx"),"utf8");
  assert.match(source,/DataNest AI/);
  assert.match(source,/Current Job Context/);
  assert.match(source,/Certified Memory/);
  assert.match(source,/Learning & Certification/);
});

test("old UNIFI Copilot identity is absent from runtime UI source", () => {
  const files=[
    "src/components/DataNestApp.tsx",
    "src/components/DataNestAiWorkspace.tsx",
    "src/components/DataNestAiChatPanel.tsx"
  ];
  for(const file of files){
    const source=fs.readFileSync(path.join(root,file),"utf8");
    assert.doesNotMatch(source,/UNIFI Copilot/);
  }
});
