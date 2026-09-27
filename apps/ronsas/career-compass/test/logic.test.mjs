import test from"node:test";import assert from"node:assert/strict";import{buildCareerPlan}from"../logic.mjs";
test("builds a 30/60/90 plan",()=>{const p=buildCareerPlan({targetRole:"Product Designer",skills:"research, Figma",interests:"AI"});assert.equal(p.targetRole,"Product Designer");assert.equal(p.phases.length,3);assert.ok(p.focusAreas.includes("AI"));});
test("requires target role",()=>assert.throws(()=>buildCareerPlan({}),/Target role/));
