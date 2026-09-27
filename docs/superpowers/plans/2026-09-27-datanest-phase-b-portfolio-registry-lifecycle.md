# DataNest Phase B Portfolio Registry & Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed Portfolio Registry beside the existing Product Registry so DataNest can classify, relate, promote, deprecate, and retire applications/capabilities without inferring ownership or breaking current RONSAS/Product Lab behavior.

**Architecture:** Keep `products` authoritative for governed products and add append-only portfolio identity, classification, relationship, and lifecycle history around it. Use project-scoped Supabase RLS plus governed RPCs for significant writes, a `security_invoker` read view for current state, an optional Product Lab link, and a separate Portfolio Registry panel inside the existing Products workspace.

**Tech Stack:** PostgreSQL/Supabase RLS and RPCs, Next.js 15.5.2, React 19.1.1, TypeScript 5.9.2, Supabase JS 2.57.4, Node test runner, Playwright 1.55.0.

**Spec:** `docs/superpowers/specs/2026-09-27-datanest-phase-b-portfolio-registry-lifecycle-design.md`

## Global Constraints

- DataNest remains the parent platform and control plane.
- RONSAS remains a governed product under `DataNest > Products > RONSAS`.
- `products` remains the canonical governed-product identity table.
- Existing `product_records`, RONSAS import evidence, Product Lab test history, and current product URLs remain intact.
- Historical RONSAS application placement is provenance only and must not create an active ownership classification.
- Unknown or unresolved architectural ownership is `pending_review`; do not guess.
- Promotion does not enable billing; promoted products default to `billing_enabled=false`.
- Product Lab `production` environment does not imply governed-product promotion.
- Significant classification, relationship, lifecycle, promotion, deprecation, and retirement writes must be validated inside governed database functions.
- Anonymous control-plane writes remain prohibited.
- All new foreign-key columns must be indexed.
- All new public multi-tenant tables must use project-scoped RLS.
- Derived portfolio views must use invoker security so underlying RLS remains authoritative.
- Cloud-Nest, Supository, ILM, Resource Fabric, billing, repository moves, runtime moves, and Phase C-H work are out of scope.

## Review Focus

1. **Historical ownership ambiguity:** every backfilled historical RONSAS application must stay `pending_review` with provenance and no active `product_owned` classification.
2. **Promotion atomicity:** a failed candidate promotion must leave neither an orphan `products` row nor a partially promoted Portfolio Item.
3. **Relationship integrity:** self-links, cross-project links, duplicate active classifications, and direct/indirect `contains` cycles must fail closed.
4. **Retirement safety:** an item with active critical dependants or active linked production surfaces must not retire.
5. **Compatibility:** current RONSAS deep links, billing-off banner, Product Lab legacy surfaces, and Portfolio Pulse governed-product counts must remain unchanged.

---

## File Structure

- Create `supabase/migrations/20260927094500_add_portfolio_registry_v1.sql` — schema, indexes, RLS, read view, backfill, and governed RPCs.
- Create `src/lib/portfolioRegistry.ts` — shared TypeScript types, labels, and pure formatting helpers.
- Create `src/components/PortfolioRegistryPanel.tsx` — portfolio read/review UI isolated from the existing product catalog.
- Modify `src/components/DataNestApp.tsx` — pass current project role authority into Products workspace.
- Modify `src/components/ProductsWorkspace.tsx` — load Portfolio Registry state, preserve current Product Catalog behavior, and host the new panel/deep link.
- Modify `src/components/ProductLab.tsx` — optional Portfolio Item association for surfaces.
- Modify `src/app/globals.css` — Portfolio Registry and Product Lab linkage styles/mobile containment.
- Create `tests/unit/portfolio-registry-source.test.mjs` — migration, RPC, RLS, backfill, and source contracts.
- Modify `tests/unit/products-source.test.mjs` — compatibility assertions for RONSAS, billing-off, and product-only catalog semantics.
- Modify `tests/unit/ui-ux-source.test.mjs` — Portfolio UI and Product Lab linkage source contracts.
- Modify `tests/browser/products.spec.ts` — Portfolio Registry deep-link and browser regression coverage.

### Task 1: Portfolio Registry Schema, RLS, Read Model, and Backfill

**Files:**
- Create: `supabase/migrations/20260927094500_add_portfolio_registry_v1.sql`
- Create: `tests/unit/portfolio-registry-source.test.mjs`

**Interfaces:**
- Produces tables:
  - `public.portfolio_items`
  - `public.portfolio_classifications`
  - `public.portfolio_relationships`
  - `public.portfolio_lifecycle_events`
- Produces view: `public.portfolio_registry_view`
- Produces nullable column: `public.product_surfaces.portfolio_item_id uuid`
- Produces seeded Portfolio Items for RONSAS plus nine historical application records.
- Later tasks consume these exact names.

- [ ] **Step 1: Write the failing migration-source contract**

Create `tests/unit/portfolio-registry-source.test.mjs` and assert the migration contains:
- four tables above;
- checks for item kinds `governed_product, product_candidate, application, module, capability, external_capability`;
- checks for review states `pending_review, classified, deprecated, retired`;
- lifecycle states `concept, experiment, validating, candidate, active, maintained, deprecated, retired`;
- classification values `product_owned, shared_datanest_capability, independent_datanest_product, registered_external_capability`;
- relationship types `contains, uses, provides, depends_on, replaces, supersedes, integrates_with, derived_from`;
- relationship criticality `optional, normal, critical`;
- unique `(project_id,slug)` identity;
- one active classification partial unique index on `portfolio_item_id where status='active'`;
- indexes on every new FK column;
- RLS enabled for every new public table;
- no authenticated write grants that bypass governed functions for classifications/relationships/lifecycle;
- `portfolio_registry_view` created with `security_invoker=true`;
- nullable `product_surfaces.portfolio_item_id` plus index;
- no deletion/update of `product_records`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

`node --test --experimental-strip-types tests/unit/portfolio-registry-source.test.mjs`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement the schema and indexes**

In `20260927094500_add_portfolio_registry_v1.sql`, create:

`portfolio_items`
- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references projects(id) on delete cascade`
- `slug text not null`
- `name text not null`
- `item_kind text not null`
- `review_state text not null default 'pending_review'`
- `current_lifecycle_state text not null default 'concept'`
- `linked_product_id uuid references products(id) on delete set null`
- `operating_owner_user_id uuid references auth.users(id) on delete set null`
- `source_authority text`
- `source_reference text`
- `metadata jsonb not null default '{}'`
- `created_by uuid references auth.users(id) on delete set null`
- timestamps
- unique `(project_id,slug)`
- unique partial index on non-null `linked_product_id`

`portfolio_classifications`
- project/item FKs;
- `classification`, nullable `target_product_id`;
- `status in ('proposed','active','superseded','rejected')`;
- rationale/evidence/proposer/approver/timestamps;
- check: `product_owned` requires `target_product_id`.

`portfolio_relationships`
- project/source/target FKs;
- relationship type, nullable criticality;
- status/rationale/evidence/proposer/approver/timestamps;
- check `source_item_id <> target_item_id`.

`portfolio_lifecycle_events`
- project/item FKs;
- nullable `from_state`, non-null `to_state`;
- `status in ('proposed','active','superseded','rejected')`;
- reason/evidence/proposer/approver/timestamps.

Add all FK indexes explicitly.

- [ ] **Step 4: Add RLS and read view**

Follow the existing project helpers:
- read: `private.is_project_stakeholder(project_id) or private.is_project_member(project_id)`;
- Portfolio Item creation/update metadata: owner/admin/operator;
- direct delete: owner/admin only, but application code must not use delete for ordinary lifecycle work;
- classification/relationship/lifecycle tables: authenticated SELECT only through RLS; governed mutations occur through RPCs created in later tasks.

Create `portfolio_registry_view with (security_invoker=true)` resolving:
- item identity/current fields;
- active classification and target product;
- current lifecycle;
- counts of active relationships;
- count of linked Product Lab surfaces;
- source provenance summary.

- [ ] **Step 5: Implement idempotent baseline backfill**

Backfill RONSAS by joining the existing `products.slug='ronsas'` row and insert/update one Portfolio Item:
- slug `ronsas`;
- kind `governed_product`;
- review state `classified`;
- lifecycle `active`;
- linked product = existing RONSAS product;
- active classification = `independent_datanest_product`.

Backfill these exact historical application identities from RONSAS application records with `pending_review`, no active classification, and source row/import provenance:

`epublisher`, `creative-studio`, `sync-vision`, `youtube-optimizer`, `sovereignforge`, `lyricsync-studio`, `scene-song-spark`, `resonance-appdev-reson8-adt`, `rons-control-center`.

Use `insert ... on conflict (project_id,slug) do update` only for safe metadata/provenance normalization; do not infer ownership.

- [ ] **Step 6: Run focused migration-source tests**

Run:

`node --test --experimental-strip-types tests/unit/portfolio-registry-source.test.mjs tests/unit/products-source.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add supabase/migrations/20260927094500_add_portfolio_registry_v1.sql tests/unit/portfolio-registry-source.test.mjs
git commit -m "feat: add governed portfolio registry foundation"
```

### Task 2: Governed Classification, Relationship, and Lifecycle RPCs

**Files:**
- Modify: `supabase/migrations/20260927094500_add_portfolio_registry_v1.sql`
- Modify: `tests/unit/portfolio-registry-source.test.mjs`

**Interfaces:**
- Produces RPCs:
  - `public.propose_portfolio_classification(target_item uuid, target_classification text, target_product uuid default null, target_rationale text default null, target_evidence_reference text default null) returns uuid`
  - `public.approve_portfolio_classification(target_classification_id uuid) returns uuid`
  - `public.propose_portfolio_relationship(target_source_item uuid, target_target_item uuid, target_relationship_type text, target_criticality text default null, target_rationale text default null, target_evidence_reference text default null) returns uuid`
  - `public.approve_portfolio_relationship(target_relationship_id uuid) returns uuid`
  - `public.propose_portfolio_lifecycle_transition(target_item uuid, target_state text, target_reason text, target_evidence_reference text default null) returns uuid`
  - `public.approve_portfolio_lifecycle_transition(target_event_id uuid) returns uuid`
- All RPCs use authenticated caller identity and project-role helpers.

- [ ] **Step 1: Extend failing source tests for authority and integrity**

Assert:
- every security-definer function checks `auth.uid()`;
- proposal RPCs require owner/admin/operator;
- approval RPCs require owner/admin;
- public EXECUTE is revoked before authenticated grant;
- active classification approval supersedes any previous active classification in one transaction;
- `product_owned` target product must belong to same project;
- relationship source/target project must match;
- self-reference rejected;
- `contains` cycle detection exists through a recursive query;
- lifecycle approval updates `portfolio_items.current_lifecycle_state` only after approval;
- lifecycle history is never deleted.

Run and verify FAIL before implementing.

- [ ] **Step 2: Implement classification proposal/approval**

Proposal inserts a `proposed` row after item/project/role validation.

Approval must:
1. lock the target Portfolio Item;
2. validate proposed state and same-project target product;
3. supersede any prior active classification;
4. activate the proposal and stamp approver/time;
5. update `portfolio_items.review_state='classified'` unless lifecycle is deprecated/retired.

No external calls occur inside the transaction.

- [ ] **Step 3: Implement relationship proposal/approval**

Proposal validates same project and no self-reference.

Approval validates:
- source/target still exist in same project;
- no `contains` cycle using recursive reachability from target to source;
- no contradictory active relationship duplicate;
- classification compatibility where a relationship requires a target product.

Activate only after owner/admin approval.

- [ ] **Step 4: Implement lifecycle proposal/approval**

Proposal accepts only the controlled lifecycle values.

Approval:
- locks item;
- records prior state as `from_state`;
- activates event;
- updates `current_lifecycle_state`;
- maps `review_state` to `deprecated` or `retired` only for those lifecycle states, otherwise preserves `pending_review` vs `classified`.

- [ ] **Step 5: Run focused RPC contract tests**

Run:

`node --test --experimental-strip-types tests/unit/portfolio-registry-source.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add supabase/migrations/20260927094500_add_portfolio_registry_v1.sql tests/unit/portfolio-registry-source.test.mjs
git commit -m "feat: add governed portfolio decision workflows"
```

### Task 3: Atomic Candidate Promotion, Deprecation, and Retirement Guards

**Files:**
- Modify: `supabase/migrations/20260927094500_add_portfolio_registry_v1.sql`
- Modify: `tests/unit/portfolio-registry-source.test.mjs`

**Interfaces:**
- Produces:
  - `public.promote_product_candidate(target_item uuid, target_product_payload jsonb, target_surface_id uuid, target_build_commit text, target_evidence_reference text) returns uuid`
  - `public.deprecate_portfolio_item(target_item uuid, target_reason text, target_evidence_reference text default null) returns uuid`
  - `public.retire_portfolio_item(target_item uuid, target_reason text, target_replacement_item uuid default null, target_evidence_reference text default null) returns uuid`
- Promotion payload required keys:
  - `slug`, `name`, `mission`, `category`, `operating_model`, `primary_runtime`
  - `problem_statement`, `intended_users`, `value_proposition`, `demand_evidence`
- Promotion always writes `billing_enabled=false` and `commercial_mode='free promotion / no billing until pricing is established'`.

- [ ] **Step 1: Add failing promotion/retirement tests**

Source-contract assertions must pin:
- candidate kind and current lifecycle `candidate`;
- non-null `operating_owner_user_id`;
- active classification `independent_datanest_product`;
- exact linked Product Lab surface;
- exact non-null build commit equality;
- at least one test run for that exact surface/build;
- latest evidence for each active test case on that build contains no `fail` or `blocked`;
- transaction creates product + link + kind/lifecycle/classification updates atomically;
- billing forced false;
- active critical dependant blocks retirement;
- linked active `production` Product Lab surface blocks retirement;
- replacement item, when supplied, must be same project and not self.

Run and verify FAIL.

- [ ] **Step 2: Implement `promote_product_candidate`**

Within one short transaction:
1. authenticate owner/admin;
2. lock candidate item;
3. validate kind/lifecycle/owner/classification;
4. validate Product Lab surface belongs to item and exact build;
5. validate current exact-build test evidence;
6. validate required JSON keys;
7. create `products` row with generated UUID and billing disabled;
8. link Portfolio Item, change kind to `governed_product`, lifecycle to `active`, review state `classified`;
9. record active lifecycle/promotion evidence;
10. preserve existing historical source provenance.

Any error rolls back the entire operation.

- [ ] **Step 3: Implement deprecation and retirement**

`deprecate_portfolio_item` requires owner/admin, records lifecycle history, and sets lifecycle/review state to deprecated.

`retire_portfolio_item` additionally rejects:
- active incoming `depends_on` relationship with `criticality='critical'`;
- active linked Product Lab surface with `environment='production' and status='active'`;
- invalid replacement item.

On success record `replaces`/replacement provenance where supplied, set lifecycle/review state retired, and retain all historical records.

- [ ] **Step 4: Run focused tests**

Run:

`node --test --experimental-strip-types tests/unit/portfolio-registry-source.test.mjs tests/unit/products-source.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add supabase/migrations/20260927094500_add_portfolio_registry_v1.sql tests/unit/portfolio-registry-source.test.mjs
git commit -m "feat: govern portfolio promotion and retirement"
```

### Task 4: Product Lab Portfolio Linkage

**Files:**
- Create: `src/lib/portfolioRegistry.ts`
- Modify: `src/components/ProductLab.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/ui-ux-source.test.mjs`

**Interfaces:**
- `src/lib/portfolioRegistry.ts` exports:
  - `PortfolioItemKind`
  - `PortfolioClassification`
  - `PortfolioLifecycleState`
  - `PortfolioRegistryItem`
  - `portfolioKindLabel(kind)`
  - `portfolioClassificationLabel(value|null)`
  - `portfolioLifecycleLabel(state)`
- Product Lab `Surface` gains `portfolio_item_id:string|null`.
- Product Lab reads `portfolio_registry_view` for selectable items.

- [ ] **Step 1: Add failing source tests**

Assert Product Lab:
- selects `portfolio_item_id`;
- keeps existing surfaces valid when null;
- loads same-project Portfolio Registry items;
- allows operator to choose an optional item when registering a new surface;
- writes `portfolio_item_id` with the new surface;
- displays linked item kind/classification without implying product promotion;
- still requires immutable build identity exactly as current behavior requires.

Run and verify FAIL.

- [ ] **Step 2: Add shared Portfolio Registry types/labels**

Implement the exact exports above in `src/lib/portfolioRegistry.ts`. Keep them pure; no Supabase calls.

- [ ] **Step 3: Extend Product Lab surface form**

Load permitted registry items from `portfolio_registry_view`.

Add an optional `Portfolio item` selector with `Unlinked / project-only surface` as the default.

Include `portfolio_item_id` in surface creation and list/detail displays.

Do not retroactively auto-link existing surfaces.

- [ ] **Step 4: Add minimal responsive styles**

Add only the selectors needed for the new Product Lab portfolio field/badge, preserving current mobile containment.

- [ ] **Step 5: Run unit and type checks**

Run:

`node --test --experimental-strip-types tests/unit/ui-ux-source.test.mjs tests/unit/portfolio-registry-source.test.mjs`

Run:

`npm run check`

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/lib/portfolioRegistry.ts src/components/ProductLab.tsx src/app/globals.css tests/unit/ui-ux-source.test.mjs
git commit -m "feat: link Product Lab surfaces to portfolio items"
```

### Task 5: Products Workspace Portfolio Registry Read UI and URL Compatibility

**Files:**
- Create: `src/components/PortfolioRegistryPanel.tsx`
- Modify: `src/components/DataNestApp.tsx`
- Modify: `src/components/ProductsWorkspace.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/products-source.test.mjs`
- Modify: `tests/unit/ui-ux-source.test.mjs`

**Interfaces:**
- `PortfolioRegistryPanel` props:
  - `projectId:string`
  - `items:PortfolioRegistryItem[]`
  - `selectedSlug:string|null`
  - `onSelect:(slug:string)=>void`
  - `canOperate:boolean`
  - `canAdmin:boolean`
  - `onRefresh:()=>Promise<void>`
- `ProductsWorkspace` gains `role:"owner"|"admin"|"operator"|"viewer"`, `canOperate:boolean`, and `canAdmin:boolean`.
- Existing `product=`, `recordType=`, and `q=` query semantics remain unchanged.
- New portfolio query state:
  - `section=portfolio`
  - `item=<portfolio-slug>`

- [ ] **Step 1: Add failing Products source contracts**

Assert:
- `DataNestApp` passes `membership?.role||"viewer"`, `canOperate`, and `canManageAi` to `ProductsWorkspace`;
- Products workspace loads `portfolio_registry_view`;
- Governed Products and Portfolio Registry are visibly separate;
- existing `product`, `recordType`, `q` URL handling remains;
- portfolio uses `section=portfolio&item=<slug>`;
- portfolio selection does not overwrite `product=`;
- RONSAS remains in governed products;
- Portfolio Pulse still receives only `catalogProducts`;
- Pending Review, Product Owned, Shared DataNest, Independent Product, External labels exist;
- Portfolio Registry unavailable state does not fail the Product Catalog.

- [ ] **Step 2: Implement isolated `PortfolioRegistryPanel` read surface**

Render:
- registry counts by kind/review state;
- searchable item list;
- separate badges for kind, classification, lifecycle;
- selected item detail;
- provenance;
- active relationship summary;
- Product Lab evidence count;
- historical RONSAS association as provenance text, not ownership.

Do not add another top-level navigation item.

- [ ] **Step 3: Integrate role and registry state into Products workspace**

Pass role authority from `DataNestApp` to `ProductsWorkspace`.

Load the view independently from current product queries so failure can render:

`Portfolio Registry temporarily unavailable.`

while current governed products remain usable.

Preserve current product selection, catalog search/filter, Legal Eagle, and Portfolio Pulse.

- [ ] **Step 4: Implement backward-compatible deep links**

Parse and maintain:
- current product URL parameters unchanged;
- `section=portfolio`;
- `item=<slug>`.

A retired item must remain addressable if returned by the view.

- [ ] **Step 5: Add responsive styles**

Add Portfolio Registry layout styles to `globals.css`, including a 390px mobile layout with no horizontal page overflow.

- [ ] **Step 6: Run unit and build checks**

Run:

`npm test`

Run:

`npm run check`

Run:

`npm run build`

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/components/PortfolioRegistryPanel.tsx src/components/DataNestApp.tsx src/components/ProductsWorkspace.tsx src/app/globals.css tests/unit/products-source.test.mjs tests/unit/ui-ux-source.test.mjs
git commit -m "feat: add Portfolio Registry read experience"
```

### Task 6: Governed Portfolio Actions in the Products Workspace

**Files:**
- Modify: `src/components/PortfolioRegistryPanel.tsx`
- Modify: `src/components/ProductsWorkspace.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/products-source.test.mjs`
- Modify: `tests/unit/ui-ux-source.test.mjs`

**Interfaces:**
- Consumes Task 2/3 RPCs and Task 5 role props.
- Produces user actions:
  - create Portfolio Item for operator/admin/owner;
  - propose classification;
  - approve/reject pending classification for admin/owner;
  - propose relationship;
  - approve/reject pending relationship for admin/owner;
  - propose lifecycle transition;
  - approve/reject pending lifecycle event for admin/owner;
  - promote eligible candidate for admin/owner;
  - deprecate/retire item for admin/owner.
- Browser code never writes classification/relationship/lifecycle tables directly.

- [ ] **Step 1: Add failing source tests for governed actions**

Assert:
- direct browser `.insert()` / `.update()` against `portfolio_classifications`, `portfolio_relationships`, and `portfolio_lifecycle_events` is absent;
- proposal buttons invoke the exact Task 2 RPC names;
- approval buttons invoke the exact Task 2 approval RPC names;
- promotion invokes `promote_product_candidate`;
- deprecation/retirement invoke their Task 3 RPCs;
- viewers see no mutation controls;
- operators can create items/propose but cannot approve/promote/retire;
- owner/admin controls are gated by `canAdmin`;
- each successful mutation calls `onRefresh()`;
- RPC errors stay local to Portfolio Registry and do not clear the governed Product Catalog.

Run and verify FAIL.

- [ ] **Step 2: Add operator Portfolio Item creation**

Use direct `portfolio_items` insert under existing RLS only for initial registry identity creation.

Require:
- non-empty name;
- explicit item kind;
- project-scoped slug generated from user input and editable before submit;
- default review state `pending_review`;
- no automatic linked product or ownership.

After insert, refresh and select the new item.

- [ ] **Step 3: Add classification and relationship proposal/approval UI**

For `canOperate`, render proposal forms against the selected item.

For `canAdmin`, render pending decision cards with Approve and Reject actions.

Use the Task 2 RPCs only. Show rationale/evidence reference in the review card.

- [ ] **Step 4: Add lifecycle and candidate promotion UI**

Operators may propose lifecycle transitions.

Owners/admins may approve lifecycle events and, for a `product_candidate` in lifecycle `candidate`, open a Promotion Packet form containing the Task 3 required product/evidence fields and an exact linked Product Lab surface/build.

Promotion success refreshes both portfolio and governed product queries without changing billing.

- [ ] **Step 5: Add deprecation and retirement UI**

Owners/admins can:
- deprecate with reason/evidence;
- retire with reason, optional replacement item, and evidence.

Surface fail-closed database errors such as critical dependants or active production surface without hiding the item or losing history.

- [ ] **Step 6: Run unit/type/build checks**

Run:

`npm test`

Run:

`npm run check`

Run:

`npm run build`

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/components/PortfolioRegistryPanel.tsx src/components/ProductsWorkspace.tsx src/app/globals.css tests/unit/products-source.test.mjs tests/unit/ui-ux-source.test.mjs
git commit -m "feat: add governed portfolio review actions"
```

### Task 7: Browser Regression and Release Verification

**Files:**
- Modify: `tests/browser/products.spec.ts`
- Modify: `tests/unit/portfolio-registry-source.test.mjs`

**Interfaces:**
- Consumes all Phase B schema/UI interfaces.
- Produces release evidence only; no new runtime interface.

- [ ] **Step 1: Extend browser fixtures**

Add fixture responses for:
- `portfolio_registry_view`;
- one RONSAS governed-product item;
- at least two historical applications in `pending_review`;
- one shared capability;
- one external capability;
- one deprecated/retired item;
- Product Lab optional linkage where relevant.

- [ ] **Step 2: Add browser assertions for Phase B**

Test:
- existing `?view=products&product=ronsas&recordType=risk&q=runner` path still works;
- canonical RONSAS full name remains visible;
- `FREE PROMOTION · BILLING OFF` remains visible;
- Portfolio Pulse governed-product count is not inflated by portfolio items;
- Portfolio Registry opens through `section=portfolio`;
- historical apps visibly say `PENDING REVIEW`;
- shared/external classifications render distinctly;
- `item=sync-vision` deep link resolves without changing the current governed product identity;
- 390x844 viewport has no page-level horizontal overflow.

- [ ] **Step 3: Add final migration-scope assertions**

Assert Phase B migration does not:
- enable billing;
- delete `products` or `product_records`;
- alter RONSAS parent authority;
- auto-classify historical applications as product-owned;
- introduce Cloud-Nest/Supository/ILM schema.

- [ ] **Step 4: Run full verification**

Run:

`npm test`

Expected: all unit tests pass.

Run:

`npm run check`

Expected: no TypeScript errors.

Run:

`npm run build`

Expected: production build succeeds.

Run:

`npm run test:browser -- tests/browser/products.spec.ts`

Expected: all Products/Portfolio browser tests pass.

- [ ] **Step 5: Inspect implementation scope**

Run:

`git diff --check <phase-b-base>..HEAD`

Expected: no whitespace errors.

Run:

`git diff --name-only <phase-b-base>..HEAD`

Expected changes are limited to the migration, Portfolio Registry library/component, Products/Product Lab UI, CSS, and specified tests/documentation. No unrelated billing, DataNest AI, Sparks, RONSAS integration, hosting, or Phase C-H files.

- [ ] **Step 6: Commit Task 7**

```bash
git add tests/browser/products.spec.ts tests/unit/portfolio-registry-source.test.mjs
git commit -m "test: verify Phase B portfolio compatibility"
```

## Plan Self-Review

**Spec coverage:** Tasks 1-3 cover identity, classification, relationship, lifecycle, backfill, atomic promotion, deprecation, and retirement. Task 4 covers Product Lab linkage. Task 5 covers read UX and URL compatibility. Task 6 covers governed review/write UX. Task 7 covers regression, fail-closed scope, and release verification.

**Step scan:** Each task has one independently reviewable result and its own RED/GREEN or verification cycle. No task introduces Phase C-H infrastructure.

**Type consistency:** Database names and TypeScript names are fixed once and reused: `portfolio_items`, `portfolio_classifications`, `portfolio_relationships`, `portfolio_lifecycle_events`, `portfolio_registry_view`, and `product_surfaces.portfolio_item_id`.

**Review Focus:** Historical ambiguity is pinned in Tasks 1/7; promotion atomicity in Task 3; relationship integrity in Task 2; retirement guards in Task 3; backward compatibility in Tasks 5/7.

**Postgres review:** The plan explicitly requires FK indexes, project-scoped RLS, invoker-security views, explicit authenticated authorization in security-definer RPCs, and short transactional write paths with no external calls.

**Proportion:** The plan implements only the approved Phase B spec. It deliberately avoids building the later Resource Fabric, Trust Manifest, ILM, or commercial systems.
