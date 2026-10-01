#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function textFile(filename){try{return await readFile(filename,"utf8");}catch{return "";}}
async function jsonFile(filename){try{return JSON.parse(await readFile(filename,"utf8"));}catch{return null;}}

export function assessEnvironment(config,observed){
  const findings=[];
  const expected=config.expected||{};
  const add=(dimension,status,detail,adaptationClass="none")=>findings.push({dimension,status,detail,adaptationClass});

  add("runtime",
    observed.node22Configured ? "compatible" : "review",
    observed.node22Configured ? "Node 22 setup is present in repository automation." : "Node 22 is not explicitly discoverable in the shared setup.",
    observed.node22Configured ? "none" : "human-review-required");

  add("ci-runner",
    observed.ubuntu2404 ? "compatible" : "review",
    observed.ubuntu2404 ? "Ubuntu 24.04 runner usage is present." : "Expected Ubuntu 24.04 runner was not found.",
    observed.ubuntu2404 ? "none" : "human-review-required");

  add("delivery",
    observed.deliveryProvider===expected.canonicalDelivery ? "compatible" : "review",
    "Canonical delivery observed as "+(observed.deliveryProvider||"unknown")+".",
    observed.deliveryProvider===expected.canonicalDelivery ? "none" : "human-review-required");

  add("backend",
    observed.backendAuthority===expected.backendAuthority ? "compatible" : "review",
    "Backend authority observed as "+(observed.backendAuthority||"unknown")+".",
    observed.backendAuthority===expected.backendAuthority ? "none" : "human-review-required");

  add("registry",
    observed.forgeMode===expected.forgeMode ? "compatible" : "review",
    "Resonance Forge mode observed as "+(observed.forgeMode||"unknown")+".",
    observed.forgeMode===expected.forgeMode ? "none" : "human-review-required");

  add("branch-hygiene",
    observed.botsquadProtected && observed.environmentProtected ? "compatible" : "adapt",
    observed.botsquadProtected && observed.environmentProtected
      ? "BOTSQUAD and ENVIRONMENT automation branches are protected from autonomous cleanup."
      : "Automation branch protection needs alignment.",
    observed.botsquadProtected && observed.environmentProtected ? "none" : "human-review-required");

  add("evidence-observability",
    observed.requiredTreeConfigs.every(Boolean) ? "compatible" : "adapt",
    observed.requiredTreeConfigs.every(Boolean)
      ? "Specialized tree contracts are discoverable."
      : "One or more specialized tree contracts are missing.",
    observed.requiredTreeConfigs.every(Boolean) ? "safe-auto-generated-metadata" : "human-review-required");

  return {
    schemaVersion:"datanest-environment-assessment-v1",
    generatedAt:new Date().toISOString(),
    authority:"advisory-environment-control",
    productionAuthorization:false,
    findings,
    compatible:findings.every(x=>x.status==="compatible"),
    safeApplied:[
      "refreshed generated environment state",
      "refreshed non-authorizing target compatibility feeds"
    ],
    reviewRequired:findings.filter(x=>x.adaptationClass==="human-review-required")
  };
}

function feedFor(target,assessment,config){
  return {
    schemaVersion:"datanest-environment-feed-v1",
    target,
    authority:"advisory",
    productionAuthorization:false,
    generatedAt:assessment.generatedAt,
    environmentCompatible:assessment.compatible,
    findings:assessment.findings,
    reviewRequired:assessment.reviewRequired,
    adaptationPolicy:config.adaptationPolicy
  };
}

async function main(){
  const config=await jsonFile("config/environment.tree.json");
  if(!config) throw new Error("Missing environment tree config");
  const setup=await textFile(".github/actions/node-project-setup/action.yml");
  const ci=await textFile(".github/workflows/ci.yml");
  const boundary=await jsonFile("branch-cleaner.config.json")||{};
  const app=await jsonFile("public/.well-known/reson8-app.json")||{};
  const catalog=await jsonFile("config/supository.catalog.json")||{};

  const requiredTreeConfigs=[
    await jsonFile("config/knowledge-tree.json"),
    await jsonFile("config/boundaries.policy.json"),
    await jsonFile("config/botsquad.tree.json"),
    config
  ];

  const observed={
    node22Configured:/node-version\s*:\s*["']?22\b/.test(setup) || /node-version\s*:\s*["']?22\b/.test(ci),
    ubuntu2404:/ubuntu-24\.04/.test(ci),
    deliveryProvider:app?.delivery?.provider || null,
    backendAuthority:String(catalog?.authority?.backend||"").startsWith("Supabase:") ? "Supabase" : null,
    forgeMode:catalog?.authority?.sovereignForge?.mode || null,
    botsquadProtected:(boundary.protectedPatterns||[]).some(x=>x==="^automation/botsquad/"),
    environmentProtected:(boundary.protectedPatterns||[]).some(x=>x==="^automation/environment-feed$"),
    requiredTreeConfigs
  };

  const assessment=assessEnvironment(config,observed);
  await mkdir("environment/state",{recursive:true});
  await mkdir("environment/feeds",{recursive:true});
  await writeFile("environment/state/latest.json",JSON.stringify(assessment,null,2)+"\n");
  for(const feed of config.feeds||[]){
    await writeFile(feed.path,JSON.stringify(feedFor(feed.target,assessment,config),null,2)+"\n");
  }
  console.log(JSON.stringify({compatible:assessment.compatible,findings:assessment.findings.length},null,2));
}

main().catch(error=>{console.error(error);process.exitCode=1;});
