import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../../src/components/DataNestApp.tsx", import.meta.url),"utf8");
const stakeholder = readFileSync(new URL("../../src/components/StakeholderWorkspace.tsx", import.meta.url),"utf8");
const taxonomy = readFileSync(new URL("../../src/lib/workFocus.ts", import.meta.url),"utf8");
const migration = readFileSync(
  new URL("../../supabase/migrations/20260929062000_link_transcheduler_job_requirements_user_interests.sql", import.meta.url),
  "utf8"
);

test("shared work taxonomy includes UI/UX and governed impact sections",()=>{
  for(const key of [
    "ui_ux","database_architecture","workflow_functionality","cost_saving","brand_promotion",
    "user_acquisition","datanest_ai_learning","governance_process","security_testing","documentation_mentoring"
  ]){
    assert.match(taxonomy,new RegExp('key:"'+key+'"'));
    assert.match(migration,new RegExp("'"+key+"'"));
  }
  assert.match(taxonomy,/label:"UI\/UX"/);
});

test("UNIFI persists Job requirement sections through the idempotent manifest RPC",()=>{
  assert.match(app,/Job requirement sections/);
  assert.match(app,/focusAreas:WorkFocusKey\[\]/);
  assert.match(app,/create_job_manifest_v3/);
  assert.match(app,/job_focus_areas:payload\.focusAreas/);
  assert.match(migration,/requirements->'focus_areas'/);
  assert.match(migration,/'focus_areas',to_jsonb\(normalized_focus_areas\)/);
});

test("Stakeholder interests persist as preferences and remain non-authoritative",()=>{
  assert.match(migration,/add column if not exists interest_keys text\[\]/);
  assert.match(stakeholder,/USER INTERESTS/);
  assert.match(stakeholder,/interest_keys:next/);
  assert.match(stakeholder,/do not change Job priority, execution authority, contribution scores, or access permissions/);
});

test("TranScheduler highlights and optionally filters Jobs by interest intersection",()=>{
  assert.match(app,/select\("interest_keys"\)/);
  assert.match(app,/workMatchesInterests\(item\.requirements,userInterests\)/);
  assert.match(app,/My interests/);
  assert.match(app,/INTEREST MATCH/);
  assert.match(app,/setInterestOnly\(false\)/);
  assert.match(app,/No Jobs on this page match your saved interests/);
});


test("TranScheduler can rank Jobs by interest overlap without changing Job priority",()=>{
  assert.match(taxonomy,/function workInterestOverlapCount/);
  assert.match(app,/sortMode==="interest"/);
  assert.match(app,/workInterestOverlapCount\(right\.requirements,userInterests\)-workInterestOverlapCount\(left\.requirements,userInterests\)/);
  assert.match(app,/<option value="interest">Interest relevance<\/option>/);
  assert.match(app,/return right\.priority-left\.priority\|\|left\.job_number-right\.job_number/);
});


test("interest-only scheduler state is shareable and Stakeholder can open it directly",()=>{
  assert.match(app,/operationalUrlStateKeys=\["page","mode","filter","sort","interests"\]/);
  assert.match(app,/function schedulerInterestOnlyFromUrl/);
  assert.match(app,/url\.searchParams\.get\("interests"\)==="1"/);
  assert.match(app,/url\.searchParams\.set\("interests","1"\)/);
  assert.match(app,/interestOnly=\{schedulerInterestOnly\}/);
  assert.match(stakeholder,/Open matched Jobs/);
  assert.match(stakeholder,/onOpenMatchedJobs:\(\)=>void/);
});


test("TranScheduler explains why each Job matches the user's interests",()=>{
  assert.match(taxonomy,/function workInterestOverlapKeys/);
  assert.match(taxonomy,/workFocusKeysFromRequirements\(requirements\)\.filter\(key=>selected\.has\(key\)\)/);
  assert.match(app,/Matched interests:/);
  assert.match(app,/"Matched "\+workInterestOverlapKeys\(job\.requirements,userInterests\)\.length/);
  assert.match(app,/workInterestOverlapKeys\(job\.requirements,userInterests\)\.map\(workFocusLabel\)\.join\(" · "\)/);
  assert.match(app,/className="interestMatchDetail"/);
});


test("TranScheduler identifies requirement sections outside the user's saved interests",()=>{
  assert.match(taxonomy,/function workInterestGapKeys/);
  assert.match(taxonomy,/workFocusKeysFromRequirements\(requirements\)\.filter\(key=>!selected\.has\(key\)\)/);
  assert.match(app,/function JobInterestEvidence/);
  assert.match(app,/Requirement sections outside your interests:/);
  assert.match(app,/Outside your interests · /);
  assert.match(app,/className="interestGapDetail"/);
});
