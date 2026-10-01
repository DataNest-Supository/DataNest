# DataNest Maintenance Protocol

DataNest repositories use scheduled maintenance for noise deletion and decluttering while preserving unique work and governance evidence.

## Autonomous branch cleaner

The cleaner may autonomously delete a branch only when all of the following are true:

1. the branch is not protected;
2. it is not the repository base branch;
3. it has no open pull request;
4. it has no unique commits relative to the base branch.

Unknown ancestry, divergent history, unique work, archived evidence, release branches, Knowledge branches, and governance branches are retained for human review.

## Streamliner

The streamliner may apply deterministic, byte-safe text normalization. In canonical DataNest it must open a pull request rather than directly mutate `main`. Mirror may use its separate R&D protocol. FREETREE receives its own isolated maintenance workflow when bootstrapped.

## Repository coverage

- **DataNest** — scheduled cleaner + PR-based streamliner.
- **Mirror-DataNest** — scheduled safe cleaner + R&D streamliner.
- **FREETREE** — isolated local maintenance only; no synchronization to DataNest, Mirror, Knowledge, or Boundaries.
