import test from "node:test";
import assert from "node:assert/strict";
import { buildRegulatorState } from "../../scripts/regulator-engine.mjs";

const config={
  botsquadRoles:[
    {id:"regulator-auditor"},
    {id:"regulator-stress-tester"},
    {id:"regulator-acquisition-scout"},
    {id:"regulator-supply-coordinator"},
    {id:"regulator-action-planner"}
  ],
  controls:{
    mayPurchase:false,mayCommitFunds:false,mayAcquireCredentials:false,
    mayBypassSecurity:false,mayChangeBoundaries:false,mayMerge:false,mayDeployProduction:false
  }
};
const boundaries={scopes:[{id:"a"}],hardRules:[{id:"b"}]};

test("REGULATOR is harmonized when no requirement source is unresolved",()=>{
  const state=buildRegulatorState({
    config,boundaries,
    guardian:{status:"healthy",drift:{optimalConditionDrift:[]}},
    enforcer:{status:"pass",blockers:[],reviews:[]},
    calmer:{status:"softening-active"},
    environment:{environmentCompatible:true,reviewRequired:[]},
    conductor:{allProcessesFresh:true},
    suggester:{suggestions:[]},
    botsquad:{risks:[]}
  });
  assert.equal(state.status,"harmonized");
  assert.equal(state.requirements.length,0);
  assert.equal(state.productionAuthorization,false);
  assert.equal(state.transparency.financialCommitmentsAuthorized,false);
});

test("REGULATOR turns security and health gaps into transparent BOTSQUAD requirements",()=>{
  const state=buildRegulatorState({
    config,boundaries,
    guardian:{status:"degraded",drift:{optimalConditionDrift:[{control:"environment",dimension:"runtime"}]}},
    enforcer:{status:"block",blockers:["security-workflow-failure"],reviews:[]},
    calmer:{status:"softening-suspended"},
    environment:{environmentCompatible:false,reviewRequired:[{dimension:"runtime"}]},
    conductor:{allProcessesFresh:false},
    suggester:{suggestions:[]},
    botsquad:{risks:[]}
  });
  assert.equal(state.status,"blocked");
  assert.ok(state.requirements.length>=4);
  assert.ok(state.botsquadPacket.requirements.every(x=>x.botsquadTasks.includes("audit")));
  assert.ok(state.botsquadPacket.requirements.every(x=>x.botsquadTasks.includes("stress-test")));
  assert.ok(state.botsquadPacket.requirements.every(x=>x.botsquadTasks.includes("acquisition-scout")));
  assert.equal(state.controls.mayPurchase,false);
});

test("REGULATOR deduplicates repeated review suggestions",()=>{
  const suggestion={
    automationClass:"review-required",priority:"medium",title:"Same",detail:"same",
    fingerprint:"sha256:same"
  };
  const state=buildRegulatorState({
    config,boundaries,
    guardian:{status:"healthy",drift:{optimalConditionDrift:[]}},
    enforcer:{status:"pass",blockers:[],reviews:[]},
    calmer:{status:"softening-active"},
    environment:{environmentCompatible:true,reviewRequired:[]},
    conductor:{allProcessesFresh:true},
    suggester:{suggestions:[suggestion,suggestion]},
    botsquad:{risks:[]}
  });
  assert.equal(state.requirements.length,1);
});
