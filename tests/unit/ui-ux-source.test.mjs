import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/components/DataNestApp.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(repoRoot, "src/app/globals.css"), "utf8");

test("mobile navigation keeps refresh and release controls reachable", () => {
  assert.match(appSource, /className="mobileNavActions"/);
  assert.match(appSource, />Refresh workspace<\/button>/);
  assert.match(appSource, /"Reload latest"/);
  assert.match(
    cssSource,
    /@media\(max-width:720px\)\{[\s\S]*?\.releaseAction,\.refreshAction\{display:none\}[\s\S]*?\.mobileNavActions\{display:grid/,
    "mobile replacement actions must appear when top-bar refresh controls are hidden"
  );
});

test("navigation remains scrollable without pushing mobile footer controls off-screen", () => {
  assert.match(
    cssSource,
    /\.navStack\{[^}]*flex:1 1 auto;min-height:0/,
    "navigation should consume remaining sidebar height and scroll independently"
  );
});

test("desktop AI dock cannot consume more than 42 percent of the viewport", () => {
  assert.match(
    cssSource,
    /\.externalAiDock\{[^}]*max-width:min\(760px,42vw\)/,
    "base desktop dock should preserve room for the DataNest workspace"
  );
  assert.doesNotMatch(
    cssSource,
    /\.appFrame\.aiDockOpen \.externalAiDock\{[^}]*max-width:none/,
    "mid-size desktop layout must not remove the dock width cap"
  );
});
