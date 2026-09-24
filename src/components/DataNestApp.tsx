"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import JobInviteForm from "@/components/JobInviteForm";

type Project = { id:string; slug:string; name:string; description:string|null; status:string; created_at:string };
type Tool = { id:string; tool_key:string; name:string; role:string; enabled:boolean; config:Record<string,unknown> };
type Job = { id:string; job_number:number; title:string; description:string|null; priority:number; status:string; required_capabilities:string[]; acceptance:Record<string,unknown>; created_at:string; updated_at:string };
type Capability = { id:string; account_key:string; connector_kind:string; capability:string; state:string; observed_at:string|null; next_check_at:string|null; confidence:number|null; concurrency_limit:number; running:number; metadata:Record<string,unknown> };
type Run = { id:string; job_id:string; run_number:number; connector_kind:string; status:string; started_at:string; completed_at:string|null; error_category:string|null };
type Checkpoint = { id:string; job_id:string; completed:string[]; remaining:string[]; resume_instruction:string|null; created_at:string };
type AuditEvent = { id:number; job_id:string|null; event_type:string; actor:string; payload:Record<string,unknown>; created_at:string };
type Policy = { id:string; policy_key:string; value:Record<string,unknown> };
type ProjectMember = { project_id:string; user_id:string; role:"owner"|"admin"|"operator"|"viewer"; status:string };
type ViewKey = "overview"|"ai"|"productlab"|"unifi"|"scheduler"|"capabilities"|"runs"|"checkpoints"|"audit"|"settings";
type HealthState = { state:"checking"|"online"|"degraded"|"offline"; checkedAt:string|null; message:string };
type Summary = { total:number; active:number; running:number; blocked:number; available:number; registered:number };
type ActiveDataNestAiSession = { jobId:string; sessionId:string|null };

const PAGE_SIZE = 20;
const finalStates = new Set(["COMPLETED","FAILED","CANCELLED"]);
const jobColumns = "id,job_number,title,description,priority,status,required_capabilities,acceptance,created_at,updated_at";

const nav:Array<{key:ViewKey;label:string;group:string;glyph:string}> = [
  {key:"overview",label:"Overview",group:"Project",glyph:"◫"},
  {key:"ai",label:"DataNest AI",group:"Research",glyph:"⌬"},
  {key:"productlab",label:"Product Lab",group:"Research",glyph:"▣"},
  {key:"unifi",label:"UNIFI Planner",group:"Tools",glyph:"◇"},
  {key:"scheduler",label:"TranScheduler",group:"Tools",glyph:"⌁"},
  {key:"capabilities",label:"Capabilities",group:"Operations",glyph:"◎"},
  {key:"runs",label:"Runs",group:"Operations",glyph:"▶"},
  {key:"checkpoints",label:"Checkpoints",group:"Continuity",glyph:"◆"},
  {key:"audit",label:"Audit",group:"Continuity",glyph:"≡"},
  {key:"settings",label:"Settings",group:"System",glyph:"⚙"}
];

const DataNestAiWorkspace = dynamic(() => import("@/components/DataNestAiWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading DataNest AI…</p></section>
});

const AiOperationsDashboard = dynamic(() => import("@/components/AiOperationsDashboard"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading AI administration…</p></section>
});

const ProductLab = dynamic(() => import("@/components/ProductLab"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Product Lab…</p></section>
});

const ExternalAiSidebar = dynamic(() => import("@/components/ExternalAiSidebar"), {
  ssr: false
});

function formatDate(value:string|null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function jobCode(job:Job) { return "JOB-" + String(job.job_number).padStart(5,"0"); }
function tone(value:string) {
  const v=value.toLowerCase();
  if (["available","completed","active","owner","admin","operator"].includes(v)) return "good";
  if (["failed","cancelled","exhausted","offline","disabled"].includes(v)) return "bad";
  if (["running","reserved","matching","queued","ready"].includes(v)) return "live";
  if (["manual_action","blocked","blocked_dependency","cooldown","retry_wait","viewer"].includes(v)) return "warn";
  return "neutral";
}
function pageRange(page:number) {
  const from = page * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

export default function DataNestApp({session}:{session:Session}) {
  const [view,setView]=useState<ViewKey>("overview");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [aiSidebarOpen,setAiSidebarOpen]=useState(false);
  const [activeDataNestAiSession,setActiveDataNestAiSession]=useState<ActiveDataNestAiSession|null>(null);
  const [project,setProject]=useState<Project|null>(null);
  const [membership,setMembership]=useState<ProjectMember|null>(null);
  const [tools,setTools]=useState<Tool[]>([]);
  const [capabilities,setCapabilities]=useState<Capability[]>([]);
  const [recentJobs,setRecentJobs]=useState<Job[]>([]);
  const [jobs,setJobs]=useState<Job[]>([]);
  const [runs,setRuns]=useState<Run[]>([]);
  const [checkpoints,setCheckpoints]=useState<Checkpoint[]>([]);
  const [events,setEvents]=useState<AuditEvent[]>([]);
  const [policies,setPolicies]=useState<Policy[]>([]);
  const [summary,setSummary]=useState<Summary>({total:0,active:0,running:0,blocked:0,available:0,registered:0});
  const [jobCount,setJobCount]=useState(0);
  const [runCount,setRunCount]=useState(0);
  const [checkpointCount,setCheckpointCount]=useState(0);
  const [eventCount,setEventCount]=useState(0);
  const [jobPage,setJobPage]=useState(0);
  const [runPage,setRunPage]=useState(0);
  const [checkpointPage,setCheckpointPage]=useState(0);
  const [eventPage,setEventPage]=useState(0);
  const [loadingCore,setLoadingCore]=useState(true);
  const [loadingView,setLoadingView]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [health,setHealth]=useState<HealthState>({state:"checking",checkedAt:null,message:"Checking control plane…"});
  const [reloadingLatest,setReloadingLatest]=useState(false);

  const canOperate=membership ? ["owner","admin","operator"].includes(membership.role) : false;
  const canManageAi=membership ? ["owner","admin"].includes(membership.role) : false;

  const loadSummary=useCallback(async(projectId:string)=>{
    const supabase=getSupabase();
    if(!supabase) return;
    const {data,error:summaryError}=await supabase.rpc("get_project_dashboard_summary",{target_project:projectId});
    if(summaryError) return;
    const value=(data||{}) as Record<string,unknown>;
    setSummary({
      total:Number(value.total_jobs||0),
      active:Number(value.active_jobs||0),
      running:Number(value.running_jobs||0),
      blocked:Number(value.blocked_jobs||0),
      available:Number(value.available_capabilities||0),
      registered:Number(value.registered_capabilities||0)
    });
  },[]);

  const loadRecentJobs=useCallback(async(projectId:string)=>{
    const supabase=getSupabase();
    if(!supabase) return;
    const {data}=await supabase.from("jobs").select(jobColumns).eq("project_id",projectId).order("created_at",{ascending:false}).limit(5);
    setRecentJobs((data||[]) as Job[]);
  },[]);

  const checkControlPlane=useCallback(async(projectId:string)=>{
    const supabase=getSupabase();
    if(!supabase) return;
    setHealth(current=>({...current,state:"checking",message:"Checking control plane…"}));
    try {
      const query=supabase
        .from("projects")
        .select("id,status")
        .eq("id",projectId)
        .maybeSingle();

      const result=await Promise.race([
        query,
        new Promise<never>((_,reject)=>{
          window.setTimeout(()=>reject(new Error("Control plane check timed out.")),5000);
        })
      ]);

      if(result.error) throw result.error;
      const checkedAt=new Date().toISOString();
      if(!result.data) setHealth({state:"degraded",checkedAt,message:"Project data is not currently visible."});
      else setHealth({state:"online",checkedAt,message:"Supabase control plane responded."});
    } catch (healthError) {
      setHealth({
        state:"offline",
        checkedAt:new Date().toISOString(),
        message:healthError instanceof Error ? healthError.message : "Control plane check failed."
      });
    }
  },[]);

  const loadCore=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingCore(true);
    setError("");

    await supabase.rpc("accept_pending_job_invites");

    const pResult=await supabase
      .from("projects")
      .select("id,slug,name,description,status,created_at")
      .eq("slug","resonance-datanest")
      .maybeSingle();

    if(pResult.error || !pResult.data) {
      setError(pResult.error?.message || "You do not have access to Resonance DataNest.");
      setLoadingCore(false);
      return;
    }

    const p=pResult.data as Project;
    setProject(p);

    const [memberResult,toolResult,capabilityResult]=await Promise.all([
      supabase.from("project_members").select("project_id,user_id,role,status").eq("project_id",p.id).eq("user_id",session.user.id).maybeSingle(),
      supabase.from("tool_registry").select("id,tool_key,name,role,enabled,config").eq("project_id",p.id).order("name"),
      supabase.from("capabilities").select("id,account_key,connector_kind,capability,state,observed_at,next_check_at,confidence,concurrency_limit,running,metadata").eq("project_id",p.id).order("account_key")
    ]);

    const firstError=memberResult.error||toolResult.error||capabilityResult.error;
    if(firstError) setError(firstError.message);
    else {
      setMembership((memberResult.data||null) as ProjectMember|null);
      setTools((toolResult.data||[]) as Tool[]);
      setCapabilities((capabilityResult.data||[]) as Capability[]);
    }

    await Promise.all([loadSummary(p.id),loadRecentJobs(p.id),checkControlPlane(p.id)]);
    setLoadingCore(false);
  },[session.user.id,loadSummary,loadRecentJobs,checkControlPlane]);

  const loadJobsPage=useCallback(async(page:number)=>{
    if(!project) return;
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingView(true);
    const {from,to}=pageRange(page);
    const {data,count,error:queryError}=await supabase
      .from("jobs")
      .select(jobColumns,{count:"exact"})
      .eq("project_id",project.id)
      .order("priority",{ascending:false})
      .order("created_at",{ascending:false})
      .range(from,to);
    if(queryError) setError(queryError.message);
    else {
      setJobs((data||[]) as Job[]);
      setJobCount(count||0);
    }
    setLoadingView(false);
  },[project]);

  const loadRunsPage=useCallback(async(page:number)=>{
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingView(true);
    const {from,to}=pageRange(page);
    const {data,count,error:queryError}=await supabase
      .from("runs")
      .select("id,job_id,run_number,connector_kind,status,started_at,completed_at,error_category",{count:"exact"})
      .order("started_at",{ascending:false})
      .range(from,to);
    if(queryError) setError(queryError.message);
    else { setRuns((data||[]) as Run[]); setRunCount(count||0); }
    setLoadingView(false);
  },[]);

  const loadCheckpointsPage=useCallback(async(page:number)=>{
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingView(true);
    const {from,to}=pageRange(page);
    const {data,count,error:queryError}=await supabase
      .from("checkpoints")
      .select("id,job_id,completed,remaining,resume_instruction,created_at",{count:"exact"})
      .order("created_at",{ascending:false})
      .range(from,to);
    if(queryError) setError(queryError.message);
    else { setCheckpoints((data||[]) as Checkpoint[]); setCheckpointCount(count||0); }
    setLoadingView(false);
  },[]);

  const loadEventsPage=useCallback(async(page:number)=>{
    if(!project) return;
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingView(true);
    const {from,to}=pageRange(page);
    const {data,count,error:queryError}=await supabase
      .from("events")
      .select("id,job_id,event_type,actor,payload,created_at",{count:"exact"})
      .eq("project_id",project.id)
      .order("created_at",{ascending:false})
      .range(from,to);
    if(queryError) setError(queryError.message);
    else { setEvents((data||[]) as AuditEvent[]); setEventCount(count||0); }
    setLoadingView(false);
  },[project]);

  const loadPolicies=useCallback(async()=>{
    if(!project) return;
    const supabase=getSupabase();
    if(!supabase) return;
    setLoadingView(true);
    const {data,error:queryError}=await supabase
      .from("scheduler_policies")
      .select("id,policy_key,value")
      .eq("project_id",project.id)
      .order("policy_key");
    if(queryError) setError(queryError.message);
    else setPolicies((data||[]) as Policy[]);
    setLoadingView(false);
  },[project]);

  useEffect(()=>{ void loadCore(); },[loadCore]);
  useEffect(()=>{
    const saved=window.localStorage.getItem("datanest.aiSidebar.open");
    if(saved==="true")setAiSidebarOpen(true);
    const open=()=>setAiSidebarOpen(true);
    window.addEventListener("datanest:open-ai-sidebar",open);
    return()=>window.removeEventListener("datanest:open-ai-sidebar",open);
  },[]);
  useEffect(()=>{
    window.localStorage.setItem("datanest.aiSidebar.open",String(aiSidebarOpen));
  },[aiSidebarOpen]);
  useEffect(()=>{
    if(!project) return;
    if(view==="unifi"||view==="scheduler") void loadJobsPage(jobPage);
  },[view,jobPage,project,loadJobsPage]);
  useEffect(()=>{ if(view==="runs") void loadRunsPage(runPage); },[view,runPage,loadRunsPage]);
  useEffect(()=>{ if(view==="checkpoints") void loadCheckpointsPage(checkpointPage); },[view,checkpointPage,loadCheckpointsPage]);
  useEffect(()=>{ if(view==="audit") void loadEventsPage(eventPage); },[view,eventPage,loadEventsPage]);
  useEffect(()=>{ if(view==="settings") void loadPolicies(); },[view,loadPolicies]);
  useEffect(()=>{
    if(!project) return;
    const timer=window.setInterval(()=>void checkControlPlane(project.id),60000);
    return ()=>window.clearInterval(timer);
  },[project,checkControlPlane]);

  async function signOut(){ await getSupabase()?.auth.signOut(); }

  async function reloadLatestVersion(){
    if(reloadingLatest)return;
    setReloadingLatest(true);
    setError("");
    setNotice("Checking the latest deployed DataNest release…");

    const now=Date.now();
    let releaseKey=String(now);

    try{
      const manifestUrl=new URL("./release-manifest.json",window.location.href);
      manifestUrl.searchParams.set("_reload",String(now));
      const response=await fetch(manifestUrl.toString(),{
        cache:"no-store",
        headers:{"Cache-Control":"no-cache"}
      });

      if(response.ok){
        const manifest=(await response.json()) as {frontendCommit?:string;databaseRelease?:string};
        if(manifest.frontendCommit){
          releaseKey=manifest.frontendCommit.slice(0,16);
        }
      }
    }catch{
      // The timestamped navigation below still forces a fresh document request.
    }

    const nextUrl=new URL(window.location.href);
    nextUrl.searchParams.set("release",releaseKey);
    nextUrl.searchParams.set("_reload",String(now));
    nextUrl.hash="";
    window.location.replace(nextUrl.toString());
  }

  async function updateJobStatus(job:Job,status:string) {
    const supabase=getSupabase();
    if(!supabase||!project) return;
    if(!canOperate){setError("Your DataNest role is read-only.");return;}

    setNotice("");
    setError("");

    const {data,error:updateError}=await supabase.rpc("transition_job_status",{
      target_job:job.id,
      target_status:status
    });

    if(updateError){setError(updateError.message);return;}

    const row=Array.isArray(data)?data[0]:data;
    const nextStatus=String((row as Record<string,unknown>|null)?.status||status);
    setJobs(current=>current.map(item=>item.id===job.id?{...item,status:nextStatus,updated_at:new Date().toISOString()}:item));
    setRecentJobs(current=>current.map(item=>item.id===job.id?{...item,status:nextStatus,updated_at:new Date().toISOString()}:item));
    setNotice(jobCode(job)+" moved to "+nextStatus+".");
    await Promise.all([loadSummary(project.id),loadRecentJobs(project.id),checkControlPlane(project.id)]);
  }

  const jobLookup=useMemo(()=>new Map([...recentJobs,...jobs].map(job=>[job.id,job])),[recentJobs,jobs]);
  const currentLabel=nav.find(item=>item.key===view)?.label||"Overview";
  const groups=Array.from(new Set(nav.map(item=>item.group)));
  const healthLabel=health.state==="checking"
    ? "Checking control plane"
    : health.state==="online"
      ? "Control plane online"
      : health.state==="degraded"
        ? "Control plane degraded"
        : "Control plane offline";

  return <div className={"appFrame "+(aiSidebarOpen?"aiDockOpen":"")}>
    <aside className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="sidebarTop">
        <div className="logo">RD</div>
        <div><p className="eyebrow">RESONANCE</p><b>DataNest</b></div>
        <button className="closeMenu" onClick={()=>setMobileOpen(false)} aria-label="Close menu">×</button>
      </div>
      <div className="projectPill"><span className="liveDot"/><div><small>PROJECT</small><strong>{project?.name||"Resonance DataNest"}</strong></div></div>
      <nav className="navStack">
        {groups.map(group=><div className="navGroup" key={group}>
          <p>{group}</p>
          {nav.filter(item=>item.group===group).map(item=><button
            key={item.key}
            className={view===item.key?"active":""}
            aria-label={item.label}
            onClick={()=>{setView(item.key);setMobileOpen(false);}}
          >
            <span aria-hidden="true">{item.glyph}</span>{item.label}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebarFooter">
        <div className="userMini"><div className="avatar">{(session.user.email||"U").slice(0,1).toUpperCase()}</div><div><b>{session.user.email?.split("@")[0]||"Authorized user"}</b><small>{membership ? membership.role.toUpperCase()+" · Authenticated" : "Authenticated"}</small></div></div>
        <button className="textButton" onClick={signOut}>Sign out</button>
      </div>
    </aside>
    {mobileOpen&&<button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}

    <main className="mainPane">
      <header className="topbar">
        <button className="menuButton" onClick={()=>setMobileOpen(true)} aria-label="Open menu">☰</button>
        <div><p className="eyebrow">RESONANCE DATANEST</p><h1>{currentLabel}</h1></div>
        <div className="topActions">
          <button
            className={"secondaryButton compact aiSidebarToggle "+(aiSidebarOpen?"active":"")}
            onClick={()=>setAiSidebarOpen(value=>!value)}
            aria-pressed={aiSidebarOpen}
          >{aiSidebarOpen?"Hide AI Sidebar":"AI Sidebar"}</button>
          <button
            className="secondaryButton compact"
            type="button"
            disabled={reloadingLatest}
            onClick={()=>void reloadLatestVersion()}
            title="Fetch the latest release manifest and reopen DataNest with a cache-busting release URL."
          >{reloadingLatest?"Reloading…":"Reload latest"}</button>
          <button className="secondaryButton compact" onClick={()=>project&&void Promise.all([loadSummary(project.id),loadRecentJobs(project.id),checkControlPlane(project.id)])}>Refresh</button>
          <div className={"systemStatus "+health.state} title={health.message}>
            <span className={"statusDot "+health.state}/>
            <span>{healthLabel}<small>{health.checkedAt ? " · "+formatDate(health.checkedAt) : ""}</small></span>
          </div>
        </div>
      </header>

      <div className="contentPane">
        <div aria-live="polite">
          {notice&&<div className="notice goodNotice">{notice}</div>}
          {error&&<div className="notice errorNotice" role="alert">{error}</div>}
        </div>
        {(loadingCore||loadingView)&&<div className="loadingBar" aria-label="Loading DataNest data"><span/></div>}

        {!loadingCore&&project&&view==="overview"&&<Overview project={project} tools={tools} jobs={recentJobs} capabilities={capabilities} counts={summary} setView={setView} canOperate={canOperate}/>}\n        {!loadingCore&&project&&view==="ai"&&<DataNestAiWorkspace projectId={project.id} currentUserId={session.user.id} currentUserEmail={session.user.email||"Authenticated user"} role={membership?.role||"viewer"} canOperate={canOperate} openScheduler={()=>setView("scheduler")} setNotice={setNotice} setError={setError} onActiveSessionChange={setActiveDataNestAiSession}/>}\n        {!loadingCore&&project&&view==="productlab"&&<ProductLab projectId={project.id} currentUserId={session.user.id} canOperate={canOperate}/>}
        {!loadingCore&&project&&view==="unifi"&&<UnifiPlanner project={project} jobs={jobs} capabilities={capabilities} reload={async()=>{await loadJobsPage(jobPage);await loadSummary(project.id);await loadRecentJobs(project.id);}} setNotice={setNotice} setError={setError} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage}/>}
        {!loadingCore&&view==="scheduler"&&<Scheduler jobs={jobs} capabilities={capabilities} onStatus={updateJobStatus} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage}/>}
        {!loadingCore&&view==="capabilities"&&<Capabilities capabilities={capabilities}/>}
        {!loadingCore&&view==="runs"&&<Runs runs={runs} jobLookup={jobLookup} page={runPage} total={runCount} onPage={setRunPage}/>}
        {!loadingCore&&view==="checkpoints"&&<Checkpoints checkpoints={checkpoints} jobLookup={jobLookup} page={checkpointPage} total={checkpointCount} onPage={setCheckpointPage}/>}
        {!loadingCore&&view==="audit"&&<Audit events={events} jobLookup={jobLookup} page={eventPage} total={eventCount} onPage={setEventPage}/>}
        {!loadingCore&&view==="settings"&&<Settings project={project} tools={tools} policies={policies} membership={membership} currentUserId={session.user.id} canManageAi={canManageAi}/>} 
      </div>
    </main>

    {!loadingCore&&project&&aiSidebarOpen&&<ExternalAiSidebar
      projectId={project.id}
      currentUserEmail={session.user.email||"Authenticated user"}
      activeDataNestAiSession={activeDataNestAiSession}
      onClose={()=>setAiSidebarOpen(false)}
      onNotice={setNotice}
      onError={setError}
    />}
  </div>;
}

function Overview({project,tools,jobs,capabilities,counts,setView,canOperate}:{project:Project;tools:Tool[];jobs:Job[];capabilities:Capability[];counts:Summary;setView:(v:ViewKey)=>void;canOperate:boolean}) {
  return <>
    <section className="heroPanel">
      <div><p className="eyebrow">PROJECT OPERATING ENVIRONMENT</p><h2>{project.name}</h2><p>{project.description}</p><div className="heroActions"><button className="primaryButton compact" disabled={!canOperate} onClick={()=>setView("unifi")}>{canOperate ? "Create UNIFI job" : "Viewer mode"}</button><button className="secondaryButton compact" onClick={()=>setView("ai")}>Open DataNest AI</button><button className="secondaryButton compact" onClick={()=>setView("productlab")}>Open Product Lab</button><button className="secondaryButton compact" onClick={()=>setView("scheduler")}>Open TranScheduler</button></div></div>
      <div className="stackDiagram"><div>GitHub <b>DataNest</b></div><span>↓</span><div>App Runtime <b>Provider-agnostic</b></div><span>↓</span><div>Supabase <b>Control Plane</b></div></div>
    </section>
    <section className="metricGrid">
      <Metric label="Total jobs" value={counts.total} note="Project work units"/>
      <Metric label="Active work" value={counts.active} note="Not in a final state"/>
      <Metric label="Running" value={counts.running} note="Executing now"/>
      <Metric label="Blocked" value={counts.blocked} note="Needs dependency or action"/>
      <Metric label="Available capabilities" value={counts.available} note={String(counts.registered)+" registered"}/>
    </section>
    <section className="twoCol">
      <div className="panel"><div className="panelHead"><div><p className="eyebrow">TOOLS</p><h3>Operating tools</h3></div></div><div className="toolGrid">
        {tools.map(tool=><article className="toolCard" key={tool.id}><div className="toolIcon">{tool.tool_key==="unifi"?"◇":"⌁"}</div><div><div className="rowBetween"><h4>{tool.name}</h4><Badge value={tool.enabled?"ACTIVE":"DISABLED"}/></div><p>{tool.role}</p></div></article>)}
      </div></div>
      <div className="panel"><div className="panelHead"><div><p className="eyebrow">CAPACITY</p><h3>Execution resources</h3></div><button className="textButton" onClick={()=>setView("capabilities")}>View all</button></div><div className="capMiniList">
        {capabilities.map(capability=><div className="capMini" key={capability.id}><div><b>{capability.account_key}</b><small>{capability.connector_kind+" · "+capability.capability}</small></div><Badge value={capability.state}/></div>)}
      </div></div>
    </section>
    <section className="panel"><div className="panelHead"><div><p className="eyebrow">RECENT WORK</p><h3>Latest jobs</h3></div><button className="textButton" onClick={()=>setView("scheduler")}>Open queue</button></div><JobTable jobs={jobs}/></section>
  </>;
}

function Metric({label,value,note}:{label:string;value:number;note:string}) {
  return <article className="metricCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function UnifiPlanner({project,jobs,capabilities,reload,setNotice,setError,canOperate,page,total,onPage}:{project:Project;jobs:Job[];capabilities:Capability[];reload:()=>Promise<void>;setNotice:(v:string)=>void;setError:(v:string)=>void;canOperate:boolean;page:number;total:number;onPage:(p:number)=>void}) {
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [priority,setPriority]=useState(50);
  const [capability,setCapability]=useState("chat");
  const [tests,setTests]=useState(true);
  const [artifact,setArtifact]=useState(true);
  const [saving,setSaving]=useState(false);
  const known=Array.from(new Set(["chat",...capabilities.map(item=>item.capability)]));

  async function createJob(event:FormEvent) {
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!title.trim()) return;
    if(!canOperate){setError("Your DataNest role is read-only.");return;}

    setSaving(true);
    setNotice("");
    setError("");

    try {
      const {data,error}=await supabase.rpc("create_job_manifest",{
        target_project:project.id,
        job_title:title.trim(),
        job_description:description.trim()||null,
        job_priority:priority,
        required_capability:capability,
        tests_required:tests,
        artifact_required:artifact
      });
      if(error) throw error;
      const row=Array.isArray(data)?data[0]:data;
      const number=(row as Record<string,unknown>|null)?.job_number;
      setTitle("");setDescription("");setPriority(50);setCapability("chat");
      setNotice("JOB-"+String(number||"?").padStart(5,"0")+" created transactionally by UNIFI.");
      await reload();
    } catch(createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create the UNIFI job.");
    } finally {
      setSaving(false);
    }
  }

  const prepared=jobs.filter(item=>["PLANNED","READY","QUEUED"].includes(item.status));
  return <section className="splitView">
    <div className="panel stickyPanel"><p className="eyebrow">UNIFI</p><h2>Job Manifest Planner</h2><p className="muted">Prepare work completely before consuming scarce execution capacity.</p>
      {!canOperate&&<div className="notice errorNotice">Viewer access is read-only. Ask a DataNest owner or admin for operator access to create jobs.</div>}
      <form className="plannerForm" onSubmit={createJob} aria-busy={saving}>
        <label>Job title<input value={title} onChange={event=>setTitle(event.target.value)} required placeholder="e.g. Validate production deployment"/></label>
        <label>Objective / context<textarea value={description} onChange={event=>setDescription(event.target.value)} rows={6} placeholder="What must be done, constraints, expected output…"/></label>
        <div className="fieldRow">
          <label>Priority<select value={priority} onChange={event=>setPriority(Number(event.target.value))}><option value={100}>100 · Critical</option><option value={80}>80 · High</option><option value={50}>50 · Normal</option><option value={20}>20 · Background</option><option value={5}>5 · Maintenance</option></select></label>
          <label>Required capability<select value={capability} onChange={event=>setCapability(event.target.value)}>{known.map(item=><option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="checkRow"><label><input type="checkbox" checked={tests} onChange={event=>setTests(event.target.checked)}/> Tests required</label><label><input type="checkbox" checked={artifact} onChange={event=>setArtifact(event.target.checked)}/> Artifact required</label></div>
        <button className="primaryButton" disabled={saving||!canOperate}>{saving?"Creating…":"Create Job Manifest"}</button>
      </form>
    </div>
    <div className="panel"><div className="panelHead"><div><p className="eyebrow">PLANNING</p><h3>Prepared jobs</h3></div><span className="countPill">{total+" total"}</span></div><div className="manifestList">
      {prepared.map(job=><article className="manifestCard" key={job.id}><div className="rowBetween"><b>{jobCode(job)}</b><Badge value={job.status}/></div><h4>{job.title}</h4><p>{job.description||"No description supplied."}</p><div className="manifestMeta"><span>{"Priority "+job.priority}</span><span>{job.required_capabilities?.join(", ")||"chat"}</span><span>{formatDate(job.created_at)}</span></div><JobInviteForm jobId={job.id} canInvite={canOperate} compact onSent={setNotice}/></article>)}
      {!prepared.length&&<EmptyState title="No prepared jobs on this page" text="Create a job or navigate to another queue page."/>}
    </div><Pagination page={page} total={total} onPage={onPage}/></div>
  </section>;
}

function Scheduler({jobs,capabilities,onStatus,canOperate,page,total,onPage}:{jobs:Job[];capabilities:Capability[];onStatus:(j:Job,s:string)=>Promise<void>;canOperate:boolean;page:number;total:number;onPage:(p:number)=>void}) {
  const [filter,setFilter]=useState("ALL");
  const visible=filter==="ALL"?jobs:jobs.filter(item=>item.status===filter);
  return <>
    <section className="schedulerHero"><div><p className="eyebrow">TRANSCHEDULER</p><h2>Capability-aware execution queue</h2><p>Dependencies, availability, concurrency, policy and human controls determine when work may execute.</p></div><div className="schedulerPulse"><span>{capabilities.filter(item=>item.state==="AVAILABLE").length}</span><small>available resources</small></div></section>
    <section className="panel"><div className="filterBar">{["ALL","PLANNED","READY","QUEUED","RUNNING","MANUAL_ACTION","BLOCKED","COMPLETED"].map(item=><button key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item.replace("_"," ")}</button>)}</div>
      <div className="schedulerTable"><div className="schedulerRow headerRow"><span>Job</span><span>Priority</span><span>Capability</span><span>Status</span><span>Controls</span></div>
        {visible.map(job=><div className="schedulerRow" key={job.id}><div><b>{jobCode(job)}</b><small>{job.title}</small></div><span>{"P"+job.priority}</span><span>{job.required_capabilities?.join(", ")||"chat"}</span><Badge value={job.status}/><div className="rowActions">
          {canOperate ? <>
            {!finalStates.has(job.status)&&job.status!=="PAUSED"&&<button onClick={()=>void onStatus(job,"PAUSED")}>Pause</button>}
            {job.status==="PAUSED"&&<button onClick={()=>void onStatus(job,"READY")}>Resume</button>}
            {!finalStates.has(job.status)&&<button onClick={()=>void onStatus(job,"CANCELLED")}>Cancel</button>}
          </> : <span className="muted">Read only</span>}
        </div></div>)}
      </div>
      <Pagination page={page} total={total} onPage={onPage}/>
    </section>
  </>;
}

function Capabilities({capabilities}:{capabilities:Capability[]}) {
  return <><section className="sectionIntro"><p className="eyebrow">EXECUTION REGISTRY</p><h2>Capabilities</h2><p>UNKNOWN is deliberately ineligible for execution. A capability must be observed as AVAILABLE before TranScheduler can route work to it.</p></section>
    <section className="cardGrid">{capabilities.map(capability=><article className="capabilityCard" key={capability.id}><div className="rowBetween"><div className="connectorIcon">{capability.connector_kind.slice(0,2).toUpperCase()}</div><Badge value={capability.state}/></div><h3>{capability.account_key}</h3><p>{capability.connector_kind+" · "+capability.capability}</p><dl><div><dt>Concurrency</dt><dd>{capability.running+"/"+capability.concurrency_limit}</dd></div><div><dt>Confidence</dt><dd>{capability.confidence==null?"—":String(Math.round(capability.confidence*100))+"%"}</dd></div><div><dt>Observed</dt><dd>{formatDate(capability.observed_at)}</dd></div></dl></article>)}</section>
  </>;
}

function Runs({runs,jobLookup,page,total,onPage}:{runs:Run[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void}) {
  return <section className="panel"><div className="panelHead"><div><p className="eyebrow">EXECUTION HISTORY</p><h2>Runs</h2></div><span className="countPill">{total}</span></div>
    {runs.length?<div className="dataTable"><div className="dataRow headerRow"><span>Run</span><span>Job</span><span>Connector</span><span>Status</span><span>Started</span></div>
      {runs.map(run=>{const job=jobLookup.get(run.job_id);return <div className="dataRow" key={run.id}><b>{"RUN-"+run.run_number}</b><span>{job?jobCode(job):run.job_id.slice(0,8)}</span><span>{run.connector_kind}</span><Badge value={run.status}/><span>{formatDate(run.started_at)}</span></div>;})}
    </div>:<EmptyState title="No execution runs yet" text="Runs will appear when TranScheduler dispatches jobs."/>}
    <Pagination page={page} total={total} onPage={onPage}/>
  </section>;
}

function Checkpoints({checkpoints,jobLookup,page,total,onPage}:{checkpoints:Checkpoint[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void}) {
  return <><section className="checkpointGrid">{checkpoints.map(checkpoint=>{const job=jobLookup.get(checkpoint.job_id);return <article className="checkpointCard" key={checkpoint.id}><div className="rowBetween"><div><p className="eyebrow">CHECKPOINT</p><h3>{job?jobCode(job):checkpoint.job_id.slice(0,8)}</h3></div><small>{formatDate(checkpoint.created_at)}</small></div><h4>{job?.title||"Project continuation"}</h4><div className="checkpointColumns"><div><b>Completed</b>{checkpoint.completed?.map(item=><span key={item}>{"✓ "+item}</span>)}</div><div><b>Remaining</b>{checkpoint.remaining?.map(item=><span key={item}>{"→ "+item}</span>)}</div></div>{checkpoint.resume_instruction&&<div className="resumeBox"><b>Resume</b>{checkpoint.resume_instruction}</div>}</article>;})}</section><Pagination page={page} total={total} onPage={onPage}/></>;
}

function Audit({events,jobLookup,page,total,onPage}:{events:AuditEvent[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void}) {
  return <section className="panel"><div className="panelHead"><div><p className="eyebrow">IMMUTABLE HISTORY</p><h2>Audit trail</h2></div><span className="countPill">{total}</span></div><div className="timeline">
    {events.map(event=><div className="timelineItem" key={event.id}><div className="timelineDot"/><div><div className="rowBetween"><b>{event.event_type.replaceAll("_"," ")}</b><small>{formatDate(event.created_at)}</small></div><p>{(event.job_id&&jobLookup.get(event.job_id)?jobCode(jobLookup.get(event.job_id)!)+" · ":"")+event.actor}</p><code>{JSON.stringify(event.payload)}</code></div></div>)}
  </div><Pagination page={page} total={total} onPage={onPage}/></section>;
}

function Settings({
  project,tools,policies,membership,currentUserId,canManageAi
}:{
  project:Project|null;
  tools:Tool[];
  policies:Policy[];
  membership:ProjectMember|null;
  currentUserId:string;
  canManageAi:boolean;
}) {
  return <section className="settingsGrid">
    <div className="panel"><p className="eyebrow">PROJECT</p><h3>{project?.name||"Resonance DataNest"}</h3><dl className="settingsList"><div><dt>Slug</dt><dd>{project?.slug||"resonance-datanest"}</dd></div><div><dt>Status</dt><dd><Badge value={project?.status||"ACTIVE"}/></dd></div><div><dt>Access role</dt><dd><Badge value={(membership?.role||"viewer").toUpperCase()}/></dd></div><div><dt>GitHub</dt><dd>DataNest-Supository/DataNest</dd></div><div><dt>Supabase</dt><dd>sgqdmfgjbprsoqsmgigi</dd></div><div><dt>Hosting</dt><dd>Provider-agnostic</dd></div><div><dt>Optional host</dt><dd>Vercel</dd></div></dl></div>
    <div className="panel"><p className="eyebrow">TOOLS</p><h3>Tool registry</h3>{tools.map(tool=><div className="settingRow" key={tool.id}><div><b>{tool.name}</b><small>{tool.role}</small></div><Badge value={tool.enabled?"ACTIVE":"DISABLED"}/></div>)}</div>
    {project&&<div className="fullWidth" aria-label="AI Administration">
      <AiOperationsDashboard projectId={project.id} currentUserId={currentUserId} canManageAi={canManageAi}/>
    </div>}
    <div className="panel fullWidth"><p className="eyebrow">SCHEDULER</p><h3>Policies</h3><div className="policyGrid">{policies.map(policy=><article key={policy.id}><b>{policy.policy_key}</b><pre>{JSON.stringify(policy.value,null,2)}</pre></article>)}</div></div>
  </section>;
}

function JobTable({jobs}:{jobs:Job[]}) {
  return <div className="jobTable">{jobs.map(job=><div className="jobTableRow" key={job.id}><b>{jobCode(job)}</b><div><strong>{job.title}</strong><small>{formatDate(job.created_at)}</small></div><span>{"P"+job.priority}</span><span>{job.required_capabilities?.join(", ")||"chat"}</span><Badge value={job.status}/></div>)}{!jobs.length&&<EmptyState title="No jobs yet" text="Use UNIFI to create the first Job Manifest."/>}</div>;
}

function Pagination({page,total,onPage}:{page:number;total:number;onPage:(p:number)=>void}) {
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(total<=PAGE_SIZE) return null;
  return <div className="pageControls" aria-label="Pagination"><button disabled={page===0} onClick={()=>onPage(Math.max(0,page-1))}>Previous</button><span>{"Page "+(page+1)+" of "+pages}</span><button disabled={page+1>=pages} onClick={()=>onPage(page+1)}>Next</button></div>;
}

function Badge({value}:{value:string}) { return <span className={"badge "+tone(value)}>{value.replaceAll("_"," ")}</span>; }
function EmptyState({title,text}:{title:string;text:string}) { return <div className="emptyState"><div>◇</div><h3>{title}</h3><p>{text}</p></div>; }
