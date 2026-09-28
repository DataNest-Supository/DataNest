# reson8.datanest.life integration

Canonical DataNest branded identity:

- Name: `reson8.datanest.life`
- Branded URL: `https://reson8.datanest.life/`
- Current branded state: wire-ready
- Operational delivery: `https://datanest-supository.github.io/DataNest/`
- Repository: `DataNest-Supository/DataNest`
- Branch: `main`
- Canonical ecosystem Hub: `https://reson8.life/`
- Backup-artifact host: Dropbox `/DataNest-AI-Backups`
- Railway dependency: none

## Independence model

`reson8.datanest.life` is the active canonical name in DataNest metadata and contracts. It is not coupled to Railway or any other hosting-provider record. Provider-specific metadata that cannot be deleted does not define DataNest identity, routing authority, source authority, backend authority, or backup authority.

The application layer is wired so that requests served on `reson8.datanest.life` immediately redirect to `https://reson8.life/`. The remaining network-layer step is DNS/edge binding for `reson8.datanest.life`; until that exists, the current live DataNest application continues to be served by GitHub Pages.

## Machine-readable binding

The current live contract is:

`https://datanest-supository.github.io/DataNest/.well-known/reson8-app.json`

The contract publishes the canonical name and branded URL separately from the operational delivery URL. This prevents a hosting-provider record from becoming identity authority.

## Delivery

```text
reson8.datanest.life
  canonical branded identity
      ↓
DNS / edge binding
      ↓
DataNest application-layer redirect
      ↓
https://reson8.life/
```

The redirect guard is exact-host scoped, so the normal GitHub Pages DataNest application remains operational at its existing URL.

Railway is not required.

## Backup host

Dropbox `/DataNest-AI-Backups` remains the governed artifact-recovery host. Local PCs are not backup hosts or continuity authorities.

## Reson8 Hub registry

The Reson8 Hub should keep DataNest non-billable. Until `reson8.datanest.life` is actually bound and verified, the Hub CTA should continue to use:

`https://datanest-supository.github.io/DataNest/`

After the branded hostname is verified, the CTA may switch to:

`https://reson8.datanest.life/`

Hub-side tracking item:

`resonance36912-cell/resonance-hub#136`
