"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import DataNestAiChatPanel,{type DataNestAiEvent} from "@/components/DataNestAiChatPanel";
import DataNestAiMemoryPanel,{type CertifiedMemoryItem} from "@/components/DataNestAiMemoryPanel";
import DataNestAiCertificationPanel from "@/components/DataNestAiCertificationPanel";
import JobInviteForm from "@/components/JobInviteForm";

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
  onActiveSessionChange:(session:{jobId:string;sessionId:string|null}|null)=>void;
};

const jobColumns="id,job_number,title,description,priority,status,required_capabilities,created_at,updated_at";

function jobCode(job:Job){
  return "JOB-"+String(job.job_number).padStart(5,"0");
}

function formatDate(value:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"
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
  onActiveSessionChange
}:Props){
  const [jobs,setJobs]=useState<Job[]>([]);
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
  },[projectId]);

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
    onActiveSessionChange(
      selectedJobId?{jobId:selectedJobId,sessionId:sessionId||null}:null
    );
  },[selectedJobId,sessionId,onActiveSessionChange]);

  useEffect(()=>()=>onActiveSessionChange(null),[onActiveSessionChange]);

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
        <h3>The governed intelligence core for <strong>everything DataNest knows.</strong></h3>
        <p>
          {selectedJob?.description||"Bring human intent, AI Companion evidence and certified project memory into one governed development workspace."}
        </p>

        <div className="datanestAiHeroStatus" aria-label="DataNest AI system status">
          <div>
            <span className={"datanestAiStatusPulse "+(loading?"syncing":contextReady?"online":"")} aria-hidden="true"/>
            <small>Context</small>
            <b role="status">{contextStatus}</b>
          </div>
          <div>
            <small>Certified memory</small>
            <b>{context?.certifiedMemory?.length||0} ITEMS</b>
          </div>
          <div>
            <small>Active context</small>
            <b>{selectedJob?jobCode(selectedJob):"STANDBY"}</b>
          </div>
        </div>

        <div className="datanestAiCapabilityRail" aria-label="DataNest AI capabilities">
          <span><i aria-hidden="true">▰</i>Project context</span>
          <span><i aria-hidden="true">&lt;/&gt;</i>Development tools</span>
          <span><i aria-hidden="true">◇</i>AI collaboration</span>
          <span><i aria-hidden="true">◫</i>Persistent memory</span>
        </div>

        <div className="datanestAiHeroActions">
          <button
            className="primaryButton datanestAiHeroPrimary"
            type="button"
            disabled={!selectedJob}
            onClick={()=>{
              const chat=document.getElementById("datanest-ai-chat");
              const input=chat?.querySelector<HTMLTextAreaElement>(".datanestAiComposer textarea")||null;
              const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motionPaused==="true";
              chat?.scrollIntoView({behavior:reduceMotion?"instant":"smooth",block:"start"});
              input?.focus({preventScroll:true});
            }}
          >Start development chat <span aria-hidden="true">→</span></button>
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
      <section className="panel" aria-label="Choose active Job">
        <label>Active Job context
          <select value={selectedJobId} onChange={event=>selectJob(event.target.value)}>
            {jobs.map(job=><option key={job.id} value={job.id}>{jobCode(job)+" · "+job.title}</option>)}
          </select>
        </label>
        <small className="muted">Choose the Job before composing a command. Drafts stay with their Job.</small>
      </section>
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

      <section className="datanestAiContextRail" aria-label="Active DataNest AI context">
        <section className="panel datanestAiCurrentJob">
          <div className="rowBetween">
            <div>
              <p className="eyebrow">Current Job Context</p>
              <h2>{jobCode(selectedJob)+" · "+selectedJob.title}</h2>
            </div>
            <span className="badge live">{selectedJob.status.replaceAll("_"," ")}</span>
          </div>
          <p className="muted">{selectedJob.description||"No description supplied."}</p>
          <div className="manifestMeta">
            <span>{"Priority "+selectedJob.priority}</span>
            <span>{selectedJob.required_capabilities?.join(", ")||"chat"}</span>
            <span>{"Updated "+formatDate(selectedJob.updated_at)}</span>
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
          </div>
        </section>

        <section className="datanestAiJobStrip" aria-label="Switch DataNest AI Job Context">
          {jobs.map(job=><button
            key={job.id}
            className={"rndJobChip "+(job.id===selectedJobId?"active":"")}
            aria-pressed={job.id===selectedJobId}
            onClick={()=>selectJob(job.id)}
          >
            <span>{jobCode(job)}</span>
            <b>{job.title}</b>
            <small>{job.status+" · P"+job.priority}</small>
          </button>)}
        </section>
      </section>

      {context&&<>
        <section className="datanestAiSupportGrid">
          <div aria-label="Certified Memory">
            <DataNestAiMemoryPanel items={context.certifiedMemory||[]}/>
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
      </>}
    </>}
    <footer className="datanestAiFootnote">
      <small>
        Signed in as {currentUserEmail} · user {currentUserId.slice(0,8)} · role {role.toUpperCase()}.
      </small>
    </footer>
  </div>;
}
