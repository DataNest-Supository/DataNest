#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";

export function assess(policy){
  const failures=[];
  const b=policy?.toleranceBoundaries||{};
  const required={
    productionAuthorization:"human-approved-only",
    unknownCapabilityState:"deny",
    canonicalMutationFromMirror:"deny",
    canonicalMutationFromFreetree:"deny",
    autonomousDestructiveChange:"redundant-history-only",
    aiOutputAuthority:"advisory-unless-human-approved"
  };
  for(const [key,value] of Object.entries(required)){
    if(b[key]!==value) failures.push({id:"boundary:"+key,expected:value,received:b[key]??null});
  }
  const ids=new Set((policy?.acceptanceCriteria||[]).map(x=>x.id));
  for(let i=1;i<=10;i++){
    const id="BND-"+String(i).padStart(3,"0");
    if(!ids.has(id)) failures.push({id:"acceptance:"+id,expected:"present",received:"missing"});
  }
  return failures;
}

async function main(){
  const policy=JSON.parse(await readFile("config/boundaries.policy.json","utf8"));
  const failures=assess(policy);
  const report={
    schemaVersion:"datanest-boundaries-assessment-v1",
    generatedAt:new Date().toISOString(),
    authority:policy.authority,
    scope:policy.scope,
    result:failures.length?"fail":"pass",
    criteriaCount:policy.acceptanceCriteria?.length||0,
    failures
  };
  await mkdir("boundaries/reports",{recursive:true});
  await writeFile("boundaries/reports/latest.json",JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
  if(failures.length) process.exitCode=1;
}

main().catch(e=>{console.error(e);process.exitCode=1;});
