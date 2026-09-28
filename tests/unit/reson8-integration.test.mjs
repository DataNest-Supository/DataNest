import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const binding=readFileSync(new URL("../../src/lib/reson8.ts",import.meta.url),"utf8");
const layout=readFileSync(new URL("../../src/app/layout.tsx",import.meta.url),"utf8");
const auth=readFileSync(new URL("../../src/components/AuthGate.tsx",import.meta.url),"utf8");
const shell=readFileSync(new URL("../../src/components/DataNestApp.tsx",import.meta.url),"utf8");
const contract=JSON.parse(readFileSync(new URL("../../public/.well-known/reson8-app.json",import.meta.url),"utf8"));

test("DataNest declares its canonical Reson8 ecosystem binding",()=>{
  assert.match(binding,/RESON8_HUB_URL = "https:\/\/reson8\.life\/"/);
  assert.match(binding,/DATANEST_RESON8_URL = "https:\/\/datanest\.reson8\.life\/"/);
  assert.equal(contract.contract,"reson8-app@1");
  assert.equal(contract.key,"datanest");
  assert.equal(contract.publicUrl,"https://datanest.reson8.life/");
  assert.equal(contract.hubUrl,"https://reson8.life/");
  assert.equal(contract.sourceRepository,"DataNest-Supository/DataNest");
  assert.equal(contract.status,"provisioning");
  assert.equal(contract.fallbackUrl,"https://datanest-supository.github.io/DataNest/");
  assert.equal(contract.ingress?.state,"dns-pending");
  assert.equal(contract.ingress?.dns?.type,"CNAME");
  assert.equal(contract.ingress?.dns?.target,"r3sevmpy.up.railway.app");
  assert.equal(contract.billing,"none");
});

test("DataNest keeps a visible return path to the Reson8 Hub even when status probing fails",()=>{
  assert.match(auth,/RESON8_HUB_URL/);
  assert.match(auth,/Reson8 Hub/);
  assert.match(shell,/useState\(RESON8_HUB_URL\)/);
  assert.match(shell,/setRonsasHubUrl\(RESON8_HUB_URL\)/);
});

test("standalone Reson8 ingress may consume only a trusted public runtime-config source",()=>{
  assert.match(layout,/DATANEST_RUNTIME_CONFIG_URL/);
  assert.match(layout,/host==="datanest-supository\.github\.io"/);
  assert.match(layout,/host==="reson8\.life"/);
  assert.match(layout,/host\.endsWith\("\.reson8\.life"\)/);
  assert.match(layout,/url\.protocol==="https:"/);
});
