import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const chat=fs.readFileSync(path.join(root,"src/components/DataNestAiChatPanel.tsx"),"utf8");
const edge=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");
const learning=fs.readFileSync(path.join(root,"supabase/functions/_shared/datanestAiLearning.ts"),"utf8");
const impact=fs.readFileSync(path.join(root,"supabase/migrations/20260928220000_reconcile_production_impact_scoring_governed.sql"),"utf8");
const contributionIntake=fs.readFileSync(path.join(root,"supabase/migrations/20260928223500_add_development_work_contribution_intake.sql"),"utf8");

const sections=[
  ["ui_ux","UI & UX"],["frontend","Frontend"],["backend","Backend"],["data","Data"],["ai","AI"],
  ["testing","Testing"],["security","Security"],["infrastructure","Infrastructure"],
  ["documentation","Documentation"],["product_planning","Product Planning"]
];

test("Development Work exposes the complete expertise section set and requires a route before send",()=>{
  for(const [key,label] of sections){
    assert.ok(chat.includes(`key:"${key}"`),`missing expertise key ${key}`);
    assert.ok(chat.includes(`label:"${label}"`),`missing expertise label ${label}`);
  }
  assert.ok(chat.includes("DEVELOPMENT WORK · CHOOSE EXPERTISE"));
  assert.ok(chat.includes("expertiseSection:expertise.key"));
  assert.ok(chat.includes("disabled={busy||!contextReady||!selectedExpertise||!draft.trim()}"));
});

test("staging intake validates expertise and continues through governed trend analysis",()=>{
  assert.ok(edge.includes("body.expertiseSection"));
  assert.ok(edge.includes("Unsupported Development Work expertise section."));
  assert.ok(edge.includes('category:expertise?"development_work":null'));
  assert.ok(edge.includes("impact_area:expertise?.label||null"));
  assert.ok(edge.includes("verification_track:expertise?.verificationTrack||null"));
  assert.ok(edge.includes('routing_version:expertise?"development-work-expertise-v1":null'));
  assert.ok(edge.includes("updateTrendCandidate({"));
  assert.ok(learning.includes('.from("ai_candidate_evidence")'));
});

test("expertise-routed commands bridge into production governed contribution verification",()=>{
  assert.ok(edge.includes('"submit_development_work_contribution_v1"'));
  assert.ok(edge.includes("target_source_ref:String(data.id)"));
  assert.ok(edge.includes("contributionTracking"));
  assert.ok(contributionIntake.includes("insert into public.contribution_ledger"));
  assert.ok(contributionIntake.includes("'human_input'"));
  assert.ok(contributionIntake.includes("'development_work'"));
  assert.ok(contributionIntake.includes("0,"));
  assert.ok(contributionIntake.includes("false,"));
  assert.ok(contributionIntake.includes("insert into public.contribution_evidence"));
  assert.ok(contributionIntake.includes("verification_state"));
  assert.ok(contributionIntake.includes("set lifecycle_state='staged'"));
});

test("production impact scoring reads only the governed contribution ledger",()=>{
  assert.ok(impact.includes("from public.contribution_ledger l"));
  assert.ok(impact.includes("l.metadata->>'impact_area'"));
  assert.ok(impact.includes("'raw_activity_never_awards_points',true"));
  assert.ok(impact.includes("'source','public.contribution_ledger'"));
});
