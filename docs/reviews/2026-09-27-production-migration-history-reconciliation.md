# Production migration-history reconciliation — 27 September 2026

Status: source-history reconciliation; no production database mutation.

## Why this exists

Resonance DataNest's production Supabase project `sgqdmfgjbprsoqsmgigi` is healthy at the project level, while its Supabase branching record for `main` reports `MIGRATIONS_FAILED`. Supabase branching recreates a branch by replaying Git migration history, so a missing or drifted migration chain prevents reproducible branch creation even when the live production database is healthy.

## Evidence

- Production applied-migration history contains **53** migrations.
- Git `main` at `a2d870e6cd63c58a2db5413f077a2593b2c1e27e` contains **16** SQL files under `supabase/migrations`.
- Production's `supabase_migrations.schema_migrations` table retains the authoritative migration version, name, and SQL statements.
- The migration SQL was scanned before reconstruction for Supabase PAT-like values, Supabase secret-key-like values, credentialed Postgres URLs, and password-assignment literals; none were detected.
- Earlier reconciliation showed 13 existing Git files matched production SQL exactly but used different timestamps; two untimestamped external-AI files differed only by source comments; the governed-product-catalog file was an idempotent source reformulation of the already-applied schema intent.

## Reconciliation

This commit replaces the drifted Git migration set with the **53** authoritative applied migrations using their production migration versions and names. 16 legacy/drifted migration paths are removed.

This is a source-control repair only:
- no production DDL or DML is executed;
- no migration-history rows are inserted, deleted, or edited in production;
- no Supabase project/branch is reset or rebased;
- no secrets or database passwords are written to Git.

## Validation

The source chain should be validated through repository CI and DataNest AI Certification. The strongest branching proof is a fresh Supabase preview replay after this source repair. Creating a new Supabase development branch can have plan-dependent cost and is therefore a separate governed action.
