import {access,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import registry from "../src/lib/ronsasAppRegistry.json" with {type:"json"};

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const base=(process.env.NEXT_PUBLIC_BASE_PATH||"/DataNest").replace(/\/+$/,"");
const origin=process.env.RONSAS_PAGES_ORIGIN||"https://datanest-supository.github.io";
const staticApps=registry.filter(app=>app.kind==="static");
const expected=staticApps.map(app=>app.slug).sort();
const liveOnly=process.argv.includes("--live-only");
const manifest=liveOnly?null:JSON.parse(await readFile(path.join(root,"out/apps/manifest.json"),"utf8"));
const actual=manifest?.apps.map(app=>app.slug).sort();
if(!liveOnly&&JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Static manifest mismatch: ${actual?.join(",")} vs ${expected.join(",")}`);

for(const app of staticApps){
  const launch=`${base}/apps/${app.slug}/`;
  if(!liveOnly&&manifest.apps.find(item=>item.slug===app.slug)?.path!==launch)throw new Error(`Incorrect launch path: ${app.slug}`);
  const index=path.join(root,"out/apps",app.slug,"index.html");
  const response=liveOnly?await fetch(new URL(launch,origin),{redirect:"follow"}):null;
  if(response&&(response.status!==200||new URL(response.url).origin!==new URL(origin).origin))throw new Error(`Live launch failed: ${launch} (${response.status}, ${response.url})`);
  const html=liveOnly?await response.text():await readFile(index,"utf8");
  if(!/<html\b/i.test(html))throw new Error(`Missing HTML shell: ${app.slug}`);
  const assets=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)]
    .map(match=>match[1]).filter(value=>!/^https?:\/\//.test(value));
  for(const asset of assets){
    const assetUrl=new URL(asset,`https://example.invalid${launch}`);
    if(assetUrl.origin!=="https://example.invalid")throw new Error(`External asset in ${app.slug}: ${asset}`);
    if(!liveOnly)await access(path.join(root,"out",decodeURIComponent(assetUrl.pathname).replace(/^\//,"").replace(new RegExp(`^${base.replace(/^\//,"")}/`),"")));
  }
  if(liveOnly){
    for(const asset of assets){
      const assetResponse=await fetch(new URL(asset,new URL(launch,origin)),{redirect:"follow"});
      if(assetResponse.status!==200||new URL(assetResponse.url).origin!==new URL(origin).origin||!(await assetResponse.arrayBuffer()).byteLength){
        throw new Error(`Live asset failed: ${app.slug} ${asset}`);
      }
    }
  }
}
console.log(`Verified ${staticApps.length} static RONSAS ${liveOnly?"live routes":"app bundles"}.`);
