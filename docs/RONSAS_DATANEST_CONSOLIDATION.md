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
| Career Compass | No canonical GitHub source repository located | `apps/ronsas/career-compass` | Source recovery required |
| SovereignForge | No canonical GitHub source repository located | `apps/ronsas/sovereign-forge` | Source recovery required |
| LyricSync Studio | No canonical GitHub source repository located | `apps/ronsas/lyricsync-studio` | Source recovery required |
| Scene Song Spark | No canonical GitHub source repository located | `apps/ronsas/scene-song-spark` | Source recovery required |
| RONS Control Center / Open Nova operations | Historical RONSAS control-plane sources | `apps/ronsas/control-center` and/or `ops/ronsas` | Reconciliation required |

## SyncVision integrity gate

The following canonical source assets must be restored exactly before SyncVision can be certified from DataNest:

- `public/ffmpeg-core/ffmpeg-core.wasm` — 32,129,114 bytes
- `public/og-v2.png` — 1,746,155 bytes
- `public/og-v3.png` — 1,620,052 bytes
- `src/assets/resonance-app-dev-logo.png` — 1,833,523 bytes

The DataNest CI import-contract gate checks these exact sizes so the placeholder state cannot be merged silently.

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
