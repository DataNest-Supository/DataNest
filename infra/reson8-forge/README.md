# Reson8 Forge

Reson8 Forge is the self-hosted Git foundation for Reson8 and DataNest.

## Public identity

- Git forge: **https://git.reson8.life**
- Main site: **https://reson8.life**
- DataNest: **https://datanest.reson8.life**
- Apps: **https://apps.reson8.life**
- Future project/user spaces: **https://<name>.reson8.life**

GitHub remains an optional mirror/bootstrap remote, not the public identity.

## Stack

- Forgejo 15 LTS
- PostgreSQL 16
- Caddy for HTTPS and reverse proxy
- Persistent Docker volumes
- Optional Dropbox off-site backup via rclone
- Forgejo Packages enabled
- Forgejo Actions enabled; runner provisioning is a separate hardening step

## Start on any Docker host

1. Point DNS for `git.reson8.life` to the host.
2. Copy `.env.example` to `.env`.
3. Replace `POSTGRES_PASSWORD` with a long random secret.
4. Start:

   ```sh
   docker compose up -d
   ```

5. Visit `https://git.reson8.life` and complete the first administrator setup.

Caddy obtains and renews TLS automatically when the hostname resolves publicly to the host and ports 80/443 are reachable.

## Git migration

After the Forge is live, mirror an existing repository:

```sh
git clone --mirror https://github.com/DataNest-Supository/DataNest.git
cd DataNest.git
git remote set-url --push origin https://git.reson8.life/DataNest/DataNest.git
git push --mirror
```

Then keep GitHub as an optional secondary remote rather than the canonical host.

## Registry

Forgejo's OCI/container registry can use the same hostname:

```text
git.reson8.life/<owner>/<image>:<tag>
```

A separate `registry.reson8.life` gateway can be added later without changing repository URLs.

## Backups

Run:

```sh
./scripts/backup.sh
```

The script captures PostgreSQL plus the complete Forgejo `/data` tree. If `DROPBOX_REMOTE` is configured with rclone, it also copies each timestamped backup to Dropbox.

## Railway status

The current connected Railway account is at its free-plan provisioning limit, so no existing active service has been overwritten or deleted. This stack is intentionally provider-neutral so it can be deployed unchanged on another Docker host, or adapted to Railway when capacity becomes available.

## Next infrastructure phase

1. Deploy the core Forge.
2. Attach `git.reson8.life`.
3. Create the initial Reson8 administrator.
4. Mirror DataNest into the Forge.
5. Add a hardened Forgejo Actions runner.
6. Add wildcard project publishing for `*.reson8.life`.
