import test from "node:test";
import assert from "node:assert/strict";
import { classifyPath, loadBoundary } from "../../scripts/lib/repository-boundary.mjs";

const boundary = loadBoundary();

test("boundary contract fails closed for unclassified paths", () => {
  assert.equal(classifyPath("unclassified-control-plane/new.yml", boundary).policy, "unclassified");
});

test("boundary protects explicit canonical-only release/governance files", () => {
  for (const path of [
    "scripts/write-release-manifest.mjs",
    "scripts/write-ui-governance-evidence.mjs",
    "config/worktree-gate-timeframes.json"
  ]) {
    assert.equal(classifyPath(path, boundary).policy, "canonical_only");
  }
});

test("boundary keeps Mirror control-plane files out of promotion", () => {
  for (const path of [
    ".github/workflows/sync-canonical.yml",
    ".github/workflows/production-candidate.yml",
    "scripts/mirror-test-suite.mjs",
    "config/mirror-rd-policy.json"
  ]) {
    assert.equal(classifyPath(path, boundary).policy, "mirror_only");
  }
});

test("boundary permits application paths after protected matches", () => {
  for (const path of [
    "apps/ronsas/creative-studio/src/pages/Admin.tsx",
    "src/components/SomeNewFeature.tsx",
    "supabase/migrations/20261001000000_candidate.sql"
  ]) {
    assert.equal(classifyPath(path, boundary).policy, "promotable");
  }
});
