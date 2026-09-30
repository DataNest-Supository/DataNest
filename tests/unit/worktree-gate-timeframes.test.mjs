import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  listWorktreeGateProfiles,
  proposeWorktreeGateTimeframe
} from "../../scripts/propose-worktree-gate-timeframe.mjs";

const workflowsDir=new URL("../../.github/workflows/",import.meta.url);
const profiles=listWorktreeGateProfiles();
const reusable="worktree-gate-timeframe.yml";

test("every worktree workflow gate is covered by the shared timeframe registry",()=>{
  const files=readdirSync(workflowsDir)
    .filter((name)=>name.endsWith(".yml"))
    .filter((name)=>name!==reusable)
    .sort();
  const configured=Object.keys(profiles).sort();

  assert.deepEqual(configured,files);
  assert.equal(files.length,13);
});

test("every worktree gate invokes the reusable DataNest AI timeframe policy",()=>{
  for(const [workflowFile,profile] of Object.entries(profiles)){
    const source=readFileSync(new URL(`../../.github/workflows/${workflowFile}`,import.meta.url),"utf8");
    assert.match(source,/\n  gate-timeframe:\n/,`${workflowFile} missing gate-timeframe job`);
    assert.match(
      source,/uses: \.\/\.github\/workflows\/worktree-gate-timeframe\.yml/,
      `${workflowFile} missing shared timeframe workflow`
    );
    assert.match(
      source,new RegExp(`gate_id: ["']?${profile.gateId.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")}["']?`),
      `${workflowFile} uses wrong gate id`
    );
  }
});

test("current production governance gate proposes the maximum 72-hour evidence window",()=>{
  const proposal=proposeWorktreeGateTimeframe({gateId:"pages"});
  assert.equal(proposal.taskComplexity,"cross_system");
  assert.equal(proposal.reportingComplexity,"audit_grade");
  assert.deepEqual(proposal.reviewDomains,[
    "governanceReview",
    "legalReview",
    "externalReview"
  ]);
  assert.equal(proposal.rawHours,66);
  assert.equal(proposal.recommendedHours,72);
});

test("security and expiry gates get risk-appropriate default windows",()=>{
  const security=proposeWorktreeGateTimeframe({gateId:"security-scan"});
  assert.equal(security.recommendedHours,36);

  const expiry=proposeWorktreeGateTimeframe({gateId:"ui-owner-test-mode-expiry"});
  assert.equal(expiry.recommendedHours,12);
});

test("changed-file scope can escalate task complexity without reducing profile risk",()=>{
  const small=proposeWorktreeGateTimeframe({
    gateId:"branch-cleaner",
    changedFiles:1
  });
  const broad=proposeWorktreeGateTimeframe({
    gateId:"branch-cleaner",
    changedFiles:40
  });
  assert.equal(small.taskComplexity,"standard");
  assert.equal(small.recommendedHours,24);
  assert.equal(broad.taskComplexity,"cross_system");
  assert.equal(broad.recommendedHours,36);
});

test("Owner override remains bounded and auditable for every gate",()=>{
  const override=proposeWorktreeGateTimeframe({
    gateId:"pr-verification",
    overrideHours:24
  });
  assert.equal(override.recommendedHours,36);
  assert.equal(override.acceptedHours,24);
  assert.equal(override.ownerOverride,true);
  assert.equal(override.overrideDeltaHours,-12);

  assert.throws(
    ()=>proposeWorktreeGateTimeframe({
      gateId:"pr-verification",
      overrideHours:73
    }),
    /between 0\.5 and 72/
  );
});

test("shared reusable gate workflow emits retained evidence artifacts",()=>{
  const source=readFileSync(new URL("../../.github/workflows/worktree-gate-timeframe.yml",import.meta.url),"utf8");
  assert.match(source,/propose-worktree-gate-timeframe\.mjs/);
  assert.match(source,/worktree-gate-timeframe-\$\{\{ inputs\.gate_id \}\}-\$\{\{ github\.run_id \}\}/);
  assert.match(source,/retention-days: 30/);
  assert.match(source,/changed_files/);
});
