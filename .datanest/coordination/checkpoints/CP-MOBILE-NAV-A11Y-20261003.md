# DataNest Mobile Navigation Accessibility — Resume Checkpoint

Date: 2026-10-03
Branch: `work/mobile-navigation-accessibility-20261003`
Base protected `main`: `068372247da65f3028bb9b509dca44b5b42bb87a`
Current test-first head: `f7859b172b214421285cd198ac3170e7efdb3cb7`
Predecessor: PR #465 (merged)

## Intent

Continue the October 3 UX reconciliation as a separate, reviewable accessibility change. Do not revive PR #442 or the retired public-root/`/workspace/` assumptions.

## Current gate

`tests/browser/navigation-reconciliation.spec.ts` now defines the required compact/mobile navigation contract on the authenticated current root:

- when compact navigation is closed, the sidebar is inert;
- opening the menu exposes `#datanest-navigation` as a modal dialog;
- the close-menu control receives initial focus;
- `main.mainPane` becomes inert while navigation is open;
- body scrolling is locked while the modal navigation is open;
- Tab/Shift+Tab remain contained within the navigation dialog;
- Escape closes navigation and restores focus to the menu launcher;
- selecting the already-current workspace closes navigation and restores launcher focus;
- selecting a different workspace closes navigation and allows the existing workspace-title focus behavior to take over;
- crossing back to desktop width removes modal/inert/scroll-lock state.

The test is intentionally added before the product implementation so the follow-up has a precise failing/passing acceptance boundary.

## Implementation target

Reconcile only the mobile navigation accessibility delta into the current `src/components/DataNestApp.tsx`.

Expected design, adapted from the retired #444 hunk but applied to current code rather than copied wholesale:

1. Track compact navigation with `matchMedia("(max-width: 900px)")`.
2. Add refs for the navigation container and menu launcher.
3. When compact navigation opens:
   - set body overflow to hidden and restore the prior value on close/cleanup;
   - focus `.closeMenu` on the next animation frame;
   - close on Escape via a helper that restores launcher focus.
4. Add a compact-only focus trap for Tab/Shift+Tab across visible interactive elements in the sidebar.
5. Use `PlatformShell navigationOpen={compactNavigation&&mobileOpen}` so the main pane is inert while the mobile navigation dialog is active.
6. On the sidebar, apply dialog semantics only while compact navigation is open; keep the closed compact sidebar inert and remove inert behavior on desktop.
7. Route close button and scrim through the focus-restoring close helper.
8. For navigation selection:
   - selecting the current view while the mobile dialog is open should use the close helper and restore menu focus;
   - selecting a different view should retain the existing view-change/title-focus flow.
9. Add `type="button"` to mobile menu/close/scrim controls where needed.

Do not replace the full historical `DataNestApp.tsx`; preserve all newer recovery, workspace, AI-context, and command-palette logic.

## Verification

After implementation, require a fresh exact-head run of:

- CI;
- PR Verification including the new mobile regression and UI-governance visual review;
- Security scan / Semgrep;
- DataNest AI Certification;
- all protected-main governance trees.

Address review comments on the exact head and obtain required code-owner approval before merge.

## Promotion boundary

This checkpoint does not authorize protected-main merge or deployment. Human/code-owner approval and all required exact-head checks remain mandatory.

## Resume instruction

Resume from branch `work/mobile-navigation-accessibility-20261003`. Treat `tests/browser/navigation-reconciliation.spec.ts` as the executable acceptance contract. Implement the mobile dialog/focus-trap/focus-restoration behavior against the current `DataNestApp.tsx`, then rerun exact-head protected-main verification. Do not revive the retired #442 route model.
