#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const sha256=value=>"sha256:"+createHash("sha256").update(value).digest("hex");
const arg=(name,fallback=null)=>{
  const i=process.argv.indexOf(name);
  return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
};
async function readJson(filename,fallback={}){
  try{return JSON.parse(await readFile(filename,"utf8"));}catch{return fallback;}
}
async function readText(filename){
  try{return await readFile(filename,"utf8");}catch{return "";}
}
function git(args,fallback=null){
  try{return execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();}catch{return fallback;}
}
function safeTime(value){
  const d=new Date(value||"");
  return Number.isNaN(d.getTime())?null:d.toISOString();
}
function relation(type,target){return {type,target};}
function record(input){
  return {
    id:input.id,
    type:input.type,
    title:input.title,
    status:input.status||"published",
    authority:input.authority||"DataNest-Supository/DataNest",
    source:input.source||null,
    revision:input.revision||null,
    digest:input.digest||null,
    observedAt:input.observedAt||null,
    effectiveAt:input.effectiveAt||null,
    audience:input.audience||["public"],
    sensitivity:input.sensitivity||"public",
    productionAuthorization:Boolean(input.productionAuthorization),
    relations:input.relations||[],
    limitations:input.limitations||[]
  };
}

const publicDocs=[
  ["standard:liberty-in-all","standard","LIBERTY-IN-ALL Standard","docs/LIBERTY_IN_ALL_STANDARD.md"],
  ["standard:system-charter","charter","DataNest System Charter","docs/DATANEST_SYSTEM_CHARTER.md"],
  ["document:architecture","architecture","DataNest Architecture","docs/ARCHITECTURE.md"],
  ["document:supository-architecture","architecture","DataNest Supository Architecture","docs/DATANEST_SUPOSITORY_ARCHITECTURE.md"],
  ["document:maintenance-protocol","protocol","DataNest Maintenance Protocol","docs/MAINTENANCE_PROTOCOL.md"],
  ["document:adversarial-stress-test-2026-09-28","validation","DataNest AI Adversarial Stress-Test Evidence","docs/ADVERSARIAL_STRESS_TEST_2026-09-28.md"]
];

const treeContracts=[
  ["tree:knowledge","Knowledge","config/knowledge-tree.json","automation/knowledge-feed"],
  ["tree:boundaries","Boundaries","config/boundaries.policy.json",null],
  ["tree:botsquad","BOTSQUAD","config/botsquad.tree.json","automation/botsquad/orchestrator"],
  ["tree:environment","ENVIRONMENT","config/environment.tree.json","automation/environment-feed"],
  ["tree:enforcer","ENFORCER","config/enforcer.tree.json","automation/enforcer"],
  ["tree:guardian","GUARDIAN","config/guardian.tree.json","automation/guardian"],
  ["tree:conductor","CONDUCTOR","config/conductor.tree.json","automation/conductor"],
  ["tree:suggester","SUGGESTER","config/suggester.tree.json","automation/suggester"],
  ["tree:calmer","CALMER","config/calmer.tree.json","automation/calmer"],
  ["tree:regulator","REGULATOR","config/regulator.tree.json","automation/regulator"],
  ["tree:visibility-utility","VISIBILITY-UTILITY","config/visibility-utility.tree.json","automation/visibility-utility"]
];

const workflowContracts=[
  ["workflow:knowledge","Knowledge Tree",".github/workflows/knowledge-tree.yml","tree:knowledge"],
  ["workflow:boundaries","DataNest Boundaries",".github/workflows/boundaries-assessment.yml","tree:boundaries"],
  ["workflow:botsquad","BOTSQUAD AI Tree",".github/workflows/botsquad.yml","tree:botsquad"],
  ["workflow:environment","ENVIRONMENT Tree",".github/workflows/environment-tree.yml","tree:environment"],
  ["workflow:enforcer","ENFORCER Defence Tree",".github/workflows/enforcer.yml","tree:enforcer"],
  ["workflow:guardian","GUARDIAN Health & Healing Tree",".github/workflows/guardian.yml","tree:guardian"],
  ["workflow:conductor","CONDUCTOR Process Synchronization Tree",".github/workflows/conductor.yml","tree:conductor"],
  ["workflow:suggester","SUGGESTER Continuous Optimization Tree",".github/workflows/suggester.yml","tree:suggester"],
  ["workflow:calmer","CALMER Governance Softening Tree",".github/workflows/calmer.yml","tree:calmer"],
  ["workflow:regulator","REGULATOR Harmony Tree",".github/workflows/regulator.yml","tree:regulator"],
  ["workflow:visibility-utility","VISIBILITY-UTILITY Market Presence Tree",".github/workflows/visibility-utility.yml","tree:visibility-utility"],
  ["workflow:liberty-in-all","LIBERTY-IN-ALL Traceability",".github/workflows/liberty-in-all.yml","standard:liberty-in-all"]
];

const evidenceSpecs=[
  {
    id:"evidence:knowledge",title:"Knowledge public learning feed",type:"evidence",
    env:"LIBERTY_KNOWLEDGE_PATH",expected:"datanest-knowledge-feed-v1",branch:"automation/knowledge-feed",
    raw:"knowledge/feeds/datanest.json",pick:x=>({status:x?.itemCount>=0?"available":"unavailable",generatedAt:x?.generatedAt,itemCount:x?.itemCount})
  },
  {
    id:"evidence:environment",title:"ENVIRONMENT compatibility feed",type:"evidence",
    env:"LIBERTY_ENVIRONMENT_PATH",expected:"datanest-environment-feed-v1",branch:"automation/environment-feed",
    raw:"environment/feeds/datanest.json",pick:x=>({status:x?.environmentCompatible===true?"compatible":x?.environmentCompatible===false?"review":"unavailable",generatedAt:x?.generatedAt,environmentCompatible:x?.environmentCompatible})
  },
  {
    id:"evidence:enforcer",title:"ENFORCER defensive state",type:"evidence",
    env:"LIBERTY_ENFORCER_PATH",expected:"datanest-enforcer-assessment-v1",branch:"automation/enforcer",
    raw:"enforcer/state/latest.json",pick:x=>({status:x?.status||"unavailable",generatedAt:x?.generatedAt,blockerCount:Array.isArray(x?.blockers)?x.blockers.length:null,reviewCount:Array.isArray(x?.reviews)?x.reviews.length:null})
  },
  {
    id:"evidence:guardian",title:"GUARDIAN health snapshot",type:"evidence",
    env:"LIBERTY_GUARDIAN_PATH",expected:"datanest-guardian-snapshot-v1",branch:"automation/guardian",
    raw:"guardian/snapshots/latest.json",pick:x=>({status:x?.status||"unavailable",generatedAt:x?.generatedAt,healthScore:x?.health?.score??null,driftCount:Array.isArray(x?.drift?.optimalConditionDrift)?x.drift.optimalConditionDrift.length:null})
  },
  {
    id:"evidence:conductor",title:"CONDUCTOR synchronization state",type:"evidence",
    env:"LIBERTY_CONDUCTOR_PATH",expected:"datanest-conductor-state-v1",branch:"automation/conductor",
    raw:"conductor/state/latest.json",pick:x=>({status:x?.allProcessesFresh===true?"synchronized":x?.allProcessesFresh===false?"stale":"unavailable",generatedAt:x?.generatedAt,allProcessesFresh:x?.allProcessesFresh})
  },
  {
    id:"evidence:suggester",title:"SUGGESTER optimization feed",type:"evidence",
    env:"LIBERTY_SUGGESTER_PATH",expected:"datanest-suggester-feed-v1",branch:"automation/suggester",
    raw:"suggester/feeds/datanest.json",pick:x=>({status:x?.generatedAt?"available":"unavailable",generatedAt:x?.generatedAt,suggestionCount:x?.summary?.total??null,autonomousSafe:x?.summary?.autonomousSafe??null})
  },
  {
    id:"evidence:calmer",title:"CALMER governance state",type:"evidence",
    env:"LIBERTY_CALMER_PATH",expected:"datanest-calmer-state-v1",branch:"automation/calmer",
    raw:"calmer/state/latest.json",pick:x=>({status:x?.status||"unavailable",generatedAt:x?.generatedAt,tier:x?.tier??null})
  },
  {
    id:"evidence:regulator",title:"REGULATOR harmony state",type:"evidence",
    env:"LIBERTY_REGULATOR_PATH",expected:"datanest-regulator-state-v1",branch:"automation/regulator",
    raw:"regulator/state/latest.json",pick:x=>({status:x?.status||"unavailable",generatedAt:x?.generatedAt,requirementCount:x?.transparency?.requirementCount??null})
  },
  {
    id:"evidence:visibility-utility",title:"VISIBILITY-UTILITY public market state",type:"evidence",
    env:"LIBERTY_VISIBILITY_PATH",expected:"datanest-visibility-utility-state-v1",branch:"automation/visibility-utility",
    raw:"visibility-utility/state/latest.json",pick:x=>({status:x?.status||"unavailable",generatedAt:x?.generatedAt,seoScore:x?.assessment?.seo?.score??null,visibilityScore:x?.assessment?.visibilityScore??null,platformCoveragePercent:x?.assessment?.platform?.coveragePercent??null,missingInputs:Array.isArray(x?.missingInputs)?x.missingInputs:[]})
  }
];

async function sourceRecord([id,type,title,source],headSha,observedAt,relations=[]){
  const content=await readText(source);
  return record({
    id,type,title,status:content?"published":"unavailable",source,
    revision:content?headSha:null,digest:content?sha256(content):null,observedAt,
    audience:["interested-parties","users","stakeholders","auditors","regulators","developers","operators"],
    sensitivity:"public",productionAuthorization:false,relations,
    limitations:content?[]:["Source not present in observed checkout."]
  });
}

export function summarizeEvidence(spec,data,observedAt){
  const valid=data?.schemaVersion===spec.expected && data?.productionAuthorization!==true;
  const summary=valid?spec.pick(data):{status:"unavailable",generatedAt:null};
  const generatedAt=safeTime(summary.generatedAt);
  return {
    record:record({
      id:spec.id,type:spec.type,title:spec.title,status:summary.status||"unavailable",
      authority:data?.authority||"advisory-evidence",
      source:`https://raw.githubusercontent.com/DataNest-Supository/DataNest/${spec.branch}/${spec.raw}`,
      revision:data?.headSha||null,digest:valid?sha256(JSON.stringify(summary)):null,
      observedAt,effectiveAt:generatedAt,
      audience:["interested-parties","users","stakeholders","auditors","regulators","developers","operators"],
      sensitivity:"public_summary",productionAuthorization:false,
      relations:[relation("produced-by","workflow:"+spec.id.split(":")[1]),relation("governed-by","standard:liberty-in-all")],
      limitations:valid?[]:["Source evidence unavailable, malformed, stale-unknown, or authority-changing; no favorable state inferred."]
    }),
    summary:{id:spec.id,valid,...summary,generatedAt}
  };
}

export function evaluateLibertyCompliance({standard,records,liveEvidence}){
  const blockers=[];
  const warnings=[];
  const required=["standard:liberty-in-all","standard:system-charter","workflow:liberty-in-all"];
  for(const id of required) if(!records.some(x=>x.id===id&&x.status!=="unavailable")) blockers.push("missing:"+id);
  if(standard?.controls?.mayPublishSecrets!==false) blockers.push("secret-publication-control");
  if(standard?.controls?.mayPublishProtectedPersonalData!==false) blockers.push("personal-data-publication-control");
  if(standard?.controls?.maySuppressMaterialAdverseFindings!==false) blockers.push("adverse-finding-suppression-control");
  if(records.some(x=>x.productionAuthorization===true)) blockers.push("implicit-production-authority");
  const unavailable=liveEvidence.filter(x=>!x.valid).map(x=>x.id);
  if(unavailable.length) warnings.push("live-evidence-unavailable:"+unavailable.join(","));
  return {
    status:blockers.length?"block":warnings.length?"review":"pass",
    blockers,warnings,
    conformant:blockers.length===0
  };
}

export async function buildTraceabilityIndex({standard,observedAt=new Date().toISOString(),headSha=null,evidenceData={}}={}){
  const resolvedHead=headSha||git(["rev-parse","HEAD"],null);
  const records=[];
  for(const item of publicDocs) records.push(await sourceRecord(item,resolvedHead,observedAt,[relation("governed-by","standard:liberty-in-all")]));
  for(const [id,title,source,stateBranch] of treeContracts){
    const relations=[relation("governed-by","standard:liberty-in-all")];
    if(stateBranch) relations.push(relation("publishes-state",stateBranch));
    records.push(await sourceRecord([id,"tree",title,source],resolvedHead,observedAt,relations));
  }
  for(const [id,title,source,target] of workflowContracts){
    records.push(await sourceRecord([id,"workflow",title,source],resolvedHead,observedAt,[relation("operates",target),relation("governed-by","standard:liberty-in-all")]));
  }

  const liveEvidence=[];
  for(const spec of evidenceSpecs){
    const data=evidenceData[spec.id]||{};
    const result=summarizeEvidence(spec,data,observedAt);
    records.push(result.record);
    liveEvidence.push(result.summary);
  }

  const registry=await readJson("public/transparency/audits/index.json",{documents:[]});
  for(const item of (registry.documents||[])){
    records.push(record({
      id:"transparency:"+item.id,type:item.document_type||"transparency-record",title:item.title||item.id,
      status:item.status||item.audit_result_status||"published",
      authority:"DataNest public transparency registry",
      source:"public/transparency/audits/index.json",revision:resolvedHead,
      digest:sha256(JSON.stringify(item)),observedAt,effectiveAt:safeTime(item.published_at||item.audit_date),
      audience:["interested-parties","users","stakeholders","auditors","regulators"],
      sensitivity:"public",productionAuthorization:Boolean(item?.authority?.production_authorization),
      relations:[relation("registered-by","transparency:audit-registry"),relation("governed-by","standard:liberty-in-all")],
      limitations:item?.baseline?.production_certified===false?["Not a production certification."]:[]
    }));
  }

  const compliance=evaluateLibertyCompliance({standard,records,liveEvidence});
  const types=Object.fromEntries([...new Set(records.map(x=>x.type))].sort().map(type=>[type,records.filter(x=>x.type===type).length]));
  const current=records.filter(x=>x.status!=="unavailable").length;
  return {
    schemaVersion:"datanest-liberty-traceability-index-v1",
    standard:{id:standard?.standardId||"LIA",version:standard?.version||null,name:standard?.name||"LIBERTY-IN-ALL"},
    generatedAt:observedAt,
    canonicalRepository:"DataNest-Supository/DataNest",
    canonicalSha:resolvedHead,
    authority:"public-traceability-observation",
    productionAuthorization:false,
    publicPage:"https://datanest-supository.github.io/DataNest/traceability/",
    sourceHistory:"https://github.com/DataNest-Supository/DataNest",
    scope:"sanitized-public-and-public-summary-only",
    compliance,
    summary:{
      recordCount:records.length,currentRecordCount:current,unavailableRecordCount:records.length-current,
      liveEvidenceAvailable:liveEvidence.filter(x=>x.valid).length,
      liveEvidenceTotal:liveEvidence.length,
      types
    },
    liveEvidence,
    records:records.sort((a,b)=>a.id.localeCompare(b.id)),
    publicationBoundary:{
      secretsPublished:false,
      protectedPersonalDataPublished:false,
      privateAuthenticationMaterialPublished:false,
      privateAiMemoryPublished:false,
      materialAdverseFindingsSuppressed:false,
      authorityGrantedByIndex:false
    }
  };
}

async function main(){
  const standard=await readJson("config/liberty-in-all.standard.json",null);
  if(!standard) throw new Error("Missing LIBERTY-IN-ALL standard contract.");
  const evidenceData={};
  for(const spec of evidenceSpecs){
    evidenceData[spec.id]=await readJson(process.env[spec.env]||"/tmp/liberty-in-all/"+spec.id.split(":")[1]+".json",{});
  }
  const generatedAt=new Date().toISOString();
  const index=await buildTraceabilityIndex({standard,observedAt:generatedAt,evidenceData});
  const outDir=arg("--out-dir","liberty-in-all");
  const day=generatedAt.slice(0,10);
  await mkdir(path.join(outDir,"public","transparency","liberty-in-all"),{recursive:true});
  await mkdir(path.join(outDir,"history",day),{recursive:true});
  await writeFile(path.join(outDir,"public","transparency","liberty-in-all","latest.json"),JSON.stringify(index,null,2)+"\n");
  await writeFile(path.join(outDir,"history",day,"latest.json"),JSON.stringify(index,null,2)+"\n");
  process.stdout.write(JSON.stringify({
    status:index.compliance.status,records:index.summary.recordCount,
    current:index.summary.currentRecordCount,liveEvidence:index.summary.liveEvidenceAvailable+"/"+index.summary.liveEvidenceTotal,
    canonicalSha:index.canonicalSha
  },null,2)+"\n");
  if(index.compliance.status==="block") process.exitCode=1;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
