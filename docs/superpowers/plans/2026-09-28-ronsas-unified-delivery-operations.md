# Unified DataNest Delivery and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the RONSAS apps through one DataNest public origin and replace machine-local Control Center production duties with governed cloud operations.

**Architecture:** A server-capable DataNest gateway serves the Next.js shell and static RONSAS bundles and proxies the YouTube server on a private network. A read-only operations view derives deployed health and release evidence from server-side provider adapters. Mutations require a later exact-action authority task; public cutover happens only after end-to-end verification without Ealiophin.

**Tech Stack:** Next.js standalone, container build, private service networking, Supabase Auth, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-28-datanest-only-ronsas-runtime-design.md`

**Prerequisites:** The launch contract plan and YouTube cloud runtime plan must pass their isolated candidate gates before Task 3 promotes a public YouTube link.

## Global Constraints

- Canonical same-origin `/apps/<slug>/` paths; provider origin remains hidden.
- Production services are built from the same DataNest commit; no personal computer, tunnel, or self-hosted runner dependency.
- DataNest remains source/release authority; Supabase remains platform auth/data authority.
- Free promotion and `billing_enabled=false`; no checkout activation.
- No deploy or operations mutation without the existing consequence, authority, and human approval gates.

## Review Focus

- Private YouTube service outage gives an explicit 503/unavailable view rather than routing to localhost (Task 1 test).
- Direct deep-link refresh returns the intended app, including assets and cookies (Task 1 test).
- Unauthenticated user cannot read private operations detail (Task 2 test).
- Stale release SHA or mismatched app bundle prevents promotion (Task 3 test).
- Failed cutover leaves the old public site available and provides a tested rollback path (Task 4 test).

---

### Task 1: Same-origin gateway and static bundles

**Files:**
- Modify: `next.config.ts`
- Modify: `Dockerfile`
- Modify: `scripts/build-ronsas-pages.mjs` or extract a reusable bundle command in `scripts/`
- Create: `tests/browser/ronsas-unified-origin.spec.ts`
- Create: `tests/unit/ronsas-gateway-config.test.mjs`

**Interfaces:**
- Consumes: static launch manifest and private YouTube server health from prerequisite plans.
- Produces: `/apps/<static-slug>/` assets plus a same-origin `/apps/youtube-optimizer/*` proxy to a configured private HTTPS/DNS service, with no production loopback default. Static export remains a separate legacy Pages build mode during cutover.

- [ ] Write failing gateway configuration tests for missing upstream and forbidden localhost; write browser tests for static launch, YouTube SSR, nested route refresh, assets, cookies, and upstream outage.
- [ ] Run focused tests and verify the missing routing fails as expected.
- [ ] Bundle static outputs in the standalone image, configure path-preserving proxy/rewrite, and return explicit unavailable status when the private upstream fails.
- [ ] Run focused tests, `npm test`, `npm run check`, `npm run build`, and a container health smoke; require exit 0.
- [ ] Commit gateway code and tests.

### Task 2: DataNest-native AppDev and cloud operations view

**Files:**
- Modify: `src/lib/ronsasApps.ts`
- Modify: `src/components/ProductsWorkspace.tsx`
- Create: `src/components/RonsasOperationsPanel.tsx`
- Create: `src/app/api/ronsas/health/route.ts`
- Modify: `src/components/DataNestApp.tsx` to route the new read-only view.
- Create: `tests/browser/ronsas-operations.spec.ts`

**Interfaces:**
- Consumes: launch resolver from the launch contract plan and server-side provider health adapter.
- Produces: AppDev native deep link and authenticated operations status with service, release SHA, observed-at timestamp, and `healthy | degraded | unavailable | unknown` state. It exposes no credentials, provider tokens, or mutating controls.

- [ ] Write failing browser/API tests for AppDev project continuity, owner/admin and viewer read rules, unknown health, stale observations, and forbidden anonymous access.
- [ ] Run focused tests; verify absent routes fail.
- [ ] Implement the read-only view and a server-only health adapter. Retain the local PowerShell files as recovery evidence, never a production link.
- [ ] Run focused tests, `npm test`, `npm run check`, and `npm run build`; require exit 0.
- [ ] Commit the native surfaces.

### Task 3: Release gate and candidate deployment

**Files:**
- Create: `.github/workflows/ronsas-unified-delivery.yml`
- Modify: `scripts/write-release-manifest.mjs`
- Modify: `docs/DEPLOYMENT.md`
- Create: `tests/browser/ronsas-cloud-acceptance.spec.ts`

**Interfaces:**
- Consumes: candidate gateway, static bundles, YouTube server, backend, and read-only operations view.
- Produces: a release manifest with exact DataNest SHA for each service and a gate that promotes YouTube's launch availability only when SSR, auth, API, and an optimization workflow pass.

- [ ] Write failing acceptance checks for manifest mismatch, missing static artifact, broken app route, failed YouTube workflow, and presence of production loopback endpoints.
- [ ] Run the candidate gate against deliberately incomplete deployment; verify it rejects promotion.
- [ ] Deploy an isolated candidate with private networking, server-only secrets, TLS, health checks, backups, and release evidence. Keep public Pages unchanged.
- [ ] Run root CI, RONSAS validation, relevant certification, security scans, backend/API acceptance, and browser workflows from a client with no Ealiophin connectivity; require exit 0.
- [ ] Commit workflow/docs and open a reviewable PR. An exact deployment decision is required before public cutover.

### Task 4: Canonical hostname cutover and rollback

**Files:**
- Modify: `docs/DEPLOYMENT.md`
- Modify: `.github/workflows/pages.yml` for compatibility-only verification.
- Modify: `src/lib/ronsasApps.ts` only if final origin/base path differs from the candidate.
- Create: `tests/browser/ronsas-cutover.spec.ts`

**Interfaces:**
- Consumes: Task 3 release manifest and approved hostname.
- Produces: canonical DataNest origin, verified old-link compatibility, auth callback configuration, and documented rollback to the previous healthy release.

- [ ] Write failing cutover tests for old links, canonical URL, auth return, deep refresh, release SHA, and a simulated failed deployment rollback.
- [ ] Run cutover tests against the candidate and verify any missing DNS/auth callback conditions fail explicitly.
- [ ] Configure DNS/TLS and Supabase redirect allowlist for the approved hostname; preserve the Pages compatibility entry until links are reconciled. Do not point the old `github.io` hostname at an impossible dynamic target.
- [ ] Run the full live browser/API suite with personal computers offline, verify release SHA and rollback, and record the public result.
- [ ] Commit final compatibility configuration and promote only under the repository's release authority. A failed gate leaves the prior public deployment in place.
