# RONSAS application consolidation into DataNest

Authoritative repository: `DataNest-Supository/DataNest`.

RONSAS is a DataNest Product. All RONSAS application source, runtime configuration, tests, CI/security gates, and release controls must ultimately live and run from this repository. Historical repositories are migration sources only and must not remain operational authorities after their application is absorbed.

## Migration map

| Application / component | Historical source | DataNest target | Status |
| --- | --- | --- | --- |
| Sovereign backend | `resonance36912-cell/rons-sovereign-backend-source` | `apps/ronsas/sovereign-backend` | Imported: 48 files |
| ePublisher | `resonance36912-cell/rons-epublisher-sovereign-source` | `apps/ronsas/epublisher` | Imported from `2c10a27b4311e89ff3ea6cc4384aa05a15a1b621`; source tree `0eedd2378e3055e40e7a1bc54ee56953fae71993` |
| Creative Studio | `resonance36912-cell/rons-creative-studio-sovereign-source` | `apps/ronsas/creative-studio` | Imported from `c7e0ac7ab341369ed26483eac3df4e83c1de6b6d`; exact source tree `17bc265d00ddd7413046a1f8c567925fa7ba9e21` (297 blobs) |
| SyncVision | `resonance36912-cell/rons-sync-vision-sovereign-source` | `apps/ronsas/syncvision` | Structurally imported from `e224152bee53fb2a07837fe4838f59dd8e679d43` (501 files); **migration gate remains open** because four large binary assets are currently zero-byte placeholders |
| YouTube Optimizer | `resonance36912-cell/rons-youtube-optimizer-sovereign-source` | `apps/ronsas/youtube-optimizer` | Imported: 236 files |
| Career Compass | Historical executable source unavailable | `apps/ronsas/career-compass` | Reconstructed as DataNest-native application; validation pending |
| SovereignForge | Historical executable source unavailable | `apps/ronsas/sovereign-forge` | Reconstructed as DataNest-native application; validation pending |
| LyricSync Studio | Historical executable source unavailable | `apps/ronsas/lyricsync-studio` | Reconstructed as DataNest-native application; validation pending |
| Scene Song Spark | Historical executable source unavailable | `apps/ronsas/scene-song-spark` | Reconstructed as DataNest-native application; validation pending |
| RONS Control Center / Open Nova operations | Historical RONSAS control-plane sources | `ops/ronsas/ealiophin` plus app-local runtime source | Reconciled into DataNest-native start/status/stop, supervisor, and optional SyncVision MuseTalk controls |

## SyncVision integrity gate

The following canonical source assets must be restored exactly before SyncVision can be certified from DataNest:

- `public/ffmpeg-core/ffmpeg-core.wasm` — 32,129,114 bytes
- `public/og-v2.png` — 1,746,155 bytes
- `public/og-v3.png` — 1,620,052 bytes
- `src/assets/resonance-app-dev-logo.png` — 1,833,523 bytes

The DataNest CI import-contract gate checks these exact sizes so the placeholder state cannot be merged silently.

### Recovery attempts completed

- Direct GitHub connector transfer is not binary-safe for these four private blobs: file reads return empty content or UTF-8 decoding errors.
- The public SyncVision deployment did not expose exact copies at the tested canonical asset paths.
- The connected Dropbox RONS audit mirror contains SyncVision source bundles/codebooks and historical local-app snapshots, but those packages omit the four canonical binary payloads.
- Public `@ffmpeg/core` 0.12.x packages were scanned by exact Git blob identity. None matched the canonical customized `ffmpeg-core.js` blob `3d61450a0dc22df37bcf7fda591b7fd3214a8223`, so no public-package WASM was accepted.
- The Ealiophin self-hosted runner remained unassigned during recovery attempts. The integrity gate therefore stays closed rather than substituting non-canonical bytes.


## DataNest-native control plane

Active RONSAS operational authority now lives under `ops/ronsas/ealiophin` and reads application source only from this repository.

- `RONSAS-MODULES.json` declares DataNest as the single repository authority and preserves `free-promotion` / `paidCheckoutActive: false`.
- `START-RONSAS-DATANEST.ps1`, `STATUS-RONSAS-DATANEST.ps1`, and `STOP-RONSAS-DATANEST.ps1` govern the local suite and track only DataNest-owned process state.
- `RONSAS-SUPERVISOR.ps1` performs bounded recovery for required modules without Open Nova paths, Desktop Commander, or the historical standalone repository.
- SyncVision's recovered MuseTalk 1.5 bridge now lives at `apps/ronsas/syncvision/runtime/musetalk/musetalk_bridge.py` and is registered as an optional localhost-only service at `127.0.0.1:7863` because its model/Python/FFmpeg assets remain machine-local.
- ePublisher already contains the recovered local STT server byte-for-byte inside its DataNest source, so no duplicate external STT runtime is required.

Historical runner-recovery scripts were not copied wholesale because they are hard-bound to `resonance36912-cell/RONSAS`, old runner identities, and old local paths. They remain evidence only until a DataNest-scoped runner-management design is implemented.

## Source-recovery conclusion

Connected GitHub repositories, RONSAS branches/commit history, and the Dropbox RONS audit mirror were searched for the four unresolved applications. No executable source was found. They have therefore been reconstructed as **new DataNest-native development**, not mislabeled as recovered source. Career Compass provides a local 30/60/90-day career-planning workflow; SovereignForge generates governed DataNest project manifests; LyricSync Studio produces deterministic LRC timing; Scene Song Spark creates timed scene sequences. All four are self-contained, billing-free, and governed by the same DataNest control plane.

## Reconstructed DataNest-native applications

The following applications are new DataNest development because their historical executable source could not be recovered:

- `apps/ronsas/career-compass` — Career Compass, port 3501
- `apps/ronsas/sovereign-forge` — SovereignForge, port 3601
- `apps/ronsas/lyricsync-studio` — LyricSync Studio, port 3701
- `apps/ronsas/scene-song-spark` — Scene Song Spark, port 3801

Each package contains local logic, tests, a deterministic build, and a DataNest-controlled preview server. They are registered as required web applications in `ops/ronsas/ealiophin/RONSAS-MODULES.json`.

## DataNest application validation

The permanent root workflow `.github/workflows/ronsas-app-validation.yml` validates each imported executable component from its DataNest path. Initial run `36353945388` passed all five jobs:

- ePublisher — `npm ci`, tests, type build, production build: **pass**
- Creative Studio — `npm ci`, tests, production build: **pass**
- SyncVision — `npm ci`, TypeScript checks, tests, production build: **pass**
- YouTube Optimizer — frozen Bun install, type-check, tests, production build: **pass**
- Sovereign Backend — Python 3.12 dependency install/check and pytest: **pass**

This proves the imported application source is executable from DataNest. SyncVision remains uncertified only because the independent binary-integrity contract correctly rejects its four zero-byte canonical-asset placeholders.

## Validation boundaries

- Root DataNest TypeScript validation covers the root Next.js application and excludes standalone packages under `apps/ronsas`.
- RONSAS imports have their own integrity gate and must additionally build/test from their DataNest paths before historical sources are retired.
- Imported historical source may contain old pricing/checkout implementation, but it must not become active while the free-promotion directive remains in force.

## Rules

1. DataNest is the sole active source authority after migration.
2. Do not use Git submodules or runtime dependencies on the historical RONSAS repositories as a substitute for migration.
3. Preserve executable source, required assets, tests, migrations, runtime configuration, and still-valid operational controls.
4. Do not carry forward obsolete paid-checkout behavior while the free-promotion directive remains active.
5. Historical CI, diagnostics, runner-recovery branches, and duplicated deployment experiments are evidence only unless still required by the DataNest runtime.
6. Each imported application must build and test from its DataNest path before its historical repository is treated as retired.
7. External services may remain dependencies, but repository/source authority and release control must originate in DataNest.


### Reconstruction validation pending

PR validation is extended to Career Compass, SovereignForge, LyricSync Studio, and Scene Song Spark. Their status becomes certified only after the new DataNest PR workflow run passes.
