import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const nextOut=path.join(repoRoot,"out");
const appsOut=path.join(nextOut,"apps");
const configuredBase=(process.env.NEXT_PUBLIC_BASE_PATH||"").replace(/\/+$/,"");
const publicOrigin=(process.env.DATANEST_PUBLIC_ORIGIN||"").replace(/\/+$/,"");
const deliveryTarget=process.env.DATANEST_DELIVERY_TARGET||"github-pages";
const npmCommand=process.platform==="win32"?"npm.cmd":"npm";

const apps=[
  {slug:"career-compass",name:"Career Compass",source:"apps/ronsas/career-compass",output:"dist",kind:"simple"},
  {slug:"creative-studio",name:"Creative Studio",source:"apps/ronsas/creative-studio",output:"dist",kind:"vite"},
  {slug:"epublisher",name:"ePublisher",source:"apps/ronsas/epublisher",output:"dist",kind:"vite"},
  {slug:"lyricsync-studio",name:"LyricSync Studio",source:"apps/ronsas/lyricsync-studio",output:"dist",kind:"simple"},
  {slug:"scene-song-spark",name:"Scene Song Spark",source:"apps/ronsas/scene-song-spark",output:"dist",kind:"simple"},
  {slug:"sovereign-forge",name:"SovereignForge",source:"apps/ronsas/sovereign-forge",output:"dist",kind:"simple"},
  {slug:"syncvision",name:"Sync Vision",source:"apps/ronsas/syncvision",output:"dist/client",kind:"vite"},
];

function run(command,args,cwd){
  const result=spawnSync(command,args,{
    cwd,
    stdio:"inherit",
    env:{...process.env,CI:process.env.CI||"true"}
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

await access(nextOut);
await rm(appsOut,{recursive:true,force:true});
await mkdir(appsOut,{recursive:true});

const manifest=[];
for(const app of apps){
  const sourceDir=path.join(repoRoot,app.source);
  const appBase=`${configuredBase}/apps/${app.slug}/`;

  if(app.kind==="vite"){
    run(npmCommand,["ci","--no-audit","--no-fund"],sourceDir);
    run(npmCommand,["run","build","--",`--base=${appBase}`],sourceDir);
  }else{
    run(process.execPath,["scripts/build.mjs"],sourceDir);
  }

  const builtDir=path.join(sourceDir,app.output);
  await access(path.join(builtDir,"index.html"));
  const targetDir=path.join(appsOut,app.slug);
  await mkdir(targetDir,{recursive:true});
  await cp(builtDir,targetDir,{recursive:true});

  manifest.push({
    slug:app.slug,
    name:app.name,
    source:app.source,
    path:`${appBase}`,
    hosting:deliveryTarget
  });
}

const hubPath=`${configuredBase}/apps/`;
const datanestPath=configuredBase?`${configuredBase}/`:"/";
const hubCards=manifest.map(app=>`<a class="app" href="${app.path}"><strong>${app.name}</strong><span>Open application →</span></a>`).join("");
const hubHtml=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RONSAS · Resonance DataNest</title>
<meta name="description" content="Governed RONSAS applications hosted by Resonance DataNest.">
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#05070b;color:#edf8ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -10%,#142131 0,#071018 38%,#05070b 70%);padding:40px 20px}main{max-width:980px;margin:0 auto}.eyebrow{letter-spacing:.16em;text-transform:uppercase;color:#65e8ff;font-size:12px}.head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:18px 0 30px}h1{font-size:clamp(36px,8vw,70px);margin:0;line-height:.95}p{color:#a6becf;max-width:680px;line-height:1.6}.back{color:#65e8ff;text-decoration:none;border:1px solid #214453;border-radius:999px;padding:10px 14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.app{min-height:128px;padding:20px;border:1px solid #1b3440;border-radius:16px;background:linear-gradient(145deg,rgba(24,44,57,.68),rgba(9,15,23,.92));color:#edf8ff;text-decoration:none;display:flex;flex-direction:column;justify-content:space-between}.app:hover,.app:focus-visible{border-color:#65e8ff;outline:none;box-shadow:0 0 32px rgba(101,232,255,.08)}.app strong{font-size:18px}.app span{color:#8fb6ca;font-size:13px}</style>
</head>
<body>
<main>
<div class="eyebrow">RESONANCE · DATANEST GOVERNED APPLICATIONS</div>
<div class="head"><div><h1>RONSAS</h1><p>Resonance Open Nova Sovereign Application Suite. Applications are hosted under the same DataNest delivery authority and public origin.</p></div><a class="back" href="${datanestPath}">← DataNest</a></div>
<section class="grid" aria-label="RONSAS applications">${hubCards}</section>
</main>
</body>
</html>`;
await writeFile(path.join(appsOut,"index.html"),hubHtml,"utf8");

await writeFile(
  path.join(appsOut,"manifest.json"),
  JSON.stringify({
    contract:"datanest-ronsas-apps@1",
    generatedAt:new Date().toISOString(),
    publicOrigin,
    deliveryTarget,
    hubPath,
    apps:manifest
  },null,2)+"\n",
  "utf8"
);

console.log(`Bundled ${manifest.length} RONSAS apps into ${path.relative(repoRoot,appsOut)}.`);
