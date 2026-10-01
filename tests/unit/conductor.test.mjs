import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWorkflowState,
  evaluateProcessSchedule,
  selectNextCommand
} from "../../scripts/conductor-orchestrator.mjs";

const now=new Date("2026-10-01T10:00:00Z");
const config={
  retryCooldownMinutes:30,
  processOrder:[
    {id:"knowledge",workflow:"knowledge-tree.yml",workflowName:"Knowledge Tree",maxAgeMinutes:360,dependencies:[],dispatch:{enabled:true}},
    {id:"environment",workflow:"environment-tree.yml",workflowName:"ENVIRONMENT Tree",maxAgeMinutes:360,dependencies:[],dispatch:{enabled:true}},
    {id:"enforcer",workflow:"enforcer.yml",workflowName:"ENFORCER Defence Tree",maxAgeMinutes:180,dependencies:["knowledge","environment"],dispatch:{enabled:true}},
    {id:"guardian",workflow:"guardian.yml",workflowName:"GUARDIAN Health & Healing Tree",maxAgeMinutes:30,dependencies:["knowledge","environment","enforcer"],dispatch:{enabled:true}}
  ],
  safeSuggestionActions:{
    "heal-redundant-branches":{
      workflow:"maintenance.yml",
      workflowName:"DataNest Maintenance",
      inputs:{task:"branch-cleaner"},
      requiresSuggestionNewerThanWorkflow:true
    }
  }
};

const run=(minutesAgo,overrides={})=>({
  id:Math.round(minutesAgo*10)+1,
  status:"completed",
  conclusion:"success",
  created_at:new Date(now.getTime()-minutesAgo*60000).toISOString(),
  updated_at:new Date(now.getTime()-minutesAgo*60000).toISOString(),
  ...overrides
});

function states(values){
  return Object.fromEntries(Object.entries(values).map(([id,runs])=>[id,normalizeWorkflowState(runs,now)]));
}

test("CONDUCTOR dispatches the oldest required dependency before its dependent process",()=>{
  const workflowStates=states({
    knowledge:[run(500)],
    environment:[run(10)],
    enforcer:[run(250)],
    guardian:[run(60)],
    maintenance:[run(10)]
  });
  const processes=evaluateProcessSchedule(config,workflowStates,now);
  const command=selectNextCommand(config,processes,{},workflowStates);
  assert.equal(command.type,"process-dispatch");
  assert.equal(command.processId,"knowledge");
});

test("CONDUCTOR does not duplicate an active workflow",()=>{
  const workflowStates=states({
    knowledge:[run(1,{status:"in_progress",conclusion:null}),run(500)],
    environment:[run(10)],
    enforcer:[run(10)],
    guardian:[run(10)],
    maintenance:[run(10)]
  });
  const processes=evaluateProcessSchedule(config,workflowStates,now);
  const knowledge=processes.find(x=>x.id==="knowledge");
  assert.equal(knowledge.active,true);
  assert.equal(knowledge.due,false);
});

test("CONDUCTOR triggers SUGGESTER when process graph is fresh",()=>{
  const workflowStates=states({
    knowledge:[run(10)],
    environment:[run(10)],
    enforcer:[run(10)],
    guardian:[run(10)],
    maintenance:[run(10)]
  });
  const processes=evaluateProcessSchedule(config,workflowStates,now);
  const command=selectNextCommand(config,processes,{},workflowStates);
  assert.equal(command.type,"trigger-suggester");
  assert.equal(command.workflow,"suggester.yml");
});

test("CONDUCTOR consumes allowlisted SUGGESTER autonomous commands after synchronization",()=>{
  const workflowStates=states({
    knowledge:[run(10)],
    environment:[run(10)],
    enforcer:[run(10)],
    guardian:[run(10)],
    maintenance:[run(120)]
  });
  const processes=evaluateProcessSchedule(config,workflowStates,now);
  const suggester={
    generatedAt:new Date(now.getTime()-30*60000).toISOString(),
    commands:[{
      actionId:"heal-redundant-branches",
      automationClass:"autonomous-safe",
      fingerprint:"sha256:test"
    }]
  };
  const command=selectNextCommand(config,processes,suggester,workflowStates);
  assert.equal(command.type,"safe-suggestion-dispatch");
  assert.equal(command.workflow,"maintenance.yml");
  assert.equal(command.inputs.task,"branch-cleaner");
});
