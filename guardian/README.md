# GUARDIAN Tree

**GUARDIAN** is DataNest's health-monitor and safe-healing tree.

It captures versioned health snapshots from the canonical root through specialized tree inputs, compares the observed environment with `config/guardian.blueprint.json`, measures drift from required operating conditions, and records changes from the previous snapshot.

GUARDIAN heals only what DataNest can prove is safe and reversible:

- branches with **zero unique commits**, no open PR, and successful live revalidation may be deleted through the existing Branch Cleaner;
- byte-safe source normalization may be applied through the existing Workflow Reviewer;
- behavioral refactoring or duplicate-code removal remains a reviewable healing proposal/PR;
- unknown or unique history is never treated as redundant.

GUARDIAN never gains production authority, weakens Boundaries/ENFORCER, publishes secrets, or synchronizes/heals FREETREE automatically.
