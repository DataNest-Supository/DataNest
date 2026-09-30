# Mirror-DataNest production promotion contract

Canonical repository: `DataNest-Supository/DataNest`

R&D / production-parity candidate repository: `DataNest-Supository/Mirror-DataNest`

## Production rule

All production-bound changes are developed and exercised in Mirror-DataNest, then return to the canonical DataNest Supository for audit, certification, governance approval and canonical live deployment.

Mirror-DataNest may publish **its own production-parity candidate site** for visual and functional testing:

`https://datanest-supository.github.io/Mirror-DataNest/`

It may never publish or replace the canonical production endpoint:

`https://datanest-supository.github.io/DataNest/`

The mandatory path is:

```text
Mirror-DataNest R&D
      |
      | exact candidate build
      v
Mirror live production-parity UI
      |
      | visual + functional browser testing
      | Product Lab versioned evidence
      v
Package Production Candidate
      |
      v
DataNest-Supository/DataNest
mirror-promotion/*
      |
      | Canonical CI / Security / RONSAS validation
      | DataNest Audit Optimizer evidence review
      v
Formal governance + human reviewer approval
      |
      v
DataNest/main
      |
      | Manual exact-SHA production authorization
      v
Canonical DataNest live deployment
```

## Mirror live candidate

The Mirror Pages workflow builds the same DataNest/RONSAS source candidate intended for production, while preserving an independent public base path and isolated backend.

Runtime:

- public URL: `https://datanest-supository.github.io/Mirror-DataNest/`
- source: `Mirror-DataNest/main`
- backend: **DataNest AI Staging** (`qchttpcyqlqnhvahprhz`)
- backend mode: isolated staging
- canonical production backend is not used for Mirror write testing

Each live build writes `mirror-release.json` with:

- exact Mirror commit SHA;
- immutable Mirror release ID;
- deployment workflow reference;
- public Mirror URL;
- backend identity;
- unit/type/dependency observations;
- explicit non-authority flags.

After deployment, the workflow verifies routes and runs browser tests against the live Mirror pages. The resulting `mirror-live-verification.json`, Playwright evidence and workflow run are retained as governance evidence.

## Admin R&D Test Mode

The owner/admin-only R&D Test Mode toggle in canonical DataNest opens the live Mirror UI.

When enabled it also reads the immutable Mirror release manifest and synchronizes the exact candidate into the current database models:

1. `product_surfaces` — one versioned Mirror production-candidate surface;
2. `product_test_runs` — reviewer visual/functional results tied to surface URL, build SHA, release ID, browser and viewport;
3. `governance_observations` — release evidence available to the existing Audit Optimizer evidence loop.

Reviewers can jump directly from the toggle to Product Lab and record pass/fail/blocked evidence against the exact Mirror build.

## Mirror candidate handoff

Mirror packages every production candidate with:

- exact Mirror commit SHA;
- exact canonical DataNest base SHA;
- successful live Mirror verification reference;
- candidate workflow/run reference;
- changed-file list;
- production patch;
- unit-test observation;
- type-check observation;
- dependency-audit observation;
- candidate purpose/summary.

Mirror-specific R&D control files are excluded from the canonical production patch.

## Canonical import

The canonical `Import Mirror Production Candidate` workflow imports the selected candidate onto a fresh `mirror-promotion/*` branch.

It must never:

- push directly to `main`;
- deploy the canonical GitHub Pages endpoint;
- mark Audit Optimizer review complete;
- mark governance complete;
- claim production authorization.

The import writes a promotion manifest with all downstream authority fields initialized to pending / false.

## Required certification evidence

An authorized canonical release requires non-placeholder references for all three Mirror/Audit stages:

- `mirror_promotion_reference`;
- `mirror_live_evidence_reference`;
- `audit_optimizer_reference`.

Missing, blank, `pending`, `todo` or `tbd` values fail closed in the canonical release evidence writer.

Mirror live evidence demonstrates the candidate that was actually rendered and exercised. Audit Optimizer evidence evaluates that candidate in the existing evidence/governance loop. Neither item alone authorizes production.

## Update-management synchronization

No parallel release database is introduced.

The existing models remain authoritative:

- `product_surfaces` — immutable deployed candidate/version identity;
- `product_test_cases` / `product_test_runs` — visual and functional certification evidence;
- `governance_observations` — candidate/review evidence consumed by Audit Optimizer;
- `optimizer_runs` / `optimizer_suggestions` — AI evidence-linked optimization review;
- `governance_improvement_candidates` — approved optimizer ideas entering formal governance;
- `security_acceptance_runs` — release security evidence;
- `portfolio_lifecycle_events` — governed lifecycle movement;
- `ai_development_updates`, `artifacts`, and `events` — update/provenance/evidence continuity.

## Governance + human approval

Audit Optimizer remains advisory and evidence-producing. It cannot approve, merge, vote, ratify or deploy.

The existing canonical review chain still applies, including:

- live Mirror visual/functional evidence;
- canonical PR Verification;
- Security Scan;
- RONSAS validation when applicable;
- visual / UX review;
- governance-impact review;
- legal review;
- external / independent review;
- final human production authorization.

Only after that chain may the exact approved DataNest SHA be deployed to the canonical public endpoint.
