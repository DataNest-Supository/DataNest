# DataNest Phase D Authority and Execution Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add task-scoped Authority Envelopes, human approvals, Capability Leases, circuit breakers, trace-safe execution decisions, and route-specific enforcement adapters without weakening existing DataNest authority or enabling new destructive/legal/financial execution.

**Architecture:** Phase D is an additive authority overlay on the existing project RBAC/RLS, Jobs, capabilities, reservations, Phase C trust policy, provider authorization, and audit systems. The database owns canonical authority resolution and atomic lease consumption; UI surfaces proposal/review state; selected existing routes call the evaluator in `report_only` by default and can be explicitly moved to `enforced` per project/route.

**Tech Stack:** PostgreSQL/Supabase migrations and RPCs, Supabase Edge Functions/Deno TypeScript, Next.js 15/React 19/TypeScript, Node `node:test` source-contract tests, Playwright browser tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-datanest-phase-d-authority-execution-controls-design.md`

## Global Constraints

- Phase D is additive; it must not replace Jobs, `public.reservations`, project RLS/RBAC, Job/file collaboration gates, Phase C trust/data policy, provider/budget authorization, certification, or promotion controls.
- A positive Phase D decision can never override an upstream denial.
- `public.reservations` remain capacity reservations; Capability Leases are execution permission and are stored separately.
- Canonical autonomy levels are exactly `A0`, `A1`, `A2`, `A3`, `A4`.
- Canonical consequence classes are exactly `read_only`, `advisory`, `preparatory`, `reversible_write`, `external_communication`, `externally_visible_change`, `resource_execution`, `production_change`, `destructive`, `legal_commitment`, `financial_commitment`, `ownership_or_governance`, `constitutional`.
- Minimum autonomy is: read-only A0; advisory A1; preparatory A2; reversible-write/external-communication/externally-visible-change/resource-execution A3; production/destructive/legal/financial/ownership-or-governance/constitutional A4.
- A4 always requires an exact-action authorized human approval; the control model does not itself enable any new A4 executor.
- AI/agents/services may never self-widen autonomy, scope, limits, lease expiry, breaker state, governance/ownership/financial rights, or audit history.
- Authority Envelopes and Capability Leases store references/policy state only; never secrets or credentials.
- Unknown, expired, revoked, exhausted, contradictory, or insufficient authority fails closed on enforced execution routes.
- Automated safety may tighten execution; it may not silently widen a paused/blocked route or breaker.
- Server/database time is authoritative for expiry.
- Significant authority changes and evaluations must emit attributable project-scoped evidence without copying raw sensitive data by default.
- Phase D route rollout is per project and per route. Missing route policy means `report_only`, never `enforced`.
- V1 route keys are exactly `external_ai_provider` and `job_start`.
- V1 circuit-breaker categories are exactly `autonomous_writes`, `external_communications`, `deployments`, `resource_execution`.
- Phase D does not enable billing, destructive deletion, autonomous production promotion, legal/financial/ownership execution, unrestricted remote control, a secrets vault, Phase E Resource Fabric, or Phase F ILM.
- RONSAS remains `DataNest > Products > RONSAS`; billing remains off.

## Review Focus

1. **Enforced route with partial authority state:** a project switching a route from `report_only` to `enforced` must deny rather than execute when the matching envelope, approval, lease, capability health, reservation, or upstream policy is absent/expired/revoked.
2. **Same-severity but different consequence classes:** an A3 envelope for `resource_execution` must not implicitly authorize `external_communication`; requested consequence must be explicitly listed as well as within the granted autonomy.
3. **Concurrent lease consumption / retries:** the same trace must not consume counters twice, while two distinct concurrent executions cannot exceed the lease operation ceiling.
4. **Circuit-breaker recovery:** automated safety may pause/block, but only governed human mutation may restore `enabled`; safe A0/A1 reads remain available while the affected execution category is stopped.
5. **Exact-action substitution:** changing the target/artifact/evidence identity after A4 approval invalidates authorization; approval for one exact packet must not authorize a materially different packet.

---

## File Structure

### New database migrations

- `supabase/migrations/20260927123000_add_authority_execution_foundations.sql` — Phase D tables, constraints, indexes, RLS, breaker seeding, run provenance columns, and read views.
- `supabase/migrations/20260927124000_add_authority_execution_governed_operations.sql` — helpers, governed RPCs, route-mode policy, evaluator, atomic lease consumption, audit events, and workspace read model.
- `supabase/migrations/20260927125000_add_authority_execution_route_adapters.sql` — additive override of the existing `transition_job_status(uuid,text)` function for the `RESERVED -> RUNNING` authority boundary.

### New application files

- `src/lib/authorityExecution.ts` — canonical UI types/options/labels only; backend SQL remains policy authority.
- `src/components/AuthorityExecutionPanel.tsx` — Governance Authority & Execution workspace.

### Existing application files modified

- `src/components/GovernanceWorkspace.tsx` — add the third Governance section `authority`.
- `src/components/DataNestApp.tsx` — expose authority readiness in TranScheduler without turning capability availability into permission.
- `src/app/globals.css` — Phase D workspace and scheduler authority-state presentation.
- `supabase/functions/datanest-ai-chat/index.ts` — call Phase D after Phase C and before existing provider authorization for external-provider execution.
- `docs/ARCHITECTURE.md` — mark the implemented Phase D control layer accurately while leaving Phase E/F target state.
- `docs/UX_WORKFLOW_ARCHITECTURE.md` — record Authority & Execution as a Governance sub-workspace and permission/capacity distinction.
- `.github/workflows/pr-verification.yml` — include Phase D browser acceptance.

### New tests

- `tests/unit/authority-execution-schema-source.test.mjs`
- `tests/unit/authority-execution-operations-source.test.mjs`
- `tests/unit/authority-execution-route-source.test.mjs`
- `tests/unit/authority-execution-ui-source.test.mjs`
- `tests/browser/authority-execution.spec.ts`

### Existing tests modified

- `tests/unit/datanest-ai-trust-policy-source.test.mjs` — pin Phase C-before-Phase-D-before-provider order and report-only semantics.
- `tests/unit/ecosystem-authority-contract.test.mjs` — pin hierarchy/billing/target-state honesty.
- `tests/browser/transcheduler-project-gantt.spec.ts` — pin that AVAILABLE capability is not displayed as execution authorization.

---

### Task 1: Authority Execution Schema Foundations

**Files:**
- Create: `supabase/migrations/20260927123000_add_authority_execution_foundations.sql`
- Create: `tests/unit/authority-execution-schema-source.test.mjs`

**Interfaces:**
- Consumes: existing `public.projects`, `public.products`, `public.jobs`, `public.capabilities`, `public.runs`, `public.scheduler_policies`, `public.events`, `auth.users`, and project-access helpers.
- Produces: `public.authority_envelopes`, `public.authority_approvals`, `public.capability_leases`, `public.execution_authority_decisions`, `public.execution_circuit_breakers`; nullable Phase D provenance columns on `public.runs`; explicit breaker rows for existing and future projects.

- [ ] **Step 1: Write the failing schema source test**

Add tests that assert:

```js
test("Phase D creates five project-scoped authority tables",()=>{ /* exact table names */ });
test("Authority Envelopes keep autonomy and consequence independent",()=>{ /* A0-A4 + allowed_consequence_classes */ });
test("Capability Leases are distinct from public.reservations",()=>{ /* separate table/FKs; never rename reservations */ });
test("execution decisions are append-only and trace-safe",()=>{ /* no raw content column; service insert only */ });
test("browser-visible authority tables use project-scoped RLS and no anon writes",()=>{});
test("breaker categories are explicit for every project and future project",()=>{});
test("runs gain nullable authority provenance without rewriting history",()=>{});
```

Pin these exact controlled values:

- envelope states: `draft|proposed|approved|active|paused|exhausted|expired|revoked|superseded|rejected`;
- approval states: `approved|rejected|revoked|expired`;
- approval types: `ordinary|independent|exact_action`;
- lease states: `proposed|active|exhausted|expired|paused|revoked|superseded|cancelled`;
- decision outcomes: `allow|deny|review_required|paused|exhausted`;
- breaker states: `enabled|paused|blocked`;
- reversibility: `read_only|reversible|compensatable|conditionally_reversible|irreversible`.

- [ ] **Step 2: Run the schema test and verify RED**

Run:

```bash
node --test --experimental-strip-types tests/unit/authority-execution-schema-source.test.mjs
```

Expected: FAIL because the Phase D migration/tables do not exist.

- [ ] **Step 3: Create `20260927123000_add_authority_execution_foundations.sql`**

Create `public.authority_envelopes` with these required fields:

- identity: `id`, `project_id`, nullable `product_id`, nullable `job_id`;
- actor: `actor_type`, `actor_reference`, `accountable_human_user_id`;
- purpose and authority: `purpose`, `requested_autonomy`, nullable `granted_autonomy`, `allowed_consequence_classes text[]`;
- scope: `allowed_capability_keys text[]`, `allowed_tool_keys text[]`, `allowed_operation_keys text[]`, `allowed_target_types text[]`, `allowed_target_references text[]`, `allowed_data_classes text[]`, `allowed_purposes text[]`, `allowed_provider_keys text[]`;
- time/limits: `valid_from`, `expires_at`, nullable `max_operation_count`, `max_concurrent_executions`, `max_external_calls`, `max_retry_count`, `max_runtime_seconds`, `max_target_count`, `max_file_change_count`, `max_external_recipients`, `resource_limits jsonb`;
- safeguards: `require_capability_lease boolean`, `require_independent_approval boolean`, `reversibility`, nullable `exact_evidence_identity`;
- lifecycle/evidence: `version`, `status`, `rationale`, `evidence_reference`, `proposed_by`, nullable `approved_by`, nullable `approved_at`, nullable `status_reason`, nullable `supersedes_envelope_id`, timestamps.

Create `public.authority_approvals` with:

- `project_id`, `authority_envelope_id`, `approval_type`, `status`;
- `approver_user_id`;
- nullable `job_id`, `operation_key`, `target_type`, `target_reference`, `exact_evidence_identity`;
- `conditions jsonb`, `evidence_reference`, `expires_at`, `created_at`, nullable revocation fields.

Create `public.capability_leases` with:

- `project_id`, `authority_envelope_id`, nullable `job_id`;
- `capability_key`, nullable `capability_id`;
- `allowed_operations text[]`, `allowed_target_types text[]`, `allowed_target_references text[]`, `allowed_consequence_classes text[]`;
- `issued_at`, `expires_at`, `status`, `trace_identity`;
- nullable `max_operation_count`, `consumed_operation_count not null default 0`;
- `issued_by`, nullable revocation/supersession/evidence fields.

Create append-only `public.execution_authority_decisions` with:

- project/trace/route/actor/sponsor/Job references;
- envelope ID/version;
- `capability_lease_ids uuid[]`;
- operation/consequence/requested+granted autonomy;
- capability keys;
- breaker category/state;
- capability health summary;
- nullable Phase C decision/provider request/reservation references;
- exact evidence identity;
- enforcement mode;
- outcome/reason code;
- ceiling snapshot JSON;
- timestamp.

Add unique idempotency key:

```sql
unique(project_id,trace_id,route_key,requested_operation)
```

Create current-state `public.execution_circuit_breakers` with unique `(project_id,category)`, state/reason/evidence/actor/timestamps.

Add nullable columns to `public.runs`:

- `authority_envelope_id`;
- `execution_authority_decision_id`;
- `authority_trace_id`.

Do not delete/update historical runs.

Add project-scoped RLS SELECT policies using existing project-access helpers. Revoke direct authenticated/anon mutation. `execution_authority_decisions` grants service role SELECT+INSERT only, never UPDATE/DELETE.

Backfill four explicit breaker rows as `enabled` for every existing project. Add an AFTER INSERT project trigger that inserts the same four rows for future projects. The trigger only seeds explicit current breaker state; it does not create envelopes/leases.

- [ ] **Step 4: Run the schema test and verify GREEN**

Run the same Node test.

Expected: PASS.

- [ ] **Step 5: Run migration replay locally if available**

Run:

```bash
supabase db start
```

Expected: all historical migrations plus the new foundation migration apply cleanly. If local Supabase is unavailable, rely on the mandatory PR Migration Replay Validation gate in Task 6.

- [ ] **Step 6: Commit Task 1**

```bash
git add supabase/migrations/20260927123000_add_authority_execution_foundations.sql tests/unit/authority-execution-schema-source.test.mjs
git commit -m "feat: add Phase D authority execution foundations"
```

---

### Task 2: Governed Authority Operations and Evaluator

**Files:**
- Create: `supabase/migrations/20260927124000_add_authority_execution_governed_operations.sql`
- Create: `tests/unit/authority-execution-operations-source.test.mjs`

**Interfaces:**
- Consumes: Task 1 tables, existing `private.has_project_access`, `private.has_project_role`, `public.events`, `public.scheduler_policies`, `public.capabilities`, `public.reservations`, and Phase C `public.data_policy_decisions`.
- Produces: governed envelope/approval/lease/breaker/route-mode RPCs; `get_authority_execution_workspace_v1`; service evaluator; private helper used by Task 3.

Define these canonical helper contracts in this migration:

```sql
private.authority_autonomy_rank(target_autonomy text) returns integer
private.authority_minimum_autonomy(target_consequence text) returns text
private.authority_breaker_category(target_consequence text) returns text
private.authority_route_mode(target_project uuid,target_route_key text) returns text
private.authority_evaluate_execution_v1(
  target_project uuid,
  target_requesting_user uuid,
  target_route_key text,
  target_actor_type text,
  target_actor_reference text,
  target_job uuid,
  target_operation text,
  target_consequence_class text,
  target_requested_autonomy text,
  target_trace_id text,
  target_capability_keys text[],
  target_target_type text,
  target_target_reference text,
  target_exact_evidence_identity text,
  target_phase_c_decision uuid,
  target_provider_request uuid,
  target_require_reservation boolean,
  target_consume_operation boolean
) returns jsonb
```

`private.authority_evaluate_execution_v1` is the single policy algorithm. The public service wrapper and Task 3 Job transition adapter both call this helper; do not duplicate authority logic.

- [ ] **Step 1: Write failing operation-contract tests**

Pin:

- exact autonomy minimum mapping;
- same-rank consequence does not imply permission unless the requested class is in `allowed_consequence_classes`;
- project route mode defaults to `report_only`;
- route keys are only `external_ai_provider|job_start`;
- breaker category mapping;
- high-impact/self-widening approval rules;
- exact-action A4 approval identity;
- lease expiry/revocation/exhaustion;
- atomic idempotent counter consumption;
- reservation and lease are checked separately;
- automated breaker function can only move `enabled -> paused|blocked` or `paused -> blocked`, never to `enabled`;
- service evaluator is service-role-only;
- authenticated mutation RPCs are revoked from anon;
- decision records carry no raw subject/prompt content.

- [ ] **Step 2: Run operation tests and verify RED**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-operations-source.test.mjs
```

Expected: FAIL because governed operations are absent.

- [ ] **Step 3: Implement governed Authority Envelope RPCs**

Create exact public signatures:

```sql
propose_authority_envelope_v1(
  target_project uuid,
  target_actor_type text,
  target_actor_reference text,
  target_accountable_human_user uuid,
  target_purpose text,
  target_requested_autonomy text,
  target_allowed_consequence_classes text[],
  target_allowed_operation_keys text[],
  target_rationale text,
  target_product uuid default null,
  target_job uuid default null,
  target_allowed_capability_keys text[] default '{}',
  target_allowed_tool_keys text[] default '{}',
  target_allowed_target_types text[] default '{}',
  target_allowed_target_references text[] default '{}',
  target_allowed_data_classes text[] default '{}',
  target_allowed_purposes text[] default '{}',
  target_allowed_provider_keys text[] default '{}',
  target_valid_from timestamptz default null,
  target_expires_at timestamptz default null,
  target_limits jsonb default '{}'::jsonb,
  target_reversibility text default 'reversible',
  target_require_capability_lease boolean default true,
  target_require_independent_approval boolean default false,
  target_exact_evidence_identity text default null,
  target_evidence_reference text default null
) returns uuid

approve_authority_envelope_v1(
  target_envelope uuid,
  target_granted_autonomy text,
  target_conditions jsonb default '{}'::jsonb,
  target_evidence_reference text default null
) returns uuid

activate_authority_envelope_v1(target_envelope uuid) returns uuid
reject_authority_envelope_v1(target_envelope uuid,target_reason text) returns uuid
pause_authority_envelope_v1(target_envelope uuid,target_reason text) returns uuid
revoke_authority_envelope_v1(target_envelope uuid,target_reason text) returns uuid
```

Required validation:

- proposer is owner/admin/operator;
- accountable human is an active project member;
- human actor reference must identify an active project member;
- product/Job must belong to the same project;
- every requested consequence class is canonical;
- requested autonomy is at least the platform minimum for every requested consequence;
- `valid_from < expires_at` when expiry exists;
- all numeric limits are null or non-negative, with operation/concurrency/external-call/retry/runtime/target/file/recipient limits strictly positive when supplied;
- A4-class envelope or `require_independent_approval=true` cannot be approved by its proposer;
- `approve_authority_envelope_v1` records `approval_type='independent'` for A4/independent-review envelopes and `approval_type='ordinary'` otherwise;
- `granted_autonomy` cannot exceed requested autonomy;
- approval cannot add scope/operations/capabilities/consequence classes;
- activation requires approved state and an unexpired approval;
- machine/service role is never recorded as the human approver.

- [ ] **Step 4: Implement exact-action approval and Capability Lease RPCs**

Create:

```sql
record_exact_action_approval_v1(
  target_envelope uuid,
  target_job uuid,
  target_operation text,
  target_target_type text,
  target_target_reference text,
  target_exact_evidence_identity text,
  target_expires_at timestamptz,
  target_evidence_reference text default null
) returns uuid

revoke_authority_approval_v1(target_approval uuid,target_reason text) returns uuid

issue_capability_lease_v1(
  target_envelope uuid,
  target_capability_key text,
  target_allowed_operations text[],
  target_expires_at timestamptz,
  target_job uuid default null,
  target_capability uuid default null,
  target_allowed_target_types text[] default '{}',
  target_allowed_target_references text[] default '{}',
  target_allowed_consequence_classes text[] default '{}',
  target_max_operation_count integer default null,
  target_trace_identity text default null,
  target_evidence_reference text default null
) returns uuid

pause_capability_lease_v1(target_lease uuid,target_reason text) returns uuid
revoke_capability_lease_v1(target_lease uuid,target_reason text) returns uuid
```

V1 human lease issuance requires owner/admin. Lease scope must be a subset of the active parent envelope. Lease expiry may not exceed envelope expiry. Lease consequence/operation/target scope may only tighten.

A4 exact-action approval must match the evaluator's operation + target + exact evidence identity and be unexpired/unrevoked.

- [ ] **Step 5: Implement circuit-breaker and route-mode operations**

Create:

```sql
set_execution_circuit_breaker_v1(
  target_project uuid,
  target_category text,
  target_state text,
  target_reason text,
  target_evidence_reference text default null
) returns uuid

service_tighten_execution_circuit_breaker_v1(
  target_project uuid,
  target_category text,
  target_state text,
  target_reason text,
  target_trace_id text
) returns uuid

set_authority_execution_route_mode_v1(
  target_project uuid,
  target_route_key text,
  target_mode text,
  target_reason text,
  target_evidence_reference text default null
) returns text
```

Rules:

- owner/admin may mutate breaker/route mode;
- operator may not restore or widen;
- service function is service-role-only and accepts only `paused|blocked`;
- route mode accepts only `report_only|enforced`;
- store route state in the existing `scheduler_policies` table under policy keys `authority_execution:external_ai_provider` and `authority_execution:job_start`; each value is JSON with `mode`, `reason`, nullable `evidence_reference`, `updated_by`, and `updated_at`;
- missing route policy reads as `report_only`;
- every change emits an `EXECUTION_CIRCUIT_BREAKER_CHANGED` or `AUTHORITY_ROUTE_MODE_CHANGED` event with actor/reason/evidence;
- no function automatically flips a route to `enforced`.

- [ ] **Step 6: Implement `private.authority_evaluate_execution_v1`**

Resolution order must be:

1. validate requesting user has project access;
2. validate Job belongs to project when supplied;
3. validate route key, consequence, autonomy, operation, actor identity;
4. read route mode;
5. resolve active matching envelope: exact Job scope before project scope, same actor type/reference, purpose includes operation context, within valid time;
6. require requested consequence explicitly in envelope `allowed_consequence_classes`;
7. require requested autonomy >= platform minimum and <= granted autonomy;
8. apply breaker state;
9. for A4 consequence, require matching unexpired exact-action approval and exact evidence identity;
10. when envelope requires lease, resolve one active lease for every distinct requested capability key;
11. require operation/target/consequence to be within each matching lease;
12. reject expired/revoked/paused/exhausted lease;
13. validate capability records when a requested capability key matches `public.capabilities.capability`; `UNKNOWN|OFFLINE|DISABLED|EXHAUSTED|COOLDOWN` cannot execute;
14. when `target_require_reservation=true`, require active unexpired `public.reservations` coverage for each matching registered capability;
15. when `target_phase_c_decision` is supplied, require it belongs to project and its outcome is `allow`; Phase D never converts Phase C deny/review into permission;
16. when route mode is `enforced` and all checks allow and `target_consume_operation=true`, lock matching leases in deterministic capability-key order and atomically increment counters once per unique execution trace;
17. insert exactly one idempotent `execution_authority_decisions` record;
18. return computed `outcome` even in report-only mode plus `enforcement_mode`; callers decide whether report-only blocks.

For a repeated identical trace, return the existing decision and never consume counters twice.

When distinct concurrent traces race against the last remaining lease operation, only one may consume successfully.

- [ ] **Step 7: Create service wrapper and workspace read model**

Create:

```sql
service_evaluate_execution_authority_v1(
  target_project uuid,
  target_requesting_user uuid,
  target_route_key text,
  target_actor_type text,
  target_actor_reference text,
  target_job uuid,
  target_operation text,
  target_consequence_class text,
  target_requested_autonomy text,
  target_trace_id text,
  target_capability_keys text[] default '{}',
  target_target_type text default null,
  target_target_reference text default null,
  target_exact_evidence_identity text default null,
  target_phase_c_decision uuid default null,
  target_provider_request uuid default null,
  target_require_reservation boolean default false,
  target_consume_operation boolean default false
) returns jsonb

get_authority_execution_workspace_v1(target_project uuid) returns jsonb

get_job_execution_authority_summary_v1(
  target_project uuid,
  target_jobs uuid[]
) returns jsonb
```

Service evaluator: revoke from `public,anon,authenticated`; grant only `service_role`.

`get_job_execution_authority_summary_v1` is authenticated/read-only. It validates project access and returns an object keyed by Job UUID. Each entry contains exactly:

- `route_mode: report_only|enforced`;
- nullable `envelope_id` and `envelope_status`;
- `lease_states` keyed by required capability key;
- applicable `breaker_state`;
- nullable latest `decision_outcome` and `decision_reason_code`;
- `readiness: not_evaluated|report_only|ready_for_check|approval_required|lease_missing|lease_expired|paused|blocked`.

This summary never consumes lease counters and never claims `Authorized` unless the latest matching enforced `job_start` decision is `allow`; otherwise `ready_for_check` means only that visible prerequisites appear present and execution must still reevaluate server-side.

Workspace JSON must include:

- `envelopes`;
- `approvals`;
- `leases`;
- `circuit_breakers`;
- recent `decisions`;
- route modes for both V1 route keys;
- recent project Jobs needed by the UI;
- `can_propose`;
- `can_approve`;
- `can_control`.

Do not expose secrets/provider credentials.

- [ ] **Step 8: Run operation tests and full unit suite**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-operations-source.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add supabase/migrations/20260927124000_add_authority_execution_governed_operations.sql tests/unit/authority-execution-operations-source.test.mjs
git commit -m "feat: add governed Phase D authority operations"
```

---

### Task 3: Existing Execution Route Adapters

**Files:**
- Create: `supabase/migrations/20260927125000_add_authority_execution_route_adapters.sql`
- Modify: `supabase/functions/datanest-ai-chat/index.ts`
- Create: `tests/unit/authority-execution-route-source.test.mjs`
- Modify: `tests/unit/datanest-ai-trust-policy-source.test.mjs`

**Interfaces:**
- Consumes: Task 2 `private.authority_evaluate_execution_v1`, `service_evaluate_execution_authority_v1`, route modes, existing Phase C service evaluator, existing `service_authorize_ai_request`, existing `transition_job_status(uuid,text)`.
- Produces: report-only/enforceable authority checks for `job_start` and `external_ai_provider` without changing default production behavior.

- [ ] **Step 1: Write failing route-order and fail-closed tests**

Pin:

```js
test("external AI order is Phase C then Phase D then existing provider authorization",()=>{});
test("Phase D report-only records but never widens an existing provider denial",()=>{});
test("Phase D enforced denial prevents external provider call and preserves embedded fallback",()=>{});
test("RESERVED to RUNNING evaluates job_start authority before state transition",()=>{});
test("job_start report-only keeps current transition behavior but records the computed decision",()=>{});
test("job_start enforced requires authority plus active reservation coverage",()=>{});
test("non RUNNING job transitions preserve the existing state machine",()=>{});
```

Also pin that no route auto-creates an Authority Envelope or Capability Lease.

- [ ] **Step 2: Run route tests and verify RED**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-route-source.test.mjs tests/unit/datanest-ai-trust-policy-source.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Override `transition_job_status(uuid,text)` additively**

In the new migration, `CREATE OR REPLACE` the existing signature; do not edit the historical migration.

The replacement remains the same public signature and authenticated grant, but becomes `SECURITY DEFINER SET search_path=public,private,auth` so it can call the revoked private evaluator. It must explicitly require `auth.uid()` and re-run the existing `private.has_project_role(...,array['owner','admin','operator'])` check before any transition. Revoke from `public,anon`; grant to `authenticated` only.

Preserve all current transitions and role checks.

Only for `RESERVED -> RUNNING`:

- route key: `job_start`;
- actor type: `human`;
- actor reference/requesting user: `auth.uid()::text`;
- operation: `job_start`;
- consequence: `resource_execution`;
- requested autonomy: `A3`;
- capability keys: every distinct string in `jobs.required_capabilities`;
- target type/reference: `job` / Job UUID text;
- require reservation: true;
- consume operation: true.

Call `private.authority_evaluate_execution_v1`.

If mode is `enforced` and outcome is not `allow`, reject before updating Job status. If `report_only`, preserve the current transition but retain the computed decision record.

Keep the existing function signature so current UI/callers continue to work.

- [ ] **Step 4: Add external-provider Phase D evaluation**

In `datanest-ai-chat/index.ts`, after Phase C provider-processing evaluation succeeds/records and before `service_authorize_ai_request`, call:

```ts
service_evaluate_execution_authority_v1({
  target_project: job.project_id,
  target_requesting_user: user.id,
  target_route_key: "external_ai_provider",
  target_actor_type: "service",
  target_actor_reference: "datanest-ai",
  target_job: job.id,
  target_operation: "external_provider_call",
  target_consequence_class: "resource_execution",
  target_requested_autonomy: "A3",
  target_trace_id: stagedInputTraceId,
  target_capability_keys: ["external_ai:"+providerKey],
  target_target_type: "provider",
  target_target_reference: providerKey,
  target_exact_evidence_identity: null,
  target_phase_c_decision: phaseCPolicy.decision_record_id ?? null,
  target_provider_request: activeRequestId,
  target_require_reservation: false,
  target_consume_operation: true
})
```

Required behavior:

- Phase C denial/review remains authoritative;
- Phase D `report_only`: record computed authority state, then continue to existing provider authorization;
- Phase D `enforced` + non-allow: finish usage request as denied with authority reason, do not call provider, and preserve existing safe embedded fallback;
- existing `service_authorize_ai_request` still runs and remains authoritative whenever the route reaches it;
- no Phase D result may turn existing provider authorization denial into allow;
- no automatic envelope/lease creation.

- [ ] **Step 5: Run route, AI, type, and Edge Function checks**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-route-source.test.mjs tests/unit/datanest-ai-trust-policy-source.test.mjs
npm test
npm run check
deno check supabase/functions/datanest-ai-chat/index.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add supabase/migrations/20260927125000_add_authority_execution_route_adapters.sql supabase/functions/datanest-ai-chat/index.ts tests/unit/authority-execution-route-source.test.mjs tests/unit/datanest-ai-trust-policy-source.test.mjs
git commit -m "feat: enforce Phase D authority on selected routes"
```

---

### Task 4: Governance Authority & Execution Workspace

**Files:**
- Create: `src/lib/authorityExecution.ts`
- Create: `src/components/AuthorityExecutionPanel.tsx`
- Modify: `src/components/GovernanceWorkspace.tsx`
- Modify: `src/components/DataNestApp.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/unit/authority-execution-ui-source.test.mjs`

**Interfaces:**
- Consumes: Task 2 workspace/mutation RPCs and existing Governance role/current-user props.
- Produces: `AuthorityExecutionPanel({projectId,currentUserId,role,setNotice,setError})`; third Governance route `?view=governance&section=authority`; scheduler authority-state presentation.

- [ ] **Step 1: Write failing UI source-contract tests**

Pin:

- `authorityExecution.ts` exports exact autonomy/consequence/breaker/route option values and label helper;
- Governance section union becomes `"sovereign"|"trust"|"authority"`;
- third tab label is exactly `Authority & Execution`;
- deep link uses `section=authority`;
- panel props include project ID, current user ID, role, notice/error callbacks;
- UI explicitly says `Capability Lease is permission; capacity reservation is resource allocation.`;
- `AVAILABLE` is never rendered as synonymous with `Authorized`;
- viewer has no mutation controls;
- operator may propose but not approve/control;
- owner/admin controls correspond to backend RPCs;
- self-authored independent/A4 approval controls are pre-disabled when workspace data proves the conflict;
- route mode visibly distinguishes `Report only` and `Enforced`;
- expired/revoked/exhausted lease is visibly non-authorizing;
- no secret fields exist.

- [ ] **Step 2: Run UI source test and verify RED**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-ui-source.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/authorityExecution.ts`**

Export:

```ts
export type AuthorityExecutionRole="owner"|"admin"|"operator"|"viewer";
export const autonomyLevels=["A0","A1","A2","A3","A4"] as const;
export const consequenceClasses=[/* exact 13 spec values */] as const;
export const breakerCategories=["autonomous_writes","external_communications","deployments","resource_execution"] as const;
export const authorityRouteKeys=["external_ai_provider","job_start"] as const;
export function authorityExecutionLabel(value:string):string;
```

This module is presentation/domain vocabulary only. Do not implement authorization logic in the browser.

- [ ] **Step 4: Implement `AuthorityExecutionPanel.tsx`**

Exact props:

```ts
{
  projectId:string;
  currentUserId:string;
  role:AuthorityExecutionRole;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
}
```

Load `get_authority_execution_workspace_v1`.

Render:

- boundary warning card;
- current route modes;
- four circuit breakers;
- active/proposed envelopes;
- approval state;
- active/history leases;
- remaining operation counters;
- recent decisions with outcome/reason;
- recent Jobs for envelope selection;
- explicit capacity-reservation vs Capability-Lease explanation.

Mutation controls:

- operator/owner/admin: propose envelope;
- owner/admin: approve/activate/reject/pause/revoke envelope;
- owner/admin: record exact-action approval;
- owner/admin: issue/pause/revoke Capability Lease;
- owner/admin: set breaker state;
- owner/admin: set route mode.

Forms must not accept credentials/secrets.

Do not add destructive/production/legal/financial action buttons.

- [ ] **Step 5: Add the Governance section**

In `GovernanceWorkspace.tsx`:

- add `AuthorityExecutionPanel`;
- parse `section=authority`;
- add third tab;
- preserve Sovereign Governance as default;
- preserve Trust & Data Policy deep link;
- avoid loading Sovereign Governance RPC while another section is selected.

- [ ] **Step 6: Add scheduler authority presentation without creating permission**

In `DataNestApp.tsx`, load `get_job_execution_authority_summary_v1(project.id,currentPageJobIds)` when the scheduler page/job set changes. Keep this summary separate from capability health and from the Job objects.

The scheduler header/rows may show:

- `Authority not evaluated`;
- `Report only`;
- `Ready for authority check`;
- `Authorized` only when the latest matching enforced decision is `allow`;
- `Approval required`;
- `Lease missing/expired`;
- `Paused by policy`.

Do not derive `Authorized` from `capabilities.state==="AVAILABLE"`.

Do not change existing queue/Gantt sorting/filtering or job-state controls.

- [ ] **Step 7: Add minimal CSS**

Add focused classes for:

- authority boundary card;
- autonomy/consequence badges;
- route mode;
- breaker state;
- lease vs reservation distinction;
- decision reason display;
- responsive panel behavior.

Reuse existing panel/table/badge patterns where practical.

- [ ] **Step 8: Run UI, TypeScript, and full unit tests**

```bash
node --test --experimental-strip-types tests/unit/authority-execution-ui-source.test.mjs
npm test
npm run check
```

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/lib/authorityExecution.ts src/components/AuthorityExecutionPanel.tsx src/components/GovernanceWorkspace.tsx src/components/DataNestApp.tsx src/app/globals.css tests/unit/authority-execution-ui-source.test.mjs
git commit -m "feat: add Authority and Execution governance workspace"
```

---

### Task 5: Browser Acceptance, Documentation, and PR Gate Coverage

**Files:**
- Create: `tests/browser/authority-execution.spec.ts`
- Modify: `tests/browser/transcheduler-project-gantt.spec.ts`
- Modify: `.github/workflows/pr-verification.yml`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/UX_WORKFLOW_ARCHITECTURE.md`
- Modify: `tests/unit/ecosystem-authority-contract.test.mjs`

**Interfaces:**
- Consumes: Tasks 1-4 complete feature and existing browser fixture pattern.
- Produces: browser regression evidence, PR-gate inclusion, architecture/UX truth aligned to implemented Phase D.

- [ ] **Step 1: Write failing Playwright acceptance**

Create fixture data for:

- one active A3 service envelope;
- one proposed A4 envelope authored by the current user and requiring independent review;
- one active lease;
- one expired lease;
- four breaker states;
- route modes `external_ai_provider=report_only`, `job_start=enforced`;
- recent authority decisions.

Tests:

1. Sovereign Governance remains the default section.
2. `section=authority` deep-links to Authority & Execution.
3. Viewer sees authority state but no mutation controls.
4. Operator can propose but cannot approve/control route/breaker state.
5. Owner sees approval/control actions.
6. Self-authored independent/A4 approval is disabled and explains why.
7. Expired/revoked lease is not presented as authorization.
8. Breaker `paused` explains that execution is stopped while safe observation remains.
9. Route `report_only` is visibly not enforced authorization.
10. UI distinguishes Capability Lease from capacity reservation.

- [ ] **Step 2: Extend TranScheduler browser fixture**

In `transcheduler-project-gantt.spec.ts` add fixture authority state and assert:

- AVAILABLE resource count remains a resource-health presentation;
- no text equates AVAILABLE with authorized execution;
- an enforced `job_start` route with missing/expired authority displays blocked/not-authorized readiness while preserving queue/Gantt UI;
- existing priority/sort/mobile assertions remain unchanged.

- [ ] **Step 3: Run targeted browser tests and verify GREEN after Task 4 implementation**

```bash
npx playwright test tests/browser/authority-execution.spec.ts tests/browser/transcheduler-project-gantt.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 4: Add Phase D browser test to PR Verification**

Append `tests/browser/authority-execution.spec.ts` to the existing explicit browser list in `.github/workflows/pr-verification.yml`.

Do not remove any existing browser suite.

- [ ] **Step 5: Update architecture truth**

`docs/ARCHITECTURE.md` must state only what Phase D actually implements:

- Authority Envelope;
- human approval evidence;
- Capability Lease;
- route-specific report-only/enforced authority evaluation;
- circuit breakers;
- execution decisions;
- selected Job/provider adapters.

Keep Phase E generalized node/resource fabric and Phase F ILM as target state/not yet live.

`docs/UX_WORKFLOW_ARCHITECTURE.md` must record:

- Governance sections: Sovereign Governance, Trust & Data Policy, Authority & Execution;
- `Capability Lease != capacity reservation`;
- AVAILABLE resource != execution permission.

- [ ] **Step 6: Pin hierarchy/billing/target-state compatibility**

Extend `ecosystem-authority-contract.test.mjs` to assert:

- Phase D docs do not make RONSAS the authority owner;
- billing-off canonical copy remains;
- Phase E Resource Fabric and ILM remain target state;
- docs do not claim destructive/legal/financial execution was enabled.

- [ ] **Step 7: Run docs/unit/browser verification**

```bash
npm test
npm run check
npx playwright test tests/browser/authority-execution.spec.ts tests/browser/transcheduler-project-gantt.spec.ts tests/browser/trust-policy.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add tests/browser/authority-execution.spec.ts tests/browser/transcheduler-project-gantt.spec.ts .github/workflows/pr-verification.yml docs/ARCHITECTURE.md docs/UX_WORKFLOW_ARCHITECTURE.md tests/unit/ecosystem-authority-contract.test.mjs
git commit -m "test: verify Phase D authority execution controls"
```

---

### Task 6: Whole-Branch Verification and Review Gate

**Files:**
- No product source changes unless verification exposes a defect.
- Update the implementation ledger/PR description only if the execution workflow uses one.

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: exact-head evidence that Phase D is implementation-complete and ready for the merge-review gate; does not merge or deploy by itself.

- [ ] **Step 1: Run complete local verification**

```bash
npm test
npm run check
npm run build
npx playwright test tests/browser/auth.smoke.spec.ts tests/browser/home-optimization.spec.ts tests/browser/products.spec.ts tests/browser/portfolio-registry.spec.ts tests/browser/trust-policy.spec.ts tests/browser/authority-execution.spec.ts tests/browser/datanest-ai-layout.spec.ts tests/browser/datanest-ai-recovery.spec.ts tests/browser/transcheduler-project-gantt.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 2: Run Edge Function validation locally where available**

```bash
deno check supabase/functions/datanest-ai-chat/index.ts
```

Expected: PASS.

- [ ] **Step 3: Verify migration replay**

If local Supabase is available:

```bash
supabase db start
```

Expected: the complete historical chain through `20260927125000_add_authority_execution_route_adapters.sql` applies from a fresh database.

The PR must also obtain a green **Migration Replay Validation** workflow.

- [ ] **Step 4: Verify exact-head GitHub gates**

The exact PR head must show green:

- CI;
- PR Verification;
- Migration Replay Validation;
- Edge Function Validation;
- DataNest AI Certification.

Do not carry forward a green result from an older SHA.

- [ ] **Step 5: Perform whole-branch review against the Phase D spec**

Review `main...feature/datanest-phase-d-authority-execution` for:

- no upstream authority widening;
- A4 exact human approval;
- no self-escalation;
- consequence class explicitly allowed, not inferred only by rank;
- lease and reservation separation;
- report-only default;
- route-specific enforcement only;
- atomic/idempotent lease counters;
- breaker tightening/restoration rules;
- no secrets in authority records;
- no destructive/legal/financial executor added;
- no Phase E/F implementation creep;
- RONSAS hierarchy and billing-off unchanged.

Fix any High/Medium findings with RED→GREEN tests, then repeat exact-head gates.

- [ ] **Step 6: Present the implementation result and stop at the merge gate**

Report:

- feature branch;
- exact verified SHA;
- changed-file scope;
- five workflow results;
- review findings/resolutions;
- whether the implementation matches the approved spec.

Do **not** merge, deploy, enable an enforced production route, or flip production breaker/authority settings without the next explicit programme decision.

---

## Plan Self-Review

### Spec coverage

- Authority Envelope identity/scope/limits/lifecycle: Task 1 + Task 2.
- A0-A4 autonomy and consequence separation: Task 1 + Task 2.
- Human accountability, independent review, A4 exact approval: Task 2 + Task 4.
- Capability Lease lifecycle, renewal limits, counters, revocation: Task 1 + Task 2.
- Capacity reservation separation: Tasks 1-5.
- Circuit breakers and automation-tighten-only rule: Task 1 + Task 2 + Task 4.
- Route-specific report-only/enforced rollout: Task 2 + Task 3 + Task 4.
- Scheduler/Job boundary: Task 3.
- Provider execution boundary: Task 3.
- Phase C preservation: Task 2 + Task 3 tests.
- Governance UX: Task 4 + Task 5.
- Audit/decision evidence: Task 1 + Task 2.
- Time/idempotency/concurrency ceilings: Task 2.
- Exact evidence identity: Task 2.
- Local sovereignty/Phase E deferral: docs and compatibility tests in Task 5.
- No destructive/legal/financial/billing expansion: Global Constraints + Tasks 2/5/6.
- Verification and exact-head evidence: Task 6.

No approved Phase D requirement is intentionally omitted.

### Step scan

Each task owns one reviewable deliverable and its RED→GREEN cycle:

1. storage/security foundation;
2. governed authority algorithm/RPCs;
3. execution adapters;
4. Governance/UI;
5. browser/docs/CI acceptance;
6. whole-branch verification.

No task requires the implementer to invent a public signature or controlled vocabulary.

### Type/signature consistency

- `AuthorityExecutionPanel` props match Governance inputs.
- Route keys/circuit-breaker/autonomy/consequence values are identical across SQL, UI vocabulary, tests, and browser fixtures.
- Both selected routes call the same database authority algorithm.
- External AI remains Phase C -> Phase D -> existing provider authorization.
- `transition_job_status(uuid,text)` keeps its existing public signature.

### Review Focus coverage

1. Partial authority state under enforced mode: Task 2 evaluator tests + Task 3 route tests.
2. Same-rank consequence mismatch: Task 2 evaluator test.
3. Concurrent/idempotent lease consumption: Task 2 evaluator tests.
4. Circuit-breaker recovery: Task 2 operations tests + Task 4/5 UI acceptance.
5. Exact-action substitution: Task 2 exact-action tests + Task 6 review.

### Proportion

The plan fixes interfaces, values, test expectations, and route order but leaves implementation bodies to the executor. The SQL evaluator algorithm is specified only where ordering/idempotency/security decisions cannot safely be invented during implementation.
