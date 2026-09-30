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

Enabling the toggle opens the live `DataNest-Supository/Mirror-DataNest` R&D repository. The prepared GitHub Pages preview becomes the preferred launch target after Pages is enabled for that repository. The toggle:

- does not change the user's canonical DataNest role;
- does not grant production deployment authority;
- does not bypass canonical review or release gates;
- does not synchronize code automatically;
- is a navigation/access affordance into the ungated R&D environment.

Operators and viewers do not receive the toggle in the canonical UI. Because the initial Mirror preview is delivered through public GitHub Pages, this UI control is not itself a network-level confidentiality boundary; private R&D access requires a separately authenticated hosting layer.

## MIRROR-DATANEST R&D lane

`DataNest-Supository/Mirror-DataNest` is the designated ungated R&D clone of the canonical DataNest Supository.

Its role is to optimize application code, user experience, build behavior, deployment design and infrastructure without imposing canonical production approval gates on every experimental iteration.

Authority boundary:

- Mirror-DataNest is not source-of-truth authority.
- Mirror-DataNest does not receive production deployment authority.
- Mirror-DataNest must not directly synchronize to `DataNest/main`.
- Production secrets and privileged production write paths do not belong in the mirror.
- Automated checks in the mirror are advisory R&D evidence rather than governance gates.

Promotion path:

```text
DataNest/main
    -> Mirror-DataNest R&D
    -> selected candidate + evidence
    -> promotion branch in DataNest
    -> canonical pull request
    -> human reviewer approval
    -> DataNest/main
    -> governed production deployment
```

The synchronization boundary is therefore where production governance resumes. A successful mirror preview is evidence for review, not authorization to release.
