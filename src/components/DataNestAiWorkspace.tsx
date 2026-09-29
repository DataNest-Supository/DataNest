"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import DataNestAiChatPanel,{type DataNestAiEvent} from "@/components/DataNestAiChatPanel";
import DataNestAiMemoryPanel,{type CertifiedMemoryItem} from "@/components/DataNestAiMemoryPanel";
import DataNestAiCertificationPanel from "@/components/DataNestAiCertificationPanel";
import IntelligenceFabricPanel from "@/components/IntelligenceFabricPanel";
import JobInviteForm from "@/components/JobInviteForm";
import PageHeader from "@/components/platform/PageHeader";
import StatusIndicator from "@/components/platform/StatusIndicator";

type Role="owner"|"admin"|"operator"|"viewer";

type Job={
  id:string;
  job_number:number;
  title:string;
  description:string|null;
  priority:number;
  status:string;
  required_capabilities:string[];
  created_at:string;
  updated_at:string;
};

type ContextResponse={
  sessionId:string;
  job:Job;
  events:DataNestAiEvent[];
  certifiedMemory:CertifiedMemoryItem[];
};

type Props={
  projectId:string;
  currentUserId:string;
  currentUserEmail:string;
  role:Role;
  canOperate:boolean;
  openScheduler:()=>void;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
  preferredJobId?:string|null;
  onActiveSessionChange:(session:{jobId:string;sessionId:string|null;jobNumber:number;title:string;status:string}|null)=>void;
};

const jobColumns="id,job_number,title,description,priority,status,required_capabilities,created_at,updated_at";

function jobCode(job:Job){
  return "JOB-"+String(job.job_number).padStart(5,"0");
}

function formatDate(value:string,timeZone:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone,timeZoneName:"short"
  }).format(new Date(value));
}

export default function DataNestAiWorkspace({
  projectId,
  currentUserId,
  currentUserEmail,
  role,
  canOperate,
  openScheduler,
  setNotice,
  setError,
  preferredJobId=null,
  onActiveSessionChange
}:Props){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [displayTimeZone,setDisplayTimeZone]=useState("UTC");
  const [selectedJobId,setSelectedJobId]=useState("");
  const [sessionId,setSessionId]=useState("");
  const [context,setContext]=useState<ContextResponse|null>(null);
  const [jobsLoading,setJobsLoading]=useState(true);
  const [contextLoading,setContextLoading]=useState(false);
  const [jobsError,setJobsError]=useState("");
  const [contextError,setContextError]=useState("");
  const contextRequestRef=useRef(0);
  const loading=jobsLoading||contextLoading;
  const selectedJobIdRef=useRef("");
  const sessionByJobRef=useRef<Record<string,string>>({});

  const sessionKey=useCallback((jobId:string)=>
    projectId+":"+currentUserId+":"+jobId
  ,[projectId,currentUserId]);

  useEffect(()=>{
    setDisplayTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");
  },[]);

  const selectedJob=useMemo(
    ()=>jobs.find(job=>job.id===selectedJobId)||null,
    [jobs,selectedJobId]
  );

  const loadJobs=useCallback(async()=>{
    setJobsLoading(true);
    setJobsError("");
    try{
      const supabase=getSupabase();
      if(!supabase)throw new Error("DataNest connection is unavailable. Reload the workspace and retry.");
      const {data,error}=await supabase
        .from("jobs")
        .select(jobColumns)
        .eq("project_id",projectId)
        .order("updated_at",{ascending:false})
        .limit(50);
      if(error)throw error;
      const next=(data||[]) as Job[];
      setJobs(next);
      const current=selectedJobIdRef.current;
      const nextId=current&&next.some(job=>job.id===current)
        ?current
        :preferredJobId&&next.some(job=>job.id===preferredJobId)
          ?preferredJobId
          :next[0]?.id||"";
      if(nextId!==current){
        contextRequestRef.current++;
        setContext(null);
        setContextError("");
        setContextLoading(Boolean(nextId));
        setSessionId("");
      }
      selectedJobIdRef.current=nextId;
      setSelectedJobId(nextId);
      return nextId;
    }catch(error){
      const message=error instanceof Error?error.message:"Unable to load Job Manifests. Please retry.";
      setJobsError(message);
    }finally{
      setJobsLoading(false);
    }
  },[projectId,preferredJobId]);

  const refreshContext=useCallback(async(sessionOverride?:string)=>{
    if(!selectedJobId)return;
    const requestedJobId=selectedJobId;
    const requestedSessionKey=sessionKey(requestedJobId);
    const requestedSessionId=typeof sessionOverride==="string"
      ?sessionOverride||null
      :sessionByJobRef.current[requestedSessionKey]||null;
    const request=++contextRequestRef.current;
    const isCurrent=()=>request===contextRequestRef.current&&selectedJobIdRef.current===requestedJobId;
    setContextLoading(true);
    setContextError("");
    try{
      const supabase=getSupabase();
      if(!supabase)throw new Error("DataNest connection is unavailable. Reload the workspace and retry.");
      const {data,error}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{action:"context",jobId:requestedJobId,sessionId:requestedSessionId}
      });
      if(!isCurrent())return;
      if(error)throw error;
      const payload=data as ContextResponse;
      if(payload?.job?.id!==requestedJobId)throw new Error("The returned context does not match this Job. Retry to reload the correct context.");
      setContext(payload);
      const nextSessionId=String(payload.sessionId||"");
      sessionByJobRef.current[requestedSessionKey]=nextSessionId;
      setSessionId(nextSessionId);
    }catch(error){
      if(isCurrent())setContextError(error instanceof Error?error.message:"Unable to load Job context. Please retry.");
    }finally{
      if(isCurrent())setContextLoading(false);
    }
  },[selectedJobId,sessionKey]);

  useEffect(()=>{void loadJobs()},[loadJobs]);

  useEffect(()=>{
    if(jobsLoading)return;
    onActiveSessionChange(
      selectedJob?{
        jobId:selectedJob.id,
        sessionId:sessionId||null,
        jobNumber:selectedJob.job_number,
        title:selectedJob.title,
        status:selectedJob.status
      }:null
    );
  },[jobsLoading,selectedJob,sessionId,onActiveSessionChange]);

  useEffect(()=>{
    if(!selectedJobId)return;
    setSessionId(sessionByJobRef.current[sessionKey(selectedJobId)]||"");
    setContext(null);
    window.dispatchEvent(new CustomEvent("datanest:job-selected",{
      detail:{jobId:selectedJobId}
    }));
  },[selectedJobId,sessionKey]);

  useEffect(()=>{
    if(!selectedJobId)return;
    void refreshContext();
  },[selectedJobId,refreshContext]);

  useEffect(()=>{
    const refreshStaged=(event:Event)=>{
      const detail=(event as CustomEvent<{jobId?:string;sessionId?:string}>).detail;
      if(detail?.jobId!==selectedJobId)return;

      const stagedSessionId=String(detail.sessionId||"");
      if(stagedSessionId&&stagedSessionId!==sessionId){
        sessionByJobRef.current[sessionKey(selectedJobId)]=stagedSessionId;
        setSessionId(stagedSessionId);
        void refreshContext(stagedSessionId);
        return;
      }

      void refreshContext();
    };
    window.addEventListener("datanest:external-ai-staged",refreshStaged);
    return()=>window.removeEventListener("datanest:external-ai-staged",refreshStaged);
  },[selectedJobId,sessionId,sessionKey,refreshContext]);

  async function refreshAll(){
    const nextId=await loadJobs();
    if(nextId&&nextId===selectedJobId)await refreshContext();
  }

  function selectJob(nextId:string){
    if(nextId===selectedJobIdRef.current)return;
    contextRequestRef.current++;
    selectedJobIdRef.current=nextId;
    setContext(null);
    setContextError("");
    setContextLoading(true);
    setSessionId(sessionByJobRef.current[sessionKey(nextId)]||"");
    setSelectedJobId(nextId);
  }

  function reduceMotionEnabled(){
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches||
      document.documentElement.dataset.motionPaused==="true";
  }

  function scrollToWorkspaceNode(node:HTMLElement|null,block:ScrollLogicalPosition="center"){
    node?.scrollIntoView({behavior:reduceMotionEnabled()?"instant":"smooth",block});
  }

  function openAiWorkspace(){
    const chat=document.getElementById("datanest-ai-chat");
    const input=chat?.querySelector<HTMLTextAreaElement>(".datanestAiComposer textarea")||null;
    scrollToWorkspaceNode(chat,"start");
    input?.focus({preventScroll:true});
  }

  function inspectCertifiedMemory(){
    const disclosure=document.getElementById("datanest-ai-governance-tools");
    if(disclosure instanceof HTMLDetailsElement)disclosure.open=true;
    window.requestAnimationFrame(()=>{
      const memory=document.querySelector<HTMLElement>('[aria-label="Certified Memory"]');
      scrollToWorkspaceNode(memory,"start");
      memory?.focus?.({preventScroll:true});
    });
  }

  if(!jobs.length){
    return <section className="panel" aria-busy={jobsLoading}>
      <p className="eyebrow">DATANEST AI</p>
      <h2>{jobsLoading?"Loading Job Manifests…":jobsError?"Unable to load Job Manifests":"No accessible Job Manifests"}</h2>
      {jobsError&&<p role="alert">{jobsError}</p>}
      {!jobsLoading&&<>
        {!jobsError&&<p className="muted">Create a Job Manifest in UNIFI Planner or ask an operator to invite you to a Job.</p>}
        <div className="rowActions">
          {!jobsError&&canOperate&&<a className="primaryButton" href="?view=unifi">Open UNIFI Planner</a>}
          <button className="secondaryButton" onClick={()=>void loadJobs()}>Retry loading jobs</button>
        </div>
      </>}
    </section>;
  }

  const contextReady=Boolean(context?.job.id===selectedJobId&&!contextError&&!jobsError&&!loading);
  const contextStatus=loading?"SYNCING":contextError||jobsError?"NEEDS ATTENTION":contextReady?"CONTEXT READY":"STANDBY";

  return <div className="datanestAiWorkspace">
    <section className="panel" aria-label="DataNest AI objective">
      <PageHeader
        eyebrow="DATANEST AI · GOVERNED OBJECTIVE"
        title="Governed AI workspace"
        description={selectedJob?selectedJob.description||"Work inside the selected governed Job context.":"Select a governed Job Manifest before continuing."}
        primaryAction={<button className="primaryButton compact" type="button" disabled={!contextReady} onClick={openAiWorkspace}>Open command composer</button>}
        meta={<>
          <StatusIndicator label={contextStatus} tone={contextReady?"success":contextError||jobsError?"warning":"info"} detail={contextReady?"Governed Job context ready":"Human review remains required"}/>
          {selectedJob&&<span className="badge quiet">{jobCode(selectedJob)+" · "+selectedJob.title}</span>}
        </>}
      />
    </section>
    {jobsError&&<section className="panel" role="alert"><p>{jobsError}</p><button className="secondaryButton" disabled={jobsLoading} onClick={()=>void loadJobs()}>Retry loading jobs</button></section>}
    {contextError&&<section className="panel" role="alert"><h3>Job context needs attention</h3><p>{contextError}</p><p className="muted">Your draft is preserved. Retry context loading before sending another command.</p><button className="secondaryButton" disabled={loading} onClick={()=>void refreshContext()}>Retry AI context</button></section>}

      <section className={"datanestAiHero datanestAiHeroV2 "+(loading?"isWorking":"isReady")} aria-label="DataNest AI development command center">
      <div className="datanestAiHeroGrid" aria-hidden="true"/>
      <div className="datanestAiHeroGlow datanestAiHeroGlowOne" aria-hidden="true"/>
      <div className="datanestAiHeroGlow datanestAiHeroGlowTwo" aria-hidden="true"/>

      <div className="datanestAiHeroCopy">
        <div className="datanestAiHeroBadge">
          <span className="datanestAiSignalMark" aria-hidden="true">✦</span>
          DATANEST AI // INTELLIGENCE CORE
        </div>
        <h2><span>DataNest</span> AI</h2>
        <h3>Governed intelligence for <strong>everything DataNest knows.</strong></h3>
        <p>
          Bring human intent, governed project context and certified memory into one traceable development workspace.
        </p>

        <div className="datanestAiHeroActions datanestAiHeroActionsCompact">
          <button className="secondaryButton datanestAiHeroSecondary" type="button" onClick={openScheduler}>
            Open TranScheduler
          </button>
          <button className="textButton datanestAiHeroRefresh" type="button" disabled={loading} onClick={()=>void refreshAll()}>
            {loading?"Refreshing AI context…":"Refresh AI context"}
          </button>
        </div>
      </div>

      <div className="datanestAiHeroVisual" aria-label="DataNest AI intelligence core with governed project context">
        <div className="datanestAiHudHeader" aria-hidden="true">
          <span>RESONANCE / DATANEST</span>
          <b>AI CORE</b>
          <small>{contextStatus}</small>
        </div>
        <article className="datanestAiFloatCard datanestAiContextCard">
          <span className="datanestAiFloatIcon" aria-hidden="true">▰</span>
          <div>
            <b>Project Context</b>
            <small>{selectedJob?jobCode(selectedJob):"Job manifest"}</small>
            <small>Source · Documentation · Architecture</small>
          </div>
        </article>

        <article className="datanestAiFloatCard datanestAiExternalCard">
          <span className="datanestAiFloatIcon" aria-hidden="true">⌁</span>
          <div>
            <b>External AI</b>
            <small>Companion mode</small>
            <small>Traceable returned output</small>
          </div>
        </article>

        <div className="datanestAiCoreStage" aria-hidden="true">
          <div className="datanestAiOrbit datanestAiOrbitOne"/>
          <div className="datanestAiOrbit datanestAiOrbitTwo"/>
          <div className="datanestAiOrbit datanestAiOrbitThree"/>
          <span className="datanestAiPacket packetOne"/>
          <span className="datanestAiPacket packetTwo"/>
          <span className="datanestAiPacket packetThree"/>
          <span className="datanestAiPacket packetFour"/>
          <div className="datanestAiCoreSphere">
            <span className="datanestAiCoreGlyph">AI</span>
            <b>DATANEST</b>
            <small>{contextStatus}</small>
          </div>
          <div className="datanestAiCoreBeam"/>
          <div className="datanestAiCoreBase">
            <i/><i/><i/>
          </div>
        </div>

        <article className="datanestAiFloatCard datanestAiToolsCard">
          <span className="datanestAiFloatIcon" aria-hidden="true">&gt;_</span>
          <div>
            <b>Development Tools</b>
            <small>Hosted CI · Cloud browser</small>
            <small>GitHub Actions · Playwright traces</small>
          </div>
        </article>

        <article className="datanestAiFloatCard datanestAiMemoryCard">
          <span className="datanestAiFloatIcon" aria-hidden="true">◫</span>
          <div>
            <b>Certified Memory</b>
            <small>{context?.certifiedMemory?.length||0} project-wide item{(context?.certifiedMemory?.length||0)===1?"":"s"}</small>
            <small>Governed validation · Provenance</small>
          </div>
        </article>

        <div className="datanestAiActivity" aria-hidden="true">
          <span/><span/><span/><span/><span/><span/><span/><span/><span/>
        </div>
        <div className="datanestAiPipelineLabel">
          <span className="datanestAiPipelineDot"/>
          {loading?"AI context pipeline synchronising":contextReady?"Governed Job context ready":"Job context needs attention"}
        </div>
      </div>
    </section>

    {selectedJob&&<>
      <section id="datanest-ai-chat" className="datanestAiChatStage" aria-label="DataNest AI Chat">
        <DataNestAiChatPanel
          draftScope={projectId+":"+currentUserId}
          jobId={selectedJob.id}
          jobCode={jobCode(selectedJob)}
          sessionId={sessionId}
          contextReady={contextReady}
          events={context?.events||[]}
          onSessionChange={nextSessionId=>{
            sessionByJobRef.current[sessionKey(selectedJob.id)]=nextSessionId;
            if(selectedJobIdRef.current===selectedJob.id)setSessionId(nextSessionId);
          }}
          onContextRefresh={refreshContext}
          setNotice={setNotice}
          setError={setError}
        />
        {loading&&!context&&<div className="datanestAiContextSync" role="status">
          <span className="datanestAiPipelineDot" aria-hidden="true"/>
          Synchronising governed Job context…
        </div>}
      </section>
    </>}

    <section className="datanestAiCommandSummary datanestAiCommandSummaryCompact" aria-label="DataNest AI current objective and active Job context">
      <div className="datanestAiCommandObjective">
        <small>Current objective</small>
        <strong>{selectedJob?jobCode(selectedJob)+" · "+selectedJob.title:"Select a Job Manifest"}</strong>
        <p>{selectedJob?.description||"Choose the governed Job context before continuing development work."}</p>
      </div>

      <div className="datanestAiCommandContext">
        {selectedJob?<>
          <label htmlFor="datanest-ai-active-job">Active Job context</label>
          <select id="datanest-ai-active-job" value={selectedJobId} onChange={event=>selectJob(event.target.value)}>
            {jobs.map(job=><option key={job.id} value={job.id}>{jobCode(job)+" · "+job.title}</option>)}
          </select>
          <div className="datanestAiContextSignals" aria-label="Active Job signals">
            <span className={"datanestAiContextSignal "+(contextReady?"good":loading?"syncing":"warn")}><i aria-hidden="true"/>{contextStatus}</span>
            <span className="datanestAiContextSignal">{selectedJob.status.replaceAll("_"," ")}</span>
            <button className="datanestAiContextSignal datanestAiContextSignalButton" type="button" onClick={inspectCertifiedMemory}>
              {(context?.certifiedMemory?.length||0)+" certified"}
            </button>
          </div>
        </>:<span className="muted">Select a Job Manifest to establish governed context.</span>}
      </div>

      <div className="datanestAiCommandActions">
        <button className="primaryButton" type="button" onClick={openAiWorkspace}>Focus chat <span aria-hidden="true">→</span></button>
        <button className="secondaryButton" type="button" disabled={loading||!selectedJob} onClick={()=>void refreshContext()}>
          {loading?"Syncing…":"Refresh context"}
        </button>
      </div>
    </section>

    {selectedJob&&<details className="datanestAiContextDetails">
      <summary>
        <span>
          <b>Job details</b>
          <small>{jobCode(selectedJob)+" · "+selectedJob.title}</small>
        </span>
        <span className="datanestAiContextDetailsMeta">
          <i>{selectedJob.status.replaceAll("_"," ")}</i>
          <i>{"P"+selectedJob.priority}</i>
        </span>
      </summary>
      <div className="datanestAiContextDetailsBody">
        <p className="muted">{selectedJob.description||"No description supplied."}</p>
        <div className="manifestMeta">
          <span>{selectedJob.required_capabilities?.join(", ")||"chat"}</span>
          <span>{"Updated "+formatDate(selectedJob.updated_at,displayTimeZone)}</span>
          <span>{sessionId?"Session "+sessionId.slice(0,8):"Session establishing…"}</span>
        </div>
        <div className="rowActions">
          <JobInviteForm
            jobId={selectedJob.id}
            canInvite={canOperate}
            compact
            onSent={message=>setNotice(message)}
          />
          <button className="secondaryButton compact" disabled={loading} onClick={()=>void refreshContext()}>Refresh context</button>
          <button className="secondaryButton compact" type="button" onClick={openScheduler}>Open TranScheduler</button>
        </div>
      </div>
    </details>}

    {selectedJob&&context&&<details id="datanest-ai-governance-tools" className="datanestAiAdvancedDisclosure">
      <summary>
        <span>
          <b>Memory &amp; governance</b>
          <small>Certified memory, Intelligence Fabric, learning and certification.</small>
        </span>
        <span className="datanestAiDisclosureStatus">{(context.certifiedMemory?.length||0)+" CERTIFIED"}</span>
      </summary>
      <div className="datanestAiAdvancedBody">
        <section className="datanestAiSupportGrid">
          <div aria-label="Certified Memory">
            <DataNestAiMemoryPanel items={context.certifiedMemory||[]}/>
          </div>
          <div aria-label="Intelligence Fabric">
            <IntelligenceFabricPanel
              projectId={projectId}
              role={role}
              setNotice={setNotice}
              setError={setError}
            />
          </div>
        </section>

        <div className="datanestAiCertificationStage" aria-label="Learning & Certification">
          <DataNestAiCertificationPanel
            projectId={projectId}
            role={role}
            onChanged={refreshContext}
            setNotice={setNotice}
            setError={setError}
          />
        </div>
      </div>
    </details>}

    <footer className="datanestAiFootnote">
      <small>
        Signed in as {currentUserEmail} · user {currentUserId.slice(0,8)} · role {role.toUpperCase()}.
      </small>
    </footer>
  </div>;
}
