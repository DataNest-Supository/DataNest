import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptBackup,
  decryptBackup,
  validateRestoreRefs
} from "../../scripts/lib/encrypted-backup.mjs";

test("staging backup encryption round-trips and does not expose plaintext", () => {
  const key=Buffer.alloc(32,7);
  const plaintext=Buffer.from(JSON.stringify({events:[{content:"sensitive raw input"}]}));
  const encrypted=encryptBackup(plaintext,key);
  assert.equal(encrypted.includes("sensitive raw input"),false);
  assert.deepEqual(decryptBackup(encrypted,key),plaintext);
});


test("replacement staging project can restore an original staging backup", () => {
  assert.doesNotThrow(() => validateRestoreRefs({
    backupSourceRef:"staging-original",
    expectedSourceRef:"staging-original",
    targetRef:"staging-replacement",
    configuredStagingRef:"staging-replacement",
    productionRef:"production"
  }));
});

test("restore ref validation still rejects production and source mismatches", () => {
  assert.throws(() => validateRestoreRefs({
    backupSourceRef:"staging-original",
    expectedSourceRef:"staging-original",
    targetRef:"production",
    configuredStagingRef:"production",
    productionRef:"production"
  }),/production/i);
  assert.throws(() => validateRestoreRefs({
    backupSourceRef:"wrong-source",
    expectedSourceRef:"staging-original",
    targetRef:"staging-replacement",
    configuredStagingRef:"staging-replacement",
    productionRef:"production"
  }),/source/i);
});
