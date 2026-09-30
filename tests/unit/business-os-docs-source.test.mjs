import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readme=readFileSync(new URL("../../README.md",import.meta.url),"utf8");
const architecture=readFileSync(new URL("../../docs/ARCHITECTURE.md",import.meta.url),"utf8");
const ux=readFileSync(new URL("../../docs/UX_WORKFLOW_ARCHITECTURE.md",import.meta.url),"utf8");

test("repository docs distinguish current Business OS implementation from approved target architecture",()=>{
  assert.match(readme,/Business, Intelligence, Collaboration, and Expansion Operating System/);
  assert.match(architecture,/current implementation/i);
  assert.match(architecture,/approved target architecture/i);
  assert.match(architecture,/RONSAS.*governed product/i);
  assert.match(architecture,/Sparks.*internal utility/i);
  assert.match(architecture,/External Value Rail.*target/i);
  assert.match(ux,/Discover.*Govern.*Build.*Execute.*Verify/s);
  assert.match(ux,/workspace workflow/i);
  assert.match(ux,/not.*Resonance Project Lifecycle/i);
});

test("target-state concepts are not described as live",()=>{
  const terms=["ALL","CSL","GALUX","iBank","Barterer Tender","Project Director","Conversation Specialist"];
  for(const term of terms){
    const line=architecture.split("\n").find(value=>value.includes(term))||"";
    assert.ok(!line||/target|planned|not yet live|approved target/i.test(line),term+" line must be target-state qualified: "+line);
  }
});

test("UX documentation matches mission-oriented shell groups while keeping the workflow rail distinct",()=>{
  const groups=["Home","Explore","Portfolio","Projects","Intelligence","Governance","Assurance","System"];
  for(const group of groups)assert.match(ux,new RegExp("### "+group+"\\b"));
  assert.match(ux,/Home remains open/);
  assert.match(ux,/mission-oriented workspace groups/);
});
