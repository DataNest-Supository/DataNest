# DataNest Data Sovereignty Model

## Purpose

Data sovereignty in DataNest is implemented as a governed policy model, not as a marketing claim about where a cloud provider happens to run.

The model derives its state from the existing Phase C Trust & Data Policy controls:

- active Trust Manifest;
- visibility / processing classification;
- reuse / learning state;
- approved provider route keys;
- active Provider Trust Profiles;
- provider region allowlists;
- export policy;
- active retention policy;
- retention holds;
- evidence state;
- report-only versus enforced rollout mode.

No new ownership, financial, contractual, constitutional, or role authority is created by this model.

## Sovereignty principles

1. **Project authority remains primary.** DataNest policy describes processing authority; it does not create a platform ownership claim over project data.
2. **Local-only fails closed.** `local_only` content cannot route to external providers.
3. **Regional claims require evidence.** A region-constrained posture is shown only when every approved active provider route has an explicit allowed-region policy.
4. **External processing requires approved routes.** Missing, suspended, restricted, expired, or otherwise unresolved provider coverage must not silently broaden authority.
5. **Reuse is independent.** Processing permission does not imply project learning, platform learning, certification, publication, or public reuse.
6. **Portability is governed.** Export follows the active Trust Manifest and existing access controls.
7. **Retention is non-destructive by default.** A retention policy or review state does not itself authorize deletion.
8. **Evidence controls claims.** Report-only, planned, partial, or unknown controls are displayed as such and must not be represented as enforced guarantees.
9. **Cross-border posture is policy-derived.** DataNest displays deny, no-external-route, region-governed, or review-required states instead of inferring compliance from infrastructure geography.
10. **Key custody is not invented.** DataNest does not claim customer-managed encryption keys unless a separately implemented and evidenced key-management control exists.

## Derived states

### Processing boundary

- `local_only`: hard local boundary; external routing denied.
- `region_constrained`: every approved active provider route declares at least one allowed processing region.
- `provider_governed`: provider trust controls exist but regional coverage is incomplete or not the controlling boundary.
- `unresolved`: no active Trust Manifest exists.

### External processing

- `denied`: local-only or no approved external route.
- `report_only`: approved provider coverage exists but the Trust Manifest is not in enforced mode.
- `approved_profiles_only`: enforced mode with resolved approved provider coverage.
- `review_required`: one or more approved route keys lack an active matching Provider Trust Profile.
- `unresolved`: no active Trust Manifest.

### Cross-border posture

- `denied`
- `no_external_route`
- `governed_by_region_allowlist`
- `review_required`
- `unresolved`

These are operational policy states. They are not a substitute for legal advice or a representation that a particular jurisdictional requirement has been satisfied.

## UI integration

The Trust & Data Policy workspace contains a **Data Sovereignty Model** panel showing:

- project governance authority;
- effective processing boundary;
- external-processing posture;
- cross-border posture;
- allowed regions;
- active and unresolved provider routes;
- reuse / learning posture;
- export policy;
- active referenced retention policy;
- active holds;
- evidence state;
- known limitations;
- rollout mode.

The panel intentionally distinguishes report-only from enforced state.

## Verification

Unit coverage lives in `tests/unit/data-sovereignty.test.mjs` and checks fail-closed behavior, local-only denial, region coverage, unresolved provider routes, reuse separation, retention linkage, and report-only labeling.
