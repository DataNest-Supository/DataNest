# RONSAS Launch Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every advertised RONSAS item a truthful DataNest-owned launch identity and test real navigation for the seven existing static apps.

**Architecture:** A typed manifest is the single source for product labels, launch paths, source paths, and runtime kind. The Products view renders links only for implemented routes and describes unavailable server-backed entries. This plan does not deploy YouTube or change public hosting.

**Tech Stack:** Next.js, TypeScript, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-28-datanest-only-ronsas-runtime-design.md`

## Global Constraints

- Source and release authority: `DataNest-Supository/DataNest`.
- No production dependency on Ealiophin, localhost, RFC1918 addresses, or a personal computer.
- Same-origin canonical `/apps/<slug>/` paths; no advertised dead links.
- Free promotion; `billing_enabled=false`.
- Historical portfolio classification is provenance, not ownership.

## Review Focus

- Unknown application name stays unlinked, without guessing a slug (Task 1 test).
- Alias such as `SyncVision` resolves to the existing `syncvision` path (Task 1 test).
- An unavailable YouTube runtime never shows a functioning launch claim (Task 2 test).
- Native AppDev navigation preserves the DataNest session and selected project (Task 2 browser test).
- Direct nested route refresh remains on the app origin or reports an explicit unsupported route (Task 3 browser test).

---

### Task 1: Canonical launch manifest

**Files:**
- Modify: `src/lib/ronsasApps.ts`
- Create: `tests/unit/ronsas-app-launch-contract.test.mjs`
- Modify: `scripts/build-ronsas-pages.mjs`

**Interfaces:**
- Produces: `resolveRonsasLaunch(name: string | null | undefined, basePath: string, availability: Record<string, boolean>): RonsasLaunch | null`, where `RonsasLaunch` has `slug`, `name`, `kind: "static" | "server" | "native" | "operations"`, `href: string | null`, and `availability: "ready" | "preview" | "unavailable"`. Static bundles remain clickable previews until cloud workflow acceptance sets their availability flag.
- Static slugs remain the seven current `RONSAS_HOSTED_APPS` entries; YouTube, AppDev, and Control Center get distinct kinds and no invented static bundle.

- [ ] Write a test that resolves `SyncVision` to `/DataNest/apps/syncvision/`, leaves an unknown name null, and marks YouTube unavailable when its health flag is false.
- [ ] Run `node --test tests/unit/ronsas-app-launch-contract.test.mjs`; verify the missing contract fails.
- [ ] Implement the typed resolver and derive the static build manifest from the static entries without adding server/native entries to `out/apps`.
- [ ] Run the focused test, `npm test`, and `npm run check`; require exit 0.
- [ ] Commit the manifest and tests.

### Task 2: Product launch presentation

**Files:**
- Modify: `src/components/ProductsWorkspace.tsx`
- Modify: `tests/browser/products.spec.ts`
- Modify: `src/app/globals.css` only for accessible unavailable/status styling.

**Interfaces:**
- Consumes: `resolveRonsasLaunch(...)` from Task 1.
- Produces: static links, a stable native `?view=ai` AppDev deep link, and an unavailable description for server/operations entries until their routes pass release gates.

- [ ] Add browser assertions: SyncVision remains a same-origin link; AppDev opens the DataNest AI workspace without losing the active project; YouTube and Control Center are labelled unavailable and have no fake href before deployment.
- [ ] Run `npx playwright test tests/browser/products.spec.ts`; verify the new assertions fail for the expected absent behavior.
- [ ] Render each manifest kind without changing portfolio classification or claiming an unavailable operation works.
- [ ] Re-run the focused browser test, `npm test`, and `npm run check`; require exit 0.
- [ ] Commit the product UI changes.

### Task 3: Static route integrity

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/browser/products.spec.ts`
- Modify: `scripts/build-ronsas-pages.mjs` only if the manifest check exposes a mismatch.

**Interfaces:**
- Consumes: Task 1 manifest.
- Produces: CI assertion that every static launch target has a built index and live HTML/assets, while server/native targets are verified by their own gates.

- [ ] Add a test that follows a static launch, refreshes a representative nested route, and confirms an app render or explicit unsupported-route state rather than a silent external redirect.
- [ ] Run the focused browser test against a Pages-compatible preview; verify it catches a deliberately absent route or redirect.
- [ ] Add manifest-to-bundle validation and keep live Pages verification scoped to static entries.
- [ ] Run `npm test`, `npm run check`, and the focused browser test; require exit 0.
- [ ] Commit and open a reviewable PR. Do not merge based solely on HTTP 200 shell checks.
