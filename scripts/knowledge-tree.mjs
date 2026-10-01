#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API="https://api.github.com";
const categories=[
  ["governance",/govern|audit|approval|certif|boundary|policy/i],
  ["security",/secur|auth|secret|rls|permission|vulnerab/i],
  ["ai",/\bai\b|model|inference|prompt|provider|llm/i],
  ["testing",/test|spec|acceptance|validation|verify/i],
  ["deployment",/deploy|release|pages|runtime|production|staging/i],
  ["maintenance",/maint|cleanup|cleaner|streamlin|declutter|noise/i],
  ["architecture",/architect|forge|supository|lineage|contract/i],
  ["data",/database|migration|supabase|storage|schema/i],
  ["ui",/\bui\b|ux|component|css|layout|visual/i]
];

function categoryFor(text){
  for(const [name,re] of categories) if(re.test(text)) return name;
  return "general";
}

function normalize(message=""){
  return String(message).split("\n")[0].trim();
}

async function gh(endpoint,token){
  const r=await fetch(API+endpoint,{headers:{
    Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"datanest-knowledge-tree",
    ...(token?{Authorization:"Bearer "+token}:{})
  }});
  if(!r.ok) throw new Error("GitHub fetch failed "+r.status+" "+endpoint);
  return r.json();
}

async function collect(repo,limit,token){
  const commits=await gh("/repos/"+repo+"/commits?sha=main&per_page="+limit,token);
  return commits.map(c=>{
    const title=normalize(c.commit?.message);
    return {
      repository:repo,
      sha:c.sha,
      title,
      category:categoryFor(title),
      committedAt:c.commit?.committer?.date||c.commit?.author?.date||null,
      url:c.html_url
    };
  });
}

function optimize(items){
  const byCategory=new Map();
  for(const item of items) byCategory.set(item.category,(byCategory.get(item.category)||0)+1);
  return [...byCategory.entries()]
    .sort((a,b)=>b[1]-a[1])
    .filter(([,count])=>count>=3)
    .map(([category,count])=>({
      category,
      signal:"repeated_change_theme",
      count,
      recommendation:"Review repeated "+category+" changes for reusable automation, shared contracts, or consolidation.",
      requiresHumanReview:true
    }));
}

export function buildFeeds(config,items){
  const generatedAt=new Date().toISOString();
  const optimizationCandidates=optimize(items);
  return config.feeds.map(feed=>({
    ...feed,
    body:{
      schemaVersion:"datanest-knowledge-feed-v1",
      target:feed.target,
      authority:feed.authority,
      productionAuthorization:false,
      certifiedMemory:false,
      generatedAt,
      sources:config.sources.map(s=>s.repository),
      items,
      optimizationCandidates
    }
  }));
}

async function main(){
  const config=JSON.parse(await readFile("config/knowledge-tree.json","utf8"));
  const token=process.env.GITHUB_TOKEN||"";
  const limit=config.window?.commitLimitPerRepository||50;
  const all=[];
  for(const source of config.sources){
    if(config.excludedRepositories.includes(source.repository)) continue;
    all.push(...await collect(source.repository,limit,token));
  }
  const feeds=buildFeeds(config,all);
  for(const feed of feeds){
    await mkdir(path.dirname(feed.path),{recursive:true});
    await writeFile(feed.path,JSON.stringify(feed.body,null,2)+"\n");
  }
  await mkdir("knowledge",{recursive:true});
  await writeFile("knowledge/index.json",JSON.stringify({
    schemaVersion:config.schemaVersion,
    generatedAt:new Date().toISOString(),
    sourceRepositories:config.sources.map(s=>s.repository),
    itemCount:all.length,
    categoryCounts:Object.fromEntries(config.categories.map(c=>[c,all.filter(i=>i.category===c).length])),
    feedPaths:feeds.map(f=>f.path)
  },null,2)+"\n");
  console.log(JSON.stringify({items:all.length,feeds:feeds.map(f=>f.path)},null,2));
}

if(import.meta.url===new URL("file://"+process.argv[1]).href) main().catch(e=>{console.error(e);process.exitCode=1;});
