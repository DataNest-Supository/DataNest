# DataNest AI Governed File Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add governed PDF/DOCX/TXT/CSV/JSON uploads to DataNest AI so up to 10 files of 25 MB each can be uploaded, processed in the background, cited precisely, analyzed automatically, and staged as UNCERTIFIED evidence without bypassing certification.

**Architecture:** The browser creates a Job-authorized submission through a new `datanest-ai-upload` Edge Function, uploads bytes directly to a private staging bucket with signed TUS, and polls an authenticated status endpoint. Durable `pgmq` work drives server-side validation/hash/dedupe, extraction/OCR/chunking, one consolidated DataNest AI response, and file-derived learning that always requires human certification in v1.

**Tech Stack:** Next.js 15.5, React 19.1, TypeScript 5.9, Supabase Auth/Postgres/Storage/Edge Functions/Queues, `@supabase/supabase-js`, `tus-js-client@4.3.1`, `pdfjs-dist@6.3.289`, `jszip@3.10.2`, `fast-xml-parser@5.11.1`.

**Spec:** `docs/superpowers/specs/2026-09-25-datanest-ai-file-ingestion-design.md`

## Global Constraints

- File types: PDF, DOCX, TXT, CSV, JSON.
- Limits: 25 MiB/file (26,214,400 bytes), 10 files/submission.
- Originals retained indefinitely; canonical blobs dedupe only after server SHA-256 verification.
- Every submission gets fresh logical traces even when bytes are reused.
- File-only submit triggers automatic analysis; chat remains usable while processing runs.
- Native PDF text first; OCR only for deficient pages.
- Project membership alone does not grant ordinary file access; v1 allows owner/admin governance access or an accepted Job collaborator.
- Browser never receives staging service-role credentials or unrestricted staging-table access.
- File-derived candidates cannot auto-certify in v1.
- Existing AUDIT → VERIFY → VALIDATE → STRESS_TEST → CERTIFICATION_REVIEW → CERTIFIED flow remains.
- Do not report OCR ready until an OCR-capable provider route passes acceptance.
- Create migrations with `supabase migration new`; for staging-only SQL, move the CLI-generated migration into `supabase/staging-migrations/` without changing its generated basename.
- TDD: observe RED before implementation for every task.

## Review Focus

- Same SHA across two Jobs must not create cross-Job read access — Task 3.
- DOCX decompression bomb must fail before XML parsing — Task 6.
- Many chunks from one file must count as one independent learning source — Task 9.
- Worker redelivery after durable checkpoint must not duplicate chunks/evidence — Task 7.
- Background response after later chat turns must use frozen submission context and render under its original batch — Task 11.

---

### Task 1: Shared file-domain contract and pinned TUS dependency

**Files:** `package.json`, `package-lock.json`, create `src/lib/datanestAiUpload.ts`, create `supabase/functions/_shared/datanestFileDomain.ts`, create `tests/unit/datanest-ai-file-domain.test.mjs`.

**Interfaces:** `MAX_FILE_BYTES`, `MAX_BATCH_FILES`, `validateFileDescriptor`, `canonicalBlobPath`, `isRetryableFileError`, `reduceSubmissionStatus`, `sha256File`, `startSignedTusUpload`.

- [ ] **Write RED tests** for exact 25 MiB/10-file limits, supported MIME+extension pairs, invalid masquerades, canonical SHA path, retryable vs deterministic errors, and partial-success batch state.

```js
test("limits are exact",()=>{ assert.equal(MAX_BATCH_FILES,10); assert.equal(MAX_FILE_BYTES,25*1024*1024); });
test("canonical path requires sha256",()=>{
  const h="a".repeat(64);
  assert.equal(canonicalBlobPath(h),`sha256/aa/aa/${h}`);
  assert.throws(()=>canonicalBlobPath("client-hash"),/SHA-256/i);
});
```

- [ ] **Run RED:** `node --test --experimental-strip-types tests/unit/datanest-ai-file-domain.test.mjs`.

- [ ] **Install dependency:** `npm install --save-exact tus-js-client@4.3.1`.

- [ ] **Implement domain helpers.**

```ts
export const MAX_FILE_BYTES=25*1024*1024;
export const MAX_BATCH_FILES=10;
export const FILE_BUCKET="datanest-ai-staging-files";

export function canonicalBlobPath(value:string){
  const hash=value.toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(hash))throw new Error("A verified SHA-256 digest is required.");
  return `sha256/${hash.slice(0,2)}/${hash.slice(2,4)}/${hash}`;
}
```

- [ ] **Implement browser SHA + TUS wrapper** with 6 MiB TUS chunks, retry delays `[0,3000,5000,10000,20000]`, `removeFingerprintOnSuccess:true`, and `x-signature` signed token.

- [ ] **Verify:** `npm test && npm run check && npm run build`.

- [ ] **Commit:** `git commit -am "feat: define DataNest AI file upload domain"` after adding new files.

---

### Task 2: Job authorization, staging schema, private bucket, and queues

**Files:** CLI-generated production migration `datanest_ai_file_access_gateway`; CLI-generated staging migration `datanest_ai_file_ingestion` moved to `supabase/staging-migrations/`; create `tests/sql/datanest_ai_file_ingestion_acceptance.sql`; modify `tests/sql/datanest_ai_production_acceptance.sql`.

**Produces:** `public.authorize_datanest_ai_file_access(target_job uuid)`, `ai_file_submissions`, `ai_file_submission_items`, bucket `datanest-ai-staging-files`, queues `datanest_file_ingestion` and `datanest_file_analysis`.

- [ ] **Generate migrations:** run `supabase --version`, then `supabase migration new datanest_ai_file_access_gateway` and `supabase migration new datanest_ai_file_ingestion`; move only the second generated file to `supabase/staging-migrations/`.

- [ ] **Write RED SQL acceptance** checking table existence, RLS enabled, authenticated direct-table privileges denied, private bucket with `file_size_limit=26214400`, both queues present, source types include `file_upload` and `document_evidence`, and authorization behavior.

- [ ] **Implement Job file authorization** as owner/admin OR accepted explicit Job collaborator; operator/viewer project membership alone is denied.

```sql
allowed :=
  exists(select 1 from public.project_members pm
    where pm.project_id=j.project_id and pm.user_id=caller
      and pm.status='active' and pm.role in ('owner','admin'))
  or exists(select 1 from public.job_collaborators jc
    where jc.job_id=j.id and jc.user_id=caller and jc.status='accepted');
```

- [ ] **Create staging tables** with submission trace, project/job/session/user, client request ID, optional instruction, frozen `certified_memory_ids uuid[]`, status/timestamps; file items hold trace, filename, declared/detected MIME, byte size, client SHA hint, verified SHA, storage path, artifact ID, status/attempt/error/extraction metadata.

- [ ] **Alter intake source constraint** to add `file_upload` and `document_evidence`.

- [ ] **Create private bucket + durable queues.**

```sql
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('datanest-ai-staging-files','datanest-ai-staging-files',false,26214400,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain','text/csv','application/csv','application/json','text/json'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
allowed_mime_types=excluded.allowed_mime_types;

create extension if not exists pgmq;
```

Create each queue only when absent.

- [ ] **Enable RLS + revoke direct browser privileges.** Do not expose queues to browser roles.

- [ ] **Verify:** `supabase db advisors`; run both SQL acceptance files and require PASS.

- [ ] **Commit** schema and tests.

---

### Task 3: Authenticated upload gateway

**Files:** create `supabase/functions/datanest-ai-upload/index.ts`; modify `supabase/config.toml`; create `tests/unit/datanest-ai-upload-source.test.mjs`.

**Actions:** `create_submission`, `finalize_item`, `status`, `retry_item`, `source_link`.

- [ ] **Write RED source/integration tests** proving JWT required, explicit Job file-access RPC used, max 10 enforced, signed paths are server-generated `incoming/<submission>/<item>/...`, only IDs are enqueued, source links reauthorize the Job, and service credentials never appear in responses.

- [ ] **Register:** `[functions.datanest-ai-upload]\nverify_jwt = true`.

- [ ] **Implement create_submission:** authenticate; call `authorize_datanest_ai_file_access`; verify requested `ai_sessions` row belongs to user+Job; validate descriptors; insert submission/items; generate short-lived signed upload token for each item.

```ts
const path=`incoming/${submissionId}/${itemId}/${safeName}`;
const {data:signed}=await staging.storage.from(FILE_BUCKET)
  .createSignedUploadUrl(path,{upsert:false});
```

Return direct TUS endpoint `https://qchttpcyqlqnhvahprhz.storage.supabase.co/storage/v1/upload/resumable`.

- [ ] **Implement finalize_item:** verify exact object exists; transition `UPLOADING→QUEUED`; enqueue `{itemId}` to `datanest_file_ingestion`.

- [ ] **Implement status/retry/source_link:** every action reauthorizes the Job; retry only `FAILED` retryable items; source link signs canonical object only.

- [ ] **Add cross-Job test:** same `verified_sha256`, two Jobs, caller authorized only for one; status/source link for the other returns 403.

- [ ] **Verify:** `npm test && npm run check`.

- [ ] **Commit** gateway.

---

### Task 4: Client upload orchestration and pre-submit picker

**Files:** modify `src/lib/datanestAiUpload.ts`; create `src/components/DataNestAiUploadComposer.tsx`; modify unit/source tests.

- [ ] **Write RED tests**: 11 files rejected before network; 25 MiB + 1 rejected; client SHA appears only as hint; each successful TUS completion calls `finalize_item`; one failed sibling does not erase successful siblings.

- [ ] **Implement `submitDataNestFiles`**: hash selected files locally, invoke `create_submission`, match returned item slots by stable local index, TUS upload each item, report percent, call `finalize_item`.

- [ ] **Build picker/drop zone** with `accept=".pdf,.docx,.txt,.csv,.json"`, visible size/type errors, per-file removal, batch count, no automatic submit on selection.

- [ ] **Verify:** `npm test && npm run check && npm run build`.

- [ ] **Commit** client upload path.

---

### Task 5: TXT/CSV/JSON extraction and citation locators

**Files:** create `supabase/functions/_shared/datanestFileExtract.ts`; create `tests/unit/datanest-ai-file-extract.test.mjs`.

- [ ] **Write RED tests** for one-based TXT line ranges, CSV row/header preservation, RFC 6901 JSON pointers, malformed CSV, >1 MiB field rejection, >100 JSON nesting rejection.

```js
assert.deepEqual(txt.chunks[0].locator,{type:"lines",start:1,end:3});
assert.deepEqual(csv.chunks[0].locator,{type:"csv_rows",startRow:2,endRow:3,columns:["name","status"]});
assert.ok(json.chunks.some(c=>c.locator.path==="/providers/openai/model"));
```

- [ ] **Implement bounded parsers:** CSV state machine supports quoted delimiters/newlines; bounds 200,000 rows, 2,000 columns, 1 MiB/field; JSON max depth 100; semantic chunks max 12,000 characters.

- [ ] **Implement `formatSourceLocator`** for lines, CSV rows+columns, JSON pointer, PDF page, DOCX block.

- [ ] **Verify:** extractor tests + `npm test`.

- [ ] **Commit** structured extractors.

---

### Task 6: Safe PDF and DOCX native extraction

**Files:** modify `datanestFileExtract.ts`; create `supabase/functions/datanest-ai-file-worker/deno.json`; add generated test fixtures under `tests/fixtures/datanest-ai-files/`.

- [ ] **Create deterministic fixtures**: 2-page text PDF; DOCX with heading/paragraph/list/table; compressed DOCX whose expanded budget exceeds 100 MiB. No third-party copyrighted fixtures.

- [ ] **Write RED tests:** PDF page numbers exact; low-text page `needsOcr:true`; DOCX uses heading/block locators and no invented pages; >10,000 zip entries or >100 MiB expanded content rejected before XML parsing.

- [ ] **Pin Edge imports** in worker `deno.json`: `pdfjs-dist@6.3.289`, `jszip@3.10.2`, `fast-xml-parser@5.11.1`.

- [ ] **Implement PDF native extraction:** `getTextContent()` page-by-page; `needsOcr = textChars < 40 || printableRatio < 0.6`; do not OCR here.

- [ ] **Implement DOCX preflight:** inspect zip count/expanded bytes and required `word/document.xml`; parse OOXML preserve-order; emit headings, paragraphs, lists, tables with block locators.

- [ ] **Verify:** extractor tests + type check.

- [ ] **Commit** PDF/DOCX extraction.

---

### Task 7: Durable worker, authoritative SHA, dedupe, checkpoints, retries

**Files:** create `supabase/functions/datanest-ai-file-worker/index.ts`; modify config; create `tests/unit/datanest-ai-file-worker.test.mjs`; create/modify `tests/stress/datanest-ai-file-stress.mjs`.

- [ ] **Write RED worker tests:** client SHA mismatch cannot override server SHA; canonical path from server digest; duplicate canonical blob reuses bytes but keeps fresh item trace; READY redelivery is no-op; failure after chunk commit before queue acknowledgement does not duplicate chunks; deterministic errors do not retry; transient errors stop after attempt 3.

- [ ] **Register worker** with `verify_jwt=false`, but require an internal worker-auth value supplied only by service configuration; public requests without it return 401.

- [ ] **Implement SHA + signature validation** over bytes read from the temporary object. Save `verified_sha256` only after server digest completes; canonicalize to `sha256/<2>/<2>/<64>`; remove only temporary duplicate.

- [ ] **Upsert artifacts/chunks idempotently** using stable artifact external ID `file-sha256:<hash>` and chunk identity based on artifact+locator+content hash.

- [ ] **Process only next incomplete checkpoint:** `VALIDATING→EXTRACTING→OCR(if needed)→CHUNKING→READY`.

- [ ] **Queue safety:** read bounded batches with visibility timeout; acknowledge/delete only after durable state. Add best-effort wake-up from finalize plus governed sweeper at least once/minute.

- [ ] **Verify:** worker unit tests + existing stress + file stress.

- [ ] **Commit** worker.

---

### Task 8: OCR fallback adapter

**Files:** create `supabase/functions/_shared/datanestFileOcr.ts`; modify `provider.ts`; modify worker; create `tests/unit/datanest-ai-file-ocr.test.mjs`.

- [ ] **Write RED tests:** no OCR capability → `OCR_REQUIRED_UNAVAILABLE`; endpoint must be HTTPS/same approved host; only `needsOcr` pages requested; result page set must equal request page set; output metadata says OCR.

- [ ] **Extend provider metadata** with explicit `ocr_pdf` capability and approved OCR endpoint; retain existing endpoint validation.

- [ ] **Implement narrow adapter:** send original PDF + requested deficient pages to configured OCR-capable route and require structured page results `{page,text,confidence}`; reject blank/missing/extra pages.

- [ ] **Worker integration:** set status `OCR`; replace/augment only deficient pages; retry transient OCR failures; after budget exhaustion mark file failed with OCR-specific code.

- [ ] **Verify:** OCR tests + full unit/type checks.

- [ ] **Commit** OCR adapter.

---

### Task 9: Batch analysis, citations, propositions, and learning independence

**Files:** create `supabase/functions/_shared/datanestFileAnalysis.ts`; modify worker, `datanestAiTrends.ts`, `datanest-ai-chat/index.ts`; create `tests/unit/datanest-ai-file-analysis.test.mjs`.

- [ ] **Write RED tests:** one response per 10-file submission; partial success → warnings; all files failed → no provider call; citation exact; 20 chunks/one hash = one independent source; same hash re-upload still one; three hashes may count three; certified-memory conflict surfaced; frozen `certified_memory_ids` used rather than newer memory.

- [ ] **Implement bounded relevance selection:** lexical/Jaccard v1, max 40 chunks and 120,000 aggregate characters, preserve relevant per-file coverage.

- [ ] **Stage `file_upload` event per READY file** with artifact/hash/chunk lineage.

- [ ] **Parse bounded provider propositions** and stage `document_evidence` with supporting chunk IDs/hashes.

- [ ] **Extend `LearningEvidence` with `independenceKey`**; file evidence uses `file-sha256:<verified hash>`.

- [ ] **Conflict flags:** polarity mismatch, normalized scalar mismatch, or explicit certified-memory conflict sets `has_conflict=true`.

- [ ] **Stage exactly one DataNest AI response event** with citation metadata and reasoning envelope referencing file/proposition events + frozen memory IDs.

- [ ] **Verify:** analysis tests + runtime/trend tests.

- [ ] **Commit** file analysis.

---

### Task 10: Force human certification for file-derived learning

**Files:** modify `datanestAiPolicy.ts`, `datanest-ai-certification/index.ts`, `tests/unit/datanest-ai-policy.test.mjs`, source tests.

- [ ] **Write RED test:**

```js
assert.equal(canAutoCertify({
  category:"workflow",riskClass:"low",hasConflict:false,
  allGatesPassed:true,evidenceCount:10,confidence:.99,
  containsDocumentEvidence:true
}),false);
```

- [ ] **Implement `containsDocumentEvidence` guard** in `canAutoCertify`.

- [ ] **Certification function loads linked source types** before any auto-certification and passes the flag. Human `canHumanCertify` rules stay unchanged.

- [ ] **Verify:** `npm test && npm run check`.

- [ ] **Commit** certification hardening.

---

### Task 11: Transcript UI, progress, citations, retry, mobile

**Files:** create `src/components/DataNestAiUploadBatch.tsx`; modify chat/workspace components and `globals.css`; modify `tests/browser/datanest-ai.spec.ts`.

- [ ] **Write RED browser tests:** five accepted extensions; 11th rejected; files-only submit works; text+files preserves instruction; composer reusable while background work continues; textual `aria-live` progress; response remains under original batch after later chat turn; citation opens source evidence; partial failure/retry; 390px viewport no horizontal overflow.

- [ ] **Integrate composer** supporting text-only, files-only, and combined modes without putting parsing logic in `DataNestAiChatPanel`.

- [ ] **Poll status through upload gateway** only: 2s initially, 5s after 30s; stop on unmount/Job change/terminal state.

- [ ] **On terminal response**, call `onContextRefresh(sessionId)` so durable output replaces local pending state.

- [ ] **Build batch UI** with trace, UNCERTIFIED badge, per-file status, retryable error action, duplicate-reuse note, citation/source panel.

- [ ] **Accessibility/mobile:** labels, keyboard actions, focus-visible, `aria-live`, status text independent of color, single-column mobile cards.

- [ ] **Verify:** `npm run check && npm run build && npx playwright test tests/browser/datanest-ai.spec.ts --grep "upload"`.

- [ ] **Commit** UI.

---

### Task 12: Governed backend/stress acceptance

**Files:** modify E2E seed; create `tests/stress/datanest-ai-file-stress.mjs`; modify certification workflow and package scripts.

- [ ] **Seed authorization fixtures:** owner/admin, project-only non-admin without Job collaboration, accepted collaborator.

- [ ] **Backend acceptance** covers TXT/CSV/JSON/PDF/DOCX, duplicate re-upload, digest mismatch, partial failure, queue redelivery, continued chat during processing, one final response, no auto-certification.

- [ ] **10 × 25 MiB stress:** generate blobs at runtime, upload through real signed TUS, serialize test, verify ten traces, queue drains, one response, no certified memory.

- [ ] **Crash/redelivery test:** staging-only fault injection after a durable checkpoint, then replay and assert no duplicate chunks/events.

- [ ] **Wire SQL acceptance + file stress** into `.github/workflows/datanest-ai-certification.yml`; add `test:stress:datanest-ai-files` package script.

- [ ] **Verify** existing and new stress suites.

- [ ] **Commit** acceptance.

---

### Task 13: Release wiring and exact-head verification

**Files:** `scripts/write-release-manifest.mjs`, CI, Pages workflow, certification artifact generation, release source tests.

- [ ] **Write RED release tests** for `datanest-ai-upload@1`, `datanest-ai-file-worker@1`, `datanest-ai-file-ingestion-v1`, and `ocrReady:false` default.

- [ ] **Update manifest** with `fileUpload`, `fileWorker`, and `fileIngestion:{release,ocrReady}`.

- [ ] **Update CI/Pages env and live manifest checks.** Never set OCR ready true unless OCR acceptance passed against a configured route.

- [ ] **Run local verification:** `npm ci`, `npm test`, `npm run check`, `npm audit --omit=dev --audit-level=high`, `npm run build`, container build.

- [ ] **Deploy in dependency order:** production authorization migration → staging ingestion migration → upload function → worker → modified AI functions → worker scheduling/config → frontend.

- [ ] **After each DB change:** run Supabase advisors and SQL acceptance.

- [ ] **Before merge:** require exact-head CI, DataNest AI Certification, SQL, browser, existing stress, file stress, dependency audit, and build green.

- [ ] **Invoke code review**, focusing on authorization, service isolation, dedupe boundary, parser/OCR limits, queue idempotency, and certification prohibition.

- [ ] **Finish branch only after review + exact-head green**, then verify post-merge main CI, Pages deployment, live release manifest exact SHA.

- [ ] **Commit** release wiring.

## Self-Review

**Spec coverage:** Tasks 2–3 cover security/storage/lineage; 5–6 extraction/citations; 8 OCR; 7 queue/retries; 9 reasoning/learning/conflicts; 10 certification; 4+11 UI; 12–13 reliability/release.

**Placeholder scan:** No TBD/TODO/FIXME. Migration timestamps are intentionally generated by Supabase CLI, per platform requirements.

**Type consistency:** submission/item IDs, status names, source types, queue names, function names, and `verified_sha256` are used consistently.

**Review Focus:** each of the five high-risk conditions is pinned to a concrete owning-task test.
