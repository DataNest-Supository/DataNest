import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge=readFileSync(
  new URL("../../supabase/functions/ronsas-status/index.ts",import.meta.url),
  "utf8"
);
const client=readFileSync(
  new URL("../../src/lib/ronsas.ts",import.meta.url),
  "utf8"
);
const panel=readFileSync(
  new URL("../../src/components/RonsasIntegrationPanel.tsx",import.meta.url),
  "utf8"
);
const app=readFileSync(
  new URL("../../src/components/DataNestApp.tsx",import.meta.url),
  "utf8"
);
const config=readFileSync(
  new URL("../../supabase/config.toml",import.meta.url),
  "utf8"
);
const manifest=readFileSync(
  new URL("../../scripts/write-release-manifest.mjs",import.meta.url),
  "utf8"
);

test("RONSAS integration is cloud-only and non-blocking",()=>{
  assert.match(edge,/const HUB_ORIGIN = "https:\/\/reson8\.life\/"/);
  assert.match(edge,/localInteractionRequired: false/);
  assert.match(edge,/independent: true/);
  assert.match(edge,/Local RONSAS origins are not permitted/);
  assert.match(edge,/controlRepository: "resonance36912-cell\/RONSAS"/);
  assert.match(edge,/hubRepository: "resonance36912-cell\/resonance-hub"/);
  assert.doesNotMatch(edge,/http:\/\/127\.0\.0\.1|http:\/\/localhost/);
});

test("DataNest exposes the versioned RONSAS contract through JWT-protected Supabase",()=>{
  assert.match(config,/\[functions\.ronsas-status\][\s\S]*verify_jwt = true/);
  assert.match(edge,/npm:@supabase\/server@1\.8\.0/);
  assert.match(edge,/withSupabase\(\{ auth: "user" \}/);
  assert.match(client,/functions\.invoke\("ronsas-status"/);
  assert.match(client,/status\.contract !== "ronsas-status@1"/);
  assert.match(panel,/Local interaction<\/dt><dd>Not required/);
  assert.match(panel,/DataNest dependency<\/dt><dd>Independent · non-blocking/);
  assert.match(app,/RonsasIntegrationPanel/);
  assert.match(manifest,/ronsasStatus:process\.env\.DATANEST_EDGE_RONSAS_STATUS \|\| "ronsas-status@1"/);
});
