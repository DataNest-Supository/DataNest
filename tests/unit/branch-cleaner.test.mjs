import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyBranch,
  evaluateSupabaseProject,
  extractAuditIds,
  getStrictBlockers,
  migrationNameFromFile,
  compareMigrationParity,
  normalizeBranchFamily,
} from "../../scripts/branch-cleaner.mjs";

const config = {
  baseBranch: "main",
  staleDays: 14,
  protectedPatterns: ["^main$", "^release/"],
};
const now = new Date("2026-09-26T18:00:00Z");

test("normalizes iterative branch families without conflating the feature stem", () => {
  assert.equal(normalizeBranchFamily("feat/datanest-ai-command-context-lock-v4"), "feat/datanest-ai-command-context-lock");
  assert.equal(normalizeBranchFamily("fix/staging-routing-current-main-20260925"), "fix/staging-routing");
});

test("extracts unique audit IDs", () => {
  assert.deepEqual(extractAuditIds("AUD-003 then AUD-010 and AUD-003"), ["AUD-003", "AUD-010"]);
});

test("never marks the base branch for deletion", () => {
  const result = classifyBranch({ name:"main", updatedAt:"2026-01-01T00:00:00Z", compare:{ ahead_by:0 } }, config, now);
  assert.equal(result.decision, "keep");
  assert.equal(result.reason, "protected");
});

test("keeps branches with open pull requests", () => {
  const result = classifyBranch({ name:"feat/live", openPr:true, updatedAt:"2026-01-01T00:00:00Z", compare:{ ahead_by:0 } }, config, now);
  assert.equal(result.decision, "keep");
  assert.equal(result.reason, "open_pr");
});

test("proposes deletion immediately when a branch has no unique commits", () => {
  const result = classifyBranch({ name:"fix/merged", mergedPr:true, updatedAt:"2026-09-26T17:59:00Z", compare:{ ahead_by:0, behind_by:8, status:"behind" } }, config, now);
  assert.equal(result.decision, "delete_candidate");
  assert.equal(result.reason, "merged_no_unique_commits");
});

test("does not delete a branch that has post-merge unique commits", () => {
  const result = classifyBranch({ name:"fix/merged-but-changed", mergedPr:true, updatedAt:"2026-09-01T00:00:00Z", compare:{ ahead_by:2, behind_by:5 } }, config, now);
  assert.equal(result.decision, "review");
  assert.equal(result.reason, "post_merge_unique_commits");
});

test("flags a failed default Supabase branch as a blocker", () => {
  const checks = evaluateSupabaseProject({
    project:{ status:"ACTIVE_HEALTHY" },
    branches:[{ name:"main", git_branch:"main", is_default:true, status:"MIGRATIONS_FAILED" }],
  }, { expectedGitBranch:"main" });
  assert.equal(checks[0].level, "blocker");
  assert.equal(checks[0].code, "supabase_branch_failure");
});

test("compare uncertainty can never become a delete candidate", () => {
  const result = classifyBranch({ name:"fix/unknown", updatedAt:"2026-01-01T00:00:00Z", compare:{ status:"unknown", ahead_by:null } }, config, now);
  assert.equal(result.decision, "keep");
  assert.equal(result.reason, "active_or_unresolved");
});

test("strict blockers are resolved before destructive apply", () => {
  const blockers = getStrictBlockers({
    globalChecks: [],
    projects: [{
      checks: [{
        level:"blocker",
        code:"supabase_branch_failure",
        detail:"main: MIGRATIONS_FAILED",
      }],
    }],
  });
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].code, "supabase_branch_failure");
});

test("migration parity reports missing and version-drifted history", () => {
  assert.equal(
    migrationNameFromFile("20260924230000_datanest_ai_production.sql"),
    "datanest_ai_production"
  );
  const parity = compareMigrationParity(
    [
      "20260924230000_datanest_ai_production.sql",
      "external_ai_companion_mode.sql",
      "20260926061000_governed_product_catalog.sql",
    ],
    [
      { version:"20260924230805", name:"datanest_ai_production" },
      { version:"20260924163640", name:"external_ai_companion_mode" },
      { version:"20260926055810", name:"add_governed_product_catalog" },
      { version:"20260924111936", name:"bootstrap_resonance_datanest_control_plane" },
    ]
  );
  assert.deepEqual(parity.liveOnly, [
    "add_governed_product_catalog",
    "bootstrap_resonance_datanest_control_plane",
  ]);
  assert.deepEqual(parity.repoOnly, ["governed_product_catalog"]);
  assert.equal(parity.versionMismatches.length, 2);
  assert.deepEqual(
    parity.versionMismatches.map((item) => item.name).sort(),
    ["datanest_ai_production", "external_ai_companion_mode"]
  );
});

test("unknown branch recency can never become a delete candidate", () => {
  const result = classifyBranch({
    name:"fix/unknown-recency",
    updatedAt:null,
    compare:{ ahead_by:0, behind_by:12, status:"behind" },
  }, config, now);
  assert.equal(result.decision, "keep");
  assert.equal(result.reason, "active_or_unresolved");
  assert.equal(Number.isNaN(result.ageDays), true);
});

test("missing Supabase verification is a strict blocker", () => {
  const blockers = getStrictBlockers({
    skipped:true,
    projects:[],
    globalChecks:[{
      level:"blocker",
      code:"supabase_audit_unavailable",
      detail:"Supabase verification is required before strict destructive cleanup.",
    }],
  });
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].code, "supabase_audit_unavailable");
});
