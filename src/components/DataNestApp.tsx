"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import JobInviteForm from "@/components/JobInviteForm";
import ResonanceHome from "@/components/ResonanceHome";

type Project = { id:string; slug:string; name:string; description:string|null; status:string; created_at:string };
type Tool = { id:string; tool_key:string; name:string; role:string; enabled:boolean; config:Record<string,unknown> };
type Job = { id:string; job_number:number; title:string; description:string|null; priority:number; status:string; required_capabilities:string[]; acceptance:Record<string,unknown>; created_at:string; updated_at:string };
type Capability = { id:string; account_key:string; connector_kind:string; capability:string; state:string; observed_at:string|null; next_check_at:string|null; confidence:number|null; concurrency_limit:number; running:number; metadata:Record<string,unknown> };
type Run = { id:string; job_id:string; run_number:number; connector_kind:string; status:string; started_at:string; completed_at:string|null; error_category:string|null };
type Checkpoint = { id:string; job_id:string; completed:string[]; remaining:string[]; resume_instruction:string|null; created_at:string };
type AuditEvent = { id:number; job_id:string|null; event_type:string; actor:string; payload:Record<string,unknown>; created_at:string };
type Policy = { id:string; policy_key:string; value:Record<string,unknown> };
type ProjectMember = { project_id:string; user_id:string; role:"owner"|"admin"|"operator"|"viewer"; status:string };
type ViewKey = "overview"|"stakeholder"|"sparks"|"governance"|"thinktank"|"ai"|"productlab"|"unifi"|"scheduler"|"runs"|"checkpoints"|"audit"|"transparency"|"settings";
type HealthState = { state:"checking"|"online"|"degraded"|"offline"; checkedAt:string|null; message:string };
type Summary = { total:number; active:number; running:number; blocked:number; available:number; registered:number };
type ActiveDataNestAiSession = { jobId:string; sessionId:string|null };

const PAGE_SIZE = 20;
const finalStates = new Set(["COMPLETED","FAILED","CANCELLED"]);
const jobColumns = "id,job_number,title,description,priority,status,required_capabilities,acceptance,created_at,updated_at";

const nav:Array<{key:ViewKey;label:string;group:string;glyph:string}> = [
  {key:"overview",label:"AI & I",group:"Project",glyph:"◎"},
  {key:"stakeholder",label:"Stakeholder",group:"Project",glyph:"✦"},
  {key:"sparks",label:"Sparks",group:"Project",glyph:"✧"},
  {key:"governance",label:"Governance",group:"Project",glyph:"◆"},
  {key:"thinktank",label:"Think Tanks",group:"Research",glyph:"◈"},
  {key:"ai",label:"DataNest AI",group:"Research",glyph:"⌬"},
  {key:"productlab",label:"Product Lab",group:"Research",glyph:"▣"},
  {key:"unifi",label:"UNIFI Planner",group:"Tools",glyph:"◇"},
  {key:"scheduler",label:"TranScheduler",group:"Tools",glyph:"⌁"},
  {key:"runs",label:"Runs",group:"Operations",glyph:"▶"},
  {key:"checkpoints",label:"Checkpoints",group:"Continuity",glyph:"◆"},
  {key:"audit",label:"Audit",group:"Continuity",glyph:"≡"},
  {key:"transparency",label:"Transparency",group:"Continuity",glyph:"◎"},
  {key:"settings",label:"Settings",group:"System",glyph:"⚙"}
];

const viewKeys = new Set<ViewKey>(nav.map(item=>item.key));

const viewDescriptions:Record<ViewKey,string> = {
  overview:"Human intent and governed AI collaboration at a glance.",
  stakeholder:"Capture stakeholder input and review contribution context.",
  sparks:"Develop raw ideas into traceable project inputs.",
  governance:"Review sovereign governance controls and decisions.",
  thinktank:"Coordinate structured research and collaborative thinking.",
  ai:"Work with governed DataNest AI memory and project context.",
  productlab:"Test and review product surfaces before release.",
  unifi:"Plan complete, traceable Job Manifests before execution.",
  scheduler:"Route prepared work through capability-aware scheduling.",
  runs:"Review execution history and connector outcomes.",
  checkpoints:"Resume project work from durable continuation points.",
  audit:"Inspect immutable operational events and traceability.",
  transparency:"Review published audit methodology, evidence, and findings.",
  settings:"Manage project, tool, AI administration, and scheduler policy."
};

const StakeholderWorkspace = dynamic(() => import("@/components/StakeholderWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading stakeholder workspace…</p></section>
});

const SparksWorkspace = dynamic(() => import("@/components/SparksWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Sparks…</p></section>
});

const GovernanceWorkspace = dynamic(() => import("@/components/GovernanceWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Sovereign Governance…</p></section>
});

const ThinkTankWorkspace = dynamic(() => import("@/components/ThinkTankWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Think Tanks…</p></section>
});

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

const TransparencyWorkspace = dynamic(() => import("@/components/TransparencyWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Transparency…</p></section>
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
  const [viewReady,setViewReady]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [commandQuery,setCommandQuery]=useState("");
  const [commandActiveIndex,setCommandActiveIndex]=useState(-1);
  const commandInputRef=useRef<HTMLInputElement|null>(null);
  const commandReturnFocusRef=useRef<HTMLElement|null>(null);
  const [aiSidebarOpen,setAiSidebarOpen]=useState(false);
  const [companionReserve,setCompanionReserve]=useState(0);
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

  const commandItems=useMemo(()=>{
    const query=commandQuery.trim().toLowerCase();
    if(!query)return nav;
    return nav.filter(item=>{
      const haystack=[item.label,item.group,viewDescriptions[item.key]].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  },[commandQuery]);

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

    await Promise.all([
      supabase.rpc("accept_pending_project_member_invites_v1"),
      supabase.rpc("accept_pending_job_invites")
    ]);

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
    const syncViewFromUrl=()=>{
      const url=new URL(window.location.href);
      const requested=url.searchParams.get("view");
      const valid=requested&&viewKeys.has(requested as ViewKey);
      const next=valid ? requested as ViewKey : "overview";

      if(requested&&(!valid||requested==="overview")){
        url.searchParams.delete("view");
        window.history.replaceState(window.history.state,"",url.toString());
      }

      setView(next);
      setViewReady(true);
    };

    syncViewFromUrl();
    window.addEventListener("popstate",syncViewFromUrl);
    return()=>window.removeEventListener("popstate",syncViewFromUrl);
  },[]);
  useEffect(()=>{
    if(!viewReady)return;
    const url=new URL(window.location.href);
    const current=url.searchParams.get("view");
    const next=view==="overview" ? null : view;
    if(current===next)return;

    if(next)url.searchParams.set("view",next);
    else url.searchParams.delete("view");

    window.history.pushState(window.history.state,"",url.toString());
    window.scrollTo({top:0,left:0,behavior:"auto"});
  },[view,viewReady]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setMobileOpen(false);
    };
    window.addEventListener("keydown",closeOnEscape);
    return()=>window.removeEventListener("keydown",closeOnEscape);
  },[mobileOpen]);
  useEffect(()=>{
    const handleCommandShortcut=(event:KeyboardEvent)=>{
      const isQuickSwitch=(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k";
      if(isQuickSwitch){
        event.preventDefault();
        if(commandOpen)closeCommandPalette();
        else openCommandPalette();
        return;
      }
      if(event.key==="Escape"&&commandOpen)closeCommandPalette();
    };
    window.addEventListener("keydown",handleCommandShortcut);
    return()=>window.removeEventListener("keydown",handleCommandShortcut);
  },[commandOpen]);
  useEffect(()=>{
    if(!commandOpen)return;
    const timer=window.setTimeout(()=>commandInputRef.current?.focus(),0);
    return()=>window.clearTimeout(timer);
  },[commandOpen]);
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

  function openCommandPalette(){
    commandReturnFocusRef.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCommandQuery("");
    setCommandActiveIndex(-1);
    setCommandOpen(true);
    setMobileOpen(false);
  }

  function closeCommandPalette(){
    setCommandOpen(false);
    setCommandQuery("");
    setCommandActiveIndex(-1);
    window.setTimeout(()=>{
      commandReturnFocusRef.current?.focus();
      commandReturnFocusRef.current=null;
    },0);
  }

  function trapCommandFocus(event:import("react").KeyboardEvent<HTMLElement>){
    if(event.key!=="Tab")return;
    const focusable=Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
    )).filter(element=>!element.hasAttribute("hidden"));
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  }

  function handleCommandSearchKeyDown(event:import("react").KeyboardEvent<HTMLInputElement>){
    if(event.key==="ArrowDown"&&commandQuery.trim()&&commandItems.length){
      event.preventDefault();
      setCommandActiveIndex(index=>(index+1)%commandItems.length);
      return;
    }
    if(event.key==="ArrowUp"&&commandQuery.trim()&&commandItems.length){
      event.preventDefault();
      setCommandActiveIndex(index=>(index-1+commandItems.length)%commandItems.length);
      return;
    }
    if(event.key==="Enter"&&commandQuery.trim()&&commandItems[0]){
      event.preventDefault();
      if(commandActiveIndex>0&&commandItems[commandActiveIndex]){
        chooseCommandView(commandItems[commandActiveIndex].key);
      }else{
        chooseCommandView(commandItems[0].key);
      }
    }
  }

  function chooseCommandView(nextView:ViewKey){
    setView(nextView);
    closeCommandPalette();
    setMobileOpen(false);
  }

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
  const currentDescription=viewDescriptions[view];
  const groups=Array.from(new Set(nav.map(item=>item.group)));
  const healthLabel=health.state==="checking"
    ? "Checking control plane"
    : health.state==="online"
      ? "Control plane online"
      : health.state==="degraded"
        ? "Control plane degraded"
        : "Control plane offline";

  return <div
    className={"appFrame "+(aiSidebarOpen?"aiDockOpen ":"")+(companionReserve>0?"companionRailReserved":"")}
    style={companionReserve>0?({"--companion-reserve":companionReserve+"px"} as CSSProperties):undefined}
  >
    <aside id="datanest-navigation" aria-label="DataNest navigation" className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="sidebarTop">
        <div className="logo" aria-label="The Resonance App Dev"><img src="data:image/webp;base64,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" alt="The Resonance App Dev"/></div>
        <div><p className="eyebrow">RESONANCE</p><b>DataNest</b></div>
        <button className="closeMenu" onClick={()=>setMobileOpen(false)} aria-label="Close menu" aria-controls="datanest-navigation">×</button>
      </div>
      <div className="projectPill"><span className="liveDot"/><div><small>PROJECT</small><strong>{project?.name||"Resonance DataNest"}</strong></div></div>
      <nav className="navStack" aria-label="Project workspaces">
        {groups.map(group=><details className="navGroup navDisclosure" key={group+String(nav.some(item=>item.group===group&&item.key===view))} open={group==="Project"||nav.some(item=>item.group===group&&item.key===view)}>
          <summary>{group}</summary>
          {nav.filter(item=>item.group===group).map(item=><button
            key={item.key}
            className={view===item.key?"active":""}
            aria-label={item.label}
            aria-current={view===item.key?"page":undefined}
            onClick={()=>{setView(item.key);setMobileOpen(false);}}
          >
            <span aria-hidden="true">{item.glyph}</span>{item.label}
          </button>)}
        </details>)}
      </nav>
      <div className="sidebarFooter">
        <div className="userMini"><div className="avatar">{(session.user.email||"U").slice(0,1).toUpperCase()}</div><div><b>{session.user.email?.split("@")[0]||"Authorized user"}</b><small>{membership ? membership.role.toUpperCase()+" · Authenticated" : "Authenticated"}</small></div></div>
        <div className="mobileNavActions" aria-label="Mobile workspace actions">
          <div className={"mobileSystemStatus "+health.state} title={health.message}>
            <span className={"statusDot "+health.state}/>
            <span>{healthLabel}</span>
          </div>
          <button
            className="secondaryButton compact"
            type="button"
            disabled={!project}
            onClick={()=>project&&void Promise.all([loadSummary(project.id),loadRecentJobs(project.id),checkControlPlane(project.id)])}
          >Refresh workspace</button>
          <button
            className="secondaryButton compact"
            type="button"
            disabled={reloadingLatest}
            onClick={()=>void reloadLatestVersion()}
          >{reloadingLatest?"Reloading…":"Reload latest"}</button>
        </div>
        <button className="textButton" onClick={signOut}>Sign out</button>
      </div>
    </aside>
    {mobileOpen&&<button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}

    {commandOpen&&<div className="commandPaletteBackdrop" onMouseDown={closeCommandPalette}>
      <section
        className="commandPalette"
        role="dialog"
        aria-modal="true"
        aria-label="Quick switch DataNest workspace"
        onMouseDown={event=>event.stopPropagation()}
        onKeyDown={trapCommandFocus}
      >
        <div className="commandPaletteHeader">
          <div><p className="eyebrow">QUICK SWITCH</p><h2>Go to a DataNest workspace</h2></div>
          <button className="iconButton" type="button" onClick={closeCommandPalette} aria-label="Close quick switch">×</button>
        </div>
        <label className="commandSearch">
          <span className="srOnly">Search DataNest workspaces</span>
          <input
            ref={commandInputRef}
            type="search"
            value={commandQuery}
            onChange={event=>{
              const nextQuery=event.target.value;
              setCommandQuery(nextQuery);
              setCommandActiveIndex(nextQuery.trim()?0:-1);
            }}
            onKeyDown={handleCommandSearchKeyDown}
            placeholder="Search workspaces, tools, research…"
            aria-label="Search DataNest workspaces"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="commandResults" role="listbox" aria-label="DataNest workspaces">
          {commandItems.map((item,index)=><button
            className={"commandResult "+((commandActiveIndex===index||view===item.key)?"active":"")}
            type="button"
            role="option"
            aria-selected={commandActiveIndex===index}
            key={item.key}
            onClick={()=>chooseCommandView(item.key)}
          >
            <span className="commandGlyph" aria-hidden="true">{item.glyph}</span>
            <span className="commandResultCopy"><b>{item.label}</b><small>{item.group+" · "+viewDescriptions[item.key]}</small></span>
            {view===item.key?<span className="commandCurrent">Current</span>:<span className="workspaceArrow" aria-hidden="true">→</span>}
          </button>)}
          {!commandItems.length&&<div className="commandEmpty">No DataNest workspace matches “{commandQuery}”.</div>}
        </div>
        <div className="commandPaletteFooter"><span>Ctrl/Cmd + K to toggle</span><span>Tab to move · Enter to open</span></div>
      </section>
    </div>}

    <main className="mainPane">
      <header className="topbar">
        <button className="menuButton" onClick={()=>setMobileOpen(true)} aria-label="Open menu" aria-controls="datanest-navigation" aria-expanded={mobileOpen}>☰</button>
        <div className="topbarTitle"><p className="eyebrow">RESONANCE DATANEST</p><h1>{currentLabel}</h1><p className="topbarContext">{currentDescription}</p></div>
        <div className="topActions">
          <button
            className="secondaryButton compact quickSwitchButton"
            type="button"
            onClick={openCommandPalette}
            aria-haspopup="dialog"
            aria-expanded={commandOpen}
            aria-keyshortcuts="Control+K Meta+K"
            title="Search and switch DataNest workspaces (Ctrl/Cmd + K)"
          >Quick switch <kbd className="shortcutHint">Ctrl K</kbd></button>
          <button
            className={"secondaryButton compact aiSidebarToggle "+(aiSidebarOpen?"active":"")}
            onClick={()=>setAiSidebarOpen(value=>{
              const next=!value;
              if(!next)setCompanionReserve(0);
              return next;
            })}
            aria-pressed={aiSidebarOpen}
          >{aiSidebarOpen?"Hide AI":"AI assistant"}</button>
          <details className="workspaceOptions" onKeyDown={event=>{
            if(event.key==="Escape"){
              event.currentTarget.open=false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}>
            <summary className="secondaryButton compact">Options</summary>
            <div className="workspaceOptionsMenu">
          <button
            className="secondaryButton compact releaseAction"
            type="button"
            disabled={reloadingLatest}
            onClick={()=>void reloadLatestVersion()}
            title="Fetch the latest release manifest and reopen DataNest with a cache-busting release URL."
          >{reloadingLatest?"Reloading…":"Reload latest"}</button>
          <button className="secondaryButton compact refreshAction" onClick={()=>project&&void Promise.all([loadSummary(project.id),loadRecentJobs(project.id),checkControlPlane(project.id)])}>Refresh</button>
          <div className={"systemStatus "+health.state} title={health.message}>
            <span className={"statusDot "+health.state}/>
            <span>{healthLabel}<small>{health.checkedAt ? " · "+formatDate(health.checkedAt) : ""}</small></span>
          </div>
            </div>
          </details>
        </div>
      </header>

      <div className="contentPane">
        <div aria-live="polite">
          {notice&&<div className="notice goodNotice">{notice}</div>}
          {error&&<div className="notice errorNotice" role="alert">{error}</div>}
        </div>
        {(loadingCore||loadingView)&&<div className="loadingBar" aria-label="Loading DataNest data"><span/></div>}

        {!loadingCore&&project&&view==="overview"&&<ResonanceHome project={project} jobs={recentJobs} counts={summary} canOperate={canOperate} onNavigate={setView}/>}
        {!loadingCore&&project&&view==="stakeholder"&&<StakeholderWorkspace projectId={project.id} currentUserId={session.user.id} canReview={canManageAi}/>}
        {!loadingCore&&project&&view==="sparks"&&<SparksWorkspace projectId={project.id} currentUserId={session.user.id} canOperate={canOperate} canManage={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="governance"&&<GovernanceWorkspace projectId={project.id} currentUserId={session.user.id} canManage={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="thinktank"&&<ThinkTankWorkspace projectId={project.id} currentUserId={session.user.id} currentUserEmail={session.user.email||"Authenticated user"} role={membership?.role||"viewer"} canOperate={canOperate} canReview={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="ai"&&<DataNestAiWorkspace projectId={project.id} currentUserId={session.user.id} currentUserEmail={session.user.email||"Authenticated user"} role={membership?.role||"viewer"} canOperate={canOperate} openScheduler={()=>setView("scheduler")} setNotice={setNotice} setError={setError} onActiveSessionChange={setActiveDataNestAiSession}/>}
        {!loadingCore&&project&&view==="productlab"&&<ProductLab projectId={project.id} currentUserId={session.user.id} canOperate={canOperate}/>}
        {!loadingCore&&project&&view==="unifi"&&<UnifiPlanner project={project} jobs={jobs} capabilities={capabilities} reload={async()=>{await loadJobsPage(jobPage);await loadSummary(project.id);await loadRecentJobs(project.id);}} setNotice={setNotice} setError={setError} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage}/>}
        {!loadingCore&&view==="scheduler"&&<Scheduler jobs={jobs} capabilities={capabilities} onStatus={updateJobStatus} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage}/>}
        {!loadingCore&&view==="runs"&&<Runs runs={runs} jobLookup={jobLookup} page={runPage} total={runCount} onPage={setRunPage}/>}
        {!loadingCore&&view==="checkpoints"&&<Checkpoints checkpoints={checkpoints} jobLookup={jobLookup} page={checkpointPage} total={checkpointCount} onPage={setCheckpointPage}/>}
        {!loadingCore&&view==="audit"&&<Audit events={events} jobLookup={jobLookup} page={eventPage} total={eventCount} onPage={setEventPage}/>}
        {!loadingCore&&view==="transparency"&&<TransparencyWorkspace/>}
        {!loadingCore&&view==="settings"&&<Settings project={project} tools={tools} policies={policies} membership={membership} currentUserId={session.user.id} canManageAi={canManageAi}/>} 
      </div>
    </main>

    {!loadingCore&&project&&aiSidebarOpen&&<ExternalAiSidebar
      projectId={project.id}
      currentUserEmail={session.user.email||"Authenticated user"}
      activeDataNestAiSession={activeDataNestAiSession}
      onClose={()=>{setAiSidebarOpen(false);setCompanionReserve(0);}}
      onNotice={setNotice}
      onError={setError}
      onCompanionReserve={setCompanionReserve}
    />}
  </div>;
}

function Overview({project,tools,jobs,counts,setView,canOperate}:{project:Project;tools:Tool[];jobs:Job[];counts:Summary;setView:(v:ViewKey)=>void;canOperate:boolean}) {
  const workspaces:Array<{key:ViewKey;label:string;description:string;glyph:string}> = [
    {key:"ai",label:"DataNest AI",description:"Governed project memory and AI collaboration.",glyph:"⌬"},
    {key:"unifi",label:"UNIFI Planner",description:"Prepare complete, traceable Job Manifests.",glyph:"◇"},
    {key:"scheduler",label:"TranScheduler",description:"Route work through capability-aware scheduling.",glyph:"⌁"},
    {key:"stakeholder",label:"Stakeholder",description:"Capture and review stakeholder contributions.",glyph:"✦"},
    {key:"sparks",label:"Sparks",description:"Develop early ideas into project inputs.",glyph:"✧"},
    {key:"governance",label:"Governance",description:"Review controls, decisions, and accountability.",glyph:"◆"},
    {key:"thinktank",label:"Think Tanks",description:"Coordinate structured collaborative research.",glyph:"◈"},
    {key:"productlab",label:"Product Lab",description:"Review and test product surfaces before release.",glyph:"▣"},
    {key:"transparency",label:"Transparency",description:"Inspect audit evidence, methodology, and findings.",glyph:"◎"}
  ];

  return <>
    <section className="heroPanel">
      <div className="heroCopy">
        <p className="eyebrow">PROJECT COMMAND CENTER</p>
        <h2>{project.name}</h2>
        <p>{project.description}</p>
        <div className="heroActions">
          <button className="primaryButton compact" disabled={!canOperate} onClick={()=>setView("unifi")}>{canOperate ? "Create UNIFI job" : "Viewer mode"}</button>
          <button className="secondaryButton compact" onClick={()=>setView("ai")}>Open DataNest AI</button>
          <button className="secondaryButton compact" onClick={()=>setView("scheduler")}>Open TranScheduler</button>
        </div>
      </div>

    </section>

    <section className="metricGrid" aria-label="Project work summary">
      <Metric label="Total jobs" value={counts.total} note="Project work units"/>
      <Metric label="Active work" value={counts.active} note="Not in a final state"/>
      <Metric label="Running" value={counts.running} note="Executing now"/>
      <Metric label="Blocked" value={counts.blocked} note="Needs dependency or action"/>
    </section>

    <details className="workspaceSection quietDisclosure" aria-labelledby="workspace-heading">
      <summary id="workspace-heading">Browse all workspaces</summary>
      <div className="workspaceGrid">
        {workspaces.map(item=><button className="workspaceCard" type="button" key={item.key} onClick={()=>setView(item.key)}>
          <span className="workspaceGlyph" aria-hidden="true">{item.glyph}</span>
          <span><b>{item.label}</b><small>{item.description}</small></span>
          <span className="workspaceArrow" aria-hidden="true">→</span>
        </button>)}
      </div>
    </details>

    <details className="panel quietDisclosure">
      <summary>Operating tools</summary>
      <div className="toolGrid">
        {tools.map(tool=><article className="toolCard" key={tool.id}><div className="toolIcon">{tool.tool_key==="unifi"?"◇":"⌁"}</div><div><div className="rowBetween"><h4>{tool.name}</h4><Badge value={tool.enabled?"ACTIVE":"DISABLED"}/></div><p>{tool.role}</p></div></article>)}
      </div>
    </details>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">RECENT WORK</p><h3>Latest jobs</h3></div><button className="textButton" onClick={()=>setView("scheduler")}>Open queue</button></div>
      <JobTable jobs={jobs}/>
    </section>
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
  const filterOptions=["ALL","PLANNED","READY","QUEUED","RUNNING","MANUAL_ACTION","BLOCKED","COMPLETED"];
  const visible=filter==="ALL"?jobs:jobs.filter(item=>item.status===filter);
  return <>
    <section className="schedulerHero"><div><p className="eyebrow">TRANSCHEDULER</p><h2>Capability-aware execution queue</h2><p>Dependencies, availability, concurrency, policy and human controls determine when work may execute.</p></div><div className="schedulerPulse"><span>{capabilities.filter(item=>item.state==="AVAILABLE").length}</span><small>available resources</small></div></section>
    <section className="panel">
      <label className="schedulerFilterMobile">Status filter
        <select aria-label="Status filter" value={filter} onChange={event=>setFilter(event.target.value)}>
          {filterOptions.map(item=><option key={item} value={item}>{item.replace("_"," ")}</option>)}
        </select>
      </label>
      <div className="filterBar schedulerFilterDesktop">{filterOptions.map(item=><button key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item.replace("_"," ")}</button>)}</div>
      <div className="schedulerTable"><div className="schedulerRow headerRow"><span>Job</span><span>Priority</span><span>Capability</span><span>Status</span><span>Controls</span></div>
        {visible.map(job=><div className="schedulerRow" key={job.id}>
          <div data-label="Job"><b>{jobCode(job)}</b><small>{job.title}</small></div>
          <span data-label="Priority">{"P"+job.priority}</span>
          <span data-label="Capability">{job.required_capabilities?.join(", ")||"chat"}</span>
          <span data-label="Status"><Badge value={job.status}/></span>
          <div className="rowActions" data-label="Controls">
            {canOperate ? <>
              {!finalStates.has(job.status)&&job.status!=="PAUSED"&&<button onClick={()=>void onStatus(job,"PAUSED")}>Pause</button>}
              {job.status==="PAUSED"&&<button onClick={()=>void onStatus(job,"READY")}>Resume</button>}
              {!finalStates.has(job.status)&&<button onClick={()=>void onStatus(job,"CANCELLED")}>Cancel</button>}
            </> : <span className="muted">Read only</span>}
          </div>
        </div>)}
      </div>
      <Pagination page={page} total={total} onPage={onPage}/>
    </section>
  </>;
}

function Runs({runs,jobLookup,page,total,onPage}:{runs:Run[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void}) {
  return <section className="panel"><div className="panelHead"><div><p className="eyebrow">EXECUTION HISTORY</p><h2>Runs</h2></div><span className="countPill">{total}</span></div>
    {runs.length?<div className="dataTable"><div className="dataRow headerRow"><span>Run</span><span>Job</span><span>Connector</span><span>Status</span><span>Started</span></div>
      {runs.map(run=>{const job=jobLookup.get(run.job_id);return <div className="dataRow" key={run.id}>
        <b data-label="Run">{"RUN-"+run.run_number}</b>
        <span data-label="Job">{job?jobCode(job):run.job_id.slice(0,8)}</span>
        <span data-label="Connector">{run.connector_kind}</span>
        <span data-label="Status"><Badge value={run.status}/></span>
        <span data-label="Started">{formatDate(run.started_at)}</span>
      </div>;})}
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
    <div className="panel"><p className="eyebrow">PROJECT</p><h3>{project?.name||"Resonance DataNest"}</h3><dl className="settingsList"><div><dt>Slug</dt><dd>{project?.slug||"resonance-datanest"}</dd></div><div><dt>Status</dt><dd><Badge value={project?.status||"ACTIVE"}/></dd></div><div><dt>Access role</dt><dd><Badge value={(membership?.role||"viewer").toUpperCase()}/></dd></div><div><dt>GitHub</dt><dd>DataNest-Supository/DataNest</dd></div><div><dt>Supabase</dt><dd>sgqdmfgjbprsoqsmgigi</dd></div><div><dt>Hosting</dt><dd>Provider-agnostic</dd></div><div><dt>Production host</dt><dd>GitHub Pages</dd></div></dl></div>
    <div className="panel"><p className="eyebrow">TOOLS</p><h3>Tool registry</h3>{tools.map(tool=><div className="settingRow" key={tool.id}><div><b>{tool.name}</b><small>{tool.role}</small></div><Badge value={tool.enabled?"ACTIVE":"DISABLED"}/></div>)}</div>
    {project&&<div className="fullWidth" aria-label="AI Administration">
      <AiOperationsDashboard projectId={project.id} currentUserId={currentUserId} canManageAi={canManageAi}/>
    </div>}
    <div className="panel fullWidth"><p className="eyebrow">SCHEDULER</p><h3>Policies</h3><div className="policyGrid">{policies.map(policy=><article key={policy.id}><b>{policy.policy_key}</b><pre>{JSON.stringify(policy.value,null,2)}</pre></article>)}</div></div>
  </section>;
}

function JobTable({jobs}:{jobs:Job[]}) {
  return <div className="jobTable">{jobs.map(job=><div className="jobTableRow" key={job.id}>
    <b data-label="Job">{jobCode(job)}</b>
    <div data-label="Title"><strong>{job.title}</strong><small>{formatDate(job.created_at)}</small></div>
    <span data-label="Priority">{"P"+job.priority}</span>
    <span data-label="Capability">{job.required_capabilities?.join(", ")||"chat"}</span>
    <span data-label="Status"><Badge value={job.status}/></span>
  </div>)}{!jobs.length&&<EmptyState title="No jobs yet" text="Use UNIFI to create the first Job Manifest."/>}</div>;
}

function Pagination({page,total,onPage}:{page:number;total:number;onPage:(p:number)=>void}) {
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(total<=PAGE_SIZE) return null;
  return <div className="pageControls" aria-label="Pagination"><button disabled={page===0} onClick={()=>onPage(Math.max(0,page-1))}>Previous</button><span>{"Page "+(page+1)+" of "+pages}</span><button disabled={page+1>=pages} onClick={()=>onPage(page+1)}>Next</button></div>;
}

function Badge({value}:{value:string}) { return <span className={"badge "+tone(value)}>{value.replaceAll("_"," ")}</span>; }
function EmptyState({title,text}:{title:string;text:string}) { return <div className="emptyState"><div>◇</div><h3>{title}</h3><p>{text}</p></div>; }
