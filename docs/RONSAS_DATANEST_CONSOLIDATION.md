# RONSAS application consolidation into DataNest

Authoritative repository: `DataNest-Supository/DataNest`.

RONSAS is a DataNest Product. All RONSAS application source, runtime configuration, tests, CI/security gates, and release controls must ultimately live and run from this repository. Historical repositories are migration sources only and must not remain operational authorities after their application is absorbed.

## Migration map

| Application / component | Historical source | DataNest target | Status |
| --- | --- | --- | --- |
| Sovereign backend | `resonance36912-cell/rons-sovereign-backend-source` | `apps/ronsas/sovereign-backend` | Imported: 48 files |
| ePublisher | `resonance36912-cell/rons-epublisher-sovereign-source` | `apps/ronsas/epublisher` | Pending import |
| Creative Studio | `resonance36912-cell/rons-creative-studio-sovereign-source` | `apps/ronsas/creative-studio` | Pending import |
| SyncVision | `resonance36912-cell/rons-sync-vision-sovereign-source` | `apps/ronsas/syncvision` | Pending import |
| YouTube Optimizer | `resonance36912-cell/rons-youtube-optimizer-sovereign-source` | `apps/ronsas/youtube-optimizer` | Imported: 236 files |
| Career Compass | No canonical GitHub source repository located | `apps/ronsas/career-compass` | Source recovery required |
| SovereignForge | No canonical GitHub source repository located | `apps/ronsas/sovereign-forge` | Source recovery required |
| LyricSync Studio | No canonical GitHub source repository located | `apps/ronsas/lyricsync-studio` | Source recovery required |
| Scene Song Spark | No canonical GitHub source repository located | `apps/ronsas/scene-song-spark` | Source recovery required |
| RONS Control Center / Open Nova operations | Historical RONSAS control-plane sources | `apps/ronsas/control-center` and/or `ops/ronsas` | Reconciliation required |

## Rules

1. DataNest is the sole active source authority after migration.
2. Do not use Git submodules or runtime dependencies on the historical RONSAS repositories as a substitute for migration.
3. Preserve executable source, required assets, tests, migrations, runtime configuration, and still-valid operational controls.
4. Do not carry forward obsolete paid-checkout behavior while the free-promotion directive remains active.
5. Historical CI, diagnostics, runner-recovery branches, and duplicated deployment experiments are evidence only unless still required by the DataNest runtime.
6. Each imported application must build and test from its DataNest path before its historical repository is treated as retired.
7. External services may remain dependencies, but repository/source authority and release control must originate in DataNest.
