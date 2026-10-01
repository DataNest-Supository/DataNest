import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const githubPrincipals = [
  "@RESONANCE36912",
  "@RESONANCEAPPDEV",
  "@ASHLEYTUYS",
  "@ASHLEYUYS"
];

const declaredIdentifiers = [
  "https://resonance-podcast.com",
  "https://medi-tech.life",
  "https://reson8.life",
  "ASHLEYUYS@MEDI-TECH.LIFE",
  "RESONANCE.36912@GMAIL.COM"
];

test("ownership registry contains all declared ownership identities", () => {
  const codeowners = fs.readFileSync(".github/CODEOWNERS", "utf8");
  const ownership = fs.readFileSync("docs/governance/OWNERSHIP.md", "utf8");

  for (const principal of githubPrincipals) {
    assert.ok(codeowners.includes(principal), `CODEOWNERS missing ${principal}`);
    assert.ok(ownership.includes(principal), `OWNERSHIP registry missing ${principal}`);
  }

  for (const identifier of declaredIdentifiers) {
    assert.ok(ownership.includes(identifier), `OWNERSHIP registry missing ${identifier}`);
  }
});
