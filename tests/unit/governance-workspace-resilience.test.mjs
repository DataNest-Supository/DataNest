import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"src/components/GovernanceWorkspace.tsx"),"utf8");

test("Governance workspace rejects non-object RPC payloads before rendering",()=>{
  assert.match(source,/function normalizeGovernanceWorkspace\(value:unknown\):Workspace\|null/);
  assert.match(source,/typeof value!=="object"\|\|Array\.isArray\(value\)\)return null/);
  assert.match(source,/const next=normalizeGovernanceWorkspace\(data\)/);
});

test("Governance workspace normalizes collection fields before filter and map use",()=>{
  for(const field of ["draft_protocols","proposals","decisions","disputes"]){
    assert.match(source,new RegExp(field+":Array\\.isArray\\(item\\."+field+"\\)\\?item\\."+field+":\\[\\]"));
  }
  assert.match(source,/boundaries:boundaries&&typeof boundaries==="object"&&!Array\.isArray\(boundaries\)/);
});
