"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { DATANEST_LOGO_SRC } from "@/lib/brand";
import { workflowPhaseForView, workflowPhases } from "@/lib/workflowPhases";
import JobInviteForm from "@/components/JobInviteForm";
import ResonanceHome from "@/components/ResonanceHome";
import MotionControl from "@/components/MotionControl";

type Project = { id:string; slug:string; name:string; description:string|null; status:string; created_at:string };
type Tool = { id:string; tool_key:string; name:string; role:string; enabled:boolean; config:Record<string,unknown> };
type Job = { id:string; job_number:number; title:string; description:string|null; priority:number; status:string; required_capabilities:string[]; acceptance:Record<string,unknown>; created_at:string; updated_at:string; deadline:string|null };
type Capability = { id:string; account_key:string; connector_kind:string; capability:string; state:string; observed_at:string|null; next_check_at:string|null; confidence:number|null; concurrency_limit:number; running:number; metadata:Record<string,unknown> };
type Run = { id:string; job_id:string; run_number:number; connector_kind:string; status:string; started_at:string; completed_at:string|null; error_category:string|null };
type Checkpoint = { id:string; job_id:string; completed:string[]; remaining:string[]; resume_instruction:string|null; created_at:string };
type AuditEvent = { id:number; job_id:string|null; event_type:string; actor:string; payload:Record<string,unknown>; created_at:string };
type Policy = { id:string; policy_key:string; value:Record<string,unknown> };
type ProjectMember = { project_id:string; user_id:string; role:"owner"|"admin"|"operator"|"viewer"; status:string };
type ViewKey = "overview"|"stakeholder"|"sparks"|"governance"|"products"|"thinktank"|"ai"|"productlab"|"unifi"|"scheduler"|"runs"|"checkpoints"|"audit"|"transparency"|"settings";
type HealthState = { state:"checking"|"online"|"degraded"|"offline"; checkedAt:string|null; message:string };
type Summary = { total:number; active:number; running:number; blocked:number; available:number; registered:number };
type ActiveDataNestAiSession = { jobId:string; sessionId:string|null };

const PAGE_SIZE = 20;
const finalStates = new Set(["COMPLETED","FAILED","CANCELLED"]);
const jobColumns = "id,job_number,title,description,priority,status,required_capabilities,acceptance,created_at,updated_at,deadline";

const nav:Array<{key:ViewKey;label:string;group:string;glyph:string}> = [
  {key:"overview",label:"AI & I",group:"Core",glyph:"◎"},
  {key:"ai",label:"DataNest AI",group:"Core",glyph:"✦"},
  {key:"stakeholder",label:"Stakeholder",group:"Discover",glyph:"◌"},
  {key:"sparks",label:"Sparks",group:"Discover",glyph:"✧"},
  {key:"thinktank",label:"Think Tanks",group:"Discover",glyph:"◈"},
  {key:"governance",label:"Governance",group:"Govern & Build",glyph:"◆"},
  {key:"products",label:"Products",group:"Govern & Build",glyph:"◉"},
  {key:"productlab",label:"Product Lab",group:"Govern & Build",glyph:"▣"},
  {key:"unifi",label:"UNIFI Planner",group:"Execute",glyph:"◇"},
  {key:"scheduler",label:"TranScheduler",group:"Execute",glyph:"⌁"},
  {key:"runs",label:"Runs",group:"Execute",glyph:"▶"},
  {key:"checkpoints",label:"Checkpoints",group:"Verify",glyph:"↺"},
  {key:"audit",label:"Audit",group:"Verify",glyph:"≡"},
  {key:"transparency",label:"Transparency",group:"Verify",glyph:"◎"},
  {key:"settings",label:"Settings",group:"System",glyph:"⚙"}
];

const viewKeys = new Set<ViewKey>(nav.map(item=>item.key));

const viewDescriptions:Record<ViewKey,string> = {
  overview:"Human intent and governed AI collaboration at a glance.",
  stakeholder:"Capture stakeholder input and review contribution context.",
  sparks:"Develop raw ideas into traceable project inputs.",
  governance:"Review sovereign governance controls and decisions.",
  products:"Inspect governed Resonance products, their architecture, controls, evidence, risks and promotion branches.",
  thinktank:"Coordinate structured research and collaborative thinking.",
  ai:"Work with governed DataNest AI memory and project context.",
  productlab:"Test and review product surfaces before release.",
  unifi:"Plan complete, traceable Job Manifests before execution.",
  scheduler:"Manage project work in queue or Gantt chart context with live capability-aware scheduling.",
  runs:"Review execution history and connector outcomes.",
  checkpoints:"Resume project work from durable continuation points.",
  audit:"Inspect immutable operational events and traceability.",
  transparency:"Review published audit methodology, evidence, and findings.",
  settings:"Manage project, tool, AI administration, and scheduler policy."
};

type WorkspaceTaskGuide = { start:string; complete:string; evidence:string };

const workspaceTaskGuides:Partial<Record<ViewKey,WorkspaceTaskGuide>> = {
  ai:{start:"Select the Job Manifest that owns the work, then continue in the development chat.",complete:"The Job has an actionable AI output or durable memory worth certifying.",evidence:"Job-scoped session, event trail and certified memory."},
  stakeholder:{start:"Review stakeholder state and recent contribution events before changing preferences or review decisions.",complete:"Contribution context and participation preferences reflect the stakeholder's current intent.",evidence:"Profile state, contribution events and review signals."},
  sparks:{start:"Capture or inspect the idea or approved utility exchange that should become project input.",complete:"The contribution or service is recorded with enough context to move into structured thinking.",evidence:"Traceable contribution, ledger and service records."},
  thinktank:{start:"Choose a Think Tank, open a thread, then discuss, ask or propose a governed decision.",complete:"The discussion has produced a decision, action item or reviewed learning candidate.",evidence:"Messages, decisions, actions and institutional-memory candidates."},
  governance:{start:"Begin with a protocol draft or formal proposal; ratify only after the required support and vote.",complete:"The decision is recorded, ratified where applicable, or moved into a visible dispute path.",evidence:"Proposal, votes, decision register, protocol version and dispute history."},
  products:{start:"Choose the governed product and inspect its architecture, controls, evidence and risks before promotion.",complete:"The product state or promotion branch is supported by current evidence.",evidence:"Product architecture, linked controls, evidence and promotion history."},
  productlab:{start:"Select or register an immutable product surface before creating and running test cases.",complete:"Validation results are tied to the exact test-case version and product build.",evidence:"Versioned test runs, build identity and optional evidence links."},
  unifi:{start:"Describe the outcome, acceptance conditions and required capabilities in one complete Job Manifest.",complete:"The Job is ready for governed scheduling without hidden execution assumptions.",evidence:"Job Manifest, acceptance criteria, capabilities, priority and deadline."},
  scheduler:{start:"Review queue state and capability constraints, then move the right Job into execution.",complete:"The Job is running, intentionally queued, or visibly blocked with a reason.",evidence:"Job status, capability match and scheduling state."},
  runs:{start:"Open the run that belongs to the Job you are investigating and read its outcome before retrying work.",complete:"The connector outcome, timing and failure category are understood.",evidence:"Run number, connector, timestamps, status and error category."},
  checkpoints:{start:"Locate the most recent durable checkpoint for the Job before resuming work.",complete:"Completed work, remaining work and the resume instruction are unambiguous.",evidence:"Checkpoint snapshot with completed, remaining and resume fields."},
  audit:{start:"Read the event trail around the Job, decision or operation you need to explain.",complete:"You can reconstruct who did what, when, and with which payload.",evidence:"Immutable event type, actor, payload and timestamp."},
  transparency:{start:"Review the published audit library and findings before drawing conclusions about system state.",complete:"The finding, supporting evidence and reported backlog are traceable to published artifacts.",evidence:"Commit-pinned audit documents, findings and backlog records."},
  settings:{start:"Change only the policy, tool or administrative control required for the current operating need.",complete:"Configuration matches the intended governance and access model.",evidence:"Persisted policies, tool state and administrative configuration."}
};

const workflowNext:Partial<Record<ViewKey,ViewKey>> = {
  overview:"ai",
  ai:"unifi",
  stakeholder:"sparks",
  sparks:"thinktank",
  thinktank:"governance",
  governance:"products",
  products:"productlab",
  productlab:"unifi",
  unifi:"scheduler",
  scheduler:"runs",
  runs:"checkpoints",
  checkpoints:"audit",
  audit:"transparency",
  transparency:"overview"
};

type WorkflowRecommendation = { key:ViewKey|null; reason:string; adaptive:boolean };

function resolveWorkflowRecommendation(
  view:ViewKey,
  summary:Summary,
  runCount:number,
  checkpointCount:number
):WorkflowRecommendation{
  const fallback=workflowNext[view]||null;
  const defaultReason=fallback ? viewDescriptions[fallback] : viewDescriptions[view];

  if(view==="overview"){
    if(summary.blocked>0)return {key:"scheduler",reason:`${summary.blocked} blocked ${summary.blocked===1?"Job needs":"Jobs need"} scheduling attention.`,adaptive:true};
    if(summary.running>0)return {key:"runs",reason:`${summary.running} running ${summary.running===1?"Job is":"Jobs are"} ready for execution monitoring.`,adaptive:true};
    if(summary.total===0)return {key:"ai",reason:"No Jobs exist yet; shape the next governed outcome with DataNest AI.",adaptive:true};
  }

  if(view==="ai"){
    if(summary.blocked>0)return {key:"scheduler",reason:"Blocked work is waiting for scheduling or capability attention.",adaptive:true};
    if(summary.running>0)return {key:"runs",reason:"Active execution is underway; inspect live and completed run outcomes.",adaptive:true};
    if(summary.total===0)return {key:"unifi",reason:"Turn the clarified intent into a complete Job Manifest.",adaptive:true};
  }

  if(view==="unifi"&&summary.blocked>0){
    return {key:"scheduler",reason:"Blocked Jobs need scheduling and capability review before execution can continue.",adaptive:true};
  }

  if(view==="scheduler"){
    if(summary.running>0)return {key:"runs",reason:"Execution is active; move forward to run-level outcomes and connector evidence.",adaptive:true};
    if(summary.blocked>0)return {key:"unifi",reason:"No Job is running and blocked work may need manifest or capability adjustments.",adaptive:true};
  }

  if(view==="runs"&&runCount===0&&summary.active>0){
    return {key:"scheduler",reason:"There is active work but no run history yet; confirm scheduling state first.",adaptive:true};
  }

  if(view==="checkpoints"&&checkpointCount===0&&summary.running>0){
    return {key:"runs",reason:"No durable checkpoint is available yet; monitor the active run before resuming from evidence.",adaptive:true};
  }

  return {key:fallback,reason:defaultReason,adaptive:false};
}

const workflowPrevious:Partial<Record<ViewKey,ViewKey>> = {
  ai:"overview",
  sparks:"stakeholder",
  thinktank:"sparks",
  governance:"thinktank",
  products:"governance",
  productlab:"products",
  unifi:"productlab",
  scheduler:"unifi",
  runs:"scheduler",
  checkpoints:"runs",
  audit:"checkpoints",
  transparency:"audit"
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

const ProductsWorkspace = dynamic(() => import("@/components/ProductsWorkspace"), {
  ssr: false,
  loading: () => <section className="panel"><p className="muted">Loading Resonance products…</p></section>
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

const RonsasIntegrationPanel = dynamic(() => import("@/components/RonsasIntegrationPanel"), {
  ssr: false,
  loading: () => <section className="panel fullWidth"><p className="muted">Loading RONSAS cloud integration…</p></section>
});

function formatDate(value:string|null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"}).format(new Date(value));
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
  const workspaceTitleRef=useRef<HTMLHeadingElement|null>(null);
  const previousViewRef=useRef<ViewKey>("overview");
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
    if(!viewReady)return;
    if(previousViewRef.current===view)return;
    previousViewRef.current=view;
    const frame=window.requestAnimationFrame(()=>{
      workspaceTitleRef.current?.focus({preventScroll:true});
      window.scrollTo({top:0,left:0,behavior:"instant"});
    });
    return()=>window.cancelAnimationFrame(frame);
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

  function closeCommandPalette(restoreFocus=true){
    setCommandOpen(false);
    setCommandQuery("");
    setCommandActiveIndex(-1);
    window.setTimeout(()=>{
      if(restoreFocus)commandReturnFocusRef.current?.focus();
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
    closeCommandPalette(nextView===view);
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
  const currentNavItem=nav.find(item=>item.key===view);
  const currentLabel=currentNavItem?.label||"Overview";
  const currentDescription=viewDescriptions[view];
  const currentGroup=currentNavItem?.group||"Core";
  const currentPhase=workflowPhaseForView(view);
  const workflowRecommendation=resolveWorkflowRecommendation(view,summary,runCount,checkpointCount);
  const nextViewKey=workflowRecommendation.key;
  const previousViewKey=workflowPrevious[view]||null;
  const nextViewItem=nextViewKey ? nav.find(item=>item.key===nextViewKey)||null : null;
  const previousViewItem=previousViewKey ? nav.find(item=>item.key===previousViewKey)||null : null;
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
    <a className="skipLink" href="#workspace-title" onClick={event=>{event.preventDefault();workspaceTitleRef.current?.focus();}}>Skip to workspace</a>
    <aside id="datanest-navigation" aria-label="DataNest navigation" className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="sidebarTop">
        <div className="logo" aria-label="Resonance AppDev"><img src={DATANEST_LOGO_SRC} alt="Resonance AppDev"/></div>
        <div><p className="eyebrow">RESONANCE APPDEV</p><b>DataNest</b></div>
        <button className="closeMenu" onClick={()=>setMobileOpen(false)} aria-label="Close menu" aria-controls="datanest-navigation">×</button>
      </div>
      <div className="projectPill"><span className="liveDot"/><div><small>PROJECT</small><strong>{project?.name||"Resonance DataNest"}</strong></div></div>
      <nav className="navStack" aria-label="Project workspaces">
        {groups.map(group=><details className="navGroup navDisclosure" key={group+String(nav.some(item=>item.group===group&&item.key===view))} open={group==="Core"||nav.some(item=>item.group===group&&item.key===view)}>
          <summary>{group}</summary>
          {nav.filter(item=>item.group===group).map(item=><button
            key={item.key}
            className={(view===item.key?"active ":"")+(item.key==="ai"?"aiHeroNav":"")}
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

    {commandOpen&&<div className="commandPaletteBackdrop" onMouseDown={()=>closeCommandPalette()}>
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
          <button className="iconButton" type="button" onClick={()=>closeCommandPalette()} aria-label="Close quick switch">×</button>
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
        <div className="topbarTitle">
          <p className="eyebrow">RESONANCE DATANEST · {currentGroup.toUpperCase()}</p>
          <h1 id="workspace-title" ref={workspaceTitleRef} tabIndex={-1}>{currentLabel}</h1>
          <p className="topbarContext">{currentDescription}</p>
        </div>
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
              <MotionControl/>
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
        {view!=="overview"&&<nav className="workspaceWayfinding" aria-label="Workspace location">
          <button type="button" onClick={()=>setView("overview")}>← AI &amp; I home</button>
          <span aria-hidden="true">/</span><span aria-current="page">{currentLabel}</span>
        </nav>}
        {view!=="overview"&&view!=="settings"&&<nav className="workflowPhaseRail" aria-label="DataNest lifecycle phases">
          <div className="workflowPhaseSteps">
            {workflowPhases.map((phase,index)=>{
              const active=phase.id===currentPhase;
              return <button
                key={phase.id}
                type="button"
                className={active?"active":""}
                aria-current={active?"step":undefined}
                aria-label={active?phase.label+" phase · current": "Go to "+phase.label+" phase"}
                onClick={()=>setView((active?view:phase.destination) as ViewKey)}
              ><span>{"0"+(index+1)}</span><b>{phase.label}</b></button>;
            })}
          </div>
          <button className={"workflowPhaseAi "+(view==="ai"?"active":"")} type="button" aria-current={view==="ai"?"page":undefined} onClick={()=>setView("ai")}><span aria-hidden="true">✦</span><b>AI CORE</b><small>cross-phase</small></button>
        </nav>}
        <div aria-live="polite">
          {notice&&<div className="notice goodNotice">{notice}</div>}
          {error&&<div className="notice errorNotice" role="alert">{error}</div>}
        </div>
        {(loadingCore||loadingView)&&<div className="loadingBar" aria-label="Loading DataNest data"><span/></div>}

        {!loadingCore&&workspaceTaskGuides[view]&&<section className="workspaceTaskGuide" aria-label={currentLabel+" task guide"}>
          <div><span>START HERE</span><p>{workspaceTaskGuides[view]?.start}</p></div>
          <div><span>COMPLETE WHEN</span><p>{workspaceTaskGuides[view]?.complete}</p></div>
          <div><span>EVIDENCE</span><p>{workspaceTaskGuides[view]?.evidence}</p></div>
        </section>}

        <div key={view} className="viewStage workspaceArrival">
        {!loadingCore&&project&&view==="overview"&&<ResonanceHome project={project} jobs={recentJobs} counts={summary} canOperate={canOperate} onNavigate={setView}/>}
        {!loadingCore&&project&&view==="stakeholder"&&<StakeholderWorkspace projectId={project.id} currentUserId={session.user.id} canReview={canManageAi}/>}
        {!loadingCore&&project&&view==="sparks"&&<SparksWorkspace projectId={project.id} currentUserId={session.user.id} canOperate={canOperate} canManage={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="governance"&&<GovernanceWorkspace projectId={project.id} currentUserId={session.user.id} canManage={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="products"&&<ProductsWorkspace projectId={project.id}/>}
        {!loadingCore&&project&&view==="thinktank"&&<ThinkTankWorkspace projectId={project.id} currentUserId={session.user.id} currentUserEmail={session.user.email||"Authenticated user"} role={membership?.role||"viewer"} canOperate={canOperate} canReview={canManageAi} setNotice={setNotice} setError={setError}/>}
        {!loadingCore&&project&&view==="ai"&&<DataNestAiWorkspace projectId={project.id} currentUserId={session.user.id} currentUserEmail={session.user.email||"Authenticated user"} role={membership?.role||"viewer"} canOperate={canOperate} openScheduler={()=>setView("scheduler")} setNotice={setNotice} setError={setError} onActiveSessionChange={setActiveDataNestAiSession}/>}
        {!loadingCore&&project&&view==="productlab"&&<ProductLab projectId={project.id} currentUserId={session.user.id} canOperate={canOperate}/>}
        {!loadingCore&&project&&view==="unifi"&&<UnifiPlanner project={project} jobs={jobs} capabilities={capabilities} reload={async()=>{await loadJobsPage(jobPage);await loadSummary(project.id);await loadRecentJobs(project.id);}} setNotice={setNotice} setError={setError} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage}/>}
        {!loadingCore&&view==="scheduler"&&<Scheduler projectName={project?.name||"Resonance DataNest"} projectSlug={project?.slug||"resonance-datanest"} jobs={jobs} capabilities={capabilities} onStatus={updateJobStatus} canOperate={canOperate} page={jobPage} total={jobCount} onPage={setJobPage} onNavigate={setView}/>}
        {!loadingCore&&view==="runs"&&<Runs runs={runs} jobLookup={jobLookup} page={runPage} total={runCount} onPage={setRunPage} onNavigate={setView}/>}
        {!loadingCore&&view==="checkpoints"&&<Checkpoints checkpoints={checkpoints} jobLookup={jobLookup} page={checkpointPage} total={checkpointCount} onPage={setCheckpointPage} onNavigate={setView}/>}
        {!loadingCore&&view==="audit"&&<Audit events={events} jobLookup={jobLookup} page={eventPage} total={eventCount} onPage={setEventPage} onNavigate={setView}/>}
        {!loadingCore&&view==="transparency"&&<TransparencyWorkspace/>}
        {!loadingCore&&view==="settings"&&<Settings project={project} tools={tools} policies={policies} membership={membership} currentUserId={session.user.id} canManageAi={canManageAi}/>}
        </div>
        {!loadingCore&&project&&(previousViewItem||nextViewItem)&&<nav className="workflowContinuation" aria-label="Workspace progression">
          <div className="workflowContinuationCopy">
            <div className="workflowContinuationMeta"><p className="eyebrow">WORKFLOW CONTINUITY</p><span className={"workflowMode "+(workflowRecommendation.adaptive?"adaptive":"lifecycle")}>{workflowRecommendation.adaptive?"STATE-AWARE":"LIFECYCLE"}</span></div>
            <strong>{currentGroup} · {currentLabel}</strong>
            <small>{nextViewItem ? "Suggested next: "+nextViewItem.label+" · "+workflowRecommendation.reason : currentDescription}</small>
          </div>
          <div className="workflowContinuationActions">
            {previousViewItem&&<button className="secondaryButton compact" type="button" onClick={()=>setView(previousViewItem.key)}>← {previousViewItem.label}</button>}
            {nextViewItem&&<button className="primaryButton compact" type="button" onClick={()=>setView(nextViewItem.key)}>Continue · {nextViewItem.label} →</button>}
          </div>
        </nav>}
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
    {key:"products",label:"Products",description:"Inspect governed products, linked architecture, controls, evidence and specialist experiences.",glyph:"◉"},
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

function ganttTime(value:string|null|undefined) {
  if(!value)return null;
  const parsed=Date.parse(value);
  return Number.isFinite(parsed)?parsed:null;
}

function formatGanttTick(value:number,span:number) {
  const day=24*60*60*1000;
  const options:Intl.DateTimeFormatOptions=span<=3*day
    ? {month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"UTC"}
    : span<=120*day
      ? {month:"short",day:"2-digit",timeZone:"UTC"}
      : {month:"short",year:"numeric",timeZone:"UTC"};
  return new Intl.DateTimeFormat(undefined,options).format(new Date(value));
}

function Scheduler({projectName,projectSlug,jobs,capabilities,onStatus,canOperate,page,total,onPage,onNavigate}:{projectName:string;projectSlug:string;jobs:Job[];capabilities:Capability[];onStatus:(j:Job,s:string)=>Promise<void>;canOperate:boolean;page:number;total:number;onPage:(p:number)=>void;onNavigate:(v:ViewKey)=>void}) {
  const [filter,setFilter]=useState("ALL");
  const [viewMode,setViewMode]=useState<"queue"|"gantt">("gantt");
  const [sortMode,setSortMode]=useState<"priority"|"deadline"|"recent">("priority");
  const filterOptions=["ALL","PLANNED","READY","QUEUED","RUNNING","MANUAL_ACTION","BLOCKED","COMPLETED"];
  const visible=filter==="ALL"?jobs:jobs.filter(item=>item.status===filter);
  const orderedVisible=[...visible].sort((left,right)=>{
    if(sortMode==="deadline"){
      const leftDeadline=ganttTime(left.deadline);
      const rightDeadline=ganttTime(right.deadline);
      if(leftDeadline!==null||rightDeadline!==null){
        if(leftDeadline===null)return 1;
        if(rightDeadline===null)return -1;
        if(leftDeadline!==rightDeadline)return leftDeadline-rightDeadline;
      }
      return right.priority-left.priority||left.job_number-right.job_number;
    }
    if(sortMode==="recent"){
      return (ganttTime(right.updated_at)??0)-(ganttTime(left.updated_at)??0)||right.priority-left.priority;
    }
    return right.priority-left.priority||left.job_number-right.job_number;
  });
  const activeCount=visible.filter(item=>!finalStates.has(item.status)).length;
  const deadlineCount=visible.filter(item=>Boolean(item.deadline)).length;

  return <>
    <section className="schedulerHero">
      <div>
        <p className="eyebrow">TRANSCHEDULER · GANTT CHART VIEWER</p>
        <div className="schedulerProjectIdentity"><span>PROJECT</span><b>{projectName}</b><small>{projectSlug}</small></div>
        <h2>Capability-aware project scheduler</h2>
        <p>Switch between the operational queue and a Universal Time Gantt timeline. Jobs stay grouped under their project identity, with a priority-scale gradient from maintenance to critical for faster visual planning.</p>
      </div>
      <div className="schedulerPulse"><span>{capabilities.filter(item=>item.state==="AVAILABLE").length}</span><small>available resources</small></div>
    </section>
    <section className="panel">
      <div className="schedulerContextBar">
        <div className="schedulerContextControls">
          <div className="schedulerViewSwitch" role="group" aria-label="TranScheduler view">
            <button type="button" className={viewMode==="queue"?"active":""} aria-pressed={viewMode==="queue"} onClick={()=>setViewMode("queue")}>Queue</button>
            <button type="button" className={viewMode==="gantt"?"active":""} aria-pressed={viewMode==="gantt"} onClick={()=>setViewMode("gantt")}>Gantt chart</button>
          </div>
          <label className="schedulerSortControl">Sort
            <select aria-label="Sort project jobs" value={sortMode} onChange={event=>setSortMode(event.target.value as "priority"|"deadline"|"recent")}>
              <option value="priority">Priority scale</option>
              <option value="deadline">Nearest deadline</option>
              <option value="recent">Recently updated</option>
            </select>
          </label>
        </div>
        <div className="schedulerContextStats" aria-label="Current scheduler context">
          <span>{projectName}</span>
          <span>{total+" project jobs"}</span>
          <span>{visible.length+" shown"}</span>
          <span>{activeCount+" active"}</span>
          <span>{deadlineCount+" deadlines"}</span>
        </div>
      </div>
      <label className="schedulerFilterMobile">Status filter
        <select aria-label="Status filter" value={filter} onChange={event=>setFilter(event.target.value)}>
          {filterOptions.map(item=><option key={item} value={item}>{item.replace("_"," ")}</option>)}
        </select>
      </label>
      <div className="filterBar schedulerFilterDesktop">{filterOptions.map(item=><button key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item.replace("_"," ")}</button>)}</div>

      {!orderedVisible.length?<div className="schedulerEmptyState"><EmptyState
        title={total===0?"No project jobs yet":"No jobs match this filter"}
        text={total===0?"Create a complete Job Manifest in UNIFI before scheduling execution.":"Clear the current status filter to return to the project queue."}
        actionLabel={total===0?"Open UNIFI Planner":"Show all jobs"}
        onAction={()=>{if(total===0)onNavigate("unifi");else setFilter("ALL");}}
      /></div>:viewMode==="queue"?<div className="schedulerProjectGroup">
        <ProjectGroupHeader projectName={projectName} projectSlug={projectSlug} jobs={orderedVisible}/>
        <div className="schedulerTable"><div className="schedulerRow headerRow"><span>Job</span><span>Priority</span><span>Capability</span><span>Status</span><span>Controls</span></div>
        {orderedVisible.map(job=><div className="schedulerRow" key={job.id}>
          <div data-label="Job"><b>{jobCode(job)}</b><small>{job.title}</small></div>
          <span data-label="Priority" className="schedulerPriorityCell"><b>{"P"+job.priority}</b><PriorityScale value={job.priority}/></span>
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
      </div></div>:<SchedulerGantt projectName={projectName} projectSlug={projectSlug} jobs={orderedVisible} onStatus={onStatus} canOperate={canOperate}/>}
      <Pagination page={page} total={total} onPage={onPage}/>
    </section>
  </>;
}

function priorityBand(value:number) {
  if(value>=80)return "Critical";
  if(value>=60)return "High";
  if(value>=30)return "Standard";
  return "Maintenance";
}

function PriorityScale({value}:{value:number}) {
  const safe=Math.max(0,Math.min(100,value));
  const band=priorityBand(safe);
  return <span className="priorityScaleMeter" aria-label={"Priority "+safe+" of 100 · "+band} title={"Priority P"+safe+" · "+band}>
    <span className="priorityScaleGradient" aria-hidden="true"/>
    <i className="priorityScaleMarker" style={{left:String(safe)+"%"}} aria-hidden="true"/>
  </span>;
}

function ProjectGroupHeader({projectName,projectSlug,jobs}:{projectName:string;projectSlug:string;jobs:Job[]}) {
  const active=jobs.filter(job=>!finalStates.has(job.status)).length;
  const completed=jobs.filter(job=>job.status==="COMPLETED").length;
  const highest=jobs.length?Math.max(...jobs.map(job=>job.priority)):0;
  const bands=[
    {label:"Maintenance",count:jobs.filter(job=>job.priority<30).length},
    {label:"Standard",count:jobs.filter(job=>job.priority>=30&&job.priority<60).length},
    {label:"High",count:jobs.filter(job=>job.priority>=60&&job.priority<80).length},
    {label:"Critical",count:jobs.filter(job=>job.priority>=80).length}
  ];
  return <div className="schedulerProjectGroupHead">
    <div className="schedulerProjectGroupTitle">
      <span className="schedulerProjectGroupGlyph" aria-hidden="true">◆</span>
      <div><small>PROJECT</small><b>{projectName}</b><span>{projectSlug}</span></div>
    </div>
    <div className="schedulerProjectGroupSummary">
      <span>{jobs.length+" jobs"}</span><span>{active+" active"}</span><span>{completed+" complete"}</span><span>{"Peak P"+highest}</span>
    </div>
    <div className="schedulerPriorityStack">
      <div className="schedulerPriorityLegend" aria-label="Job priority scale">
        <span>Maintenance</span><i aria-hidden="true"/><span>Critical</span>
      </div>
      <div className="schedulerPriorityBands" aria-label="Priority distribution">
        {bands.map(item=><span key={item.label}><b>{item.count}</b>{item.label}</span>)}
      </div>
    </div>
  </div>;
}

function SchedulerGantt({projectName,projectSlug,jobs,onStatus,canOperate}:{projectName:string;projectSlug:string;jobs:Job[];onStatus:(j:Job,s:string)=>Promise<void>;canOperate:boolean}) {
  if(!jobs.length)return <div className="ganttEmpty"><EmptyState title="No jobs in this Gantt view" text="Change the status filter or add work in UNIFI."/></div>;

  const now=Date.now();
  const minute=60*1000;
  const starts=jobs.map(job=>ganttTime(job.created_at)??now);
  const ends=jobs.map((job,index)=>{
    const deadline=ganttTime(job.deadline);
    const updated=ganttTime(job.updated_at)??starts[index];
    const lifecycleEnd=finalStates.has(job.status)?updated:Math.max(updated,now);
    return Math.max(starts[index]+minute,deadline??lifecycleEnd);
  });
  const rawStart=Math.min(...starts);
  const rawEnd=Math.max(now,...ends);
  const rawSpan=Math.max(rawEnd-rawStart,6*60*minute);
  const padding=Math.max(rawSpan*.055,30*minute);
  const rangeStart=rawStart-padding;
  const rangeEnd=rawEnd+padding;
  const span=rangeEnd-rangeStart;
  const tickCount=6;
  const ticks=Array.from({length:tickCount},(_,index)=>rangeStart+(span*index)/(tickCount-1));
  const nowPosition=Math.max(0,Math.min(100,((now-rangeStart)/span)*100));

  return <div className="ganttViewer">
    <div className="ganttViewerHead">
      <div><p className="eyebrow">PROJECT TIMELINE</p><h3>{projectName}</h3><p>Lifecycle and deadline context for this project. The priority gradient runs from maintenance to critical, while timeline bars continue to use recorded job timestamps only.</p></div>
      <div className="ganttLegend" aria-label="Gantt chart legend">
        <span><i className="deadline"/>Deadline target</span>
        <span><i className="lifecycle"/>Lifecycle window</span>
        <span><i className="now"/>Now</span>
      </div>
    </div>
    <div className="ganttViewport">
      <div className="ganttCanvas">
        <ProjectGroupHeader projectName={projectName} projectSlug={projectSlug} jobs={jobs}/>
        <div className="ganttAxisRow">
          <div className="ganttAxisLabel"><b>{projectName}</b><small>Universal Time · current queue page</small></div>
          <div className="ganttTimeline ganttTimelineAxis">
            {ticks.map((tick,index)=>{
              const position=(index/(tickCount-1))*100;
              const transform=index===0?"none":index===tickCount-1?"translateX(-100%)":"translateX(-50%)";
              return <span className="ganttTickLabel" key={tick} style={{left:String(position)+"%",transform}}>{formatGanttTick(tick,span)}</span>;
            })}
          </div>
        </div>
        {jobs.map((job,index)=>{
          const start=starts[index];
          const end=ends[index];
          const left=Math.max(0,Math.min(100,((start-rangeStart)/span)*100));
          const right=Math.max(left,Math.min(100,((end-rangeStart)/span)*100));
          const width=Math.max(1.4,right-left);
          const deadline=ganttTime(job.deadline);
          const deadlinePosition=deadline===null?null:Math.max(0,Math.min(100,((deadline-rangeStart)/span)*100));
          const endText=job.deadline
            ? "Target "+formatDate(job.deadline)
            : finalStates.has(job.status)
              ? "Closed "+formatDate(job.updated_at)
              : "Active through now · no deadline";

          return <article className="ganttRow" key={job.id}>
            <div className="ganttJobLabel">
              <div className="ganttJobTitle">
                <div><b>{jobCode(job)}</b><small title={job.title}>{job.title}</small></div>
                <Badge value={job.status}/>
              </div>
              <div className="ganttMeta">
                <span className="ganttPriorityMeta"><b>{"P"+job.priority}</b><PriorityScale value={job.priority}/></span>
                <span>{job.required_capabilities?.join(", ")||"chat"}</span>
                <span>{endText}</span>
              </div>
              <div className="rowActions ganttRowActions">
                {canOperate ? <>
                  {!finalStates.has(job.status)&&job.status!=="PAUSED"&&<button onClick={()=>void onStatus(job,"PAUSED")}>Pause</button>}
                  {job.status==="PAUSED"&&<button onClick={()=>void onStatus(job,"READY")}>Resume</button>}
                  {!finalStates.has(job.status)&&<button onClick={()=>void onStatus(job,"CANCELLED")}>Cancel</button>}
                </> : <span className="muted">Read only</span>}
              </div>
            </div>
            <div className="ganttTimeline ganttTrack">
              {ticks.map((tick,tickIndex)=><span className="ganttGridLine" key={tick} style={{left:String((tickIndex/(tickCount-1))*100)+"%"}} aria-hidden="true"/>)}
              <span className="ganttNowLine" style={{left:String(nowPosition)+"%"}} aria-hidden="true"/>
              <div
                className={"ganttBar "+tone(job.status)+(job.deadline?" deadlineBound":" lifecycleBound")}
                style={{left:String(left)+"%",width:String(width)+"%"}}
                title={jobCode(job)+" · "+job.title+" · "+endText}
              ><span>{jobCode(job)}</span></div>
              {deadlinePosition!==null&&<span className="ganttDeadlineMarker" style={{left:String(deadlinePosition)+"%"}} aria-hidden="true"/>}
            </div>
          </article>;
        })}
      </div>
    </div>
  </div>;
}

function Runs({runs,jobLookup,page,total,onPage,onNavigate}:{runs:Run[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void;onNavigate:(v:ViewKey)=>void}) {
  return <section className="panel"><div className="panelHead"><div><p className="eyebrow">EXECUTION HISTORY</p><h2>Runs</h2></div><span className="countPill">{total}</span></div>
    {runs.length?<div className="dataTable"><div className="dataRow headerRow"><span>Run</span><span>Job</span><span>Connector</span><span>Status</span><span>Started</span></div>
      {runs.map(run=>{const job=jobLookup.get(run.job_id);return <div className="dataRow" key={run.id}>
        <b data-label="Run">{"RUN-"+run.run_number}</b>
        <span data-label="Job">{job?jobCode(job):run.job_id.slice(0,8)}</span>
        <span data-label="Connector">{run.connector_kind}</span>
        <span data-label="Status"><Badge value={run.status}/></span>
        <span data-label="Started">{formatDate(run.started_at)}</span>
      </div>;})}
    </div>:<EmptyState title="No execution runs yet" text="Runs appear after TranScheduler dispatches governed Jobs." actionLabel="Open TranScheduler" onAction={()=>onNavigate("scheduler")}/>}
    <Pagination page={page} total={total} onPage={onPage}/>
  </section>;
}

function Checkpoints({checkpoints,jobLookup,page,total,onPage,onNavigate}:{checkpoints:Checkpoint[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void;onNavigate:(v:ViewKey)=>void}) {
  return <>{checkpoints.length?<section className="checkpointGrid">{checkpoints.map(checkpoint=>{const job=jobLookup.get(checkpoint.job_id);return <article className="checkpointCard" key={checkpoint.id}><div className="rowBetween"><div><p className="eyebrow">CHECKPOINT</p><h3>{job?jobCode(job):checkpoint.job_id.slice(0,8)}</h3></div><small>{formatDate(checkpoint.created_at)}</small></div><h4>{job?.title||"Project continuation"}</h4><div className="checkpointColumns"><div><b>Completed</b>{checkpoint.completed?.map(item=><span key={item}>{"✓ "+item}</span>)}</div><div><b>Remaining</b>{checkpoint.remaining?.map(item=><span key={item}>{"→ "+item}</span>)}</div></div>{checkpoint.resume_instruction&&<div className="resumeBox"><b>Resume</b>{checkpoint.resume_instruction}</div>}</article>;})}</section>:<EmptyState title="No checkpoints yet" text="Durable continuation points appear after executable work records resumable state." actionLabel="Open Runs" onAction={()=>onNavigate("runs")}/>}<Pagination page={page} total={total} onPage={onPage}/></>;
}

function Audit({events,jobLookup,page,total,onPage,onNavigate}:{events:AuditEvent[];jobLookup:Map<string,Job>;page:number;total:number;onPage:(p:number)=>void;onNavigate:(v:ViewKey)=>void}) {
  return <section className="panel"><div className="panelHead"><div><p className="eyebrow">IMMUTABLE HISTORY</p><h2>Audit trail</h2></div><span className="countPill">{total}</span></div>{events.length?<div className="timeline">
    {events.map(event=><div className="timelineItem" key={event.id}><div className="timelineDot"/><div><div className="rowBetween"><b>{event.event_type.replaceAll("_"," ")}</b><small>{formatDate(event.created_at)}</small></div><p>{(event.job_id&&jobLookup.get(event.job_id)?jobCode(jobLookup.get(event.job_id)!)+" · ":"")+event.actor}</p><code>{JSON.stringify(event.payload)}</code></div></div>)}
  </div>:<EmptyState title="No audit events yet" text="Governed project actions will appear here as immutable operational evidence." actionLabel="Open Checkpoints" onAction={()=>onNavigate("checkpoints")}/>}<Pagination page={page} total={total} onPage={onPage}/></section>;
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
    <RonsasIntegrationPanel/>
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
function EmptyState({title,text,actionLabel,onAction}:{title:string;text:string;actionLabel?:string;onAction?:()=>void}) { return <div className="emptyState"><div>◇</div><h3>{title}</h3><p>{text}</p>{actionLabel&&onAction&&<button className="secondaryButton compact emptyStateAction" type="button" onClick={onAction}>{actionLabel}</button>}</div>; }
