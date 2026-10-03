# Resonance Hub ↔ DataNest Recovery Changeset

## Target repository

`Resonance-AppDev/resonance-hub`

## Baseline

`ff745cf4706ec21cf9f56cb3db7d5fcaf445d178`

## Change 1 — ecosystem registry

File: `src/lib/app-registry.ts`

Add immediately within `ECOSYSTEM_REGISTRY`:

```ts
datanest: {
  key: "datanest",
  label: "Resonance DataNest",
  url: "https://datanest-supository.github.io/DataNest/",
  status: "pilot",
  tagline:
    "Governed intelligence workspace for job-scoped AI development, evidence, and certified memory.",
  includedInSuite: false,
},
```

This is deliberately outside `APP_REGISTRY`.

## Change 2 — public health contract

File: `scripts/lib/app-status-health-contract.test.ts`

Add an assertion that:

```ts
const datanest = payload.ecosystem.find((entry) => entry.key === "datanest");
expect(datanest).toMatchObject({
  status: "pilot",
  badgeLabel: "Pilot",
  access: "Pilot badge, live access",
  accessible: true,
});
expect(payload.counts.ecosystem).toBe(6);
```

The existing five paid-app expectation remains unchanged.

## Change 3 — homepage ecosystem CTA

File: `src/routes/index.tsx`

Add DataNest as a separate non-billable ecosystem CTA in the existing homepage ecosystem/app presentation. Do not put it inside paid-suite pricing language.

Canonical current target:

`https://datanest-supository.github.io/DataNest/`

Recommended presentation:

```ts
{
  title: "Open DataNest",
  body: "Governed intelligence workspace for job-scoped AI development, evidence, and certified memory.",
  href: "https://datanest-supository.github.io/DataNest/",
  cta: "Open DataNest",
}
```

The existing design system and card treatment should be reused.

## Change 4 — Latest Updates

File: `public/content/updates.json`

Append:

```json
{
  "app": "Resonance DataNest",
  "status": "Pilot",
  "tone": "pilot",
  "change": "DataNest is now part of the Resonance ecosystem as a non-billable governed workspace.",
  "date": "Oct 2026",
  "href": "https://datanest-supository.github.io/DataNest/",
  "cta": "Open DataNest",
  "details": "DataNest remains the canonical operating-control and source-governance authority for its own surface. The Resonance Hub provides ecosystem discovery only.",
  "links": [
    {
      "label": "Open DataNest",
      "href": "https://datanest-supository.github.io/DataNest/"
    }
  ]
}
```

## Prohibited changes

Do not:

- add a DataNest SKU;
- add DataNest to checkout;
- add DataNest to entitlement enforcement;
- add DataNest to All-Access;
- move DataNest source authority into Hub;
- change DataNest billing from `none`;
- introduce Railway as a requirement;
- introduce a DNS cutover requirement.

## Completion test

The rebuild is complete only when all of the following are true:

- `ECOSYSTEM_REGISTRY.datanest` exists;
- `APP_REGISTRY.datanest` does not exist;
- paid app count remains 5;
- public health contains `ecosystem[].key === "datanest"`;
- homepage exposes an Open DataNest CTA;
- current CTA resolves to GitHub Pages;
- DataNest source contract still identifies DataNest as authority.
