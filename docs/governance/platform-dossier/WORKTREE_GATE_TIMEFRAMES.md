# DataNest AI Worktree Gate Timeframes

## Scope

Every active workflow gate in `.github/workflows` is covered by one shared DataNest AI timeframe policy.

The recommendation is an **operational planning window** for human response, review, reporting, and follow-up around a gate. It does not delay machine validation, weaken a gate, convert a failed check into a pass, or create an SLA.

## Shared human-response planning assumptions

| Review domain | Typical planning response | Planning range |
| --- | ---: | ---: |
| Owner/operator | 4h | 1–12h |
| Engineering/code review | 8h | 4–24h |
| Security review/triage | 12h | 8–24h |
| Visual/UX review | 8h | 4–24h |
| Governance-impact review | 12h | 8–24h |
| Legal review | 24h | 12–48h |
| External/independent review | 24h | 12–48h |
| Operations/deployment review | 8h | 4–24h |

These values are conservative planning heuristics, not empirical guarantees. Repository-specific observed response times should replace them as sufficient evidence accumulates.

## Complexity model

Task complexity contributes:

- routine: +2h
- standard: +6h
- complex: +12h
- cross-system: +18h

Reporting complexity contributes:

- summary: +2h
- standard: +4h
- detailed: +8h
- audit-grade: +12h

Multiple human-review domains add +6h coordination overhead for each domain beyond the first.

Change scope may escalate task complexity:

- 0–3 changed files: no automatic escalation
- 4–10: at least standard
- 11–30: at least complex
- 31+: cross-system

Recommendations round upward into governed windows of 6h, 12h, 24h, 36h, 48h, 60h, or 72h.

## Gate coverage

| Workflow gate | Baseline profile | Human review domains | Default proposal |
| --- | --- | --- | ---: |
| Branch Cleaner | standard / detailed | Owner/operator | 24h |
| CI | complex / standard | Engineering | 24h |
| DataNest AI Certification | cross-system / audit-grade | Engineering + Governance | 48h |
| DataNest File Worker Deploy | complex / detailed | Operations + Security | 48h |
| Edge Function Validation | standard / detailed | Engineering + Security | 36h |
| Migration Replay Validation | complex / detailed | Engineering + Operations | 36h |
| Pages Production | cross-system / audit-grade | Governance + Legal + External | 72h |
| PR Verification | complex / detailed | Engineering + Visual | 36h |
| RONSAS Application Validation | cross-system / detailed | Engineering + Visual | 48h |
| Security Scan | complex / audit-grade | Security | 36h |
| Owner Test Mode Expiry | routine / summary | Owner/operator | 12h |
| UI Test Mode | cross-system / audit-grade | Visual + Governance | 48h |
| Workflow Reviewer & Code Cleaner | standard / detailed | Engineering + Operations | 36h |

## Evidence behavior

Every gate run emits a `worktree-gate-timeframe-<gate>-<run>` artifact containing:

- workflow/gate identity;
- actual changed-file count when available;
- effective task complexity;
- reporting complexity;
- review domains and response assumptions;
- task/reporting/coordination contributions;
- raw estimate;
- governed recommendation;
- accepted override when supplied;
- override delta;
- model/schema version and generation time.

The Pages Owner Live Test Mode retains its stricter production-specific authorization and expiry controls in addition to this shared worktree policy.
