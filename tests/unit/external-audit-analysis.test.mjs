import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const analysis=fs.readFileSync("supabase/functions/_shared/externalAuditAnalysis.ts","utf8");
const fetchSource=fs.readFileSync("supabase/functions/_shared/externalAuditFetch.ts","utf8");

test("audit analysis rejects unknown source and criterion identities",()=>{
  assert.match(analysis,/invalid_criterion_id/);
  assert.match(analysis,/invalid_evidence_id/);
});

test("unsupported findings are downgraded to inference",()=>{
  assert.match(analysis,/evidenceIds\.length===0[\s\S]*?"inferred"/);
});

test("source acquisition blocks unsafe URL classes and redirects",()=>{
  assert.match(fetchSource,/https_required/);
  assert.match(fetchSource,/private_or_local_host_rejected/);
  assert.match(fetchSource,/private_dns_resolution_rejected/);
  assert.match(fetchSource,/redirect:"manual"/);
  assert.match(fetchSource,/source_too_large/);
});