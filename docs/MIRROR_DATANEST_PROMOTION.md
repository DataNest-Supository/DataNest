# Mirror-DataNest production promotion contract

Canonical repository: `DataNest-Supository/DataNest`

R&D repository: `DataNest-Supository/Mirror-DataNest`

## Production rule

**All production-bound changes originate in Mirror-DataNest R&D and must be promoted into the canonical DataNest Supository before any live deployment.**

Mirror-DataNest has no live production authority.

The mandatory path is:

```text
Mirror-DataNest R&D
      |
      | Package Production Candidate
      v
DataNest-Supository/DataNest
mirror-promotion/*
      |
      | Canonical CI / security / RONSAS validation
      | DataNest Audit Optimizer review
      v
Formal governance + human reviewer approval
      |
      v
DataNest/main
      |
      | Manual exact-SHA production authorization
      v
GitHub Pages live deployment
```

## Mirror candidate handoff

Mirror packages every production candidate with:

- exact Mirror commit SHA;
- exact canonical DataNest base SHA;
- candidate workflow/run reference;
- changed-file list;
- production patch;
- unit-test observation;
- type-check observation;
- dependency-audit observation;
- candidate purpose/summary.

Mirror-specific R&D controls are excluded from automatic production import.

The candidate may notify the canonical repository through the optional `DATANEST_PROMOTION_TOKEN`. If that token is absent, the same candidate package remains available for a manual canonical import.

## Canonical import

The canonical `Import Mirror Production Candidate` workflow imports the selected candidate onto a fresh `mirror-promotion/*` branch.

It must never:

- push directly to `main`;
- deploy GitHub Pages;
- mark Audit Optimizer review complete;
- mark governance complete;
- claim production authorization.

The import writes a promotion manifest under `governance/mirror-promotions/` with all downstream authority fields initialized to `pending` / false.

## Audit Optimizer gate

After import, the candidate must be reviewed through the DataNest Audit Optimizer evidence loop.

Audit Optimizer remains advisory and evidence-producing. It does not receive merge or deployment authority.

The production release payload must contain a non-placeholder:

- `mirror_promotion_reference`;
- `audit_optimizer_reference`.

The canonical UI governance evidence writer treats both as required review-chain evidence. Missing, blank, `pending`, `todo` or `tbd` values fail closed.

## Governance + human approval

Audit Optimizer evidence is not final approval.

The existing canonical review chain still applies, including:

- PR Verification;
- Security Scan;
- RONSAS validation when applicable;
- visual / UX review;
- governance-impact review;
- legal review;
- external / independent review;
- final human production authorization.

Human reviewer approval remains the authority boundary before production.

## Live deployment authority

Only `DataNest-Supository/DataNest` may deploy the canonical public endpoint.

The live workflow is manual and exact-SHA based. It verifies that the release SHA is reachable from `DataNest/main` and refuses authorization when required evidence is missing.

Mirror-DataNest must never deploy:

`https://datanest-supository.github.io/DataNest/`

Its own preview/R&D surfaces remain non-authoritative.
