# Reson8.life DataNest integration

DataNest source and governance authority remains:

- Repository: `DataNest-Supository/DataNest`
- Branch: `main`
- Public delivery: `https://datanest-supository.github.io/DataNest/`
- Canonical ecosystem Hub: `https://reson8.life/`
- Backup-artifact host: Dropbox `/DataNest-AI-Backups`
- Railway dependency: none

## Binding

The application publishes a machine-readable contract at:

`https://datanest-supository.github.io/DataNest/.well-known/reson8-app.json`

The Reson8 Hub should register DataNest as a non-billable ecosystem surface and link directly to the canonical GitHub Pages delivery. DataNest always exposes a return path to the Reson8 Hub.

## Delivery

The active route is intentionally simple:

```text
reson8.life
  links to
      ↓
DataNest GitHub Pages
  https://datanest-supository.github.io/DataNest/
      ↓
Supabase
  governed auth, data, storage, and Edge Functions
```

Railway is not needed for DataNest delivery, backup, source control, backend services, or governance.

The previous experimental Railway reverse-proxy for `datanest.reson8.life` is retired from the DataNest architecture. A future branded alias can be introduced through replaceable DNS/edge infrastructure if desired, but DataNest does not depend on that alias.

## Backup host

Dropbox `/DataNest-AI-Backups` is the governed backup-artifact host. Local PCs are not backup hosts or continuity authorities. Dropbox stores governed release/recovery artifacts and manifests; it does not serve the production web application.

## Hub registry

The Reson8 Hub should register DataNest as a non-billable ecosystem surface, not as a paid SKU. The Hub-side tracking item is:

`resonance36912-cell/resonance-hub#136`

The Hub DataNest CTA should use:

`https://datanest-supository.github.io/DataNest/`
