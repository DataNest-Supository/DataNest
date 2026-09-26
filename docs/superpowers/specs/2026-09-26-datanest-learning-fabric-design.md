# DataNest Learning Fabric — Inter-Application Intelligence Design

**Date:** 2026-09-26  
**Repository:** `DataNest-Supository/DataNest`  
**Design branch:** `design/datanest-learning-fabric-20260926`  
**Base commit:** `1fac0ec1df466913b55ab70639b1b506a084fb65`  
**Design status:** Approved concept; implementation not yet authorized  
**Extends:** `docs/superpowers/specs/2026-09-24-datanest-ai-governed-memory-design.md`

## 1. Purpose

Turn DataNest from a set of adjacent application workspaces and AI features into a single governed learning fabric for the Resonance application ecosystem.

The system must let applications, users, AI companions, Jobs, artifacts, tests, deployments, and outcomes contribute traceable evidence without allowing raw or unverified observations to become reusable production knowledge.

This design preserves the current trust model:

1. raw human and AI evidence is staged first;
2. uncertified evidence may be used only within the authorized current Job/session;
3. cross-Job reusable learning requires governed certification;
4. production memory remains an explicit, versioned authority;
5. high-risk knowledge requires stronger authority than ordinary workflow learning;
6. legal/private product modes may be excluded from automatic learning;
7. GitHub remains source/release authority and Supabase remains application/control-plane data authority.

The new element is a common inter-application event and outcome contract so every approved Resonance application can both contribute to and consume DataNest intelligence.

## 2. Problem Statement

DataNest already contains strong governed subsystems:

- UNIFI Job Manifests and project context;
- TranScheduler capabilities, dependencies, reservations, runs, retries, and checkpoints;
- DataNest AI staged intake and trace-first chat;
- a dedicated persistent DataNest AI Staging Supabase project;
- trend extraction, learning candidates, validation, stress testing, certification, and production promotion;
- production `certified_memory`;
- Think Tank reviewed learning;
- product catalogs and specialist product modes;
- audit and Transparency evidence;
- a newer DataNest semantic-memory schema in staging.

However, these capabilities are not yet connected as one learning loop.

Observed baseline on 2026-09-26:

- staging contains 20,048 `ai_intake_events`;
- staging contains 56 `ai_trend_clusters`;
- staging contains 1,185 `ai_learning_candidates`;
- 1,183 candidates are rejected, 1 is certified, and 1 remains at intake;
- all current candidates are categorized as `workflow`;
- production `certified_memory` contains 0 rows;
- the newer `datanest_sources`, `datanest_events`, `datanest_artifacts`, `datanest_chunks`, `datanest_memories`, `datanest_patterns`, `datanest_relations`, `datanest_plasticity_events`, and `datanest_resonance_pulses` tables are provisioned in staging but contain no records.

This creates three practical problems:

1. evidence is collected at higher volume than reusable knowledge is promoted;
2. applications mostly share navigation and project identity rather than one learning contract;
3. multiple memory/learning structures risk becoming parallel authorities.

## 3. Design Goals

### 3.1 Primary goals

The implementation must:

- create one canonical event envelope for application, human, AI, execution, and outcome evidence;
- preserve Project, Job, application, trace, entity, artifact, and actor lineage;
- route learning-eligible evidence into the existing staging certification spine;
- distinguish raw evidence, provisional patterns, certified knowledge, and derived semantic relationships;
- let DataNest AI retrieve only relevant certified intelligence for the current task;
- let applications record acceptance, rejection, success, failure, supersession, and quality outcomes;
- support cross-application learning without leaking raw evidence between Jobs;
- consolidate Think Tank and DataNest AI learning into one promotion authority;
- activate the newer DataNest semantic tables as a derived intelligence graph, not as a competing truth source;
- keep high-risk categories owner-gated;
- preserve Legal Eagle's current `learning_eligible=false` default;
- preserve no-billing/free-promotion product invariants.

### 3.2 Non-goals

This design does not:

- train or fine-tune model weights automatically;
- make every application dependent on a specific hosted model provider;
- promote raw chat logs to production memory;
- allow a semantic pattern to bypass certification;
- merge staging runtime rows directly into production;
- replace GitHub with Supabase as source-control authority;
- replace Job Manifests with application-specific task identifiers;
- infer legal, financial, ownership, governance, or role authority from learning signals;
- enable billing or pricing;
- make Legal Eagle matter content project-wide memory by default.

## 4. Authorities and Trust Zones

### 4.1 GitHub

GitHub remains authoritative for:

- source code;
- migrations and Edge Function source;
- tests;
- release history;
- implementation branches and pull requests;
- architecture/specification documents.

### 4.2 Production Supabase

Production remains authoritative for:

- Projects and project membership;
- Jobs and operational controls;
- capabilities, scheduling, runs, checkpoints, artifacts, and audit events;
- product/catalog state;
- production DataNest AI provider/budget/security controls;
- certified project-wide memory;
- governed Think Tank, Governance, Sparks, stakeholder, and product-domain state.

Production must not become the primary raw-learning evidence store.

### 4.3 DataNest AI Staging Supabase

The dedicated staging project remains authoritative for:

- immutable raw AI/human/application learning evidence;
- AI sessions;
- file submissions and analysis evidence;
- trend clusters;
- learning candidates;
- validation runs;
- certification decisions;
- supersession proposals;
- semantic-learning derivations that are not yet certified.

Staging data is persistent and backed up. It is not an ephemeral preview environment.

### 4.4 Derived intelligence graph

The DataNest semantic tables are a derived intelligence layer.

They may represent:

- normalized sources;
- artifacts and chunks;
- semantic memories;
- patterns;
- relations;
- evidence strength;
- relevance/plasticity changes;
- resonance/activity pulses.

They must never override production authorities. A graph relation may be useful for discovery and retrieval scoring while still remaining provisional.

## 5. Core Architecture

The central architecture is:

~~~text
Application / Human / AI / Scheduler / Test / Deployment
                         |
                         v
                DataNest Event Gateway
                         |
              +----------+-----------+
              |                      |
              v                      v
       Production audit        Learning eligibility
       / operational log              |
                                      v
                             Staging evidence ledger
                                      |
                         normalize / classify / relate
                                      |
                                      v
                               learning candidate
                                      |
                     audit -> verify -> validate
                          -> stress-test -> certify
                                      |
                                      v
                              promotion gateway
                                      |
                                      v
                          production certified memory
                                      |
                      +---------------+---------------+
                      |                               |
                      v                               v
                DataNest AI                      Applications
                      |                               |
                      +----------- outcomes ----------+
                                      |
                                      v
                                 new evidence
~~~

No application writes directly into production certified memory.

## 6. Canonical DataNest Event Envelope

Every participating application must be able to emit a versioned canonical event envelope.

Minimum logical contract:

~~~json
{
  "schema_version": "datanest-event-v1",
  "project_id": "uuid",
  "job_id": "uuid-or-null",
  "application_key": "sync_vision",
  "trace_id": "DN-EVT-...",
  "source_type": "human|application|datanest_ai|ai_companion|automation|scheduler|test|deployment",
  "actor_id": "uuid-or-null",
  "entity_type": "artifact|render|job|product|decision|configuration|deployment|test|other",
  "entity_id": "stable-id-or-null",
  "action": "render.completed",
  "input_refs": [],
  "artifact_refs": [],
  "outcome": "accepted|rejected|succeeded|failed|superseded|unknown",
  "quality": {},
  "metadata": {},
  "learning_eligible": true,
  "sensitivity_class": "normal",
  "created_at": "server-generated"
}
~~~

### 6.1 Required invariants

- `project_id` is always required.
- `job_id` is required whenever a Job Manifest exists for the work.
- `trace_id` is server-generated or server-validated and unique.
- client input may not claim certification state.
- learning eligibility is determined by policy, not solely by the caller.
- sensitive product modes may force learning exclusion.
- artifacts are referenced, not copied into every event.
- the envelope is append-only as evidence; corrections create new events.
- every schema version remains interpretable after future revisions.

## 7. Universal Integration Functions

Participating applications should use five stable logical interfaces.

### 7.1 `record_datanest_event`

Purpose: record a traceable operational/application event.

Responsibilities:

- authenticate and authorize;
- validate project and optional Job;
- resolve application identity;
- assign trace ID;
- store production audit/operational evidence when appropriate;
- evaluate learning eligibility;
- forward eligible evidence to staging without exposing staging credentials to clients;
- return the canonical trace ID.

### 7.2 `resolve_governed_context`

Purpose: construct the trusted context available to an application or DataNest AI turn.

Context may include:

- Job Manifest;
- project context;
- relevant current-session provisional evidence;
- relevant production certified memory;
- related entities/artifacts;
- approved application configuration;
- explicit exclusions.

The resolver must preserve the existing rule that uncertified evidence is only usable inside its authorized scope.

### 7.3 `submit_learning_evidence`

Purpose: server-only bridge from eligible event evidence into the staging learning ledger.

Responsibilities:

- normalize source identity;
- preserve event trace;
- derive a content/evidence representation suitable for analysis;
- prevent duplicated evidence;
- apply sensitivity and learning-exclusion policy;
- attach Job/application/entity/outcome provenance.

### 7.4 `get_certified_intelligence`

Purpose: retrieve reusable project intelligence.

Instead of returning a generic fixed batch, retrieval should rank memory by:

- Project;
- application;
- Job/task;
- entity type and entity ID;
- category;
- semantic relevance;
- provenance strength;
- recency where appropriate;
- confidence;
- active/supersession state.

Only production certified memory may be returned as reusable institutional knowledge.

### 7.5 `record_outcome`

Purpose: close the learning loop.

Applications record what happened after a recommendation, render, build, configuration, deployment, or decision.

The function must link the outcome to:

- initiating Job;
- original trace;
- relevant recommendation or memory IDs;
- produced artifact;
- acceptance/rejection state;
- measurable quality fields when available.

Outcome evidence may support or weaken future learning candidates but may not directly rewrite certified memory.

## 8. Learning Taxonomy

The current generic `workflow` category is insufficient.

DataNest learning candidates should use explicit classes.

### 8.1 Knowledge

Stable project facts or validated domain facts.

Examples:

- an application belongs to a particular product suite;
- a release process requires a specific governed step.

### 8.2 Preference

Explicitly observed and policy-eligible working preferences.

Examples:

- preferred export format;
- accepted UI density;
- preferred video output characteristics.

Preferences should require evidence that they reflect an authorized user choice, not merely repeated AI wording.

### 8.3 Pattern

A repeated relationship between context and outcomes.

Example:

- a rendering configuration repeatedly correlates with accepted outputs for a specific task class.

Patterns are derived claims and need independent evidence.

### 8.4 Procedure

A validated sequence of actions that repeatedly succeeds.

Example:

- a verified recovery sequence for a known deployment failure.

### 8.5 High-risk classes

At minimum:

- architecture;
- security;
- authorization;
- governance;
- destructive operations;
- production policy;
- financial/commercial authority.

These require Owner certification unless a stricter policy exists.

## 9. Candidate Generation and Signal Quality

Candidate generation must move beyond generic recent token overlap.

### 9.1 Evidence dimensions

Candidate formation should consider:

- semantic similarity;
- application and task context;
- entity relationship;
- outcome agreement;
- independent source count;
- independent Job/session count;
- temporal recurrence;
- contradictions;
- accepted/rejected result balance;
- source class;
- sensitivity class;
- explicit user confirmation when the candidate represents a preference.

### 9.2 Noise suppression

The system should suppress candidate creation for:

- repeated UI labels or boilerplate;
- copied AI responses without independent supporting outcomes;
- duplicate retry traffic;
- status polling;
- low-information acknowledgments;
- legal/private learning-excluded modes;
- generated stress-test traffic unless explicitly marked as test evidence.

### 9.3 Candidate state

The existing lifecycle remains the foundation:

`INTAKE -> AUDITED -> VERIFIED -> VALIDATED -> STRESS_TESTED/CERTIFICATION_REVIEW -> CERTIFIED`

Existing state names may be retained where already encoded, but API/UI wording should clearly express the same ordered gates.

## 10. Certification and Promotion

### 10.1 Certification remains separate from evidence gathering

A candidate may accumulate evidence automatically. It cannot claim production authority until certified.

### 10.2 Low-risk promotion-ready flow

For ordinary low-risk knowledge:

1. required gates pass;
2. certification decision is recorded;
3. the system creates a durable `promotion_ready` record/event;
4. owner/admin UI shows the candidate as ready for production memory;
5. policy may allow immediate automatic promotion only where explicitly configured and tested.

Initial rollout should keep the final production promotion explicit while eliminating silent dead-end certified states.

### 10.3 High-risk flow

High-risk candidates require:

- all required gates;
- Owner certification;
- explicit production promotion;
- complete provenance;
- audit event linking the candidate, decision, source traces, memory ID, and supersession state.

### 10.4 Idempotency

Promotion must be idempotent by certification/content identity.

Repeating promotion must return the existing active memory or a deterministic no-op rather than create duplicate memory rows.

## 11. Think Tank Interlinkage

Think Tanks keep independent human-review requirements.

The final learning path changes conceptually from:

`Think Tank proposal -> approved -> direct memory authority`

to:

`Think Tank proposal -> independent human review -> governed evidence package -> central certification/promotion spine`

The evidence package retains:

- thread ID;
- channel ID;
- optional Job ID;
- source message IDs;
- proposal trace;
- proposer;
- independent reviewer;
- normalized knowledge;
- confidence;
- category.

For transition compatibility, existing approved Think Tank memory may remain valid. New flows should converge on the central learning authority.

Think Tank approvals do not create legal ownership, financial rights, voting rights, project roles, or model-training permission.

## 12. Product and Specialist Mode Interlinkage

Products consume the same governed DataNest AI gateway.

Each product mode must declare:

- `product_mode`;
- application/product identity;
- default learning eligibility;
- sensitivity class;
- allowed memory categories;
- whether outcome events may be aggregated.

### 12.1 Legal Eagle

Legal Eagle keeps:

- `learning_eligible=false` by default;
- no automatic trend extraction from matter content;
- Job-scoped traceable context;
- jurisdiction requirement;
- no silent project-wide memory.

A future explicit "submit sanitized lesson" action may create a separate governed candidate, but that is outside this design's initial implementation.

## 13. Application Interlinkage

Each Resonance application should become both:

- a producer of governed events/outcomes; and
- a consumer of relevant certified intelligence.

Examples include:

- Creative Studio;
- Sync Vision;
- ePublisher;
- YouTube Optimizer;
- SovereignForge;
- LyricSync Studio;
- Scene Song Spark;
- other RONSAS applications approved into the product catalog.

Application adapters should remain thin. They emit the canonical envelope and use the context/intelligence APIs. They do not embed certification logic.

## 14. Cross-Application Trace Chains

Artifacts may move across applications while retaining lineage.

Example:

~~~text
Creative Studio
  -> produces image artifact A
  -> DN-EVT-101

Sync Vision
  -> consumes artifact A
  -> produces video artifact B
  -> DN-EVT-205

YouTube Optimizer
  -> consumes artifact B + metadata
  -> produces optimized publish package C
  -> DN-EVT-309
~~~

DataNest may analyze the full chain without flattening the individual application histories.

A cross-application learning candidate must cite the source traces and artifacts supporting it.

## 15. Semantic Intelligence Graph

The newer `datanest_*` tables should be activated as a derived graph.

### 15.1 Mapping

- `datanest_sources`: canonical application/user/system sources;
- `datanest_events`: normalized event projections;
- `datanest_artifacts`: semantic artifact projections;
- `datanest_chunks`: searchable content segments;
- `datanest_memories`: derived memory/index representation;
- `datanest_patterns`: provisional or certified pattern representations;
- `datanest_relations`: typed links among sources, artifacts, events, memories, Jobs, and entities;
- `datanest_plasticity_events`: changes in relevance/strength caused by new evidence;
- `datanest_resonance_pulses`: activity/aggregation signals.

### 15.2 Authority rule

Graph state is descriptive and derived.

Only a production `certified_memory` row establishes reusable project-wide knowledge authority.

A graph node should carry a trust state such as:

- raw;
- provisional;
- validated;
- certified;
- superseded.

The graph must never upgrade trust independently.

## 16. Context Routing

The current DataNest AI request path should evolve from broad memory loading into contextual retrieval.

A governed context request contains:

- project ID;
- Job ID;
- application key;
- product mode;
- task/action;
- optional entity IDs;
- optional artifact IDs;
- current session ID.

The context router returns:

1. Job and project operational context;
2. current-session provisional evidence;
3. ranked certified memory;
4. relevant approved artifacts/relations;
5. explicit trust labels.

The prompt/runtime must keep certified and provisional sections separate.

## 17. Outcome Learning

Outcome evidence is required for useful application optimization.

### 17.1 Outcome types

Initial normalized outcomes:

- accepted;
- rejected;
- succeeded;
- failed;
- superseded;
- unknown.

Applications may add domain metrics in `quality`.

Examples:

- render duration;
- retry count;
- test pass ratio;
- human quality score;
- publish success;
- deployment health;
- transcription alignment;
- validation score.

### 17.2 Recommendation attribution

When an application acts on DataNest intelligence, the outcome event should reference:

- certified memory IDs used;
- originating recommendation trace;
- relevant Job;
- resulting artifact.

This allows DataNest to distinguish "a memory existed" from "a memory was actually applied and produced a good result."

## 18. Audit and Explainability

Every cross-application learning action must be explainable.

For a certified memory item, an authorized reviewer must be able to answer:

- what does DataNest believe?
- which candidate created it?
- which evidence supported the candidate?
- which Jobs/applications produced the evidence?
- what validation/stress-test runs passed?
- who/what certified it?
- when was it promoted?
- has it been superseded?
- where has it subsequently been applied?
- what outcomes followed those applications?

Audit records are append-only.

## 19. Security and Privacy

### 19.1 Staging credentials

No browser client receives service-role credentials for the staging project.

Cross-environment writes are server-side only.

### 19.2 RLS and authorization

Every exposed table remains RLS-protected.

Application adapters may only emit events for Projects/Jobs the caller is authorized to access.

### 19.3 Sensitive modes

Learning policy can force:

- `learning_eligible=false`;
- redaction;
- restricted aggregation;
- no cross-Job retrieval.

### 19.4 Prompt injection and untrusted data

Application evidence, file content, and external AI returns are data, not instructions to system infrastructure.

Provider prompts must preserve system governance above retrieved content.

### 19.5 Supersession

Corrections do not erase prior memory history.

A newer certified item may supersede an older item while preserving the full chain.

## 20. Error Handling and Resilience

### 20.1 Event recording failure

Operational application functionality should not falsely claim evidence was captured.

Where the application can safely continue, it should surface an explicit telemetry/learning-recording failure and permit retry with an idempotency key.

### 20.2 Staging unavailable

Production must not fall back to writing raw evidence into `certified_memory`.

Learning intake should fail closed while core non-learning functionality may continue where safe.

### 20.3 Promotion failure

A certified staging candidate remains certified but not promoted.

The state must be visible as `promotion_pending` or equivalent, with a retriable idempotent promotion action.

### 20.4 Context retrieval failure

The AI/application may operate without certified context only when the product policy permits it, and must not imply that project memory was consulted.

## 21. Observability

The system should expose project-level metrics for:

- event volume by application/source;
- learning-eligible vs excluded evidence;
- candidate creation rate;
- candidate rejection rate;
- validation pass/fail rate;
- certification count;
- promotion-ready count;
- promoted memory count;
- supersession count;
- memory retrieval/use count;
- outcome count linked to memory;
- unresolved promotion errors.

These metrics support operations and tuning; they do not create certification authority.

## 22. Migration and Compatibility

Implementation must be incremental.

### Phase A — contract and bridge

- introduce canonical event envelope and gateway;
- preserve existing DataNest AI intake behavior;
- link eligible existing sources to the new contract;
- expose promotion-ready state.

### Phase B — application adapters

- connect selected applications one at a time;
- start with DataNest internal domains where schemas already exist;
- add outcome events;
- validate trace lineage.

### Phase C — central learning consolidation

- adapt Think Tank reviewed learning into the central pipeline;
- normalize candidate taxonomy;
- improve candidate generation;
- keep compatibility views/RPCs for existing UI until replacement is verified.

### Phase D — semantic graph activation

- populate derived `datanest_*` tables from canonical evidence;
- add relation/pattern indexing;
- keep graph trust state explicit.

### Phase E — context routing

- implement relevance-based certified-memory retrieval;
- add application/entity/task context;
- measure retrieval quality and latency.

No destructive legacy deletion is required for initial rollout.

## 23. Testing Strategy

### 23.1 Unit tests

Cover:

- event schema validation;
- learning-eligibility policy;
- category classification;
- idempotency;
- trace generation;
- outcome normalization;
- trust-state separation;
- context-ranking rules;
- supersession rules.

### 23.2 SQL acceptance tests

Verify:

- RLS and role boundaries;
- no direct client promotion path;
- staging evidence cannot become production memory without valid certification;
- idempotent promotion;
- audit lineage;
- Think Tank independent-review constraint;
- Legal Eagle learning exclusion;
- high-risk Owner authority;
- no-billing/free-promotion invariants.

### 23.3 Edge Function tests

Verify:

- authorized event ingestion;
- server-only staging bridge;
- staging outage behavior;
- context routing;
- promotion-ready/promotion behavior;
- duplicate retry handling.

### 23.4 Browser tests

Verify:

- application emits traceable outcome;
- DataNest AI displays trust labels;
- certification console shows promotion-ready state;
- promoted memory becomes available to a different Job only after promotion;
- raw evidence does not cross Job/session boundaries;
- Legal Eagle remains excluded.

### 23.5 Stress tests

Verify:

- event bursts;
- duplicate submissions;
- concurrent candidate updates;
- concurrent promotion attempts;
- retrieval latency at larger memory volumes;
- graph projection consistency.

## 24. Acceptance Criteria

The design is implemented successfully when all of the following are true:

1. at least one non-chat application can emit a canonical governed event;
2. that event can become staging learning evidence only when policy permits;
3. a learning candidate preserves application, Job, trace, entity, and outcome provenance;
4. certified candidates cannot silently remain invisible—promotion-ready state is observable;
5. a promoted item creates exactly one active production memory identity;
6. another authorized Job can retrieve that memory through the governed context router;
7. uncertified evidence still cannot influence unrelated Jobs;
8. Think Tank learning uses the central learning authority for new approvals;
9. Legal Eagle remains excluded from automatic learning;
10. semantic graph records are derived and trust-labelled;
11. an application outcome can be traced back to the memory/recommendation that influenced it;
12. all security, SQL acceptance, browser, unit, and stress suites pass;
13. no billing is enabled and the free-promotion invariant remains unchanged.

## 25. Initial Implementation Boundaries

The first implementation plan should be deliberately narrow.

Recommended first slice:

1. canonical event schema + server-side event gateway;
2. application registry identity mapping;
3. outcome recording;
4. promotion-ready state for the existing AI certification pipeline;
5. contextual retrieval contract using existing `certified_memory`;
6. one pilot adapter for an existing DataNest internal application/workspace;
7. tests proving end-to-end evidence -> candidate -> certification -> promotion -> cross-Job retrieval -> outcome lineage.

Do not activate every RONSAS application in the first slice.

## 26. Design Decision Summary

DataNest will operate as one governed Learning Fabric:

- **Production Supabase**: operational truth and certified memory;
- **DataNest AI Staging**: raw evidence and candidate lifecycle;
- **DataNest semantic graph**: derived relationships and patterns;
- **GitHub**: source and release authority;
- **Jobs + Trace IDs**: continuity spine;
- **Applications**: producers and consumers of governed events;
- **Certification**: the only route from provisional learning to reusable project memory.

This architecture closes the learning loop without weakening the trust boundary that DataNest AI already enforces.
