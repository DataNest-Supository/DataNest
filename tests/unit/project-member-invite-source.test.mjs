import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(
  path.join(root,"supabase/functions/send-project-member-invite/index.ts"),
  "utf8"
);
const config=fs.readFileSync(
  path.join(root,"supabase/config.toml"),
  "utf8"
);
const pages=fs.readFileSync(
  path.join(root,".github/workflows/pages.yml"),
  "utf8"
);

test("project-member invite gateway uses recovery for existing accounts",()=>{
  assert.match(source,/const delivery:\s*"invite"\s*\|\s*"recovery"\s*=\s*"invite"/);
  assert.match(source,/delivery\s*=\s*"recovery"[\s\S]{0,500}resetPasswordForEmail/);
  assert.doesNotMatch(source,/signInWithOtp/);
  assert.match(source,/admin\.inviteUserByEmail/);
});

test("project-member invite gateway keeps the canonical Pages redirect",()=>{
  assert.match(
    source,
    /const redirectTo\s*=\s*"https:\/\/datanest-supository\.github\.io\/DataNest\/";/
  );
});

test("project-member invite gateway requires authenticated callers and bounded roles",()=>{
  assert.match(source,/callerClient\.auth\.getUser\(\)/);
  assert.match(source,/\["admin"\s*,\s*"operator"\s*,\s*"viewer"\]/);
  assert.match(source,/callerMembership\.status\s*!==\s*"active"/);
  assert.match(source,/\["owner"\s*,\s*"admin"\]\.includes\(callerMembership\.role\)/);
});

test("project-member invite function remains JWT-protected and Pages-aligned",()=>{
  assert.match(config,/\[functions\.send-project-member-invite\][\s\S]*verify_jwt\s*=\s*true/);
  assert.match(pages,/DATANEST_EDGE_PROJECT_INVITES: send-project-member-invite@2/);
  assert.match(pages,/projectInvitations.*send-project-member-invite@2/);
});
