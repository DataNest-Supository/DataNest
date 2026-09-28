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
  assert.match(binding,/DATANEST_PUBLIC_URL = "https:\/\/datanest-supository\.github\.io\/DataNest\/"/);
  assert.equal(contract.contract,"reson8-app@1");
  assert.equal(contract.key,"datanest");
  assert.equal(contract.publicUrl,"https://datanest-supository.github.io/DataNest/");
  assert.equal(contract.hubUrl,"https://reson8.life/");
  assert.equal(contract.sourceRepository,"DataNest-Supository/DataNest");
  assert.equal(contract.status,"live");
  assert.equal(contract.operationalUrl,"https://datanest-supository.github.io/DataNest/");
  assert.equal(contract.hubRegistration?.state,"pending");
  assert.equal(contract.hubRegistration?.issue,"https://github.com/resonance36912-cell/resonance-hub/issues/136");
  assert.equal(contract.hubRegistration?.statusEndpoint,"https://reson8.life/api/public/app-status/health");
  assert.equal(contract.readiness?.contract,"ronsas-status@1");
  assert.equal(contract.readiness?.authenticated,true);
  assert.equal(contract.backupHost?.provider,"Dropbox");
  assert.equal(contract.backupHost?.path,"/DataNest-AI-Backups");
  assert.equal(contract.backupHost?.role,"artifact-recovery");
  assert.equal(contract.backupHost?.status,"active");
  assert.equal(contract.backupHost?.servesApplication,false);
  assert.equal(contract.backupHost?.localPcBackupHosting,false);
  assert.equal(contract.delivery?.provider,"GitHub Pages");
  assert.equal(contract.delivery?.status,"live");
  assert.equal(contract.delivery?.url,"https://datanest-supository.github.io/DataNest/");
  assert.equal(contract.delivery?.railwayRequired,false);
  assert.equal(contract.billing,"none");
});

test("DataNest keeps a visible return path to the Reson8 Hub even when status probing fails",()=>{
  assert.match(auth,/RESON8_HUB_URL/);
  assert.match(auth,/Reson8 Hub/);
  assert.match(shell,/useState\(RESON8_HUB_URL\)/);
  assert.match(shell,/setRonsasHubUrl\(RESON8_HUB_URL\)/);
});

test("DataNest runtime config is served from its own delivery surface",()=>{
  assert.match(layout,/const runtimeConfigSource=basePath \+ "\/runtime-config\.js"/);
  assert.doesNotMatch(layout,/DATANEST_RUNTIME_CONFIG_URL/);
  assert.doesNotMatch(layout,/reson8\.life/);
});
