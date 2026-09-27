# Resonance DataNest

**Resonance DataNest** is the Resonance AppDev parent platform and web control plane. It governs product execution intent, promotion, evidence and lifecycle state while preserving separate source, backend and delivery authorities.

It combines two first-class tools:

- **UNIFI** — project orchestration, planning, Job Manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependencies, reservations, retry/backoff, execution history and human controls.

## Live web UI

Primary free public endpoint:

**https://datanest-supository.github.io/DataNest/**

Static health marker:

**https://datanest-supository.github.io/DataNest/health.json**

GitHub Pages is the **current public delivery target** for the DataNest-managed production path. Supabase supplies the governed auth, database, storage and backend-function services.

Standalone Node/Docker runtimes continue to expose the server health endpoint at `/api/health`, but they are local development, recovery, controlled-test and continuity paths rather than the canonical production authority.

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
- Optional future delivery target: **Vercel**

GitHub and Supabase remain the required source/CI and backend authorities. Hosting is replaceable delivery infrastructure, not system authority.

## RONSAS cloud integration

DataNest integrates with **RONSAS (Resonance Open Nova Sovereign Application Suite)** as a governed product through the authenticated Supabase Edge Function contract `ronsas-status@1`.

- RONSAS is governed through DataNest; it is not the parent platform or DataNest AI authority.
- No local workstation, loopback service, desktop launcher, or Ealiophin interaction is required by the DataNest web control plane.
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

The GitHub Pages workflow generates the public Supabase configuration into `runtime-config.js`. Local/recovery Node and container runtimes consume the same public variables.

## Local development, recovery, and continuity

Local development:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Legacy Windows/Node recovery or controlled-test launcher:

```powershell
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key>"
.\scripts\start-production.ps1
```

Local Docker recovery, controlled test or offline continuity:

```bash
docker compose up --build -d
```

These paths do not replace the DataNest-managed production route. See `docs/DEPLOYMENT.md` for the authority and delivery model.

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
