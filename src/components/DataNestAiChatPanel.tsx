"use client";

import { FormEvent, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type DataNestAiEvent = {
  id:string;
  trace_id:string;
  source_type:string;
  source_provider:string|null;
  content:string;
  created_at:string;
};

type Props = {
  jobId:string;
  jobCode:string;
  sessionId:string;
  events:DataNestAiEvent[];
  onSessionChange:(sessionId:string)=>void;
  onContextRefresh:(sessionOverride?:string)=>Promise<void>;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
};

function formatDate(value:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"
  }).format(new Date(value));
}

export default function DataNestAiChatPanel({
  jobId,
  jobCode,
  sessionId,
  events,
  onSessionChange,
  onContextRefresh,
  setNotice,
  setError
}:Props){
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [returnedTurn,setReturnedTurn]=useState<DataNestAiEvent|null>(null);
  const requestIdRef=useRef("");

  async function send(event:FormEvent){
    event.preventDefault();
    if(!draft.trim()||busy)return;
    const supabase=getSupabase();
    if(!supabase)return;

    const requestId=requestIdRef.current||crypto.randomUUID();
    requestIdRef.current=requestId;
    setBusy(true);
    setError("");

    try{
      const {data,error}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{
          action:"chat",
          jobId,
          sessionId:sessionId||null,
          clientRequestId:requestId,
          message:draft.trim()
        }
      });
      if(error)throw error;
      const payload=(data||{}) as Record<string,unknown>;
      const nextSession=String(payload.sessionId||sessionId||"");
      if(nextSession)onSessionChange(nextSession);

      const assistant=String(payload.assistant||"").trim();
      const outputTraceId=String(payload.outputTraceId||"").trim();
      if(assistant){
        setReturnedTurn({
          id:outputTraceId||requestId+"-assistant",
          trace_id:outputTraceId||"DN-AI-pending",
          source_type:"datanest_ai",
          source_provider:String(payload.providerLabel||payload.providerMode||"DataNest AI"),
          content:assistant,
          created_at:new Date().toISOString()
        });
      }

      setDraft("");
      requestIdRef.current="";
      const trend=(payload.trendAnalysis||{}) as Record<string,unknown>;
      const candidateId=String(trend.candidateId||"");
      setNotice(
        candidateId
          ?"DataNest AI responded and recorded this turn as UNCERTIFIED evidence. A repeated pattern was staged for governed learning review."
          :"DataNest AI responded and recorded this turn as traceable UNCERTIFIED evidence for "+jobCode+"."
      );
      await onContextRefresh(nextSession||undefined);
      setReturnedTurn(null);
    }catch(sendError){
      setError(sendError instanceof Error?sendError.message:"Unable to send DataNest AI input.");
    }finally{
      setBusy(false);
    }
  }

  const visibleEvents=returnedTurn&&!events.some(item=>item.trace_id===returnedTurn.trace_id)
    ?[...events,returnedTurn]
    :events;

  return <section className="panel datanestAiChatPanel">
    <div className="panelHead">
      <div>
        <p className="eyebrow">DATANEST AI CHAT</p>
        <h3>Development input</h3>
      </div>
      <span className="badge warn">UNCERTIFIED SESSION</span>
    </div>

    <p className="muted">
      Human and AI Companion inputs can help this Job immediately. They do not become project-wide memory until certification.
    </p>

    <div className="datanestAiTranscript" aria-live="polite">
      {visibleEvents.map(item=>{
        const assistant=item.source_type==="datanest_ai";
        const companion=item.source_type==="ai_companion";
        return <article className={"datanestAiTurn "+(assistant?"assistant":"evidence")} key={item.id}>
          <div className="rowBetween">
            <div>
              <b>{assistant?"DataNest AI":companion?"AI Companion":"Human development input"}</b>
              <small>{jobCode+" · "+formatDate(item.created_at)}</small>
            </div>
            <span className="badge warn">UNCERTIFIED</span>
          </div>
          <p>{item.content}</p>
          <div className="manifestMeta">
            <span>{item.trace_id}</span>
            {item.source_provider&&<span>{item.source_provider}</span>}
          </div>
        </article>;
      })}
      {!events.length&&<div className="emptyState">
        <div>◇</div>
        <h3>No staged conversation yet</h3>
        <p>Enter development input below. DataNest will trace it before AI inference.</p>
      </div>}
    </div>

    <form className="datanestAiComposer" onSubmit={send}>
      <label>
        Human development input
        <textarea
          rows={4}
          value={draft}
          onChange={event=>setDraft(event.target.value)}
          placeholder="Enter development input for this Job Manifest…"
        />
      </label>
      <div className="rowBetween">
        <small className="muted">Trace-first intake · current Job/session only until certified</small>
        <button className="primaryButton" disabled={busy||!draft.trim()}>
          {busy?"Recording & reasoning…":"Send to DataNest AI"}
        </button>
      </div>
    </form>
  </section>;
}
