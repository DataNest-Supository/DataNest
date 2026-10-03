# RONSAS Portfolio Reconciliation — Commercial Consolidation

**Date:** 2026-10-03  
**Status:** Proposed through canonical DataNest PR; no production application has been deleted or disabled.

## Objective

Reduce customer-facing portfolio complexity while preserving existing RONSAS capabilities, production routes and source history.

## Target commercial architecture

### DataNest
Canonical governance, evidence, orchestration and platform authority.

### RONSAS
Application/product suite governed by DataNest.

| Family | Primary surface | Consolidated capabilities |
| --- | --- | --- |
| Career | Career Compass | — |
| Create | Creative Studio | LyricSync Studio, SyncVision, ePublisher |
| Grow | Creator growth pathway | Scene Song Spark acquisition utility; YouTube Optimizer growth capability |
| Build | Sovereign Forge | Sovereign Backend and RONSAS Shared remain infrastructure |

## Product treatment

### Career Compass — retain as independent product
Independent customer problem, acquisition path and subscription journey.

### Creative Studio — make the principal creator surface
Primary entry point for creator production. Existing publishing, lyric/synchronization and media-synchronization capabilities remain available through the workspace.

### ePublisher — consolidate commercially
Retain as an implemented capability, but present as the publishing/distribution module of Creative Studio unless separate demand evidence later justifies independent product status.

### LyricSync Studio — consolidate commercially
Retain as a specialist capability within Creative Studio for lyrics and synchronization.

### SyncVision — consolidate commercially
Retain as the media-synchronization capability within Creative Studio.

### Scene Song Spark — retain as acquisition utility
Use as a low-friction discovery/lead-generation entry into the creator funnel rather than making it a competing primary subscription destination.

### YouTube Optimizer — reposition to Creator Growth
Retain its capability and external production route while presenting it as part of the creator growth pathway rather than a separate top-level product family.

### Sovereign Forge — retain as independent B2B/professional product
Keep a distinct product identity because its buyer, problem and commercial context are materially different from the creator workflow.

### Sovereign Backend / RONSAS Shared — infrastructure only
Keep operationally. Do not place them in the primary customer product grid.

## Customer journey

```
discovery / free utility
        ↓
RONSAS identity / registration
        ↓
Creative Studio
        ↓
create → sync → publish → grow
        ↓
repeat usage / paid capability
        ↓
professional expansion
```

Career Compass follows an independent career/workforce journey. Sovereign Forge follows a professional/B2B journey.

## Transition controls

1. **Do not delete existing applications as part of commercial consolidation.**
2. **Do not change production lifecycle solely because the commercial role changes.**
3. **Keep technical catalog entries for governance and evidence even when their commercial visibility becomes module, acquisition, or internal.**
4. **Centralize pricing and onboarding around the primary commercial surfaces.**
5. **Measure activation, repeat use, subscription intent, conversion and expansion before promoting a module back to independent product status.**
6. **Retirement requires separate evidence of redundancy, migration readiness, dependency closure, user-impact assessment and explicit authorization.**

## Required next implementation layers

### Public information architecture
Update DataNest/RONSAS navigation and product listings to show the four commercial families instead of presenting every implementation surface as an equal primary product.

### Pricing architecture
Create a family-level pricing model:
- Career Compass: independent pricing.
- Creative Studio: primary creator subscription with module/feature expansion.
- Creator Growth: integrated growth capabilities.
- Sovereign Forge: professional/B2B pricing.
- Scene Song Spark: free or low-friction acquisition tier.

No numeric price should be asserted until supported by an explicit commercial baseline and product capability evidence.

### Portfolio data layer
Reconcile the Supabase portfolio graph so that RONSAS contains the catalogued applications and each application's commercial role is represented separately from technical lifecycle.

### Analytics
Standardize the funnel:
```
impression → visit → demo/use → registration → activation → first value
→ repeat use → subscription intent → subscription → expansion → referral
```

## Decision rule

The goal is not fewer capabilities. The goal is fewer customer decisions, clearer journeys, stronger cross-sell paths and a portfolio whose commercial structure matches the underlying system architecture.
