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

GitHub confirms that protected branches and repository rulesets are available on GitHub Free for public repositories. The remaining gap is therefore administrative configuration, not a paid-plan requirement.

Create a repository ruleset named **BRANCH-X Canonical** with enforcement set to **Active** and target patterns:

- `main`
- `release/**`

Configure these rules:

- Require a pull request before merging.
- Require at least 1 approving review.
- Dismiss stale pull-request approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require the required status checks listed below.
- Require linear history.
- Block force pushes.
- Restrict deletions.
- Do not configure any bypass actors unless an explicit governance exception is later approved.

Required status checks:

```
CI
PR Verification
Security scan
DataNest AI Certification
DataNest Boundaries
ENFORCER Defence Tree
GUARDIAN Health & Healing Tree
CALMER Governance Softening Tree
REGULATOR Harmony Tree
VISIBILITY-UTILITY Market Presence Tree
BRANCH-X Protection Tree
```

Create a second ruleset named **BRANCH-X Automation** for:

- `automation/**`
- `audit/**`
- `ci/**`

For that ruleset, block force pushes and deletions, require conversation resolution, and require:

```
CI
BRANCH-X Protection Tree
```

Leave ordinary development branches outside these rulesets.

This one-time administrator action is the host-level enforcement step. The repository policy remains authoritative for what the configuration must contain.

## Verification after configuration

After saving the rulesets, verify that the repository exposes the active rulesets and that their target patterns and rules match `config/branch-protection.tree.json`.

The BRANCH-X workflow should remain green. A missing or drifted native rule must continue to be treated as a protection gap rather than compliance.

## Authority boundary

BRANCH-X defines and verifies canonical adoption conditions. It does not grant merge authority or production authority.
