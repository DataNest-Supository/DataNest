# DataNest Business OS Phase 1 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the current DataNest product truthfully as the Resonance Business, Intelligence, Collaboration, and Expansion Operating System, establish a source-controlled Nomenclature Registry, reorganize only the already-implemented workspace navigation, and publish the approved target architecture through public Transparency without presenting target-state capabilities as live.

**Architecture:** Phase 1 is deliberately non-invasive: it adds source-controlled naming/definition primitives, reuses existing view keys and routes, and extends the current public Transparency surfaces. It does not add new operational domains, database tables, iBank execution, ALL/CSL/GALUX runtime behavior, Project Director, Conversation Specialist, or external-value functionality. Current/partial/target implementation state is explicit everywhere target concepts are exposed.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.9, Node test runner, Playwright, existing DataNest CSS and public static transparency assets.

**Spec:** `docs/superpowers/specs/2026-09-29-datanest-business-os-collective-intelligence-design.md`

## Global Constraints

- Canonical platform definition: **“Resonance DataNest is the governed Business, Intelligence, Collaboration, and Expansion Operating System for the Resonance ecosystem.”**
- Application development remains a DataNest capability; it is no longer the platform definition.
- RONSAS remains a governed product under DataNest and must not be presented as the parent platform or DataNest AI authority.
- Current Sparks remain internal utility; Phase 1 must not enable cash value, P2P transfer, external transfer, secondary markets, or Sparks-to-money conversion.
- iBank, Barterer Tender, ALL, CSL, GAL, GALUX, RATB, Project Director, Conversation Specialist, Growth Spark, and other target-state capabilities must not be presented as operational when they are not yet implemented.
- DataNest AI, Think Tanks, Governance, UNIFI, TranScheduler, Product Lab, External Audit & Optimizer, Audit, Transparency, Sparks, and the existing Portfolio foundations retain their current authority and behavior.
- Public Transparency may explain architecture, roles, methods, limitations, and approved target state; it must not publish credentials, personal profile data, restricted conversations, confidential agreements, private iBank details, or other protected evidence.
- Existing view keys and deep links remain compatible in Phase 1; mission-oriented navigation is a regrouping of current destinations, not a route rewrite.
- Current free-promotion / billing-off behavior remains unchanged.
- No Supabase migration is authorized by this Phase 1 plan.
- No implementation may claim the approved master specification is fully implemented merely because the public specification is published.

## Review Focus

- **Target-state overclaim:** a person must never mistake an approved future component for a live workspace; registry entries carry `implemented`, `partial`, or `target` state and unimplemented targets do not gain navigation destinations.
- **Sparks / iBank ambiguity:** public and authenticated copy must state that current Sparks remain internal utility and that iBank / External Value are target-state architecture only in this phase.
- **Public leakage:** the new public Business OS surfaces contain only source-controlled public architecture and nomenclature; they must not render authenticated project, user, credential, or relationship data.
- **Navigation regression:** every existing `ViewKey` remains addressable and the regrouped sidebar remains usable at desktop and phone widths without horizontal overflow.
- **Transparency drift:** the authenticated/public React Transparency surface and the static `public/transparency/index.html` surface both identify the same master spec and the same current-vs-target boundary.

---

## File Structure

### Create

- `src/lib/datanestNomenclature.ts` — canonical typed registry for formal Resonance/DataNest terms and implementation state.
- `src/components/BusinessOsTransparencyPanel.tsx` — reusable public-safe Business OS summary and nomenclature panel for Transparency.
- `src/app/business-os/page.tsx` — public read-only rendering of the approved Business OS specification with an explicit target-state disclaimer.
- `public/transparency/business-os/nomenclature.json` — machine-readable public projection of the Phase 1 nomenclature registry.
- `tests/unit/business-os-nomenclature-source.test.mjs` — source/public-projection invariants for canonical names, states, and Sparks/iBank boundaries.
- `tests/unit/business-os-docs-source.test.mjs` — documentation and static-transparency current-vs-target invariants.
- `tests/browser/business-os-foundation.spec.ts` — authenticated navigation, public transparency, responsive, and overclaim regression coverage.

### Modify

- `src/lib/ecosystemAuthority.ts` — canonical Business OS definition and public spec identity constants.
- `src/components/DataNestApp.tsx` — regroup current destinations under mission-oriented headings without adding target-state routes.
- `src/components/ResonanceHome.tsx` — update fallback platform copy to the approved Business OS definition.
- `src/components/TransparencyWorkspace.tsx` — embed `BusinessOsTransparencyPanel` before the existing audit library while preserving audit evidence behavior.
- `src/app/transparency/page.tsx` — metadata copy for the broader public accountability surface.
- `src/app/globals.css` — focused styles for the Business OS transparency/nomenclature panel and public page, reusing existing tokens.
- `public/transparency/index.html` — static public entry point linking the approved Business OS architecture and machine-readable nomenclature with target-state disclaimer.
- `README.md` — replace AppDev-centric parent-platform wording with the canonical Business OS definition and current/target boundary.
- `docs/ARCHITECTURE.md` — add the Business OS parent definition and implementation-state boundary.
- `docs/UX_WORKFLOW_ARCHITECTURE.md` — clarify that the existing Discover → Govern → Build → Execute → Verify rail is the current workspace workflow, not the future Resonance Project Lifecycle.

---

### Task 1: Canonical Business OS identity and Nomenclature Registry

**Files:**
- Create: `src/lib/datanestNomenclature.ts`
- Create: `public/transparency/business-os/nomenclature.json`
- Create: `tests/unit/business-os-nomenclature-source.test.mjs`
- Modify: `src/lib/ecosystemAuthority.ts`

**Interfaces:**
- Consumes: existing constants `DATANEST_PLATFORM_NAME`, `RONSAS_PRODUCT_NAME`, `RONSAS_PRODUCT_PATH`, and Sparks policy copy from `src/lib/ecosystemAuthority.ts`.
- Produces:
  - `DATANEST_OPERATING_MODEL: string`
  - `DATANEST_PLATFORM_DEFINITION: string`
  - `DATANEST_BUSINESS_OS_SPEC_PATH: string`
  - `DataNestImplementationState = "implemented" | "partial" | "target"`
  - `DataNestNomenclatureEntry` with `key`, `name`, `acronym`, `definition`, `implementationState`, and `public`
  - `DATANEST_NOMENCLATURE: readonly DataNestNomenclatureEntry[]`
  - `getDataNestNomenclatureEntry(key: string): DataNestNomenclatureEntry | undefined`
  - public JSON entries with the same canonical `key`, `name`, `acronym`, and `implementation_state`.

- [ ] **Step 1: Write the failing nomenclature/source test**

Create `tests/unit/business-os-nomenclature-source.test.mjs` with tests that assert:

```js
assert.match(ecosystemAuthority,/Resonance DataNest is the governed Business, Intelligence, Collaboration, and Expansion Operating System for the Resonance ecosystem\./);
assert.deepEqual(
  publicRegistry.entries.map(entry=>entry.key),
  ["ilm","all","csl","gal","galux","ratb","rsgp","project_director","conversation_specialist","growth_spark","barterer_tender","n0nymous_squad","ibank","sparks"]
);
assert.equal(byKey.get("sparks").implementation_state,"implemented");
assert.equal(byKey.get("ibank").implementation_state,"target");
assert.equal(byKey.get("barterer_tender").implementation_state,"target");
assert.equal(byKey.get("all").implementation_state,"target");
assert.equal(byKey.get("csl").implementation_state,"target");
assert.match(byKey.get("sparks").definition,/internal utility/i);
assert.match(byKey.get("ibank").definition,/target/i);
```

Also assert that every public JSON key/name/acronym appears in `src/lib/datanestNomenclature.ts`, preventing the public projection from silently inventing terms.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-nomenclature-source.test.mjs
```

Expected: FAIL because the registry/constants/public JSON do not yet exist.

- [ ] **Step 3: Add canonical Business OS constants**

Modify `src/lib/ecosystemAuthority.ts` to export:

```ts
export const DATANEST_OPERATING_MODEL = "Business, Intelligence, Collaboration, and Expansion Operating System";
export const DATANEST_PLATFORM_DEFINITION = "Resonance DataNest is the governed Business, Intelligence, Collaboration, and Expansion Operating System for the Resonance ecosystem.";
export const DATANEST_BUSINESS_OS_SPEC_PATH = "docs/superpowers/specs/2026-09-29-datanest-business-os-collective-intelligence-design.md";
```

Do not change the existing RONSAS or Sparks constants except where copy needs to reference the same current-state boundary.

- [ ] **Step 4: Implement the typed Nomenclature Registry**

Create `src/lib/datanestNomenclature.ts` with the interfaces above and exactly one entry for each key pinned by Step 1.

Implementation-state decisions for Phase 1:

- `ilm`: `partial`
- `all`: `target`
- `csl`: `target`
- `gal`: `target`
- `galux`: `target`
- `ratb`: `target`
- `rsgp`: `partial`
- `project_director`: `target`
- `conversation_specialist`: `target`
- `growth_spark`: `target`
- `barterer_tender`: `target`
- `n0nymous_squad`: `partial`
- `ibank`: `target`
- `sparks`: `implemented`

Definitions must preserve the master spec's distinctions, especially Growth Spark versus Sparks and iBank versus the current Sparks rail.

- [ ] **Step 5: Create the public machine-readable projection**

Create `public/transparency/business-os/nomenclature.json` with:

```json
{
  "schema_version": 1,
  "platform": "Resonance DataNest",
  "design_status": "approved_target_architecture",
  "entries": []
}
```

Populate `entries` with the same canonical keys/names/acronyms/states as the TypeScript registry. Do not include internal identifiers, user data, credentials, or implementation secrets.

- [ ] **Step 6: Run the focused test**

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-nomenclature-source.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Run TypeScript validation**

Run:

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ecosystemAuthority.ts src/lib/datanestNomenclature.ts public/transparency/business-os/nomenclature.json tests/unit/business-os-nomenclature-source.test.mjs
git commit -m "feat: establish DataNest Business OS nomenclature"
```

---

### Task 2: Reframe Home and regroup only current navigation

**Files:**
- Create: `tests/browser/business-os-foundation.spec.ts`
- Modify: `src/components/DataNestApp.tsx`
- Modify: `src/components/ResonanceHome.tsx`

**Interfaces:**
- Consumes: `DATANEST_OPERATING_MODEL`, `DATANEST_PLATFORM_DEFINITION` from Task 1; existing `ViewKey` set and existing `onNavigate(view)` behavior.
- Produces: mission-oriented group labels over the unchanged current `ViewKey` destinations; visible Business OS fallback copy on AI & I.

Target Phase 1 grouping:

- **Home:** AI & I
- **Explore:** Stakeholder, Sparks, Impact, Think Tanks
- **Portfolio:** Products
- **Projects:** UNIFI Planner, TranScheduler, Runs
- **Intelligence:** DataNest AI
- **Governance:** Governance
- **Assurance:** External Audit & Optimizer, Product Lab, Checkpoints, Audit, Transparency
- **System:** Settings

No `ViewKey` is added or removed. Unimplemented target components such as iBank, Barterer Tender, Project Director, Conversation Specialist, ALL, CSL, GAL, and GALUX do not receive navigation buttons in this phase.

- [ ] **Step 1: Write the failing authenticated browser test**

In `tests/browser/business-os-foundation.spec.ts`, add the smallest mocked Supabase/auth fixture needed to load the existing DataNest shell and assert:

```ts
await expect(page.getByText("Home",{exact:true})).toBeVisible();
await expect(page.getByText("Explore",{exact:true})).toBeVisible();
await expect(page.getByText("Portfolio",{exact:true})).toBeVisible();
await expect(page.getByText("Projects",{exact:true})).toBeVisible();
await expect(page.getByText("Intelligence",{exact:true})).toBeVisible();
await expect(page.getByText("Governance",{exact:true})).toBeVisible();
await expect(page.getByText("Assurance",{exact:true})).toBeVisible();
await expect(page.getByText("System",{exact:true})).toBeVisible();
await expect(page.getByText(/Business, Intelligence, Collaboration, and Expansion Operating System/i)).toBeVisible();
await expect(page.getByRole("button",{name:"iBank",exact:true})).toHaveCount(0);
await expect(page.getByRole("button",{name:"Barterer Tender",exact:true})).toHaveCount(0);
```

Also navigate to `?view=scheduler` and `?view=transparency` to prove existing deep links remain valid.

- [ ] **Step 2: Run the browser test and verify it fails**

Run:

```bash
npx playwright test tests/browser/business-os-foundation.spec.ts
```

Expected: FAIL because current grouping/copy still uses the old organization.

- [ ] **Step 3: Regroup the existing navigation**

Modify only the `group` and user-visible label for existing entries in `src/components/DataNestApp.tsx`.

Rename the current `external_auditor` display label to **External Audit & Optimizer** while preserving the `external_auditor` view key and existing component routing.

Do not add placeholder buttons for target-state capabilities.

- [ ] **Step 4: Update AI & I fallback platform copy**

Modify `src/components/ResonanceHome.tsx` to import the Task 1 platform-definition constant and use it when no project-specific description is supplied.

Preserve the existing **Human intent. AI amplification.** heading and current CTA behavior.

- [ ] **Step 5: Run focused browser tests**

Run:

```bash
npx playwright test tests/browser/business-os-foundation.spec.ts tests/browser/home-optimization.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Verify phone-width navigation does not overflow**

Add to the same browser spec:

```ts
await page.setViewportSize({width:390,height:844});
expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
```

Run the focused browser command again and expect PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/DataNestApp.tsx src/components/ResonanceHome.tsx tests/browser/business-os-foundation.spec.ts
git commit -m "feat: align DataNest navigation with Business OS"
```

---

### Task 3: Publish the Business OS architecture through Transparency

**Files:**
- Create: `src/components/BusinessOsTransparencyPanel.tsx`
- Create: `src/app/business-os/page.tsx`
- Modify: `src/components/TransparencyWorkspace.tsx`
- Modify: `src/app/transparency/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `public/transparency/index.html`
- Modify: `tests/browser/business-os-foundation.spec.ts`
- Test: `tests/unit/business-os-nomenclature-source.test.mjs`

**Interfaces:**
- Consumes:
  - `DATANEST_PLATFORM_DEFINITION`
  - `DATANEST_BUSINESS_OS_SPEC_PATH`
  - `DATANEST_NOMENCLATURE`
- Produces:
  - `BusinessOsTransparencyPanel(): JSX.Element`
  - public route `/business-os`
  - public-safe target/current status presentation
  - static public link to `transparency/business-os/nomenclature.json`.

- [ ] **Step 1: Extend the unit test with public-surface assertions**

Add assertions that:

- `BusinessOsTransparencyPanel.tsx` imports the canonical registry rather than redefining term names;
- the static transparency HTML contains **Business OS Architecture**, **approved target architecture**, and a link to `business-os/nomenclature.json`;
- public copy states that implementation status varies and target-state components are not presented as live.

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-nomenclature-source.test.mjs
```

Expected: FAIL because the panel/static publication has not yet been added.

- [ ] **Step 2: Add the public Business OS architecture route**

Create `src/app/business-os/page.tsx` following the existing read-only `src/app/architecture/page.tsx` pattern.

The page must:

- read `docs/superpowers/specs/2026-09-29-datanest-business-os-collective-intelligence-design.md` server-side;
- title the page **Resonance DataNest — Business OS & Collective Intelligence Architecture**;
- visibly state **Approved target architecture · implementation status varies by section**;
- link back to `./transparency`;
- link to the GitHub source path on `main`;
- render source text without `dangerouslySetInnerHTML`.

- [ ] **Step 3: Add the reusable Transparency panel**

Create `src/components/BusinessOsTransparencyPanel.tsx`.

Render:

- canonical platform definition;
- **Implemented / Partial / Target** legend;
- the formal nomenclature registry with implementation-state badges;
- explicit current boundary: **Sparks remain internal utility; iBank and the External Value Rail are target-state architecture in Phase 1**;
- links to `./business-os` and `./transparency/business-os/nomenclature.json`.

The component must consume the Task 1 registry and constants; do not duplicate canonical term definitions inline.

- [ ] **Step 4: Embed the panel without altering audit semantics**

Modify `src/components/TransparencyWorkspace.tsx` to render `<BusinessOsTransparencyPanel />` before the existing audit-library sections.

Do not change existing audit finding counts, validation state, source-artifact handling, or certification disclaimers.

Update `src/app/transparency/page.tsx` metadata so the public description covers architecture, governance, Business OS design, audits, and accountability evidence.

- [ ] **Step 5: Update the static public transparency entry**

Modify `public/transparency/index.html` to add a Business OS architecture card that:

- links to the GitHub source specification;
- links to `business-os/nomenclature.json`;
- states **approved target architecture; implementation status varies by component**;
- retains the existing audit/certification limitations.

Do not remove or rewrite the existing external audit evidence.

- [ ] **Step 6: Add focused styles**

Modify `src/app/globals.css` with narrowly scoped classes such as:

- `.businessOsTransparencyPanel`
- `.businessOsStateLegend`
- `.businessOsNomenclatureGrid`
- `.businessOsNomenclatureCard`

Use existing color tokens and badge semantics. At `max-width:700px`, collapse nomenclature cards to one column and preserve no horizontal overflow.

- [ ] **Step 7: Extend browser coverage**

In `tests/browser/business-os-foundation.spec.ts` add:

```ts
await page.goto(appPath+"?view=transparency");
await expect(page.getByRole("heading",{name:/Business OS/i})).toBeVisible();
await expect(page.getByText(/Approved target architecture/i)).toBeVisible();
await expect(page.getByText("Barterer Tender",{exact:true})).toBeVisible();
await expect(page.getByText("TARGET",{exact:true}).first()).toBeVisible();
await expect(page.getByText(/Sparks remain internal utility/i)).toBeVisible();
```

Then open the public `/business-os` route and assert the target-state disclaimer and canonical heading are visible.

- [ ] **Step 8: Run focused tests**

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-nomenclature-source.test.mjs
npx playwright test tests/browser/business-os-foundation.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Run existing Transparency regression**

Run:

```bash
node --test --experimental-strip-types tests/unit/transparency-audit-library-source.test.mjs
```

Expected: PASS with all existing audit evidence unchanged.

- [ ] **Step 10: Commit**

```bash
git add src/components/BusinessOsTransparencyPanel.tsx src/app/business-os/page.tsx src/components/TransparencyWorkspace.tsx src/app/transparency/page.tsx src/app/globals.css public/transparency/index.html tests/unit/business-os-nomenclature-source.test.mjs tests/browser/business-os-foundation.spec.ts
git commit -m "feat: publish DataNest Business OS transparency"
```

---

### Task 4: Align repository documentation and prevent current/target drift

**Files:**
- Create: `tests/unit/business-os-docs-source.test.mjs`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/UX_WORKFLOW_ARCHITECTURE.md`

**Interfaces:**
- Consumes: canonical definition and state boundaries established in Tasks 1–3.
- Produces: repository-facing architecture language that distinguishes the current release from the approved target architecture without weakening existing authority boundaries.

- [ ] **Step 1: Write the failing documentation test**

Create `tests/unit/business-os-docs-source.test.mjs` and assert:

```js
assert.match(readme,/Business, Intelligence, Collaboration, and Expansion Operating System/);
assert.match(architecture,/current implementation/i);
assert.match(architecture,/approved target architecture/i);
assert.match(architecture,/RONSAS.*governed product/i);
assert.match(architecture,/Sparks.*internal utility/i);
assert.match(architecture,/External Value Rail.*target/i);
assert.match(ux,/Discover.*Govern.*Build.*Execute.*Verify/s);
assert.match(ux,/workspace workflow/i);
assert.match(ux,/not.*Resonance Project Lifecycle/i);
```

Also assert that none of these documents claim ALL, CSL, GALUX, iBank, Barterer Tender, Project Director, or Conversation Specialist is already live.

- [ ] **Step 2: Run the documentation test and verify it fails**

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-docs-source.test.mjs
```

Expected: FAIL because the current docs are still AppDev-centric and do not carry the new current/target clarification.

- [ ] **Step 3: Update the README parent-platform description**

Modify `README.md` so the first platform-definition paragraph uses the canonical Business OS definition.

Immediately follow it with a concise boundary:

- current release implements the existing governed control-plane foundations;
- the 2026-09-29 master specification defines additional approved target-state capabilities;
- links to the master spec and public Transparency route.

Do not rewrite unrelated setup/deployment instructions.

- [ ] **Step 4: Update the architecture authority document**

Modify `docs/ARCHITECTURE.md` to:

- state the canonical Business OS definition;
- preserve GitHub / Supabase / hosting / RONSAS authority boundaries;
- add a compact **Current implementation vs approved target architecture** section;
- identify current Sparks as internal utility;
- identify iBank / External Value, Barterer Tender, ALL, CSL, GAL/GALUX, RATB, Project Director, Conversation Specialist, and Growth Spark as target-state unless later evidence promotes them;
- link to the master specification.

Do not represent approved target state as deployed architecture.

- [ ] **Step 5: Clarify the current UX workflow document**

Modify `docs/UX_WORKFLOW_ARCHITECTURE.md` near the existing `Discover → Govern → Build → Execute → Verify` definition.

Add one explicit statement:

> This is the current DataNest workspace workflow and navigation model. It is not the target Resonance Project Lifecycle defined in the 2026-09-29 Business OS architecture.

Link to the master specification for the target project lifecycle.

- [ ] **Step 6: Run documentation and full unit tests**

Run:

```bash
node --test --experimental-strip-types tests/unit/business-os-docs-source.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Run static/type/build verification**

Run:

```bash
npm run check
npm run build
```

Expected: PASS.

- [ ] **Step 8: Run focused browser regressions**

Run:

```bash
npx playwright test tests/browser/business-os-foundation.spec.ts tests/browser/home-optimization.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add README.md docs/ARCHITECTURE.md docs/UX_WORKFLOW_ARCHITECTURE.md tests/unit/business-os-docs-source.test.mjs
git commit -m "docs: align DataNest with Business OS architecture"
```

---

## Final Phase 1 Verification

After all four tasks are committed, run:

```bash
npm test
npm run check
npm run build
npx playwright test tests/browser/business-os-foundation.spec.ts tests/browser/home-optimization.spec.ts
git diff --check
```

Expected:

- all commands pass;
- no current `ViewKey` has been removed;
- no unimplemented target-state feature has been added as an operational navigation destination;
- public Business OS architecture and nomenclature are readable without authentication;
- current Sparks are still described as internal utility;
- current audit evidence and validation status remain unchanged;
- no billing behavior, Supabase schema, provider routing, or execution authority has changed.

## Deferred Work

Do **not** pull later phases into this branch. After Phase 1 is merged and verified, create separate implementation plans for:

1. Participation Passport and matching;
2. Project Genesis and Resonance Project Lifecycle;
3. ALL / CSL / GAL / GALUX;
4. Conversation Specialist / WhatsApp Responder / Growth Spark;
5. iBank internal expansion / Barterer Tender Observe + Propose;
6. enterprise Portfolio / Expansion Radar;
7. DataNest domain API / Event Fabric;
8. separately gated External Value Rail;
9. whole-system hardening.

Each later workstream must continue to treat the 2026-09-29 master specification as the architectural authority and must not infer implementation permission for a later phase from completion of Phase 1.
