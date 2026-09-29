"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Candidate={
  id:string;
  normalized_knowledge:string;
  category:string;
  risk_class:"low"|"normal"|"high";
  lifecycle_state:string;
  evidence_count:number;
  has_conflict:boolean;
  confidence:number|null;
  required_authority:"automation"|"admin"|"owner";
  language_review:{
    required:boolean;
    sourceLanguages:string[];
    reasons:string[];
    evidenceIds:string[];
  };
  updated_at:string;
};

type ValidationRun={
  id:string;
  candidate_id:string;
  gate:"AUDIT"|"VERIFY"|"VALIDATE"|"STRESS_TEST"|"LANGUAGE_REVIEW";
  passed:boolean;
  created_at:string;
};

type MemoryReviewItem={
  id:string;
  normalized_knowledge:string;
  category:string;
  effective_version:number;
  certification_class:string;
  confidence:number|null;
  review_after:string;
  last_verified_at:string|null;
  promoted_at:string;
};

type MemoryOutcomeItem={
  id:string;
  memory_id:string;
  usage_receipt_id:string;
  signal:"supported"|"neutral"|"challenged"|"contradicted"|"unknown";
  outcome_kind:string;
  summary:string;
  review_triggered:boolean;
  recorder_role:"owner"|"admin";
  created_at:string;
};

type WorkspaceResponse={
  role:"owner"|"admin";
  candidates:Candidate[];
  validationRuns:ValidationRun[];
  memoryReviewItems:MemoryReviewItem[];
  memoryOutcomeItems:MemoryOutcomeItem[];
};

type Props={
  projectId:string;
  role:"owner"|"admin"|"operator"|"viewer";
  onChanged:()=>Promise<void>;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
};

const baseGateOrder=["AUDIT","VERIFY","VALIDATE","STRESS_TEST"] as const;
const languageGateOrder=["AUDIT","VERIFY","LANGUAGE_REVIEW","VALIDATE","STRESS_TEST"] as const;

type LanguageReviewDraft={
  languages:string;
  basis:string;
  meaningPreserved:boolean;
  noUnresolvedAmbiguity:boolean;
};

function candidateGateOrder(candidate:Candidate){
  return candidate.language_review?.required?languageGateOrder:baseGateOrder;
}

function formatDate(value:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"
  }).format(new Date(value));
}

function normalizeWorkspaceResponse(data:unknown,fallbackRole:"owner"|"admin"):WorkspaceResponse{
  const record=data&&typeof data==="object"&&!Array.isArray(data)
    ?data as Record<string,unknown>
    :{};
  const responseRole=record.role==="owner"||record.role==="admin"
    ?record.role
    :fallbackRole;
  return {
    role:responseRole,
    candidates:Array.isArray(record.candidates)?record.candidates as Candidate[]:[],
    validationRuns:Array.isArray(record.validationRuns)?record.validationRuns as ValidationRun[]:[],
    memoryReviewItems:Array.isArray(record.memoryReviewItems)?record.memoryReviewItems as MemoryReviewItem[]:[],
    memoryOutcomeItems:Array.isArray(record.memoryOutcomeItems)?record.memoryOutcomeItems as MemoryOutcomeItem[]:[]
  };
}

export default function DataNestAiCertificationPanel({
  projectId,role,onChanged,setNotice,setError
}:Props){
  const [workspace,setWorkspace]=useState<WorkspaceResponse|null>(null);
  const [busyId,setBusyId]=useState("");
  const [busyMemoryId,setBusyMemoryId]=useState("");
  const [languageReviewDrafts,setLanguageReviewDrafts]=useState<Record<string,LanguageReviewDraft>>({});

  const canReview=role==="owner"||role==="admin";

  const load=useCallback(async()=>{
    if(!canReview){setWorkspace(null);return;}
    const supabase=getSupabase();
    if(!supabase)return;
    const {data,error}=await supabase.functions.invoke("datanest-ai-certification",{
      body:{action:"workspace",projectId}
    });
    if(error){setError(error.message);return;}
    const fallbackRole:"owner"|"admin"=role==="owner"?"owner":"admin";
    setWorkspace(normalizeWorkspaceResponse(data,fallbackRole));
  },[canReview,projectId,role,setError]);

  useEffect(()=>{void load()},[load]);

  const runsByCandidate=useMemo(()=>{
    const map=new Map<string,Map<string,boolean>>();
    for(const run of workspace?.validationRuns||[]){
      if(!map.has(run.candidate_id))map.set(run.candidate_id,new Map());
      const candidateRuns=map.get(run.candidate_id)!;
      if(!candidateRuns.has(run.gate))candidateRuns.set(run.gate,run.passed);
    }
    return map;
  },[workspace]);

  async function invoke(action:string,candidate:Candidate,extra:Record<string,unknown>={}){
    const supabase=getSupabase();
    if(!supabase)return;
    setBusyId(candidate.id);
    setError("");
    try{
      const {error}=await supabase.functions.invoke("datanest-ai-certification",{
        body:{action,projectId,candidateId:candidate.id,...extra}
      });
      if(error)throw error;
      setNotice(
        action==="promote"
          ?"Certified DataNest AI memory promoted to project-wide context."
          :action==="certify"
            ?"Learning candidate certified."
            :extra.gate==="LANGUAGE_REVIEW"
              ?"Governed language review recorded."
              :"Certification evidence recorded."
      );
      await load();
      await onChanged();
    }catch(actionError){
      setError(actionError instanceof Error?actionError.message:"Certification action failed.");
    }finally{
      setBusyId("");
    }
  }

  function languageReviewDraft(candidate:Candidate):LanguageReviewDraft{
    return languageReviewDrafts[candidate.id]||{
      languages:(candidate.language_review?.sourceLanguages||[]).join(", "),
      basis:"",
      meaningPreserved:false,
      noUnresolvedAmbiguity:false
    };
  }

  function updateLanguageReviewDraft(candidate:Candidate,patch:Partial<LanguageReviewDraft>){
    setLanguageReviewDrafts(current=>{
      const base=current[candidate.id]||{
        languages:(candidate.language_review?.sourceLanguages||[]).join(", "),
        basis:"",
        meaningPreserved:false,
        noUnresolvedAmbiguity:false
      };
      return {...current,[candidate.id]:{...base,...patch}};
    });
  }

  async function recordLanguageReview(candidate:Candidate){
    const draft=languageReviewDraft(candidate);
    const reviewedLanguages=draft.languages
      .split(",")
      .map(value=>value.trim())
      .filter(Boolean);
    await invoke("record_validation",candidate,{
      gate:"LANGUAGE_REVIEW",
      suiteVersion:"datanest-language-review-v1",
      reviewedLanguages,
      reviewBasis:draft.basis,
      meaningPreserved:draft.meaningPreserved,
      unresolvedAmbiguity:!draft.noUnresolvedAmbiguity,
      results:{source:"DataNest AI certification console"}
    });
  }

  async function reviewMemory(memory:MemoryReviewItem,decision:"reaffirmed"|"retired"){
    const supabase=getSupabase();
    if(!supabase)return;
    setBusyMemoryId(memory.id);
    setError("");
    try{
      const {error}=await supabase.functions.invoke("datanest-ai-certification",{
        body:{
          action:"review_memory",
          projectId,
          memoryId:memory.id,
          decision,
          reason:decision==="reaffirmed"
            ?"Human review reaffirmed active Certified Memory under the governed review lifecycle."
            :"Owner retired Certified Memory after governed review."
        }
      });
      if(error)throw error;
      setNotice(
        decision==="reaffirmed"
          ?"Verified Memory reaffirmed and its review schedule refreshed."
          :"Verified Memory retired from active project context."
      );
      await load();
      await onChanged();
    }catch(actionError){
      setError(actionError instanceof Error?actionError.message:"Verified Memory review failed.");
    }finally{
      setBusyMemoryId("");
    }
  }

  if(!canReview){
    return <section className="panel datanestAiCertificationPanel">
      <div className="panelHead">
        <div>
          <p className="eyebrow">LEARNING & CERTIFICATION</p>
          <h3>Governed promotion</h3>
        </div>
      </div>
      <p className="muted">
        Owner or Admin access is required to review learning candidates. Your current role can use certified memory but cannot certify it.
      </p>
    </section>;
  }

  return <section className="panel datanestAiCertificationPanel">
    <div className="panelHead">
      <div>
        <p className="eyebrow">LEARNING & CERTIFICATION</p>
        <h3>Audit → verify → language review when required → validate → stress-test → certify</h3>
      </div>
      <button className="textButton" type="button" onClick={()=>void load()}>Refresh</button>
    </div>

    {(workspace?.memoryReviewItems.length||0)>0&&<>
      <div className="rowBetween">
        <div>
          <h4>Verified Memory review queue</h4>
          <p className="muted">Review-due memory stays historically certified, but receives a lower retrieval weight until it is reaffirmed or retired.</p>
        </div>
        <span className="countPill">{workspace?.memoryReviewItems.length||0}</span>
      </div>
      <div className="manifestList">
        {(workspace?.memoryReviewItems||[]).map(memory=><article className="manifestCard" key={memory.id}>
          <div className="rowBetween">
            <div>
              <b>{memory.category.replaceAll("_"," ")}</b>
              <small>{"Memory v"+memory.effective_version+" · review due "+formatDate(memory.review_after)}</small>
            </div>
            <span className="badge warn">CERTIFIED · REVIEW DUE</span>
          </div>
          <p>{memory.normalized_knowledge}</p>
          <div className="manifestMeta">
            <span>{memory.certification_class}</span>
            <span>{memory.confidence==null?"confidence —":"confidence "+Math.round(memory.confidence*100)+"%"}</span>
            <span>{memory.last_verified_at?"last reviewed "+formatDate(memory.last_verified_at):"initial certification "+formatDate(memory.promoted_at)}</span>
          </div>
          <div className="rowActions">
            <button
              className="primaryButton compact"
              type="button"
              disabled={busyMemoryId===memory.id}
              onClick={()=>void reviewMemory(memory,"reaffirmed")}
            >Reaffirm reviewed memory</button>
            {role==="owner"&&<button
              className="secondaryButton compact"
              type="button"
              disabled={busyMemoryId===memory.id}
              onClick={()=>void reviewMemory(memory,"retired")}
            >Retire from active memory</button>}
          </div>
        </article>)}
      </div>
    </>}

    {(workspace?.memoryOutcomeItems.length||0)>0&&<>
      <div className="rowBetween">
        <div>
          <h4>Verified Memory outcome evidence</h4>
          <p className="muted">Outcome signals are audit evidence, not automatic truth. Challenges can accelerate review; positive use never raises certification authority by itself.</p>
        </div>
        <span className="countPill">{workspace?.memoryOutcomeItems.length||0}</span>
      </div>
      <div className="manifestList">
        {(workspace?.memoryOutcomeItems||[]).slice(0,12).map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween">
            <div>
              <b>{item.signal.replaceAll("_"," ")}</b>
              <small>{item.outcome_kind.replaceAll("_"," ")+" · "+formatDate(item.created_at)}</small>
            </div>
            <span className={"badge "+(item.signal==="contradicted"||item.signal==="challenged"?"warn":"good")}>
              {item.review_triggered?"REVIEW TRIGGERED":"EVIDENCE ONLY"}
            </span>
          </div>
          <p>{item.summary}</p>
          <div className="manifestMeta">
            <span>{"memory "+item.memory_id.slice(0,8)}</span>
            <span>{"receipt "+item.usage_receipt_id.slice(0,8)}</span>
            <span>{"recorded by "+item.recorder_role}</span>
          </div>
        </article>)}
      </div>
    </>}

    <div className="manifestList">
      {(workspace?.candidates||[]).map(candidate=>{
        const gateState=runsByCandidate.get(candidate.id)||new Map<string,boolean>();
        const gates=candidateGateOrder(candidate);
        const allPassed=gates.every(gate=>gateState.get(gate)===true);
        const canHumanCertify=candidate.required_authority!=="owner"||role==="owner";
        const languageDraft=languageReviewDraft(candidate);
        return <article className="manifestCard" key={candidate.id}>
          <div className="rowBetween">
            <div>
              <b>{candidate.category.replaceAll("_"," ")}</b>
              <small>{candidate.lifecycle_state+" · "+candidate.evidence_count+" evidence item"+(candidate.evidence_count===1?"":"s")}</small>
            </div>
            <span className={"badge "+(candidate.has_conflict?"bad":candidate.lifecycle_state==="CERTIFIED"?"good":"warn")}>
              {candidate.has_conflict?"CONFLICT":candidate.lifecycle_state}
            </span>
          </div>

          <p>{candidate.normalized_knowledge}</p>
          <div className="manifestMeta">
            <span>{"risk "+candidate.risk_class}</span>
            <span>{"requires "+candidate.required_authority}</span>
            <span>{candidate.confidence==null?"confidence —":"confidence "+Math.round(candidate.confidence*100)+"%"}</span>
          </div>

          {candidate.language_review?.required&&<div className="plannerForm">
            <div>
              <b>Language review required</b>
              <p className="muted">
                Review the preserved source evidence before certification. This records a role-authorized human review; it does not claim a language-qualification registry check.
              </p>
              <div className="manifestMeta">
                <span>{"source languages "+(candidate.language_review.sourceLanguages.join(", ")||"not supplied")}</span>
                <span>{"signals "+(candidate.language_review.reasons.join(", ")||"review required")}</span>
              </div>
            </div>
            <label>
              Reviewed BCP 47 languages
              <input
                value={languageDraft.languages}
                placeholder="e.g. af, en-ZA"
                onChange={event=>updateLanguageReviewDraft(candidate,{languages:event.target.value})}
              />
            </label>
            <label>
              Review basis and limitations
              <textarea
                rows={3}
                value={languageDraft.basis}
                placeholder="Describe the source comparison, terminology checks, and any limitations."
                onChange={event=>updateLanguageReviewDraft(candidate,{basis:event.target.value})}
              />
            </label>
            <div className="checkRow">
              <label>
                <input
                  type="checkbox"
                  checked={languageDraft.meaningPreserved}
                  onChange={event=>updateLanguageReviewDraft(candidate,{meaningPreserved:event.target.checked})}
                />
                Meaning, negation, quantities and modal force are preserved.
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={languageDraft.noUnresolvedAmbiguity}
                  onChange={event=>updateLanguageReviewDraft(candidate,{noUnresolvedAmbiguity:event.target.checked})}
                />
                No unresolved semantic ambiguity remains.
              </label>
            </div>
            <button
              className="secondaryButton compact"
              type="button"
              disabled={
                busyId===candidate.id||
                gateState.get("LANGUAGE_REVIEW")===true||
                candidate.lifecycle_state==="CERTIFIED"||
                !languageDraft.meaningPreserved||
                !languageDraft.noUnresolvedAmbiguity||
                languageDraft.basis.trim().length<12||
                !languageDraft.languages.trim()
              }
              onClick={()=>void recordLanguageReview(candidate)}
            >{gateState.get("LANGUAGE_REVIEW")===true?"✓ LANGUAGE REVIEW":"Record language review"}</button>
          </div>}

          <div className="datanestAiGateRow">
            {gates.map(gate=>{
              const passed=gateState.get(gate)===true;
              if(gate==="STRESS_TEST"){
                return <span
                  className={passed?"secondaryButton compact active":"secondaryButton compact"}
                  key={gate}
                  title="Recorded by governed stress suite"
                >{passed?"✓ ":""}STRESS TEST · Recorded by governed stress suite</span>;
              }
              if(gate==="LANGUAGE_REVIEW"){
                return <span
                  className={passed?"secondaryButton compact active":"secondaryButton compact"}
                  key={gate}
                  title="Recorded through the governed language review form"
                >{passed?"✓ ":""}LANGUAGE REVIEW · Human evidence</span>;
              }
              return <button
                key={gate}
                className={passed?"secondaryButton compact active":"secondaryButton compact"}
                type="button"
                disabled={busyId===candidate.id||passed||candidate.lifecycle_state==="CERTIFIED"}
                onClick={()=>void invoke("record_validation",candidate,{
                  gate,
                  passed:true,
                  suiteVersion:"datanest-ai-governed-memory-v1",
                  results:{source:"DataNest AI certification console"}
                })}
              >{passed?"✓ ":""}{gate.replace("_"," ")}</button>;
            })}
          </div>

          <div className="rowActions">
            {candidate.lifecycle_state!=="CERTIFIED"&&<button
              className="primaryButton compact"
              type="button"
              disabled={busyId===candidate.id||!allPassed||!canHumanCertify}
              onClick={()=>void invoke("certify",candidate,{
                reason:"Human certification after required governed gates passed."
              })}
            >Certify</button>}
            {candidate.lifecycle_state==="CERTIFIED"&&<button
              className="primaryButton compact"
              type="button"
              disabled={busyId===candidate.id}
              onClick={()=>void invoke("promote",candidate)}
            >Promote to project memory</button>}
          </div>
        </article>;
      })}

      {workspace&&workspace.candidates.length===0&&workspace.memoryReviewItems.length===0&&workspace.memoryOutcomeItems.length===0&&<div className="emptyState">
        <div>◇</div>
        <h3>No learning or memory-review work queued</h3>
        <p>Repeated staged evidence creates learning candidates; Certified Memory enters this queue when its governed review date is due.</p>
      </div>}
    </div>
  </section>;
}
