# DataNest AI System Optimizer — Production Release Candidate

## Candidate baseline

- Release-candidate base: `main`
- Exact baseline SHA: `815b27f3a06eb1aaf54b1107ce7ad8017d957b9e`
- Historical feature source: PR #287
- Production backend migration: `enable_admin_system_optimizer_collaboration`

This document is a release-governance record. It does not itself authorize deployment.

## Governance boundaries

The Admin System Optimizer remains subject to the existing governance model:

- Admin and Owner access follows application role controls.
- Optimizer suggestions do not constitute approval.
- Owner approval remains required before a suggestion enters formal governance.
- Code Cleaner remains proposal-only.
- No AI action in this dossier grants automatic code edit, merge, deployment, voting, or ratification authority.

## Exact-head release evidence

All release evidence below must refer to this candidate SHA or to a later SHA that is explicitly designated as the replacement candidate.

- [ ] CI / build verification for this exact candidate
- [ ] PR Verification for this exact candidate
- [ ] Security scan for this exact candidate
- [ ] RONSAS Application Validation for this exact candidate
- [ ] UI governance visual-review artifact for this exact candidate
- [ ] Human visual review
- [ ] Human governance-impact review
- [ ] Human legal review
- [ ] External or independent human review
- [ ] Explicit human authorization for GitHub Pages production release

Historical evidence from PR #287 or earlier release candidates must not be treated as fresh exact-head evidence for this candidate.

## Release rule

Do not dispatch the GitHub Pages production workflow until the current candidate is validated at an exact reachable SHA from `main` and all required human review references are recorded.

Automated or AI-generated evidence may support review but cannot replace the required human decisions.

## Containment

If any release gate fails:

1. do not dispatch the Pages production workflow;
2. keep the currently deployed UI unchanged;
3. make any correction through a new governed PR;
4. re-run exact-head verification;
5. replace this dossier with the next candidate evidence set.
