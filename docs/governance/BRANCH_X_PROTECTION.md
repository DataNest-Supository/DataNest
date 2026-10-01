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

## Authority boundary

BRANCH-X defines and verifies canonical adoption conditions. It does not grant merge authority or production authority.
