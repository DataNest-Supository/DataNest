import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../../supabase/migrations/20260929235500_platform_review_dossier_opportunity_v1.sql",import.meta.url),"utf8");
const panel=readFileSync(new URL("../../src/components/PlatformReviewPanel.tsx",import.meta.url),"utf8");
const governance=readFileSync(new URL("../../src/components/GovernanceWorkspace.tsx",import.meta.url),"utf8");
const dossierWriter=readFileSync(new URL("../../scripts/write-platform-dossier.mjs",import.meta.url),"utf8");
const docs=readFileSync(new URL("../../docs/PLATFORM_REVIEW_DOSSIER_OPPORTUNITY.md",import.meta.url),"utf8");

test("platform update suggestions require external review before human approval and never carry release authority",()=>{
  assert.match(migration,/external_review_state text not null default 'pending'/);
  assert.match(migration,/human_review_state text not null default 'pending'/);
  assert.match(migration,/if suggestion\.external_review_state<>'accepted'/);
  assert.match(migration,/Accepted external review evidence is required before human approval/);
  assert.match(migration,/production_authority boolean not null default false check \(production_authority=false\)/);
  assert.match(migration,/deployment_authority boolean not null default false check \(deployment_authority=false\)/);
  assert.match(migration,/live_action_authority boolean not null default false check \(live_action_authority=false\)/);
  assert.match(panel,/External review → human review → release eligibility/);
  assert.match(panel,/release eligibility = deployment authority: no/);
});

test("platform dossier is revisioned, hash-traceable, realtime-enabled, and release-indexed",()=>{
  assert.match(migration,/create table if not exists public\.platform_dossier_documents/);
  assert.match(migration,/create table if not exists public\.platform_dossier_revisions/);
  assert.match(migration,/content_hash text not null/);
  assert.match(migration,/alter publication supabase_realtime add table public\.platform_dossier_documents/);
  assert.match(migration,/alter publication supabase_realtime add table public\.platform_dossier_revisions/);
  assert.match(panel,/postgres_changes/);
  assert.match(panel,/SHA-256 content hash/);
  assert.match(dossierWriter,/README\.md/);
  assert.match(dossierWriter,/walk\("docs"\)/);
  assert.match(dossierWriter,/walk\("public\/transparency"\)/);
  assert.match(dossierWriter,/createHash\("sha256"\)/);
  assert.match(docs,/deployed dossier snapshot reproducible and commit-pinned/);
});

test("business opportunity projections are ranged, evidence-linked, and non-authoritative",()=>{
  assert.match(migration,/projection_low numeric/);
  assert.match(migration,/projection_base numeric/);
  assert.match(migration,/projection_high numeric/);
  assert.match(migration,/cardinality\(coalesce\(target_evidence_refs/);
  assert.match(migration,/projection_indicator/);
  assert.match(migration,/decision_authority boolean not null default false check \(decision_authority=false\)/);
  assert.match(migration,/financial_commitment boolean not null default false check \(financial_commitment=false\)/);
  assert.match(panel,/Business Opportunity Identifier & Projection Indicator/);
  assert.match(panel,/decision authority: no · financial commitment: no/);
});

test("platform review workspace is routed through Governance rather than a bypass",()=>{
  assert.match(governance,/PlatformReviewPanel/);
  assert.match(governance,/Platform Review & Dossier/);
  assert.match(governance,/section==="platform_review"/);
  assert.match(docs,/RSGP/);
});
