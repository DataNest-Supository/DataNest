# Resonance DataNest Certification and Production Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved UI/governance redesign into a traceable release candidate with automated UX/accessibility/security evidence, explicit human/external/legal review references, manual production authorization, exact-SHA deployment, and post-deployment verification.

**Architecture:** Keep normal CI, PR verification, RONSAS validation, and security scans as independent evidence producers. Add a UI-governance evidence manifest and visual/accessibility review suite, then change GitHub Pages from automatic push-to-production into an explicit exact-SHA workflow-dispatch release that requires review references and the GitHub Pages environment gate. The deployed release manifest records the review chain so production evidence can be traced back to the candidate.

**Tech Stack:** GitHub Actions, Next.js static export, Playwright, Node test runner, optional `@axe-core/playwright`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-29-resonance-datanest-ui-governance-system-design.md`

## Global Constraints

- A successful merge or build is **not** production authorization.
- Production chain is exactly: **self-audit → automated verification → security validation → visual/UX review → governance-impact review → legal review where applicable → external/human review → production authorization → deployment → post-deployment verification → dossier/evidence update**.
- Deployment must target an explicit commit SHA that is reachable from `main`.
- GitHub Pages deployment must no longer happen automatically from every `main` push once this gate is active.
- Production deployment requires human action plus review references; do not fabricate or auto-fill approval references.
- Legal review is mandatory for this redesign because it changes legal/governance surfaces.
- All eight user-facing consolidated applications must be verified live under `/DataNest/apps/<slug>/`.
- Release evidence must identify the approved design spec and all four implementation plans.
- Free-promotion/no-paid-checkout remains active.
- Do not weaken existing security-scan thresholds to make the UI release pass.

## Review Focus

- **Dispatcher supplies a SHA not reachable from main:** deployment fails before build/deploy.
- **Review references are blank, “pending”, or placeholder text:** authorization verification fails closed.
- **Candidate passed UI tests but failed security/RONSAS validation:** production release cannot claim verified status.
- **Post-deploy content comes from a different SHA:** release-manifest/live verification fails.
- **Environment reviewer protection is absent:** workflow documentation explicitly flags production environment setup as required before the gate can be considered fully enforced.

---

### Task 1: Add a UI-governance release-evidence manifest

**Files:**
- Create: `scripts/write-ui-governance-evidence.mjs`
- Create: `tests/unit/ui-governance-evidence.test.mjs`
- Modify: `scripts/write-release-manifest.mjs`
- Modify: `tests/unit/release-manifest-alignment.test.mjs`

**Interfaces:**
- Evidence writer consumes environment values:
  - `DATANEST_UI_RELEASE_SHA`
  - `DATANEST_UI_RELEASE_STATE` = `candidate` or `authorized`
  - `DATANEST_UI_PR_VERIFICATION_REF`
  - `DATANEST_UI_SECURITY_REF`
  - `DATANEST_UI_RONSAS_VALIDATION_REF`
  - `DATANEST_UI_VISUAL_REVIEW_REF`
  - `DATANEST_UI_GOVERNANCE_REVIEW_REF`
  - `DATANEST_UI_LEGAL_REVIEW_REF`
  - `DATANEST_UI_EXTERNAL_REVIEW_REF`
  - `DATANEST_UI_AUTHORIZATION_REF`
- Produces `public/ui-governance-release.json`.
- `write-release-manifest.mjs` adds a `uiGovernance` object only when UI-governance env is supplied, preserving existing non-UI release behavior.

- [ ] **Step 1: Write failing unit tests**

Assert candidate evidence cannot claim authorization, authorized evidence requires all review references, and design/plan paths are exact.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/unit/ui-governance-evidence.test.mjs tests/unit/release-manifest-alignment.test.mjs`  
Expected: FAIL because the evidence writer/manifest fields do not exist.

- [ ] **Step 3: Implement the evidence writer and release-manifest integration**

Hard-code only artifact paths/contract version; read review identifiers from environment. Reject placeholder values such as empty string, `pending`, `todo`, and `tbd` when state is `authorized`.

- [ ] **Step 4: Verify**

Run: `node --test tests/unit/ui-governance-evidence.test.mjs tests/unit/release-manifest-alignment.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/write-ui-governance-evidence.mjs scripts/write-release-manifest.mjs tests/unit/ui-governance-evidence.test.mjs tests/unit/release-manifest-alignment.test.mjs
git commit -m "feat: add UI governance release evidence manifest"
```

### Task 2: Add responsive and accessibility certification coverage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/browser/ui-governance-accessibility.spec.ts`
- Modify: `tests/browser/auth.smoke.spec.ts`
- Modify: `tests/browser/home-optimization.spec.ts`
- Modify: `tests/browser/legal-centre.spec.ts`

**Interfaces:**
- If `@axe-core/playwright` is introduced, run WCAG 2A/2AA-relevant checks on stable public/root surfaces and document any intentionally excluded third-party/widget region by selector and reason.
- Responsive certification widths: **320, 390, 768, 1440**.
- Accessibility tests must cover visible focus, keyboard access, semantic landmark/headings, no color-only status, reduced motion, and no page-level horizontal overflow.

- [ ] **Step 1: Add failing certification tests**

Cover signed-out entry, Legal Centre, Governance page, authenticated Home fixture, one lifecycle specialist page, and DataNest AI.

- [ ] **Step 2: Run new suite**

Run: `npx playwright test tests/browser/ui-governance-accessibility.spec.ts`  
Expected: FAIL on current unmigrated UI issues or missing dependency.

- [ ] **Step 3: Add the minimum test dependency and fix violations in owning components**

Do not suppress a violation globally when it can be fixed in DataNest-owned markup.

- [ ] **Step 4: Verify responsive suites**

Run:
```bash
npx playwright test   tests/browser/ui-governance-accessibility.spec.ts   tests/browser/auth.smoke.spec.ts   tests/browser/home-optimization.spec.ts   tests/browser/legal-centre.spec.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/browser src/components src/app
git commit -m "test: add DataNest UI accessibility certification"
```

### Task 3: Capture successful visual-review evidence without making pixel snapshots the design authority

**Files:**
- Create: `tests/browser/ui-governance-review.spec.ts`
- Modify: `playwright.config.ts` if artifact retention needs an explicit setting
- Modify: `.github/workflows/pr-verification.yml`

**Interfaces:**
- Visual review test renders representative public, Home, DataNest AI, Governance, Execute, Verify, and legal surfaces at 390 and 1440 widths.
- It attaches full-page screenshots and a small JSON context record per surface; it asserts load/focus/overflow but does not use brittle golden-image pass/fail as the sole quality gate.
- PR Verification uploads visual-review evidence on success and failure with bounded retention.

- [ ] **Step 1: Write the visual-review test**

Use deterministic fixture data already used by the root browser suites; do not call production services.

- [ ] **Step 2: Run locally and verify evidence exists**

Run: `npx playwright test tests/browser/ui-governance-review.spec.ts`  
Expected: PASS only when each target renders and attachments are created.

- [ ] **Step 3: Add PR workflow execution and artifact upload**

Name the artifact with the workflow run id, for example `ui-governance-review-<run-id>`; retain long enough for external/human review but not indefinitely.

- [ ] **Step 4: Verify workflow YAML/source tests**

Run: `npm test && npm run check`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/browser/ui-governance-review.spec.ts playwright.config.ts .github/workflows/pr-verification.yml
git commit -m "test: capture UI governance visual review evidence"
```

### Task 4: Produce a candidate evidence artifact from PR Verification

**Files:**
- Modify: `.github/workflows/pr-verification.yml`
- Modify: `scripts/write-ui-governance-evidence.mjs`
- Create: `docs/governance/platform-dossier/README.md`

**Interfaces:**
- PR Verification writes evidence with `releaseState:"candidate"`, current SHA, workflow run reference, design spec path, and plan paths.
- Candidate evidence explicitly leaves security, RONSAS, legal, external, and production authorization references as independently supplied/pending evidence rather than claiming success.
- Candidate artifact is uploaded for reviewers.

- [ ] **Step 1: Add unit/source test for candidate semantics**

Assert candidate state never emits `authorized:true` and never fabricates missing independent workflow/review references.

- [ ] **Step 2: Generate a local candidate manifest**

Run with only candidate-safe env values; inspect JSON.  
Expected: valid candidate file with explicit pending evidence slots/statuses.

- [ ] **Step 3: Wire PR Verification upload**

Do not fail PR Verification merely because separate Security/RONSAS workflows have not yet completed; those are independent gates for production authorization.

- [ ] **Step 4: Verify**

Run: `node --test tests/unit/ui-governance-evidence.test.mjs && npm test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pr-verification.yml scripts/write-ui-governance-evidence.mjs docs/governance/platform-dossier/README.md tests
git commit -m "feat: publish DataNest UI release candidate evidence"
```

### Task 5: Convert Pages deployment from automatic main push to governed exact-SHA release

**Files:**
- Modify: `.github/workflows/pages.yml`
- Create: `scripts/verify-ui-production-authorization.mjs`
- Create: `tests/unit/ui-production-authorization.test.mjs`

**Interfaces:**
- Remove automatic `push: branches:[main]` production deployment.
- `workflow_dispatch` requires:
  - `release_sha`
  - `pr_verification_reference`
  - `security_scan_reference`
  - `ronsas_validation_reference`
  - `visual_review_reference`
  - `governance_review_reference`
  - `legal_review_reference`
  - `external_review_reference`
  - `production_authorization_reference`
  - explicit confirmation value `AUTHORIZE PRODUCTION`.
- Checkout/build uses `release_sha`.
- Preflight fetches `origin/main` and requires `git merge-base --is-ancestor "$RELEASE_SHA" origin/main`.
- Deployment continues to use the `github-pages` environment; repository settings must configure required human reviewers on that environment for the full gate.
- Authorized evidence/manifest receives the exact review references from inputs.

- [ ] **Step 1: Write failing authorization tests**

Test missing/placeholder references, wrong confirmation text, malformed SHA, and a valid populated authorization payload.

- [ ] **Step 2: Run unit tests**

Run: `node --test tests/unit/ui-production-authorization.test.mjs`  
Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement the verifier**

Verifier validates structure only; it must not claim to prove the external reviewer’s identity beyond the supplied reference/environment authorization.

- [ ] **Step 4: Refactor Pages workflow**

Build and test the requested SHA, write authorized evidence, bundle all eight apps, upload Pages artifact, and deploy only after the preflight plus environment gate.

- [ ] **Step 5: Verify workflow source contract**

Add assertions in `ui-production-authorization.test.mjs` that no automatic push deploy remains, all required inputs exist, exact-SHA checkout is used, and `environment.name` remains `github-pages`.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/pages.yml scripts/verify-ui-production-authorization.mjs tests/unit/ui-production-authorization.test.mjs
git commit -m "feat: gate DataNest production Pages releases"
```

### Task 6: Extend live verification to legal/governance UI and all DataNest-hosted apps

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/browser/auth.smoke.spec.ts`
- Modify: `tests/browser/legal-centre.spec.ts`
- Modify: `tests/browser/ui-governance-accessibility.spec.ts`

**Interfaces:**
- Live verification checks:
  - root auth shell;
  - `/legal/`;
  - `/governance/`;
  - `/accessibility/`;
  - release manifest;
  - UI governance evidence;
  - all eight user-facing app roots.
- Release manifest `frontendCommit` must match `release_sha`, not workflow-file `GITHUB_SHA`.
- Post-deploy Playwright runs against the live Pages base URL.

- [ ] **Step 1: Add failing workflow/source assertions for all eight app slugs and legal routes**

- [ ] **Step 2: Update live curl checks and Playwright smoke set**

Use the exact release SHA input when verifying manifests.

- [ ] **Step 3: Run local static export verification**

Run: `npm run build && node scripts/build-ronsas-pages.mjs`; serve the output under `/DataNest/` and run the smoke/legal/accessibility suites against it.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml tests/browser
git commit -m "test: extend DataNest post-deploy verification"
```

### Task 7: Add the human/external review dossier template

**Files:**
- Create: `docs/governance/platform-dossier/UI_GOVERNANCE_RELEASE_REVIEW.md`
- Create: `docs/governance/platform-dossier/UI_GOVERNANCE_EVIDENCE_SCHEMA.md`
- Modify: `docs/governance/platform-dossier/README.md`

**Interfaces:**
- Review record fields:
  - candidate SHA;
  - design spec commit;
  - implementation-plan commits;
  - PR Verification run;
  - RONSAS validation run;
  - Security scan run;
  - visual review artifact;
  - governance-impact review;
  - legal review;
  - external/human review;
  - production authorization;
  - deployment run;
  - post-deployment verification.
- Empty fields explicitly mean “not yet approved”; no sample values may look like real approval.

- [ ] **Step 1: Add failing evidence-schema source assertion**

Require every production-chain stage from the spec and prohibit default “approved” values.

- [ ] **Step 2: Add dossier docs**

Explain that the workflow evidence JSON is machine traceability and the review record is human/governance traceability; neither substitutes for the other.

- [ ] **Step 3: Verify**

Run: `node --test tests/unit/ui-governance-evidence.test.mjs tests/unit/ui-production-authorization.test.mjs`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/governance/platform-dossier tests/unit
git commit -m "docs: add DataNest UI production review dossier"
```

### Task 8: Run the complete candidate certification before requesting production authorization

**Files:**
- No new product files expected; fixes belong to the task/file that owns a failing gate.
- Evidence generated by workflows/tests is reviewed, not hand-edited to pass.

**Interfaces:**
- Candidate is eligible for human/external authorization only when all commands/workflows below pass for the same commit SHA.

- [ ] **Step 1: Run root gates**

Run: `npm test && npm run check && npm run build`  
Expected: PASS.

- [ ] **Step 2: Run root browser certification**

Run the PR Verification browser set plus `tests/browser/legal-centre.spec.ts`, `tests/browser/ui-governance-accessibility.spec.ts`, and `tests/browser/ui-governance-review.spec.ts`.  
Expected: PASS.

- [ ] **Step 3: Run RONSAS validation**

Run `node scripts/validate-ronsas-imports.mjs`, `node scripts/validate-ronsas-brand-contract.mjs --complete`, and every application command encoded in `.github/workflows/ronsas-app-validation.yml`.  
Expected: PASS.

- [ ] **Step 4: Run security invariants locally where supported**

Run: `node scripts/verify-security-invariants.mjs && npm audit --omit=dev --audit-level=high`  
Expected: PASS. Semgrep/gitleaks remain authoritative in GitHub Actions.

- [ ] **Step 5: Confirm GitHub workflow evidence for the same candidate SHA**

Required: PR Verification PASS, RONSAS Application Validation PASS, Security Scan PASS, and visual-review artifact available.

- [ ] **Step 6: Stop before production deployment**

Hand the candidate SHA and evidence references to authorized human/legal/external reviewers. Do not trigger the production Pages workflow until those reviews and the `github-pages` environment approval are complete.

- [ ] **Step 7: Commit any final evidence-only documentation changes separately**

Do not amend the tested candidate code commit after certification; if code changes, generate a new candidate SHA and repeat certification.
