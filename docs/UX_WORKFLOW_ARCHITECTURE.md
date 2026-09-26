# Resonance DataNest UX Workflow Architecture

Updated: 2026-09-26

## Goal

Reduce cognitive load across DataNest without removing specialist workspaces or breaking existing deep links. DataNest AI remains the primary intelligence surface while the rest of the platform follows a visible operating lifecycle.

## Information architecture

### Core
- AI & I — project orientation and current operating signal.
- DataNest AI — governed intelligence core and primary AI collaboration surface.

### Discover
- Stakeholder — capture stakeholder context.
- Sparks — capture intent and raw ideas.
- Think Tanks — expand and structure research.

### Govern & Build
- Governance — apply policy and accountability controls.
- Products — inspect governed product architecture and evidence.
- Product Lab — validate product surfaces before release.

### Execute
- UNIFI Planner — turn intent into complete Job Manifests.
- TranScheduler — route work through capability-aware execution.
- Runs — observe execution history and outcomes.

### Verify
- Checkpoints — resume durable work states.
- Audit — inspect traceable operational events.
- Transparency — review published evidence, methodology, and findings.

### System
- Settings — administration, policies, tools, and project configuration.

## Primary user journey

Discover → Govern → Build → Execute → Verify

DataNest AI is cross-cutting rather than a single step. It is visually privileged in navigation and remains accessible from the global shell and AI companion controls.

## Shell behavior

- Existing ?view= deep links remain compatible.
- Navigation groups automatically expand for the active workspace.
- Core remains open so AI & I and DataNest AI are always one click away.
- The page header shows the current lifecycle group.
- Every eligible workspace ends with a workflow-continuity control that offers the previous and suggested next workspace.
- View changes receive a short entrance transition; reduced-motion preferences disable it.
- The command palette continues to index all workspaces using the new lifecycle groups.

## Home behavior

The AI & I home now exposes the five-stage lifecycle:
1. Discover
2. Govern
3. Build
4. Execute
5. Verify

The hero action continues to prioritize DataNest AI.

## UX principles

1. Orientation before options — users see their current phase before secondary controls.
2. AI as a persistent collaborator — DataNest AI is emphasized, not buried under Research.
3. Progressive disclosure — specialist workspaces remain grouped and collapsible.
4. Continuity — each page provides a clear suggested next move without forcing a linear flow.
5. Preserve power-user speed — Ctrl/Cmd + K and direct URL routing remain intact.
6. Respect accessibility — semantic navigation, focus-visible states, and reduced-motion behavior are retained.


## State-aware continuation

The deterministic lifecycle remains the fallback, but the shell can override the next-step recommendation when already-loaded project state provides a stronger operational signal.

- Blocked Jobs route attention toward TranScheduler.
- Running Jobs route attention toward Runs.
- An empty project routes intent through DataNest AI and then UNIFI planning.
- A scheduler with blocked work and no running Jobs can route back to UNIFI for manifest or capability adjustment.
- Missing run or checkpoint evidence can route users back to the workspace that must produce it.

Adaptive recommendations are labeled `STATE-AWARE`; ordinary sequence guidance is labeled `LIFECYCLE`. The rule set is intentionally narrow so recommendations remain explainable and do not replace human judgment.


## Actionable empty states

Operational empty states are treated as workflow junctions rather than blank screens.

- An empty TranScheduler links directly to UNIFI; an empty filter can reset to all Jobs.
- Runs links back to TranScheduler when nothing has been dispatched.
- Checkpoints links back to Runs when no resumable evidence exists.
- Audit links back to Checkpoints when no immutable events are present.

These controls do not create or mutate operational records. They only move the user to the prerequisite workspace that can produce the missing state or evidence.


## Persistent phase orientation

The five lifecycle phases use one shared definition across the AI & I PurposeJourney and specialist workspace shell:

`Discover → Govern → Build → Execute → Verify`

Specialist workspaces show a compact lifecycle phase rail below the workspace breadcrumb. The active phase is highlighted without implying that earlier phases are completed, and users can jump directly to another phase's representative workspace. DataNest AI remains separate from the linear sequence as a cross-phase intelligence core.

Phase mapping:
- Discover: Stakeholder, Sparks, Think Tanks
- Govern: Governance
- Build: Products, Product Lab
- Execute: UNIFI Planner, TranScheduler, Runs
- Verify: Checkpoints, Audit, Transparency

The rail may scroll on compact tablet widths, but at phone width it collapses into a five-column phase grid with AI Core on its own row so every control remains physically inside the viewport.
