# Reson8.life DataNest ingress

DataNest source and governance authority remains:

- Repository: `DataNest-Supository/DataNest`
- Branch: `main`
- Current production delivery: `https://datanest-supository.github.io/DataNest/`
- Canonical ecosystem Hub: `https://reson8.life/`
- Target branded ingress: `https://datanest.reson8.life/`

## Binding

The application publishes a machine-readable contract at:

`/.well-known/reson8-app.json`

On the current GitHub Pages release that contract is available under the repository base path:

`https://datanest-supository.github.io/DataNest/.well-known/reson8-app.json`

DataNest always exposes a return path to the Reson8 Hub. The authenticated shell also probes the governed RONSAS/Reson8 status contract, but Hub navigation does not disappear when that probe is temporarily unavailable.

## Runtime configuration

A standalone branded deployment may set:

`DATANEST_RUNTIME_CONFIG_URL=https://datanest-supository.github.io/DataNest/runtime-config.js`

Only HTTPS runtime-config sources hosted by the DataNest GitHub Pages authority or by `reson8.life` / its subdomains are accepted by the root layout. This keeps public Supabase runtime configuration tied to the canonical DataNest release while allowing a separate branded ingress.

## Hosting

Preferred target:

`datanest.reson8.life -> standalone DataNest deployment`

The current Railway workspace is at its Free-plan resource provisioning limit, so a new DataNest service cannot be created there without either:

1. freeing an existing service slot,
2. increasing Railway capacity, or
3. using another deployment provider.

Do not repurpose a live Hub or application fallback service just to obtain a slot. Any retirement or repurposing of validation infrastructure should be an explicit infrastructure decision.

## Hub registry

The Reson8 Hub should register DataNest as a non-billable ecosystem surface, not as a paid SKU. The Hub-side tracking item is:

`resonance36912-cell/resonance-hub#136`

Until the branded ingress is live, Hub navigation should use the current GitHub Pages URL as the operational fallback.
