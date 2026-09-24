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

GitHub and Supabase are the required authorities. Vercel is not required for the application to function and is not a completion dependency.

## Web UI

The UI includes authenticated access, an overview dashboard, UNIFI Job Manifest planning, TranScheduler queue controls, capability registry, run history, checkpoints, audit history, scheduler settings, responsive navigation, and a deployment health endpoint at `/api/health`.

The sign-in screen intentionally does not create Supabase Auth users. Create authorized users through Supabase Auth administration, then use password or magic-link sign-in.

## Local or self-hosted operation

```bash
cp .env.example .env.local
npm install
npm run build
npm start
```

Required environment values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Validation:

```bash
npm run check
npm run build
```

## Optional Vercel deployment

If a managed public deployment is desired, this repository can be imported into Vercel as **Resonance DataNest**:

[Import Resonance DataNest to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDataNest-Supository%2FDataNest&repository-name=Resonance%20DataNest)

Configure the two public Supabase environment variables in the deployment environment. Never commit service-role keys, database passwords, access tokens, MFA material or reusable session credentials.

## Scheduling safety

TranScheduler does not treat `UNKNOWN` capability state as permission to execute. Capability availability must be observed explicitly before routing work.
