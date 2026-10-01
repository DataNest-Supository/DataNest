import test from "node:test";
import assert from "node:assert/strict";
import { buildBotWorkOrder, consolidateFeeds, normalizeAiResult } from "../../scripts/botsquad-orchestrator.mjs";

const bot={id:"ux-ease",branch:"automation/botsquad/ux-ease",purpose:"Reduce UX friction."};

test("BOTSQUAD work orders remain advisory and scoped",()=>{
  const order=buildBotWorkOrder(bot,{categoryCounts:{ui:7,testing:2},items:[1,2,3]},{findings:[{dimension:"runtime"}]});
  assert.equal(order.authority,"advisory");
  assert.equal(order.productionAuthorization,false);
  assert.equal(order.bot.id,"ux-ease");
  assert.equal(order.context.strongestKnowledgeCategories[0].category,"ui");
});

test("AI results cannot elevate BOTSQUAD authority",()=>{
  const order=buildBotWorkOrder(bot,{},{});
  const feed=normalizeAiResult(order,{recommendations:["x"],uxEaseFeed:["y"],functionEvolutionFeed:["z"]});
  assert.equal(feed.authority,"advisory");
  assert.equal(feed.productionAuthorization,false);
  assert.deepEqual(feed.uxEaseFeed,["y"]);
});

test("consolidated feed preserves non-authorizing status",()=>{
  const feed=consolidateFeeds([
    {bot:{id:"ux-ease"},recommendations:["r"],uxEaseFeed:["u"],functionEvolutionFeed:[],risks:[]}
  ],"mirror");
  assert.equal(feed.target,"mirror");
  assert.equal(feed.productionAuthorization,false);
  assert.deepEqual(feed.sourceBots,["ux-ease"]);
});
