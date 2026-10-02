import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(new URL("../../.github/workflows/pages.yml",import.meta.url),"utf8");

test("Pages production does not embed Owner Test Mode authorization logic",()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/name: github-pages/);
  assert.doesNotMatch(workflow,/OWNER_TEST_MODE_OWNER_LOGIN/);
  assert.doesNotMatch(workflow,/collaborators\\/\\$GITHUB_ACTOR\\/permission/);
});

