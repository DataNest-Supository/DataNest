# BRANCH-X Protection Tree

BRANCH-X is the repository-native branch governance layer for DataNest.

It defines canonical branches (`main` and `release/**`), protected automation/evidence branches, review floors, required CI evidence, and destructive-operation prohibitions.

## Canonical policy

Canonical branches require a pull request, at least one approval, stale-approval dismissal, conversation resolution, linear history, and the complete required status-check set defined in `config/branch-protection.tree.json`.

Force-pushes and branch deletion are forbidden for canonical branches.

## Enforcement layers

1. GitHub-native branch protection/rulesets are the authoritative enforcement mechanism when repository administration credentials are available.
2. `BRANCH-X Protection Tree` continuously verifies the repository policy and required workflow definitions.
3. `.github/CODEOWNERS` identifies canonical governance ownership.
4. `branch-cleaner.config.json` protects canonical, automation, audit, and CI branches from destructive maintenance.
5. Boundaries classifies the BRANCH-X control plane as canonical-only.

A failed GitHub-native administration attempt is recorded as a protection gap; BRANCH-X never treats that gap as successful protection.

## Free host-level closure

GitHub documents repository rulesets and protected branches as available for public repositories on GitHub Free:

- [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Managing protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

Import `.github/rulesets/BRANCH-X-Canonical.json` and set it to **Active** for `main` and `release/**`. The definition enforces pull requests, one approval, stale-review dismissal, conversation resolution, required status checks, linear history, no force pushes, and no deletions.

Import `.github/rulesets/BRANCH-X-Automation.json` and set it to **Active** for `automation/**`, `audit/**`, and `ci/**`. This host-level ruleset intentionally enforces only non-fast-forward and deletion protection so existing direct automation writes remain possible; BRANCH-X continues to require and verify the repository-native checks for these branches.

No bypass actors are configured in either definition.
