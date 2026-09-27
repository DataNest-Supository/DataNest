# DataNest Phase D — Authority and Execution Controls

**Date:** 2026-09-27  
**Repository:** DataNest-Supository/DataNest  
**Branch:** `feature/datanest-phase-d-authority-execution-controls`  
**Design status:** Authorized for implementation by user instruction on 2026-09-27  
**Parent authority:** `docs/superpowers/specs/2026-09-27-datanest-ecosystem-business-operating-architecture-design.md`  
**Phase dependency:** Phase A, Phase B, and Phase C merged to `main` and exact-head verified  
**Scope:** Authority Envelope representation, bounded autonomy, authorization Capability Leases, execution circuit breakers, scheduler integration, and auditable service-side authorization without weakening existing RLS/RBAC, Trust & Data Policy, Job controls, or capacity reservations

## 1. Purpose

Phase D converts the master architecture's authority and execution model into a concrete governed control layer.

The phase establishes:

1. an **Authority Envelope** that binds actor, accountable human sponsor, Job/project/product context, purpose, permitted capabilities, permitted operations, data scope, autonomy level, resource ceiling, time boundary, approval state, reversibility, evidence requirements, and trace identity;
2. a short-lived **Capability Lease** that grants bounded authorization for a specific existing DataNest capability under one approved Authority Envelope;
3. **execution circuit breakers** that can halt categories of autonomous action without disabling safe read-only platform functions;
4. an append-only **execution authority decision record** for service-side allow/deny/review-required outcomes;
5. scheduler and capacity-reservation integration that keeps authorization authority distinct from resource capacity.

Phase D is additive. It does not replace project membership, Job collaboration, Phase C data policy, provider trust, AI budgets, resource reservations, or human-controlled Job transitions.

## 2. Existing authority preserved

Phase D extends but does not replace:

- project membership, RLS, RBAC, and Job collaboration;
- `private.has_project_role(...)` and related project-access helpers;
- `transition_job_status(...)` as an explicit authenticated human-control path;
- `reservations` as capacity/resource reservations;
- `capabilities` as the current project capability inventory;
- DataNest AI provider authorization and budget controls;
- Phase C `service_evaluate_data_policy_v1(...)` and all visibility/reuse/provider-trust decisions;
- certified-memory and learning exclusions;
- product/portfolio governance;
- audit history and exact-artifact promotion;
- free-promotion / billing-off state.

A Phase D allow decision can never manufacture project access, data access, provider permission, publication permission, learning permission, product ownership, legal authority, or financial authority.

## 3. Canonical autonomy model

Phase D implements the already-approved autonomy levels:

- **A0 Observe** — retrieve, monitor, inspect, summarize;
- **A1 Advise** — analyze and recommend;
- **A2 Prepare** — draft actionable work but require approval before execution;
- **A3 Execute** — perform bounded, reversible work when delegated policy allows it;
- **A4 High-impact** — legal, financial, ownership, destructive, constitutional, or materially irreversible action requiring explicit authorized human approval.

Phase D v1 treats A4 as **human-gated and non-autonomous**. It may be represented and reviewed, but the generic automated lease issuer must not create an execution lease that authorizes `destruct`, legal/financial/ownership mutation, or constitutional action.

## 4. Permission gradient

Controlled operation classes are:

- `observe`
- `prepare`
- `write`
- `execute`
- `promote`
- `destruct`

The minimum autonomy ceiling is:

- A0 → observe only;
- A1 → observe;
- A2 → observe + prepare;
- A3 → observe + prepare + write + execute, with optional `promote` only when explicitly approved by policy and the target is reversible/promotable;
- A4 → representation/review only in Phase D v1; generic automated `destruct` is denied.

No operation is inferred merely from a role, capability name, provider, or Job status.

## 5. Authority Envelope

### 5.1 Purpose

An Authority Envelope is a versioned, attributable execution-authorization object. It is not a credential container and does not contain passwords, API keys, cookies, PATs, MFA recovery material, or service-role secrets.

### 5.2 Target fields

`public.authority_envelopes` should capture at least:

- `id uuid primary key`
- `project_id uuid not null`
- `product_id uuid null`
- `job_id uuid not null`
- `actor_type text not null`
- `actor_user_id uuid null`
- `actor_key text not null`
- `sponsor_user_id uuid not null`
- `purpose text not null`
- `autonomy_level text not null`
- `permitted_capabilities text[] not null`
- `permitted_operations text[] not null`
- `data_scope jsonb not null`
- `resource_ceiling jsonb not null`
- `reversibility text not null`
- `evidence_requirements jsonb not null`
- `approval_state text not null`
- `trace_key text not null`
- `effective_from timestamptz null`
- `expires_at timestamptz not null`
- `created_by uuid not null`
- `approved_by uuid null`
- `approved_at timestamptz null`
- `revoked_by uuid null`
- `revoked_at timestamptz null`
- `revocation_reason text null`
- `created_at timestamptz not null`

Controlled actor types for v1:

- `human`
- `agent`
- `application`
- `model`
- `service`
- `workflow`

Controlled approval states:

- `draft`
- `approved`
- `rejected`
- `revoked`
- `expired`

Controlled reversibility:

- `reversible`
- `conditionally_reversible`
- `irreversible`

### 5.3 Sponsor rules

Every non-human actor requires a current active human project member as accountable sponsor.

A human actor may sponsor their own A0-A2 routine envelope if role and project policy permit.

A3 approval requires owner/admin authority and independent review from the envelope author when the author is also the proposed sponsor.

A4 approval requires an owner, explicit evidence, and a separate approver from the envelope creator. A4 does not produce a generic automated execution lease in Phase D v1.

### 5.4 Time and ceiling rules

Every envelope expires.

`resource_ceiling` must support bounded keys including:

- `max_duration_seconds`
- `max_operations`
- `max_cost_minor`
- `max_concurrency`
- `blast_radius`

Missing ceiling data for A3/A4 fails closed.

## 6. Capability Lease

### 6.1 Distinction from reservations

Existing `reservations` are **capacity reservations**: they reserve a capability resource for a Job.

A Phase D `capability_lease` is an **authorization lease**: it says a particular actor is allowed to perform particular operations with that capability for a bounded time and resource ceiling.

Neither substitutes for the other.

Future automated execution may require both:

1. a valid authorization Capability Lease; and
2. sufficient resource capacity / reservation state.

### 6.2 Target fields

`public.capability_leases` should capture:

- `id uuid primary key`
- `project_id uuid not null`
- `authority_envelope_id uuid not null`
- `job_id uuid not null`
- `capability_id uuid not null`
- `actor_key text not null`
- `allowed_operations text[] not null`
- `data_scope jsonb not null`
- `resource_ceiling jsonb not null`
- `approval_level text not null`
- `trace_key text not null`
- `status text not null`
- `max_operations integer not null`
- `used_operations integer not null default 0`
- `expires_at timestamptz not null`
- `issued_by uuid not null`
- `issued_at timestamptz not null`
- `last_used_at timestamptz null`
- `released_at timestamptz null`
- `release_reason text null`

Controlled status:

- `active`
- `released`
- `expired`
- `revoked`
- `exhausted`

A lease may only be issued against an approved, unexpired Authority Envelope and a same-project capability whose name appears in the envelope.

## 7. Circuit breakers

`public.execution_circuit_breakers` provides project-scoped emergency controls for:

- `autonomous_write`
- `deployment`
- `external_communication`
- `resource_execution`

State values:

- `open` — normal evaluation;
- `halted` — category denied until explicitly reopened.

Owner/admin authority is required to change breaker state.

Breaking one category must not disable safe A0/A1 read-only behavior unless the requested operation itself belongs to that halted category.

## 8. Execution authority decisions

`public.execution_authority_decisions` is append-only evidence for service-side decisions.

It records:

- project;
- Job;
- actor;
- sponsor;
- envelope;
- lease;
- capability;
- requested operation;
- purpose;
- autonomy level;
- outcome `allow|deny|review_required`;
- reason code;
- breaker snapshot;
- capability-health snapshot;
- resource-ceiling / usage snapshot;
- trace identity;
- created timestamp.

Authenticated clients receive governed read access for their project but no direct insert/update/delete access.

Only the service-role evaluator records these decisions.

## 9. Service-side evaluator

Phase D adds a service-only RPC similar in shape to the Phase C evaluator:

`service_authorize_execution_v1(...)`

Required inputs include:

- project;
- Job;
- actor key;
- requested capability or capability id;
- requested operation;
- purpose;
- trace id;
- Authority Envelope id;
- Capability Lease id.

The evaluator must fail closed when:

- project/Job/capability/envelope/lease identities disagree;
- project or Job is not active/eligible;
- sponsor is no longer an active project member;
- envelope is not approved or is expired/revoked;
- lease is not active, is expired, or is exhausted;
- requested operation or capability is outside envelope/lease scope;
- autonomy level is insufficient;
- A4/high-impact action is requested through the generic automated path;
- a relevant circuit breaker is halted;
- capability is disabled, offline, exhausted, unknown where current health is required, or has no available concurrency;
- required resource-ceiling state is absent or exceeded.

The evaluator records the decision before returning.

An allowed operation atomically increments lease usage to prevent race-driven overuse.

## 10. Human control and automated control

Phase D deliberately preserves two paths:

### Human control

Existing authenticated operators may continue to use governed UI/RPC paths such as `transition_job_status(...)`.

These actions remain attributable human-control events and are not silently reclassified as autonomous execution.

### Automated execution

A service, workflow, agent, application, or future scheduler worker performing A3 execution must use `service_authorize_execution_v1(...)` before the side effect.

The generic service evaluator is not a replacement for Phase C data policy, AI provider authorization, billing/budget controls, or resource reservation.

## 11. Scheduler integration

TranScheduler gains an **Authority & Execution** surface that shows:

- autonomy legend A0-A4;
- active/draft/revoked/expired envelopes;
- active capability leases and remaining operation budget;
- circuit-breaker state;
- current capability health;
- explicit warning that resource reservations are capacity, not authorization.

The normal queue/Gantt experience remains the default and existing human Pause/Resume/Cancel controls remain unchanged.

Operators may propose bounded A0-A3 envelopes.

Owners/admins may approve/revoke A3 envelopes, issue/release leases, and change circuit breakers.

A4 is visible as human-gated; no generic automated lease action is exposed.

## 12. RLS and grants

All Phase D public tables use project-scoped RLS.

- project members may read project authority state;
- authenticated direct table mutation is denied;
- governed RPCs are the authenticated mutation path;
- service-only evaluator RPCs are revoked from `public`, `anon`, and `authenticated`;
- explicit table/function grants are included because Supabase is moving Data API exposure to opt-in;
- private helpers are not exposed.

Security-definer functions are used only where necessary, with explicit caller/role checks, fixed search paths, and revoked default EXECUTE privileges.

## 13. Audit and trace requirements

Every envelope proposal/approval/revocation, lease issuance/release, breaker change, and execution authorization decision emits a traceable project event.

Trace identity must be stable enough to relate:

- envelope;
- lease;
- Job;
- capability;
- execution authority decision;
- later run/reservation/output evidence.

Phase D does not implement the Phase H Outcome Ledger.

## 14. Compatibility requirements

Phase D must preserve:

- all existing browser workflows;
- current Job creation and human status transitions;
- Phase C trust/data policy behavior;
- DataNest AI inference and certified-memory flow;
- Product Registry and Portfolio Registry;
- GitHub Pages deployment;
- existing `reservations` semantics;
- billing disabled/free-promotion state.

No historical migration is rewritten.

## 15. Non-goals

Phase D does not implement:

- Cloud-Nest;
- Supository;
- Resource Fabric generalization;
- Capability Graph;
- ILM-1;
- Outcome Ledger or Shadow Economics;
- unrestricted remote computer control;
- generic secret storage;
- arbitrary credential delegation;
- autonomous A4 destruction;
- legal, financial, ownership, or constitutional rights;
- automatic production deployment by newly created agents;
- billing changes.

## 16. Acceptance criteria

Phase D v1 is complete only when evidence shows that:

1. Authority Envelopes are project/Job scoped, attributable, bounded, expiring, and role governed.
2. A3 execution requires explicit approved authority and a short-lived authorization Capability Lease.
3. A4 cannot be converted into generic autonomous execution.
4. Capability Leases and resource reservations remain distinct.
5. Circuit breakers can halt autonomous writes/deployments/external communications/resource execution without disabling safe read-only use.
6. The service evaluator is fail-closed and append-only decisions are recorded.
7. Direct authenticated mutation of authority tables is blocked.
8. Existing human scheduler controls remain functional.
9. Phase C and existing provider/budget/file authorization remain independent prerequisites.
10. Unit, migration replay, type/build, browser verification, and DataNest AI certification pass on the exact implementation head.
11. No billing, destructive migration, or target-state marketing claim is introduced.
