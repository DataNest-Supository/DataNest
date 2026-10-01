import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("native protection evidence template is structurally valid", () => {
  const template = JSON.parse(fs.readFileSync("evidence/native-protection/EVIDENCE-TEMPLATE.json", "utf8"));
  assert.equal(template.schemaVersion, "datanest-native-protection-evidence-v1");
  assert.equal(template.result, "protected");
  assert.equal(template.evidenceSource, "GitHub-native ruleset observation");
  assert.deepEqual(template.refs, ["main", "release/**"]);
  assert.equal(template.rulesets.length, 2);
  for (const ruleset of template.rulesets) {
    assert.equal(ruleset.enforcement, "active");
    assert.ok(Array.isArray(ruleset.targetPatterns));
    assert.ok(Array.isArray(ruleset.ruleTypes));
    assert.ok(Array.isArray(ruleset.requiredStatusChecks));
  }
});
