# Resonance DataNest

**Resonance DataNest** is the Resonance AppDev web control plane. It combines two first-class tools:

- **UNIFI** — project orchestration, planning, Job Manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependencies, reservations, retry/backoff, execution history and human controls.

## Canonical stack

- GitHub: `DataNest-Supository/DataNest`
- Branch: `main`
- Supabase: `sgqdmfgjbprsoqsmgigi`
- Supabase URL: `https://sgqdmfgjbprsoqsmgigi.supabase.co`
- Hosting: **provider-agnostic**
- Optional managed host: **Vercel**

GitHub and Supabase are the required authorities. Hosting is replaceable infrastructure.

## Web UI

The UI includes authenticated access, an overview dashboard, UNIFI Job Manifest planning, TranScheduler queue controls, capability registry, run history, checkpoints, audit history, scheduler settings, responsive navigation, and a deployment health endpoint at `/api/health`.

The sign-in screen intentionally does not create Supabase Auth users. Create authorized users through Supabase Auth administration, then use password or magic-link sign-in.

## Runtime configuration

Preferred environment variables are runtime-resolved:

```env
SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

The public Supabase configuration is injected by the server at request time, so the same production build/container can be moved between hosts without rebuilding for public configuration changes.

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

## Optional Vercel deployment

If a managed public deployment is desired, this repository can still be imported into Vercel as **Resonance DataNest**. Vercel is not required for core operation.

## Scheduling safety

TranScheduler does not treat `UNKNOWN` capability state as permission to execute. Capability availability must be observed explicitly before routing work.
