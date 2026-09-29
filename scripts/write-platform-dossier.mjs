import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const root=resolve(process.cwd());
const target=resolve(process.argv[2]||"public/platform-dossier.json");
const releaseCommit=process.env.DATANEST_RELEASE_SHA||process.env.GITHUB_SHA||"local";

function walk(dir){
  const absolute=resolve(root,dir);
  const items=[];
  for(const name of readdirSync(absolute).sort()){
    const full=resolve(absolute,name);
    const stat=statSync(full);
    if(stat.isDirectory())items.push(...walk(relative(root,full)));
    else if(stat.isFile())items.push(relative(root,full));
  }
  return items;
}
function normalize(path){return path.split(sep).join("/");}
function kind(path){
  if(path==="README.md")return "platform_overview";
  if(path.startsWith("docs/"))return "controlled_document";
  if(path.startsWith("public/transparency/"))return "published_transparency";
  return "other";
}

const sourcePaths=["README.md",...walk("docs"),...walk("public/transparency")]
  .map(normalize)
  .filter((value,index,array)=>array.indexOf(value)===index)
  .sort();

const documents=sourcePaths.map(path=>{
  const bytes=readFileSync(resolve(root,path));
  return {
    path,
    kind:kind(path),
    bytes:bytes.length,
    sha256:createHash("sha256").update(bytes).digest("hex")
  };
});

const manifest={
  project:"Resonance DataNest",
  dossierVersion:"platform-review-dossier-opportunity-v1",
  releaseCommit,
  generatedAt:new Date().toISOString(),
  documentCount:documents.length,
  documents
};

mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(manifest,null,2)+"\n","utf8");
console.log("Wrote platform dossier index",target,"with",documents.length,"documents");
