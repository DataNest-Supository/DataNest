# Owner Live Test Mode — AI Timeframe Proposal Model

## Purpose

DataNest AI proposes a bounded live evidence-gathering window for Owner Test Mode based on:

- task complexity;
- reporting complexity;
- which human review domains are still pending;
- coordination overhead between multiple reviewers; and
- realistic planning assumptions for human response latency.

The proposal is advisory but auditable. The Owner may accept the recommendation or explicitly override it within the hard 30-minute to 72-hour safety window.

## Planning assumptions

These are operational planning heuristics, not promises or service-level agreements:

| Review domain | Typical planning response | Planning range |
| --- | ---: | ---: |
| Governance-impact review | 12 hours | 8–24 hours |
| Legal review | 24 hours | 12–48 hours |
| External / independent review | 24 hours | 12–48 hours |

The model assumes reviewers may work in parallel. It uses the slowest pending review baseline, then adds coordination overhead when multiple review domains remain.

## Complexity contributions

Task complexity:

- routine: +2 hours
- standard: +6 hours
- complex: +12 hours
- cross-system: +18 hours

Reporting complexity:

- summary: +2 hours
- standard: +4 hours
- detailed: +8 hours
- audit-grade: +12 hours

Coordination overhead:

- +6 hours for each pending review domain beyond the first.

The raw estimate is rounded upward into one of these governed windows:

- 6h
- 12h
- 24h
- 36h
- 48h
- 60h
- 72h

No AI proposal can exceed the existing 72-hour Owner Test Mode maximum.

## Current governance case

A cross-system, audit-grade release with governance, legal, and external review all pending produces:

- human response baseline: 24h
- coordination overhead: 12h
- task complexity: 18h
- reporting complexity: 12h
- raw estimate: 66h
- governed recommendation: **72h**

## Evidence and calibration

Every Owner Test Mode release records:

- model version;
- complexity inputs;
- pending review domains;
- human response assumptions;
- raw and recommended duration;
- accepted duration;
- whether the Owner overrode the recommendation;
- the override delta.

As real review timestamps accumulate, these planning assumptions should be recalibrated from observed repository-specific response times. Until sufficient evidence exists, the defaults above remain conservative planning heuristics rather than empirical claims.
