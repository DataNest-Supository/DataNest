import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path){
  return fs.existsSync(path)?fs.readFileSync(path,"utf8"):"";
}

test("DataNest AI restores the animated hero and places active context below the command channel",()=>{
  const workspace=read("src/components/DataNestAiWorkspace.tsx");
  const app=read("src/components/DataNestApp.tsx");
  const css=read("src/app/datanest-ai-optimized.css");
  const layout=read("src/app/layout.tsx");

  assert.match(workspace,/className="datanestAiCommandSummary"/);
  assert.match(workspace,/Current objective/);
  assert.match(workspace,/Focus chat/);
  assert.match(workspace,/Inspect context/);
  assert.match(workspace,/className="datanestAiStatusCards"/);
  assert.match(workspace,/aria-label="DataNest AI operational status"/);

  const heroIndex=workspace.indexOf('datanestAiHero datanestAiHeroV2');
  const chatIndex=workspace.indexOf('className="datanestAiChatStage"');
  const commandIndex=workspace.indexOf('className="datanestAiCommandSummary"');
  const jobIndex=workspace.indexOf('className="panel datanestAiJobPicker"');
  const statusIndex=workspace.indexOf('className="datanestAiStatusCards"');
  const contextIndex=workspace.indexOf('className="datanestAiContextRail"');
  assert.ok(heroIndex<chatIndex&&chatIndex<commandIndex&&commandIndex<jobIndex&&jobIndex<statusIndex&&statusIndex<contextIndex,
    "DOM order must keep the animated hero visible and place Current Objective and Active Job context below the command channel");
  assert.doesNotMatch(workspace,/className="datanestAiOverviewDisclosure"/);
  assert.match(workspace,/datanestAiOrbitOne/);
  assert.match(workspace,/datanestAiPacket packetOne/);

  assert.match(app,/view!==\"ai\"&&workspaceTaskGuides\[view\]/);
  assert.match(workspace,/aria-label="Select active Job Manifest"/);

  assert.match(layout,/import "\.\/datanest-ai-optimized\.css";/);
  assert.match(css,/\.datanestAiHeroV2\s*\{[^}]*min-height:340px/s);
  assert.match(css,/\.datanestAiHeroV2 h2\s*\{[^}]*font-size:clamp\(40px,4\.4vw,64px\)/s);
  assert.match(css,/\.datanestAiStatusCards\s*\{/);
  assert.match(css,/\.aiCommandGuide\s*\{/);
});

test("DataNest AI command center keeps responsive and reduced-motion safeguards",()=>{
  const css=read("src/app/datanest-ai-optimized.css");

  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.datanestAiHeroVisual\s*\{[^}]*min-height:300px/s);
});


test("DataNest shell keeps navigation compact and the active workspace cyan-led on desktop",()=>{
  const css=read("src/app/datanest-ai-optimized.css");

  assert.match(css,/@media\(min-width:1181px\)\{[^}]*\.appFrame\{[^}]*grid-template-columns:252px minmax\(0,1fr\)/s);
  assert.match(css,/@media\(min-width:901px\) and \(max-width:1180px\)\{[^}]*\.appFrame:not\(\.aiDockOpen\)\{[^}]*grid-template-columns:252px minmax\(0,1fr\)/s);
  assert.match(css,/\.navGroup\s*\{[^}]*margin-bottom:12px/s);
  assert.match(css,/\.navGroup button\s*\{[^}]*padding:9px 10px/s);
  assert.match(css,/\.navGroup button\.active\s*\{[^}]*box-shadow:inset 2px 0 0 var\(--cyan\)/s);
});


test("DataNest AI removes the duplicate task guide while keeping Job-first chat controls",()=>{
  const app=read("src/components/DataNestApp.tsx");
  const workspace=read("src/components/DataNestAiWorkspace.tsx");
  const css=read("src/app/datanest-ai-optimized.css");

  assert.match(app,/view!==\"ai\"&&workspaceTaskGuides\[view\]/);
  assert.match(workspace,/id="datanest-ai-active-job"/);
  assert.match(workspace,/className="datanestAiChatStage"/);
  assert.match(workspace,/Focus chat/);
  assert.match(css,/\.datanestAiJobPicker\s*\{/);
  const chatPanel=read("src/components/DataNestAiChatPanel.tsx");
  const composerIndex=chatPanel.indexOf('className="datanestAiComposer"');
  const transcriptIndex=chatPanel.indexOf('className="datanestAiTranscript"');
  assert.ok(composerIndex>=0&&transcriptIndex>=0&&composerIndex<transcriptIndex,
    "composer DOM must precede transcript without CSS order overrides");
  assert.doesNotMatch(css,/\.datanestAiCommandConsole \.datanestAiComposer\s*\{[^}]*order:/s);
  assert.match(css,/\.datanestAiOverviewDisclosure\s*\{/);
});
