import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configPath=fileURLToPath(new URL("../config/worktree-gate-timeframes.json",import.meta.url));
const CONFIG=JSON.parse(readFileSync(configPath,"utf8"));

function clean(value){
  return typeof value==="string" ? value.trim() : "";
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const value=argv[i];
    if(!value.startsWith("--")) continue;
    const key=value.slice(2);
    const next=argv[i+1];
    if(next!==undefined && !next.startsWith("--")){
      out[key]=next;
      i+=1;
    }else{
      out[key]="true";
    }
  }
  return out;
}

function rankTask(value){
  return ["routine","standard","complex","cross_system"].indexOf(value);
}

function escalatedTaskComplexity(base,changedFiles){
  const changed=Number.isFinite(changedFiles) ? changedFiles : 0;
  let floor="routine";
  if(changed>=31) floor="cross_system";
  else if(changed>=11) floor="complex";
  else if(changed>=4) floor="standard";
  return rankTask(base)>=rankTask(floor) ? base : floor;
}

function roundUp(hours){
  return CONFIG.buckets.find((bucket)=>hours<=bucket) || CONFIG.maxHours;
}

export function listWorktreeGateProfiles(){
  return CONFIG.gateProfiles;
}

export function proposeWorktreeGateTimeframe({
  gateId,
  workflowFile,
  changedFiles=0,
  taskComplexity,
  reportingComplexity,
  overrideHours
}={}){
  let profile=null;
  let resolvedWorkflowFile=workflowFile;
  if(resolvedWorkflowFile){
    profile=CONFIG.gateProfiles[resolvedWorkflowFile] || null;
  }
  if(!profile && gateId){
    const entry=Object.entries(CONFIG.gateProfiles).find(([,item])=>item.gateId===gateId);
    if(entry){
      [resolvedWorkflowFile,profile]=entry;
    }
  }
  if(!profile){
    throw new Error("Unknown worktree gate; provide a configured gateId or workflowFile");
  }

  const changed=Math.max(0,Number.parseInt(String(changedFiles),10)||0);
  const effectiveTask=clean(taskComplexity) || escalatedTaskComplexity(profile.taskComplexity,changed);
  const effectiveReporting=clean(reportingComplexity) || profile.reportingComplexity;

  if(!(effectiveTask in CONFIG.taskComplexityHours)){
    throw new Error(`Unsupported task complexity: ${effectiveTask}`);
  }
  if(!(effectiveReporting in CONFIG.reportingComplexityHours)){
    throw new Error(`Unsupported reporting complexity: ${effectiveReporting}`);
  }

  const humanAssumptions=profile.reviewDomains.map((key)=>{
    const assumption=CONFIG.humanResponseAssumptions[key];
    if(!assumption) throw new Error(`Unknown human response domain: ${key}`);
    return {key,...assumption};
  });
  const humanResponseHours=humanAssumptions.length
    ? Math.max(...humanAssumptions.map((item)=>item.typicalHours))
    : 0;
  const coordinationHours=Math.max(0,(humanAssumptions.length-1)*6);
  const taskHours=CONFIG.taskComplexityHours[effectiveTask];
  const reportingHours=CONFIG.reportingComplexityHours[effectiveReporting];
  const rawHours=humanResponseHours+coordinationHours+taskHours+reportingHours;
  const recommendedHours=roundUp(rawHours);

  let acceptedHours=recommendedHours;
  let ownerOverride=false;
  let overrideDeltaHours=0;
  if(clean(overrideHours)){
    const parsed=Number(overrideHours);
    if(!Number.isFinite(parsed) || parsed<0.5 || parsed>CONFIG.maxHours){
      throw new Error(`overrideHours must be between 0.5 and ${CONFIG.maxHours}`);
    }
    acceptedHours=parsed;
    overrideDeltaHours=Number((parsed-recommendedHours).toFixed(3));
    ownerOverride=Math.abs(overrideDeltaHours)>0.01;
  }

  return {
    schemaVersion:CONFIG.schemaVersion,
    gateId:profile.gateId,
    workflowFile:resolvedWorkflowFile,
    changedFiles:changed,
    taskComplexity:effectiveTask,
    reportingComplexity:effectiveReporting,
    reviewDomains:profile.reviewDomains,
    humanResponseAssumptions:humanAssumptions,
    humanResponseHours,
    coordinationHours,
    taskHours,
    reportingHours,
    rawHours,
    recommendedHours,
    acceptedHours,
    ownerOverride,
    overrideDeltaHours,
    maximumHours:CONFIG.maxHours,
    interpretation:"Planning heuristic for realistic human review/response and reporting time. It is not a guarantee or SLA; recalibrate from observed repository response times.",
    generatedAt:new Date().toISOString()
  };
}

export function writeWorktreeGateTimeframe(target,proposal){
  const output=resolve(target);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(proposal,null,2)+"\n","utf8");
  return output;
}

const directInvocation=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(directInvocation){
  const args=parseArgs(process.argv.slice(2));
  const proposal=proposeWorktreeGateTimeframe({
    gateId:args.gate,
    workflowFile:args.workflow,
    changedFiles:args["changed-files"],
    taskComplexity:args["task-complexity"],
    reportingComplexity:args["reporting-complexity"],
    overrideHours:args["override-hours"]
  });
  if(args.output) writeWorktreeGateTimeframe(args.output,proposal);
  console.log(JSON.stringify(proposal,null,2));
}
