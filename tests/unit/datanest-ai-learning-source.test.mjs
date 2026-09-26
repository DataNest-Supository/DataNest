import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveLearningContext } from "../../supabase/functions/_shared/datanestAiLearning.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

test("shared analyzer includes application evidence but excludes model output",()=>{
  const source=fs.readFileSync(path.join(root,"supabase/functions/_shared/datanestAiLearning.ts"),"utf8");
  assert.match(source,/export async function analyzeLearningEvidence/);
  assert.match(source,/\.in\("source_type",\["human","ai_companion","application"\]\)/);
  assert.doesNotMatch(source,/\.in\("source_type",\[[^\]]*"datanest_ai"/);
  assert.match(source,/metadata\.learning_eligible!==false/);
});

test("shared analyzer preserves governed candidate lifecycle machinery",()=>{
  const source=fs.readFileSync(path.join(root,"supabase/functions/_shared/datanestAiLearning.ts"),"utf8");
  for(const token of ["bestCandidateByEvidenceOverlap","stableCandidateIdFromHash","automatedLearningGateResults","candidateValidationSeal","mutableLearningStates"]){
    assert.ok(source.includes(token),token+" must remain in the shared analyzer");
  }
});

test("chat delegates learning analysis to the shared module",()=>{
  const source=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-chat/index.ts"),"utf8");
  assert.match(source,/from "\.\.\/_shared\/datanestAiLearning\.ts"/);
  assert.match(source,/analyzeLearningEvidence\(\{/);
  assert.doesNotMatch(source,/async function updateTrendCandidate/);
});

test("learning context is deterministic and de-duplicated",()=>{
  assert.deepEqual(deriveLearningContext([
    {metadata:{application_key:"product_lab",action:"product_test_run.recorded",entity_type:"product_test_run",entity_id:"run-b",outcome:"failed"}},
    {metadata:{application_key:"product_lab",action:"product_test_run.recorded",entity_type:"product_test_run",entity_id:"run-a",outcome:"succeeded"}},
    {metadata:{application_key:"sync_vision",action:"render.completed",entity_type:"render",entity_id:"render-1",outcome:"accepted"}},
    {metadata:{application_key:"product_lab",action:"product_test_run.recorded",entity_type:"product_test_run",entity_id:"run-a",outcome:"succeeded"}}
  ]),{
    application_keys:["product_lab","sync_vision"],
    actions:["product_test_run.recorded","render.completed"],
    entity_types:["product_test_run","render"],
    entity_ids:["render-1","run-a","run-b"],
    outcomes:["accepted","failed","succeeded"]
  });
});
