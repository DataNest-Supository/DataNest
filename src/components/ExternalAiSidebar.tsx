"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  selectExternalAiClipboardCandidate,
  shouldAttemptClipboardAutoCapture,
  type ClipboardAutoCaptureAccess
} from "@/lib/externalAiClipboard";
import { calculateCompanionPlacement } from "@/lib/externalAiWindow";

type Job = {
  id:string;
  job_number:number;
  title:string;
  description:string|null;
  priority:number;
  status:string;
  required_capabilities:string[];
  acceptance:Record<string,unknown>;
  updated_at:string;
};

type DevelopmentUpdate = {
  stage:string;
  status:string;
  progress:number;
  summary:string;
  created_at:string;
};

type Suggestion = {
  prompt:string;
  suggestion_type:string;
  priority:number;
  status:string;
};

const providers = [
  {
    key:"chatgpt",
    label:"ChatGPT",
    url:"https://chatgpt.com/",
    embed:"blocked",
    embedReason:"ChatGPT blocks third-party iframe embedding. DataNest uses companion mode instead."
  },
  {key:"gemini",label:"Gemini",url:"https://gemini.google.com/app",embed:"unknown",embedReason:""},
  {key:"claude",label:"Claude",url:"https://claude.ai/new",embed:"unknown",embedReason:""},
  {key:"grok",label:"Grok",url:"https://grok.com/",embed:"unknown",embedReason:""},
  {key:"perplexity",label:"Perplexity",url:"https://www.perplexity.ai/",embed:"unknown",embedReason:""}
] as const;

function jobCode(job:Job){
  return "JOB-"+String(job.job_number).padStart(5,"0");
}

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

export default function ExternalAiSidebar({
  projectId,
  currentUserEmail,
  activeDataNestAiSession,
  onClose,
  onNotice,
  onError
}:{
  projectId:string;
  currentUserEmail:string;
  activeDataNestAiSession:{jobId:string;sessionId:string|null}|null;
  onClose:()=>void;
  onNotice:(message:string)=>void;
  onError:(message:string)=>void;
}){
  const [width,setWidth]=useState(500);
  const [jobs,setJobs]=useState<Job[]>([]);
  const [selectedJobId,setSelectedJobId]=useState("");
  const [latestUpdate,setLatestUpdate]=useState<DevelopmentUpdate|null>(null);
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [provider,setProvider]=useState("chatgpt");
  const [sessionId,setSessionId]=useState("");
  const [traceKey,setTraceKey]=useState("");
  const [launchMode,setLaunchMode]=useState<"sidebar"|"companion"|"popout">("sidebar");
  const [handoff,setHandoff]=useState("");
  const [responseText,setResponseTextState]=useState("");
  const responseTextRef=useRef("");
  const setResponseText=useCallback((value:string)=>{
    responseTextRef.current=value;
    setResponseTextState(value);
  },[]);
  const [lastImportedId,setLastImportedId]=useState("");
  const [embedUrl,setEmbedUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const [clipboardAccess,setClipboardAccess]=useState<ClipboardAutoCaptureAccess>("unknown");
  const [autoCaptureEnabled,setAutoCaptureEnabled]=useState(false);
  const lastClipboardCapture=useRef("");

  const selectedJob=useMemo(
    ()=>jobs.find(job=>job.id===selectedJobId)||null,
    [jobs,selectedJobId]
  );
  const selectedProvider=providers.find(item=>item.key===provider)||providers[0];
  const preparedHandoff=useMemo(
    ()=>buildHandoff(),
    [selectedJob,latestUpdate,suggestions,provider,projectId,currentUserEmail,sessionId,traceKey]
  );

  const loadJobs=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;

    const {data,error}=await supabase
      .from("jobs")
      .select("id,job_number,title,description,priority,status,required_capabilities,acceptance,updated_at")
      .eq("project_id",projectId)
      .order("updated_at",{ascending:false})
      .limit(100);

    if(error){
      onError(error.message);
      return;
    }

    const next=(data||[]) as Job[];
    setJobs(next);
    setSelectedJobId(current=>{
      const activeJobId=activeDataNestAiSession?.jobId||"";
      if(activeJobId&&next.some(job=>job.id===activeJobId))return activeJobId;
      if(current&&next.some(job=>job.id===current))return current;
      const remembered=typeof window!=="undefined"?window.localStorage.getItem("datanest.aiSidebar.job")||"":"";
      if(remembered&&next.some(job=>job.id===remembered))return remembered;
      return next[0]?.id||"";
    });
  },[projectId,onError,activeDataNestAiSession?.jobId]);

  const loadJobContext=useCallback(async(jobId:string)=>{
    if(!jobId)return;
    const supabase=getSupabase();
    if(!supabase)return;

    const [updateResult,suggestionResult]=await Promise.all([
      supabase
        .from("ai_development_updates")
        .select("stage,status,progress,summary,created_at")
        .eq("job_id",jobId)
        .order("created_at",{ascending:false})
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_prompt_queue")
        .select("prompt,suggestion_type,priority,status")
        .eq("job_id",jobId)
        .not("status","in","(completed,dismissed)")
        .order("priority",{ascending:false})
        .limit(5)
    ]);

    const first=updateResult.error||suggestionResult.error;
    if(first){
      onError(first.message);
      return;
    }

    setLatestUpdate((updateResult.data||null) as DevelopmentUpdate|null);
    setSuggestions((suggestionResult.data||[]) as Suggestion[]);
  },[onError]);

  useEffect(()=>{
    const savedWidth=Number(window.localStorage.getItem("datanest.aiSidebar.width")||"500");
    const savedProvider=window.localStorage.getItem("datanest.aiSidebar.provider");
    if(Number.isFinite(savedWidth))setWidth(clamp(savedWidth,380,760));
    if(savedProvider&&providers.some(item=>item.key===savedProvider))setProvider(savedProvider);
    void loadJobs();
  },[loadJobs]);

  useEffect(()=>{
    const activeJobId=activeDataNestAiSession?.jobId||"";
    // Follow changes to the active AI job, not manual changes in this dock.
    if(activeJobId&&jobs.some(job=>job.id===activeJobId)){
      setSelectedJobId(current=>current===activeJobId?current:activeJobId);
    }
  },[activeDataNestAiSession?.jobId,jobs]);

  useEffect(()=>{
    if(!selectedJobId)return;
    window.localStorage.setItem("datanest.aiSidebar.job",selectedJobId);
    setSessionId("");
    setTraceKey("");
    setLatestUpdate(null);
    setSuggestions([]);
    setHandoff("");
    setAutoCaptureEnabled(false);
    setResponseText("");
    setLastImportedId("");
    lastClipboardCapture.current="";
    setEmbedUrl("");
    void loadJobContext(selectedJobId);
  },[selectedJobId,loadJobContext]);

  useEffect(()=>{
    window.localStorage.setItem("datanest.aiSidebar.width",String(width));
  },[width]);

  useEffect(()=>{
    window.localStorage.setItem("datanest.aiSidebar.provider",provider);
    setSessionId("");
    setTraceKey("");
    setHandoff("");
    setAutoCaptureEnabled(false);
    setResponseText("");
    setLastImportedId("");
    lastClipboardCapture.current="";
    setEmbedUrl("");
  },[provider]);

  useEffect(()=>{
    const handle=(event:Event)=>{
      const detail=(event as CustomEvent<{jobId?:string}>).detail;
      if(detail?.jobId&&jobs.some(job=>job.id===detail.jobId)){
        setSelectedJobId(detail.jobId);
      }
    };
    window.addEventListener("datanest:job-selected",handle);
    return()=>window.removeEventListener("datanest:job-selected",handle);
  },[jobs]);

  const refreshClipboardAccess=useCallback(async():Promise<ClipboardAutoCaptureAccess>=>{
    if(!navigator.clipboard?.readText){
      setClipboardAccess("unsupported");
      return "unsupported";
    }

    if(!navigator.permissions?.query){
      setClipboardAccess("prompt");
      return "prompt";
    }

    try{
      const permission=await navigator.permissions.query({name:"clipboard-read" as PermissionName});
      const next=permission.state as ClipboardAutoCaptureAccess;
      setClipboardAccess(next);
      return next;
    }catch{
      setClipboardAccess("prompt");
      return "prompt";
    }
  },[]);

  useEffect(()=>{
    if(!sessionId)return;
    void refreshClipboardAccess();
  },[sessionId,refreshClipboardAccess]);

  const captureClipboardResponse=useCallback(async(announce=false)=>{
    if(!sessionId||!navigator.clipboard?.readText)return;

    try{
      const clipboardText=await navigator.clipboard.readText();
      const candidate=selectExternalAiClipboardCandidate({
        clipboardText,
        currentResponse:responseTextRef.current,
        allowReplace:announce,
        blockedTexts:[handoff,preparedHandoff,lastClipboardCapture.current]
      });

      if(!candidate){
        if(announce)onNotice("Clipboard does not contain a new external AI response.");
        return;
      }

      lastClipboardCapture.current=candidate;
      setResponseText(candidate);
      setLastImportedId("");
      onNotice("External AI response captured into Return to DataNest. Review it, then click Import.");
    }catch{
      if(announce){
        onError("Clipboard access was blocked. Paste the external AI response into Return to DataNest manually.");
      }
    }
  },[sessionId,responseText,handoff,preparedHandoff,onNotice,onError]);

  useEffect(()=>{
    if(!sessionId)return;

    const capture=()=>{
      if(shouldAttemptClipboardAutoCapture(clipboardAccess,autoCaptureEnabled)){
        void captureClipboardResponse(false);
      }
    };
    const captureWhenVisible=()=>{
      if(document.visibilityState==="visible")capture();
    };

    window.addEventListener("focus",capture);
    document.addEventListener("visibilitychange",captureWhenVisible);

    return()=>{
      window.removeEventListener("focus",capture);
      document.removeEventListener("visibilitychange",captureWhenVisible);
    };
  },[sessionId,clipboardAccess,autoCaptureEnabled,captureClipboardResponse]);

  function buildHandoff(trace?:{sessionId?:string;traceKey?:string;providerLabel?:string}){
    if(!selectedJob)return "";

    const activeSessionId=trace?.sessionId||sessionId||"pending";
    const activeTraceKey=trace?.traceKey||traceKey||"pending";
    const activeProvider=trace?.providerLabel||selectedProvider.label;

    const latest=latestUpdate
      ? [
          "Latest R&D update:",
          "- Stage: "+latestUpdate.stage,
          "- Status: "+latestUpdate.status,
          "- Progress: "+latestUpdate.progress+"%",
          "- Summary: "+latestUpdate.summary
        ].join("\n")
      : "Latest R&D update: none recorded.";

    const queue=suggestions.length
      ? "Current DataNest suggestion queue:\n"+
        suggestions.map((item,index)=>
          (index+1)+". ["+item.suggestion_type+" P"+item.priority+"] "+item.prompt
        ).join("\n")
      : "Current DataNest suggestion queue: none.";

    return [
      "RESONANCE DATANEST — LIVE EXTERNAL AI HANDOFF",
      "",
      "[DATANEST TRACKING HEADER]",
      "Project: Resonance DataNest",
      "Project ID: "+projectId,
      "Job Manifest: "+jobCode(selectedJob)+" · "+selectedJob.title,
      "Job ID: "+selectedJob.id,
      "External AI Session ID: "+activeSessionId,
      "Trace Key: "+activeTraceKey,
      "Provider: "+activeProvider,
      "[/DATANEST TRACKING HEADER]",
      "",
      "Preserve the DataNest Trace Key in the first line of your response so the result remains visibly attributable to this Job Manifest.",
      "You are collaborating live on one Resonance DataNest Job Manifest.",
      "Use only the supplied project/job context. Do not claim to have changed GitHub, Supabase, Vercel, DataNest, or another external system unless you actually have authorized tool access and perform that action.",
      "",
      "User identity: intentionally omitted from external handoff.",
      "Status: "+selectedJob.status,
      "Priority: "+selectedJob.priority,
      "Description: "+(selectedJob.description||"No description supplied."),
      "Required capabilities: "+(selectedJob.required_capabilities?.join(", ")||"chat"),
      "Acceptance criteria: "+JSON.stringify(selectedJob.acceptance||{}),
      "",
      latest,
      "",
      queue,
      "",
      "Work with me live on this Job Manifest. Return implementation-ready output under:",
      "1. Decision / recommendation",
      "2. Changes or code",
      "3. Risks / blockers",
      "4. Validation / acceptance checks",
      "5. Next action to import back into DataNest",
      "",
      "I will return the relevant result to Resonance DataNest as traceable uncertified AI Companion evidence."
    ].join("\n");
  }

  async function copyHandoff(){
    const text=handoff||preparedHandoff;
    if(!text)return;
    setHandoff(text);
    try{
      await navigator.clipboard.writeText(text);
      onNotice("External AI Job Manifest handoff copied.");
    }catch{
      onError("Clipboard access was blocked. Copy the handoff manually from the sidebar.");
    }
  }

  function companionFeatures(){
    const screenInfo=window.screen as Screen & {availLeft?:number;availTop?:number};
    const screenLeft=screenInfo.availLeft||0;
    const screenTop=screenInfo.availTop||0;
    const screenWidth=screenInfo.availWidth||window.innerWidth;
    const screenHeight=screenInfo.availHeight||window.innerHeight;
    const browserLeft=Number.isFinite(window.screenX)?window.screenX:screenLeft;
    const browserTop=Number.isFinite(window.screenY)?window.screenY:screenTop;
    const browserWidth=window.outerWidth||screenWidth;
    const browserHeight=window.outerHeight||screenHeight;
    const placement=calculateCompanionPlacement({
      screenLeft,
      screenTop,
      screenWidth,
      screenHeight,
      browserLeft,
      browserTop,
      browserWidth,
      browserHeight,
      dockWidth:width,
      preferredWidth:width
    });
    return [
      "popup=yes",
      "resizable=yes",
      "scrollbars=yes",
      "width="+placement.width,
      "height="+placement.height,
      "left="+placement.left,
      "top="+placement.top
    ].join(",");
  }

  function providerLaunchUrl(){
    return new URL(selectedProvider.url).toString();
  }

  function openProviderWindow(mode:"companion"|"popout"){
    const name=mode==="companion"
      ? "datanest-ai-companion-"+selectedProvider.key
      : "_blank";
    const features=mode==="companion"
      ? "noopener,noreferrer,"+companionFeatures()
      : "noopener,noreferrer,resizable=yes,scrollbars=yes";
    return window.open(providerLaunchUrl(),name,features);
  }

  async function startSession(mode:"sidebar"|"companion"|"popout"){
    if(!selectedJob)return;

    const draftHandoff=preparedHandoff;
    setHandoff(draftHandoff);
    setBusy(true);
    onError("");

    let popup:Window|null=null;
    if(mode==="companion"||mode==="popout"){
      const name=mode==="companion"
        ? "datanest-ai-companion-"+selectedProvider.key
        : "_blank";
      const features=mode==="companion"
        ? companionFeatures()
        : "popup=yes,resizable=yes,scrollbars=yes";
      popup=window.open("about:blank",name,features);
      if(popup)popup.opener=null;
    }

    try{
      const supabase=getSupabase();
      if(!supabase)throw new Error("Supabase is unavailable.");

      const {data,error}=await supabase.rpc("start_external_ai_sidebar_session",{
        target_job:selectedJob.id,
        target_provider:selectedProvider.key,
        target_mode:mode
      });
      if(error)throw error;

      const payload=(data||{}) as Record<string,unknown>;
      const newSessionId=String(payload.session_id||"");
      const newTraceKey=String(payload.trace_key||"");
      const trackedHandoff=buildHandoff({
        sessionId:newSessionId,
        traceKey:newTraceKey,
        providerLabel:selectedProvider.label
      });

      setSessionId(newSessionId);
      setTraceKey(newTraceKey);
      setHandoff(trackedHandoff);
      setLaunchMode(mode);

      try{
        await navigator.clipboard.writeText(trackedHandoff);
      }catch{
        // Manual copy remains available in the sidebar.
      }

      if(mode==="sidebar"){
        setEmbedUrl(selectedProvider.url);
        onNotice(
          selectedProvider.label+
          " opened in the DataNest AI sidebar. If the provider blocks embedded display, switch to companion mode; the tracked handoff remains copied."
        );
      }else{
        setEmbedUrl("");
        const launchUrl=providerLaunchUrl();
        if(popup){
          popup.location.href=launchUrl;
        }else{
          openProviderWindow(mode);
        }
        onNotice(
          selectedProvider.key==="chatgpt"&&mode==="companion"
            ? "ChatGPT opened without DataNest work content in the URL. The tracked Job Manifest handoff is copied; paste it, review the trace header, then send."
            : selectedProvider.label+
              (mode==="companion"
                ? " opened in DataNest companion mode beside the app using your own account. "
                : " opened in a separate window using your own account. ")+
              "The tracked Job Manifest handoff is prepared."
        );
      }
    }catch(error){
      if(popup&&!popup.closed)popup.close();
      onError(error instanceof Error?error.message:"Unable to start external AI session.");
    }finally{
      setBusy(false);
    }
  }

  async function importResponseContent(content:string){
    if(!sessionId||!content.trim())return;
    const supabase=getSupabase();
    if(!supabase)return;

    setBusy(true);
    onError("");
    try{
      const {data,error}=await supabase.functions.invoke("datanest-ai-intake",{
        body:{
          sourceType:"ai_companion",
          externalAiSessionId:sessionId,
          datanestAiSessionId:selectedJob&&
            activeDataNestAiSession?.jobId===selectedJob.id&&
            activeDataNestAiSession.sessionId
              ?activeDataNestAiSession.sessionId
              :null,
          content:content.trim()
        }
      });
      if(error)throw error;

      const payload=(data||{}) as Record<string,unknown>;
      const eventId=String(payload.eventId||"");
      const stagedTraceId=String(payload.traceId||traceKey||"");
      setResponseText("");
      setLastImportedId(eventId);
      onNotice(
        "External AI result staged as UNCERTIFIED evidence for "+
        (selectedJob?jobCode(selectedJob):"the Job Manifest")+
        (payload.idempotent?" using the existing trace.":".")
      );
      const stagedSessionId=String(payload.sessionId||"");
      window.dispatchEvent(new CustomEvent("datanest:external-ai-staged",{
        detail:{jobId:selectedJobId,eventId,traceId:stagedTraceId,sessionId:stagedSessionId}
      }));
    }catch(error){
      onError(error instanceof Error?error.message:"Unable to import external AI response.");
    }finally{
      setBusy(false);
    }
  }

  async function enableClipboardAutoFill(){
    if(!sessionId){
      onError("Open a tracked AI companion session before enabling auto-fill.");
      return;
    }
    if(!navigator.clipboard?.readText){
      setClipboardAccess("unsupported");
      onError("This browser does not expose clipboard reading to DataNest. Paste the response manually.");
      return;
    }

    try{
      const clipboardText=await navigator.clipboard.readText();
      const permissionState=await refreshClipboardAccess();
      const candidate=selectExternalAiClipboardCandidate({
        clipboardText,
        currentResponse:responseTextRef.current,
        blockedTexts:[handoff,preparedHandoff,lastClipboardCapture.current]
      });

      if(candidate){
        lastClipboardCapture.current=candidate;
        setResponseText(candidate);
        setLastImportedId("");
      }

      if(permissionState==="granted"){
        setAutoCaptureEnabled(true);
        onNotice(
          candidate
            ?"Session auto-fill enabled and the current external AI response was captured. Review it, then click Import."
            :"Session auto-fill enabled. Copy the external AI response and return to DataNest."
        );
      }else{
        setAutoCaptureEnabled(false);
        onNotice(
          candidate
            ?"Clipboard content was captured once; session auto-fill remains off because persistent clipboard permission is unavailable."
            :"Clipboard access was allowed once; session auto-fill remains off. Use Paste from clipboard when needed."
        );
      }
    }catch{
      setAutoCaptureEnabled(false);
      const permissionState=await refreshClipboardAccess();
      if(permissionState==="denied"){
        onError("Clipboard access is blocked for DataNest. Allow clipboard access in the browser site permissions, then click Enable auto-fill again.");
      }else{
        onError("Clipboard access was not granted. Click Enable auto-fill and accept the browser clipboard permission prompt.");
      }
    }
  }

  async function pasteClipboardResponse(){
    await captureClipboardResponse(true);
    await refreshClipboardAccess();
  }

  function disableClipboardAutoFill(){
    setAutoCaptureEnabled(false);
    onNotice("Session auto-fill is off. Manual paste remains available.");
  }

  async function importResponse(event:FormEvent){
    event.preventDefault();
    await importResponseContent(responseText);
  }

  function beginResize(event:React.PointerEvent<HTMLDivElement>){
    event.preventDefault();
    const startX=event.clientX;
    const startWidth=width;

    const move=(pointer:PointerEvent)=>{
      setWidth(clamp(startWidth+(startX-pointer.clientX),380,760));
    };
    const up=()=>{
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",up);
    };
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up,{once:true});
  }

  return <aside className="externalAiDock" style={{width}}>
    <div
      className="externalAiResizeHandle"
      onPointerDown={beginResize}
      title="Drag to resize AI sidebar"
      aria-hidden="true"
    />

    <header className="externalAiDockHeader">
      <div>
        <p className="eyebrow">EXTERNAL AI</p>
        <h2>Live AI Sidebar</h2>
      </div>
      <div className="externalAiDockActions">
        <span className="badge live">BYO ACCOUNT</span>
        <div className="rowActions" role="group" aria-label="AI sidebar width">
          <button className="iconButton" type="button" onClick={()=>setWidth(current=>clamp(current-40,380,760))} aria-label="Narrow AI sidebar">−</button>
          <button className="iconButton" type="button" onClick={()=>setWidth(current=>clamp(current+40,380,760))} aria-label="Widen AI sidebar">+</button>
        </div>
        <button className="iconButton" type="button" onClick={onClose} aria-label="Close external AI sidebar">×</button>
      </div>
    </header>

    <div className="externalAiDockBody">
      <section className="externalAiDockSection">
        <label>
          Job Manifest
          <select value={selectedJobId} onChange={event=>setSelectedJobId(event.target.value)}>
            {jobs.map(job=><option value={job.id} key={job.id}>
              {jobCode(job)+" · "+job.title+" · "+job.status}
            </option>)}
          </select>
        </label>

        <label>
          External AI
          <select value={provider} onChange={event=>setProvider(event.target.value)}>
            {providers.map(item=><option value={item.key} key={item.key}>{item.label}</option>)}
          </select>
        </label>

        {selectedJob&&<div className="externalAiJobSummary">
          <div className="rowBetween">
            <b>{jobCode(selectedJob)}</b>
            <span className="badge neutral">{selectedJob.status}</span>
          </div>
          <strong>{selectedJob.title}</strong>
          <small>{"Priority "+selectedJob.priority+" · Updated "+new Date(selectedJob.updated_at).toLocaleString()}</small>
          <div className="externalAiTraceGrid">
            <span>Manifest</span><code>{jobCode(selectedJob)}</code>
            <span>Job ID</span><code>{selectedJob.id}</code>
            <span>Provider</span><code>{selectedProvider.label}</code>
            <span>Trace</span><code>{traceKey||"created when companion opens"}</code>
          </div>
          <p className="externalAiPromptReady">
            Job Manifest handoff is prepared. Open the provider, paste the copied handoff, verify the tracking header, then send.
          </p>
        </div>}

        {selectedProvider.embed==="blocked"&&<div className="externalAiEmbedNotice" role="status">
          <b>{selectedProvider.label+" uses companion mode"}</b>
          <span>{selectedProvider.embedReason}</span>
        </div>}

        <div className="externalAiLaunchButtons">
          <button
            className="primaryButton compact"
            type="button"
            disabled={busy||!selectedJob}
            onClick={()=>void startSession(selectedProvider.embed==="blocked"?"companion":"sidebar")}
          >{busy
            ?"Opening…"
            :selectedProvider.embed==="blocked"
              ?"Open companion + copy handoff"
              :"Open in sidebar"}</button>
          <button
            className="secondaryButton compact"
            type="button"
            disabled={busy||!selectedJob}
            onClick={()=>void startSession("popout")}
          >Pop out</button>
          <button className="textButton" type="button" disabled={!selectedJob} onClick={()=>void copyHandoff()}>
            Copy handoff
          </button>
        </div>

        <p className="externalAiPrivacyNote">
          Uses your external AI account/credits. Provider windows open without DataNest work content in the URL.
          The copied handoff omits your email by default. Signed in here as {currentUserEmail}.
          Returned work is staged as UNCERTIFIED evidence and cannot become project-wide memory until governed certification.
        </p>
      </section>

      {launchMode==="companion"&&sessionId&&<section className="externalAiCompanionSection">
        <div className="externalAiCompanionIcon">↗</div>
        <div>
          <p className="eyebrow">COMPANION MODE</p>
          <h3>{selectedProvider.label+" is open beside DataNest"}</h3>
          <p>
            The provider's own secure window handles sign-in and your account/credits.
            DataNest keeps the Job Manifest handoff, tracking, and response import here in the sidebar.
          </p>
          {selectedJob&&<div className="externalAiTraceGrid">
            <span>Job</span><code>{jobCode(selectedJob)}</code>
            <span>Job ID</span><code>{selectedJob.id}</code>
            <span>Trace</span><code>{traceKey||"pending"}</code>
            <span>Session</span><code>{sessionId}</code>
          </div>}
          {selectedProvider.key==="chatgpt"&&<p className="externalAiPromptReady">
            The tracked handoff is copied to your clipboard. Paste it into ChatGPT, review the tracking header, then send.
          </p>}
          <div className="externalAiCompanionActions">
            <button className="secondaryButton compact" type="button" onClick={()=>openProviderWindow("companion")}>
              Reopen provider
            </button>
            <button className="textButton" type="button" onClick={()=>void copyHandoff()}>
              Copy handoff again
            </button>
          </div>
        </div>
      </section>}

      {embedUrl&&<section className="externalAiEmbedSection">
        <div className="rowBetween">
          <div>
            <p className="eyebrow">LIVE PROVIDER</p>
            <b>{selectedProvider.label}</b>
          </div>
          <div className="externalAiFrameActions">
            <button className="textButton" type="button" onClick={()=>setEmbedUrl(selectedProvider.url)}>Reload</button>
            <button className="textButton" type="button" onClick={()=>void startSession("popout")}>Pop out</button>
          </div>
        </div>
        <div className="externalAiFrameWrap">
          <iframe
            className="externalAiFrame"
            title={selectedProvider.label+" external AI"}
            src={embedUrl}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="externalAiFrameFallback">
          Some AI providers block iframe embedding for security. If this panel refuses to load or sign in, use <b>Pop out</b>.
          DataNest does not bypass provider framing protections; the tracked handoff/import workflow remains active.
        </p>
      </section>}



      {selectedJob&&<details className="externalAiDockSection externalAiHandoff" open={false}>
        <summary>{"Job Manifest handoff · "+jobCode(selectedJob)+" · JOB ID "+selectedJob.id}</summary>
        <textarea rows={10} readOnly value={handoff||preparedHandoff}/>
      </details>}

      {!sessionId&&<div className="externalAiDockEmpty">
        <div>AI</div>
        <h3>Choose a Job Manifest and provider</h3>
        <p>Providers that permit embedding can open inside this dock. ChatGPT uses managed companion mode so its secure web app opens beside DataNest while the tracked workflow remains here.</p>
      </div>}
    </div>

    <form className="externalAiReturnDock externalAiImport" onSubmit={importResponse}>
      <div className="rowBetween">
        <div>
          <p className="eyebrow">RETURN TO DATANEST</p>
          <b>External AI response</b>
        </div>
        <span className={"badge "+(lastImportedId?"good":autoCaptureEnabled&&clipboardAccess==="granted"?"good":sessionId?"live":"neutral")}>
          {lastImportedId?"IMPORTED":autoCaptureEnabled&&clipboardAccess==="granted"?"AUTO-FILL ON":sessionId?launchMode.toUpperCase()+" · READY":"WAITING"}
        </span>
      </div>
      <p className="externalAiImportHint">
        {!sessionId
          ?"Open a tracked AI companion session to enable response capture and import."
          :autoCaptureEnabled&&clipboardAccess==="granted"
            ?"Session auto-fill is on for this tracked session only. Existing drafts are preserved; use Paste from clipboard for an explicit replacement."
            :clipboardAccess==="denied"
              ?"Clipboard access is blocked. Manual typing remains available, or allow clipboard access for DataNest in the browser."
              :"Manual paste is the default. Enable session auto-fill only when you want DataNest to read newly copied text as you return to this session."}
      </p>
      <textarea
        rows={5}
        disabled={!sessionId}
        value={responseText}
        onChange={event=>setResponseText(event.target.value)}
        placeholder={sessionId
          ?"Paste or type the external AI response here. Session auto-fill is optional."
          :"Return to DataNest will activate when a tracked AI session is open."}
      />
      <div className="externalAiImportActions">
        <button
          className="secondaryButton compact"
          type="button"
          disabled={busy||!sessionId}
          onClick={()=>void pasteClipboardResponse()}
        >
          Paste from clipboard
        </button>
        <button
          className="textButton"
          type="button"
          disabled={busy||!sessionId}
          onClick={()=>autoCaptureEnabled?disableClipboardAutoFill():void enableClipboardAutoFill()}
        >
          {autoCaptureEnabled?"Turn off auto-fill":"Enable session auto-fill"}
        </button>
        <button
          className="primaryButton compact"
          disabled={busy||!sessionId||!responseText.trim()}
        >
          {busy?"Importing…":"Import to DataNest"}
        </button>
        <button
          className="textButton"
          type="button"
          disabled={busy||!responseText}
          onClick={()=>setResponseText("")}
        >
          Clear
        </button>
      </div>
      <small>
        {sessionId
          ?"Tracked session "+sessionId.slice(0,8)+(lastImportedId?" · Input "+lastImportedId.slice(0,8):"")
          :"No tracked session yet"}
      </small>
    </form>
  </aside>;
}
