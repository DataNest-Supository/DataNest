# Branch Cleaner Operations

Branch Cleaner is a fail-closed GitHub branch hygiene tool for the DataNest repository.

## Deletion eligibility

There is no branch-age floor. A branch can be deleted immediately only when all of these are true:

- it is not `main`, protected, or matched by a protected branch pattern;
- it has no open pull request;
- GitHub comparison with `main` is known;
- it has exactly zero unique commits (`ahead_by = 0`);
- strict control-plane verification has no blockers.

Any branch with unique commits remains `review` or `keep`. Unknown compare state remains `keep`.

## Strict Supabase verification

Strict/apply mode must verify the configured Supabase application and AI staging authorities before destructive cleanup. The application authority also enforces exact Git-to-live migration history parity.

Branch Cleaner accepts either of these verification sources:

1. **Live management verification** using the encrypted GitHub Actions secret `SUPABASE_ACCESS_TOKEN`.
2. **Fresh verified evidence** from `.github/branch-cleaner/supabase-verified-snapshot.json`.

The snapshot path is fail-closed. The script rejects it when it is missing, expired, older than the configured maximum age, dated too far in the future, incomplete, mapped to the wrong project refs, unhealthy, or inconsistent with Git migration history.

The configured maximum snapshot age is controlled by `supabaseEvidenceMaxAgeMinutes` in `branch-cleaner.config.json`.

When both sources are unavailable or invalid, strict/apply remains blocked.

## Credential guidance

Supabase currently documents access-token authentication for CI management operations. When using live verification, store a least-privilege scoped token only as the encrypted GitHub Actions secret `SUPABASE_ACCESS_TOKEN`.

Use read access sufficient for the configured project status, branch status, security advisors, and migration history checks.

## Recommended operator flow

1. Refresh live Supabase evidence or configure the encrypted access-token secret.
2. Run Branch Cleaner with `apply=false`, `strict=true`.
3. Review delete candidates and all warnings.
4. Run with `apply=true`, `strict=true` only when the strict dry run is clean.
5. Preserve generated artifacts as cleanup evidence.

## Variant-family triage

Branch Cleaner groups iterative branch names such as `-v2`, `-v3`, `-current`, `-current-main`, and dated suffixes. Older siblings are compared directly with the newest sibling.

- `contained_by_newer_sibling` means the older sibling is fully represented by the newer sibling, but it remains review-only while it has commits not yet in `main`.
- `divergent_variant_unique_work` means both siblings contain distinct history. Branch Cleaner preserves both branches and does not call the older one superseded.
- No family relationship overrides the zero-unique-commits rule for deletion.
