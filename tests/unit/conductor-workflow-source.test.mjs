import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(
  new URL("../../.github/workflows/conductor.yml",import.meta.url),
  "utf8"
);

test("CONDUCTOR runs on bounded scheduled/manual control paths only",()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/cron: "0 \* \* \* \*"/);
  assert.doesNotMatch(workflow,/workflow_run:/);
  assert.match(workflow,/github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/github\.event_name == 'schedule'/);
  assert.match(workflow,/cancel-in-progress: true/);
});

test("CONDUCTOR concurrency coalesces automation for the same canonical SHA",()=>{
  assert.match(
    workflow,
    /group: datanest-conductor-\$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/
  );
  assert.match(workflow,/cancel-in-progress: true/);
});
