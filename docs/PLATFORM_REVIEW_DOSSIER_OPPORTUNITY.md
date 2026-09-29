# Resonance DataNest Platform Review, Dossier & Opportunity Controls

Status: governed engineering baseline; not legal advice, regulatory approval, certification, or financial advice.  
Version: `platform-review-dossier-opportunity-v1`.  
Review date: 2026-09-29.

## Purpose

This control set adds three linked but independent capabilities:

1. **Platform Update Suggester** after self-audit or other governed evidence.
2. **Platform Dossier** with versioned document provenance for regulatory review.
3. **Business Opportunity Identifier & Projection Indicator** with evidence-bounded ranges.

The implementation preserves the existing Resonance Sovereign Governance Protocol (RSGP) boundary: evidence and recommendations can trigger review, but cannot silently create authority.

## Platform update review firewall

The required sequence is:

**self-audit / evidence → suggestion → external review evidence → authenticated human review → release eligible → normal release controls → production verification**

A suggestion can never directly deploy, execute, or become live. The database hard-codes:

- `production_authority = false`;
- `deployment_authority = false`;
- `live_action_authority = false`.

External review is recorded separately from human approval. External review requires a named reviewer, reviewer organization, evidence reference, and independence attestation. Human approval cannot be recorded until the external review state is `accepted`.

`release_eligible` means only that the review sequence is complete. It is not evidence that CI passed, a deployment ran, production changed, or a live verification succeeded.

## Platform dossier

The dossier has two complementary layers.

### Live revision ledger

`platform_dossier_documents` stores the current controlled-document identity and current provenance state.  
`platform_dossier_revisions` stores immutable numbered revisions with SHA-256 hashes, source references, optional source commits, change summaries, and metadata.  
`platform_dossier_events` stores append-only document lifecycle events.

Supabase Realtime publishes dossier document, revision, and event changes to authorized project clients. Realtime visibility does not change review authority.

### Release dossier index

`scripts/write-platform-dossier.mjs` creates `public/platform-dossier.json` at release build time. It inventories and hashes:

- `README.md`;
- every regular file under `docs/`;
- every regular file under `public/transparency/`.

Each entry records its repository path, byte size, SHA-256 digest, and document class. The index records the release commit and generation timestamp.

This makes a deployed dossier snapshot reproducible and commit-pinned. It does not by itself prove regulatory conformity.

## Regulatory-review semantics

The dossier is designed for traceability and evidence retrieval. It distinguishes:

- document revision from approval;
- evidence presence from evidence sufficiency;
- standards references from standards applicability;
- release source state from deployed state;
- deployed state from verified live state;
- regulatory review support from regulatory acceptance.

A reviewer should use the dossier together with the relevant source records, formal governance decisions, release evidence, applicable law, authorized standards text, and competent professional review.

## Business Opportunity Identifier & Projection Indicator

A business opportunity record requires:

- an observed problem, market, demand, cost, or operational signal;
- an opportunity hypothesis;
- one or more evidence references;
- three-point projection range: low, base, high;
- a projection horizon in months;
- a confidence value from 0 to 1;
- explicit assumptions.

The projection indicator is descriptive:

- `exploratory` when confidence is below 0.35;
- `developing` from 0.35 to below 0.65;
- `evidence_supported` at 0.65 and above.

These labels describe the evidence state of the projection. They do not score whether the opportunity should be pursued and do not authorize spend, pricing, contracting, hiring, investment, or other financial action.

Every opportunity record has:

- `decision_authority = false`;
- `financial_commitment = false`.

Owner/Admin review can mark an opportunity `needs_evidence`, `reviewed`, or `dismissed`. Review does not convert the projection into a commitment.

## Trace families

- Platform update: `DN-PLAT-UPD-…`
- Business opportunity: `DN-BIZ-OPP-…`
- Existing governance observations: `DN-GOV-OBS-…`

Platform dossier revisions use stable document keys plus immutable revision numbers and SHA-256 hashes.

## Control-evidence graph

This release adds:

- `CGO-UPD-001` — platform update review firewall;
- `CGO-DOS-001` — platform dossier traceability;
- `CGO-OPP-001` — evidence-based opportunity projection.

The controls are implementation records, not conformity claims.

## Production release requirement

A production claim requires evidence separate from this feature:

1. merged source commit;
2. migration replay / deployment evidence;
3. unit, type, build, browser, and security results;
4. release manifest identity;
5. production deployment identity;
6. live verification against the deployed commit.

No suggestion, dossier revision, opportunity projection, pull request, or passing source test alone is proof of production state.
