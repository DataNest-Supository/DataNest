# CP-SUPOSITORY-COMMERCIAL-ALIGNMENT-20261003

## Purpose

Integrate the current DataNest Supository UX/accessibility candidate with the concurrent commercial front-door work without modifying either source PR or bypassing review governance.

## Integration basis

- Commercial front door: PR #442, `feature/commercial-front-door`, reviewed head at integration start: `075e6e0b20e0952ca918b0e352689dfdfbf4c665`.
- Supository UX candidate: PR #443, `ux/supository-navigation-20261003`, reviewed head at integration start: `6bdb1de6ab3a407198d4efb18d27ebce80b1cf02`.
- Integration branch: `ux/commercial-aligned-supository-20261003`.
- Integration base remains PR #442 so the public `/DataNest/` commercial front door stays authoritative and the authenticated workspace remains `/DataNest/workspace/`.

## Conflict review

The refreshed PR file lists showed two overlapping files only:

1. `src/app/layout.tsx`
2. `src/components/AuthGate.tsx`

Resolution:

- `layout.tsx`: preserve the current commercial/front-door layout, fonts, metadata, runtime scripts and cinematic shell; add `supository-ux.css` as the final UX override stylesheet.
- `AuthGate.tsx`: preserve PR #442's current secure email/password workspace entry and its links back to the public DataNest and audit surfaces. The older PR #443 entry-page changes are not transplanted because the public root is now owned by PR #442.

## UX changes carried forward

The following PR #443 files were transplanted by exact Git blob SHA to preserve provenance:

- `.github/workflows/pr-verification.yml`
- `src/app/supository-ux.css`
- `src/components/AdminRndModeToggle.module.css`
- `src/components/AdminRndModeToggle.tsx`
- `src/components/DataNestApp.tsx`
- `src/components/platform/GlobalNavigation.tsx`
- `src/components/platform/PlatformShell.tsx`

These changes improve responsive navigation, keyboard focus behavior, workspace discovery, R&D controls, accessibility states and small-screen reachability without replacing PR #442's public commercial pages.

## Regression alignment

`tests/browser/supository-navigation.spec.ts` is adapted to the new route boundary:

- anonymous workspace-entry checks use `/DataNest/workspace/`;
- authenticated navigation tests use the same workspace route;
- mobile overflow and focus containment/restoration remain covered;
- axe WCAG checks remain covered;
- workspace deep-link behavior remains covered;
- R&D sync-failure announcements and reachability remain covered.

## Verification status

This checkpoint records source alignment, not deployment certification.

- Existing PR #443 checks were still processing when integration began.
- PR #442 had advanced independently during review.
- The `PR Verification` workflow is configured for pull requests targeting `main`; a stacked PR targeting `feature/commercial-front-door` may therefore not auto-run that workflow until the stack is retargeted or merged toward `main`.
- No production deployment or `main` merge is authorized by this checkpoint.
- Human review and repository governance checks remain required before synchronization or live deployment.
