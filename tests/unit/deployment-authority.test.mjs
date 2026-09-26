import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const readme=read("README.md");
const deployment=read("docs/DEPLOYMENT.md");
const launcher=read("scripts/start-production.ps1");

test("DataNest-managed public delivery is canonical",()=>{
  assert.match(readme,/DataNest-managed/i);
  assert.match(readme,/GitHub Pages.*current public delivery target/i);
  assert.match(readme,/Supabase/i);
  assert.match(readme,/Local development, recovery, and continuity/i);
  assert.doesNotMatch(readme,/## Production\s+\n\s*Node\/Windows:/);
});

test("hosting remains replaceable infrastructure and local runtimes are not production authority",()=>{
  assert.match(deployment,/hosting is replaceable delivery infrastructure, not system authority/i);
  assert.match(deployment,/DataNest-managed/i);
  assert.match(deployment,/GitHub Pages/i);
  assert.match(deployment,/Supabase/i);
  assert.match(deployment,/local development|recovery|controlled test|offline continuity/i);
  assert.match(deployment,/future delivery target.*does not change product ownership or governance/i);
});

test("legacy PowerShell launcher warns that it is recovery-only",()=>{
  assert.match(launcher,/Write-Warning\s+["']Legacy local\/recovery launcher only\. Canonical production is DataNest-managed\.["']/);
});

test("RONSAS is never described as the DataNest control plane",()=>{
  for(const source of [readme,deployment,launcher]){
    assert.doesNotMatch(source,/RONSAS(?:\/DataNest)?[^\n]{0,80}control plane/i);
    assert.doesNotMatch(source,/RONSAS-managed DataNest/i);
  }
});
