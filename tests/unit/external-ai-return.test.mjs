import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("clipboard candidate keeps only a new external AI response", async () => {
  let mod = null;
  try {
    mod = await import("../../src/lib/externalAiClipboard.ts");
  } catch {
    mod = null;
  }

  assert.equal(
    typeof mod?.selectExternalAiClipboardCandidate,
    "function",
    "expected selectExternalAiClipboardCandidate to exist"
  );

  const select = mod.selectExternalAiClipboardCandidate;
  const handoff = "RESONANCE DATANEST — LIVE EXTERNAL AI HANDOFF\n[DATANEST TRACKING HEADER]";

  assert.equal(
    select({
      clipboardText: "Completed external AI result",
      currentResponse: "",
      blockedTexts: [handoff]
    }),
    "Completed external AI result"
  );
  assert.equal(select({ clipboardText: "   ", currentResponse: "", blockedTexts: [] }), null);
  assert.equal(select({ clipboardText: handoff, currentResponse: "", blockedTexts: [handoff] }), null);
  assert.equal(
    select({
      clipboardText: "Completed external AI result",
      currentResponse: "Completed external AI result",
      blockedTexts: []
    }),
    null
  );
});

test("Return to DataNest is an always-visible dock footer, not a scrolling-body child", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/components/ExternalAiSidebar.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /className="externalAiReturnDock externalAiImport"/,
    "expected a dedicated Return to DataNest dock footer"
  );
  assert.doesNotMatch(
    source,
    /\{sessionId&&<form className="externalAiReturnDock externalAiImport"/,
    "Return to DataNest must render even before a session is opened"
  );
  assert.match(
    source,
    /<\/div>\s*\n\s*<form className="externalAiReturnDock externalAiImport"/,
    "Return to DataNest must sit after the scrolling AI dock body"
  );
});
