# Resonance DataNest Architecture

## Project
**Resonance DataNest** is the project operating environment.

## Tools
- **UNIFI** — planning, project context, job manifests, checkpoints, artifacts, audit and human controls.
- **TranScheduler** — capability-aware queueing, dependency gating, reservations, retry/backoff, fairness and timing.

## Required authority chain
```
GitHub: DataNest-Supository/DataNest
        |
        v
Supabase: sgqdmfgjbprsoqsmgigi
```

GitHub is the source authority and Supabase is the application/control-plane data authority.

## Hosting policy
Hosting is **provider-agnostic**. The built Next.js application can run anywhere that supports the production Node.js build and the required public Supabase environment variables.

Vercel is an optional managed hosting target. It may be enabled when a Vercel workspace is available, but Resonance DataNest does not depend on Vercel for source control, data, orchestration, scheduling, or local/self-hosted operation.

## Core principles
Projects own knowledge. Jobs own work. Checkpoints preserve continuity. Capabilities determine routing. Availability determines timing. UNKNOWN capability state is never execution permission.

## Security
No passwords, MFA recovery codes, reusable browser cookies, PATs, service-role keys or database passwords belong in Git.
