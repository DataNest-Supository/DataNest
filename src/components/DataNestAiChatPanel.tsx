"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

function sessionDraftKey(jobId:string){
  return "datanest-ai:session-draft:"+jobId;
}

function readSessionDraft(jobId:string){
  try{
    return window.sessionStorage.getItem(sessionDraftKey(jobId))||"";
  }catch{
    return "";
  }
}

function writeSessionDraft(jobId:string,value:string){
  try{
    if(value)window.sessionStorage.setItem(sessionDraftKey(jobId),value);
    else window.sessionStorage.removeItem(sessionDraftKey(jobId));
  }catch{
    // Session storage can be unavailable in restricted browser contexts.
  }
}

const quickCommands=[
  {
    label:"Continue",
    glyph:"→",
    prompt:"Continue this Job from the current governed context. Identify the next highest-value implementation step, state the acceptance check, and proceed."
  },
  {
    label:"Analyze",
    glyph:"◎",
    prompt:"Analyze the current Job context. Surface the important dependencies, risks, unresolved decisions, and the most useful next actions."
  },
  {
    label:"Build",
    glyph:"+",
    prompt:"Build the next implementation step for this Job using the current governed context. State what you will change, apply the change, and verify it."
  },
  {
    label:"Debug",
    glyph:"◇",
    prompt:"Debug the current Job state. Identify likely failure points, verify assumptions, and propose or apply the smallest safe fix."
  },
  {
    label:"Plan",
    glyph:"≡",
    prompt:"Create a concrete execution plan for this Job with ordered steps, dependencies, acceptance checks, and a clear next action."
  },
  {
    label:"Compare",
    glyph:"⇄",
    prompt:"Compare the strongest available approaches for this Job. Explain the meaningful trade-offs and recommend a practical implementation path based on the current context."
  }
] as const;

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
  const [busyJobs,setBusyJobs]=useState<Set<string>>(()=>new Set());
  const [returnedTurn,setReturnedTurn]=useState<DataNestAiEvent|null>(null);
  const requestIdByJobRef=useRef<Record<string,string>>({});
  const draftByJobRef=useRef<Record<string,string>>({});
  const activeJobIdRef=useRef(jobId);
  const composerRef=useRef<HTMLTextAreaElement|null>(null);
  const transcriptRef=useRef<HTMLDivElement|null>(null);
  const busy=busyJobs.has(jobId);

  useEffect(()=>{
    activeJobIdRef.current=jobId;
    setReturnedTurn(null);
    const memoryDraft=draftByJobRef.current[jobId];
    const nextDraft=memoryDraft===undefined?readSessionDraft(jobId):memoryDraft;
    draftByJobRef.current[jobId]=nextDraft;
    setDraft(nextDraft);
  },[jobId]);

  useEffect(()=>{
    const transcript=transcriptRef.current;
    if(!transcript)return;
    transcript.scrollTo({top:transcript.scrollHeight,behavior:"smooth"});
  },[events.length,returnedTurn,busy]);

  function setJobBusy(targetJobId:string,value:boolean){
    setBusyJobs(current=>{
      const next=new Set(current);
      if(value)next.add(targetJobId);
      else next.delete(targetJobId);
      return next;
    });
  }

  function updateDraft(value:string){
    draftByJobRef.current[jobId]=value;
    requestIdByJobRef.current[jobId]="";
    writeSessionDraft(jobId,value);
    setDraft(value);
  }

  function clearDraft(){
    if(busy)return;
    draftByJobRef.current[jobId]="";
    requestIdByJobRef.current[jobId]="";
    writeSessionDraft(jobId,"");
    setDraft("");
    window.setTimeout(()=>composerRef.current?.focus(),0);
  }

  function focusComposer(){
    const composer=composerRef.current;
    if(!composer)return;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    composer.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"center"});
    window.setTimeout(()=>composer.focus(),reducedMotion?0:220);
  }

  function loadQuickCommand(prompt:string){
    updateDraft(prompt);
    window.setTimeout(focusComposer,0);
  }

  async function send(event:FormEvent){
    event.preventDefault();
    const message=draft.trim();
    if(!message||busy)return;
    const supabase=getSupabase();
    if(!supabase)return;

    const requestJobId=jobId;
    const requestJobCode=jobCode;
    const requestSessionId=sessionId;
    const requestId=requestIdByJobRef.current[requestJobId]||crypto.randomUUID();
    requestIdByJobRef.current[requestJobId]=requestId;
    setJobBusy(requestJobId,true);
    setError("");

    try{
      const {data,error}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{
          action:"chat",
          jobId:requestJobId,
          sessionId:requestSessionId||null,
          clientRequestId:requestId,
          message
        }
      });
      if(error)throw error;
      const payload=(data||{}) as Record<string,unknown>;

      requestIdByJobRef.current[requestJobId]="";
      draftByJobRef.current[requestJobId]="";
      writeSessionDraft(requestJobId,"");
      if(activeJobIdRef.current!==requestJobId)return;

      const nextSession=String(payload.sessionId||requestSessionId||"");
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
      const trend=(payload.trendAnalysis||{}) as Record<string,unknown>;
      const candidateId=String(trend.candidateId||"");
      setNotice(
        candidateId
          ?"DataNest AI responded and recorded this turn as UNCERTIFIED evidence. A repeated pattern was staged for governed learning review."
          :"DataNest AI responded and recorded this turn as traceable UNCERTIFIED evidence for "+requestJobCode+"."
      );
      await onContextRefresh(nextSession);
      if(activeJobIdRef.current===requestJobId)setReturnedTurn(null);
    }catch(sendError){
      if(activeJobIdRef.current===requestJobId){
        setError(sendError instanceof Error?sendError.message:"Unable to send DataNest AI input.");
      }
    }finally{
      setJobBusy(requestJobId,false);
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
        <button
          type="button"
          className="datanestAiConsoleCommandJump"
          aria-label="Jump to DataNest AI command composer"
          onClick={focusComposer}
        >
          COMMAND <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>

    <div className="datanestAiConsoleGuardrail">
      <span aria-hidden="true">◇</span>
      <p>Human and AI Companion inputs can influence this Job immediately. Project-wide memory remains governed and requires certification.</p>
    </div>

    <div className="datanestAiQuickCommands" aria-label="Quick DataNest AI commands">
      <div className="datanestAiQuickCommandsLabel">
        <span>QUICK COMMANDS</span>
        <small>Select a command, then edit or send it.</small>
      </div>
      <div className="datanestAiQuickCommandRail">
        {quickCommands.map(command=><button
          key={command.label}
          type="button"
          className="datanestAiQuickCommand"
          onClick={()=>loadQuickCommand(command.prompt)}
          disabled={busy}
        >
          <span aria-hidden="true">{command.glyph}</span>
          {command.label}
        </button>)}
      </div>
    </div>

    <div className="datanestAiTranscript" aria-live="polite" ref={transcriptRef}>
      {visibleEvents.map(item=>{
        const assistant=item.source_type==="datanest_ai";
        const companion=item.source_type==="ai_companion";
        const roleClass=assistant?"assistant":companion?"companion":"human";
        const roleGlyph=assistant?"AI":companion?"EXT":"YOU";
        const roleLabel=assistant?"DataNest AI":companion?"AI Companion":"Human development input";
        return <article className={"datanestAiTurn "+roleClass} key={item.id}>
          <div className="rowBetween">
            <div className="datanestAiTurnIdentity">
              <span className="datanestAiTurnGlyph" aria-hidden="true">{roleGlyph}</span>
              <div>
                <b>{roleLabel}</b>
                <small>{jobCode+" · "+formatDate(item.created_at)}</small>
              </div>
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
      {busy&&<div className="datanestAiReasoningTurn" role="status" aria-live="polite">
        <div className="datanestAiReasoningCore" aria-hidden="true">AI</div>
        <div className="datanestAiReasoningCopy">
          <b>DataNest AI is reasoning</b>
          <span>Binding the command to {jobCode}, evaluating governed context, and preparing a traceable response.</span>
          <div className="datanestAiReasoningPulse" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        </div>
      </div>}
      {!events.length&&!busy&&<div className="emptyState datanestAiConsoleEmpty">
        <div className="datanestAiConsoleEmptyCore" aria-hidden="true">AI</div>
        <h3>DataNest AI is ready</h3>
        <p>Issue a development command below. DataNest will bind it to this Job and trace the interaction before inference.</p>
      </div>}
    </div>

    <form className="datanestAiComposer" onSubmit={send}>
      <div
        id="datanest-ai-command-context"
        className="datanestAiComposerContext"
        aria-label={"DataNest AI command context locked to "+jobCode}
      >
        <span className="datanestAiContextLock">
          <i aria-hidden="true"/>
          CONTEXT LOCKED
        </span>
        <b>{jobCode}</b>
        <small>{sessionId?"SESSION "+sessionId.slice(0,8):"SESSION ESTABLISHING"}</small>
        {draft.trim()&&<span className="datanestAiDraftLock">
          SESSION-ONLY DRAFT · LOCKED TO {jobCode}
        </span>}
        {draft.trim()&&<button
          type="button"
          className="datanestAiClearDraft"
          onClick={clearDraft}
          disabled={busy}
        >
          Clear draft
        </button>}
      </div>

      <label>
        <span className="datanestAiComposerLabel">
          <b>Command DataNest AI</b>
          <small>{jobCode}</small>
        </span>
        <textarea
          ref={composerRef}
          rows={4}
          aria-describedby="datanest-ai-command-context"
          value={draft}
          onChange={event=>updateDraft(event.target.value)}
          onKeyDown={event=>{
            if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!busy&&draft.trim()){
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask DataNest AI to analyze, build, compare, debug, plan, or continue this Job Manifest…"
        />
      </label>
      <div className="rowBetween datanestAiComposerFooter">
        <small className="muted">Trace-first intake · active Job/session only until certified · Ctrl/⌘ + Enter to send</small>
        <button className="primaryButton datanestAiCommandButton" disabled={busy||!draft.trim()}>
          {busy?"DataNest AI reasoning…":"Send command"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  </section>;
}
