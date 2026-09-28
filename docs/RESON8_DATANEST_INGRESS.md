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

Provisioned target:

`datanest.reson8.life -> Railway branded ingress -> canonical DataNest GitHub Pages release`

The ingress uses the former validation-only `nova-task4-validation` service. No live Hub or application fallback service was repurposed. DataNest source/governance authority remains the DataNest repository; Railway is only the branded edge/proxy layer.

## Backup host

Dropbox `/DataNest-AI-Backups` is the governed backup-artifact host. Local PCs, including Ealiophin/Spider/Weed, are not backup hosts and are not continuity authorities.

Dropbox stores governed release/recovery artifacts and manifests. It does not replace the public request-serving path: GitHub Pages remains the operational web fallback until the branded Reson8 ingress is healthy, and Railway remains the branded edge/proxy layer.

## Hub registry

The Reson8 Hub should register DataNest as a non-billable ecosystem surface, not as a paid SKU. The Hub-side tracking item is:

`resonance36912-cell/resonance-hub#136`

Until the branded ingress is live, Hub navigation should use the current GitHub Pages URL as the operational fallback.

## Provisioned Railway ingress

Railway now hosts the branded ingress on the repurposed validation-only service `nova-task4-validation` in project `RONSAS Nova Validation`.

- Railway service domain: `https://nova-task4-validation-production.up.railway.app/`
- Railway deployment: `6e29fc87-0510-452e-aebd-ed59bbc25f89`
- Health endpoint: `/health`
- Public networking and runtime are aligned on container port `3000` (Railway healthcheck passed on the same deployment).
- Custom domain attached: `datanest.reson8.life`
- Required DNS record: `CNAME datanest.reson8.life -> r3sevmpy.up.railway.app`
- Certificate state after attachment: validating ownership

The ingress reverse-proxies the canonical GitHub Pages release and preserves the branded `datanest.reson8.life` host in the browser. The outstanding production step is publishing the CNAME at the authoritative DNS provider and waiting for Railway certificate validation.

The earlier ingress deployment `e5b9f6e6-17e7-43fd-9486-0879e28d9d1d` was superseded after aligning the Railway domain target port with the service runtime. The active deployment is `6e29fc87-0510-452e-aebd-ed59bbc25f89`.
