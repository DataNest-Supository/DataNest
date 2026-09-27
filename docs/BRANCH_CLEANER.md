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

Strict/apply mode verifies the configured Supabase application and AI staging authorities before destructive cleanup. The application authority also enforces exact Git-to-live migration history parity.

GitHub Actions therefore requires an encrypted repository secret named:

`SUPABASE_ACCESS_TOKEN`

Supabase currently documents access-token authentication for CI management operations; Branch Cleaner must not replace this with an unauthenticated or partial health check.

Use a least-privilege scoped Supabase access token with read access sufficient for the configured project status, branch status, security advisors, and migration history checks. Store it only as an encrypted GitHub Actions secret.

If the secret is absent, strict/apply fails before branch deletion. A non-strict, non-apply dry run may still report GitHub branch hygiene, but its report must show Supabase verification as unavailable and must not be treated as destructive approval.

## Recommended operator flow

1. Run Branch Cleaner with `apply=false`, `strict=true`.
2. Review delete candidates and all warnings.
3. Run with `apply=true`, `strict=true` only when the Supabase credential is configured and the dry run is clean.
4. Preserve generated artifacts as cleanup evidence.
