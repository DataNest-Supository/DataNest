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
      await onContextRefresh(nextSession);
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

  return <section className="panel datanestAiChatPanel datanestAiCommandConsole">
    <div className="datanestAiConsoleHead">
      <div className="datanestAiConsoleIdentity">
        <div className="datanestAiConsoleGlyph" aria-hidden="true">AI</div>
        <div>
          <p className="eyebrow">DATANEST AI // LIVE CONSOLE</p>
          <h3>Development command channel</h3>
          <small>Governed reasoning with active Job context and traceable session evidence.</small>
        </div>
      </div>
      <div className="datanestAiConsoleStatus" aria-label="DataNest AI console status">
        <span className="datanestAiConsoleLive"><i aria-hidden="true"/>AI CORE LINKED</span>
        <span>{jobCode}</span>
        <span>{sessionId?"SESSION "+sessionId.slice(0,8):"SESSION ESTABLISHING"}</span>
      </div>
    </div>

    <div className="datanestAiConsoleGuardrail">
      <span aria-hidden="true">◇</span>
      <p>Human and AI Companion inputs can influence this Job immediately. Project-wide memory remains governed and requires certification.</p>
    </div>

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
      {!events.length&&<div className="emptyState datanestAiConsoleEmpty">
        <div className="datanestAiConsoleEmptyCore" aria-hidden="true">AI</div>
        <h3>DataNest AI is ready</h3>
        <p>Issue a development command below. DataNest will bind it to this Job and trace the interaction before inference.</p>
      </div>}
    </div>

    <form className="datanestAiComposer" onSubmit={send}>
      <label>
        <span className="datanestAiComposerLabel">
          <b>Command DataNest AI</b>
          <small>{jobCode}</small>
        </span>
        <textarea
          rows={4}
          value={draft}
          onChange={event=>setDraft(event.target.value)}
          placeholder="Ask DataNest AI to analyze, build, compare, debug, plan, or continue this Job Manifest…"
        />
      </label>
      <div className="rowBetween datanestAiComposerFooter">
        <small className="muted">Trace-first intake · active Job/session only until certified</small>
        <button className="primaryButton datanestAiCommandButton" disabled={busy||!draft.trim()}>
          {busy?"DataNest AI reasoning…":"Send command"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  </section>;
}
