import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path){
  return fs.existsSync(path)?fs.readFileSync(path,"utf8"):"";
}

test("DataNest AI command center prioritizes active work above decorative hero content",()=>{
  const workspace=read("src/components/DataNestAiWorkspace.tsx");
  const app=read("src/components/DataNestApp.tsx");
  const css=read("src/app/datanest-ai-optimized.css");
  const layout=read("src/app/layout.tsx");

  assert.match(workspace,/className="datanestAiCommandSummary"/);
  assert.match(workspace,/Current objective/);
  assert.match(workspace,/Open AI workspace/);
  assert.match(workspace,/Inspect context/);
  assert.match(workspace,/className="datanestAiStatusCards"/);
  assert.match(workspace,/aria-label="DataNest AI operational status"/);

  assert.match(app,/className=\{"workspaceTaskGuide "\+\(view==="ai"\?" aiCommandGuide":""\)\}/);
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


test("DataNest command center keeps navigation compact and gives the AI task guide a direct Job selector action",()=>{
  const app=read("src/components/DataNestApp.tsx");
  const css=read("src/app/globals.css");

  assert.match(app,/className="workspaceTaskGuideAction"/);
  assert.match(app,/>Select Job Manifest <span aria-hidden="true">→<\/span><\/button>/);
  assert.match(app,/document\.getElementById\("datanest-ai-active-job"\)/);
  assert.match(app,/if\(!target\)\{\s*setView\("unifi"\);\s*return;\s*\}/s);

  assert.match(css,/\/\* Command-center navigation density \*\//);
  assert.match(css,/\.appFrame\{[^}]*grid-template-columns:252px minmax\(0,1fr\)/s);
  assert.match(css,/\.appFrame\.aiDockOpen\{[^}]*grid-template-columns:252px minmax\(0,1fr\) auto/s);
  assert.match(css,/\.navGroup button\.active\{[^}]*inset 3px 0 0 var\(--cyan\)/s);
  assert.match(css,/\.workspaceTaskGuideAction\s*\{/);
  assert.match(css,/@media\(min-width:1181px\)\{[^}]*\.appFrame\.aiDockOpen\{[^}]*grid-template-columns:252px minmax\(0,1fr\) auto/s);
  assert.match(css,/@media\(min-width:901px\) and \(max-width:1180px\)\{[^}]*\.appFrame:not\(\.aiDockOpen\)\{[^}]*grid-template-columns:252px minmax\(0,1fr\)/s);
});
