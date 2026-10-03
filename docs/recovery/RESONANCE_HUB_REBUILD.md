# Resonance Hub Rebuild & Recovery Baseline

## Purpose

This document is the durable recovery baseline for rebuilding or restoring the Resonance Hub without depending on Lovable.

Lovable is not required for source recovery: the surviving GitHub repository `Resonance-AppDev/resonance-hub` contains the application source, CI, tests, governance, billing/entitlement code, and deployment configuration.

## Canonical source pin

- Repository: `Resonance-AppDev/resonance-hub`
- Branch: `main`
- Verified source commit: `ff745cf4706ec21cf9f56cb3db7d5fcaf445d178`
- Public origin: `https://reson8.life`
- Framework: TanStack Start + Vite + React + TypeScript
- Package manager/runtime: Bun
- Design authority: Resonance Sovereign Spectrum 2026
- Hub role: ecosystem/billing/entitlement/ROP authority
- DataNest role: canonical operating-control/source-governance authority

## Critical recovered source pins

| Path | SHA |
| --- | --- |
| `src/lib/app-registry.ts` | `162db217ca5df5f069a015bbeb24df894e6116a0` |
| `src/routes/index.tsx` | `fc6a4440017ac3d7cf328a8c663275dd70dd4171` |
| `src/routes/api/public/app-status.health.ts` | `cd458cecd1ad086107c5f508fc476309f5742543` |
| `public/content/updates.json` | `37f90e1752112e92e04e9cd4a2a2453bf15a1296` |
| `scripts/lib/app-status-health-contract.test.ts` | `95a4c5f18e1735d28c1db0d31981caed7de762f4` |
| `scripts/verify-app-registry.ts` | `f3dabe13699de25db5bd93230acb030ecec5e0b2` |
| `baselines/app-status.json` | `99b23cd59c7f3ff1e7c44ee0917bc6aaeb865b51` |

## Recovery conclusion

The Hub application itself is recoverable. The missing piece is the DataNest ecosystem registration on the Hub side.

Current Hub source contains:

- `APP_REGISTRY` with five paid-suite entries.
- `BILLABLE_APP_KEYS` derived only from `APP_REGISTRY`.
- `ECOSYSTEM_REGISTRY` with Podcast, Career Compass, MYIFY, Nova Studio, and Resonance App Dev.
- Public `GET/OPTIONS /api/public/app-status/health` generated directly from both registries.
- A substantial homepage in `src/routes/index.tsx`.
- A JSON-backed Latest Updates surface in `public/content/updates.json`.
- Existing CI/verification around registry and app-status contracts.

## Required rebuild change

Add DataNest **only** to `ECOSYSTEM_REGISTRY`:

```ts
datanest: {
  key: "datanest",
  label: "Resonance DataNest",
  url: "https://datanest-supository.github.io/DataNest/",
  status: "pilot",
  tagline:
    "Governed intelligence workspace for job-scoped AI development, evidence, and certified memory.",
  includedInSuite: false,
},
```

Do not add DataNest to:

- `APP_REGISTRY`
- `BILLABLE_APP_KEYS`
- SKU catalog
- checkout
- subscriptions
- entitlement rules
- All-Access grants

## Homepage restoration

The homepage already has:

- an Apps section;
- a Latest Updates section;
- external ecosystem CTAs;
- a footer ecosystem-link area.

Restore DataNest as a non-billable ecosystem CTA using the current operational URL:

`https://datanest-supository.github.io/DataNest/`

Recommended UI:

- label: **Resonance DataNest**
- badge: **Pilot**
- CTA: **Open DataNest**
- copy: **Governed intelligence workspace for job-scoped AI development, evidence, and certified memory.**
- billing language: **No billing · governed workspace**

## Latest Updates restoration

Add a non-billable DataNest update to `public/content/updates.json`:

- app: `Resonance DataNest`
- status: `Pilot`
- tone: `pilot`
- href: `https://datanest-supository.github.io/DataNest/`
- cta: `Open DataNest`

No Railway or DNS dependency belongs in the acceptance criteria.

## Public health acceptance

`GET https://reson8.life/api/public/app-status/health` must expose:

```json
{
  "key": "datanest",
  "label": "Resonance DataNest",
  "url": "https://datanest-supository.github.io/DataNest/",
  "status": "pilot"
}
```

The five paid apps must remain five paid apps.

## DataNest-side source contract

DataNest is canonical for its own source/governance:

- `DataNest-Supository/DataNest`
- branch `main`
- production delivery: GitHub Pages
- billing: none
- Hub registration state: pending until the Hub source change is actually deployed

The DataNest-side alignment metadata has already been merged to:

`afd2ce44e9150eceb0b6b254bec58aa4476e81d5`

## Access limitation

The currently connected GitHub identities have pull-only access to `Resonance-AppDev/resonance-hub`. They can modify DataNest but cannot push or create a Hub PR.

Therefore this file is intentionally a durable recovery handoff, not a false claim that the Hub change has been deployed.

## Rebuild sequence

1. Restore write access to `Resonance-AppDev/resonance-hub`.
2. Apply the registry, homepage, and updates changes above.
3. Extend `scripts/lib/app-status-health-contract.test.ts` with an explicit DataNest assertion.
4. Run the existing Hub verification suite.
5. Deploy Hub.
6. Verify the public health endpoint includes DataNest.
7. Only then change DataNest `runtimeRegistration.state` from `pending` if the live registration is independently verified.
