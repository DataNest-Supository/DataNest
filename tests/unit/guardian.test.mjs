import test from "node:test";
import assert from "node:assert/strict";
import { buildGuardianSnapshot } from "../../scripts/guardian-health.mjs";

const dimensions=[
  "source-control","runtime","ci-runner","delivery","backend","ai-inference",
  "registry","backup-recovery","dependency-posture","branch-hygiene","evidence-observability"
];

const blueprint={
  schemaVersion:"datanest-guardian-blueprint-v1",
  blueprintVersion:1,
  requiredTrees:[{id:"knowledge"},{id:"boundaries"},{id:"botsquad"},{id:"environment"},{id:"enforcer"},{id:"guardian"},{id:"conductor"},{id:"suggester"}],
  environment:{requiredDimensions:dimensions,requiredStatus:"compatible",requiredCompatible:true},
  coordination:{conductorMaxAgeMinutes:30,suggesterMaxAgeMinutes:30,requiredConductorAuthority:"process-synchronization",requiredSuggesterAuthority:"optimization-advisory"},
  knowledge:{minimumApprovedItems:1},
  sourceHealth:{maximumHighReviewerFindings:0},
  healthThresholds:{healthy:90,criticalBelow:70}
};

const config={healing:{autonomous:["safe"]}};
const environment={
  schemaVersion:"datanest-environment-feed-v1",
  target:"guardian",
  productionAuthorization:false,
  environmentCompatible:true,
  findings:dimensions.map(dimension=>({dimension,status:"compatible",detail:"ok",adaptationClass:"none"})),
  reviewRequired:[]
};
const enforcer={status:"pass",blockers:[],reviews:[]};
const knowledge={
  schemaVersion:"datanest-knowledge-feed-v1",
  target:"datanest",
  productionAuthorization:false,
  itemCount:5,
  items:[{id:"1"}]
};
const botsquad={
  schemaVersion:"datanest-botsquad-consolidated-feed-v1",
  target:"datanest",
  productionAuthorization:false,
  botCount:9
};
const treeContracts={knowledge:true,boundaries:true,botsquad:true,environment:true,enforcer:true,guardian:true,conductor:true,suggester:true};
const conductorState={generatedAt:"2026-10-01T07:50:00.000Z",authority:"process-synchronization",allProcessesFresh:true,nextCommand:{type:"trigger-suggester"}};
const suggesterFeed={generatedAt:"2026-10-01T07:55:00.000Z",authority:"optimization-advisory",summary:{total:0,autonomousSafe:0}};
const sourceState={"config/a.json":{sha256:"sha256:a",bytes:1}};
const reviewerReport={summary:{filesReviewed:20,high:0,medium:0,low:0,findings:0},refinements:[],nextSteps:[]};
const branchReport={github:{branches:[
  {name:"main",classification:{decision:"keep",status:"identical"}}
]},apply:{deleted:[],failed:[]}};

function snapshot(overrides={}){
  return buildGuardianSnapshot({
    config,blueprint,environment,enforcer,knowledge,botsquad,conductorState,suggesterFeed,branchReport,reviewerReport,
    previousSnapshot:null,sourceState,treeContracts,headSha:"a".repeat(40),
    generatedAt:"2026-10-01T08:00:00.000Z",
    ...overrides
  });
}

test("GUARDIAN reports optimal blueprint health",()=>{
  const result=snapshot();
  assert.equal(result.status,"healthy");
  assert.equal(result.health.score,100);
  assert.equal(result.productionAuthorization,false);
  assert.equal(result.drift.optimalConditionDrift.length,0);
});

test("GUARDIAN enters healing state for provably redundant branches",()=>{
  const result=snapshot({
    branchReport:{github:{branches:[
      {name:"main",classification:{decision:"keep",status:"identical"}},
      {name:"old-merged",classification:{decision:"delete_candidate",status:"behind"}}
    ]},apply:{deleted:[],failed:[]}}
  });
  assert.equal(result.status,"healing");
  assert.deepEqual(result.healing.candidates.redundantBranches,["old-merged"]);
  assert.ok(result.health.score>=90);
});

test("GUARDIAN treats ENFORCER block as critical",()=>{
  const result=snapshot({enforcer:{status:"block",blockers:["security-workflow-failure"],reviews:[]}});
  assert.equal(result.status,"critical");
  assert.equal(result.observed.enforcer.status,"block");
  assert.ok(result.drift.optimalConditionDrift.some(x=>x.control==="enforcer"));
});

test("GUARDIAN measures source and ENVIRONMENT changes against previous snapshot",()=>{
  const previous=snapshot();
  const changedEnvironment={
    ...environment,
    findings:environment.findings.map(item=>item.dimension==="runtime"?{...item,status:"review"}:item),
    environmentCompatible:false
  };
  const result=snapshot({
    environment:changedEnvironment,
    sourceState:{"config/a.json":{sha256:"sha256:b",bytes:2}},
    previousSnapshot:previous
  });
  assert.equal(result.status,"degraded");
  assert.equal(result.drift.sincePrevious.sourceChanges.length,1);
  assert.ok(result.drift.sincePrevious.environmentChanges.some(x=>x.dimension==="runtime"));
  assert.ok(result.drift.optimalConditionDrift.some(x=>x.dimension==="runtime"));
});

test("GUARDIAN degrades when a required tree contract or BOTSQUAD feed is missing",()=>{
  const result=snapshot({
    treeContracts:{...treeContracts,guardian:false},
    botsquad:{}
  });
  assert.equal(result.status,"critical");
  assert.ok(result.observed.trees.missing.includes("guardian"));
  assert.ok(result.drift.optimalConditionDrift.some(x=>x.control==="botsquad-feed"));
});

test("GUARDIAN degrades when coordination state is stale",()=>{
  const result=snapshot({
    conductorState:{...conductorState,generatedAt:"2026-10-01T06:00:00.000Z"},
    suggesterFeed:{...suggesterFeed,generatedAt:"2026-10-01T06:00:00.000Z"}
  });
  assert.equal(result.status,"degraded");
  assert.ok(result.drift.optimalConditionDrift.some(x=>x.control==="coordination"));
});
