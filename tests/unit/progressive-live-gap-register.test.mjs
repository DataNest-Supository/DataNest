import test from "node:test";
import assert from "node:assert/strict";
import { buildProgressiveLiveGapRegister } from "../../scripts/write-progressive-live-gap-register.mjs";

test("progressive-live release records non-blocking human and technical gaps with deadlines",()=>{
  const now="2026-10-02T05:00:00.000Z";
  const register=buildProgressiveLiveGapRegister({
    DATANEST_UI_RELEASE_SHA:"e".repeat(40),
    DATANEST_UI_RELEASE_STATE:"progressive_live"
  },{generatedAt:now});
  assert.equal(register.releaseMode,"progressive_live");
  assert.equal(register.deploymentAllowed,true);
  assert.equal(register.gapCount,14);
  assert.ok(register.gaps.every((gap)=>gap.blocking===false));
  const visual=register.gaps.find((gap)=>gap.id==="human-evidence:visualReview");
  assert.equal(visual.proposedDeadline,"2026-10-03T05:00:00.000Z");
  const db=register.gaps.find((gap)=>gap.id==="technical:database-attestation");
  assert.equal(db.proposedDeadline,"2026-10-04T05:00:00.000Z");
  const edge=register.gaps.find((gap)=>gap.id==="technical:edge-function-release");
  assert.equal(edge.proposedDeadline,"2026-10-04T05:00:00.000Z");
});

test("non-progressive release modes do not manufacture progressive gaps",()=>{
  const register=buildProgressiveLiveGapRegister({
    DATANEST_UI_RELEASE_SHA:"f".repeat(40),
    DATANEST_UI_RELEASE_STATE:"authorized"
  },{generatedAt:"2026-10-02T05:00:00.000Z"});
  assert.equal(register.gapCount,0);
  assert.deepEqual(register.gaps,[]);
});
