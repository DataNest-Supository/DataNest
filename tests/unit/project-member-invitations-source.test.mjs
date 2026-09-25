import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync(
  new URL("../../supabase/migrations/20260925070000_datanest_project_member_invitations_v1.sql",import.meta.url),
  "utf8"
);
const edge=readFileSync(
  new URL("../../supabase/functions/send-project-member-invite/index.ts",import.meta.url),
  "utf8"
);
const panel=readFileSync(
  new URL("../../src/components/ProjectMembersPanel.tsx",import.meta.url),
  "utf8"
);
const app=readFileSync(
  new URL("../../src/components/DataNestApp.tsx",import.meta.url),
  "utf8"
);
const governance=readFileSync(
  new URL("../../src/components/GovernanceWorkspace.tsx",import.meta.url),
  "utf8"
);

test("project membership is exposed inside Governance",()=>{
  assert.match(governance,/ProjectMembersPanel/);
  assert.match(panel,/FORMAL MEMBERSHIP/);
  assert.match(panel,/Project members \+ governance voters/);
  assert.match(panel,/Sending an invitation never creates an independent vote by itself/);
});

test("project invitations require authenticated acceptance before project access",()=>{
  assert.match(app,/accept_pending_project_member_invites_v1/);
  const loadCoreStart=app.indexOf("const loadCore=useCallback");
  const loadCoreEnd=app.indexOf("const loadJobsPage",loadCoreStart);
  const loadCore=app.slice(loadCoreStart,loadCoreEnd);
  assert.ok(
    loadCore.indexOf("accept_pending_project_member_invites_v1")
      < loadCore.indexOf('.from("projects")'),
    "project invite acceptance must run before project visibility is evaluated"
  );
  assert.match(migration,/pm\.status\s*=\s*'active'/);
  assert.match(migration,/lower\(email\)=caller_email/);
  assert.match(migration,/expires_at>now\(\)/);
});

test("invite gateway prevents self-invite and role escalation",()=>{
  assert.match(edge,/You cannot invite yourself as an independent project member/);
  assert.match(edge,/Only the project owner may invite another admin/);
  assert.match(edge,/Owner or admin access is required to invite project members/);
  assert.match(edge,/\["admin", "operator", "viewer"\]/);
  assert.doesNotMatch(edge,/role.*owner/);
  assert.match(migration,/A stakeholder cannot invite themselves as an independent project member/);
  assert.match(migration,/target_role not in \('admin','operator','viewer'\)/);
});

test("pending and revoked invites are not formal voters",()=>{
  assert.match(migration,/'formal_voting_eligible_before_acceptance',false/);
  assert.match(migration,/'formal_voting_eligible',true/);
  assert.match(migration,/'formal_voting_eligible',false/);
  assert.match(migration,/'invited_member_can_vote',false/);
  assert.match(panel,/Voting remains disabled until that person/);
});

test("invite writes use governed gateways instead of client table mutation",()=>{
  assert.match(panel,/send-project-member-invite/);
  assert.match(panel,/revoke_project_member_invite_v1/);
  assert.match(panel,/get_project_membership_workspace_v1/);
  assert.doesNotMatch(panel,/\.from\("project_members"\)\.(insert|update|delete)/);
  assert.doesNotMatch(panel,/\.from\("project_member_invitations"\)\.(insert|update|delete)/);
});

test("project invite Edge Function requires JWT and service-role mediation",()=>{
  assert.match(edge,/callerClient\.auth\.getUser\(\)/);
  assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge,/service_register_project_member_invite_v1/);
  assert.match(edge,/service_resolve_project_invite_user_v1/);
  assert.match(edge,/inviteUserByEmail/);
  assert.match(edge,/signInWithOtp/);
});
