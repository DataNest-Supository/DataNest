# DataNest

Canonical source repository for **Resonance AppDev - DataNest**.

## Production integration

- GitHub account: `DataNest-Supository`
- Repository: `DataNest-Supository/DataNest`
- Default branch: `main`
- Supabase project: `DataNest Supository`
- Supabase project ref: `sgqdmfgjbprsoqsmgigi`
- Supabase URL: `https://sgqdmfgjbprsoqsmgigi.supabase.co`
- Region: `eu-central-1`

## Environment

Keep deployment credentials outside Git.

Required application variables:

```env
SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<set-in-local-or-deployment-environment>
```

Framework-specific public aliases such as `NEXT_PUBLIC_SUPABASE_URL` or
`VITE_SUPABASE_URL` may be derived at deployment time.

Never commit a Supabase service-role key, database password, personal access
token, session cookie, or other privileged credential.

## Authority

This repository and the Supabase project above are the canonical DataNest
application-development pair. RONSAS may reference or orchestrate DataNest,
but it must not silently substitute a different GitHub or Supabase project.
