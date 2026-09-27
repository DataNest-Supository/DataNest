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
- Sparks — earned contribution utility for approved project services.
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


## Active work context handoff

Selecting a Job inside DataNest AI establishes a browser-local active work context for the current project and user.

The context carries:
- Job identifier and display number
- Job title and status
- Linked DataNest AI session state

The context persists in `sessionStorage`, so it survives workspace navigation and page reloads but is not treated as governed project state. Specialist workspaces surface it in a compact Active Work Context strip with actions to return to DataNest AI, open TranScheduler, or clear the local context.

When users return to DataNest AI, the handed-off Job is preferred over the first accessible Job in the list. Unmounting the AI workspace no longer clears the context; project/user changes and explicit clearing remain the boundaries.

This layer is navigation state only. It does not change Job status, create runs, alter checkpoints, or write audit records.


## Context-focused operational evidence

Active Work Context provides focus inside operational and evidence workspaces without filtering the project record.

When the active Job is present on the current page:
- TranScheduler highlights its queue row and Gantt row.
- Runs highlights execution records belonging to that Job.
- Checkpoints highlights resumable evidence belonging to that Job.
- Audit highlights immutable events belonging to that Job.

Matching records expose an accessible active-context marker and a restrained visual treatment. Non-matching Jobs, runs, checkpoints, and events remain visible and retain their existing order.

This is deliberately a focus layer, not a data filter. A local browser context must never hide project evidence or change scheduling/audit semantics.


## Active-context continuation actions

The Active Work Context strip is actionable, not only descriptive. Its primary action changes with the current workspace while remaining navigation-only:

- Product Lab → Plan active Job in UNIFI
- UNIFI → Schedule active Job
- TranScheduler → Review active Job runs
- Runs → Open active Job checkpoints
- Checkpoints → Trace active Job audit
- Audit → Review transparency evidence
- Other specialist workspaces → Return active Job to DataNest AI

The strip also keeps a secondary Return to DataNest AI action whenever the primary action leads elsewhere.

These actions do not mutate Job state, create execution records, or write governance evidence. They only preserve orientation and reduce navigation search cost around the already-selected Job.


## Page-scoped evidence confidence

Active Work Context shows a small evidence-confidence signal derived only from records currently loaded in the workspace.

Examples:
- UNIFI / TranScheduler: matching Job record visible on this page
- Runs: matching run records visible on this page
- Checkpoints: matching checkpoint records visible on this page
- Audit: matching audit events visible on this page

The signal deliberately uses language such as `On this page` and `not visible`. It does not claim that a Job is complete, verified, absent from the project, or ready for promotion. Pagination and unloaded data remain outside the signal's authority.

This is an orientation aid, not governed state. It performs no writes and must not be used as a substitute for authoritative completion, audit, or governance decisions.


## DataNest AI task-guide action

The DataNest AI START HERE guidance includes a direct **Select Job Manifest** action.

- When an accessible Job selector exists, the action scrolls and focuses that governed Job control.
- Reduced-motion preferences use immediate scrolling rather than smooth animation.
- When no Job selector exists, the action routes to UNIFI Planner so the user can create the missing Job Manifest instead of encountering a dead control.

The action changes navigation/focus only. It does not select a Job automatically, create a Job, or mutate governed state.

## Governance membership invite lifecycle

Governance membership controls are state-aware so invite actions match the project record already visible to the user.

- Entering an email that already belongs to an active project member disables duplicate invitation delivery and explains the existing role.
- Entering an email with a pending invitation changes the primary action to **Resend project invite** and preserves the pending invite's governed role.
- Pending invitation rows expose explicit Resend and Revoke actions while historical rows remain read-only.
- Member and invitation identifiers use compact display forms, while the complete identifier remains available as metadata.
- At mobile widths, membership rows become labeled, self-contained cards rather than forcing horizontal scrolling.

These controls do not change governance eligibility. Formal voting still requires the authenticated account to accept project access and hold active membership.



## Active Job journey rail

Active Work Context includes a compact Job-specific journey rail:

`Plan → Schedule → Run → Checkpoint → Audit`

This rail is intentionally separate from the platform lifecycle rail. The platform rail answers where the user is in DataNest's broader Discover → Govern → Build → Execute → Verify lifecycle; the Job journey rail answers which operational view of the currently selected Job is open.

Only the current Job view receives an active marker. Earlier steps are not marked complete, passed, verified, or done. The rail does not infer progress from Job status, run status, checkpoints, audit events, authority decisions, or resource-capability state.

Every step is directly navigable while preserving the existing browser-local Active Work Context. Navigation performs no governed writes and does not change Job state.

At phone widths the five Job steps remain inside the viewport as an equal-width grid, with the location disclaimer retained: `Location only · not completion state`.


## Active-record anchoring

When Active Work Context has matching evidence loaded in the current workspace, the context strip exposes a **Jump to visible evidence** control.

The control scrolls to and keyboard-focuses the first rendered record marked as belonging to the active Job:
- UNIFI prepared Job Manifest
- TranScheduler queue or Gantt record
- Run record
- Checkpoint
- Audit event

Reduced-motion preferences disable smooth scrolling. If matching data is loaded but the current subview does not render the matching record, DataNest reports that limitation instead of pretending the jump succeeded.

This feature does not filter, reorder, mutate, or select governed records. It only anchors viewport and focus to evidence that is already rendered.
