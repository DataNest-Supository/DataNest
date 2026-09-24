"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

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
  {key:"chatgpt",label:"ChatGPT",url:"https://chatgpt.com/"},
  {key:"gemini",label:"Gemini",url:"https://gemini.google.com/app"},
  {key:"claude",label:"Claude",url:"https://claude.ai/new"},
  {key:"grok",label:"Grok",url:"https://grok.com/"},
  {key:"perplexity",label:"Perplexity",url:"https://www.perplexity.ai/"}
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
  onClose,
  onNotice,
  onError
}:{
  projectId:string;
  currentUserEmail:string;
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
  const [launchMode,setLaunchMode]=useState<"sidebar"|"popout">("sidebar");
  const [handoff,setHandoff]=useState("");
  const [responseText,setResponseText]=useState("");
  const [embedUrl,setEmbedUrl]=useState("");
  const [busy,setBusy]=useState(false);

  const selectedJob=useMemo(
    ()=>jobs.find(job=>job.id===selectedJobId)||null,
    [jobs,selectedJobId]
  );
  const selectedProvider=providers.find(item=>item.key===provider)||providers[0];

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
      if(current&&next.some(job=>job.id===current))return current;
      const remembered=typeof window!=="undefined"?window.localStorage.getItem("datanest.aiSidebar.job")||"":"";
      if(remembered&&next.some(job=>job.id===remembered))return remembered;
      return next[0]?.id||"";
    });
  },[projectId,onError]);

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
    if(!selectedJobId)return;
    window.localStorage.setItem("datanest.aiSidebar.job",selectedJobId);
    setSessionId("");
    setResponseText("");
    setEmbedUrl("");
    void loadJobContext(selectedJobId);
  },[selectedJobId,loadJobContext]);

  useEffect(()=>{
    window.localStorage.setItem("datanest.aiSidebar.width",String(width));
  },[width]);

  useEffect(()=>{
    window.localStorage.setItem("datanest.aiSidebar.provider",provider);
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

  function buildHandoff(){
    if(!selectedJob)return "";

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
      "You are collaborating live on one Resonance DataNest Job Manifest.",
      "Use only the supplied project/job context. Do not claim to have changed GitHub, Supabase, Vercel, DataNest, or another external system unless you actually have authorized tool access and perform that action.",
      "",
      "User: "+currentUserEmail,
      "Job Manifest: "+jobCode(selectedJob)+" · "+selectedJob.title,
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
      "I will import the relevant result back into Resonance DataNest as tracked external-AI R&D input."
    ].join("\n");
  }

  async function copyHandoff(){
    const text=handoff||buildHandoff();
    if(!text)return;
    setHandoff(text);
    try{
      await navigator.clipboard.writeText(text);
      onNotice("External AI Job Manifest handoff copied.");
    }catch{
      onError("Clipboard access was blocked. Copy the handoff manually from the sidebar.");
    }
  }

  async function startSession(mode:"sidebar"|"popout"){
    if(!selectedJob)return;

    const handoffText=buildHandoff();
    setHandoff(handoffText);
    setBusy(true);
    onError("");

    let popup:Window|null=null;
    if(mode==="popout"){
      popup=window.open("about:blank","_blank","noopener,noreferrer");
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
      setSessionId(String(payload.session_id||""));
      setLaunchMode(mode);

      try{
        await navigator.clipboard.writeText(handoffText);
      }catch{
        // Manual copy remains available in the sidebar.
      }

      if(mode==="sidebar"){
        setEmbedUrl(selectedProvider.url);
        onNotice(
          selectedProvider.label+
          " opened in the DataNest AI sidebar. If the provider blocks embedded display, use Pop out; the handoff remains copied and tracked."
        );
      }else{
        if(popup){
          popup.location.href=selectedProvider.url;
        }else{
          window.open(selectedProvider.url,"_blank","noopener,noreferrer");
        }
        onNotice(
          selectedProvider.label+
          " opened in a separate window using your own account. The Job Manifest handoff was prepared for this tracked session."
        );
      }
    }catch(error){
      if(popup&&!popup.closed)popup.close();
      onError(error instanceof Error?error.message:"Unable to start external AI session.");
    }finally{
      setBusy(false);
    }
  }

  async function importResponse(event:FormEvent){
    event.preventDefault();
    if(!sessionId||!responseText.trim())return;

    const supabase=getSupabase();
    if(!supabase)return;

    setBusy(true);
    onError("");
    try{
      const {data,error}=await supabase.rpc("import_external_ai_response",{
        target_session:sessionId,
        response_content:responseText.trim()
      });
      if(error)throw error;

      const payload=(data||{}) as Record<string,unknown>;
      setResponseText("");
      onNotice(
        "External AI response imported into "+
        (selectedJob?jobCode(selectedJob):"the Job Manifest")+
        (payload.idempotent?" using the existing tracked import.":".")
      );
      window.dispatchEvent(new CustomEvent("datanest:external-ai-imported",{
        detail:{jobId:selectedJobId,inputId:String(payload.input_id||"")}
      }));
    }catch(error){
      onError(error instanceof Error?error.message:"Unable to import external AI response.");
    }finally{
      setBusy(false);
    }
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
        </div>}

        <div className="externalAiLaunchButtons">
          <button
            className="primaryButton compact"
            type="button"
            disabled={busy||!selectedJob}
            onClick={()=>void startSession("sidebar")}
          >{busy?"Opening…":"Open in sidebar"}</button>
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
          Uses your external AI account/credits. Launching a session creates no contribution points.
          Imported work remains reported/unscored until independent review.
        </p>
      </section>

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
          Some AI providers block iframe embedding for security. If this panel refuses to load or sign in, use <b>Pop out</b>;
          the DataNest session, handoff and import workflow remain active.
        </p>
      </section>}

      {handoff&&<details className="externalAiDockSection externalAiHandoff" open={!embedUrl}>
        <summary>Job Manifest handoff</summary>
        <textarea rows={10} readOnly value={handoff}/>
      </details>}

      {sessionId&&<form className="externalAiDockSection externalAiImport" onSubmit={importResponse}>
        <div className="rowBetween">
          <div>
            <p className="eyebrow">RETURN TO DATANEST</p>
            <b>Import external AI response</b>
          </div>
          <span className="badge good">{launchMode.toUpperCase()} · OPEN</span>
        </div>
        <textarea
          rows={7}
          value={responseText}
          onChange={event=>setResponseText(event.target.value)}
          placeholder="Paste the useful external AI response, code recommendation, decision, test result, or development plan here…"
        />
        <button className="primaryButton" disabled={busy||!responseText.trim()}>
          {busy?"Importing…":"Import response to DataNest"}
        </button>
        <small>{"Tracked session "+sessionId.slice(0,8)}</small>
      </form>}

      {!sessionId&&<div className="externalAiDockEmpty">
        <div>AI</div>
        <h3>Choose a Job Manifest and provider</h3>
        <p>Open the provider inside this dock when embedding is supported, or use the pop-out fallback while DataNest stays open.</p>
      </div>}
    </div>
  </aside>;
}
