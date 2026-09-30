import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configPath=fileURLToPath(new URL("../config/worktree-gate-timeframes.json",import.meta.url));
const CONFIG=JSON.parse(readFileSync(configPath,"utf8"));

function clean(value){ return typeof value==="string" ? value.trim() : ""; }
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const value=argv[i];
    if(!value.startsWith("--")) continue;
    const key=value.slice(2), next=argv[i+1];
    if(next!==undefined && !next.startsWith("--")){ out[key]=next; i+=1; }
    else out[key]="true";
  }
  return out;
}
function rankTask(value){ return ["routine","standard","complex","cross_system"].indexOf(value); }
function escalatedTaskComplexity(base,changedFiles){
  const changed=Number.isFinite(changedFiles) ? changedFiles : 0;
  let floor="routine";
  if(changed>=31) floor="cross_system";
  else if(changed>=11) floor="complex";
  else if(changed>=4) floor="standard";
  return rankTask(base)>=rankTask(floor) ? base : floor;
}
function roundUpHuman(hours){ return CONFIG.humanBuckets.find((x)=>hours<=x) || CONFIG.maxHumanHours; }
function roundUpMachine(minutes){ return CONFIG.machineBucketsMinutes.find((x)=>minutes<=x) || CONFIG.machineBucketsMinutes.at(-1); }
function profileFor({gateId,workflowFile}){
  if(workflowFile && CONFIG.gateProfiles[workflowFile]) return [workflowFile,CONFIG.gateProfiles[workflowFile]];
  if(gateId){
    const found=Object.entries(CONFIG.gateProfiles).find(([,p])=>p.gateId===gateId);
    if(found) return found;
  }
  throw new Error("Unknown worktree gate; provide a configured gateId or workflowFile");
}
export function listWorktreeGateProfiles(){ return CONFIG.gateProfiles; }

export function proposeWorktreeGateTimeframe({
  gateId,workflowFile,changedFiles=0,taskComplexity,reportingComplexity,overrideHours
}={}){
  const [resolvedWorkflowFile,profile]=profileFor({gateId,workflowFile});
  const changed=Math.max(0,Number.parseInt(String(changedFiles),10)||0);
  const effectiveTask=clean(taskComplexity) || escalatedTaskComplexity(profile.taskComplexity,changed);
  const effectiveReporting=clean(reportingComplexity) || profile.reportingComplexity;
  if(!(effectiveTask in CONFIG.taskComplexityHours)) throw new Error(`Unsupported task complexity: ${effectiveTask}`);
  if(!(effectiveReporting in CONFIG.reportingComplexityHours)) throw new Error(`Unsupported reporting complexity: ${effectiveReporting}`);

  const humanAssumptions=profile.reviewDomains.map((key)=>{
    const assumption=CONFIG.humanResponseAssumptions[key];
    if(!assumption) throw new Error(`Unknown human response domain: ${key}`);
    return {key,...assumption};
  });
  const humanResponseHours=humanAssumptions.length ? Math.max(...humanAssumptions.map((x)=>x.typicalHours)) : 0;
  const coordinationHours=Math.max(0,(humanAssumptions.length-1)*6);
  const taskHours=CONFIG.taskComplexityHours[effectiveTask];
  const reportingHours=CONFIG.reportingComplexityHours[effectiveReporting];
  const rawHumanHours=humanResponseHours+coordinationHours+taskHours+reportingHours;
  const humanFollowupHours=roundUpHuman(rawHumanHours);

  const scopeMultiplier=changed>=31?1.75:changed>=11?1.4:changed>=4?1.2:1;
  const complexityMultiplier={routine:0.8,standard:1,complex:1.25,cross_system:1.5}[effectiveTask];
  const rawMachineMinutes=Number((profile.machineBaselineMinutes*scopeMultiplier*complexityMultiplier).toFixed(1));
  const machineEtaMinutes=roundUpMachine(rawMachineMinutes);

  const isManual=profile.gateType==="manual_mutation";
  const recommendedHours=isManual ? humanFollowupHours : null;
  let acceptedHours=recommendedHours, ownerOverride=false, overrideDeltaHours=0;
  const hasOverride=overrideHours!==undefined && overrideHours!==null && String(overrideHours).trim()!=="";
  if(hasOverride){
    if(!isManual) throw new Error("overrideHours is only valid for manual_mutation gates");
    const parsed=Number(overrideHours);
    if(!Number.isFinite(parsed) || parsed<0.5 || parsed>CONFIG.maxHumanHours){
      throw new Error(`overrideHours must be between 0.5 and ${CONFIG.maxHumanHours}`);
    }
    acceptedHours=parsed;
    overrideDeltaHours=Number((parsed-recommendedHours).toFixed(3));
    ownerOverride=Math.abs(overrideDeltaHours)>0.01;
  }

  return {
    schemaVersion:CONFIG.schemaVersion,
    gateId:profile.gateId,
    workflowFile:resolvedWorkflowFile,
    gateType:profile.gateType,
    changedFiles:changed,
    taskComplexity:effectiveTask,
    reportingComplexity:effectiveReporting,
    machine:{rawMinutes:rawMachineMinutes,estimatedMinutes:machineEtaMinutes,baselineMinutes:profile.machineBaselineMinutes},
    humanFollowup:{
      reviewDomains:profile.reviewDomains,
      assumptions:humanAssumptions,
      responseHours:humanResponseHours,
      coordinationHours,
      taskHours,
      reportingHours,
      rawHours:rawHumanHours,
      recommendedHours:humanFollowupHours
    },
    manualWindow:isManual?{
      recommendedHours,
      acceptedHours,
      ownerOverride,
      overrideDeltaHours,
      maximumHours:CONFIG.maxHumanHours
    }:null,
    interpretation:isManual
      ?"Human response/evidence-gathering planning window for a mutating gate. This does not waive authority requirements."
      :"Machine execution ETA plus human follow-up planning window if intervention, review, or reporting is needed. It does not delay or weaken the automated gate.",
    calibration:"Planning heuristic, not an SLA. Recalibrate from observed run durations and repository-specific human response timestamps.",
    generatedAt:new Date().toISOString()
  };
}

export function writeWorktreeGateTimeframe(target,proposal){
  const output=resolve(target);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(proposal,null,2)+"\n","utf8");
  return output;
}
export function renderWorktreeGateSummary(p){
  const lines=[
    `## DataNest AI gate timeframe — ${p.gateId}`,
    "",
    `- Gate type: **${p.gateType}**`,
    `- Changed files measured: **${p.changedFiles}**`,
    `- Effective complexity: **${p.taskComplexity} / ${p.reportingComplexity}**`,
    `- Machine ETA: **~${p.machine.estimatedMinutes} min**`,
    `- Human follow-up window if needed: **~${p.humanFollowup.recommendedHours} h**`
  ];
  if(p.manualWindow){
    lines.push(`- Manual gate planning window: **${p.manualWindow.acceptedHours} h**`);
    if(p.manualWindow.ownerOverride) lines.push(`- Owner override delta: **${p.manualWindow.overrideDeltaHours} h**`);
  }
  lines.push("",p.interpretation,"",p.calibration,"");
  return lines.join("\n");
}

const directInvocation=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(directInvocation){
  const args=parseArgs(process.argv.slice(2));
  const proposal=proposeWorktreeGateTimeframe({
    gateId:args.gate,workflowFile:args.workflow,changedFiles:args["changed-files"],
    taskComplexity:args["task-complexity"],reportingComplexity:args["reporting-complexity"],
    overrideHours:args["override-hours"]
  });
  if(args.output) writeWorktreeGateTimeframe(args.output,proposal);
  const summary=renderWorktreeGateSummary(proposal);
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+"\n","utf8");
  console.log(JSON.stringify(proposal,null,2));
}
