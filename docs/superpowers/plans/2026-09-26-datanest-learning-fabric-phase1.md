# DataNest Learning Fabric Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the first DataNest learning loop by adding a canonical governed application-event gateway, staging application outcomes as learning evidence, exposing promotion-ready certified knowledge, retrieving context-aware certified intelligence, and proving the full flow with Product Lab as the pilot application.

**Architecture:** Production Supabase remains the operational and certified-memory authority; DataNest AI Staging remains the raw-evidence and candidate-lifecycle authority. A new JWT-protected `datanest-event` Edge Function validates application events, records an idempotent production event ledger entry, bridges eligible Job-scoped evidence into staging, and reuses the existing candidate analyzer. Product Lab is the first non-chat producer; DataNest AI and applications consume context through a new ranked certified-intelligence RPC.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase Postgres/Auth/Edge Functions, Node 22 tests, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-datanest-learning-fabric-design.md`

## Global Constraints

- Production Supabase is operational truth and certified-memory authority; DataNest AI Staging is raw-learning evidence and candidate-lifecycle authority.
- GitHub remains source/release authority.
- Uncertified evidence must not influence unrelated Jobs.
- Cross-environment writes are server-side only; never expose service-role credentials to browser code.
- Learning-eligible application evidence must be Job-scoped in Phase 1; Job-less application events remain auditable but are excluded from staging learning with an explicit reason.
- Legal Eagle remains `learning_eligible=false` by default and is outside the Product Lab pilot.
- High-risk architecture/security/authorization/governance/destructive/production-policy/financial categories remain Owner-gated.
- Promotion is idempotent; duplicate promotion cannot create duplicate active production memory.
- Corrections and supersessions preserve history.
- No billing is enabled; the current free-promotion/no-billing invariant remains unchanged.
- Before applying Supabase schema/function changes, load the current Supabase skill, review current changelog/docs, and create migration files with `supabase migration new` rather than inventing timestamps.

## Review Focus

- Duplicate Product Lab retries with the same `clientRequestId` must return the original canonical event instead of creating duplicate production or staging evidence; pinned in Task 4 tests.
- A Product Lab test recorded without a Job must remain an operational record but must not become staged learning evidence; pinned in Task 7 tests.
- A staging outage after the production event ledger write must leave the event visibly `failed`/retriable rather than falsely claiming learning was staged; pinned in Task 4 tests.
- A certified candidate whose production promotion fails must remain certified and visibly promotion-failed/retriable; pinned in Task 5 tests.
- Context retrieval with no application/entity matches must still return authorized active certified memory in deterministic fallback order rather than an empty context; pinned in Task 6 SQL/unit tests.

---

### Task 1: Production event ledger and contextual certified-memory schema

**Files:**
- Create: `supabase/migrations/<generated>_datanest_learning_fabric_v1.sql` using `supabase migration new datanest_learning_fabric_v1`
- Create: `tests/sql/datanest_learning_fabric_production_acceptance.sql`

**Interfaces:**
- Consumes: existing `projects`, `jobs`, `project_members`, `job_collaborators`, `events`, and `certified_memory`.
- Produces:
  - table `public.datanest_application_events`
  - `public.service_promote_certified_memory_v2(..., target_context jsonb) -> uuid`
  - `public.get_certified_intelligence_v1(target_project uuid, target_job uuid, target_application_key text, target_action text, target_entity_type text, target_entity_id text, target_limit integer) -> jsonb`
  - `certified_memory.context jsonb not null default '{}'`

- [ ] **Step 1: Write the failing production SQL acceptance test**

Assert:
- `datanest_application_events` exists with unique `trace_id` and unique `(project_id,application_key,client_request_id)`;
- `learning_state` accepts only `excluded|pending|staged|failed`;
- `outcome` accepts only `accepted|rejected|succeeded|failed|superseded|unknown`;
- authenticated roles cannot insert/update the ledger directly;
- authorized members can read events in their project;
- `certified_memory.context` exists and defaults to `{}`;
- `get_certified_intelligence_v1` rejects unauthorized access;
- exact application/action/entity matches rank ahead of generic memories;
- no-match retrieval falls back to active authorized memory ordered deterministically;
- `service_promote_certified_memory_v2` remains service-role-only and preserves existing content-hash idempotency.

- [ ] **Step 2: Run the SQL test and verify it fails before the migration exists**

Run against a disposable/local test database or controlled branch database using:
`psql -v ON_ERROR_STOP=1 -f tests/sql/datanest_learning_fabric_production_acceptance.sql`

Expected: FAIL on missing table/function/column.

- [ ] **Step 3: Implement the production migration**

Create `public.datanest_application_events` with these Phase 1 fields:
`id, project_id, job_id, application_key, trace_id, client_request_id, source_type, actor_user_id, entity_type, entity_id, action, input_refs, artifact_refs, outcome, quality, metadata, learning_eligible, sensitivity_class, learning_state, staging_event_id, failure_reason, created_at, updated_at`.

Add indexes for project/time, Job/time, application/time, learning state, and entity lookup.

Add `certified_memory.context jsonb not null default '{}'` plus a GIN index.

Implement `service_promote_certified_memory_v2` as a compatibility-preserving v2 wrapper around a private v2 promoter that stores `context` while retaining content-hash idempotency and supersession behavior.

Implement `get_certified_intelligence_v1` with the same authorization model as `get_certified_memory_context`. Ranking weights:
- exact entity ID: +8
- exact application key: +5
- exact action: +3
- exact entity type: +2
- source Job contains `target_job`: +1
- ties: `promoted_at desc, effective_version desc`.

Generic memory remains eligible when no context tags match.

- [ ] **Step 4: Run database advisors and production SQL acceptance**

Run current Supabase advisors for security/performance, then rerun:
`psql -v ON_ERROR_STOP=1 -f tests/sql/datanest_learning_fabric_production_acceptance.sql`

Expected: PASS and no new unresolved security-advisor findings attributable to this migration.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations tests/sql/datanest_learning_fabric_production_acceptance.sql
git commit -m "feat: add DataNest application event ledger"
```

### Task 2: Staging support for application evidence and promotion lifecycle

**Files:**
- Create: `supabase/staging-migrations/<generated>_datanest_learning_fabric_staging_v1.sql`
- Create: `tests/sql/datanest_learning_fabric_staging_acceptance.sql`

**Interfaces:**
- Consumes: `ai_sessions`, `ai_intake_events`, `ai_learning_candidates`.
- Produces:
  - `ai_intake_events.source_type='application'`
  - candidate fields `promotion_state`, `promoted_memory_id`, `promoted_at`, `promotion_error`
  - mirrored production schema additions needed by staging E2E.

- [ ] **Step 1: Write the failing staging SQL acceptance test**

Assert:
- `application` is an allowed `ai_intake_events.source_type`;
- existing source types remain valid;
- candidate `promotion_state` accepts only `not_ready|ready|promoting|promoted|failed`;
- default is `not_ready`;
- promoted state requires a non-null promoted memory ID and timestamp;
- staging contains the mirrored `datanest_application_events` and `certified_memory.context` shape required by governed E2E.

- [ ] **Step 2: Run the staging SQL test and verify failure**

Run:
`psql -v ON_ERROR_STOP=1 -f tests/sql/datanest_learning_fabric_staging_acceptance.sql`

Expected: FAIL on missing source type/columns.

- [ ] **Step 3: Implement the staging migration**

Mirror the production event-ledger/context schema required by E2E, extend the `ai_intake_events_source_type_check` with `application`, and add promotion lifecycle columns/check constraints to `ai_learning_candidates`.

- [ ] **Step 4: Run staging advisors and SQL acceptance**

Expected: PASS with no new unresolved security findings attributable to this migration.

- [ ] **Step 5: Commit**

```bash
git add supabase/staging-migrations tests/sql/datanest_learning_fabric_staging_acceptance.sql
git commit -m "feat: stage application learning evidence"
```

### Task 3: Extract reusable governed learning analysis

**Files:**
- Create: `supabase/functions/_shared/datanestAiLearning.ts`
- Modify: `supabase/functions/datanest-ai-chat/index.ts`
- Test: `tests/unit/datanest-ai-learning-source.test.mjs`
- Test: `tests/unit/datanest-ai-trends.test.mjs`

**Interfaces:**
- Consumes: `candidateFromRepeatedEvidence(...)`, `automatedLearningGateResults(...)`, staging Supabase client.
- Produces:
  - `analyzeLearningEvidence(input:{staging:SupabaseClient;projectId:string;inputEventId:string}):Promise<{candidateId:string|null;trendKey:string|null;evidenceCount:number}>`
  - `deriveLearningContext(events:Array<{metadata?:Record<string,unknown>|null}>):{application_keys:string[];actions:string[];entity_types:string[];entity_ids:string[];outcomes:string[]}`

- [ ] **Step 1: Write failing unit/source tests**

Tests must prove:
- the analyzer queries learning-eligible `human|ai_companion|application` evidence;
- `datanest_ai` output remains excluded as direct candidate evidence;
- metadata with `learning_eligible=false` is excluded;
- application metadata is normalized into deterministic sorted context arrays;
- the existing DataNest AI chat path calls the shared analyzer rather than retaining a second private copy.

- [ ] **Step 2: Run targeted tests and verify failure**

Run:
`node --test --experimental-strip-types tests/unit/datanest-ai-learning-source.test.mjs tests/unit/datanest-ai-trends.test.mjs`

Expected: FAIL until the shared module/refactor exists.

- [ ] **Step 3: Move the current candidate/trend persistence algorithm into `datanestAiLearning.ts`**

Preserve current candidate identity, evidence links, validation seals, and lifecycle semantics. Expand only the eligible source query to include `application`. Do not change candidate thresholds in this task.

- [ ] **Step 4: Replace the private analyzer in `datanest-ai-chat/index.ts` with the shared function**

No behavior change for ordinary chat except shared implementation.

- [ ] **Step 5: Run targeted and full unit tests**

Run:
`npm test`

Expected: all unit tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/datanestAiLearning.ts supabase/functions/datanest-ai-chat/index.ts tests/unit
git commit -m "refactor: share governed learning analysis"
```

### Task 4: Canonical DataNest event gateway

**Files:**
- Create: `supabase/functions/_shared/datanestEvent.ts`
- Create: `supabase/functions/datanest-event/index.ts`
- Test: `tests/unit/datanest-event-contract.test.mjs`
- Test: `tests/unit/datanest-event-source.test.mjs`

**Interfaces:**
- Consumes: production user JWT, production service client, staging service client, Task 3 `analyzeLearningEvidence`.
- Produces:
  - `validateDataNestEvent(input:unknown):DataNestEventInput`
  - Edge action `record` with request:
    `{action:"record", event:{schemaVersion:"datanest-event-v1", projectId, jobId, applicationKey, clientRequestId, sourceType, entityType, entityId, actionName, inputRefs, artifactRefs, outcome, quality, metadata, learningEligible, sensitivityClass}}`
  - response:
    `{eventId, traceId, learningState, stagingEventId, candidateId, duplicate}`

- [ ] **Step 1: Write failing contract/source tests**

Cover:
- invalid enum/schema rejection;
- caller-supplied `traceId` is ignored/rejected; gateway generates `DN-EVT-` trace;
- duplicate same `projectId+applicationKey+clientRequestId` returns original event with `duplicate:true`;
- Job must belong to Project;
- caller must have project membership or authorized Job collaboration;
- `learningEligible=false` produces production event with `learning_state='excluded'` and no staging write;
- Job-less learning-eligible input is recorded but excluded with `failure_reason='job_required_for_learning_v1'`;
- staging failure updates production ledger to `failed` and returns a retriable error state;
- successful eligible event creates staging `source_type='application'` evidence and invokes the shared analyzer.

- [ ] **Step 2: Run targeted tests and verify failure**

Run:
`node --test --experimental-strip-types tests/unit/datanest-event-contract.test.mjs tests/unit/datanest-event-source.test.mjs`

Expected: FAIL until gateway/shared contract exists.

- [ ] **Step 3: Implement `datanestEvent.ts`**

Define the exact v1 enums from the spec. Implement normalization/validation only; do not put database access in this shared contract file.

- [ ] **Step 4: Implement `datanest-event/index.ts`**

Processing order:
1. authenticate JWT;
2. validate event envelope;
3. authorize Project/Job with a production user client;
4. check idempotency in production ledger;
5. insert production ledger row as `pending` or `excluded`;
6. append generic `events` audit record `DATANEST_APPLICATION_EVENT_RECORDED`;
7. when eligible, create/reuse a dedicated staging application session for the Project+Job+user;
8. insert one `ai_intake_events` row with source `application`, normalized content, content hash, and canonical envelope metadata;
9. run shared learning analysis;
10. update production ledger to `staged` with staging event ID;
11. on bridge failure, update ledger to `failed` with a sanitized failure reason.

- [ ] **Step 5: Run targeted and full unit tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/datanestEvent.ts supabase/functions/datanest-event tests/unit
git commit -m "feat: add governed DataNest event gateway"
```

### Task 5: Promotion-ready certification and contextual promotion

**Files:**
- Modify: `supabase/functions/datanest-ai-certification/index.ts`
- Modify: `src/components/DataNestAiCertificationPanel.tsx`
- Modify: `src/components/DataNestAiMemoryPanel.tsx`
- Test: `tests/unit/datanest-ai-certification-promotion.test.mjs`
- Test: `tests/browser/datanest-ai.spec.ts`

**Interfaces:**
- Consumes: Task 1 `service_promote_certified_memory_v2`, Task 2 promotion columns, Task 3 `deriveLearningContext`.
- Produces:
  - certification sets `promotion_state='ready'`;
  - promotion passes derived context to production;
  - successful promotion sets `promotion_state='promoted'`, `promoted_memory_id`, `promoted_at`;
  - failed promotion sets `promotion_state='failed'` and sanitized `promotion_error`.

- [ ] **Step 1: Write failing tests**

Cover:
- certified candidate becomes `ready` if not already promoted;
- existing promoted candidate is not reset to ready by a repeated certification call;
- promotion uses v2 RPC and derived application/action/entity/outcome context;
- repeated promotion of the same content returns the same production memory ID;
- promotion failure preserves `CERTIFIED` lifecycle and marks `promotion_state='failed'`;
- UI renders `PROMOTION READY`, `PROMOTED`, and `PROMOTION FAILED` distinctly;
- failed promotion offers the existing promote action as a retry.

- [ ] **Step 2: Run targeted tests and verify failure**

Run:
`node --test --experimental-strip-types tests/unit/datanest-ai-certification-promotion.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Extend certification lineage loading**

Load evidence metadata alongside Job/trace IDs and derive context with `deriveLearningContext`.

- [ ] **Step 4: Implement promotion lifecycle updates**

Set `promoting` before the production RPC; set `promoted` on success; set `failed` on catch and rethrow a safe error.

- [ ] **Step 5: Update certification and memory UI**

Show promotion state and, for promoted memory, the persisted application/action/entity context without exposing raw staging evidence.

- [ ] **Step 6: Run unit/browser tests**

Run targeted browser spec plus `npm test`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/datanest-ai-certification src/components/DataNestAiCertificationPanel.tsx src/components/DataNestAiMemoryPanel.tsx tests
git commit -m "feat: expose governed memory promotion state"
```

### Task 6: Context-aware certified intelligence retrieval

**Files:**
- Modify: `supabase/functions/datanest-ai-chat/index.ts`
- Modify: `src/components/DataNestAiWorkspace.tsx` only if needed to pass explicit application context; otherwise leave unchanged
- Test: `tests/unit/datanest-context-routing.test.mjs`
- Test: `tests/sql/datanest_learning_fabric_production_acceptance.sql`

**Interfaces:**
- Consumes: Task 1 `get_certified_intelligence_v1`.
- Produces:
  - `loadCertifiedIntelligence(input:{client;projectId;jobId;applicationKey;action;entityType?:string|null;entityId?:string|null;limit?:number}):Promise<Array<Record<string,unknown>>>`
  - DataNest AI context requests use ranked certified intelligence while preserving separate provisional session evidence.

- [ ] **Step 1: Write failing routing tests**

Cover:
- DataNest AI normal chat uses `applicationKey='datanest_ai'`, `action='chat'`;
- Legal Eagle may retrieve permitted certified context as `applicationKey='legal_eagle'` while still writing no learning evidence;
- ranked certified memory and provisional session events remain separate prompt sections;
- fallback works when no context-tagged memories match;
- unauthorized RPC calls remain rejected.

- [ ] **Step 2: Run targeted tests and verify failure**

Run:
`node --test --experimental-strip-types tests/unit/datanest-context-routing.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Replace broad `get_certified_memory_context` loading in the chat gateway with `get_certified_intelligence_v1`**

Keep the old RPC in the database for compatibility; only the chat gateway moves to v1 contextual retrieval in this phase.

- [ ] **Step 4: Run unit and production SQL acceptance tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/datanest-ai-chat/index.ts src/components/DataNestAiWorkspace.tsx tests
git commit -m "feat: route DataNest AI through contextual memory"
```

### Task 7: Product Lab pilot adapter and outcome lineage

**Files:**
- Create: `src/lib/datanestEvent.ts`
- Modify: `src/components/ProductLab.tsx`
- Create: `tests/browser/product-lab-learning-fabric.spec.ts`
- Test: `tests/unit/product-lab-learning-source.test.mjs`

**Interfaces:**
- Consumes: `datanest-event` Edge Function.
- Produces:
  - `recordDataNestEvent(event:DataNestClientEvent):Promise<{eventId:string;traceId:string;learningState:string;candidateId:string|null;duplicate:boolean}>`
  - Product Lab test outcomes emit canonical `applicationKey='product_lab'`, `entityType='product_test_run'`, `actionName='product_test_run.recorded'`.

- [ ] **Step 1: Write failing unit/browser tests**

Cover:
- Product Lab loads/selects an authorized Job before recording learning-eligible test evidence;
- inserted `product_test_runs.job_id` equals the selected Job;
- result mapping is `pass -> succeeded`, `fail -> failed`, `blocked -> unknown` with raw result retained in `quality.test_result`;
- event metadata includes surface ID, test-case ID/version, build commit, release ID, environment, evidence URL, and notes;
- same run `request_id` is reused as canonical event `clientRequestId`;
- a test run without selected Job can still be recorded only if deliberately marked non-learning; it must not stage evidence;
- gateway failure does not erase the product test run and the UI displays that DataNest learning linkage failed;
- successful gateway response displays the `DN-EVT-` trace and learning state.

- [ ] **Step 2: Run targeted tests and verify failure**

Run:
`node --test --experimental-strip-types tests/unit/product-lab-learning-source.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement the browser client helper**

The helper only invokes the JWT-protected Edge Function and normalizes returned errors; no service credentials or staging URLs are present.

- [ ] **Step 4: Update Product Lab**

Add a Job selector scoped to the current Project, persist the selected Job for the active Product Lab session, write `job_id` on test runs, then emit the canonical event after the run is recorded.

Keep the existing production-test confirmation.

- [ ] **Step 5: Run Product Lab browser acceptance**

Run:
`npx playwright test tests/browser/product-lab-learning-fabric.spec.ts --workers=1`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/datanestEvent.ts src/components/ProductLab.tsx tests
git commit -m "feat: link Product Lab outcomes to DataNest learning"
```

### Task 8: Release manifest, CI, backend acceptance, and end-to-end certification

**Files:**
- Modify: `scripts/write-release-manifest.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/datanest-ai-certification.yml`
- Modify: `.github/workflows/pr-verification.yml`
- Modify: `tests/stress/datanest-ai-backend-acceptance.mjs`
- Modify: `tests/unit/release-manifest-alignment.test.mjs`
- Create: `docs/verification/datanest-learning-fabric-phase1-2026-09-26.md`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: release metadata for `datanest-event`, governed CI coverage, end-to-end evidence.

- [ ] **Step 1: Write failing release/acceptance assertions**

Require:
- release manifest contains `edgeFunctions.eventGateway`;
- database release is updated to the learning-fabric Phase 1 release name;
- backend acceptance verifies one application event can progress `production ledger -> staging evidence -> candidate`;
- certification acceptance verifies `certified -> promotion ready -> promoted -> contextual retrieval`;
- Product Lab browser acceptance runs in PR verification or the governed certification workflow.

- [ ] **Step 2: Update release manifest writer**

Add:
`eventGateway: process.env.DATANEST_EDGE_EVENT || "datanest-event@1"`.

- [ ] **Step 3: Add package/browser script and CI wiring**

Add `test:browser:learning-fabric` for the Product Lab and relevant DataNest AI browser specs.

Run both new SQL acceptance files in governed certification.

Set `DATANEST_DB_RELEASE=datanest-learning-fabric-v1` and `DATANEST_EDGE_EVENT=datanest-event@1` in certification build metadata.

- [ ] **Step 4: Extend backend acceptance**

Use governed E2E credentials and deterministic fixture IDs. Do not promote arbitrary pre-existing user evidence; seed dedicated test evidence, certify only the fixture candidate, verify its production memory, then clean up only fixture rows permitted by the test harness.

- [ ] **Step 5: Run the full local/static suite**

Run:
```bash
npm test
npm run check
npm run build
npm run test:browser:datanest-ai -- --workers=1
npm run test:browser:learning-fabric -- --workers=1
npm run test:stress:datanest-ai
```

Expected: all PASS.

- [ ] **Step 6: Run database advisors and both SQL acceptance suites against the controlled target environments**

Expected: all PASS; no unresolved new security/performance advisory attributable to Phase 1.

- [ ] **Step 7: Write verification evidence**

Document:
- exact commit;
- production/staging migration versions;
- deployed Edge Function versions;
- SQL acceptance results;
- unit/type/build/browser/stress results;
- one trace showing Product Lab outcome -> staging evidence -> candidate;
- one fixture trace showing certification -> promotion -> retrieval;
- confirmation that Legal Eagle learning exclusion and no-billing invariants still pass.

- [ ] **Step 8: Commit**

```bash
git add scripts package.json .github tests docs/verification
git commit -m "test: certify DataNest learning fabric phase 1"
```

## Final Branch Verification

After Task 8:

- [ ] Fetch the exact branch HEAD.
- [ ] Run `npm test`, `npm run check`, and `npm run build` on that exact HEAD.
- [ ] Confirm the governed SQL, browser, backend, and stress checks correspond to that exact HEAD.
- [ ] Run Supabase security/performance advisors after final schema/function state.
- [ ] Verify no raw application evidence exists in production `certified_memory`.
- [ ] Verify no service-role or database secrets are present in source or static output.
- [ ] Verify billing remains disabled and free-promotion product state is unchanged.
- [ ] Request whole-branch review before merging.
