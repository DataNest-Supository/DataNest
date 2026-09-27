# DataNest RONSAS Control Plane

This directory is the active source authority for launching and inspecting RONSAS applications that have been consolidated into `DataNest-Supository/DataNest`.

## Authority

- Application source is read only from `apps/ronsas/*` in this repository.
- Runtime state and logs are written outside Git under `%LOCALAPPDATA%\Resonance\DataNest-RONSAS` by default.
- Historical RONSAS/Open Nova repositories remain evidence and recovery sources only; they are not runtime authority.
- The current commercial state is free promotion. This control plane does not activate pricing or paid checkout behavior.

## Commands

From the DataNest repository root on Ealiophin:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\ronsas\ealiophin\START-RONSAS-DATANEST.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\ronsas\ealiophin\STATUS-RONSAS-DATANEST.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\ronsas\ealiophin\STOP-RONSAS-DATANEST.ps1
```

The start command installs dependencies only when an app has no `node_modules` directory, builds each imported web app, starts its preview server on the governed loopback port, waits for health, and records only processes it owns.

Use `-RefreshDependencies` to force a clean dependency refresh or `-SkipBuild` only when a previously validated build is intentionally being reused.

## Modules

The registry currently launches ePublisher, Creative Studio, SyncVision, and YouTube Optimizer directly from their DataNest paths. Sovereign Backend source is also in DataNest, but its containers and secrets remain machine-local and are therefore reported as an optional backend service rather than being started implicitly.

Career Compass, SovereignForge, LyricSync Studio, and Scene Song Spark remain explicit source-recovery items until complete source is located. Logos or test fixtures are not treated as application source.

## Migration provenance

The operational model was recovered from historical RONSAS branch `ronsas/resonance-appdev-integration-20260924` at commit `058e5a347be0dd5313c7e53fb3611653d26494ac`. Legacy absolute paths and standalone repository authority were intentionally not carried forward.
