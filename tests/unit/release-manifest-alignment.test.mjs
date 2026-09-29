import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifestScript=readFileSync(
  new URL("../../scripts/write-release-manifest.mjs",import.meta.url),
  "utf8"
);
const pagesWorkflow=readFileSync(
  new URL("../../.github/workflows/pages.yml",import.meta.url),
  "utf8"
);

test("project invite Edge Function v2 is the enforced release version",()=>{
  assert.match(
    manifestScript,
    /projectInvitations:process\.env\.DATANEST_EDGE_PROJECT_INVITES \|\| "send-project-member-invite@3"/
  );
  assert.match(
    pagesWorkflow,
    /DATANEST_EDGE_PROJECT_INVITES: send-project-member-invite@3/
  );
  assert.match(
    pagesWorkflow,
    /projectInvitations.*send-project-member-invite@3/
  );
  assert.doesNotMatch(manifestScript,/send-project-member-invite@1/);
  assert.doesNotMatch(pagesWorkflow,/send-project-member-invite@1/);
});


test("release manifest identifies the current TranScheduler interests database release",()=>{
  assert.match(
    manifestScript,
    /databaseRelease:process\.env\.DATANEST_DB_RELEASE \|\| "link-transcheduler-job-requirements-user-interests"/
  );
  assert.match(
    pagesWorkflow,
    /DATANEST_DB_RELEASE: link-transcheduler-job-requirements-user-interests/
  );
  assert.match(
    pagesWorkflow,
    /databaseRelease.*link-transcheduler-job-requirements-user-interests/
  );
  assert.doesNotMatch(manifestScript,/add-mutation-recovery-observability/);
  assert.doesNotMatch(pagesWorkflow,/add-mutation-recovery-observability/);
});
