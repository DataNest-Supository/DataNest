# Resonance DataNest Deployment

Resonance DataNest is provider-agnostic. GitHub and Supabase are the required authorities; the web runtime can be hosted anywhere that can run Node.js 22 or the supplied container image.

## Required runtime variables

```env
SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co
SUPABASE_PUBLISHABLE_KEY=<DataNest publishable key>
```

Only the Supabase publishable key belongs in the browser-facing runtime configuration. Never expose a service-role key, database password, personal access token, MFA recovery material, or reusable session credential.

The server injects these public values into the browser at request time. This means a single built image can move between environments without rebuilding merely to change the Supabase public configuration.

## Windows / Node.js

```powershell
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key>"
.\scripts\start-production.ps1
```

Open `http://localhost:3000`.

## Docker Compose

Create a local untracked `.env` file:

```env
SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Then:

```bash
docker compose up --build -d
```

Health endpoint:

```
GET /api/health
```

## Generic container host

Build once:

```bash
docker build -t resonance-datanest .
```

Run anywhere:

```bash
docker run --rm -p 3000:3000 \
  -e SUPABASE_URL=https://sgqdmfgjbprsoqsmgigi.supabase.co \
  -e SUPABASE_PUBLISHABLE_KEY=<publishable-key> \
  resonance-datanest
```

## Managed hosts

Railway, Vercel, Render, Fly.io, Azure Container Apps, AWS, a Windows/Linux VM, or another Node/container host can all run this application. Vercel is optional, not architectural.

For Supabase Auth passwordless links, add the final public application origin to the allowed redirect URLs in Supabase Auth before relying on magic-link sign-in.
