import test from "node:test";
import assert from "node:assert/strict";
import { encryptBackup, decryptBackup } from "../../scripts/lib/encrypted-backup.mjs";

test("staging backup encryption round-trips and does not expose plaintext", () => {
  const key=Buffer.alloc(32,7);
  const plaintext=Buffer.from(JSON.stringify({events:[{content:"sensitive raw input"}]}));
  const encrypted=encryptBackup(plaintext,key);
  assert.equal(encrypted.includes("sensitive raw input"),false);
  assert.deepEqual(decryptBackup(encrypted,key),plaintext);
});
