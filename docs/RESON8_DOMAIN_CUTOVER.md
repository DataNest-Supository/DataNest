# reson8.life DataNest Domain Cutover

This runbook moves the full Resonance DataNest web control plane to the owned `https://reson8.life` origin while keeping GitHub as source/CI authority and Supabase as backend authority.

## Target topology

```text
https://reson8.life/                 DataNest parent platform
https://reson8.life/apps/            RONSAS application hub surface
https://reson8.life/apps/<slug>/     DataNest-hosted RONSAS applications
```

The production root build must use:

```env
DATANEST_STATIC_EXPORT=true
DATANEST_PUBLIC_ORIGIN=https://reson8.life
DATANEST_DELIVERY_TARGET=lovable-domain
NEXT_PUBLIC_BASE_PATH=
```

A project-path build such as `/DataNest` is a fallback delivery shape only and must not be published at the canonical domain.

## Pre-cutover gates

1. The **Reson8 Root Domain Readiness** workflow is green on the exact commit selected for deployment.
2. The generated HTML references `/_next/...`, never `/DataNest/_next/...`.
3. All seven hosted RONSAS applications build under `/apps/<slug>/`.
4. Browser verification passes with `DATANEST_APP_PATH=/`.
5. `release-manifest.json` reports:
   - `publicOrigin=https://reson8.life`
   - `basePath=""`
   - `deliveryTarget=lovable-domain`

## Lovable/domain cutover

The existing Lovable project currently occupying `reson8.life` must be replaced or reconfigured to serve the validated DataNest root artifact/application. Do not leave two independent applications claiming the same origin.

After the Lovable connection is available, verify the exact project that owns the domain before changing its publish target. Preserve a rollback reference to the existing project/release.

## Supabase Auth cutover

Supabase Auth must allow the exact production redirect origin before relying on passwordless or invitation links:

- Site URL: `https://reson8.life`
- Additional redirect URL: `https://reson8.life/**` only if application flows require path-level redirects.

Use an exact production URL where possible. Keep localhost entries only for local development.

## Post-cutover verification

Verify from outside the deployment environment:

- `https://reson8.life/` serves **Resonance DataNest**.
- `https://reson8.life/health.json` reports `"ok":true`.
- `https://reson8.life/runtime-config.js` contains the expected public Supabase project URL and publishable key marker.
- `https://reson8.life/release-manifest.json` matches the deployed Git commit and canonical domain fields.
- every `https://reson8.life/apps/<slug>/` route returns HTML.
- sign-in, magic-link redirect, Products, RONSAS links, Quick Switch, and Settings work at the root origin.
- no production HTML or browser request requires the legacy `/DataNest` prefix.

## Rollback

If domain verification fails, restore the prior Lovable domain binding/release first. The GitHub Pages project-path deployment remains a fallback until the root-domain deployment is independently verified and explicitly retired.
