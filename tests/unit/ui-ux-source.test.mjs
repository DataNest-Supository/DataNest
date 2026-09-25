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

test("workspace navigation persists in the URL and follows browser history", () => {
  assert.match(appSource, /const viewKeys = new Set<ViewKey>/);
  assert.match(appSource, /searchParams\.get\("view"\)/);
  assert.match(appSource, /searchParams\.set\("view",next\)/);
  assert.match(appSource, /history\.pushState/);
  assert.match(appSource, /addEventListener\("popstate",syncViewFromUrl\)/);
  assert.match(appSource, /removeEventListener\("popstate",syncViewFromUrl\)/);
});

test("workspace navigation canonicalizes overview and invalid view URLs", () => {
  assert.match(
    appSource,
    /requested&&\(!valid\|\|requested==="overview"\)[\s\S]*?searchParams\.delete\("view"\)[\s\S]*?history\.replaceState/,
    "overview and invalid workspace parameters should be cleaned without creating a history loop"
  );
});

test("mobile navigation exposes menu relationships and closes with Escape", () => {
  assert.match(appSource, /id="datanest-navigation" aria-label="DataNest navigation"/);
  assert.match(appSource, /aria-controls="datanest-navigation" aria-expanded=\{mobileOpen\}/);
  assert.match(appSource, /aria-label="Project workspaces"/);
  assert.match(appSource, /event\.key==="Escape"/);
});


test("mobile operational tables become labeled cards without forced horizontal widths", () => {
  assert.match(appSource, /className="jobTableRow"[\s\S]*?data-label="Job"[\s\S]*?data-label="Title"[\s\S]*?data-label="Status"/);
  assert.match(appSource, /className="schedulerRow" key=\{job\.id\}[\s\S]*?data-label="Job"[\s\S]*?data-label="Controls"/);
  assert.match(appSource, /className="dataRow" key=\{run\.id\}[\s\S]*?data-label="Run"[\s\S]*?data-label="Started"/);
  assert.match(
    cssSource,
    /@media\(max-width:720px\)\{[\s\S]*?\.jobTable,\.schedulerTable,\.dataTable\{overflow:visible!important\}[\s\S]*?min-width:0!important[\s\S]*?content:attr\(data-label\)/,
    "mobile operational rows should be self-contained labeled cards rather than horizontal tables"
  );
});


test("quick switch command palette is keyboard accessible and searchable", () => {
  assert.match(appSource, /aria-label="Quick switch DataNest workspace"/);
  assert.match(appSource, /aria-label="Search DataNest workspaces"/);
  assert.match(appSource, /event\.ctrlKey\|\|event\.metaKey/);
  assert.match(appSource, /event\.key\.toLowerCase\(\)==="k"/);
  assert.match(appSource, /aria-keyshortcuts="Control\+K Meta\+K"/);
  assert.match(appSource, /viewDescriptions\[item\.key\]/);
  assert.match(appSource, /commandInputRef\.current\?\.focus\(\)/);
});

test("quick switch preserves canonical workspace navigation", () => {
  assert.match(appSource, /onClick=\{\(\)=>chooseCommandView\(item\.key\)\}/);
  assert.match(appSource, /function chooseCommandView\(nextView:ViewKey\)[\s\S]*?setView\(nextView\)[\s\S]*?closeCommandPalette\(\)/);
});


test("mobile scheduler uses a compact status select while desktop keeps filter chips", () => {
  assert.match(appSource, /className="schedulerFilterMobile"/);
  assert.match(appSource, /aria-label="Status filter"/);
  assert.match(appSource, /className="filterBar schedulerFilterDesktop"/);
  assert.match(
    cssSource,
    /@media\(max-width:720px\)\{[\s\S]*?\.schedulerFilterDesktop\{display:none\}[\s\S]*?\.schedulerFilterMobile\{display:grid/,
    "mobile should replace the chip grid with a compact select"
  );
});


test("quick switch traps modal focus and restores focus to its opener", () => {
  assert.match(appSource, /commandReturnFocusRef/);
  assert.match(appSource, /function closeCommandPalette\(\)/);
  assert.match(appSource, /function trapCommandFocus\(/);
  assert.match(appSource, /onKeyDown=\{trapCommandFocus\}/);
  assert.match(appSource, /commandReturnFocusRef\.current\?\.focus\(\)/);
});


test("quick switch opens the first search result with Enter", () => {
  assert.match(appSource, /function handleCommandSearchKeyDown\(/);
  assert.match(appSource, /event\.key==="Enter"/);
  assert.match(appSource, /commandItems\[0\]/);
  assert.match(appSource, /chooseCommandView\(commandItems\[0\]\.key\)/);
});


test("quick switch Enter does nothing for an empty search", () => {
  assert.match(appSource, /commandQuery\.trim\(\)/);
});


test("quick switch supports arrow-key result selection before Enter", () => {
  assert.match(appSource, /commandActiveIndex/);
  assert.match(appSource, /event\.key==="ArrowDown"/);
  assert.match(appSource, /event\.key==="ArrowUp"/);
  assert.match(appSource, /commandItems\[commandActiveIndex\]/);
  assert.match(appSource, /aria-selected=\{commandActiveIndex===index\}/);
});
