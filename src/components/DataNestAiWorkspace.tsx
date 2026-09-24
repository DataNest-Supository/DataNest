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
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"
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
  const [loading,setLoading]=useState(true);
  const selectedJobIdRef=useRef("");

  const selectedJob=useMemo(
    ()=>jobs.find(job=>job.id===selectedJobId)||null,
    [jobs,selectedJobId]
  );

  const loadJobs=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    const {data,error}=await supabase
      .from("jobs")
      .select(jobColumns)
      .eq("project_id",projectId)
      .order("updated_at",{ascending:false})
      .limit(50);
    if(error){setError(error.message);return;}
    const next=(data||[]) as Job[];
    setJobs(next);
    setSelectedJobId(current=>{
      const nextId=current&&next.some(job=>job.id===current)
        ?current
        :next[0]?.id||"";
      selectedJobIdRef.current=nextId;
      return nextId;
    });
  },[projectId,setError]);

  const refreshContext=useCallback(async()=>{
    if(!selectedJobId)return;
    const requestedJobId=selectedJobId;
    const supabase=getSupabase();
    if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.functions.invoke("datanest-ai-chat",{
      body:{action:"context",jobId:requestedJobId,sessionId:sessionId||null}
    });
    if(selectedJobIdRef.current!==requestedJobId)return;
    setLoading(false);
    if(error){setError(error.message);return;}
    const payload=data as ContextResponse;
    if(payload.job?.id!==requestedJobId)return;
    setContext(payload);
    if(payload.sessionId)setSessionId(payload.sessionId);
  },[selectedJobId,sessionId,setError]);

  useEffect(()=>{void loadJobs()},[loadJobs]);

  useEffect(()=>{
    onActiveSessionChange(
      selectedJobId?{jobId:selectedJobId,sessionId:sessionId||null}:null
    );
  },[selectedJobId,sessionId,onActiveSessionChange]);

  useEffect(()=>()=>onActiveSessionChange(null),[onActiveSessionChange]);

  useEffect(()=>{
    if(!selectedJobId)return;
    setSessionId("");
    setContext(null);
    window.dispatchEvent(new CustomEvent("datanest:job-selected",{
      detail:{jobId:selectedJobId}
    }));
  },[selectedJobId]);

  useEffect(()=>{
    if(!selectedJobId)return;
    void refreshContext();
  },[selectedJobId,refreshContext]);

  useEffect(()=>{
    const refreshStaged=(event:Event)=>{
      const detail=(event as CustomEvent<{jobId?:string}>).detail;
      if(detail?.jobId===selectedJobId)void refreshContext();
    };
    window.addEventListener("datanest:external-ai-staged",refreshStaged);
    return()=>window.removeEventListener("datanest:external-ai-staged",refreshStaged);
  },[selectedJobId,refreshContext]);

  async function refreshAll(){
    await loadJobs();
    await refreshContext();
  }

  if(!jobs.length&&!loading){
    return <section className="panel">
      <p className="eyebrow">DATANEST AI</p>
      <h2>No accessible Job Manifests</h2>
      <p className="muted">Create a Job Manifest in UNIFI Planner or ask an operator to invite you to a Job.</p>
    </section>;
  }

  return <div className="datanestAiWorkspace">
    <section className="datanestAiHero">
      <div>
        <p className="eyebrow">DATANEST AI</p>
        <h2>Chat → Trace → Learn → Validate → Certify → Remember</h2>
        <p>
          DataNest AI uses certified project memory plus UNCERTIFIED evidence from the selected Job/session. Raw evidence remains isolated from project-wide memory until certification.
        </p>
      </div>
      <div className="rndHeroActions">
        <button className="secondaryButton compact" onClick={()=>void refreshAll()}>Refresh DataNest AI</button>
        <button className="secondaryButton compact" onClick={openScheduler}>Open TranScheduler</button>
      </div>
    </section>

    <section className="datanestAiJobStrip" aria-label="DataNest AI Job Manifests">
      {jobs.map(job=><button
        key={job.id}
        className={"rndJobChip "+(job.id===selectedJobId?"active":"")}
        onClick={()=>{selectedJobIdRef.current=job.id;setSelectedJobId(job.id)}}
      >
        <span>{jobCode(job)}</span>
        <b>{job.title}</b>
        <small>{job.status+" · P"+job.priority}</small>
      </button>)}
    </section>

    {selectedJob&&<section className="panel datanestAiCurrentJob">
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
        <button className="secondaryButton compact" onClick={()=>void refreshContext()}>Refresh context</button>
      </div>
    </section>}

    {loading&&!context?<div className="loadingBar"><span/></div>:selectedJob&&context&&<>
      <section className="datanestAiPrimaryGrid">
        <DataNestAiChatPanel
          jobId={selectedJob.id}
          jobCode={jobCode(selectedJob)}
          sessionId={sessionId}
          events={context.events||[]}
          onSessionChange={setSessionId}
          onContextRefresh={refreshContext}
          setNotice={setNotice}
          setError={setError}
        />
        <div aria-label="Certified Memory"><DataNestAiMemoryPanel items={context.certifiedMemory||[]}/></div>
      </section>

      <div aria-label="Learning & Certification"><DataNestAiCertificationPanel
        projectId={projectId}
        role={role}
        onChanged={refreshContext}
        setNotice={setNotice}
        setError={setError}
      /></div>
    </>}
    <footer className="datanestAiFootnote">
      <small>
        Signed in as {currentUserEmail} · user {currentUserId.slice(0,8)} · role {role.toUpperCase()}.
      </small>
    </footer>
  </div>;
}
