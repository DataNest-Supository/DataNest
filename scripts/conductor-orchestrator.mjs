#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const sha256=value=>"sha256:"+createHash("sha256").update(String(value)).digest("hex");

async function readJson(filename,fallback=null){
  try{return JSON.parse(await readFile(filename,"utf8"));}catch{return fallback;}
}

async function githubJson(endpoint,token){
  const response=await fetch("https://api.github.com"+endpoint,{
    headers:{
      Accept:"application/vnd.github+json",
      Authorization:"Bearer "+token,
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"datanest-conductor"
    }
  });
  if(!response.ok) throw new Error("GitHub API "+response.status+" for "+endpoint);
  return response.json();
}

export function normalizeWorkflowState(runs=[],now=new Date()){
  const ordered=[...(Array.isArray(runs)?runs:[])]
    .sort((a,b)=>Date.parse(b.created_at||b.run_started_at||0)-Date.parse(a.created_at||a.run_started_at||0));
  const latest=ordered[0]||null;
  const latestSuccess=ordered.find(run=>run.status==="completed"&&run.conclusion==="success")||null;
  const active=!!latest && latest.status!=="completed";
  const successAt=latestSuccess?.updated_at||latestSuccess?.run_started_at||latestSuccess?.created_at||null;
  const ageMinutes=successAt
    ?Math.max(0,(now-new Date(successAt))/60000)
    :Number.POSITIVE_INFINITY;
  const latestCompletedAt=latest?.updated_at||latest?.run_started_at||latest?.created_at||null;
  return {
    available:!!latest,
    active,
    latest:{
      id:latest?.id??null,
      status:latest?.status||"missing",
      conclusion:latest?.conclusion??null,
      url:latest?.html_url||null,
      createdAt:latest?.created_at||null,
      updatedAt:latest?.updated_at||null,
      headSha:latest?.head_sha||null
    },
    latestSuccessful:{
      id:latestSuccess?.id??null,
      completedAt:successAt,
      ageMinutes:Number.isFinite(ageMinutes)?Math.round(ageMinutes*10)/10:null,
      headSha:latestSuccess?.head_sha||null
    },
    latestCompletedAt
  };
}

export function evaluateProcessSchedule(config,workflowStates,now=new Date()){
  const processes=[];
  const retryCooldownMinutes=Number(config.retryCooldownMinutes||30);
  for(const processConfig of config.processOrder||[]){
    const state=workflowStates[processConfig.id]||normalizeWorkflowState([],now);
    const age=state.latestSuccessful?.ageMinutes;
    const successFresh=Number.isFinite(age) && age<=Number(processConfig.maxAgeMinutes||0);
    const latestFailed=
      state.latest?.status==="completed" &&
      state.latest?.conclusion &&
      state.latest.conclusion!=="success" &&
      !["skipped","neutral"].includes(state.latest.conclusion);
    const latestUpdated=state.latest?.updatedAt?Date.parse(state.latest.updatedAt):0;
    const retryAge=latestUpdated?Math.max(0,(now-new Date(latestUpdated))/60000):Number.POSITIVE_INFINITY;
    const retryCooldown=latestFailed && retryAge<retryCooldownMinutes;
    const operationalFresh=successFresh && !latestFailed;
    const due=!state.active && !retryCooldown && !operationalFresh;
    processes.push({
      id:processConfig.id,
      workflow:processConfig.workflow,
      workflowName:processConfig.workflowName,
      maxAgeMinutes:processConfig.maxAgeMinutes,
      dependencies:processConfig.dependencies||[],
      dispatch:processConfig.dispatch||{enabled:false},
      state,
      successFresh,
      operationalFresh,
      due,
      active:state.active,
      retryCooldown,
      latestFailure:latestFailed?state.latest.conclusion:null
    });
  }

  const index=Object.fromEntries(processes.map(item=>[item.id,item]));
  for(const item of processes){
    item.dependenciesReady=item.dependencies.every(id=>{
      const dep=index[id];
      return !!dep && dep.operationalFresh && !dep.active;
    });
    item.blockedBy=item.dependencies.filter(id=>{
      const dep=index[id];
      return !dep || !dep.operationalFresh || dep.active;
    });
  }
  return processes;
}

function parseDate(value){
  const n=Date.parse(value||"");
  return Number.isFinite(n)?n:0;
}

export function selectSafeSuggestionAction(config,suggesterFeed,workflowStates){
  const commands=Array.isArray(suggesterFeed?.commands)?suggesterFeed.commands:[];
  const generatedAt=parseDate(suggesterFeed?.generatedAt);
  for(const command of commands){
    if(command?.automationClass!=="autonomous-safe") continue;
    const action=config?.safeSuggestionActions?.[command.actionId];
    if(!action) continue;
    const state=workflowStates[command.workflowStateId||"maintenance"]||null;
    const completedAt=parseDate(state?.latestSuccessful?.completedAt);
    if(action.requiresSuggestionNewerThanWorkflow===true && completedAt>=generatedAt) continue;
    if(state?.active) continue;
    return {
      type:"safe-suggestion-dispatch",
      source:"suggester",
      actionId:command.actionId,
      workflow:action.workflow,
      workflowName:action.workflowName,
      inputs:action.inputs||{},
      suggestionFingerprint:command.fingerprint||null
    };
  }
  return null;
}

export function selectNextCommand(config,processes,suggesterFeed,workflowStates){
  const nextProcess=processes.find(item=>
    item.due &&
    item.dependenciesReady &&
    item.dispatch?.enabled===true
  );
  if(nextProcess){
    return {
      type:"process-dispatch",
      source:"conductor",
      processId:nextProcess.id,
      workflow:nextProcess.workflow,
      workflowName:nextProcess.workflowName,
      inputs:nextProcess.dispatch?.inputs||{}
    };
  }

  const pending=processes.filter(item=>item.due||item.active||item.retryCooldown);
  if(pending.length){
    return {
      type:"wait",
      source:"conductor",
      workflow:null,
      workflowName:null,
      inputs:{},
      reason:"processes-pending",
      pending:pending.map(item=>({
        id:item.id,
        due:item.due,
        active:item.active,
        retryCooldown:item.retryCooldown,
        blockedBy:item.blockedBy
      }))
    };
  }

  const safeSuggestion=selectSafeSuggestionAction(config,suggesterFeed,workflowStates);
  if(safeSuggestion) return safeSuggestion;

  return {
    type:"trigger-suggester",
    source:"conductor",
    workflow:"suggester.yml",
    workflowName:"SUGGESTER Optimization Tree",
    inputs:{}
  };
}

async function fetchWorkflowStates(config,token,repository,now){
  const out={};
  for(const processConfig of config.processOrder||[]){
    const body=await githubJson(
      "/repos/"+repository+"/actions/workflows/"+encodeURIComponent(processConfig.workflow)+"/runs?branch=main&per_page=10",
      token
    );
    out[processConfig.id]=normalizeWorkflowState(body?.workflow_runs||[],now);
  }

  const maintenance=await githubJson(
    "/repos/"+repository+"/actions/workflows/maintenance.yml/runs?branch=main&per_page=10",
    token
  );
  out.maintenance=normalizeWorkflowState(maintenance?.workflow_runs||[],now);
  return out;
}

async function main(){
  const config=await readJson("config/conductor.tree.json");
  if(!config) throw new Error("Missing CONDUCTOR config.");
  const token=process.env.GITHUB_TOKEN||"";
  const repository=process.env.GITHUB_REPOSITORY||"";
  if(!token||!repository) throw new Error("CONDUCTOR requires GITHUB_TOKEN and GITHUB_REPOSITORY.");

  const now=new Date();
  const suggesterFeed=await readJson(process.env.CONDUCTOR_SUGGESTER_PATH||"/tmp/conductor/suggester.json",{});
  const previous=await readJson(process.env.CONDUCTOR_PREVIOUS_PATH||"/tmp/conductor/previous.json",null);
  const workflowStates=await fetchWorkflowStates(config,token,repository,now);
  const processes=evaluateProcessSchedule(config,workflowStates,now);
  const nextCommand=selectNextCommand(config,processes,suggesterFeed,workflowStates);
  const allFresh=processes.every(item=>item.operationalFresh&&!item.active);

  const state={
    schemaVersion:"datanest-conductor-state-v1",
    generatedAt:now.toISOString(),
    authority:"process-synchronization",
    productionAuthorization:false,
    repository,
    allProcessesFresh:allFresh,
    processCount:processes.length,
    processes,
    dataFlows:config.dataFlows||[],
    nextCommand,
    previousState:{
      available:!!previous,
      generatedAt:previous?.generatedAt||null,
      nextCommandFingerprint:previous?.nextCommand?.fingerprint||null
    }
  };

  nextCommand.fingerprint=sha256(JSON.stringify({
    type:nextCommand.type,
    workflow:nextCommand.workflow,
    inputs:nextCommand.inputs||{},
    processId:nextCommand.processId||null,
    actionId:nextCommand.actionId||null,
    suggesterGeneratedAt:suggesterFeed?.generatedAt||null
  }));

  await mkdir("conductor/state",{recursive:true});
  await mkdir("conductor/commands",{recursive:true});
  await writeFile("conductor/state/latest.json",JSON.stringify(state,null,2)+"\n");
  await writeFile("conductor/commands/latest.json",JSON.stringify({
    schemaVersion:"datanest-conductor-command-v1",
    generatedAt:state.generatedAt,
    productionAuthorization:false,
    nextCommand
  },null,2)+"\n");

  process.stdout.write(JSON.stringify({
    allProcessesFresh:allFresh,
    nextCommand,
    due:processes.filter(x=>x.due).map(x=>x.id),
    active:processes.filter(x=>x.active).map(x=>x.id),
    retryCooldown:processes.filter(x=>x.retryCooldown).map(x=>x.id)
  },null,2)+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
