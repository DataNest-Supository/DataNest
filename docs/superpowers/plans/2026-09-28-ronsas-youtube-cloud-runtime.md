# YouTube Optimizer Cloud Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run YouTube Optimizer's SSR, auth, data, and a real optimization workflow from DataNest-managed cloud services with no Ealiophin dependency.

**Architecture:** Keep the imported TanStack Start server in `apps/ronsas/youtube-optimizer`. Replace its loopback sovereign gateway dependencies with an authenticated DataNest cloud adapter and migrate required product data to Supabase with project/user authorization; expose the app only through the same-origin gateway in the delivery plan. Unsupported AI capabilities fail visibly and do not masquerade as completed optimizations.

**Tech Stack:** Bun 1.3.14, TanStack Start, Supabase Auth/Postgres/Storage, Node/TypeScript tests, browser acceptance.

**Spec:** `docs/superpowers/specs/2026-09-28-datanest-only-ronsas-runtime-design.md`

## Global Constraints

- All source and release control in `DataNest-Supository/DataNest`; no local runtime fallback in production.
- Keep privileged Supabase keys server-only; enforce user/project authorization and RLS for exposed data.
- Free promotion and `billing_enabled=false`; no paid checkout.
- Trust/data, execution authority, provider budget, and human approval gates remain independent prerequisites.
- Use current Supabase docs/changelog and generate migrations via the supported CLI workflow before schema changes.

## Review Focus

- Missing backend configuration fails closed for writes and exposes a clear health state (Task 1 test).
- Forged user/project identifiers cannot cross tenant boundaries (Task 2 SQL and API tests).
- Expired/revoked sessions cannot mutate data through the server route (Task 2 test).
- Missing YouTube API or AI provider returns an actionable unavailable result without fabricated output (Task 3 test).
- Nested route reload and cookie scope work behind `/apps/youtube-optimizer/` (Task 4 browser test).

---

### Task 1: Dependency inventory and fail-closed adapter boundary

**Files:**
- Create: `apps/ronsas/youtube-optimizer/src/lib/datanest-cloud.server.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/lib/rons-local-proxy.server.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/routes/api/rons/db.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/lib/rons-ai.server.ts`
- Create: `apps/ronsas/youtube-optimizer/src/test/datanest-cloud.test.ts`
- Create: `docs/ronsas-youtube-cloud-dependencies.md`

**Interfaces:**
- Produces: `getCloudRuntime(): CloudRuntime` with explicit `auth`, `data`, `ai`, and `storage` capability availability; `CloudUnavailableError` for missing required capability.
- Inventory every `/api/rons/*` route and server function before replacing a dependency. A cloud service URL must be HTTPS or private-service DNS, never an implicit loopback default.

- [ ] Write tests for missing config, forbidden loopback in production, and a configured private cloud capability.
- [ ] Run `bun test src/test/datanest-cloud.test.ts`; verify expected failures.
- [ ] Implement the cloud boundary, remove production loopback defaults, and document route-to-capability mapping and existing data fields.
- [ ] Run focused tests, `bun run typecheck`, and `bun run test`; require exit 0.
- [ ] Commit the boundary and inventory.

### Task 2: Authenticated data migration

**Files:**
- Create: a Supabase migration under `supabase/migrations` using `supabase migration new`.
- Create: `tests/sql/ronsas_youtube_cloud_acceptance.sql`
- Modify: `apps/ronsas/youtube-optimizer/src/integrations/supabase/client.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/routes/api/rons/db.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/lib/rons-local-proxy.server.ts`
- Create: `apps/ronsas/youtube-optimizer/src/test/cloud-auth-data.test.ts`

**Interfaces:**
- Consumes: Task 1 cloud capability boundary.
- Produces: server-verified session context `{ userId: string; projectId: string }` and allowlisted data operations with no caller-supplied privileged identity.

- [ ] Write failing SQL/API tests for owner read/write, cross-project denial, anonymous denial, revoked session, and disallowed table/column/procedure access.
- [ ] Run focused tests against a disposable governed database; verify authorization failures are caught before implementation.
- [ ] Add the minimal schema/RLS/policies and adapter; migrate existing data with row counts and reversible mapping evidence. Do not use a service-role key in a browser.
- [ ] Run SQL acceptance, Supabase advisors, focused tests, `bun run typecheck`, and `bun run test`; require exit 0.
- [ ] Commit migration, adapter, tests, and reconciliation evidence. Do not enable production writes before data parity and rollback review.

### Task 3: Cloud optimization workflow

**Files:**
- Modify: `apps/ronsas/youtube-optimizer/src/lib/channel-audit.functions.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/lib/analyze-episode.functions.ts`
- Modify: `apps/ronsas/youtube-optimizer/src/lib/rons-ai.server.ts`
- Create: `apps/ronsas/youtube-optimizer/src/test/cloud-optimization.test.ts`

**Interfaces:**
- Consumes: Task 2 session/data context and Task 1 capability boundary.
- Produces: a persisted, attributed optimization result with provider/usage evidence, or a typed unavailable result; never a simulated success.

- [ ] Write failing tests for a valid authenticated optimization, missing provider credential, provider failure, and duplicate request idempotency.
- [ ] Run `bun test src/test/cloud-optimization.test.ts`; verify the expected failures.
- [ ] Route calls through governed cloud capabilities with authorization and usage evidence; suppress paid checkout while free promotion applies.
- [ ] Run focused tests, `bun run typecheck`, `bun run test`, and `bun run build`; require exit 0.
- [ ] Commit the workflow and tests.

### Task 4: Server packaging and candidate acceptance

**Files:**
- Create: `apps/ronsas/youtube-optimizer/Containerfile` or equivalent reproducible service packaging.
- Modify: `.github/workflows/ronsas-app-validation.yml`
- Create: `tests/browser/ronsas-youtube-cloud.spec.ts`
- Modify: `docs/ronsas-youtube-cloud-dependencies.md`

**Interfaces:**
- Produces: an internally reachable server service with health endpoint and release SHA; no public service origin required.

- [ ] Write browser tests for SSR entry, nested refresh, authenticated optimization, unavailable backend, and zero-local-network execution.
- [ ] Run the candidate browser test against a disposable cloud environment; verify it fails while the service is absent.
- [ ] Package the server, configure private networking and secrets, and deploy only to an isolated candidate environment sourced from the PR head.
- [ ] Run focused browser tests, `bun run typecheck`, `bun run test`, `bun run build`, and security checks; require exit 0.
- [ ] Commit, open a reviewable PR, and record candidate logs/rollback instructions. Public launch remains unavailable until the unified delivery gate passes.
