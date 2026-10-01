import test from "node:test";
import assert from "node:assert/strict";
import { buildSuggesterFeed } from "../../scripts/suggester-engine.mjs";

const config={controls:{mayMutateCanonicalMain:false}};

test("SUGGESTER queues only allowlisted safe healing signals",()=>{
  const feed=buildSuggesterFeed({
    config,
    guardian:{
      status:"healing",
      health:{score:96},
      observed:{
        branches:{redundantBranchCount:2,redundantBranches:["old-a","old-b"]},
        source:{safeRefinementCount:1,safeRefinements:[{file:"a.ts"}]}
      },
      drift:{optimalConditionDrift:[]}
    },
    knowledge:{itemCount:10},
    environment:{environmentCompatible:true,reviewRequired:[]},
    enforcer:{status:"pass",blockers:[],reviews:[]},
    botsquad:{schemaVersion:"datanest-botsquad-consolidated-feed-v1",recommendations:[],uxEaseFeed:[],functionEvolutionFeed:[]},
    conductor:{allProcessesFresh:true}
  });
  assert.equal(feed.commands.length,2);
  assert.deepEqual(feed.commands.map(x=>x.actionId).sort(),[
    "heal-byte-safe-source-noise","heal-redundant-branches"
  ]);
  assert.equal(feed.productionAuthorization,false);
});

test("SUGGESTER keeps blueprint, security and BOTSQUAD changes review-required",()=>{
  const feed=buildSuggesterFeed({
    config,
    guardian:{
      status:"degraded",
      health:{score:80},
      observed:{branches:{redundantBranchCount:0},source:{safeRefinementCount:0}},
      drift:{optimalConditionDrift:[{control:"environment",dimension:"runtime",expected:"compatible",observed:"review"}]}
    },
    knowledge:{itemCount:10,optimizationCandidates:[{category:"maintenance"}]},
    environment:{environmentCompatible:false,reviewRequired:[{dimension:"runtime"}]},
    enforcer:{status:"block",blockers:["security-workflow-failure"],reviews:[]},
    botsquad:{
      schemaVersion:"datanest-botsquad-consolidated-feed-v1",
      recommendations:["Simplify navigation"],
      uxEaseFeed:["Reduce clicks"],
      functionEvolutionFeed:["Add shortcut"]
    },
    conductor:{allProcessesFresh:false}
  });
  assert.equal(feed.commands.length,0);
  assert.ok(feed.suggestions.length>=7);
  assert.ok(feed.suggestions.some(x=>x.type==="code-streamlining"));
  assert.ok(feed.suggestions.every(x=>x.automationClass==="review-required"));
});

test("SUGGESTER deduplicates equivalent suggestions by fingerprint",()=>{
  const feed=buildSuggesterFeed({
    config,
    guardian:{status:"healthy",health:{score:100},observed:{branches:{redundantBranchCount:0},source:{safeRefinementCount:0}},drift:{optimalConditionDrift:[]}},
    knowledge:{itemCount:10},
    environment:{environmentCompatible:true,reviewRequired:[]},
    enforcer:{status:"pass",blockers:[],reviews:[]},
    botsquad:{
      schemaVersion:"datanest-botsquad-consolidated-feed-v1",
      recommendations:["Same","Same"],
      uxEaseFeed:[],
      functionEvolutionFeed:[]
    },
    conductor:{allProcessesFresh:true}
  });
  assert.equal(feed.suggestions.filter(x=>x.type==="ai-optimization").length,1);
});
