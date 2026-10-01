# DataNest

**DataNest** is the canonical Resonance AppDev web control plane. It governs product execution intent, promotion, evidence and lifecycle state while preserving separate source, backend and delivery authorities.

## Independent assurance services

DataNest offers **private independent regulatory-readiness, technical-audit support, evidence, remediation and authorized digital-oversight services**.

- Public service page: **https://datanest-supository.github.io/DataNest/assurance/**
- Commercial charter: [docs/INDEPENDENT_REGULATORY_ASSURANCE_SERVICES.md](docs/INDEPENDENT_REGULATORY_ASSURANCE_SERVICES.md)
- Trade & implementation intake: GitHub issue template `Trade & Implementation Interest`

This service does **not** claim statutory government-regulator status, IRBA audit-firm status, accredited ISO certification-body status, or authority to perform private-security surveillance without the registrations required for those reserved activities.

It combines two first-class tools:

- **UNIFI** — project orchestration, planning, Job Manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependencies, reservations, retry/backoff, execution history and human controls.

## Canonical public identity

DataNest uses its current GitHub Pages project-path deployment as the canonical public endpoint. There is no active DNS/custom-domain cutover or branded-host redirect. Reson8 remains an ecosystem Hub link rather than a routing target.

## Live web UI

Primary free public endpoint:

**https://datanest-supository.github.io/DataNest/**

Reson8 ecosystem integration links directly between the live DataNest GitHub Pages endpoint and the Reson8 Hub. No branded-host activation, DNS cutover, or Railway ingress is required.

Static health marker:

**https://datanest-supository.github.io/DataNest/health.json**

GitHub Pages is the **current public delivery target** for the DataNest-managed production path. Supabase supplies the governed auth, database, storage and backend-function services.

Standalone Node/Docker runtimes continue to expose the server health endpoint at `/api/health`, but local machines are development, controlled-test, and specialized execution surfaces only. They are not backup hosts or continuity authorities. Dropbox `/DataNest-AI-Backups` is the governed backup-artifact host.

## Canonical stack

- DataNest: parent platform, governance and execution/promotion authority
- GitHub repository: `DataNest-Supository/DataNest`
- Branch: `main`
- GitHub: source control, history, CI and evidence authority
- Supabase: `sgqdmfgjbprsoqsmgigi`
- Supabase URL: `https://sgqdmfgjbprsoqsmgigi.supabase.co`
- Supabase: auth, database, storage and backend-function authority
- Current public delivery target: **GitHub Pages**
- Canonical production route: **DataNest-managed public delivery: GitHub Pages + Supabase**
- Railway dependency: **none**
- Hosting model: **replaceable delivery infrastructure**
- Backup-artifact host: **Dropbox · `/DataNest-AI-Backups`**
- Local PC backup hosting: **disabled**
- AI compute: **replaceable approved HTTPS inference endpoints; no workstation is required**
- AI architecture: [`docs/DATANEST_AI_ARCHITECTURE.md`](docs/DATANEST_AI_ARCHITECTURE.md)
- Vercel dependency: **none**


## Delivery-provider metadata

DataNest does not require Vercel. GitHub Pages is the active public delivery target; the retained `vercel.json` exists only to keep the still-linked Vercel Git integration deployment-disabled and is not a runtime dependency.

## Specialized control trees

- **Knowledge** — provenance-preserving repository learning from canonical DataNest and Mirror-DataNest, producing provisional categorized optimization feeds without self-promoting to Certified Memory or production authority.
- **Boundaries** — canonical tolerance and acceptance assessor mapping DataNest human-AI principles to machine-verifiable invariants and explicit human-review criteria across functional changes.
- **BOTSQUAD** — AI-only advisory specialist branches for optimization, product expansion, business growth, UX ease, UI evolution, function evolution, integrations, quality, and environment translation.
- **ENVIRONMENT** — shared compatibility assessor for runtimes, CI, delivery, backend, inference, Forge, recovery, dependencies, branch hygiene, and evidence; only generated non-authorizing adaptations are automatic.
- **ENFORCER** — continuous defensive enforcement and transparency tree that monitors security against Boundaries, consumes the complete approved Knowledge corpus without category/topic filtering, and publishes traceable learning/defence evidence without production authority.
- **GUARDIAN** — event-driven health monitor and safe healer that snapshots the operating blueprint, measures drift from optimal conditions, observes branch/source health, deletes only proven redundant branches, and routes behavioral streamlining through review.
- **CONDUCTOR** — timing and process-synchronization tree that coordinates dependency freshness plus pull/push and push/pull workflow dispatch across the specialized trees.
- **SUGGESTER** — continuous optimization tree that converts GUARDIAN, Knowledge, ENVIRONMENT, ENFORCER, BOTSQUAD, CONDUCTOR, CALMER and REGULATOR evidence into deduplicated suggestions and a bounded safe-automation queue.
- **CALMER** — continuous minimum-friction governance tree that pushes planning/evidence gates down to their safe pass floor and awards STONE, GOLD and DIAMOND packages to functions, processes and builds using accuracy, performance, security and contribution evidence.
- **REGULATOR** — transparency and harmony tree that converts system requirements into BOTSQUAD audit, stress-test, free/open acquisition-scout, supply-readiness and bounded action-planning work.
- **VISIBILITY-UTILITY** — continuous SEO, discoverability, brand/platform presence and market-intelligence tree that models evidence-labelled routes to market and projected relative outcomes without autonomous spend, pricing, sales or unverified-claim authority.
- **LIBERTY-IN-ALL** — continuous indexing and traceability assurance standard that hashes attributable records, preserves source lineage, exposes evidence gaps, and publishes sanitized on-demand metadata for the public, stakeholders, auditors and regulators without exposing restricted content or gaining production authority.
- **FREETREE** — isolated open-development clone target with no DataNest/Mirror synchronization, Knowledge exchange, Boundaries governance, BOTSQUAD feed authority, or canonical production authority.

Public system scope, mission, vision, governance, architecture, products/services, projections and standards alignment are documented in [`docs/DATANEST_SYSTEM_CHARTER.md`](docs/DATANEST_SYSTEM_CHARTER.md) and rendered publicly at **/DataNest/system-charter/**. The standards mapping is an alignment reference, not a claim of ISO certification.

Scheduled noise deletion and decluttering are defined in [`docs/MAINTENANCE_PROTOCOL.md`](docs/MAINTENANCE_PROTOCOL.md).


GitHub and Supabase remain the required source/CI and backend authorities. Dropbox is continuity storage for governed release and recovery artifacts; it is not the request-serving production web runtime. Hosting remains replaceable delivery infrastructure, not system authority.

## Resonance AppDev Supository scope

`DataNest-Supository/DataNest` is the canonical Resonance AppDev **Supository**: the governed parent index for Resonance application-development projects, products and services.

The Supository scope includes source/provenance, lifecycle state, delivery routes, release evidence, service relationships and future sovereign Git/registry replication. The current production authority model remains GitHub + GitHub Pages + Supabase; deploying Reson8 Forge does not silently replace it.

- Architecture contract: [`docs/DATANEST_SUPOSITORY_ARCHITECTURE.md`](docs/DATANEST_SUPOSITORY_ARCHITECTURE.md)
- Machine-readable catalog: [`config/supository.catalog.json`](config/supository.catalog.json)
- Sovereign Forge bootstrap: [`infra/reson8-forge/`](infra/reson8-forge/)
- Ungated R&D mirror: `DataNest-Supository/Mirror-DataNest`
- Mirror promotion contract: [`docs/MIRROR_DATANEST_PROMOTION.md`](docs/MIRROR_DATANEST_PROMOTION.md)
- Target Forge namespace: `git.reson8.life/DataNest-Supository/DataNest`

New Resonance AppDev projects, products and services should be registered through the Supository catalog even when their source or runtime lives in a separate repository or provider.
