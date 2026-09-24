# Resonance DataNest

**Resonance DataNest** is the Resonance AppDev web control plane. It combines two first-class tools:

- **UNIFI** — project orchestration, planning, Job Manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependencies, reservations, retry/backoff, execution history and human controls.

## Live web UI

Primary free public endpoint:

**https://datanest-supository.github.io/DataNest/**

Static health marker:

**https://datanest-supository.github.io/DataNest/health.json**

Standalone/Docker deployments continue to expose the server health endpoint at `/api/health`.

## Canonical stack

- GitHub: `DataNest-Supository/DataNest`
- Branch: `main`
- Supabase: `sgqdmfgjbprsoqsmgigi`
- Supabase URL: `https://sgqdmfgjbprsoqsmgigi.supabase.co`
- Primary free host: **GitHub Pages**
- Hosting architecture: **provider-agnostic**
- Optional managed host: **Vercel**

GitHub and Supabase are the required authorities. Hosting remains replaceable infrastructure.

## Web UI

The UI includes authenticated access, an overview dashboard, UNIFI Job Manifest planning, TranScheduler queue controls, capability registry, run history, checkpoints, audit history, scheduler settings, responsive navigation, and deployment health checks.

The sign-in screen intentionally does not create Supabase Auth users. Create authorized users through Supabase Auth administration, then use password or magic-link sign-in.

## Runtime configuration

Preferred environment variables for standalone/container deployments are runtime-resolved:

```env
SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

The GitHub Pages workflow generates the same public Supabase configuration into `runtime-config.js`.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Production

Node/Windows:

```powershell
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key>"
.\scripts\start-production.ps1
```

Docker:

```bash
docker compose up --build -d
```

See `docs/DEPLOYMENT.md` for provider-agnostic deployment instructions.

## Validation

```bash
npm run check
npm run build
docker build -t resonance-datanest:ci .
```

Every GitHub Pages deployment also verifies the live homepage, static health marker, and published Supabase runtime configuration from a GitHub-hosted runner.

## Optional Vercel deployment

Vercel can remain enabled as a secondary managed host. It is not required for core operation.

## Scheduling safety

TranScheduler does not treat `UNKNOWN` capability state as permission to execute. Capability availability must be observed explicitly before routing work.
