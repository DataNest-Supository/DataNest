import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("staging schema supports service-only qualified language review",()=>{
  const migration=read("supabase/staging-migrations/20260929100000_require_qualified_language_review.sql");
  assert.match(migration,/LANGUAGE_REVIEW/);
  assert.match(migration,/create table if not exists public\.ai_language_reviewer_qualifications/);
  assert.match(migration,/revoke all on table public\.ai_language_reviewer_qualifications from public,anon,authenticated/);
  assert.match(migration,/grant select,insert,update on table public\.ai_language_reviewer_qualifications to service_role/);
});

test("certification requires current qualified language review when evidence demands it",()=>{
  const source=read("supabase/functions/datanest-ai-certification/index.ts");
  assert.match(source,/action==="register_language_reviewer"/);
  assert.match(source,/Owner authority is required to register language reviewer qualifications/);
  assert.match(source,/gate==="LANGUAGE_REVIEW"/);
  assert.match(source,/Untagged language-review evidence requires explicit reviewedLanguages/);
  assert.match(source,/Active reviewer qualification is required for every reviewed language/);
  assert.match(source,/meaning_preserved/);
  assert.match(source,/negation_checked/);
  assert.match(source,/quantities_checked/);
  assert.match(source,/uncertainty_checked/);
  assert.match(source,/requires a passing qualified LANGUAGE_REVIEW before certification/);
  assert.match(source,/!languageReviewRequirement\.required\s*&&\s*allAutomatedCertificationGatesPassed/);
});

test("language review runs remain bound to the current candidate validation seal",()=>{
  const source=read("supabase/functions/datanest-ai-certification/index.ts");
  assert.match(source,/results:\{\s*\.\.\.current\.seal,/);
  assert.match(source,/validationRunMatchesSeal\(run\.results,seal\)/);
});
