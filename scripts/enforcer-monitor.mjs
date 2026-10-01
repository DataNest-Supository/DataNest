#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const sha256=(value)=>"sha256:"+createHash("sha256").update(String(value)).digest("hex");

async function readJson(filename,fallback=null){
  try{return JSON.parse(await readFile(filename,"utf8"));}catch{return fallback;}
}

function normalizeSecurityRun(run){
  if(!run) return {available:false,status:"unknown",conclusion:null,id:null,url:null,headSha:null};
  return {
    available:true,
    status:run.status||"unknown",
    conclusion:run.conclusion??null,
    id:run.id??null,
    url:run.html_url||run.url||null,
    headSha:run.head_sha||run.headSha||null,
    createdAt:run.created_at||run.createdAt||null,
    updatedAt:run.updated_at||run.updatedAt||null
  };
}

async function fetchLatestSecurityRun(token,repository){
  if(!token||!repository) return null;
  const endpoint="https://api.github.com/repos/"+repository+"/actions/workflows/security-scan.yml/runs?branch=main&per_page=5";
  const response=await fetch(endpoint,{headers:{
    Accept:"application/vnd.github+json",
    Authorization:"Bearer "+token,
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"datanest-enforcer"
  }});
  if(!response.ok) return null;
  const body=await response.json();
  return body?.workflow_runs?.[0]||null;
}

export function buildEnforcerAssessment({
  config,
  boundaries,
  knowledge,
  environment,
  securityRun,
  auditIndex,
  generatedAt=new Date().toISOString()
}){
  const checks=[];
  const blockers=[];
  const reviews=[];
  const knowledgeItems=Array.isArray(knowledge?.items)?knowledge.items:[];
  const categoryCounts={};
  for(const item of knowledgeItems){
    for(const category of item?.categories||[]) categoryCounts[category]=(categoryCounts[category]||0)+1;
  }

  const knowledgeOpen=
    config?.knowledgeAccess?.includeAllKnowledgeItems===true &&
    Array.isArray(config?.knowledgeAccess?.categoryFilters) &&
    config.knowledgeAccess.categoryFilters.length===0 &&
    Array.isArray(config?.knowledgeAccess?.topicFilters) &&
    config.knowledgeAccess.topicFilters.length===0;

  checks.push({
    id:"knowledge-access",
    status:knowledgeOpen?"pass":"block",
    detail:knowledgeOpen
      ?"Approved Knowledge corpus is consumed without category/topic filtering."
      :"ENFORCER Knowledge access is filtered or incomplete."
  });
  if(!knowledgeOpen) blockers.push("knowledge-access-filter-detected");

  const boundaryScopes=Array.isArray(boundaries?.scopes)?boundaries.scopes:[];
  const hardRules=Array.isArray(boundaries?.hardRules)?boundaries.hardRules:[];
  const boundariesPresent=boundaryScopes.length>0 && hardRules.length>0;
  checks.push({
    id:"boundaries-loaded",
    status:boundariesPresent?"pass":"block",
    detail:boundariesPresent
      ?`Loaded ${boundaryScopes.length} Boundaries scopes and ${hardRules.length} hard rules.`
      :"Boundaries policy is missing scopes or hard rules."
  });
  if(!boundariesPresent) blockers.push("boundaries-policy-incomplete");

  const security=normalizeSecurityRun(securityRun);
  const failedConclusions=new Set(["failure","cancelled","timed_out","action_required","startup_failure"]);
  if(!security.available){
    checks.push({id:"security-workflow",status:"review",detail:"Latest Security scan state unavailable."});
    reviews.push("security-workflow-state-unavailable");
  }else if(failedConclusions.has(security.conclusion)){
    checks.push({id:"security-workflow",status:"block",detail:"Latest Security scan concluded "+security.conclusion+"."});
    blockers.push("security-workflow-"+security.conclusion);
  }else if(security.conclusion==="success"){
    checks.push({id:"security-workflow",status:"pass",detail:"Latest Security scan completed successfully."});
  }else{
    checks.push({id:"security-workflow",status:"review",detail:"Latest Security scan is "+security.status+" with no final conclusion."});
    reviews.push("security-workflow-pending");
  }

  const environmentReviews=Array.isArray(environment?.reviewRequired)?environment.reviewRequired:[];
  if(environmentReviews.length){
    checks.push({id:"environment",status:"review",detail:`${environmentReviews.length} ENVIRONMENT item(s) require human review.`});
    reviews.push("environment-review-required");
  }else{
    checks.push({id:"environment",status:"pass",detail:"No current ENVIRONMENT material-review requirement was supplied."});
  }

  if(config?.productionAuthorization===true){
    checks.push({id:"authority",status:"block",detail:"ENFORCER must not assert production authorization."});
    blockers.push("production-authority-escalation");
  }else{
    checks.push({id:"authority",status:"pass",detail:"ENFORCER remains defensive and non-producing."});
  }

  const auditDocuments=Array.isArray(auditIndex?.documents)?auditIndex.documents:[];
  checks.push({
    id:"transparency-audit-index",
    status:auditDocuments.length?"pass":"review",
    detail:auditDocuments.length
      ?`${auditDocuments.length} published transparency audit document(s) are indexed.`
      :"No published transparency audit documents were found."
  });
  if(!auditDocuments.length) reviews.push("transparency-audit-index-empty");

  const learning=knowledgeItems.map((item)=>({
    id:item.id||null,
    repository:item.repository||null,
    sourceType:item.sourceType||null,
    sourceSha:item.sourceSha||null,
    sourceNumber:item.sourceNumber??null,
    sourceUrl:item.sourceUrl||null,
    observedAt:item.observedAt||null,
    summary:item.summary||"",
    categories:Array.isArray(item.categories)?item.categories:[],
    evidenceHash:item.evidenceHash||sha256(JSON.stringify(item))
  }));

  const status=blockers.length?"block":reviews.length?"review":"pass";
  return {
    schemaVersion:"datanest-enforcer-assessment-v1",
    generatedAt,
    authority:"defensive-enforcement",
    productionAuthorization:false,
    status,
    checks,
    blockers,
    reviews,
    boundaries:{
      scopeCount:boundaryScopes.length,
      hardRuleCount:hardRules.length,
      scopeIds:boundaryScopes.map(x=>x.id).filter(Boolean)
    },
    securityWorkflow:security,
    knowledge:{
      restrictionMode:config?.knowledgeAccess?.restrictionMode||null,
      itemCount:learning.length,
      categoryCounts,
      items:learning
    },
    environment:{
      compatible:environment?.environmentCompatible??environment?.compatible??null,
      reviewRequiredCount:environmentReviews.length
    },
    transparency:{
      publishedAuditDocumentCount:auditDocuments.length,
      auditDocumentIds:auditDocuments.map(x=>x.id).filter(Boolean),
      rawSecretValuesPublished:false,
      findingsSuppressed:false
    }
  };
}

export function buildTransparencySummary(assessment){
  return {
    schemaVersion:"datanest-enforcer-transparency-v1",
    generatedAt:assessment.generatedAt,
    status:assessment.status,
    productionAuthorization:false,
    defensiveAuthority:"check-enforcement-only",
    checks:assessment.checks,
    blockers:assessment.blockers,
    reviews:assessment.reviews,
    boundaries:assessment.boundaries,
    securityWorkflow:assessment.securityWorkflow,
    knowledge:{
      restrictionMode:assessment.knowledge.restrictionMode,
      itemCount:assessment.knowledge.itemCount,
      categoryCounts:assessment.knowledge.categoryCounts
    },
    environment:assessment.environment,
    transparency:assessment.transparency,
    disclosure:{
      secretValues:false,
      privateAuthenticationMaterial:false,
      rawSensitiveScannerPayloads:false,
      evidenceLineage:true,
      findingStatus:true
    }
  };
}

async function main(){
  const config=await readJson("config/enforcer.tree.json");
  const boundaries=await readJson("config/boundaries.policy.json");
  const knowledge=await readJson(process.env.ENFORCER_KNOWLEDGE_PATH||"/tmp/enforcer/knowledge.json",{});
  const environment=await readJson(process.env.ENFORCER_ENVIRONMENT_PATH||"/tmp/enforcer/environment.json",{});
  const auditIndex=await readJson("public/transparency/audits/index.json",{documents:[]});
  if(!config||!boundaries) throw new Error("ENFORCER requires config/enforcer.tree.json and config/boundaries.policy.json");

  let securityRun=null;
  if(process.env.ENFORCER_SECURITY_RUN_ID){
    securityRun={
      id:Number(process.env.ENFORCER_SECURITY_RUN_ID),
      status:process.env.ENFORCER_SECURITY_RUN_STATUS||"completed",
      conclusion:process.env.ENFORCER_SECURITY_RUN_CONCLUSION||null,
      html_url:process.env.ENFORCER_SECURITY_RUN_URL||null,
      head_sha:process.env.ENFORCER_SECURITY_RUN_SHA||null
    };
  }else{
    securityRun=await fetchLatestSecurityRun(process.env.GITHUB_TOKEN||"",process.env.GITHUB_REPOSITORY||"");
  }

  const assessment=buildEnforcerAssessment({config,boundaries,knowledge,environment,securityRun,auditIndex});
  const transparency=buildTransparencySummary(assessment);
  const learningFeed={
    schemaVersion:"datanest-enforcer-learning-feed-v1",
    generatedAt:assessment.generatedAt,
    authority:"continuous-defensive-learning",
    productionAuthorization:false,
    restrictionMode:assessment.knowledge.restrictionMode,
    itemCount:assessment.knowledge.itemCount,
    categoryCounts:assessment.knowledge.categoryCounts,
    items:assessment.knowledge.items
  };

  await mkdir("enforcer/state",{recursive:true});
  await mkdir("enforcer/feeds",{recursive:true});
  await mkdir("enforcer/transparency",{recursive:true});
  await writeFile("enforcer/state/latest.json",JSON.stringify(assessment,null,2)+"\n");
  await writeFile("enforcer/feeds/knowledge-learning.json",JSON.stringify(learningFeed,null,2)+"\n");
  await writeFile("enforcer/transparency/latest.json",JSON.stringify(transparency,null,2)+"\n");
  process.stdout.write(JSON.stringify({
    status:assessment.status,
    blockers:assessment.blockers.length,
    reviews:assessment.reviews.length,
    knowledgeItems:assessment.knowledge.itemCount
  },null,2)+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
