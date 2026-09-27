import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const libPath=path.join(root,"src/lib/executionAuthority.ts");
const panelPath=path.join(root,"src/components/ExecutionAuthorityPanel.tsx");
const appPath=path.join(root,"src/components/DataNestApp.tsx");

test("shared authority types expose A0-A4 and permission gradient",()=>{
  const source=fs.readFileSync(libPath,"utf8");
  for(const token of ["AutonomyLevel","ExecutionOperation","AuthorityEnvelopeState","CapabilityLeaseState","ExecutionCircuitBreakerCategory","ExecutionAuthorityRole","canProposeExecutionAuthority","canApproveExecutionAuthority","canManageCircuitBreakers"]){
    assert.match(source,new RegExp(token));
  }
  for(const level of ["A0","A1","A2","A3","A4"])assert.match(source,new RegExp(level));
  for(const op of ["observe","prepare","write","execute","promote","destruct"])assert.match(source,new RegExp(op));
});

test("Authority & Execution panel reads governed workspace and mutates only through RPCs",()=>{
  assert.equal(fs.existsSync(panelPath),true,"ExecutionAuthorityPanel must exist");
  const source=fs.readFileSync(panelPath,"utf8");
  for(const fn of [
    "get_execution_authority_workspace_v1","propose_authority_envelope_v1","approve_authority_envelope_v1",
    "reject_authority_envelope_v1","revoke_authority_envelope_v1","issue_capability_lease_v1",
    "release_capability_lease_v1","set_execution_circuit_breaker_v1"
  ])assert.match(source,new RegExp(fn));
  assert.doesNotMatch(source,/from\("(?:authority_envelopes|capability_leases|execution_circuit_breakers|execution_authority_decisions)"\)\.(?:insert|update|delete)/);
});

test("UI makes authorization and capacity boundaries explicit",()=>{
  const source=fs.readFileSync(panelPath,"utf8");
  assert.match(source,/Capacity reservation ≠ authorization lease/);
  assert.match(source,/Authority Envelopes do not store credentials/);
  assert.match(source,/A4 is human-gated/);
  assert.match(source,/generic automated lease is unavailable/i);
  assert.match(source,/Circuit breakers/);
  assert.doesNotMatch(source,/API key|Password|Secret value|Access token|Refresh token/);
});

test("UI role-gates proposal, A3 approval, leases and circuit breakers",()=>{
  const source=fs.readFileSync(panelPath,"utf8");
  assert.match(source,/canProposeExecutionAuthority\(role\)/);
  assert.match(source,/canApproveExecutionAuthority\(role,/);
  assert.match(source,/canManageCircuitBreakers\(role\)/);
  assert.match(source,/Owner \/ admin/);
  assert.match(source,/Human-gated A4/);
  assert.match(source,/role==="operator"\?autonomyLevels\.filter\(level=>level!=="A4"\):autonomyLevels/);
});

test("TranScheduler keeps Gantt default and adds Authority & Execution as a sibling mode",()=>{
  const source=fs.readFileSync(appPath,"utf8");
  assert.match(source,/useState<"queue"\|"gantt"\|"authority"\|"resources">\("gantt"\)/);
  assert.match(source,/>Queue<\/button>/);
  assert.match(source,/>Gantt chart<\/button>/);
  assert.match(source,/>Authority & Execution<\/button>/);
  assert.match(source,/viewMode==="authority"[\s\S]*ExecutionAuthorityPanel/);
  assert.match(source,/role=\{membership\?\.role\|\|"viewer"\}/);
});

test("existing human scheduler controls remain outside Authority Envelope requirements",()=>{
  const source=fs.readFileSync(appPath,"utf8");
  assert.match(source,/onStatus\(job,"PAUSED"\)/);
  assert.match(source,/onStatus\(job,"READY"\)/);
  assert.match(source,/onStatus\(job,"CANCELLED"\)/);
  assert.doesNotMatch(source,/service_authorize_execution_v1/);
});
