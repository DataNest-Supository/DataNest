# DataNest AI Governed File Ingestion Design

**Date:** 2026-09-25  
**Status:** Approved design, pending implementation-plan review  
**Repository:** `DataNest-Supository/DataNest`  
**Target:** DataNest AI Staging (`qchttpcyqlqnhvahprhz`) with production promotion only through the existing certification path

## 1. Purpose

DataNest AI must accept uploaded source material as governed development input, analyze it automatically, cite the source precisely, and make useful learning candidates available without allowing raw files, duplicate content, parser output, OCR output, or a single document to become trusted project-wide memory automatically.

The upload experience belongs inside the existing DataNest AI Job/session workspace. It extends the current:

`Chat → Trace → Learn → Validate → Certify → Remember`

flow to:

`Upload → Validate → Extract → Cite → Analyze → Respond → Learn → Validate → Certify → Remember`

The design preserves the current separation between UNCERTIFIED session evidence and production `certified_memory`.

## 2. Approved product constraints

The first release has these fixed constraints:

- Supported file types: PDF, DOCX, TXT, CSV, JSON.
- Maximum file size: 25 MB per file.
- Maximum batch size: 10 files per submission.
- Maximum theoretical batch payload: 250 MB.
- Original source files are retained indefinitely in governed staging storage; there is no automatic expiry.
- A file-only submission automatically triggers DataNest AI analysis and a response. A typed message is optional and, when present, acts as the analysis instruction for that batch.
- Processing runs in the background. The rest of DataNest remains usable while files are processed.
- PDF processing uses native text extraction first and OCR only when a page or document has insufficient usable text.
- Physical file storage is deduplicated by a server-verified SHA-256 digest.
- Every submission still creates new logical lineage and trace records even when the same physical blob is reused.
- Before certification, uploaded files and extracted content are available only through explicit Job authorization. Project membership alone must not grant file access.
- DataNest AI responses cite source material precisely: PDF page, DOCX heading/section/paragraph and rendered page where reliable, TXT line range, CSV row/range and column detail, or JSON Pointer path.
- File-derived candidates are never auto-certified in v1. They may reach certification review, but an admin or owner must make the certification decision.

## 3. Existing architecture to preserve

The existing DataNest AI chat flow already provides important governance boundaries that this feature must reuse:

- `datanest-ai-chat` authenticates the caller and resolves a selected Job.
- `ai_sessions` binds staging work to a project, Job, user, and session.
- `ai_intake_events` stores traceable UNCERTIFIED evidence.
- `ai_reasoning_envelopes` records the input/event and certified-memory lineage behind a DataNest AI output without storing private model chain-of-thought.
- `ai_trend_clusters`, `ai_learning_candidates`, and candidate evidence tables stage learning.
- `datanest-ai-certification` enforces ordered AUDIT, VERIFY, VALIDATE, and STRESS_TEST gates.
- Only certified candidates can be promoted into production `certified_memory`.
- Production memory already preserves source Job IDs and trace IDs.

The live DataNest AI Staging database also contains currently unused ingestion primitives:

- `datanest_sources`
- `datanest_ingestion_runs`
- `datanest_artifacts`
- `datanest_chunks`
- `datanest_patterns`
- `datanest_pattern_evidence`

This design reuses those ingestion concepts instead of creating a second content repository, while adding Job/session-specific binding tables so generic physical artifacts never become an authorization boundary.

## 4. Architecture

### 4.1 Components

The feature consists of six isolated units:

1. **Upload UI**
   - Lives in `DataNestAiChatPanel`.
   - Selects or drag-drops files.
   - Computes a client SHA-256 only as a transfer optimization.
   - Shows batch validation and processing state.
   - Uses signed resumable uploads.
   - Never receives service-role credentials or direct unrestricted staging-table access.

2. **Governed upload gateway**
   - New Supabase Edge Function: `datanest-ai-upload`.
   - Authenticates the current user.
   - Verifies explicit Job authorization.
   - Validates session ownership/association.
   - Creates submission/item records.
   - Issues a signed, path-scoped resumable upload capability for a unique temporary object.
   - Finalizes uploads and enqueues durable work.
   - Returns sanitized Job-scoped status and signed read links.

3. **Private staging Storage**
   - New non-public bucket, e.g. `datanest-ai-staging-files`.
   - 25 MB per-object bucket limit.
   - Allow-list for supported MIME families/extensions.
   - No broad authenticated-user list/read access.
   - Temporary object paths are unique per submission item.
   - Verified objects are canonicalized to a content-addressed path after server-side SHA-256 verification.

4. **Durable background ingestion**
   - Enable Supabase Queues / `pgmq` in DataNest AI Staging.
   - Queue file-processing messages by IDs only; never place source bytes in queue payloads.
   - New worker Edge Function: `datanest-ai-file-worker`.
   - The queue is the source of truth for work durability.
   - An immediate worker invocation may be used as a low-latency wake-up, while a scheduled sweeper runs at least once per minute and also consumes outstanding messages so work is not lost if the wake-up fails.

5. **Extraction and citation pipeline**
   - New shared extraction modules under `supabase/functions/_shared`.
   - Produces normalized artifacts and chunks with stable locators.
   - Uses native extraction before OCR.
   - Preserves source format, parser version, extraction method, warnings, and source locators.
   - Generates file-derived propositions for learning only after validated extraction.

6. **Batch analysis coordinator**
   - New analysis work item after every file in a submission reaches a terminal state.
   - Retrieves relevant chunks, current Job/session evidence, and certified memory.
   - Generates one consolidated DataNest AI response per submission.
   - Stages that response and its reasoning envelope as UNCERTIFIED.
   - Runs conservative trend/candidate analysis on eligible file-derived propositions.

### 4.2 Why Storage + Queue

Files up to 25 MB should not be proxied through the current AI chat request. The browser uploads directly to Supabase Storage using a short-lived signed resumable upload capability. This preserves progress and retry behavior for files above the small-upload range while keeping AI request lifetimes independent from transfer time.

Long-running extraction and OCR must not depend on a browser tab staying open. A durable queue ensures work can be retried after a worker crash or transient service failure. Queue acknowledgement occurs only after the resulting durable state has been stored.

## 5. Storage, deduplication, and lineage

### 5.1 Temporary upload path

A browser never uploads directly to a final content-addressed object name. The upload gateway creates a unique temporary path such as:

`incoming/<submission-id>/<item-id>/<sanitized-filename>`

This prevents the untrusted client-computed digest from controlling the canonical storage identity.

### 5.2 Server verification

After upload completion the worker:

1. downloads or streams the temporary object using service credentials;
2. verifies the actual byte size;
3. validates the real file signature/container shape against the declared type;
4. recomputes SHA-256 from the stored bytes;
5. rejects malformed, unsupported, encrypted/password-protected, or unsafe input that cannot be parsed safely in v1;
6. canonicalizes valid content to a path such as:
   `sha256/<first-2>/<next-2>/<full-sha256>`.

If the canonical object already exists, the new temporary copy is removed after verification and the new logical submission binds to the existing canonical blob.

### 5.3 Logical lineage is never deduplicated away

Physical blob reuse does not erase the fact that a user submitted the source again. Every upload action retains:

- submission ID;
- submission trace ID;
- file-item trace ID;
- project ID;
- Job ID;
- DataNest AI session ID;
- uploader user ID;
- original filename;
- verified SHA-256;
- MIME/type;
- byte length;
- timestamp;
- optional typed instruction;
- processing status;
- final artifact ID;
- extraction/version metadata.

A duplicate can therefore display:

> Existing verified source reused · new submission trace created.

### 5.4 New staging records

Add narrow Job-scoped tables rather than overloading generic artifact records:

#### `ai_file_submissions`

One row per user batch.

Required fields:

- `id uuid primary key`
- `trace_id text unique not null`
- `project_id uuid not null`
- `job_id uuid not null`
- `session_id uuid not null references ai_sessions(id)`
- `user_id uuid not null`
- `client_request_id uuid not null`
- `instruction text null`
- `status text not null`
- `file_count integer not null`
- `response_event_id uuid null references ai_intake_events(id)`
- `created_at`, `updated_at`, `completed_at`

The status domain is:

`UPLOADING | QUEUED | PROCESSING | ANALYZING | RESPONDED | RESPONDED_WITH_WARNINGS | FAILED`

#### `ai_file_submission_items`

One row per file in a submission.

Required fields:

- `id uuid primary key`
- `submission_id uuid not null references ai_file_submissions(id)`
- `trace_id text unique not null`
- `original_name text not null`
- `declared_mime text null`
- `detected_mime text null`
- `byte_size bigint not null`
- `client_sha256 text null`
- `verified_sha256 text null`
- `storage_object_path text null`
- `artifact_id uuid null references datanest_artifacts(id)`
- `status text not null`
- `attempt_count integer not null default 0`
- `last_error_code text null`
- `last_error_message text null`
- `extraction_method text null`
- `extraction_version text null`
- `created_at`, `updated_at`, `completed_at`

The processing status domain is:

`UPLOADING | QUEUED | VALIDATING | EXTRACTING | OCR | CHUNKING | READY | FAILED`

A unique logical idempotency key prevents the same client request from creating duplicate submission rows when the browser retries.

### 5.5 Generic ingestion records

The existing `datanest_sources`, `datanest_ingestion_runs`, `datanest_artifacts`, and `datanest_chunks` remain the normalized content layer.

The Job/session authorization boundary is the `ai_file_submission_items → submission` binding, not the generic artifact itself. Browser code never queries generic artifacts or chunks directly. All reads pass through an authenticated gateway that verifies the requesting user has explicit access to the bound Job.

This permits safe physical deduplication across repeated submissions while preventing possession of a hash or artifact ID from becoming an access grant.

## 6. Authorization and security

### 6.1 Job-scoped authorization

File upload/read access uses an explicit Job-access predicate. **Project membership alone is insufficient.**

The gateway must confirm that the caller is authorized for the selected Job under the application's Job ACL/collaboration model. The exact predicate must be implemented once in a reusable database function and used consistently for:

- upload-slot creation;
- upload finalization;
- status reads;
- source preview;
- signed download/read links;
- retry requests.

Administrative service-role access remains server-side only.

### 6.2 Staging table exposure

The new file submission tables follow the existing DataNest AI staging rule:

- RLS enabled;
- direct `anon` and `authenticated` table privileges revoked unless a deliberately scoped read path is introduced;
- browser access through authenticated Edge Functions/RPC gateways;
- service-role credentials never exposed to client code.

### 6.3 Parser safety

The worker must enforce:

- 25 MB compressed/source file limit after upload as well as before upload;
- safe container inspection for DOCX;
- uncompressed-size and entry-count limits for ZIP-based DOCX parsing to resist decompression bombs;
- bounded row/object counts and bounded individual field sizes for CSV/JSON parsing;
- timeout/budget limits for parser and OCR steps;
- no execution of macros, embedded scripts, external links, or document code;
- no server-side filesystem commands from SQL;
- explicit rejection of password-protected/encrypted files in v1;
- filename sanitization for display and storage metadata.

Extraction content is untrusted evidence. It is never treated as instructions to the worker or database.

## 7. Extraction behavior by format

### 7.1 PDF

- Extract native text page-by-page.
- Preserve page number and page-local order.
- Record a text-quality signal per page.
- Only pages with insufficient usable native text are sent to OCR.
- OCR-derived text is marked `extraction_method=ocr` with engine/adapter version and confidence when available.
- Mixed PDFs may therefore contain both native and OCR chunks.
- Never invent page numbers; PDF page locators use the actual source page index.

### 7.2 DOCX

Extract, in document order:

- headings;
- paragraphs;
- lists;
- tables and cells.

DOCX pagination is renderer-dependent. Citations use heading/section/paragraph/table locators by default. A page number may be added only when a deterministic rendering step provides a reliable page mapping. Page numbers are never guessed.

### 7.3 TXT

- Decode using a safe text encoding strategy.
- Preserve line numbers.
- Chunk on paragraph/section boundaries where possible.
- Citation locator: line range.

### 7.4 CSV

- Parse structurally.
- Preserve header names.
- Preserve source row numbers.
- Keep row and column identity through chunking.
- Citation locator: row/range and relevant column names.

### 7.5 JSON

- Parse structurally.
- Reject invalid JSON.
- Preserve object/array hierarchy.
- Use RFC 6901 JSON Pointer-style paths such as `/providers/openai/model`.
- Large arrays/objects are chunked without losing their parent path.

## 8. Chunking and citation model

Chunks are semantic/source-aware rather than fixed-character slices.

Each `datanest_chunks.metadata` record for uploaded content must contain enough provenance to reconstruct a citation, including:

- submission ID and trace;
- file-item ID and trace;
- artifact ID;
- verified SHA-256;
- original filename;
- source format;
- extraction method;
- extraction/parser version;
- locator type;
- locator start/end or JSON Pointer path;
- OCR/native flag;
- extraction warning flags.

Human-readable citations are rendered from structured locators, for example:

- `Technical Report.pdf · p. 14`
- `requirements.docx · Authentication → paragraph 6`
- `results.csv · rows 42–51 · Result, Status`
- `config.json · /providers/openai/model`

The verifiable lineage is:

`AI statement → cited chunk → artifact → submission item → submission trace → verified SHA-256 → canonical stored object`

## 9. OCR adapter

OCR is a fallback capability behind a narrow adapter interface. Native extraction always runs first.

The v1 OCR adapter uses the existing DataNest provider-routing layer and requires a provider connection explicitly marked as OCR/vision-capable; v1 does not introduce a separate OCR SaaS dependency. A release must not claim scanned-PDF support unless an OCR-capable route is configured and passes acceptance tests.

The v1 OCR adapter must:

- accept only pages already identified as requiring OCR;
- return extracted text, confidence when available, and adapter/version metadata;
- fail closed with a visible `OCR_REQUIRED_UNAVAILABLE` or `OCR_FAILED` status when no configured OCR-capable route can complete the page;
- never silently label OCR output as native extraction;
- never turn an OCR failure into a successful fully-extracted document.

An OCR failure on one file does not prevent the remainder of a multi-file batch from being analyzed.

## 10. Durable background processing

### 10.1 Queues

Enable `pgmq` and use durable queues, for example:

- `datanest_file_ingestion`
- `datanest_file_analysis`

Queue messages contain identifiers and trace references only.

### 10.2 File processing message

A file-processing message references a submission item. The worker performs the next incomplete checkpoint only. Durable state is saved before the message is acknowledged.

The worker checkpoints are:

`VALIDATING → EXTRACTING → OCR (if required) → CHUNKING → READY`

If a worker crashes after a checkpoint, a later delivery resumes from the last completed durable stage rather than starting over.

### 10.3 Retry policy

Automatic retries are step-aware.

Do not automatically retry:

- unsupported type;
- file too large;
- malformed content that deterministically fails validation;
- encrypted/password-protected file;
- security validation rejection.

Automatically retry transient failures:

- Storage/network read;
- temporary parser infrastructure errors;
- OCR provider/adapter transient failure;
- AI provider transient failure.

Default automatic limit: **3 processing attempts** per retryable stage.

After exhaustion, mark the stage/file `FAILED` and expose a manual retry where retrying could reasonably succeed.

Retries are idempotent and reuse the existing blob, verified digest, submission trace, artifact identity, and completed checkpoints.

### 10.4 Batch completion

A submission is ready for analysis when every file item is either `READY` or `FAILED`.

- If at least one file is `READY`, enqueue one analysis job.
- If every file failed, mark the submission `FAILED` and do not call the AI provider.

## 11. Automatic DataNest AI response

### 11.1 One response per submission

A batch of up to 10 files generates one consolidated DataNest AI response, not one response per file.

If some files fail, the successful files are still analyzed and the final status is `RESPONDED_WITH_WARNINGS`.

### 11.2 Frozen submission context

At submission time DataNest records the context needed to make the later background response attributable and reproducible:

- selected Job;
- DataNest AI session;
- submitting user;
- optional user instruction;
- submission and file trace IDs;
- relevant session event boundary/reference;
- an exact snapshot of the certified-memory IDs visible to this Job at submission time.

Later chat messages do not silently change the purpose of the in-flight upload analysis. The analyzer loads the recorded certified-memory IDs rather than substituting memory that was promoted after the submission began.

### 11.3 Retrieval

The analyzer does not insert the full contents of every document into one model request.

It retrieves and aggregates chunks relevant to:

- the active Job manifest;
- the optional user instruction;
- the file set;
- current-session evidence that belonged to the frozen submission context;
- current certified project memory appropriate to the Job.

The response must distinguish:

- certified project memory;
- UNCERTIFIED uploaded evidence;
- extraction limitations;
- conflicts.

### 11.4 Response staging

The automatic response is staged as a normal DataNest AI output:

- `source_type=datanest_ai`;
- output trace ID;
- parent/submission lineage;
- provider metadata;
- policy version;
- UNCERTIFIED trust state;
- reasoning envelope with input event IDs, certified memory IDs, and provisional evidence IDs.

No private provider chain-of-thought is stored.

## 12. File-derived evidence and learning

### 12.1 New evidence classes

Extend the `ai_intake_events.source_type` domain with explicit file-derived types:

- `file_upload` — the source submission marker and artifact lineage;
- `document_evidence` — a normalized proposition derived from cited chunks and eligible for trend/candidate analysis.

A `file_upload` event itself is not counted as a learning proposition. It proves that a source was submitted.

A `document_evidence` event contains a concise proposition plus metadata linking the exact supporting chunk IDs and file trace.

### 12.2 Proposition generation

Instead of treating an entire document as one candidate, the analysis layer may derive concise propositions representing:

- requirements;
- decisions;
- constraints;
- observations;
- recurring patterns;
- factual claims relevant to the selected Job.

Each proposition must retain source citations.

### 12.3 Independence

The existing trend engine must not count multiple chunks from one file as independent confirmations.

Independence identity for file-derived evidence is based primarily on the verified physical source hash/artifact identity, not chunk count or repeated submission count.

Therefore:

- one PDF with twenty agreeing chunks = one independent source;
- re-uploading the same SHA-256 = still one independent source for learning confidence;
- three genuinely distinct files with separate verified hashes = up to three independent sources.

Repeated submission remains visible in audit history without inflating evidence independence.

### 12.4 Conflict detection

Extend conflict detection beyond simple positive/negative polarity for file-derived evidence. At minimum detect and stage review signals for:

- different values for the same normalized field/requirement;
- contradictory instructions or decisions;
- multiple versions of the same source that disagree;
- disagreement with active certified memory;
- material disagreement among independent uploaded sources.

A conflict never causes DataNest to pick a winner automatically. It:

- sets `has_conflict=true`;
- lowers candidate confidence;
- surfaces the competing cited positions;
- raises the required certification authority under existing policy.

### 12.5 Certified memory precedence

Certified memory remains reusable project knowledge. Uploaded evidence remains provisional.

When a document disagrees with certified memory, the response must say so explicitly, for example:

> The uploaded source states X, while current certified project memory states Y. The uploaded statement remains UNCERTIFIED and has been staged for review.

The upload must not silently replace certified memory.

## 13. Certification and promotion

The existing gate order remains unchanged:

`INTAKE → AUDITED → VERIFIED → VALIDATED → CERTIFICATION_REVIEW → CERTIFIED`

with `STRESS_TEST` required before certification review under the current policy.

For v1, any candidate whose evidence includes `document_evidence` is **ineligible for automatic certification**, even when it is low-risk, repeated, and non-conflicting.

File-derived candidates may proceed automatically through mechanical/automated checks where safe, but the final certification decision requires an authorized admin or owner according to existing role/risk policy.

Only after certification may the candidate be promoted into production `certified_memory`.

Promotion keeps the existing lineage and adds enough staging references to resolve:

`certified memory → candidate → evidence event → cited chunk → artifact → submission → SHA-256 → original file`

Supersession remains explicit and append-only. A newer certified source may supersede older active memory through the existing governed supersession path; history is not mutated away.

## 14. User interface

### 14.1 Composer

Extend the existing DataNest AI Development input composer with:

- **Attach files** button;
- drag-and-drop target;
- native file picker limited to supported extensions;
- pre-submit file list;
- per-file size/type validation;
- remove-file action;
- batch count;
- clear statement: maximum 10 files, 25 MB each.

The textarea remains optional.

Button behavior:

- text only → existing chat flow;
- files only → upload and automatically analyze for the selected Job;
- files + text → use text as the analysis instruction.

### 14.2 Transcript placement

The upload batch is inserted into the transcript at submission time.

The batch card contains:

- submission trace;
- UNCERTIFIED badge;
- file count;
- current batch state;
- per-file rows/cards;
- expandable provenance.

The user may continue chatting immediately after the files have been safely submitted.

### 14.3 Progress

Per-file states shown to the user:

`Uploading → Queued → Validating → Extracting → OCR → Chunking → Ready`

Only show OCR for a file/page when OCR actually runs.

Batch states:

`Uploading → Processing → Analyzing → Responded`

or one of the warning/failure terminal states.

Status updates are fetched through the authenticated upload gateway. Direct browser access to private staging tables is not required for v1.

### 14.4 Completed response

When analysis finishes, the response appears directly below the upload batch and uses the existing DataNest AI turn visual language.

The response includes:

- summary of what DataNest found;
- important requirements/decisions/patterns;
- Job-specific implications;
- conflicts and uncertainty;
- precise source citations;
- extraction/OCR warnings where relevant;
- learning state.

Learning state examples:

- `2 learning candidates staged · UNCERTIFIED · human certification required`
- `No repeatable learning candidate detected`

The UI must never imply that upload ingestion itself updated project-wide certified memory.

### 14.5 Citation interaction

A citation control displays the human-readable locator and may open a compact source-evidence view with:

- cited extracted passage/rows/object;
- filename;
- source locator;
- file trace;
- verified hash excerpt/full copyable hash;
- extraction method.

Original-file access uses a short-lived signed read URL issued only after Job authorization.

### 14.6 Partial failure and retry

If one or more files fail but at least one is usable:

- final batch status: `RESPONDED_WITH_WARNINGS`;
- analyze usable files;
- show failed files separately with concise error codes/reasons;
- expose **Retry failed file** only for retryable states.

If every file fails:

- retain the transcript batch and trace;
- status: `FAILED`;
- do not fabricate an AI analysis.

### 14.7 Accessibility and mobile

The upload controls must follow existing DataNest accessibility and responsive conventions:

- labeled file picker;
- keyboard-operable remove/retry/citation controls;
- visible focus states;
- `aria-live` processing announcements;
- progress must not rely on color alone;
- mobile layout uses one-column file cards and no horizontal scrolling;
- reduced-motion preference is respected.

## 15. Error semantics

Public error messages should be concise and stable, while internal logs retain richer diagnostics.

Suggested terminal/visible error codes:

- `UNSUPPORTED_TYPE`
- `FILE_TOO_LARGE`
- `BATCH_LIMIT_EXCEEDED`
- `INVALID_FILE_SIGNATURE`
- `ENCRYPTED_FILE_UNSUPPORTED`
- `EXTRACTION_FAILED`
- `OCR_REQUIRED_UNAVAILABLE`
- `OCR_FAILED`
- `CHUNKING_FAILED`
- `ANALYSIS_FAILED`
- `JOB_ACCESS_DENIED`
- `UPLOAD_EXPIRED`

No error path may expose service-role keys, private storage paths, provider secrets, or another Job's identifiers.

## 16. Observability and audit

Record structured events for:

- upload slot issued;
- bytes accepted;
- server hash verified;
- duplicate blob reused;
- file rejected;
- extraction started/completed;
- OCR invoked/completed/failed;
- chunks created;
- file ready;
- analysis queued/started/completed/failed;
- response event staged;
- learning candidate staged;
- manual retry requested.

Every event includes the submission/file trace IDs and Job ID where appropriate.

Queue metrics should expose backlog, oldest-message age, retry counts, and dead/failed work counts for operational review.

## 17. Data retention

Original canonical blobs and their extraction lineage are retained indefinitely in staging as approved.

There is no automated retention deletion in v1.

Any later feature that deletes original evidence must be designed as a separate governed capability because deleting a source can affect auditability, citation reproducibility, and certified-memory lineage.

Temporary duplicate upload objects may be deleted immediately after successful hash verification and canonical deduplication because the canonical verified blob remains intact and the new logical submission record retains its own audit trail.

## 18. Tests and acceptance criteria

Implementation must be test-driven.

### 18.1 Unit/source tests

Cover:

- 10-file and 25 MB limit enforcement;
- file-type allow-list;
- client digest never treated as authoritative;
- content-addressed final path derived only from server-verified digest;
- duplicate blob reuse with new submission/file traces;
- status transition validity;
- retry classification;
- independence identity based on artifact/hash rather than chunk count;
- file-derived candidate auto-certification prohibition;
- citation renderer for every supported format;
- no invented DOCX page number;
- OCR/native metadata separation;
- partial-batch state reduction.

### 18.2 SQL acceptance

Cover:

- required new tables/columns/constraints/indexes;
- RLS enabled;
- direct browser staging privileges denied;
- Job-access gateway rejects project-only membership without Job authorization;
- idempotency constraints;
- file-derived source types allowed;
- queue extension/queue existence where managed by migration;
- document evidence cannot satisfy an auto-certification path;
- source lineage survives certification/promotion.

### 18.3 Edge-function tests

Cover:

- unauthenticated request rejected;
- unauthorized Job rejected;
- signed upload slot is scoped to one item/path;
- expired/finalized item cannot be reused improperly;
- server digest mismatch handled safely;
- deterministic validation failures are not auto-retried;
- transient failures are retried up to three attempts;
- duplicate work delivery is idempotent;
- queue acknowledgement only after durable state;
- all-files-failed skips AI analysis;
- partial success produces one response with warnings.

### 18.4 Browser acceptance

Extend the governed DataNest AI browser suite to verify:

- attach control and drag/drop;
- file-only upload starts automatic analysis;
- text + file submission preserves typed instruction;
- user can continue chatting while upload processes;
- progress is visible and accessible;
- completed automatic response appears beneath its original batch;
- trace IDs remain visible;
- precise citations open source evidence;
- duplicate upload shows blob reuse plus new trace;
- partial failure shows warnings and retry;
- mobile has no horizontal overflow;
- UNCERTIFIED language remains visible;
- learning candidate status does not imply certification.

### 18.5 Stress and reliability acceptance

Test:

- 10 concurrent 25 MB files in one batch;
- repeated duplicate batches;
- worker crash between checkpoints;
- queue redelivery;
- OCR-heavy PDFs;
- large but valid CSV/JSON within the 25 MB source limit;
- provider failure after successful extraction;
- repeated manual retry;
- session chat continuing while background processing completes.

The final release is not accepted unless exact-head CI, DataNest AI certification/acceptance suites, production build, and governed browser tests pass.

## 19. Implementation boundaries

### In scope

- governed file upload UI;
- private Supabase Storage bucket;
- signed resumable uploads;
- Job-scoped submission/item records;
- server-side SHA-256 verification and blob dedupe;
- durable queues and background worker;
- PDF/DOCX/TXT/CSV/JSON extraction;
- OCR fallback adapter;
- chunk/source locator metadata;
- automatic batch analysis and response;
- citations;
- learning/candidate integration;
- manual certification requirement for file-derived learning;
- retry/status UX;
- tests and operational audit events.

### Out of scope for v1

- XLS/XLSX;
- images as direct standalone uploads;
- audio/video;
- archives as user-facing source types;
- password-protected/encrypted documents;
- automatic deletion/retention expiry;
- automatic certification of file-derived candidates;
- public file sharing;
- anonymous uploads;
- arbitrary URL ingestion;
- replacing the existing DataNest AI chat/certification architecture.

## 20. Repository changes expected

Likely implementation surfaces:

- `src/components/DataNestAiChatPanel.tsx`
- `src/components/DataNestAiWorkspace.tsx`
- one or more focused upload/progress/citation components
- `src/app/globals.css`
- new staging migration(s)
- new/updated production gateway migration(s) only where authorization RPCs are required
- `supabase/functions/datanest-ai-upload/index.ts`
- `supabase/functions/datanest-ai-file-worker/index.ts`
- shared file validation/extraction/citation modules
- `supabase/functions/datanest-ai-chat/index.ts` only for integration points that belong in the existing reasoning path
- `supabase/functions/datanest-ai-certification/index.ts` and policy helpers for file-derived auto-certification prohibition
- unit/source tests
- SQL acceptance tests
- browser tests
- stress tests

Large concerns should stay separated rather than growing `DataNestAiChatPanel.tsx` or `datanest-ai-chat/index.ts` into monolithic files.

## 21. Design invariants

The implementation is correct only if all of these remain true:

1. Uploaded bytes never become certified memory merely because they were successfully stored or extracted.
2. One physical source cannot inflate learning confidence by being chunked, re-uploaded, or retried.
3. A duplicate file may reuse storage but always receives a new logical submission trace.
4. Project membership alone does not grant access to Job-scoped uploaded evidence.
5. Every visible source citation can resolve to the original verified file lineage.
6. OCR output is visibly distinguishable from native extraction.
7. A partial batch never masquerades as a fully successful extraction.
8. Background work can survive browser closure and worker retry.
9. The browser never receives staging service-role credentials.
10. File-derived learning requires human certification in v1.
11. Existing certified memory is not silently overwritten by conflicting uploads.
12. The user can keep using DataNest AI while file processing runs.

## 22. Implementation sequence

After this design is approved as a written specification, create a separate implementation plan before touching product code.

The implementation plan should order work so governance primitives and tests land before UI behavior depends on them:

1. schema and authorization contracts;
2. storage and signed-upload gateway;
3. queue and idempotent worker skeleton;
4. parser/extraction modules and citations;
5. OCR adapter;
6. automatic analysis/response integration;
7. trend/certification hardening for file-derived evidence;
8. composer/batch/progress UI;
9. browser/stress acceptance;
10. release/production verification.

No schema, Edge Function, Storage, Queue, or production deployment change is authorized merely by this design document.
