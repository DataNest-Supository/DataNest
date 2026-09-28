import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const chat=fs.readFileSync(path.join(root,"src/components/DataNestAiChatPanel.tsx"),"utf8");
const edge=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");
const learning=fs.readFileSync(path.join(root,"supabase/functions/_shared/datanestAiLearning.ts"),"utf8");
const impact=fs.readFileSync(path.join(root,"supabase/migrations/20260928212000_optimize_live_project_impact_scoring.sql"),"utf8");

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

test("governed intake validates and persists expertise routing metadata",()=>{
  assert.ok(edge.includes("body.expertiseSection"));
  assert.ok(edge.includes("Unsupported Development Work expertise section."));
  assert.ok(edge.includes('category:expertise?"development_work":null'));
  assert.ok(edge.includes("impact_area:expertise?.label||null"));
  assert.ok(edge.includes("verification_track:expertise?.verificationTrack||null"));
  assert.ok(edge.includes('routing_version:expertise?"development-work-expertise-v1":null'));
  assert.ok(edge.includes("created_at,metadata"));
});

test("routed inputs continue through the existing trend and impact verification chain",()=>{
  assert.ok(edge.includes("updateTrendCandidate({"));
  assert.ok(edge.includes('inputEventId:String(inputEvent.id||"")'));
  assert.ok(learning.includes('.from("ai_candidate_evidence")'));
  assert.ok(impact.includes("e.metadata->>'impact_area'"));
  assert.ok(impact.includes("join ai_learning_candidates c on c.id=ce.candidate_id"));
});
