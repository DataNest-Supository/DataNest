# DataNest-only RONSAS application runtime

**Date:** 2026-09-28
**Repository:** DataNest-Supository/DataNest
**Status:** Conversational direction approved; written specification awaiting review
**Scope:** Public RONSAS application launches and their execution, including YouTube Optimizer, Resonance AppDev, and RONS Control Center

## 1. Decision and intended outcome

Every RONSAS application must launch from, be released by, and execute through DataNest-managed cloud services sourced from this repository. No production app, backend, AI bridge, scheduler, or control action may depend on Ealiophin or another personal computer. Users should open the DataNest Products > RONSAS entry, choose an application, and stay on a canonical DataNest site for the application and its authenticated workflow.

This supersedes the Ealiophin runtime assumption in `ops/ronsas/ealiophin` for production. Those files become historical recovery evidence, not a production launch path. It also supersedes the assumption that GitHub Pages can remain the sole production delivery target. GitHub Pages serves static assets and cannot execute the YouTube Optimizer server routes. Existing working Pages links remain available until a verified cutover, but they are not proof that server-backed features work.

DataNest remains the platform and source/release authority; RONSAS remains a governed product. Supabase remains the platform authentication, database, storage, and backend-function authority unless a specific migration is approved separately. Hosting is replaceable infrastructure. Free promotion and `billing_enabled=false` remain in force.

## 2. Canonical delivery topology

The canonical production origin will be a DataNest-controlled hostname on a server-capable delivery target. The exact hostname is selected and verified during rollout; the existing `datanest-supository.github.io/DataNest` address cannot itself serve dynamic backend routes. The new origin owns `/products/ronsas` or an equivalent deep link and same-origin `/apps/<slug>/` launch paths.

A DataNest web gateway serves the Next.js platform shell and the seven current static app bundles under their existing slugs. It routes `/apps/youtube-optimizer/*` to a separately deployed YouTube Optimizer server built from `apps/ronsas/youtube-optimizer`. The routing must preserve its assets, API paths, nested navigation, cookies, and SSR responses without exposing the private service origin to clients. An explicit integration test must cover a direct page load and browser refresh on a nested route. The server can be deployed as a separate service from the same repository; it is still a DataNest release, not a standalone repository authority.

DataNest-managed private backend services provide the YouTube operations currently coupled to `127.0.0.1:58600`: authentication/session exchange, governed data access, AI, and any required storage. The implementation should prefer existing DataNest/Supabase capabilities and migrate product data under project-scoped access controls. A temporary compatibility adapter is permissible only inside the private cloud network, with a dated retirement criterion, no public service-role exposure, and no loopback fallback. A missing dependency produces a bounded unavailable state; it must never silently call Ealiophin or present a false success.

Delivery topology, paths, and asset bases are configuration contracts validated in CI. Provider-specific domains, credentials, database URLs, and signing keys stay in secret stores, never in browser bundles or Git. The hosting provider may be Railway or another server-capable target after validating build, networking, persistence, health, rollback, and cost. Provider selection does not change DataNest authority.

## 3. Application identity and launch behavior

The RONSAS registry distinguishes a deployable web app, a native DataNest workspace, and an operations surface. A clickable launch is shown only when the target is an actual implemented route. The registry and deployment manifest share the same slug, type, canonical path, source path, and health contract. CI fails if a marketed launch has no built route or if a deployed route has no registry entry.

- Career Compass, Creative Studio, ePublisher, LyricSync Studio, Scene Song Spark, SovereignForge, and SyncVision retain their DataNest app paths. Their interactive workflows must be tested against their actual backend dependencies, not just HTML and asset HTTP 200. Hard-coded external or machine-local hub links are audited and either changed to DataNest paths or clearly marked as external references.
- YouTube Optimizer gains `/apps/youtube-optimizer/` only after SSR, nested routes, auth, API handlers, and one representative optimization workflow pass against cloud dependencies. Until then the product record shows a truthful unavailable state rather than an off-site or localhost launch.
- Resonance AppDev / Reson8 ADT opens the existing DataNest development workflow (DataNest AI, Product Lab, UNIFI, TranScheduler, and evidence) through a stable internal deep link. It is labeled a native workspace, not presented as a separate executable that does not exist.
- RONS Control Center becomes a DataNest operations surface for deployment status, app health, release evidence, and governed actions. The initial release is read-only. Restart, rollback, or other mutations are added only when the existing DataNest authority chain and exact-action approval can be enforced against provider APIs. It does not execute Ealiophin scripts or browser-to-localhost calls.

Historical portfolio classification remains provenance; a launch link does not assert product ownership or alter lifecycle classification.

## 4. Identity, data, and execution boundaries

DataNest authentication and project membership govern entry to private workspaces. App sessions must use secure, HttpOnly, SameSite cookies or an equivalent server-verified session mechanism at the canonical origin. Service-role and other privileged keys are server-only. YouTube data access must enforce the correct user/project authorization and RLS where exposed through Supabase. No client-controlled metadata or unvalidated ID may grant a privileged role.

Provider calls, generation jobs, and operations mutations pass through the existing Trust & Data Policy, execution authority, provider budget, and human approval boundaries appropriate to their consequence. They record who acted, what was requested, result, cost/usage evidence, and relevant release version. An unhealthy backend, absent credential, or unknown capability fails closed for mutations while allowing a clear read-only status. The cloud-only requirement does not imply billing or autonomous spending.

No personal machine endpoint, Cloudflare tunnel to Ealiophin, `localhost`, RFC1918 address, desktop-control agent, or self-hosted runner is a production dependency. CI scans built artifacts and production configuration for forbidden endpoints, with explicit exclusions for documentation, tests, and local development tooling.

## 5. Migration stages and gates

1. **Inventory and contract:** enumerate every RONSAS app's routes, required APIs, storage, auth, AI, and current local/external links. Record a real workflow acceptance test per app. Freeze the canonical launch manifest and identify unsupported capabilities honestly.
2. **Cloud dependencies:** migrate YouTube's required backend/data functions from local assumptions to DataNest-managed private services and Supabase-backed policies. Migrate data with reconciliation, rollback, and access tests before enabling mutations. Remove all production loopback defaults.
3. **Unified delivery:** build the Next.js shell, seven static bundles, and YouTube server from one repository commit. Configure same-origin routing and stable app asset bases. Implement the native AppDev deep link and read-only Control Center view. Validate direct/deep links, browser refresh, auth transitions, API behavior, and error states.
4. **Release and cutover:** provision the final hostname, TLS, secrets, private network, health checks, observability, backups, and rollback. Deploy an isolated candidate, run browser and backend acceptance with no Ealiophin connectivity, then switch the canonical DataNest link. Keep the GitHub Pages site as a temporary compatibility entry and retire it only after old links and auth callbacks are handled.

Each stage has a separate reviewable PR and can stop safely before public cutover. Production changes are promoted only after CI, RONSAS validation, DataNest AI certification as applicable, security checks, end-to-end release verification, and an explicit deployment decision. A release manifest identifies the exact source commit for every service. Failures do not trigger a silent fallback to local or historical repositories.

## 6. Acceptance criteria

- From a clean browser, each advertised RONSAS launch opens the intended DataNest route and a representative user workflow completes against cloud services.
- YouTube Optimizer SSR, nested navigation/refresh, auth, and an actual optimization operation work without Ealiophin. Backend outage yields a clear error and no false completion.
- AppDev deep links into its native workflow; Control Center accurately reports deployed service health and cannot perform unauthorized machine or provider actions.
- With all personal computers powered off, the candidate remains operational and passes its smoke/acceptance suite.
- The final origin, asset paths, auth callbacks, cookies, CI release manifest, rollback path, and old-link compatibility are verified in the deployed environment.
- No paid checkout is activated, no product ownership is inferred from an app link, and no privileged key enters a browser asset.

## 7. Non-goals and open deployment selection

This design does not promise local GPU models, MuseTalk rendering, browser remote control, or other machine-bound capabilities in the first cloud release. Those capabilities require separately governed cloud resources before a UI may claim they are available. It does not enable pricing, payments, or a new authentication authority.

The exact canonical hostname and delivery provider are deployment choices made before stage 4. They must meet the same-origin routing and private-service requirements. The implementation plan must decompose the backend migration, unified delivery, and operations view into independently testable work; it must not treat an HTTP 200 app shell as complete functionality.
