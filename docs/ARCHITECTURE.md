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


## Think Tanks and reviewed institutional learning
Think Tanks are project-scoped collaboration spaces. Channels can be project-wide or linked to a Job Manifest.

- Project-wide channels support discussion, decision proposals, action proposals and reviewed learning.
- Job-linked channels may invoke the existing governed DataNest AI route. Every recorded AI response must map to the caller's authorized `ai_usage_requests` record for that Job and retains its `DN-AI-` trace.
- Think Tank decisions are proposals until independently confirmed by an owner/admin. A proposer cannot confirm their own decision.
- Learning candidates are not reusable project memory until independently reviewed by an owner/admin. A proposer cannot approve their own learning.
- Approved Think Tank learning is stored in `certified_memory` as `think_tank_human_reviewed`. This is reviewed retrieval memory, not automatic model training.
- Approval also submits a `reusable_knowledge` contribution for the normal contribution pipeline. It remains submitted/unscored/uncertified and cannot mint Sparks until that independent pipeline completes.
- Think Tank recognition, AI output and memory approval do not grant project roles, legal ownership, royalty rights or financial authority.
