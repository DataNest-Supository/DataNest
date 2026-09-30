# DataNest Supository Architecture

## Canonical scope

**DataNest-Supository/DataNest** is the canonical Resonance AppDev Supository and control plane for Resonance application-development projects, products and services.

Current canonical public endpoint:

- https://datanest-supository.github.io/DataNest/

Current canonical source/CI/evidence repository:

- https://github.com/DataNest-Supository/DataNest

The Supository is broader than a source-code repository. It is the governed index of product identity, source location, deployment intent, evidence, lifecycle state, releases and service relationships across Resonance AppDev.

## Authority model

The current production authority model remains unchanged until a separately governed cutover is approved:

1. **DataNest** — parent AppDev governance, execution and promotion authority.
2. **DataNest-Supository/DataNest** — canonical GitHub source, history, CI and evidence authority.
3. **GitHub Pages** — current public DataNest delivery target.
4. **Supabase** — governed auth, database, storage and backend-function authority.
5. **Dropbox** — governed backup/recovery artifact host.
6. **Reson8 Forge** — sovereign Git/registry/automation extension and replica of the Supository; it does not silently replace the current canonical GitHub or Pages authority.

## Supository responsibilities

Every Resonance AppDev project, product or service should be representable through the Supository catalog with:

- stable identifier and display name;
- type: project, product, service, app, package, infrastructure or governance capability;
- owning portfolio / parent;
- source path or external source repository;
- public delivery route when one exists;
- lifecycle state;
- promotion/release evidence;
- runtime/backend dependencies;
- governance and security requirements;
- backup/recovery classification.

The machine-readable starting point is `config/supository.catalog.json`.

## Current hosted application namespace

The existing GitHub Pages release already builds DataNest-hosted RONSAS applications under:

`/DataNest/apps/<app>/`

The current repository contains these governed application source paths:

- `apps/ronsas/career-compass`
- `apps/ronsas/creative-studio`
- `apps/ronsas/epublisher`
- `apps/ronsas/lyricsync-studio`
- `apps/ronsas/scene-song-spark`
- `apps/ronsas/sovereign-forge`
- `apps/ronsas/syncvision`
- `apps/ronsas/youtube-optimizer`
- `apps/ronsas/sovereign-backend`
- `apps/ronsas/shared`

The production Pages workflow currently verifies the public hosted subset during deployment.

## Forge relationship

The custom Git environment is therefore a **DataNest Supository Forge**, not a parallel Resonance repository.

Target namespace:

`git.reson8.life/DataNest-Supository/DataNest`

Initial operating mode:

`GitHub canonical -> governed mirror -> DataNest Supository Forge`

The Forge should provide:

- sovereign Git hosting and repository replication;
- package/container registry;
- isolated CI runners;
- project/product/service namespaces;
- signed release and artifact retention;
- machine/AI agent identities with scoped permissions;
- audit trails for agent and human changes;
- disaster-recovery source replication;
- future private repositories that remain cataloged through DataNest.

A future authority cutover may reverse the mirror direction, but only through explicit governance, validation and recovery evidence. The public DataNest URL must not change merely because the Forge is deployed.

## Recommended namespace

```text
DataNest-Supository/
├── DataNest                # canonical parent control plane
├── projects/               # governed project namespaces / future split repos
├── products/               # product source or product manifests
├── services/               # APIs, workers, backends and integrations
├── packages/               # shared libraries and registries
├── infrastructure/         # deployment and platform definitions
└── governance/             # policies, evidence schemas and release controls
```

This is a logical namespace. It does not require immediate repository splitting. The present monorepo may remain canonical while DataNest catalogs external or future repositories.

## Non-negotiable continuity rule

Deploying Reson8 Forge must not:

- break the existing GitHub Pages endpoint;
- rewrite the current release authority without approval;
- remove GitHub CI/evidence before equivalent controls are validated;
- move Supabase authority implicitly;
- create a second conflicting source of truth.

The first production objective is **sovereign replication and extension**. Replacement is a separate migration decision.

## DataNest admin R&D access

The canonical DataNest UI exposes an **R&D Test Mode** toggle only to authenticated project members whose server-backed role is `owner` or `admin`.

Enabling it opens the live production-parity Mirror UI:

- `https://datanest-supository.github.io/Mirror-DataNest/`

The toggle also reads the Mirror's immutable `mirror-release.json` and synchronizes that exact build into the current Product Lab and governance evidence models. Reviewers can immediately open Product Lab to record visual and functional evidence against the same build SHA/release ID.

The toggle:

- does not change the user's canonical DataNest role;
- does not grant canonical production deployment authority;
- does not merge or synchronize source automatically;
- does not bypass Audit Optimizer or human governance;
- does provide direct access to the live candidate UI and evidence-registration path.

Operators and viewers do not receive the admin toggle.

## MIRROR-DATANEST production-parity R&D lane

`DataNest-Supository/Mirror-DataNest` is the designated ungated R&D repository and production-parity candidate deployment environment.

Its two authorities are deliberately separated:

- **Mirror candidate deployment authority: YES** — it may deploy its own `/Mirror-DataNest/` site for testing.
- **Canonical DataNest deployment authority: NO** — it may not deploy or replace `/DataNest/`.

The Mirror candidate uses the **DataNest AI Staging** Supabase project (`qchttpcyqlqnhvahprhz`) so reviewers can exercise real functional paths without defaulting writes to the canonical production backend.

Each Mirror live release has an immutable commit and release ID. The Pages workflow verifies the public routes and runs browser-level visual/functional checks against the deployed site.

### Database-aligned evidence model

The Mirror workflow reuses the current production governance schema rather than introducing a parallel update-management database.

- `product_surfaces` registers the Mirror live candidate URL + exact build/release identity.
- `product_test_cases` defines reusable certification checks.
- `product_test_runs` stores pass/fail/blocked evidence with immutable URL/build/release snapshots plus browser/viewport context.
- `governance_observations` exposes the candidate evidence to the current Audit Optimizer evidence snapshot.
- `optimizer_runs` / `optimizer_suggestions` continue the current AI audit/optimization model.
- `governance_improvement_candidates` carries owner-approved optimizer suggestions into formal governance.
- `security_acceptance_runs`, `portfolio_lifecycle_events`, `ai_development_updates`, `artifacts` and `events` remain the corresponding security, lifecycle, update and provenance records.

### Production certification path

```text
DataNest/main baseline
    -> Mirror-DataNest R&D
    -> live Mirror production-parity deployment
    -> visual + functional evidence
    -> Package Production Candidate
    -> mirror-promotion/* branch in DataNest
    -> DataNest AI Certification against governed staging
    -> canonical CI / security / RONSAS validation
    -> DataNest Audit Optimizer evidence review
    -> formal governance + human reviewer approval
    -> DataNest/main
    -> exact-SHA governed canonical production deployment
```

The canonical release payload requires a Mirror promotion reference, successful live Mirror evidence, DataNest AI Certification evidence for the governed staging backend, and an Audit Optimizer reference before production authorization can resolve.

A Mirror deployment is therefore **live evidence**, not canonical production authority.
