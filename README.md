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

## Vercel

Use the canonical GitHub repository when importing this project into Vercel:

[Deploy DataNest to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDataNest-Supository%2FDataNest&repository-name=DataNest)

Expected Vercel project name: `DataNest`

After import, configure the Supabase values below as Vercel Environment Variables
for Production and Preview deployments. Do not store privileged service-role keys
or database passwords in the repository.

## Environment

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

The canonical DataNest deployment chain is:

```text
DataNest-Supository/DataNest (main)
        |
        v
Vercel project: DataNest
        |
        v
Supabase: sgqdmfgjbprsoqsmgigi
```

RONSAS may reference or orchestrate DataNest, but it must not silently substitute
a different GitHub repository, Vercel project, or Supabase project.
