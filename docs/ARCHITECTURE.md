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


## Project-member invitations and formal voter activation
Project-member invitations are a separate governance boundary from Job collaboration.

- Only active project owners/admins can initiate project-member invitations.
- The owner may invite `admin`, `operator` or `viewer`; an admin may invite only `operator` or `viewer`.
- The owner role is not inviteable through this flow, and self-invite is prohibited.
- Invitation delivery uses a JWT-protected Edge Function and service-role-only registration gateway.
- New and still-unconfirmed invitation accounts receive a Supabase Auth invitation; confirmed existing accounts receive a secure password-recovery link so they can establish credentials before signing in.
- Registration creates a `project_members` row with status `invited`. General project access and formal governance voting require `status='active'`, so a sent invitation cannot create an independent vote.
- After the invited person authenticates with the matching account/email, DataNest automatically accepts valid pending invitations and activates the membership.
- Invitations expire after seven days and may be revoked before acceptance. Revoked/expired invitations are not formal voters.
- The invitation audit trail remains in `project_member_invitations` and emits project events for sent, accepted and revoked states.


## Transparency and audit library
Transparency is a read-only continuity surface that publishes audit methodology, accessible source transcriptions, audit-result status, and later remediation evidence.

- Transparency is separate from the operational Audit event log. The Audit view records system events; Transparency publishes review artifacts and accountability context.
- Publishing an audit brief does not imply that the audit has been completed or that any finding has been validated.
- Each document records type, version, publication status, audit-result status, baseline source commit and database release.
- The first published artifact is the External Full-System Audit Brief v1.0. The formatted source artifact was DOCX; DataNest publishes the complete source-controlled text transcription as the accessible representation.
- Accessible transcriptions must preserve the source wording and clearly identify any normalization or transformation.
- Audit artifacts are informational evidence only. Publication does not grant governance, financial, ownership or role authority.
- Future external results should be linked to stable AUD-xxx finding IDs and remediation evidence such as Job Manifests, PRs, migrations, tests, releases and post-release verification.
- Transparency artifacts must never publish passwords, service-role keys, reusable cookies, PATs, MFA recovery material or protected personal data.


### External audit returns and remediation evidence
A published audit return is retained separately from the audit methodology and from DataNest's own validation state.

- The 25 Sep 2026 external audit return is preserved unchanged at `public/transparency/audits/external-full-system-audit-return-2026-09-25/report.md`.
- Stable `AUD-001` through `AUD-014` identifiers are indexed in `findings.json`; the auditor's proposed optimization backlog is indexed separately in `remediation-backlog.json`.
- Structured indexes are derived accessibility/workflow views. They never replace or rewrite the source artifact.
- External severity/status is reported evidence, not automatic DataNest confirmation. Every imported finding begins with `pending_datanest_validation`.
- The external auditor explicitly limited the audit to public/read-only and commit-pinned source evidence. It is not a full production certification and has no certification, governance, financial, ownership or role effect.
- A finding may be marked validated, remediated or closed only when current-release reproduction and governed implementation evidence are attached.
- Remediation evidence should connect the finding to its Job Manifest, branch/PR, acceptance test, migration/function change where relevant, release, deployment verification and closure rationale.
\n## Resonance Assistance · Legal Eagle
Legal Eagle is the first live Resonance Assistance specialist and runs through the authenticated, governed DataNest AI gateway rather than a separate ungoverned model path.

- Every Legal Eagle turn is anchored to an authorized DataNest Job used as the matter workspace.
- The user must supply the relevant jurisdiction before substantive Legal Eagle assistance is accepted.
- Legal Eagle may provide legal information, plain-language explanation, issue organization, chronology, research mapping, counsel preparation, and human-review draft structure.
- Legal Eagle is not a law firm, does not create an attorney-client relationship or legal privilege, cannot represent the user, and cannot contact courts, regulators, opposing parties, or other people on the user's behalf.
- The governed prompt prohibits fabricated statutes, cases, citations, court rules, filing requirements, and deadlines. Current-law and deadline questions must be identified for primary-source or qualified-professional verification.
- High-impact matters such as imminent deadlines, arrest or detention, personal safety, housing loss, immigration consequences, and similar risks are explicitly escalated for prompt human verification.
- Legal Eagle uses the same provider authorization, usage accounting, trace-first intake, and Job/session continuity as DataNest AI.
- Release contract: `datanest-ai-chat@2` identifies the gateway version that adds the Legal Eagle product mode and learning exclusion.
- Legal Eagle input/output events are tagged `product_mode=legal_eagle` and `learning_eligible=false`.
- Legal Eagle sessions are excluded from automatic trend extraction and project-wide learning. A legal matter therefore cannot silently become reusable institutional memory through the automatic learning pipeline.
