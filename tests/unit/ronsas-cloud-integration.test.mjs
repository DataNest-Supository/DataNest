import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge=readFileSync(new URL("../../supabase/functions/ronsas-status/index.ts",import.meta.url),"utf8");
const client=readFileSync(new URL("../../src/lib/ronsas.ts",import.meta.url),"utf8");
const panel=readFileSync(new URL("../../src/components/RonsasIntegrationPanel.tsx",import.meta.url),"utf8");
const products=readFileSync(new URL("../../src/components/ProductsWorkspace.tsx",import.meta.url),"utf8");
const app=readFileSync(new URL("../../src/components/DataNestApp.tsx",import.meta.url),"utf8");
const config=readFileSync(new URL("../../supabase/config.toml",import.meta.url),"utf8");
const manifest=readFileSync(new URL("../../scripts/write-release-manifest.mjs",import.meta.url),"utf8");

test("RONSAS status is cloud-backed while runtime authority is DataNest local-first",()=>{
  assert.match(edge,/const HUB_ORIGIN = "https:\/\/reson8\.life\/apps\/"/);
  assert.match(edge,/mode: "cloud"/);
  assert.match(edge,/runtimeMode: "local-first"/);
  assert.match(edge,/managedByDataNest: true/);
  assert.match(edge,/billingState: "free-promotion"/);
  assert.match(edge,/independent: false/);
  assert.match(edge,/localInteractionRequired: false/);
  assert.match(edge,/controlRepository: "DataNest-Supository\/DataNest"/);
  assert.match(edge,/hubRepository: "DataNest-Supository\/DataNest"/);
  assert.doesNotMatch(edge,/resonance36912-cell\/RONSAS|resonance36912-cell\/resonance-hub/);
  assert.doesNotMatch(edge,/http:\/\/127\.0\.0\.1|http:\/\/localhost/);
});

test("DataNest exposes the governed RONSAS status contract through JWT-protected Supabase",()=>{
  assert.match(config,/\[functions\.ronsas-status\][\s\S]*verify_jwt = true/);
  assert.match(edge,/npm:@supabase\/server@1\.8\.0/);
  assert.match(edge,/withSupabase\(\{ auth: "user" \}/);
  assert.match(client,/functions\.invoke\("ronsas-status"/);
  assert.match(client,/status\.contract !== "ronsas-status@1"/);
  assert.match(client,/status\.runtimeMode !== "local-first"/);
  assert.match(client,/status\.managedByDataNest !== true/);
  assert.match(client,/status\.independent !== false/);
  assert.match(panel,/Runtime model<\/dt><dd>\{status\?\.runtimeMode \|\| "local-first"\}/);
  assert.match(panel,/DataNest authority<\/dt><dd>/);
  assert.match(panel,/DataNest-Supository\/DataNest/);
  assert.match(panel,/status\?\.authority\.publicHub/);
  assert.match(panel,/Open RONSAS ↗/);
  assert.match(products,/getRonsasStatus/);
  assert.match(products,/status\.authority\.publicHub/);
  assert.match(products,/aria-label="Open RONSAS"/);
  assert.match(products,/aria-label="Open RONSAS Hub"/);
  assert.match(app,/getRonsasStatus/);
  assert.match(app,/status\.authority\.publicHub/);
  assert.match(app,/aria-label="Open RONSAS from DataNest navigation"/);
  assert.match(app,/label:"RONSAS"/);
  assert.match(app,/description:"Open governed RONSAS application hub\."/);
  assert.match(app,/window\.open\(item\.href,"_blank","noopener,noreferrer"\)/);
  assert.match(app,/aria-label=\{item\.kind==="external"\?"Open RONSAS application hub":undefined\}/);
  assert.match(app,/RonsasIntegrationPanel/);
  assert.match(manifest,/ronsasStatus:process\.env\.DATANEST_EDGE_RONSAS_STATUS \|\| "ronsas-status@1"/);
});
