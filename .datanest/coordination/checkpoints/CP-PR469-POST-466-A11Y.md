# CP-PR469-POST-466-A11Y

## Status
IN REVIEW

## Canonical review object
- PR: https://github.com/DataNest-Supository/DataNest/pull/469
- Branch: `fix/post-466-accessibility-follow-up-20261003`
- Base at branch creation: `afd2ce44e9150eceb0b6b254bec58aa4476e81d5`
- Parent governed merge: PR #466 / `8e4762d7127874ee6fe238d9ed316e3e64da4152`
- Implementation head before this checkpoint commit: `877bfa10c13d99c6e1c86c05daab3a009e69e888`
- Always treat the live PR head as authoritative after this checkpoint commit.

## Reason for follow-up
Codex added two P2 accessibility findings to #466 after #466 had already merged:
1. the skip link remained outside the mobile modal isolation boundary;
2. same-view sidebar actions could close the drawer while leaving focus in content that immediately becomes inert, including Account security and Review in Product Lab.

These findings are intentionally handled in PR #469 rather than rewriting #466.

## Final-head review remediation
Codex reviewed head `c32f9a16ae7131dc98c1fa8e6eb3d78902c07c76` and surfaced one additional P2 before merge: same-view Account security restored visible focus without consuming `pendingSettingsFocusRef`, allowing that stale request to replay after navigating away and later returning to Settings. The remediation moves same-view Account security focus consumption into `DataNestApp`, where the pending request is cleared before focus is applied, and extends the browser regression to prove normal workspace-title focus on a later Settings return.

## Implemented scope
- `src/components/platform/MobileNavigationA11yGuard.tsx`
  - isolates `.skipLink` with `inert` and `aria-hidden="true"` only while `#datanest-navigation` is the active modal dialog;
  - detects focus stranded in a closing mobile sidebar;
  - does not override cross-view focus reconciliation;
  - does not override focus ownership when another modal opens;
  - defers Account security focus ownership to `DataNestApp` so its pending request is consumed;
  - sends other same-view stranded closures to the mobile menu launcher.
- `src/components/DataNestApp.tsx`
  - consumes the pending Account security focus request both when entering Settings and when Settings is already current;
  - clears the request before focusing `#account-security`, preventing stale focus replay on a later return to Settings.
- `src/app/layout.tsx`
  - mounts the guard once at the application root.
- `tests/browser/navigation-reconciliation.spec.ts`
  - verifies skip-link isolation and release;
  - verifies same-view Account security destination focus and that the request does not replay after leaving and returning to Settings;
  - verifies same-view Product Lab returns focus to the menu launcher.
- `.github/workflows/pr-verification.yml`
  - includes `navigation-reconciliation.spec.ts` in governed browser verification so the final PR head must prove these regressions in CI.

## Required validation before merge
- `npm run check`
- `npm run check:contracts`
- `npx playwright test tests/browser/navigation-reconciliation.spec.ts`
- all required GitHub checks green on the final PR head
- fresh required approval(s) after the final tested head
- unresolved review threads assessed/resolved before merge

## Governance constraints
- Do not amend, rewrite, or reopen the merged #466 commit.
- Do not bypass protected `main`.
- If code changes after approval, require fresh validation and fresh approval on the new head.
- Merge only through PR #469 after repository governance permits it.

## Resume trigger
Open PR #469 and read its current head SHA, checks, reviews, and unresolved threads. If checks fail, fix only the narrow accessibility scope above, update this checkpoint if the recovery plan materially changes, and re-run governance. If checks pass but approval is stale or missing, obtain a fresh approval on the final tested head before merge. After merge, verify protected `main` points to the resulting merge commit and confirm canonical-to-Mirror notification status.
