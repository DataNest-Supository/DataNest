import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);

test("repository owner authorization does not depend on collaborator API quota",()=>{
  assert.match(pages,/GITHUB_ACTOR" = "\$GITHUB_REPOSITORY_OWNER/);
  assert.match(pages,/Owner Test Mode authority verified from repository ownership/);
  assert.match(pages,/collaborators\/\$GITHUB_ACTOR\/permission/);
  assert.match(pages,/test "\$permission" = "admin"/);
});
