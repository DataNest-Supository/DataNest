import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nextConfig=readFileSync(new URL("../../next.config.ts",import.meta.url),"utf8");
const layout=readFileSync(new URL("../../src/app/layout.tsx",import.meta.url),"utf8");
const bundle=readFileSync(new URL("../../scripts/build-ronsas-pages.mjs",import.meta.url),"utf8");
const verifier=readFileSync(new URL("../../scripts/verify-reson8-domain-build.mjs",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../.github/workflows/reson8-domain-readiness.yml",import.meta.url),"utf8");
const ronsasStatus=readFileSync(new URL("../../supabase/functions/ronsas-status/index.ts",import.meta.url),"utf8");
const runbook=readFileSync(new URL("../../docs/RESON8_DOMAIN_CUTOVER.md",import.meta.url),"utf8");

test("reson8.life root build has no DataNest project-path dependency",()=>{
  assert.match(nextConfig,/DATANEST_PUBLIC_ORIGIN/);
  assert.match(nextConfig,/publicOrigin === "https:\/\/reson8\.life"/);
  assert.match(nextConfig,/rootDomainExport/);
  assert.match(workflow,/DATANEST_PUBLIC_ORIGIN: "https:\/\/reson8\.life"/);
  assert.match(workflow,/NEXT_PUBLIC_BASE_PATH: ""/);
  assert.match(workflow,/DATANEST_APP_PATH: \/$/m);
  assert.match(verifier,/doesNotMatch\(home,\/\\\/DataNest\\\/\//);
});

test("reson8.life publishes DataNest and RONSAS under one origin",()=>{
  assert.match(layout,/metadataBase: new URL\(configuredPublicOrigin\)/);
  assert.match(bundle,/const hubPath=\`\$\{configuredBase\}\/apps\/\`/);
  assert.match(bundle,/path\.join\(appsOut,"index\.html"\)/);
  assert.match(bundle,/deliveryTarget/);
  assert.match(ronsasStatus,/const HUB_ORIGIN = "https:\/\/reson8\.life\/apps\/"/);
  assert.match(runbook,/https:\/\/reson8\.life\/\s+DataNest parent platform/);
  assert.match(runbook,/https:\/\/reson8\.life\/apps\/\s+RONSAS application hub surface/);
});

test("domain cutover retains governed backend and rollback boundaries",()=>{
  assert.match(workflow,/NEXT_PUBLIC_SUPABASE_URL: "https:\/\/sgqdmfgjbprsoqsmgigi\.supabase\.co"/);
  assert.match(runbook,/Supabase Auth cutover/);
  assert.match(runbook,/Site URL: `https:\/\/reson8\.life`/);
  assert.match(runbook,/Rollback/);
  assert.match(runbook,/GitHub Pages project-path deployment remains a fallback/);
});
