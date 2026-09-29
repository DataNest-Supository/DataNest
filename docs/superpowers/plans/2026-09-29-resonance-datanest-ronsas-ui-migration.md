# Resonance DataNest RONSAS UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every consolidated RONSAS application to the approved Resonance DataNest visual, operator, governance, legal-navigation, accessibility, and free-promotion contract while preserving each app’s specialist workflow and existing framework.

**Architecture:** Define one machine-readable cross-app brand contract plus a validator, then implement thin app-local adapters instead of forcing a monorepo UI package or framework rewrite. React/Vite applications receive focused brand adapter styles and footer/legal attribution updates; simple static applications receive equivalent CSS/markup adapters. The DataNest Pages bundler is extended so every user-facing consolidated application, including YouTube Optimizer, is published under the DataNest app namespace.

**Tech Stack:** Vite, React 18/19, Tailwind 3/4, plain HTML/CSS/JS apps, Node test runner, Vitest, Bun, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-29-resonance-datanest-ui-governance-system-design.md`

## Global Constraints

- All app source/runtime/build authority remains in `DataNest-Supository/DataNest`.
- Legal operator is **Resonance Sole Proprietorship**; business brand is **Resonance App Development**; parent platform is **Resonance DataNest**.
- App attribution uses “a governed Resonance DataNest application by Resonance App Development” or equivalent approved wording.
- RSGP remains unexpanded and must not look like an external certification seal.
- Canonical fonts are Inter Tight / Inter / Instrument Serif Italic / JetBrains Mono, with safe fallbacks if an app cannot yet package a font asset.
- Each migrated app preserves one product accent while using the shared surface/semantic palette.
- Each migrated user-facing surface must support dark/light/high-contrast or equivalent accessibility behavior supported by that app’s current theme system.
- Existing app routing, startup recovery, local/sovereign guards, auth, data processing, and specialist workflow behavior must not be rewritten for visual consistency.
- Free-promotion/no-paid-checkout remains active; migration must not introduce paid CTAs.
- App legal pages remain review-gated until the central legal review process approves replacement text.
- DataNest Pages must publish all supported user-facing apps under `/DataNest/apps/<slug>/`.

## Review Focus

- **App-local framework differences:** adapter changes must not assume all apps share React version, Tailwind version, router, or build tool.
- **Deep links under GitHub Pages base paths:** app routes and static assets continue to work beneath `/DataNest/apps/<slug>/`.
- **Legacy pricing/checkout copy:** any visible pricing-era CTA that contradicts free promotion is removed or relabeled.
- **Dynamic legal dates or unverified privacy claims:** migrated legal pages expose review state and do not manufacture approval/effective dates.
- **YouTube Optimizer bundle gap:** validation and production Pages output both include the app, not just its standalone build.

---

### Task 1: Add the canonical cross-app brand contract and validator

**Files:**
- Create: `apps/ronsas/shared/resonance-brand-contract.json`
- Create: `scripts/validate-ronsas-brand-contract.mjs`
- Modify: `scripts/validate-ronsas-imports.mjs`
- Modify: `.github/workflows/ronsas-app-validation.yml`

**Interfaces:**
- Contract fields: `schema`, `operator`, `businessBrand`, `platform`, `governanceLabel`, `governanceRoute`, `legalRoute`, `promotionState`, `fonts`, `surfaceTokens`, `semanticTokens`, `appAccents`.
- `promotionState` must encode free promotion and `paidCheckoutActive:false`.
- Validator reads the contract and each app adapter/source marker; it reports drift with app/path-specific messages.

- [ ] **Step 1: Write the failing validator contract**

Make the script require exact approved identity strings, no RSGP expansion, required accent keys for every app, and free-promotion state.

- [ ] **Step 2: Run and verify failure**

Run: `node scripts/validate-ronsas-brand-contract.mjs`  
Expected: FAIL because the contract/adapters are absent.

- [ ] **Step 3: Create the contract and wire baseline validation**

At this task only, validate the contract itself and allow app-adapter checks to report “not migrated” until subsequent tasks add each adapter; do not mark them compliant prematurely.

- [ ] **Step 4: Add workflow invocation**

Run the validator before per-app matrix builds.

- [ ] **Step 5: Commit**

```bash
git add apps/ronsas/shared scripts/validate-ronsas-brand-contract.mjs scripts/validate-ronsas-imports.mjs .github/workflows/ronsas-app-validation.yml
git commit -m "feat: define RONSAS DataNest brand contract"
```

### Task 2: Migrate Creative Studio

**Files:**
- Create: `apps/ronsas/creative-studio/src/resonance-datanest-adapter.css`
- Modify: `apps/ronsas/creative-studio/src/main.tsx`
- Modify: `apps/ronsas/creative-studio/src/components/brand/ResonanceFooter.tsx`
- Modify: `apps/ronsas/creative-studio/src/pages/Terms.tsx`
- Modify: `apps/ronsas/creative-studio/src/pages/Privacy.tsx`
- Modify: `apps/ronsas/creative-studio/src/index.css`
- Create or modify: `apps/ronsas/creative-studio/src/lib/resonanceDataNestBrand.test.ts`
- Modify: `scripts/validate-ronsas-brand-contract.mjs`

**Interfaces:**
- Adapter maps the app’s existing variables to the canonical DataNest surface, typography, semantic, focus, and Creative Studio accent tokens.
- Footer renders operator/business/platform attribution, DataNest legal/governance links, and free-promotion-safe copy.
- Terms/Privacy render existing substantive content only as legacy/review-gated content until central legal approval supersedes it; replace dynamic “today” date with explicit metadata/status presentation.

- [ ] **Step 1: Add failing Vitest/source assertions**

Require the canonical operator/platform attribution, DataNest legal/governance routes, no dynamic legal date, no paid checkout CTA, and reduced-motion-safe adapter rules.

- [ ] **Step 2: Run app tests**

Run: `cd apps/ronsas/creative-studio && npm test`  
Expected: FAIL on new assertions.

- [ ] **Step 3: Implement the adapter and footer/legal migration**

Import `resonance-datanest-adapter.css` after the existing index stylesheet in `main.tsx` so it acts as the deliberate app adapter, not an uncontrolled global override.

- [ ] **Step 4: Validate build and contract**

Run: `cd apps/ronsas/creative-studio && npm test && npm run build -- --base=/DataNest/apps/creative-studio/`  
Run: `node scripts/validate-ronsas-brand-contract.mjs --app creative-studio`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ronsas/creative-studio scripts/validate-ronsas-brand-contract.mjs
git commit -m "feat: align Creative Studio with Resonance DataNest"
```

### Task 3: Migrate ePublisher

**Files:**
- Create: `apps/ronsas/epublisher/src/resonance-datanest-adapter.css`
- Modify: `apps/ronsas/epublisher/src/main.tsx`
- Modify: `apps/ronsas/epublisher/src/components/brand/ResonanceFooter.tsx`
- Modify: `apps/ronsas/epublisher/src/pages/Terms.tsx`
- Modify: `apps/ronsas/epublisher/src/pages/Privacy.tsx`
- Modify: `apps/ronsas/epublisher/src/index.css`
- Create or modify: `apps/ronsas/epublisher/src/lib/resonanceDataNestBrand.test.ts`
- Modify: `scripts/validate-ronsas-brand-contract.mjs`

**Interfaces:**
- Preserve ePublisher’s existing light theme support, RTL behavior, StoryForge components, and routes.
- Adapter must map existing `--font-display/body/accent/mono` variables to the approved canonical families and keep ePublisher’s approved magenta accent.

- [ ] **Step 1: Add failing tests for attribution, typography, theme, and legal-state behavior**

- [ ] **Step 2: Run app verification**

Run: `cd apps/ronsas/epublisher && npm test && npm run build:types`  
Expected: FAIL on new migration assertions.

- [ ] **Step 3: Implement adapter/footer/legal changes**

Remove or relabel legacy Hub pricing links that imply paid access; keep free-promotion language.

- [ ] **Step 4: Verify**

Run: `cd apps/ronsas/epublisher && npm test && npm run build:types && npm run build -- --base=/DataNest/apps/epublisher/`  
Run: `node scripts/validate-ronsas-brand-contract.mjs --app epublisher`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ronsas/epublisher scripts/validate-ronsas-brand-contract.mjs
git commit -m "feat: align ePublisher with Resonance DataNest"
```

### Task 4: Migrate SyncVision without weakening sovereign/local behavior

**Files:**
- Create: `apps/ronsas/syncvision/src/resonance-datanest-adapter.css`
- Modify: `apps/ronsas/syncvision/src/main.tsx`
- Modify: `apps/ronsas/syncvision/src/components/brand/ResonanceFooter.tsx`
- Modify: `apps/ronsas/syncvision/src/components/Layout.tsx`
- Modify: `apps/ronsas/syncvision/src/index.css`
- Create or modify: `apps/ronsas/syncvision/src/lib/resonanceDataNestBrand.test.ts`
- Modify: `scripts/validate-ronsas-brand-contract.mjs`

**Interfaces:**
- Preserve `installSovereignNetworkGuard()`, crash logging, global error listeners, FFmpeg vendoring, and current video workflow.
- Adapter uses SyncVision pink accent and DataNest shared semantics.
- Global footer/legal/governance links must not replace specialist scene/action controls.

- [ ] **Step 1: Add failing brand and sovereign-preservation tests**

Assert the startup network guard remains called before React mount, adapter is imported, attribution exists, and no paid CTA appears.

- [ ] **Step 2: Run app verification**

Run: `cd apps/ronsas/syncvision && npm run typecheck && npm test`  
Expected: FAIL on new migration assertions only.

- [ ] **Step 3: Implement UI adapter changes**

Do not alter FFmpeg package pins, local service endpoints, or sovereign guard behavior.

- [ ] **Step 4: Verify**

Run: `cd apps/ronsas/syncvision && npm run typecheck && npm test && npm run build -- --base=/DataNest/apps/syncvision/`  
Run: `node scripts/validate-ronsas-imports.mjs && node scripts/validate-ronsas-brand-contract.mjs --app syncvision`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ronsas/syncvision scripts/validate-ronsas-brand-contract.mjs
git commit -m "feat: align SyncVision with Resonance DataNest"
```

### Task 5: Migrate YouTube Optimizer and remove stale legal/commercial presentation

**Files:**
- Create: `apps/ronsas/youtube-optimizer/src/resonance-datanest-adapter.css`
- Modify: the YouTube Optimizer application entry module that currently imports `src/styles.css`
- Modify: `apps/ronsas/youtube-optimizer/src/components/SiteHeader.tsx`
- Modify: `apps/ronsas/youtube-optimizer/src/components/SiteFooter.tsx`
- Modify: `apps/ronsas/youtube-optimizer/src/pages/Terms.tsx`
- Modify: `apps/ronsas/youtube-optimizer/src/pages/Privacy.tsx`
- Modify: `apps/ronsas/youtube-optimizer/src/styles.css`
- Create or modify: `apps/ronsas/youtube-optimizer/src/lib/resonanceDataNestBrand.test.ts`
- Modify: `scripts/validate-ronsas-brand-contract.mjs`

**Interfaces:**
- Preserve TanStack router/start behavior and current React 19/Tailwind 4 stack.
- Terms/Privacy must remove stale billing/cancellation wording that contradicts free promotion and mark unapproved policy content as review-gated.
- Remove unsupported privacy guarantees such as “industry-standard encryption” unless separate implementation evidence is linked and reviewed.

- [ ] **Step 1: Locate the real application entry before editing**

Run: `grep -R "src/styles.css\|./styles.css" -n apps/ronsas/youtube-optimizer/src apps/ronsas/youtube-optimizer | head -20`  
Expected: identify the exact entry module; update this plan’s working notes if the file name differs from conventional `main.tsx`.

- [ ] **Step 2: Add failing tests for free-promotion and legal claim safety**

Require no billing/cancellation SEO description, no unsupported security guarantee, DataNest attribution, and legal/governance links.

- [ ] **Step 3: Run tests**

Run: `cd apps/ronsas/youtube-optimizer && bun run typecheck && bun run test`  
Expected: FAIL on migration assertions.

- [ ] **Step 4: Implement adapter/header/footer/legal changes**

- [ ] **Step 5: Verify app**

Run: `cd apps/ronsas/youtube-optimizer && bun run typecheck && bun run test && bun run build -- --base=/DataNest/apps/youtube-optimizer/`  
Run: `node scripts/validate-ronsas-brand-contract.mjs --app youtube-optimizer`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ronsas/youtube-optimizer scripts/validate-ronsas-brand-contract.mjs
git commit -m "feat: align YouTube Optimizer with Resonance DataNest"
```

### Task 6: Migrate the four simple static applications

**Files:**
- Modify: `apps/ronsas/career-compass/index.html`
- Modify: `apps/ronsas/career-compass/styles.css`
- Modify: `apps/ronsas/career-compass/test/logic.test.mjs`
- Modify: `apps/ronsas/sovereign-forge/index.html`
- Modify: `apps/ronsas/sovereign-forge/styles.css`
- Modify: `apps/ronsas/sovereign-forge/test/logic.test.mjs`
- Modify: `apps/ronsas/lyricsync-studio/index.html`
- Modify: `apps/ronsas/lyricsync-studio/styles.css`
- Modify: `apps/ronsas/lyricsync-studio/test/logic.test.mjs`
- Modify: `apps/ronsas/scene-song-spark/index.html`
- Modify: `apps/ronsas/scene-song-spark/styles.css`
- Modify: `apps/ronsas/scene-song-spark/test/logic.test.mjs`
- Modify: `scripts/validate-ronsas-brand-contract.mjs`

**Interfaces:**
- Each app receives the canonical operator/platform footer, RSGP marker/link, DataNest Legal/Governance links, focus/motion/semantic token mappings, and its approved accent.
- Do not introduce React/Tailwind dependencies into these apps.

- [ ] **Step 1: Add source tests in each existing Node test suite**

Assert required attribution/link text, no checkout/pricing CTA, token presence, and no page-level horizontal overflow rules such as fixed minimum widths that exceed the viewport.

- [ ] **Step 2: Run all four suites and verify failure**

Run:
```bash
(cd apps/ronsas/career-compass && npm test)
(cd apps/ronsas/sovereign-forge && npm test)
(cd apps/ronsas/lyricsync-studio && npm test)
(cd apps/ronsas/scene-song-spark && npm test)
```
Expected: FAIL on new source assertions.

- [ ] **Step 3: Implement static markup/CSS adapters**

Keep existing app logic files untouched unless a visual control requires an accessible label fix.

- [ ] **Step 4: Build and validate**

Run the four `npm test && npm run build` commands and `node scripts/validate-ronsas-brand-contract.mjs`.  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ronsas/career-compass apps/ronsas/sovereign-forge apps/ronsas/lyricsync-studio apps/ronsas/scene-song-spark scripts/validate-ronsas-brand-contract.mjs
git commit -m "feat: align simple RONSAS apps with Resonance DataNest"
```

### Task 7: Make YouTube Optimizer a DataNest-hosted Pages application

**Files:**
- Modify: `scripts/build-ronsas-pages.mjs`
- Modify: `.github/workflows/ronsas-app-validation.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `src/lib/ronsasApps.ts`
- Modify: `tests/unit/ronsas-cloud-integration.test.mjs`
- Modify: `scripts/validate-ronsas-imports.mjs`

**Interfaces:**
- `RONSAS_HOSTED_APPS` includes `{slug:"youtube-optimizer",name:"YouTube Optimizer",...}`.
- Bundler supports a Bun-built app kind and emits `out/apps/youtube-optimizer/index.html`.
- Both validation and live verification loops include `youtube-optimizer`.

- [ ] **Step 1: Add failing source tests**

Assert YouTube Optimizer is in the hosted-app registry, bundle app list, validation loop, and Pages verification loop.

- [ ] **Step 2: Run focused tests**

Run: `node --test tests/unit/ronsas-cloud-integration.test.mjs && node scripts/validate-ronsas-imports.mjs`  
Expected: FAIL because the app is not currently bundled/registered.

- [ ] **Step 3: Extend the bundler for Bun**

Use `bun install --frozen-lockfile` and `bun run build -- --base=/DataNest/apps/youtube-optimizer/`. Add `oven-sh/setup-bun@v2` to jobs that invoke the combined bundler.

- [ ] **Step 4: Verify the complete Pages bundle locally/CI-equivalent**

Run root build, then `node scripts/build-ronsas-pages.mjs`; assert all eight user-facing app `index.html` files and manifest entries exist.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-ronsas-pages.mjs .github/workflows/ronsas-app-validation.yml .github/workflows/pages.yml src/lib/ronsasApps.ts tests/unit/ronsas-cloud-integration.test.mjs scripts/validate-ronsas-imports.mjs
git commit -m "feat: host YouTube Optimizer inside DataNest Pages"
```

### Task 8: Enforce cross-app contract completeness

**Files:**
- Modify: `scripts/validate-ronsas-brand-contract.mjs`
- Modify: `.github/workflows/ronsas-app-validation.yml`
- Modify: `tests/unit/ronsas-cloud-integration.test.mjs`

**Interfaces:**
- Validator fails unless all eight user-facing apps are marked migrated and satisfy operator/platform/governance/free-promotion contract checks.
- Backend-only `sovereign-backend` is validated for repository/legal metadata only; it is not required to render UI tokens.

- [ ] **Step 1: Flip validator from incremental to complete mode**

Add a `--complete` flag that requires all app adapters; use it in CI after all migration tasks land.

- [ ] **Step 2: Run full application validation**

Run: `node scripts/validate-ronsas-brand-contract.mjs --complete`  
Run each app command from `.github/workflows/ronsas-app-validation.yml`.  
Expected: PASS.

- [ ] **Step 3: Run bundled output verification**

Run: `npm run build && node scripts/build-ronsas-pages.mjs`  
Expected: `out/apps/manifest.json` includes all eight user-facing apps.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-ronsas-brand-contract.mjs .github/workflows/ronsas-app-validation.yml tests/unit/ronsas-cloud-integration.test.mjs
git commit -m "test: enforce DataNest UI contract across RONSAS apps"
```
