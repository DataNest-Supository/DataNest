# BRANCH-X Protection Tree

BRANCH-X is the repository-native branch governance layer for DataNest.

It defines canonical branches (`main` and `release/**`), protected automation/evidence branches, review floors, required CI evidence, and destructive-operation prohibitions.

## Canonical policy

Canonical branches require a pull request, automated status checks, conversation resolution, linear history, and the other non-destructive protections defined in `config/branch-protection.tree.json`. No approving review is required by the repository-declared policy.

Force-pushes and branch deletion are forbidden for canonical branches.

## Enforcement layers

1. GitHub-native branch protection/rulesets are the authoritative enforcement mechanism when repository administration credentials are available.
2. `BRANCH-X Protection Tree` continuously verifies the repository policy and required workflow definitions.
3. `.github/CODEOWNERS` identifies canonical governance ownership.
4. `branch-cleaner.config.json` protects canonical, automation, audit, and CI branches from destructive maintenance.
5. Boundaries classifies the BRANCH-X control plane as canonical-only.

A GitHub-native ruleset that still requires approvals is a **native protection gap** against the current progressive-live policy. That mismatch should be remediated by the repository administrator by the proposed policy deadline rather than silently represented as compliant.

## Free host-level closure

GitHub confirms that repository rulesets and protected branches are available for public repositories on GitHub Free. citeturn718149search4turn718149search6

Import `.github/rulesets/BRANCH-X-Canonical.json` and set it to **Active** for `main` and `release/**`. The definition enforces pull requests, zero required approvals, conversation resolution, required status checks, linear history, no force pushes, and no deletions.

Import `.github/rulesets/BRANCH-X-Automation.json` and set it to **Active** for `automation/**`, `audit/**`, and `ci/**`. This host-level ruleset blocks non-fast-forward updates and branch deletion while retaining direct automation writes. It also carries the protected-automation status checks declared in `config/branch-protection.tree.json`; review/conversation-resolution requirements remain scoped to canonical PR changes.

No bypass actors are configured in either definition.
