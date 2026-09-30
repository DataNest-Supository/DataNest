import test from "node:test";
import assert from "node:assert/strict";
import { createRegistrySnapshot, digestSnapshot, validateRegistrySnapshot } from "../../lib/resonance-forge-registry.mjs";

const sha = "a".repeat(40);

test("snapshot is deterministic for identical inputs", () => {
  const a = createRegistrySnapshot({ repositories: { x: { b: 2, a: 1 } } }, "2026-09-30T00:00:00.000Z");
  const b = createRegistrySnapshot({ repositories: { x: { a: 1, b: 2 } } }, "2026-09-30T00:00:00.000Z");
  assert.equal(a.snapshotDigest, b.snapshotDigest);
});

test("snapshot validates its own digest", () => {
  const snapshot = createRegistrySnapshot({ candidates: {
    c1: { repository: "DataNest-Supository/DataNest", commitSha: sha, canonicalBaseSha: "b".repeat(40), environment: "candidate" }
  }}, "2026-09-30T00:00:00.000Z");
  assert.equal(validateRegistrySnapshot(snapshot).valid, true);
  assert.notEqual(digestSnapshot({...snapshot, repositories: { tampered: true }}), snapshot.snapshotDigest);
});

test("read-only projection cannot assert production authorization", () => {
  const snapshot = createRegistrySnapshot({ candidates: {
    c1: { repository: "DataNest-Supository/DataNest", commitSha: sha, canonicalBaseSha: "b".repeat(40), environment: "production", authorizationState: "production" }
  }}, "2026-09-30T00:00:00.000Z");
  assert.equal(validateRegistrySnapshot(snapshot).valid, false);
});
