# LIBERTY-IN-ALL Standard (LIA)

**Version:** 1.0  
**Status:** DataNest internal governance and transparency standard  
**Authority:** DataNest-Supository/DataNest  
**External certification:** None claimed  
**Production authority:** None

## 1. Intent

**LIBERTY-IN-ALL** establishes DataNest's standard for inspectability, traceability and on-demand visibility.

Its purpose is to make trustworthy **non-sensitive** system information available to interested individuals and parties, users, stakeholders, auditors, regulators, developers and operators without creating a surveillance surface, disclosing protected information, or turning documentation into implied authority.

In DataNest, liberty means the practical ability to:

- understand what the system says it does;
- inspect the evidence supporting a claim;
- identify who or what had authority;
- distinguish advice, evidence, verification and authorization;
- see limitations, uncertainty and adverse findings;
- trace changes through source history;
- challenge or reproduce the basis of a claim where practical;
- retain meaningful human choice.

## 2. Scope

LIA applies to public or publishable DataNest:

- governance standards and policies;
- architecture and infrastructure claims;
- specialized-tree contracts and public state;
- audit methodology, findings and remediation status;
- quality/security/AI assurance summaries;
- product/service/application catalog metadata;
- release and promotion evidence summaries;
- visibility/market-intelligence summaries and limitations;
- continuity/recovery claims safe for public disclosure;
- public legal/accessibility/governance disclosures;
- workflows that produce public evidence.

LIA does **not** require publication of secrets, reusable credentials, private authentication material, protected personal data, private AI memory, confidential commercial data, or evidence whose disclosure would materially weaken security.

## 3. Normative controls

### LIA-001 · Universal inspectability
Non-sensitive system claims, controls and evidence intended to support trust **MUST** be reachable through public human-readable and machine-readable indexes.

### LIA-002 · Human agency
Transparency **MUST** support informed human choice. Disclosure, AI advice, evidence or an automated score **MUST NOT** be treated as implied consent, approval or authorization.

### LIA-003 · Symmetric transparency
Material limitations, adverse findings, pending validation and uncertainty **MUST** be indexed with the same provenance discipline as favorable evidence.

### LIA-004 · Provenance
Every indexed record **MUST** carry a stable identifier, source, authority, revision/digest where available, and observation timestamp.

### LIA-005 · Temporal truth
Current, historical and superseded states **MUST** be distinguishable. A stale record **MUST NOT** be represented as current.

### LIA-006 · Uncertainty visibility
Unknown, unavailable, inferred, projected, simulated and unverified states **MUST** be labelled explicitly.

### LIA-007 · Authority separation
Indexes, documentation, audit outputs and projections **MUST NOT** create production, financial, legal, ownership, role or governance authority.

### LIA-008 · Privacy and security boundary
Secrets, reusable credentials, private authentication material, protected personal data and private AI memory **MUST NOT** be published through LIA.

### LIA-009 · Accessible dual-format disclosure
Material public evidence **SHOULD** have both accessible human-readable presentation and structured machine-readable representation.

### LIA-010 · Open portability
Public traceability records **SHOULD** use durable, interoperable formats and stable identifiers/URLs.

### LIA-011 · Versioned correction
Corrections **MUST** preserve source history and identify changed revision/effective state; evidentiary history must not be silently rewritten.

### LIA-012 · Audit and regulatory readiness
A reasonable independent reviewer **SHOULD** be able to reconstruct what was asserted, from what source, under which control, at what time and with what authority/status.

### LIA-013 · Data minimization
Public indexes **MUST** publish only the minimum evidence required to establish provenance, status and accountability.

### LIA-014 · No silent suppression
Material public findings or limitations **MUST NOT** be silently hidden to improve apparent system health. Corrections, supersession or restriction require an attributable reason/state.

### LIA-015 · Challengeability
Public records **SHOULD** expose sufficient source/revision context to support independent inspection, questioning and reproduction where technically and legally possible.

## 4. Traceability identity model

Every record uses the following fields where applicable:

| Field | Meaning |
| --- | --- |
| `id` | Stable DataNest traceability identifier |
| `type` | document, standard, workflow, tree, evidence, release, finding, application, projection, etc. |
| `title` | Human-readable name |
| `status` | current state, including pending/unknown/superseded when applicable |
| `authority` | authority responsible for the record or claim |
| `source` | canonical source path or public URL |
| `revision` | commit SHA, release ID or source revision |
| `digest` | content/evidence digest when generated |
| `observedAt` | time the index observed the record |
| `effectiveAt` | time the underlying record became effective when known |
| `audience` | intended public audiences |
| `sensitivity` | public/public_summary/restricted/secret |
| `productionAuthorization` | always explicit; public evidence defaults false |
| `relations` | upstream/downstream source, evidence, control and outcome links |
| `limitations` | uncertainty, coverage or certification limitations |

## 5. Traceability graph

The public index represents relationships such as:

```text
standard/control
      ↓ governs
workflow/tree
      ↓ produces
evidence/state
      ↓ supports
claim / finding / projection
      ↓ informs
review / decision
      ↓ authorizes (only when explicit)
release / public outcome
      ↓ observed by
monitoring / audit / knowledge
```

The graph must never imply an `authorizes` edge merely because an evidence or recommendation edge exists.

## 6. Real-time / continuous visibility model

DataNest implements LIA as **near-real-time, event-driven public observability**:

- workflow completions refresh the index when relevant evidence changes;
- a scheduled pulse refreshes the index at least every 10 minutes;
- the public Traceability page fetches the latest sanitized index on demand;
- the live index is published to the isolated `automation/liberty-in-all` branch;
- the public page retains a static bootstrap/fallback registry on the canonical Pages build;
- each live snapshot records its canonical source SHA and generation time.

"Real-time" in this standard means **continuous/event-driven and on-demand within the operating cadence**, not a claim of zero-latency streaming.

## 7. Public audiences

The same public facts are available without creating separate "truths" for:

- interested individuals and parties;
- users;
- stakeholders;
- auditors;
- regulators;
- developers;
- operators.

Restricted internal evidence may exist, but a public claim cannot rely on an undisclosed authority escalation. Where detail is restricted, the public index should disclose the limitation/classification where safe.

## 8. Security and privacy

LIA is an allowlist-based publication standard.

The indexer:

- scans only approved public/governance source classes;
- never reads environment files for publication;
- never publishes secret values;
- never copies raw private authentication/session material;
- never publishes private AI memory;
- never copies protected personal data;
- may publish sanitized counts/statuses from approved automation evidence.

Security/privacy restrictions are themselves traceable controls, not exceptions that allow silent rewriting of history.

## 9. Accessibility

The public Traceability page must:

- operate without authentication;
- remain keyboard accessible;
- expose visible focus;
- avoid color-only meaning;
- provide text labels for state/authority;
- expose machine-readable JSON;
- support search/filter without requiring pointer interaction;
- clearly label stale/unavailable live data.

## 10. Correction, supersession and retention

A record may be:

- current;
- pending;
- superseded;
- corrected;
- archived;
- unavailable;
- restricted.

Corrections identify the replacement/superseding source where known. Git history remains the authoritative immutable change history for source-controlled public records.

## 11. Relationship to DataNest governance

LIA is subordinate to DataNest's hard security/privacy/authority boundaries and complementary to the public System Charter.

- **Boundaries** defines what must not be crossed.
- **ENFORCER** defends security and evidence requirements.
- **GUARDIAN** observes system health.
- **CONDUCTOR** synchronizes processes.
- **SUGGESTER** proposes optimizations.
- **REGULATOR** converts unresolved conditions into transparent requirements.
- **VISIBILITY-UTILITY** improves discoverability and public market visibility.
- **LIBERTY-IN-ALL** ensures publishable claims and evidence remain continuously indexable and traceable across these systems.

LIA itself cannot approve, merge, deploy, spend, change pricing, make legal commitments or grant production authority.

## 12. Minimum acceptance criteria

A LIA-conformant public DataNest state requires:

1. the LIA standard and machine-readable contract are published;
2. the public Traceability page is reachable without authentication;
3. a machine-readable bootstrap index is present;
4. the live automation index exposes canonical SHA and generation time;
5. each indexed record carries stable ID/type/source/authority/status/sensitivity;
6. sensitive/secret deny rules are active;
7. adverse findings are not filtered by favorability;
8. production authorization is explicit rather than inferred;
9. stale/unavailable live evidence is labelled;
10. corrections preserve source history.

## 13. Assurance statement

LIBERTY-IN-ALL is a **DataNest internal standard**. It is not an ISO standard, law, certification, accreditation or regulatory approval. Its purpose is to make DataNest more inspectable, accountable and challengeable while preserving security, privacy and human authority.
