#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const args=process.argv.slice(2);
const arg=(name,fallback=null)=>{
  const i=args.indexOf(name);
  return i>=0 ? args[i+1] : fallback;
};

async function readJson(filename,fallback=null){
  if(!filename) return fallback;
  try{return JSON.parse(await readFile(filename,"utf8"));}catch{return fallback;}
}
async function exists(filename){
  try{await access(filename);return true;}catch{return false;}
}
const sha256=value=>"sha256:"+createHash("sha256").update(String(value)).digest("hex");

async function sourceHashes(paths=[]){
  const out={};
  for(const filename of paths){
    try{
      const text=await readFile(filename,"utf8");
      out[filename]={sha256:sha256(text),bytes:Buffer.byteLength(text)};
    }catch(error){
      out[filename]={missing:true,error:error.code||error.message};
    }
  }
  return out;
}

function branchHealth(report={}){
  const branches=Array.isArray(report?.github?.branches)?report.github.branches:[];
  const redundant=branches
    .filter(x=>x?.classification?.decision==="delete_candidate")
    .map(x=>x.name);
  const review=branches
    .filter(x=>x?.classification?.decision==="review")
    .map(x=>({name:x.name,reason:x?.classification?.reason||"review"}));
  const unresolved=branches
    .filter(x=>x?.classification?.status==="unknown")
    .map(x=>x.name);
  return {
    branchCount:branches.length,
    redundantBranchCount:redundant.length,
    redundantBranches:redundant,
    reviewBranchCount:review.length,
    reviewBranches:review,
    unresolvedBranchCount:unresolved.length,
    unresolvedBranches:unresolved,
    cleanerMode:report?.mode||null,
    deleted:Array.isArray(report?.apply?.deleted)?report.apply.deleted:[],
    failed:Array.isArray(report?.apply?.failed)?report.apply.failed:[]
  };
}

function codeHealth(report={}){
  const summary=report?.summary||{};
  const findings=Array.isArray(report?.nextSteps)?report.nextSteps:[];
  const refinements=Array.isArray(report?.refinements)?report.refinements:[];
  return {
    filesReviewed:Number(summary.filesReviewed||0),
    high:Number(summary.high||0),
    medium:Number(summary.medium||0),
    low:Number(summary.low||0),
    findings:Number(summary.findings||0),
    safeRefinementCount:refinements.length,
    safeRefinements:refinements,
    redundancyCandidates:findings
      .filter(x=>["workflow-deduplication","code-structure","maintenance"].includes(x.category))
      .slice(0,50)
  };
}

function environmentHealth(blueprint,environment={}){
  const findings=Array.isArray(environment?.findings)?environment.findings:[];
  const byDimension=Object.fromEntries(findings.map(x=>[x.dimension,x]));
  const required=blueprint?.environment?.requiredDimensions||[];
  const requiredStatus=blueprint?.environment?.requiredStatus||"compatible";
  const drift=[];
  const dimensions={};
  for(const dimension of required){
    const item=byDimension[dimension]||null;
    const status=item?.status||"missing";
    dimensions[dimension]={
      status,
      detail:item?.detail||null,
      adaptationClass:item?.adaptationClass||null
    };
    if(status!==requiredStatus) drift.push({
      dimension,
      expected:requiredStatus,
      observed:status,
      detail:item?.detail||"Required ENVIRONMENT dimension is missing."
    });
  }
  if(blueprint?.environment?.requiredCompatible===true && environment?.environmentCompatible!==true){
    drift.push({
      dimension:"environmentCompatible",
      expected:true,
      observed:environment?.environmentCompatible??null,
      detail:"ENVIRONMENT has not declared the current operating conditions fully compatible."
    });
  }
  return {
    available:environment?.schemaVersion==="datanest-environment-feed-v1",
    compatible:environment?.environmentCompatible===true,
    dimensions,
    drift,
    reviewRequired:Array.isArray(environment?.reviewRequired)?environment.reviewRequired:[]
  };
}

function compareSnapshots(previous,currentSources,currentDimensions){
  if(!previous) return {previousAvailable:false,sourceChanges:[],environmentChanges:[]};
  const prevSources=previous?.blueprint?.sourceHashes||{};
  const sourceChanges=[];
  for(const [filename,state] of Object.entries(currentSources||{})){
    const prior=prevSources[filename]||null;
    const before=prior?.sha256||null;
    const after=state?.sha256||null;
    if(before!==after) sourceChanges.push({path:filename,before,after});
  }

  const prevDims=previous?.observed?.environment?.dimensions||{};
  const environmentChanges=[];
  for(const [dimension,state] of Object.entries(currentDimensions||{})){
    const before=prevDims?.[dimension]?.status||null;
    const after=state?.status||null;
    if(before!==after) environmentChanges.push({dimension,before,after});
  }
  return {previousAvailable:true,sourceChanges,environmentChanges};
}

export function buildGuardianSnapshot({
  config,
  blueprint,
  environment={},
  enforcer={},
  knowledge={},
  botsquad={},
  branchReport={},
  reviewerReport={},
  previousSnapshot=null,
  sourceState={},
  treeContracts={},
  headSha=null,
  generatedAt=new Date().toISOString()
}){
  const checks=[];
  const optimalDrift=[];
  const health={score:0,max:100};

  const missingContracts=Object.entries(treeContracts)
    .filter(([,present])=>!present)
    .map(([id])=>id);
  const treesOk=missingContracts.length===0;
  checks.push({
    id:"tree-contracts",
    status:treesOk?"healthy":"critical",
    weight:15,
    earned:treesOk?15:0,
    detail:treesOk
      ?"All required specialized-tree contracts are present."
      :"Missing required tree contracts: "+missingContracts.join(", ")
  });
  health.score+=treesOk?15:0;
  if(!treesOk) optimalDrift.push({control:"tree-contracts",missing:missingContracts});

  const env=environmentHealth(blueprint,environment);
  const envOk=env.available && env.compatible && env.drift.length===0;
  const envPartial=env.available && env.drift.length>0;
  const envEarned=envOk?25:(envPartial?12:0);
  checks.push({
    id:"environment",
    status:envOk?"healthy":envPartial?"degraded":"critical",
    weight:25,
    earned:envEarned,
    detail:envOk
      ?"All required ENVIRONMENT dimensions match the optimal blueprint."
      :env.available
        ?`${env.drift.length} ENVIRONMENT condition(s) drift from the blueprint.`
        :"ENVIRONMENT feed is unavailable."
  });
  health.score+=envEarned;
  optimalDrift.push(...env.drift.map(x=>({control:"environment",...x})));

  const enforcerStatus=enforcer?.status||"missing";
  const enforcerEarned=enforcerStatus==="pass"?20:enforcerStatus==="review"?10:0;
  checks.push({
    id:"enforcer",
    status:enforcerStatus==="pass"?"healthy":enforcerStatus==="review"?"degraded":"critical",
    weight:20,
    earned:enforcerEarned,
    detail:"ENFORCER status: "+enforcerStatus
  });
  health.score+=enforcerEarned;
  if(enforcerStatus!=="pass") optimalDrift.push({control:"enforcer",expected:"pass",observed:enforcerStatus});

  const knowledgeItems=Number(knowledge?.itemCount ?? (Array.isArray(knowledge?.items)?knowledge.items.length:0));
  const knowledgeMin=Number(blueprint?.knowledge?.minimumApprovedItems||1);
  const knowledgeOk=
    knowledge?.schemaVersion==="datanest-knowledge-feed-v1" &&
    knowledgeItems>=knowledgeMin;
  checks.push({
    id:"knowledge",
    status:knowledgeOk?"healthy":"degraded",
    weight:10,
    earned:knowledgeOk?10:0,
    detail:knowledgeOk
      ?`Knowledge feed contains ${knowledgeItems} approved item(s).`
      :`Knowledge feed contains ${knowledgeItems} item(s); blueprint minimum is ${knowledgeMin}.`
  });
  health.score+=knowledgeOk?10:0;
  if(!knowledgeOk) optimalDrift.push({control:"knowledge",expectedMinimum:knowledgeMin,observed:knowledgeItems});

  const code=codeHealth(reviewerReport);
  const maxHigh=Number(blueprint?.sourceHealth?.maximumHighReviewerFindings||0);
  const codeOk=code.high<=maxHigh;
  checks.push({
    id:"source-health",
    status:codeOk?"healthy":"degraded",
    weight:10,
    earned:codeOk?10:0,
    detail:`${code.high} high, ${code.medium} medium, ${code.low} low reviewer finding(s); ${code.redundancyCandidates.length} streamlining candidate(s).`
  });
  health.score+=codeOk?10:0;
  if(!codeOk) optimalDrift.push({control:"source-health",maximumHigh:maxHigh,observedHigh:code.high});

  const branches=branchHealth(branchReport);
  const branchEarned=branches.reviewBranchCount===0 && branches.unresolvedBranchCount===0
    ? (branches.redundantBranchCount===0?10:8)
    : 5;
  checks.push({
    id:"branch-health",
    status:branchEarned===10?"healthy":branchEarned>=8?"healing":"degraded",
    weight:10,
    earned:branchEarned,
    detail:`${branches.branchCount} branch(es); ${branches.redundantBranchCount} safely redundant candidate(s), ${branches.reviewBranchCount} review branch(es), ${branches.unresolvedBranchCount} unresolved.`
  });
  health.score+=branchEarned;

  const botsquadAvailable=botsquad?.schemaVersion==="datanest-botsquad-consolidated-feed-v1";
  checks.push({
    id:"botsquad-feed",
    status:botsquadAvailable?"healthy":"degraded",
    weight:5,
    earned:botsquadAvailable?5:2,
    detail:botsquadAvailable
      ?`BOTSQUAD consolidated feed available from ${Number(botsquad?.botCount||0)} bot(s).`
      :"BOTSQUAD consolidated feed is not yet available."
  });
  health.score+=botsquadAvailable?5:2;

  const missingBlueprintSources=Object.entries(sourceState)
    .filter(([,state])=>state?.missing)
    .map(([filename])=>filename);
  const blueprintIntegrity=missingBlueprintSources.length===0;
  checks.push({
    id:"blueprint-integrity",
    status:blueprintIntegrity?"healthy":"critical",
    weight:5,
    earned:blueprintIntegrity?5:0,
    detail:blueprintIntegrity
      ?"All blueprint source files were snapshot successfully."
      :"Missing blueprint sources: "+missingBlueprintSources.join(", ")
  });
  health.score+=blueprintIntegrity?5:0;
  if(!blueprintIntegrity) optimalDrift.push({control:"blueprint-integrity",missing:missingBlueprintSources});

  health.score=Math.max(0,Math.min(100,health.score));
  const critical=checks.some(x=>x.status==="critical") ||
    health.score<Number(blueprint?.healthThresholds?.criticalBelow||70);
  const healthy=!critical &&
    health.score>=Number(blueprint?.healthThresholds?.healthy||90) &&
    optimalDrift.length===0;
  const status=critical?"critical":healthy?"healthy":"degraded";

  const delta=compareSnapshots(previousSnapshot,sourceState,env.dimensions);
  const blueprintDigest=sha256(JSON.stringify(blueprint));
  const healingCandidates={
    redundantBranches:branches.redundantBranches,
    codeSafeRefinements:code.safeRefinements,
    codeStreamliningCandidates:code.redundancyCandidates,
    environmentReview:env.reviewRequired,
    unresolvedBranches:branches.reviewBranches
  };

  return {
    schemaVersion:"datanest-guardian-snapshot-v1",
    generatedAt,
    headSha,
    authority:"health-observation-and-safe-healing",
    productionAuthorization:false,
    status,
    health,
    checks,
    blueprint:{
      schemaVersion:blueprint?.schemaVersion||null,
      blueprintVersion:blueprint?.blueprintVersion||null,
      digest:blueprintDigest,
      sourceHashes:sourceState
    },
    observed:{
      trees:{
        required:Object.keys(treeContracts),
        missing:missingContracts
      },
      environment:env,
      enforcer:{
        status:enforcerStatus,
        blockers:Array.isArray(enforcer?.blockers)?enforcer.blockers:[],
        reviews:Array.isArray(enforcer?.reviews)?enforcer.reviews:[],
        securityWorkflow:enforcer?.securityWorkflow||null
      },
      knowledge:{
        itemCount:knowledgeItems,
        generatedAt:knowledge?.generatedAt||null
      },
      botsquad:{
        available:botsquadAvailable,
        botCount:Number(botsquad?.botCount||0),
        generatedAt:botsquad?.generatedAt||null
      },
      branches,
      source:code
    },
    drift:{
      optimalConditionDrift:optimalDrift,
      sincePrevious:delta
    },
    healing:{
      policy:config?.healing||{},
      candidates:healingCandidates
    }
  };
}

function feedFor(target,snapshot){
  return {
    schemaVersion:"datanest-guardian-health-feed-v1",
    target,
    generatedAt:snapshot.generatedAt,
    authority:"health-advisory",
    productionAuthorization:false,
    status:snapshot.status,
    healthScore:snapshot.health.score,
    driftCount:snapshot.drift.optimalConditionDrift.length,
    checks:snapshot.checks,
    environment:snapshot.observed.environment,
    enforcer:snapshot.observed.enforcer,
    knowledge:snapshot.observed.knowledge,
    branches:{
      redundantBranchCount:snapshot.observed.branches.redundantBranchCount,
      reviewBranchCount:snapshot.observed.branches.reviewBranchCount,
      unresolvedBranchCount:snapshot.observed.branches.unresolvedBranchCount
    },
    source:{
      high:snapshot.observed.source.high,
      medium:snapshot.observed.source.medium,
      redundancyCandidateCount:snapshot.observed.source.redundancyCandidates.length
    },
    healingCandidateCounts:{
      redundantBranches:snapshot.healing.candidates.redundantBranches.length,
      codeSafeRefinements:snapshot.healing.candidates.codeSafeRefinements.length,
      codeStreamliningCandidates:snapshot.healing.candidates.codeStreamliningCandidates.length
    }
  };
}

async function main(){
  const config=await readJson("config/guardian.tree.json");
  const blueprint=await readJson("config/guardian.blueprint.json");
  if(!config||!blueprint) throw new Error("GUARDIAN requires guardian tree and blueprint configs.");

  const environment=await readJson(process.env.GUARDIAN_ENVIRONMENT_PATH||"/tmp/guardian/environment.json",{});
  const enforcer=await readJson(process.env.GUARDIAN_ENFORCER_PATH||"/tmp/guardian/enforcer.json",{});
  const knowledge=await readJson(process.env.GUARDIAN_KNOWLEDGE_PATH||"/tmp/guardian/knowledge.json",{});
  const botsquad=await readJson(process.env.GUARDIAN_BOTSQUAD_PATH||"/tmp/guardian/botsquad.json",{});
  const branchReport=await readJson(process.env.GUARDIAN_BRANCH_REPORT_PATH||"/tmp/guardian/branch-cleaner-report.json",{});
  const reviewerReport=await readJson(process.env.GUARDIAN_REVIEWER_REPORT_PATH||"/tmp/guardian/workflow-reviewer-report.json",{});
  const previousSnapshot=await readJson(process.env.GUARDIAN_PREVIOUS_SNAPSHOT_PATH||"/tmp/guardian/previous.json",null);

  const sources=await sourceHashes(blueprint.blueprintSources||[]);
  const contracts={};
  for(const tree of blueprint.requiredTrees||[]) contracts[tree.id]=await exists(tree.contract);

  let headSha=process.env.GITHUB_SHA||null;
  if(!headSha){
    try{headSha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();}catch{}
  }

  const snapshot=buildGuardianSnapshot({
    config,blueprint,environment,enforcer,knowledge,botsquad,
    branchReport,reviewerReport,previousSnapshot,
    sourceState:sources,treeContracts:contracts,headSha
  });

  const outDir=arg("--out-dir","guardian");
  await mkdir(path.join(outDir,"snapshots"),{recursive:true});
  await mkdir(path.join(outDir,"feeds"),{recursive:true});
  await writeFile(path.join(outDir,"snapshots","latest.json"),JSON.stringify(snapshot,null,2)+"\n");
  for(const feed of config.feeds||[]){
    const filename=path.join(outDir,"feeds",path.basename(feed.path));
    await writeFile(filename,JSON.stringify(feedFor(feed.target,snapshot),null,2)+"\n");
  }

  process.stdout.write(JSON.stringify({
    status:snapshot.status,
    healthScore:snapshot.health.score,
    drift:snapshot.drift.optimalConditionDrift.length,
    redundantBranches:snapshot.healing.candidates.redundantBranches.length,
    codeStreamliningCandidates:snapshot.healing.candidates.codeStreamliningCandidates.length
  },null,2)+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
