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
  updated_at:string;
};

type ValidationRun={
  id:string;
  candidate_id:string;
  gate:"AUDIT"|"VERIFY"|"VALIDATE"|"STRESS_TEST";
  passed:boolean;
  created_at:string;
};

type WorkspaceResponse={
  role:"owner"|"admin";
  candidates:Candidate[];
  validationRuns:ValidationRun[];
};

type Props={
  projectId:string;
  role:"owner"|"admin"|"operator"|"viewer";
  onChanged:()=>Promise<void>;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
};

const gateOrder=["AUDIT","VERIFY","VALIDATE","STRESS_TEST"] as const;

export default function DataNestAiCertificationPanel({
  projectId,role,onChanged,setNotice,setError
}:Props){
  const [workspace,setWorkspace]=useState<WorkspaceResponse|null>(null);
  const [busyId,setBusyId]=useState("");

  const canReview=role==="owner"||role==="admin";

  const load=useCallback(async()=>{
    if(!canReview){setWorkspace(null);return;}
    const supabase=getSupabase();
    if(!supabase)return;
    const {data,error}=await supabase.functions.invoke("datanest-ai-certification",{
      body:{action:"workspace",projectId}
    });
    if(error){setError(error.message);return;}
    setWorkspace(data as WorkspaceResponse);
  },[canReview,projectId,setError]);

  useEffect(()=>{void load()},[load]);

  const runsByCandidate=useMemo(()=>{
    const map=new Map<string,Map<string,boolean>>();
    for(const run of workspace?.validationRuns||[]){
      if(!map.has(run.candidate_id))map.set(run.candidate_id,new Map());
      map.get(run.candidate_id)!.set(run.gate,run.passed);
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
        <h3>Audit → verify → validate → stress-test → certify</h3>
      </div>
      <button className="textButton" type="button" onClick={()=>void load()}>Refresh</button>
    </div>

    <div className="manifestList">
      {(workspace?.candidates||[]).map(candidate=>{
        const gateState=runsByCandidate.get(candidate.id)||new Map<string,boolean>();
        const allPassed=gateOrder.every(gate=>gateState.get(gate)===true);
        const canHumanCertify=candidate.required_authority!=="owner"||role==="owner";
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

          <div className="datanestAiGateRow">
            {gateOrder.map(gate=>{
              const passed=gateState.get(gate)===true;
              if(gate==="STRESS_TEST"){
                return <span
                  className={passed?"secondaryButton compact active":"secondaryButton compact"}
                  key={gate}
                  title="Recorded by governed stress suite"
                >{passed?"✓ ":""}STRESS TEST · Recorded by governed stress suite</span>;
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

      {workspace&&!workspace.candidates.length&&<div className="emptyState">
        <div>◇</div>
        <h3>No learning candidates yet</h3>
        <p>Repeated staged evidence will create candidates for governed review.</p>
      </div>}
    </div>
  </section>;
}
