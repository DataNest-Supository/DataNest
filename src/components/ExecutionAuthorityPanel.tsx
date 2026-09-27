"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  autonomyDescriptions,
  autonomyLabels,
  autonomyLevels,
  canApproveExecutionAuthority,
  canManageCircuitBreakers,
  canProposeExecutionAuthority,
  executionAuthorityLabel,
  executionOperations,
  type AutonomyLevel,
  type ExecutionAuthorityRole,
  type ExecutionCircuitBreakerCategory,
  type ExecutionOperation
} from "@/lib/executionAuthority";

type Row=Record<string,unknown>;
type JobOption={
  id:string;
  job_number:number;
  title:string;
  status:string;
  required_capabilities:string[];
};

type Workspace={
  envelopes:Row[];
  leases:Row[];
  breakers:Row[];
  capabilities:Row[];
  caller_role:string|null;
  can_propose:boolean;
  can_approve_a3:boolean;
  can_manage_breakers:boolean;
  boundaries:Record<string,unknown>;
};

const breakerCategories:ExecutionCircuitBreakerCategory[]=[
  "autonomous_write","deployment","external_communication","resource_execution"
];

function rows(value:unknown){return Array.isArray(value)?value as Row[]:[];}
function txt(value:unknown){return value==null?"":String(value);}
function list(value:unknown){return Array.isArray(value)?value.map(item=>String(item)):[];}
function splitList(value:string){
  return value.split(/[\n,]/).map(item=>item.trim()).filter(Boolean);
}
function parseObject(value:string){
  const parsed=JSON.parse(value||"{}") as unknown;
  if(!parsed||Array.isArray(parsed)||typeof parsed!=="object")throw new Error("JSON must be an object.");
  return parsed as Record<string,unknown>;
}
function toLocalInput(date:Date){
  const pad=(value:number)=>String(value).padStart(2,"0");
  return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+"T"+pad(date.getHours())+":"+pad(date.getMinutes());
}
function prettyDate(value:unknown){
  const raw=txt(value);
  if(!raw)return "—";
  const date=new Date(raw);
  if(Number.isNaN(date.getTime()))return raw;
  return new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
}
function numberValue(value:unknown,fallback=0){
  const next=Number(value);
  return Number.isFinite(next)?next:fallback;
}

export default function ExecutionAuthorityPanel({
  projectId,currentUserId,role,jobs,setNotice,setError
}:{
  projectId:string;
  currentUserId:string;
  role:ExecutionAuthorityRole;
  jobs:JobOption[];
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  const [jobId,setJobId]=useState(jobs[0]?.id||"");
  const [actorType,setActorType]=useState("human");
  const [actorKey,setActorKey]=useState("user:"+currentUserId);
  const [sponsorUser,setSponsorUser]=useState(currentUserId);
  const [purpose,setPurpose]=useState("job_execution");
  const [autonomyLevel,setAutonomyLevel]=useState<AutonomyLevel>("A2");
  const [permittedCapabilities,setPermittedCapabilities]=useState(jobs[0]?.required_capabilities?.join(",")||"chat");
  const [permittedOperations,setPermittedOperations]=useState("observe,prepare");
  const [envelopeExpiry,setEnvelopeExpiry]=useState(()=>toLocalInput(new Date(Date.now()+60*60*1000)));
  const [dataScope,setDataScope]=useState("{}");
  const [maxDuration,setMaxDuration]=useState("900");
  const [maxOperations,setMaxOperations]=useState("10");
  const [maxCostMinor,setMaxCostMinor]=useState("0");
  const [maxConcurrency,setMaxConcurrency]=useState("1");
  const [blastRadius,setBlastRadius]=useState("single_job");
  const [reversibility,setReversibility]=useState("reversible");
  const [evidenceRequirements,setEvidenceRequirements]=useState("{}");
  const [envelopeTrace,setEnvelopeTrace]=useState("");

  const [leaseEnvelope,setLeaseEnvelope]=useState("");
  const [leaseCapability,setLeaseCapability]=useState("");
  const [leaseOperations,setLeaseOperations]=useState("observe");
  const [leaseExpiry,setLeaseExpiry]=useState(()=>toLocalInput(new Date(Date.now()+30*60*1000)));
  const [leaseMaxOperations,setLeaseMaxOperations]=useState("1");
  const [leaseTrace,setLeaseTrace]=useState("");

  const [breakerReason,setBreakerReason]=useState("");

  const canPropose=canProposeExecutionAuthority(role);
  const canManageBreakers=canManageCircuitBreakers(role);
  const canManageLeases=role==="owner"||role==="admin";

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase){setError("Authority & Execution is unavailable.");setLoading(false);return;}
    setLoading(true);
    const {data,error}=await supabase.rpc("get_execution_authority_workspace_v1",{target_project:projectId});
    if(error){
      setError(error.message);
      setWorkspace(null);
    }else{
      const raw=(data||{}) as Record<string,unknown>;
      const next:Workspace={
        envelopes:rows(raw.envelopes),
        leases:rows(raw.leases),
        breakers:rows(raw.breakers),
        capabilities:rows(raw.capabilities),
        caller_role:raw.caller_role?String(raw.caller_role):null,
        can_propose:Boolean(raw.can_propose),
        can_approve_a3:Boolean(raw.can_approve_a3),
        can_manage_breakers:Boolean(raw.can_manage_breakers),
        boundaries:(raw.boundaries&&typeof raw.boundaries==="object"?raw.boundaries:{}) as Record<string,unknown>
      };
      setWorkspace(next);
      const firstApproved=next.envelopes.find(item=>txt(item.approval_state)==="approved"&&txt(item.autonomy_level)!=="A4");
      const firstCapability=next.capabilities[0];
      setLeaseEnvelope(current=>current||txt(firstApproved?.id));
      setLeaseCapability(current=>current||txt(firstCapability?.id));
    }
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    if(jobId)return;
    if(jobs[0]){
      setJobId(jobs[0].id);
      setPermittedCapabilities(jobs[0].required_capabilities?.join(",")||"chat");
    }
  },[jobId,jobs]);

  async function rpc(name:string,args:Record<string,unknown>,notice:string){
    const supabase=getSupabase(); if(!supabase)return false;
    setBusy(true);setError("");
    const {error}=await supabase.rpc(name,args);
    if(error){setError(error.message);setBusy(false);return false;}
    setNotice(notice);
    await load();
    setBusy(false);
    return true;
  }

  async function proposeEnvelope(event:FormEvent){
    event.preventDefault();
    try{
      const level=autonomyLevel;
      const resourceCeiling={
        max_duration_seconds:Number(maxDuration),
        max_operations:Number(maxOperations),
        max_cost_minor:Number(maxCostMinor),
        max_concurrency:Number(maxConcurrency),
        blast_radius:blastRadius.trim()
      };
      await rpc("propose_authority_envelope_v1",{
        target_project:projectId,
        target_job:jobId,
        target_actor_type:actorType,
        target_actor_key:actorKey.trim(),
        target_sponsor_user:sponsorUser,
        target_purpose:purpose.trim(),
        target_autonomy_level:level,
        target_permitted_capabilities:splitList(permittedCapabilities),
        target_permitted_operations:splitList(permittedOperations),
        target_expires_at:new Date(envelopeExpiry).toISOString(),
        target_product:null,
        target_actor_user:actorType==="human"?currentUserId:null,
        target_data_scope:parseObject(dataScope),
        target_resource_ceiling:resourceCeiling,
        target_reversibility:reversibility,
        target_evidence_requirements:parseObject(evidenceRequirements),
        target_trace_key:envelopeTrace.trim()||null
      },"Authority Envelope proposal recorded for governed review.");
      setEnvelopeTrace("");
    }catch(error){
      setError(error instanceof Error?error.message:"Unable to propose Authority Envelope.");
    }
  }

  async function issueLease(event:FormEvent){
    event.preventDefault();
    await rpc("issue_capability_lease_v1",{
      target_envelope:leaseEnvelope,
      target_capability:leaseCapability,
      target_allowed_operations:splitList(leaseOperations),
      target_expires_at:new Date(leaseExpiry).toISOString(),
      target_max_operations:Number(leaseMaxOperations),
      target_trace_key:leaseTrace.trim()||null
    },"Capability Lease issued. Capacity reservation remains a separate scheduler concern.");
    setLeaseTrace("");
  }

  const approvedLeaseEnvelopes=useMemo(
    ()=>workspace?.envelopes.filter(item=>txt(item.approval_state)==="approved"&&txt(item.autonomy_level)!=="A4")||[],
    [workspace]
  );
  const breakerMap=useMemo(
    ()=>new Map((workspace?.breakers||[]).map(item=>[txt(item.category),item])),
    [workspace]
  );

  if(loading)return <section className="panel"><p className="muted">Loading Authority & Execution…</p></section>;
  if(!workspace)return <section className="panel"><p className="muted">Authority & Execution workspace is unavailable.</p></section>;

  return <div className="executionAuthorityWorkspace">
    <section className="executionAuthorityBoundary" aria-label="Execution authority boundaries">
      <p><b>Capacity reservation ≠ authorization lease.</b> A TranScheduler reservation allocates resource capacity; a Capability Lease authorizes a bounded actor operation.</p>
      <p><b>Authority Envelopes do not store credentials.</b> Existing provider, session, RLS, Phase C policy and file-access controls remain independent prerequisites.</p>
      <p><b>A4 is human-gated.</b> High-impact authority may be represented and reviewed, but a generic automated lease is unavailable in Phase D v1.</p>
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">AUTONOMY MODEL</p><h3>A0 → A4 consequence gradient</h3></div>
        <span className="countPill">Phase D</span>
      </div>
      <div className="autonomyGrid">
        {autonomyLevels.map(level=><article className={"manifestCard autonomyCard "+(level==="A4"?"highImpact":"")} key={level}>
          <div className="rowBetween"><b>{level+" · "+autonomyLabels[level]}</b>{level==="A4"&&<span className="badge neutral">Human-gated A4</span>}</div>
          <p>{autonomyDescriptions[level]}</p>
        </article>)}
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">AUTHORITY ENVELOPES</p><h3>Task-scoped execution authority</h3></div><span className="countPill">{workspace.envelopes.length}</span></div>
      {workspace.envelopes.length?<div className="executionAuthorityCards">{workspace.envelopes.map(item=>{
        const level=(txt(item.autonomy_level)||"A0") as AutonomyLevel;
        const state=txt(item.approval_state);
        const mayApprove=state==="draft"&&canApproveExecutionAuthority(role,level);
        return <article className="manifestCard" key={txt(item.id)}>
          <div className="rowBetween">
            <b>{level+" · "+txt(item.actor_key)}</b>
            <span className={"badge "+(state==="approved"?"good":"neutral")}>{executionAuthorityLabel(state)}</span>
          </div>
          <p>{txt(item.purpose)}</p>
          <div className="manifestMeta">
            <span>Job {txt(item.job_id).slice(0,8)}</span>
            <span>Sponsor {txt(item.sponsor_user_id).slice(0,8)}</span>
            <span>Expires {prettyDate(item.expires_at)}</span>
          </div>
          <p className="muted">Capabilities: {list(item.permitted_capabilities).join(", ")||"none"}</p>
          <p className="muted">Operations: {list(item.permitted_operations).map(executionAuthorityLabel).join(", ")||"none"}</p>
          {level==="A4"&&<p className="authorityHighImpactNotice">A4 remains human-gated; no automated lease action is exposed.</p>}
          <div className="rowActions">
            {mayApprove&&<button className="primaryButton compact" disabled={busy} onClick={()=>void rpc("approve_authority_envelope_v1",{target_envelope:item.id},"Authority Envelope approved.")}>Approve</button>}
            {state==="draft"&&(role==="owner"||role==="admin")&&<button className="textButton" disabled={busy} onClick={()=>void rpc("reject_authority_envelope_v1",{target_envelope:item.id,target_reason:"Rejected from Authority & Execution workspace."},"Authority Envelope rejected.")}>Reject</button>}
            {state==="approved"&&(role==="owner"||role==="admin")&&<button className="textButton" disabled={busy} onClick={()=>void rpc("revoke_authority_envelope_v1",{target_envelope:item.id,target_reason:"Revoked from Authority & Execution workspace."},"Authority Envelope revoked and linked active leases disabled.")}>Revoke</button>}
          </div>
        </article>;
      })}</div>:<p className="muted">No Authority Envelopes have been recorded for this project.</p>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">CAPABILITY LEASES</p><h3>Short-lived authorization budgets</h3></div><span className="countPill">{workspace.leases.length}</span></div>
      {workspace.leases.length?<div className="executionAuthorityCards">{workspace.leases.map(item=>{
        const max=numberValue(item.max_operations);
        const used=numberValue(item.used_operations);
        return <article className="manifestCard" key={txt(item.id)}>
          <div className="rowBetween"><b>{txt(item.actor_key)}</b><span className={"badge "+(txt(item.status)==="active"?"good":"neutral")}>{executionAuthorityLabel(txt(item.status))}</span></div>
          <p>{list(item.allowed_operations).map(executionAuthorityLabel).join(", ")||"No operations"}</p>
          <div className="manifestMeta"><span>{Math.max(0,max-used)+" operations remaining"}</span><span>Expires {prettyDate(item.expires_at)}</span></div>
          {canManageLeases&&txt(item.status)==="active"&&<button className="textButton" disabled={busy} onClick={()=>void rpc("release_capability_lease_v1",{target_lease:item.id,target_reason:"Released from Authority & Execution workspace."},"Capability Lease released.")}>Release lease</button>}
        </article>;
      })}</div>:<p className="muted">No authorization Capability Leases are active or recorded.</p>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">CIRCUIT BREAKERS</p><h3>Autonomous execution stop controls</h3></div><span className="countPill">Owner / admin</span></div>
      <div className="executionAuthorityCards">
        {breakerCategories.map(category=>{
          const item=breakerMap.get(category);
          const state=txt(item?.state)||"missing";
          return <article className="manifestCard" key={category}>
            <div className="rowBetween"><b>{executionAuthorityLabel(category)}</b><span className={"badge "+(state==="open"?"good":state==="halted"?"warn":"neutral")}>{executionAuthorityLabel(state)}</span></div>
            <p>{item?txt(item.reason)||"No reason recorded.":"Not configured. Mutating automated authorization fails closed until explicitly opened."}</p>
            {canManageBreakers&&<div className="rowActions">
              <button className="secondaryButton compact" disabled={busy||state==="open"} onClick={()=>void rpc("set_execution_circuit_breaker_v1",{target_project:projectId,target_category:category,target_state:"open",target_reason:breakerReason.trim()||"Explicitly opened by owner/admin."},"Execution circuit breaker opened.")}>Open</button>
              <button className="primaryButton compact" disabled={busy||state==="halted"} onClick={()=>void rpc("set_execution_circuit_breaker_v1",{target_project:projectId,target_category:category,target_state:"halted",target_reason:breakerReason.trim()||"Halted by owner/admin."},"Execution circuit breaker halted.")}>Halt</button>
            </div>}
          </article>;
        })}
      </div>
      {canManageBreakers&&<label className="authorityReasonField">Breaker reason<input value={breakerReason} onChange={event=>setBreakerReason(event.target.value)} placeholder="Optional reason applied to the next breaker change"/></label>}
    </section>

    {canPropose&&<section className="executionAuthorityActionGrid">
      <details className="panel quietDisclosure">
        <summary>Propose Authority Envelope</summary>
        <form className="settingsGrid" onSubmit={proposeEnvelope}>
          <label>Job<select value={jobId} onChange={event=>{const next=event.target.value;setJobId(next);const job=jobs.find(item=>item.id===next);if(job)setPermittedCapabilities(job.required_capabilities?.join(",")||"chat");}} required>
            <option value="">Select Job</option>{jobs.map(job=><option key={job.id} value={job.id}>{"JOB-"+job.job_number+" · "+job.title}</option>)}
          </select></label>
          <label>Actor type<select value={actorType} onChange={event=>{const next=event.target.value;setActorType(next);if(next==="human")setActorKey("user:"+currentUserId);}}>
            {["human","agent","application","model","service","workflow"].map(value=><option key={value} value={value}>{executionAuthorityLabel(value)}</option>)}
          </select></label>
          <label>Actor key<input value={actorKey} onChange={event=>setActorKey(event.target.value)} required/></label>
          <label>Sponsor user ID<input value={sponsorUser} onChange={event=>setSponsorUser(event.target.value)} required/></label>
          <label>Purpose<input value={purpose} onChange={event=>setPurpose(event.target.value)} required/></label>
          <label>Autonomy level<select value={autonomyLevel} onChange={event=>setAutonomyLevel(event.target.value as AutonomyLevel)}>{autonomyLevels.map(level=><option key={level} value={level}>{level+" · "+autonomyLabels[level]}</option>)}</select></label>
          <label>Permitted capabilities<input value={permittedCapabilities} onChange={event=>setPermittedCapabilities(event.target.value)} placeholder="chat, deploy"/></label>
          <label>Permitted operations<input value={permittedOperations} onChange={event=>setPermittedOperations(event.target.value)} placeholder={executionOperations.join(", ")}/></label>
          <label>Expires<input type="datetime-local" value={envelopeExpiry} onChange={event=>setEnvelopeExpiry(event.target.value)} required/></label>
          <label>Reversibility<select value={reversibility} onChange={event=>setReversibility(event.target.value)}><option value="reversible">Reversible</option><option value="conditionally_reversible">Conditionally reversible</option><option value="irreversible">Irreversible</option></select></label>
          <label>Max duration seconds<input type="number" min="1" value={maxDuration} onChange={event=>setMaxDuration(event.target.value)}/></label>
          <label>Max operations<input type="number" min="1" value={maxOperations} onChange={event=>setMaxOperations(event.target.value)}/></label>
          <label>Max cost minor units<input type="number" min="0" value={maxCostMinor} onChange={event=>setMaxCostMinor(event.target.value)}/></label>
          <label>Max concurrency<input type="number" min="1" value={maxConcurrency} onChange={event=>setMaxConcurrency(event.target.value)}/></label>
          <label>Blast radius<input value={blastRadius} onChange={event=>setBlastRadius(event.target.value)} required/></label>
          <label>Data scope JSON<textarea rows={3} value={dataScope} onChange={event=>setDataScope(event.target.value)}/></label>
          <label>Evidence requirements JSON<textarea rows={3} value={evidenceRequirements} onChange={event=>setEvidenceRequirements(event.target.value)}/></label>
          <label>Trace key<input value={envelopeTrace} onChange={event=>setEnvelopeTrace(event.target.value)} placeholder="Optional; generated when blank"/></label>
          {autonomyLevel==="A4"&&<p className="authorityHighImpactNotice">Human-gated A4: this proposal may be reviewed, but Phase D will not issue a generic automated Capability Lease.</p>}
          <button className="primaryButton" disabled={busy||!jobId||!actorKey.trim()||!sponsorUser.trim()||!purpose.trim()}>Propose envelope</button>
        </form>
      </details>

      {canManageLeases&&<details className="panel quietDisclosure">
        <summary>Issue Capability Lease · Owner / admin</summary>
        <form className="settingsGrid" onSubmit={issueLease}>
          <label>Approved envelope<select value={leaseEnvelope} onChange={event=>setLeaseEnvelope(event.target.value)} required><option value="">Select envelope</option>{approvedLeaseEnvelopes.map(item=><option key={txt(item.id)} value={txt(item.id)}>{txt(item.autonomy_level)+" · "+txt(item.actor_key)+" · "+txt(item.id).slice(0,8)}</option>)}</select></label>
          <label>Capability<select value={leaseCapability} onChange={event=>setLeaseCapability(event.target.value)} required><option value="">Select capability</option>{workspace.capabilities.map(item=><option key={txt(item.id)} value={txt(item.id)}>{txt(item.capability)+" · "+txt(item.state)}</option>)}</select></label>
          <label>Allowed operations<input value={leaseOperations} onChange={event=>setLeaseOperations(event.target.value)} required/></label>
          <label>Max operations<input type="number" min="1" value={leaseMaxOperations} onChange={event=>setLeaseMaxOperations(event.target.value)} required/></label>
          <label>Expires<input type="datetime-local" value={leaseExpiry} onChange={event=>setLeaseExpiry(event.target.value)} required/></label>
          <label>Trace key<input value={leaseTrace} onChange={event=>setLeaseTrace(event.target.value)} placeholder="Optional; generated when blank"/></label>
          <button className="primaryButton" disabled={busy||!leaseEnvelope||!leaseCapability}>Issue authorization lease</button>
        </form>
      </details>}
    </section>}
  </div>;
}
