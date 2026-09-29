import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readText=path=>existsSync(new URL(path,import.meta.url))?readFileSync(new URL(path,import.meta.url),"utf8"):"";
const ecosystemAuthority=readText("../../src/lib/ecosystemAuthority.ts");
const registrySource=readText("../../src/lib/datanestNomenclature.ts");
const publicRegistryPath=new URL("../../public/transparency/business-os/nomenclature.json",import.meta.url);
const publicRegistry=existsSync(publicRegistryPath)?JSON.parse(readFileSync(publicRegistryPath,"utf8")):{entries:[]};

test("Business OS identity is canonical",()=>{
  assert.match(ecosystemAuthority,/Resonance DataNest is the governed Business, Intelligence, Collaboration, and Expansion Operating System for the Resonance ecosystem\./);
});

test("public nomenclature preserves canonical concepts and implementation states",()=>{
  assert.deepEqual(
    publicRegistry.entries.map(entry=>entry.key),
    ["ilm","all","csl","gal","galux","ratb","rsgp","project_director","conversation_specialist","growth_spark","barterer_tender","n0nymous_squad","ibank","sparks"]
  );
  const byKey=new Map(publicRegistry.entries.map(entry=>[entry.key,entry]));
  assert.equal(byKey.get("sparks")?.implementation_state,"implemented");
  assert.equal(byKey.get("ibank")?.implementation_state,"target");
  assert.equal(byKey.get("barterer_tender")?.implementation_state,"target");
  assert.equal(byKey.get("all")?.implementation_state,"target");
  assert.equal(byKey.get("csl")?.implementation_state,"target");
  assert.match(byKey.get("sparks")?.definition??"",/internal utility/i);
  assert.match(byKey.get("ibank")?.definition??"",/target/i);
});

test("public registry does not invent concepts outside the TypeScript source",()=>{
  for(const entry of publicRegistry.entries){
    assert.match(registrySource,new RegExp(`key:\\s*["']${entry.key}["']`));
    assert.ok(registrySource.includes(entry.name),`missing name ${entry.name}`);
    if(entry.acronym)assert.ok(registrySource.includes(entry.acronym),`missing acronym ${entry.acronym}`);
  }
});
