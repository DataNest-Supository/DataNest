import test from "node:test";
import assert from "node:assert/strict";
import { buildEnforcerAssessment, buildTransparencySummary } from "../../scripts/enforcer-monitor.mjs";

const config={
  productionAuthorization:false,
  knowledgeAccess:{
    includeAllKnowledgeItems:true,
    categoryFilters:[],
    topicFilters:[],
    restrictionMode:"none-on-approved-knowledge-corpus"
  }
};
const boundaries={
  scopes:[{id:"security"},{id:"knowledge"}],
  hardRules:[{id:"no-secrets"}]
};
const knowledge={
  items:[
    {id:"a",categories:["security"],summary:"security learning",evidenceHash:"sha256:a"},
    {id:"b",categories:["ux"],summary:"ux learning",evidenceHash:"sha256:b"}
  ]
};

test("ENFORCER consumes all approved Knowledge categories without filtering",()=>{
  const result=buildEnforcerAssessment({
    config,boundaries,knowledge,environment:{reviewRequired:[]},
    securityRun:{id:1,status:"completed",conclusion:"success"},
    auditIndex:{documents:[{id:"audit-1"}]},
    generatedAt:"2026-10-01T00:00:00.000Z"
  });
  assert.equal(result.status,"pass");
  assert.equal(result.knowledge.itemCount,2);
  assert.equal(result.knowledge.categoryCounts.security,1);
  assert.equal(result.knowledge.categoryCounts.ux,1);
  assert.equal(result.productionAuthorization,false);
});

test("ENFORCER blocks security failure without acquiring production authority",()=>{
  const result=buildEnforcerAssessment({
    config,boundaries,knowledge,environment:{reviewRequired:[]},
    securityRun:{id:2,status:"completed",conclusion:"failure"},
    auditIndex:{documents:[{id:"audit-1"}]}
  });
  assert.equal(result.status,"block");
  assert.ok(result.blockers.includes("security-workflow-failure"));
  assert.equal(result.productionAuthorization,false);
});

test("ENFORCER rejects filtered Knowledge configuration",()=>{
  const filtered={
    ...config,
    knowledgeAccess:{...config.knowledgeAccess,categoryFilters:["security"]}
  };
  const result=buildEnforcerAssessment({
    config:filtered,boundaries,knowledge,environment:{reviewRequired:[]},
    securityRun:{status:"completed",conclusion:"success"},
    auditIndex:{documents:[{id:"audit-1"}]}
  });
  assert.equal(result.status,"block");
  assert.ok(result.blockers.includes("knowledge-access-filter-detected"));
});

test("transparency summary excludes raw learning bodies and secret payloads",()=>{
  const result=buildEnforcerAssessment({
    config,boundaries,knowledge,environment:{reviewRequired:[]},
    securityRun:{status:"completed",conclusion:"success"},
    auditIndex:{documents:[{id:"audit-1"}]}
  });
  const publicSummary=buildTransparencySummary(result);
  assert.equal(publicSummary.disclosure.secretValues,false);
  assert.equal(publicSummary.disclosure.rawSensitiveScannerPayloads,false);
  assert.equal("items" in publicSummary.knowledge,false);
});
