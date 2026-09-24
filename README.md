# Resonance DataNest

**Resonance DataNest** is the Resonance AppDev project operating environment.

Its two core tools are:

- **UNIFI** — project orchestration, planning, manifests, context, checkpoints, artifacts and audit.
- **TranScheduler** — capability-aware scheduling, dependency handling, reservations, retry/backoff and fair-share execution.

## Canonical stack

- GitHub: `DataNest-Supository/DataNest`
- Branch: `main`
- Supabase: `sgqdmfgjbprsoqsmgigi`
- Supabase URL: `https://sgqdmfgjbprsoqsmgigi.supabase.co`
- Intended Vercel project: `Resonance DataNest`

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.

## Vercel

Import this repository into Vercel and name the project **Resonance DataNest**.

[Import to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDataNest-Supository%2FDataNest&repository-name=Resonance%20DataNest)

Configure these environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Never commit privileged credentials.

## Current bootstrap

The production Supabase control plane is populated and seeded with:
- project: Resonance DataNest
- tool: UNIFI
- tool: TranScheduler
- priority and capability policies
- project bootstrap authority metadata

See `docs/ARCHITECTURE.md`.
