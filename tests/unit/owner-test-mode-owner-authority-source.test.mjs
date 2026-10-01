import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(new URL("../../.github/workflows/pages.yml",import.meta.url),"utf8");

test("Owner Test Mode keeps owner identity and admin fallback checks",()=>{
  assert.match(workflow,/DATANEST_UI_OWNER_TEST_MODE_OWNER_LOGIN/);
  assert.match(workflow,/GITHUB_ACTOR/);
  assert.match(workflow,/GITHUB_REPOSITORY_OWNER/);
  assert.match(workflow,/collaborators\/\$GITHUB_ACTOR\/permission/);
  assert.match(workflow,/permission.*admin/);
});
