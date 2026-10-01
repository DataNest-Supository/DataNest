import test from "node:test";
import assert from "node:assert/strict";
import { findFindings, selfTest, SCANNER_VERSION } from "../../scripts/resonance-secret-scan.mjs";

test("uses the repository-owned Resonance Secret Integrity contract", () => {
  assert.equal(SCANNER_VERSION, "resonance-secret-integrity-v1");
  selfTest();
});

test("detects high-confidence secret forms", () => {
  const findings = findFindings(
    [
      "AWS_ACCESS_KEY_ID=" + "AKIA" + "1234567890ABCDEF",
      "-----BEGIN " + "PRIVATE KEY-----",
      "client" + "_secret = " + String.fromCharCode(34) + ["this","is","a","real","looking","secret","value","123"].join("-") + String.fromCharCode(34),
    ].join("\n"),
    "fixture/example.txt"
  );
  assert.ok(findings.some((item) => item.rule === "secret:aws-access-key"));
  assert.ok(findings.some((item) => item.rule === "secret:private-key-block"));
  assert.ok(findings.some((item) => item.rule === "secret:generic-assignment"));
  assert.ok(findings.every((item) => !item.detail.includes("real-looking-secret-value")));
});

test("ignores explicit placeholder credentials", () => {
  const findings = findFindings(
    "client_secret = " + String.fromCharCode(34) + "YOUR_SECRET_HERE_1234567890" + String.fromCharCode(34),
    "fixture/placeholder.txt"
  );
  assert.equal(findings.length, 0);
});
