import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateFromRepeatedEvidence,
  classifyLearningRisk,
  evidenceSimilarity,
  normalizeTrendTokens,
  trendKeyForTokens
} from "../../supabase/functions/_shared/datanestAiTrends.ts";

test("near-duplicate requirements cluster", () => {
  const a=normalizeTrendTokens("Clipboard auto fill must require permission");
  const b=normalizeTrendTokens("Require clipboard permission before automatic fill");
  assert.ok(evidenceSimilarity(a,b)>=0.5);
});

test("trend keys are deterministic for equivalent token sets", () => {
  const a=normalizeTrendTokens("Keep trace IDs visible");
  const b=normalizeTrendTokens("Visible trace IDs keep");
  assert.equal(trendKeyForTokens(a),trendKeyForTokens(b));
});

test("security and authorization learnings are high risk", () => {
  assert.deepEqual(classifyLearningRisk("change authentication and RLS authorization"),{
    category:"authorization",
    riskClass:"high"
  });
});

test("one-off evidence does not become an auto candidate", () => {
  assert.equal(candidateFromRepeatedEvidence([{id:"e1",content:"single observation"}]),null);
});

test("repeated evidence can produce a low-risk candidate but not a certification", () => {
  const candidate=candidateFromRepeatedEvidence([
    {id:"e1",content:"Use the compact job header in DataNest AI"},
    {id:"e2",content:"Keep the compact job header for DataNest AI"}
  ]);
  assert.equal(candidate?.lifecycleState,"INTAKE");
  assert.equal(candidate?.riskClass,"low");
  assert.ok(candidate?.evidenceIds.length===2);
});
