# Resonance DataNest

**Resonance DataNest** is the Resonance AppDev parent platform and web control plane. It governs product execution intent, promotion, evidence and lifecycle state while preserving separate source, backend and delivery authorities.

It combines two first-class tools:

- **UNIFI** — project orchestration, planning, Job Manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependencies, reservations, retry/backoff, execution history and human controls.

## Live web UI

Primary free public endpoint:

**https://datanest-supository.github.io/DataNest/**

Reson8 ecosystem ingress:

**https://datanest.reson8.life/**

The Reson8 ingress is a secondary delivery surface. DataNest source authority remains `DataNest-Supository/DataNest`, and the public Supabase runtime configuration remains governed by the DataNest Pages deployment.

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
- Hosting model: **replaceable delivery infrastructure**
- Backup-artifact host: **Dropbox · `/DataNest-AI-Backups`**
- Local PC backup hosting: **disabled**
- Optional future delivery target: **Vercel**

GitHub and Supabase remain the required source/CI and backend authorities. Dropbox is continuity storage for governed release and recovery artifacts; it is not the request-serving production web runtime. Hosting remains replaceable delivery infrastructure, not system authority.

## Target-state architecture concepts

The approved 27 Sep 2026 ecosystem design extends DataNest with target-state concepts that are intentionally separate from current production capability claims:

- **Cloud-Nest** — planned governed workspace abstraction for identity, projects, knowledge, permissions and resources.
- **Supository** — planned governed knowledge and provenance abstraction linking source, evidence, lineage and reuse policy.
- **ILM (Inclusive Language Model)** — planned governed intelligence abstraction that begins as orchestration across approved models, tools, people and certified knowledge rather than a claim that Resonance has trained a proprietary foundation model.

These concepts require separate implementation and evidence before DataNest presents them as available product capabilities.


## RONSAS cloud integration

DataNest integrates with **RONSAS (Resonance Open Nova Sovereign Application Suite)** as a governed product through the authenticated Supabase Edge Function contract `ronsas-status@1`.

- RONSAS is governed through DataNest; it is not the parent platform or DataNest AI authority.
- No local workstation, loopback service, desktop launcher, or Ealiophin interaction is required by the DataNest web control plane.
- Ealiophin, Spider, Weed, and other local PCs are not backup hosts or continuity authorities.
- Dropbox `/DataNest-AI-Backups` is the governed backup-artifact host.
- The integration is cloud-only and rejects localhost, loopback, and `.local` origins.
- RONSAS health is non-blocking: DataNest remains usable when the public RONSAS Hub is unavailable.
- Resonance AppDev source authority is explicit: `resonance36912-cell/RONSAS` is the control-source repository and `resonance36912-cell/resonance-hub` is the public Hub source.
- The canonical public Hub probe is `https://reson8.life/`.

## Web UI

The UI includes authenticated access, an overview dashboard, UNIFI Job Manifest planning, TranScheduler queue controls, capability registry, run history, checkpoints, audit history, a Transparency audit library, scheduler settings, responsive navigation, deployment health checks and governed Products.

The sign-in screen intentionally does not create Supabase Auth users. Create authorized users through Supabase Auth administration, then use password or magic-link sign-in.

## Runtime configuration

Runtime-resolved public configuration uses:

```env
SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

The GitHub Pages workflow generates the public Supabase configuration into `runtime-config.js`. Local development and controlled-test Node/container runtimes consume the same public variables.

## Local development and controlled testing

Local development:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Legacy Windows/Node controlled-test launcher:

```powershell
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key>"
.\scripts\start-production.ps1
```

Local Docker controlled test:

```bash
docker compose up --build -d
```

These paths do not replace the DataNest-managed production route and are not backup hosts.

## Backup and continuity artifacts

Dropbox `/DataNest-AI-Backups` is the governed backup-artifact host for DataNest and RONSAS continuity material. Existing governed ZIP, PGP, manifest, and GitHub Pages release artifacts are stored there. Dropbox is used for backup/recovery storage, not as the public web-serving origin; the operational web fallback remains the canonical GitHub Pages release.

See `docs/DEPLOYMENT.md` for the authority and delivery model.

## Validation

```bash
npm run check
npm run build
docker build -t resonance-datanest:ci .
```

Every GitHub Pages deployment also verifies the live homepage, static health marker, and published Supabase runtime configuration from a GitHub-hosted runner.

## Optional Vercel delivery

Vercel may be used as a future or secondary delivery target. It is not required for core operation and does not become source, backend, product or governance authority by hosting the application.

## Scheduling safety

TranScheduler does not treat `UNKNOWN` capability state as permission to execute. Capability availability must be observed explicitly before routing work.

## Transparency

The **Transparency** workspace publishes audit methodology and accessible audit-source transcriptions separately from the operational Audit event log. The initial library contains the complete accessible transcription of the Resonance DataNest / RONSAS External Full-System Audit Brief v1.0 and explicitly marks external audit results as pending until a completed review is supplied.

### External audit return · 25 Sep 2026

The Transparency workspace now publishes the exact external audit return, structured `AUD-001`–`AUD-014` findings, and the reported remediation backlog. The audit is explicitly identified as a read-only public/source review, not a full production certification. DataNest validation/closure status remains separate and starts as pending for every reported finding.

## Resonance UI/UX alignment

This application follows the **Resonance Sovereign Spectrum 2026** portfolio design system: sovereign-dark operational surfaces, restrained translucent control layers, product-specific accents, explicit AI/governance state, accessible focus/motion behavior, and RONSAS-aligned product identity.

Canonical design authority: https://github.com/resonance36912-cell/RONSAS/blob/main/docs/design/RESONANCE_SOVEREIGN_SPECTRUM_2026.md
