import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../../src/components/DataNestApp.tsx",import.meta.url),"utf8");
const workspace=readFileSync(new URL("../../src/components/TransparencyWorkspace.tsx",import.meta.url),"utf8");
const registry=JSON.parse(readFileSync(new URL("../../public/transparency/audits/index.json",import.meta.url),"utf8"));

const fullBrief=Array.from({length:8},(_,index)=>
  readFileSync(
    new URL(`../../public/transparency/audits/external-full-system-audit-brief/part-${String(index+1).padStart(2,"0")}.txt`,import.meta.url),
    "utf8"
  )
).join("");

test("Transparency is a first-class DataNest continuity surface",()=>{
  assert.match(app,/label:"Transparency"/);
  assert.match(app,/view==="transparency"/);
  assert.match(workspace,/Audit library \+ public accountability record/);
});

test("audit library publishes the complete source-controlled accessible transcription",()=>{
  assert.match(fullBrief,/External Full-System Audit Brief/);
  assert.match(fullBrief,/# 1\. How to Use This Audit Brief/);
  assert.match(fullBrief,/# 21\. Required End-to-End Audit Journeys/);
  assert.match(fullBrief,/# 27\. Copy\/Paste Return Format/);
  assert.match(fullBrief,/END OF EXTERNAL AUDIT BRIEF\s*$/);
  assert.ok(fullBrief.length>40000,"full accessible audit brief should not be a shortened summary");
});

test("transparency registry distinguishes methodology from completed audit results",()=>{
  assert.equal(registry.schema_version,1);
  const doc=registry.documents.find(item=>item.id==="external-full-system-audit-brief-v1");
  assert.ok(doc);
  assert.equal(doc.document_type,"audit_brief");
  assert.equal(doc.status,"published");
  assert.equal(doc.audit_result_status,"awaiting_external_audit");
  assert.equal(doc.accessibility.full_text_transcription,true);
  assert.equal(doc.accessibility.parts.length,8);
  assert.equal(doc.authority.governance_effect,false);
  assert.equal(doc.authority.financial_effect,false);
});

test("transparency UI provides accessible read and download paths",()=>{
  assert.match(workspace,/Load full accessible brief/);
  assert.match(workspace,/Complete accessible transcription/);
  assert.match(workspace,/Download as accessible text/);
  assert.match(workspace,/aria-label="Complete accessible transcription of the External Full-System Audit Brief"/);
  assert.doesNotMatch(workspace,/dangerouslySetInnerHTML/);
});


test("public transparency index is source controlled and result state is explicit",()=>{
  const html=readFileSync(new URL("../../public/transparency/index.html",import.meta.url),"utf8");
  assert.match(html,/Transparency and Audit Library/);
  assert.match(html,/Awaiting completed external audit/);
  assert.match(html,/Publishing an audit brief does not imply that an external audit has been completed/);
  assert.match(html,/Transcript part 1/);
  assert.match(html,/Audit document registry \(JSON\)/);
});
