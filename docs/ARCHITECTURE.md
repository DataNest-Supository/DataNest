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


## Sparks internal-utility economy
Sparks are an internal DataNest utility layer backed by the append-only Spark ledger.

- Certified contributions may mint Project Sparks under the existing versioned contribution-scoring policy.
- Project Sparks can only be reserved for owner/admin-published project services in v1.
- A service request moves the required amount from the spendable Project account into the stakeholder's Locked account using append-only hold entries.
- Cancellation or rejection returns the held amount with compensating release entries.
- Fulfillment consumes the held amount with a service-spend entry. Historical award entries are never edited.
- The redemption path serializes account access and rejects requests above the available spendable balance.
- Cash purchase, cash redemption, peer-to-peer transfer, external transfer, secondary markets and platform spending are disabled by database policy constraints in v1.
- Spending does not change contribution history, reputation, legal ownership, royalty entitlement or project authority.
- Platform Spark accounts remain separate and visible but are not spendable in this release.


## Sovereign Governance Protocol
Sovereign Governance is a project-governance domain, not a source of legal ownership, contractual rights, royalty entitlements, financial authority or project roles.

- DataNest does not seed or silently adopt human mission, vision or protocol text. Protocol versions begin as owner/admin-authored drafts.
- A protocol draft requires a formal `protocol_change` proposal before it can be ratified.
- Formal voting is one active `project_members` member, one vote. Sparks, reputation, contribution share and capital do not weight votes.
- Proposal acceptance uses the latest vote event per active member, simple majority, quorum, and at least one supporting vote from someone other than the proposer.
- An accepted protocol-change decision does not itself alter the protocol. Owner/admin ratification is a separate execution step tied to the accepted proposal.
- Ratifying a newer protocol version supersedes the prior ratified version without deleting its history.
- Governance proposals and decisions carry database-enforced false flags for contractual, ownership, financial-authority and role-authority effects.
- Project-access stakeholders may file disputes against protocols, proposals or decisions. A filer cannot resolve their own dispute.
- Dispute resolutions are append-only correction/clarification records; they do not rewrite the challenged source record.
- All formal governance events emit `DN-GOV-` traces and project audit events.
