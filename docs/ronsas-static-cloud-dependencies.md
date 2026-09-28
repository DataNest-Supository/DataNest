# Static RONSAS cloud capability gate

Serving a static bundle from DataNest verifies its entry and assets. It does not prove that every workflow executes in the cloud. The Products view therefore calls static launches **previews** until each app passes cloud workflow acceptance.

| App | DataNest bundle | Known local dependency requiring cloud replacement or explicit disabling |
| --- | --- | --- |
| Career Compass | Built | No loopback workflow found in current source audit; functional cloud acceptance still pending. |
| Creative Studio | Built | Source brief calls `127.0.0.1:7867` in `src/pages/Studio.tsx`. |
| ePublisher | Built | Image generation, rewrite, translation, and local video paths call loopback services; `AppHeader` also contains `192.168.1.50` links. |
| LyricSync Studio | Built | No loopback workflow found in current source audit; functional cloud acceptance still pending. |
| Scene Song Spark | Built | No loopback workflow found in current source audit; functional cloud acceptance still pending. |
| SovereignForge | Built | No loopback workflow found in current source audit; functional cloud acceptance still pending. |
| SyncVision | Built | MuseTalk, speech transcription, and Hub routes call `127.0.0.1` in `sovereign-local.ts`, `UploadStep.tsx`, and Hub integration. |

The readiness flag for a static app must be set only after its primary workflow passes from a client without any service on Ealiophin or the visitor's machine. Broken or machine-bound features should display a clear unavailable state until migrated. The static Pages check covers HTML and referenced assets; it is not this workflow gate.
