# Branch-Cleaner

Branch-Cleaner is DataNest's audit-aware branch hygiene and control-plane inspection tool.

It combines the operational lessons already captured in DataNest's GitHub/Supabase reviews into one conservative workflow:

- inventory every Git branch and correlate it with pull-request history;
- compare each branch with the configured base branch;
- group iterative names such as `-v2`, `-v3`, `-current-main`, and date suffixes without assuming they are redundant;
- classify branches as **keep**, **review**, or **delete_candidate**;
- load DataNest's published audit findings/backlog as evidence and preserve their validation state;
- inspect configured Supabase projects separately for project health, branch failures, security advisors, performance advisors, and Git/Supabase branch drift;
- emit JSON + Markdown reports with SHA-256 fingerprints of the audit inputs;
- default to dry-run; deletion happens only with `--apply`.

## Safety model

A branch is never a delete candidate when it is the base/protected branch, has an open PR, has unique commits, or GitHub comparison is unresolved.

A branch may become a delete candidate only when:

1. it is old enough to satisfy `minDeleteAgeDays`;
2. GitHub successfully proves it has **zero commits ahead** of the base branch; and
3. it is not protected and has no open PR.

Supabase findings never trigger Git-branch deletion. Performance advisor output is review evidence, not an instruction to remove indexes or schema objects.

Published external-audit findings also remain evidence until DataNest validation changes their state; Branch-Cleaner does not promote reported findings into certification.

## DataNest authority map

The default configuration keeps the two audited backend contexts distinct:

- `sgqdmfgjbprsoqsmgigi` — DataNest application/control-plane authority, expected Git branch `main`;
- `qchttpcyqlqnhvahprhz` — DataNest AI staging/audit environment.

This separation is intentional and supports the audit requirement to prove production/staging isolation.

## Run locally

```bash
export GITHUB_REPOSITORY=DataNest-Supository/DataNest
export GITHUB_TOKEN=...
export SUPABASE_ACCESS_TOKEN=... # optional; without it Supabase inspection is skipped

npm run branch-cleaner
```

Strict dry-run:

```bash
npm run branch-cleaner:strict
```

Apply only proven-safe Git branch deletions:

```bash
node scripts/branch-cleaner.mjs --apply --strict
```

Reports are written to `artifacts/branch-cleaner/branch-cleaner-report.{json,md}`.

## GitHub Actions

Use **Actions → Branch-Cleaner → Run workflow**.

- `apply=false` is the review-first path.
- `apply=true` enables deletion of only `delete_candidate` branches.
- add a repository secret named `SUPABASE_ACCESS_TOKEN` if Supabase inspection should run in CI.
- use a narrowly scoped Supabase token; do not expose service-role keys or database passwords.

## Tests

```bash
npm run test:branch-cleaner
```

The test suite covers protected/base branches, open PRs, unique commits after merge, iterative branch-family parsing, Supabase default-branch failures, audit-ID extraction, and the critical rule that compare/API uncertainty can never become a delete candidate.
