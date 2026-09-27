# Migration History Reconciliation — 2026-09-27

Branch-Cleaner remains fail-closed while the Git migration chain differs from the application-authority Supabase migration history.

## Evidence snapshot

- Supabase project status: ACTIVE_HEALTHY
- Supabase default branching record before repair: MIGRATIONS_FAILED
- Applied production migration records: 53
- Git SQL migration files before repair: 16
- Exact version/name matches before repair: 0
- Name matches with different versions: 15
- Repo-only files before repair: 1
- Live-only migration records before repair: 38

## Repair method

This branch reconstructs `supabase/migrations` from the authoritative rows already recorded in `supabase_migrations.schema_migrations`.
It does not change the production database, insert or delete migration-history rows, or bypass Branch-Cleaner's blockers.

The 16 prior SQL migration files are removed on this branch and replaced by 53 timestamped files using the recorded production version and migration name. Each file body is reconstructed from the recorded migration statements in version order.

## Merge gate

Do not merge this branch until all of the following are true:

1. Branch-Cleaner reports migration parity at 53 repo files / 53 applied migrations with no live-only, repo-only, or version mismatches.
2. The reconstructed chain is exercised in an isolated Supabase preview/branch and migrations complete successfully.
3. Existing unit/CI checks pass.
4. Production remains unchanged during validation.

If preview replay fails, keep this branch unmerged, preserve the Branch-Cleaner blocker, and repair the specific migration from the recorded evidence rather than disabling parity enforcement.
