# DataNest + RONSAS Rollout & Revenue Throughput Strategy

**Effective date:** 3 October 2026  
**Purpose:** Convert the existing DataNest/RONSAS capabilities into a measurable acquisition → registration → activation → subscription → expansion system without activating unsupported billing or making unverified revenue claims.

## 1. Current capability baseline

The current platform already provides the main components required for a two-engine commercial rollout:

### Public acquisition
- Commercial DataNest homepage
- Solutions, products, pricing and contact routes
- Public assurance service catalogue
- Public evidence/transparency surfaces
- RONSAS product portfolio and standard list-price book

### Registration and access
- Supabase-backed authentication in the DataNest workspace and multiple RONSAS applications
- Product-specific sign-in/sign-up flows
- Account, entitlement and session-management surfaces
- Entitlement history in Creative Studio
- Account and plan/credit surfaces in ePublisher
- Account/session/security surfaces in SyncVision
- Feature locking and free-access entry points in YouTube Optimizer

### Subscription / entitlement infrastructure
- Resonance Hub at `reson8.life` is the billing authority for spoke applications
- Spokes already contain entitlement contracts and checkout-return handling
- ePublisher retains historical checkout/billing compatibility
- SyncVision has checkout return detection, entitlement polling, receipts and credit records
- Creative Studio and other spokes already read Hub entitlement state

### Cost / usage controls
- Product usage measurement exists in multiple spokes
- Compute-heavy products already recognise provider/infrastructure usage as a cost variable
- SyncVision explicitly uses governed usage/credit concepts
- YouTube Optimizer records page and feature usage
- DataNest production has a central event/evidence system for governance and operational events

### Current commercial state
- RONSAS products are currently in free promotion or pre-billing states.
- DataNest assurance has published pricing but production billing activation is not yet the commercial-system authority.
- Therefore the immediate objective is **high-volume qualified acquisition and activation**, while paid subscription activation is gated by commercial-readiness checks.

## 2. Commercial operating model

Run two engines simultaneously.

### Engine A — RONSAS Product-Led Growth

```
content / discovery
   ↓
product landing page
   ↓
free registration
   ↓
first useful result
   ↓
repeat usage
   ↓
pricing intent
   ↓
paid upgrade
   ↓
multi-product / higher tier
   ↓
referral
```

### Engine B — DataNest Sales-Assisted Revenue

```
solution / evidence / referral
   ↓
qualified lead
   ↓
fit + scope screen
   ↓
paid assessment
   ↓
remediation / implementation
   ↓
verification + evidence
   ↓
monthly oversight
   ↓
enterprise / product expansion
```

The two engines share content, trust evidence, market intelligence and customer-success learning, but they should not use the same conversion path.

## 3. 90-day rollout

### Stage 1 — Instrument and remove friction
**Days 0–14**

Objective: make every commercial transition measurable before increasing traffic.

Required funnel events:

- `landing_view`
- `solution_view`
- `pricing_view`
- `lead_started`
- `lead_submitted`
- `signup_started`
- `signup_completed`
- `activation_completed`
- `core_feature_used`
- `return_session`
- `pricing_intent`
- `checkout_started`
- `checkout_completed`
- `subscription_active`
- `subscription_cancelled`
- `renewal`
- `sales_qualified`
- `proposal_sent`
- `deal_won`
- `deal_lost`

Every event should include:

```
timestamp
product
anonymous/session id where lawful
authenticated user id where available
source / campaign
page or feature
plan
commercial state
event metadata
```

The existing product-specific tracking is useful, but the portfolio needs one common event vocabulary so acquisition and monetisation can be compared across RONSAS applications.

### Stage 2 — Acquire and register
**Days 15–30**

Use three primary acquisition lanes.

**High-intent discovery**
- product-specific SEO pages;
- use-case pages;
- comparison/problem pages;
- public evidence and case studies;
- AI-search-friendly documentation;
- YouTube/social demonstrations for visual products.

**Distribution**
- creator/user referrals;
- partners, agencies and resellers;
- cross-promotion between RONSAS products;
- DataNest customer-to-product referrals.

**Targeted commercial outreach**
- companies with an identifiable governance/security/software problem for DataNest;
- creators/agencies for Creative Studio, SyncVision and YouTube Optimizer;
- authors/publishers for ePublisher;
- professionals/jobseekers for Career Compass.

Each campaign should have one product/segment, one CTA and one activation event. Do not send every audience to the same generic homepage.

### Stage 3 — Activate users
**Days 31–45**

Optimise for the first useful outcome rather than account creation alone.

Initial activation definitions:

| Product | Activation event |
|---|---|
| Career Compass | First completed career-plan/workflow result |
| Creative Studio | First saved/exportable creative result |
| ePublisher | First completed publishing/export workflow |
| LyricSync Studio | First completed lyric timing / LRC export |
| Scene Song Spark | First completed scene sequence |
| Sovereign Forge | First valid project manifest/build output |
| SyncVision | First completed treatment/storyboard ready for render |
| YouTube Optimizer | First completed channel audit/report |

The onboarding goal is to get the user to the relevant value event in minutes, not merely to complete registration. Current SaaS CRO guidance consistently treats activation and time-to-value as central conversion levers. citeturn820447search0turn820447search4

### Stage 4 — Monetise proven demand
**Days 46–75**

Do not activate paid billing across all products simultaneously.

Use a product-by-product gate:

1. product has repeatable activation;
2. support/operational path is stable;
3. actual provider/infrastructure cost is measurable;
4. plan entitlements are verified end-to-end;
5. checkout is tested;
6. return-to-app entitlement refresh is tested;
7. receipts/account history work;
8. refund/cancellation support is defined;
9. tax/pricing presentation is correct;
10. financial event instrumentation is live.

Then activate the first paid product(s) with the cleanest usage economics.

Because the Hub is the billing authority, spoke apps should continue delegating checkout to the Hub rather than introducing local payment implementations.

### Stage 5 — Scale winning motions
**Days 76–90**

Scale only the acquisition paths that produce activated users or qualified commercial leads.

Increase:

- content publishing frequency;
- partner distribution;
- retargeting;
- referral prompts;
- product-to-product cross-sell;
- sales-assisted outreach to high-intent accounts;
- annual-plan conversion after monthly adoption is proven.

Avoid scaling raw traffic when activation is weak. Current SaaS guidance recommends improving value communication, onboarding, pricing and checkout before simply buying more traffic. citeturn820447search0

## 4. Lead routing

### RONSAS free users

Treat free registration as a product signal, not automatically as a sales lead.

A user becomes a **product-qualified lead (PQL)** when there is evidence of meaningful use, such as:

- repeated sessions;
- completed core workflow;
- saved/exported output;
- usage beyond the initial activation;
- multiple collaborators;
- repeated consumption of premium-gated capability.

PQLs should receive contextual upgrade prompts and relevant product education before human sales intervention.

### DataNest commercial leads

A lead becomes **sales-qualified (SQL)** when scope, authority, business use and buying intent are sufficiently clear.

Examples:

- procurement/vendor assessment;
- POPIA/AI governance review;
- technical audit;
- ongoing oversight requirement;
- multi-system enterprise need;
- reseller/integration request.

Route these to human follow-up quickly.

## 5. High-volume sales output model

High-volume output should come from **repeatable systems**, not manual handling of every prospect.

### Digital volume

Use:

```
many qualified visitors
×
low-friction registration
×
fast activation
×
contextual upgrade
×
automated entitlement
=
subscription throughput
```

### Service volume

Use:

```
many targeted accounts
×
standardised assessment offer
×
structured qualification
×
repeatable proposal
×
implementation expansion
=
service revenue throughput
```

### Enterprise volume

Use:

```
PQL / partner / assessment evidence
→
account qualification
→
demo / workshop
→
multi-product proposal
→
enterprise contract
```

Do not force enterprise buyers through a consumer-style checkout.

SaaS guidance similarly distinguishes simple self-serve B2C/B2B motions from higher-touch enterprise sales. citeturn820447search3turn820447search11

## 6. Initial operating targets

These are **internal optimisation targets, not forecasts or market guarantees**.

### Activation
Aim to move product activation into an initial **25–40% operating band**, consistent with published PLG guidance that 20–40% activation is a common reference range. citeturn820447search9

### Paid conversion
Once billing is activated, initially test a **10–20% free/trial-to-paid range among activated cohorts**, rather than applying a target to all registrations. Published SaaS sources commonly cite trial-to-paid ranges around 10–25%, but product type and onboarding materially change the result. citeturn820447search0

### Onboarding
Design for a first meaningful result within approximately **15 minutes or less**, then measure actual completion time and drop-off by product. citeturn820447search4

### Commercial pipeline
Track:

```
visitor → lead → qualified lead → assessment/demo → proposal → won
```

and:

```
visitor → signup → activated → pricing intent → checkout → paid → renewed
```

The internal baseline, not an external average, becomes the primary benchmark.

## 7. Sales assets that should be standardised

Create one reusable commercial asset set:

- one-page product brief;
- use-case landing page;
- three-minute demo;
- pricing page;
- activation guide;
- FAQ;
- proof/evidence page;
- case study;
- comparison sheet;
- enterprise/agency one-pager;
- proposal template;
- follow-up sequence;
- renewal/expansion message.

The same evidence can feed DataNest assurance sales and RONSAS trust content.

## 8. Immediate funnel changes

### Change the primary CTA hierarchy

**DataNest**
1. Request assessment
2. Explore solution
3. View pricing
4. Workspace

**RONSAS**
1. Start free
2. See the first useful result
3. View pricing
4. Upgrade when eligible

Do not make "Contact us" the primary CTA for a product that can support self-service registration.

### Add contextual upgrade moments

Upgrade prompts should appear after value is demonstrated:

- export;
- higher-volume generation;
- advanced analysis;
- team collaboration;
- premium model/provider;
- saved history;
- recurring workflow.

Never block the first meaningful result merely to force a sale.

## 9. Billing activation policy

The current free promotion remains active until product-specific billing gates are satisfied.

The rollout should therefore use the promotion as a **measurement and acquisition phase**, not as a permanent free tier.

The exit condition for each product is evidence of:

**activation → repeat usage → measurable unit cost → viable price → working checkout → working entitlement → working support/refund path.**

This approach is particularly important for AI-heavy products because subscription pricing should account for marginal model/provider cost and usage behaviour. citeturn820447search1

## 10. Management dashboard

The operating dashboard should expose one weekly funnel:

| Funnel | Core KPI |
|---|---|
| Discovery | qualified visits |
| Acquisition | leads / signups |
| Registration | signup completion |
| Activation | activated users |
| Retention | D7 / D30 return |
| Monetisation | pricing intent / checkout |
| Subscription | new paid subscriptions |
| Expansion | upgrades / cross-product |
| Service | SQL / proposals / wins |
| Recurring | active oversight / renewals |
| Economics | revenue, cost-to-serve, contribution |

Never combine registrations, free users, subscriptions and revenue into one headline number.

## 11. Rollout governance

No autonomous system may:

- change published pricing;
- activate paid billing;
- make a contract;
- commit advertising spend;
- promise revenue;
- issue a financial guarantee;
- change entitlement rules without authorised review.

AI may analyse funnel data, suggest experiments, draft campaigns and prioritise prospects, but commercial commitments remain human-authorised.

## 12. Recommended priority order

**Priority 1:** instrumentation and unified funnel events.

**Priority 2:** fix activation/onboarding for the two or three RONSAS products with the strongest existing usage/cost evidence.

**Priority 3:** maintain free acquisition while publishing the future list-price clearly.

**Priority 4:** monetize the first product only after the billing/entitlement gate is passed.

**Priority 5:** scale the winning acquisition channel and introduce cross-product expansion.

**Priority 6:** use DataNest Assurance as the immediate human-assisted cash engine while RONSAS subscription economics mature.

This sequencing is intended to maximize the amount of qualified demand the existing system can absorb before adding more infrastructure or fixed sales overhead.
