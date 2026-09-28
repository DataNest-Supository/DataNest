# YouTube Optimizer cloud dependency inventory

This is the dependency boundary for the imported TanStack Start application. It is **not** a release acceptance record. The app remains unavailable in the Products launch contract until auth, data, workflows, and same-origin delivery pass their separate gates.

| Entry point | Current action | Required cloud capability | Release prerequisite |
| --- | --- | --- | --- |
| `/api/rons/auth/$action` | Session/user lookup, sign-in, sign-up, sign-out; `rons_sovereign_session` HttpOnly cookie | `auth` | Replace legacy gateway protocol with DataNest Supabase Auth, verify expiry/revocation, scope cookie to the canonical app route. |
| `/api/rons/db` | Select/insert using the client `QueryBuilder` | `data` | Server-verified user/project context, table/column/operation allowlist, RLS, row count and rollback evidence. The current proxy requires a cookie and forwards it, but the old query protocol is not approved as cloud authorization. |
| `auditChannel`, `analyzeEpisode` server functions | YouTube API metadata and AI summary | `ai`, YouTube API | Authenticate request, record provider usage and attributed result, return typed unavailable states. |
| `generateThumbnail`, `editThumbnail` server functions | Image generation/edit | `ai`, `storage` | Governed provider credentials, upload authorization, budget and human approval gates. |
| SSR and static assets | TanStack Start server render | server runtime | Same-origin gateway `/apps/youtube-optimizer/`, nested refresh, cookies and release SHA. |

The browser query client currently reads `profiles`, `user_roles`, `page_views`, `feature_usage`, and `audit_logs`; it inserts into `page_views` and `feature_usage`. The query envelope includes `table`, `action`, `columns`, `values`, `filters`, and `options`. These names are **inventory**, not a data migration allowlist. Project identity and privileged role must come from the verified session and governed membership, never from this envelope. Existing rows require mapping and count reconciliation before production writes.

`DATANEST_CLOUD_GATEWAY_URL` is an explicit HTTPS origin or HTTP private-service DNS ending in `.internal` or `.svc.cluster.local`. `DATANEST_CLOUD_AI_URL` and `DATANEST_CLOUD_STORAGE_URL` are independent optional capabilities with the same URL rule. Missing or invalid settings yield unavailable capabilities and HTTP 503 from the affected proxy. There is no implicit loopback or Ealiophin fallback. Credentials belong on the server only.

Remaining gate: the legacy upstream protocol has not been replaced by Supabase session verification and project RLS. Until that gate and a real optimization are verified, keep the public launch unavailable.
