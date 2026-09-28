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
  draftScope:string;
  jobId:string;
  jobCode:string;
  sessionId:string;
  contextReady:boolean;
  events:DataNestAiEvent[];
  onSessionChange:(sessionId:string)=>void;
  onContextRefresh:(sessionOverride?:string)=>Promise<void>;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
};

function formatDate(value:string,timeZone:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone,timeZoneName:"short"
  }).format(new Date(value));
}

function sessionDraftKey(draftScope:string,jobId:string){
  return "datanest-ai:session-draft:"+draftScope+":"+jobId;
}

function readSessionDraft(draftScope:string,jobId:string){
  try{
    return window.sessionStorage.getItem(sessionDraftKey(draftScope,jobId))||"";
  }catch{
    return "";
  }
}

function writeSessionDraft(draftScope:string,jobId:string,value:string){
  try{
    const key=sessionDraftKey(draftScope,jobId);
    if(value)window.sessionStorage.setItem(key,value);
    else window.sessionStorage.removeItem(key);
  }catch{
    // Session storage can be unavailable in restricted browser contexts.
  }
}

function parseDualAdvocacy(content:string){
  const angel="ANGEL'S ADVOCATE";
  const devil="DEVIL'S ADVOCATE";
  const synthesis="SYNTHESIS";
  const a=content.indexOf(angel);
  const d=content.indexOf(devil);
  const y=content.indexOf(synthesis);
  if(a<0||d<=a||y<=d)return null;
  const angelsAdvocate=content.slice(a+angel.length,d).trim();
  const devilsAdvocate=content.slice(d+devil.length,y).trim();
  const combined=content.slice(y+synthesis.length).trim();
  if(!angelsAdvocate||!devilsAdvocate||!combined)return null;
  return {angelsAdvocate,devilsAdvocate,synthesis:combined};
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
  draftScope,
  jobId,
  jobCode,
  sessionId,
  contextReady,
  events,
  onSessionChange,
  onContextRefresh,
  setNotice,
  setError
}:Props){
  const [draft,setDraft]=useState("");
  const [displayTimeZone,setDisplayTimeZone]=useState("UTC");
  const [busyJobs,setBusyJobs]=useState<Set<string>>(()=>new Set());
  const [optimisticTurn,setOptimisticTurn]=useState<DataNestAiEvent|null>(null);
  const [returnedTurn,setReturnedTurn]=useState<DataNestAiEvent|null>(null);
  const requestIdByJobRef=useRef<Record<string,string>>({});
  const draftByJobRef=useRef<Record<string,string>>({});
  const draftIdentity=draftScope+":"+jobId;
  const activeDraftIdentityRef=useRef(draftIdentity);
  const composerRef=useRef<HTMLTextAreaElement|null>(null);
  const transcriptRef=useRef<HTMLDivElement|null>(null);
  const busy=busyJobs.has(draftIdentity);

  useEffect(()=>{
    setDisplayTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");
  },[]);

  useEffect(()=>{
    activeDraftIdentityRef.current=draftIdentity;
    setOptimisticTurn(null);
    setReturnedTurn(null);
    const memoryDraft=draftByJobRef.current[draftIdentity];
    const nextDraft=memoryDraft===undefined?readSessionDraft(draftScope,jobId):memoryDraft;
    draftByJobRef.current[draftIdentity]=nextDraft;
    setDraft(nextDraft);
  },[draftIdentity,draftScope,jobId]);

  useEffect(()=>{
    const transcript=transcriptRef.current;
    if(!transcript)return;
    const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motionPaused==="true";
    transcript.scrollTo({top:transcript.scrollHeight,behavior:reduceMotion?"instant":"smooth"});
  },[events.length,returnedTurn,busy]);

  function setJobBusy(targetDraftIdentity:string,value:boolean){
    setBusyJobs(current=>{
      const next=new Set(current);
      if(value)next.add(targetDraftIdentity);
      else next.delete(targetDraftIdentity);
      return next;
    });
  }

  function updateDraft(value:string){
    draftByJobRef.current[draftIdentity]=value;
    requestIdByJobRef.current[draftIdentity]="";
    writeSessionDraft(draftScope,jobId,value);
    setDraft(value);
  }

  function clearDraft(){
    if(busy)return;
    draftByJobRef.current[draftIdentity]="";
    requestIdByJobRef.current[draftIdentity]="";
    writeSessionDraft(draftScope,jobId,"");
    setDraft("");
    window.setTimeout(()=>composerRef.current?.focus(),0);
  }

  function focusComposer(){
    const composer=composerRef.current;
    if(!composer)return;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motionPaused==="true";
    composer.scrollIntoView({behavior:reducedMotion?"instant":"smooth",block:"center"});
    composer.focus({preventScroll:true});
  }

  function loadQuickCommand(prompt:string){
    updateDraft(prompt);
    window.setTimeout(focusComposer,0);
  }

  async function send(event:FormEvent){
    event.preventDefault();
    const message=draft.trim();
    if(!message||busy||!contextReady)return;
    const supabase=getSupabase();
    if(!supabase)return;

    const requestDraftScope=draftScope;
    const requestJobId=jobId;
    const requestJobCode=jobCode;
    const requestSessionId=sessionId;
    const requestDraftIdentity=draftIdentity;
    const requestId=requestIdByJobRef.current[requestDraftIdentity]||crypto.randomUUID();
    requestIdByJobRef.current[requestDraftIdentity]=requestId;
    setJobBusy(requestDraftIdentity,true);
    setError("");
    setOptimisticTurn({
      id:requestId+"-human",
      trace_id:"DN-AI-pending",
      source_type:"human",
      source_provider:null,
      content:message,
      created_at:new Date().toISOString()
    });
    draftByJobRef.current[requestDraftIdentity]="";
    writeSessionDraft(requestDraftScope,requestJobId,"");
    setDraft("");

    try{
      const {data,error}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{
          action:"chat",
          jobId:requestJobId,
          sessionId:requestSessionId||null,
          clientRequestId:requestId,
          message,
          channelMode:"development_command",
          clientTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"
        }
      });
      if(error)throw error;
      const payload=(data||{}) as Record<string,unknown>;

      requestIdByJobRef.current[requestDraftIdentity]="";
      if(activeDraftIdentityRef.current!==requestDraftIdentity)return;

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

      const trend=(payload.trendAnalysis||{}) as Record<string,unknown>;
      const candidateId=String(trend.candidateId||"");
      const workingMemoryStatus=String(payload.workingMemoryStatus||"");
      setNotice(
        workingMemoryStatus==="recorded"
          ?"DataNest AI responded through cumulative Development Command working memory for "+requestJobCode+". Certified Memory remains separate."
          :workingMemoryStatus==="skipped_incomplete_response"
            ?"DataNest AI responded, but the answer did not contain both advocacy positions and a synthesis, so this turn was not added to working memory."
          :workingMemoryStatus==="failed"||workingMemoryStatus==="not_recorded"
            ?"DataNest AI responded, but this turn was not confirmed in cumulative working memory."
          :candidateId
            ?"DataNest AI responded and recorded this turn as UNCERTIFIED evidence. A repeated pattern was staged for governed learning review."
            :"DataNest AI responded and recorded this turn as traceable UNCERTIFIED evidence for "+requestJobCode+"."
      );
      if(workingMemoryStatus==="failed"||workingMemoryStatus==="not_recorded"){
        setError("Working memory could not be confirmed. You can send the command again to retry.");
      }
      await onContextRefresh(nextSession);
      // Keep the returned answer until refreshed events contain its trace.
      // A failed refresh must not make a successful reply disappear.
    }catch(sendError){
      if(activeDraftIdentityRef.current===requestDraftIdentity){
        setOptimisticTurn(null);
        draftByJobRef.current[requestDraftIdentity]=message;
        writeSessionDraft(requestDraftScope,requestJobId,message);
        setDraft(message);
        setError(sendError instanceof Error?sendError.message:"Unable to send DataNest AI input.");
      }
    }finally{
      setJobBusy(requestDraftIdentity,false);
      if(activeDraftIdentityRef.current===requestDraftIdentity){
        window.setTimeout(()=>composerRef.current?.focus(),0);
      }
    }
  }

  const optimisticAlreadyPersisted=optimisticTurn&&events.some(item=>
    item.source_type==="human" &&
    item.content===optimisticTurn.content &&
    Math.abs(new Date(item.created_at).getTime()-new Date(optimisticTurn.created_at).getTime())<60000
  );
  const eventsWithOptimistic=optimisticTurn&&!optimisticAlreadyPersisted
    ?[...events,optimisticTurn]
    :events;
  const visibleEvents=returnedTurn&&!eventsWithOptimistic.some(item=>item.trace_id===returnedTurn.trace_id)
    ?[...eventsWithOptimistic,returnedTurn]
    :eventsWithOptimistic;

  return <section className="panel datanestAiChatPanel datanestAiCommandConsole">
    <div className="datanestAiConsoleHead">
      <div className="datanestAiConsoleIdentity">
        <div className="datanestAiConsoleGlyph" aria-hidden="true">AI</div>
        <div>
          <p className="eyebrow">DATANEST AI // LIVE CONSOLE</p>
          <h3>DEVELOPMENT COMMAND CHANNEL</h3>
          <small>Governed reasoning with active Job context and traceable session evidence.</small>
        </div>
      </div>
      <div className="datanestAiConsoleStatus" aria-label="DataNest AI console status">
        <span className={contextReady?"datanestAiConsoleLive":""}>{contextReady&&<i aria-hidden="true"/>}{contextReady?"AI CORE LINKED":"CONTEXT NOT READY"}</span>
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
      <p>Complete dual-advocacy replies accumulate in a separate working-memory lane. Authentication, provider authorization, audit traces, and Certified Memory governance remain intact.</p>
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
          readOnly={busy}
          aria-describedby="datanest-ai-command-context datanest-ai-composer-help"
          value={draft}
          onChange={event=>updateDraft(event.target.value)}
          onKeyDown={event=>{
            if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing&&!busy&&contextReady&&draft.trim()){
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask DataNest AI to analyze, build, compare, debug, plan, or continue this Job Manifest…"
        />
      </label>
      <div className="rowBetween datanestAiComposerFooter">
        <small id="datanest-ai-composer-help" className="muted">{busy?"Your message is visible immediately while DataNest AI responds.":!contextReady?"Waiting for Job context. Your draft is preserved.":"Enter to send · Shift+Enter for a new line · Development Command working memory accumulates separately from Certified Memory"}</small>
        <button className="primaryButton datanestAiCommandButton" disabled={busy||!contextReady||!draft.trim()}>
          {busy?"DataNest AI reasoning…":"Send command"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>

    <div className="datanestAiTranscript" role="log" aria-label="Job conversation" aria-live="polite" ref={transcriptRef}>
      {visibleEvents.map(item=>{
        const assistant=item.source_type==="datanest_ai";
        const companion=item.source_type==="ai_companion";
        const roleClass=assistant?"assistant":companion?"companion":"human";
        const roleGlyph=assistant?"AI":companion?"EXT":"YOU";
        const roleLabel=assistant?"DataNest AI":companion?"AI Companion":"You";
        const pending=roleClass==="human"&&item.trace_id==="DN-AI-pending";
        const dual=assistant?parseDualAdvocacy(item.content):null;
        return <article className={"datanestAiTurn "+roleClass+(pending?" pending":"")+(dual?" dualAdvocacy":"")} key={item.id}>
          <div className="rowBetween">
            <div className="datanestAiTurnIdentity">
              <span className="datanestAiTurnGlyph" aria-hidden="true">{roleGlyph}</span>
              <div>
                <b>{roleLabel}</b>
                <small>{jobCode+" · "+formatDate(item.created_at,displayTimeZone)}</small>
              </div>
            </div>
            <span
              className={pending?"badge":dual?"badge good":"badge warn"}
              aria-label={pending?"Message sending":dual?"Cumulative Development Command working memory":"Uncertified evidence"}
            >{pending?"SENDING":dual?"WORKING MEMORY":"UNCERTIFIED"}</span>
          </div>
          {dual?<div className="datanestAiAdvocacyGrid">
            <section className="datanestAiAdvocacyCard angel">
              <small>ANGEL&apos;S ADVOCATE</small>
              <p>{dual.angelsAdvocate}</p>
            </section>
            <section className="datanestAiAdvocacyCard devil">
              <small>DEVIL&apos;S ADVOCATE</small>
              <p>{dual.devilsAdvocate}</p>
            </section>
            <section className="datanestAiAdvocacySynthesis">
              <small>SYNTHESIS</small>
              <p>{dual.synthesis}</p>
            </section>
          </div>:<p>{item.content}</p>}
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
          <span>Binding the command to {jobCode}, loading cumulative working context, and preparing both advocacy positions.</span>
          <div className="datanestAiReasoningPulse" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        </div>
      </div>}
      {!visibleEvents.length&&!busy&&<div className="emptyState datanestAiConsoleEmpty">
        <div className="datanestAiConsoleEmptyCore" aria-hidden="true">AI</div>
        <h3>{contextReady?"DataNest AI is ready":"Waiting for Job context"}</h3>
        <p>{contextReady?"Issue a development command above. DataNest will bind it to this Job and answer with Angel's Advocate, Devil's Advocate, and a synthesis.":"You can prepare a draft while context loads. Sending becomes available once this Job context is ready."}</p>
      </div>}
    </div>
  </section>;
}
