import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(
  new URL("../../.github/workflows/conductor.yml",import.meta.url),
  "utf8"
);

const workflowRunGuard=/github\.event\.workflow_run\.head_branch == 'main'[\s\S]*?github\.event\.workflow_run\.head_repository\.full_name == github\.repository[\s\S]*?github\.event\.workflow_run\.event != 'pull_request'[\s\S]*?github\.event\.workflow_run\.event != 'workflow_run'/;

test("CONDUCTOR coordinate and timeframe jobs share the same workflow-run guard",()=>{
  const coordinate=workflow.match(/\n  coordinate:\n([\s\S]*?)(?=\n  gate-timeframe:)/)?.[1]||"";
  const timeframe=workflow.match(/\n  gate-timeframe:\n([\s\S]*)$/)?.[1]||"";
  assert.match(coordinate,workflowRunGuard);
  assert.match(timeframe,workflowRunGuard);
});

test("CONDUCTOR concurrency isolates event families and source workflows",()=>{
  assert.match(
    workflow,
    /group: datanest-conductor-\$\{\{ github\.event_name \}\}-\$\{\{ github\.event_name == 'workflow_run' && github\.event\.workflow_run\.name \|\| github\.ref_name \|\| 'schedule' \}\}/
  );
  assert.match(workflow,/cancel-in-progress: true/);
});
