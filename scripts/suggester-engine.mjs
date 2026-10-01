#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

async function readJson(filename,fallback={}){
  try{return JSON.parse(await readFile(filename,"utf8"));}catch{return fallback;}
}
const hash=value=>"sha256:"+createHash("sha256").update(String(value)).digest("hex");

function suggestion({source,type,priority,title,detail,automationClass="review-required",actionId=null,evidence=[]}){
  const fingerprint=hash(JSON.stringify({source,type,title,detail,actionId,evidence}));
  return {
    fingerprint,source,type,priority,title,detail,automationClass,actionId,evidence
  };
}

export function buildSuggesterFeed({
  config,
  guardian={},
  knowledge={},
  environment={},
  enforcer={},
  botsquad={},
  conductor={},
  previous={},
  generatedAt=new Date().toISOString()
}){
  const suggestions=[];

  const redundant=Number(guardian?.observed?.branches?.redundantBranchCount||0);
  if(redundant>0){
    suggestions.push(suggestion({
      source:"guardian",
      type:"branch-health",
      priority:"high",
      title:"Heal provably redundant branches",
      detail:`${redundant} branch(es) are classified by GUARDIAN as zero-unique-commit cleanup candidates.`,
      automationClass:"autonomous-safe",
      actionId:"heal-redundant-branches",
      evidence:["guardian.observed.branches.redundantBranches"]
    }));
  }

  const refinements=Number(guardian?.observed?.source?.safeRefinementCount||0);
  if(refinements>0){
    suggestions.push(suggestion({
      source:"guardian",
      type:"source-health",
      priority:"medium",
      title:"Apply byte-safe source streamlining",
      detail:`${refinements} safe normalization refinement(s) are available.`,
      automationClass:"autonomous-safe",
      actionId:"heal-byte-safe-source-noise",
      evidence:["guardian.observed.source.safeRefinements"]
    }));
  }

  for(const drift of guardian?.drift?.optimalConditionDrift||[]){
    suggestions.push(suggestion({
      source:"guardian",
      type:"blueprint-drift",
      priority:"high",
      title:"Resolve blueprint drift: "+String(drift.control||drift.dimension||"condition"),
      detail:JSON.stringify(drift),
      automationClass:"review-required",
      evidence:["guardian.drift.optimalConditionDrift"]
    }));
  }

  for(const item of environment?.reviewRequired||[]){
    suggestions.push(suggestion({
      source:"environment",
      type:"environment-adaptation",
      priority:"high",
      title:"Review ENVIRONMENT adaptation",
      detail:JSON.stringify(item),
      automationClass:"review-required",
      evidence:["environment.reviewRequired"]
    }));
  }

  for(const blocker of enforcer?.blockers||[]){
    suggestions.push(suggestion({
      source:"enforcer",
      type:"security-defence",
      priority:"critical",
      title:"Resolve ENFORCER blocker",
      detail:String(blocker),
      automationClass:"review-required",
      evidence:["enforcer.blockers"]
    }));
  }

  for(const review of enforcer?.reviews||[]){
    suggestions.push(suggestion({
      source:"enforcer",
      type:"security-review",
      priority:"high",
      title:"Review ENFORCER health condition",
      detail:String(review),
      automationClass:"review-required",
      evidence:["enforcer.reviews"]
    }));
  }

  for(const candidate of knowledge?.optimizationCandidates||[]){
    suggestions.push(suggestion({
      source:"knowledge",
      type:"learning-optimization",
      priority:"medium",
      title:"Review Knowledge optimization candidate",
      detail:JSON.stringify(candidate),
      automationClass:"review-required",
      evidence:["knowledge.optimizationCandidates"]
    }));
  }

  for(const recommendation of (botsquad?.recommendations||[]).slice(0,50)){
    suggestions.push(suggestion({
      source:"botsquad",
      type:"ai-optimization",
      priority:"medium",
      title:"Evaluate BOTSQUAD optimization",
      detail:typeof recommendation==="string"?recommendation:JSON.stringify(recommendation),
      automationClass:"review-required",
      evidence:["botsquad.recommendations"]
    }));
  }
  for(const recommendation of (botsquad?.uxEaseFeed||[]).slice(0,30)){
    suggestions.push(suggestion({
      source:"botsquad",
      type:"ux-ease",
      priority:"medium",
      title:"Evaluate UX ease suggestion",
      detail:typeof recommendation==="string"?recommendation:JSON.stringify(recommendation),
      automationClass:"review-required",
      evidence:["botsquad.uxEaseFeed"]
    }));
  }
  for(const recommendation of (botsquad?.functionEvolutionFeed||[]).slice(0,30)){
    suggestions.push(suggestion({
      source:"botsquad",
      type:"function-evolution",
      priority:"medium",
      title:"Evaluate function evolution suggestion",
      detail:typeof recommendation==="string"?recommendation:JSON.stringify(recommendation),
      automationClass:"review-required",
      evidence:["botsquad.functionEvolutionFeed"]
    }));
  }

  const unique=[];
  const seen=new Set();
  for(const item of suggestions){
    if(seen.has(item.fingerprint)) continue;
    seen.add(item.fingerprint);
    unique.push(item);
  }

  const priorityRank={critical:0,high:1,medium:2,low:3};
  unique.sort((a,b)=>
    (priorityRank[a.priority]??9)-(priorityRank[b.priority]??9) ||
    a.title.localeCompare(b.title)
  );

  const commands=unique
    .filter(item=>item.automationClass==="autonomous-safe"&&item.actionId)
    .map(item=>({
      actionId:item.actionId,
      automationClass:item.automationClass,
      fingerprint:item.fingerprint,
      sourceSuggestion:item.title
    }));

  const previousFingerprints=new Set((previous?.suggestions||[]).map(x=>x.fingerprint));
  return {
    schemaVersion:"datanest-suggester-feed-v1",
    generatedAt,
    authority:"optimization-advisory",
    productionAuthorization:false,
    conductor:{
      generatedAt:conductor?.generatedAt||null,
      allProcessesFresh:conductor?.allProcessesFresh??null,
      nextCommand:conductor?.nextCommand||null
    },
    sourceHealth:{
      guardianStatus:guardian?.status||"missing",
      guardianHealthScore:guardian?.health?.score??null,
      enforcerStatus:enforcer?.status||"missing",
      environmentCompatible:environment?.environmentCompatible??null,
      knowledgeItems:Number(knowledge?.itemCount||0),
      botsquadAvailable:botsquad?.schemaVersion==="datanest-botsquad-consolidated-feed-v1"
    },
    suggestions:unique,
    commands,
    summary:{
      total:unique.length,
      autonomousSafe:commands.length,
      reviewRequired:unique.filter(x=>x.automationClass!=="autonomous-safe").length,
      newSincePrevious:unique.filter(x=>!previousFingerprints.has(x.fingerprint)).length
    },
    controls:config?.controls||{}
  };
}

async function main(){
  const config=await readJson("config/suggester.tree.json",null);
  if(!config) throw new Error("Missing SUGGESTER config.");

  const guardian=await readJson(process.env.SUGGESTER_GUARDIAN_PATH||"/tmp/suggester/guardian.json",{});
  const knowledge=await readJson(process.env.SUGGESTER_KNOWLEDGE_PATH||"/tmp/suggester/knowledge.json",{});
  const environment=await readJson(process.env.SUGGESTER_ENVIRONMENT_PATH||"/tmp/suggester/environment.json",{});
  const enforcer=await readJson(process.env.SUGGESTER_ENFORCER_PATH||"/tmp/suggester/enforcer.json",{});
  const botsquad=await readJson(process.env.SUGGESTER_BOTSQUAD_PATH||"/tmp/suggester/botsquad.json",{});
  const conductor=await readJson(process.env.SUGGESTER_CONDUCTOR_PATH||"/tmp/suggester/conductor.json",{});
  const previous=await readJson(process.env.SUGGESTER_PREVIOUS_PATH||"/tmp/suggester/previous.json",{});

  const feed=buildSuggesterFeed({config,guardian,knowledge,environment,enforcer,botsquad,conductor,previous});
  await mkdir("suggester/feeds",{recursive:true});
  await writeFile("suggester/feeds/datanest.json",JSON.stringify(feed,null,2)+"\n");
  process.stdout.write(JSON.stringify(feed.summary,null,2)+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
