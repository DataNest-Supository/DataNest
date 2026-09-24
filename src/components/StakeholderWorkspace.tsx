"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Workspace = {
  profile: Record<string,unknown>;
  stakeholder: Record<string,unknown>;
  counts: Record<string,number>;
  spark_balances: Array<{account_type:string;project_id:string|null;balance:number}>;
  scoring_model_version:string|null;
  ui_complexity:"simple"|"detailed";
  economic_boundary:Record<string,boolean>;
};

type Contribution = {
  id:string;
  trace_key:string|null;
  contribution_type:string;
  lifecycle_state:string;
  contribution_state:string;
  scoring_state:string;
  certification_state:string;
  minting_state:string;
  points:number;
  proposed_points:number;
  source_ref:string|null;
  occurred_at:string;
  created_at:string;
};

function fmt(value:unknown){
  const n=Number(value||0);
  return Number.isFinite(n)?new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(n):"0";
}

function date(value:string){
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",year:"numeric"}).format(new Date(value));
}

export default function StakeholderWorkspace({
  projectId,
  currentUserId,
  canReview
}:{
  projectId:string;
  currentUserId:string;
  canReview:boolean;
}) {
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [contributions,setContributions]=useState<Contribution[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [savingPreference,setSavingPreference]=useState(false);

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    setLoading(true);
    setError("");

    const [workspaceResult,contributionResult]=await Promise.all([
      supabase.rpc("get_contribution_workspace",{target_project:projectId}),
      supabase
        .from("contribution_ledger")
        .select("id,trace_key,contribution_type,lifecycle_state,contribution_state,scoring_state,certification_state,minting_state,points,proposed_points,source_ref,occurred_at,created_at")
        .eq("project_id",projectId)
        .eq("user_id",currentUserId)
        .order("created_at",{ascending:false})
        .limit(50)
    ]);

    if(workspaceResult.error){
      setError(workspaceResult.error.message);
      setWorkspace(null);
    }else{
      setWorkspace((workspaceResult.data||null) as Workspace|null);
    }

    if(contributionResult.error){
      setError(current=>current||contributionResult.error!.message);
      setContributions([]);
    }else{
      setContributions((contributionResult.data||[]) as Contribution[]);
    }

    setLoading(false);
  },[projectId,currentUserId]);

  useEffect(()=>{void load();},[load]);

  const projectSparks=useMemo(
    ()=>workspace?.spark_balances.find(item=>item.account_type==="project"&&item.project_id===projectId)?.balance||0,
    [workspace,projectId]
  );
  const platformSparks=useMemo(
    ()=>workspace?.spark_balances.find(item=>item.account_type==="platform")?.balance||0,
    [workspace]
  );
  const lockedSparks=useMemo(
    ()=>workspace?.spark_balances.find(item=>item.account_type==="locked"&&item.project_id===projectId)?.balance||0,
    [workspace,projectId]
  );

  async function setComplexity(mode:"simple"|"detailed"){
    const supabase=getSupabase();
    if(!supabase)return;
    setSavingPreference(true);
    setError("");
    const {error:prefError}=await supabase
      .from("datanest_user_preferences")
      .upsert({user_id:currentUserId,ui_complexity:mode,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(prefError)setError(prefError.message);
    else setWorkspace(current=>current?{...current,ui_complexity:mode}:current);
    setSavingPreference(false);
  }

  if(loading)return <section className="panel"><p className="muted">Loading stakeholder workspace…</p></section>;
  if(error&&!workspace)return <section className="panel"><div className="notice errorNotice">{error}</div></section>;
  if(!workspace)return <section className="panel"><p className="muted">Stakeholder workspace is unavailable.</p></section>;

  const simple=workspace.ui_complexity!=="detailed";
  const stakeholder=workspace.stakeholder||{};
  const profile=workspace.profile||{};
  const counts=workspace.counts||{};

  return <>
    {error&&<div className="notice errorNotice">{error}</div>}

    <section className="heroPanel">
      <div>
        <p className="eyebrow">STAKEHOLDER CONTRIBUTION</p>
        <h2>Your DataNest contribution workspace</h2>
        <p>Accepted impact, evidence, Sparks and contribution share are tracked separately from legal ownership and royalty entitlements.</p>
        <div className="heroActions">
          <button
            className={simple?"primaryButton compact":"secondaryButton compact"}
            disabled={savingPreference}
            onClick={()=>void setComplexity("simple")}
          >Simple UI</button>
          <button
            className={!simple?"primaryButton compact":"secondaryButton compact"}
            disabled={savingPreference}
            onClick={()=>void setComplexity("detailed")}
          >Detailed UI</button>
          <button className="secondaryButton compact" onClick={()=>void load()}>Refresh</button>
        </div>
      </div>
      <div className="stackDiagram">
        <div>Evidence <b>Submitted</b></div>
        <span>↓</span>
        <div>Contribution <b>Verified + Accepted</b></div>
        <span>↓</span>
        <div>Value <b>Scored + Certified</b></div>
        <span>↓</span>
        <div>Sparks <b>Append-only ledger</b></div>
      </div>
    </section>

    <section className="metricGrid">
      <article className="metricCard"><span>Project Sparks</span><strong>{fmt(projectSparks)}</strong><small>Internal project utility</small></article>
      <article className="metricCard"><span>Platform Sparks</span><strong>{fmt(platformSparks)}</strong><small>RONSAS-wide utility</small></article>
      <article className="metricCard"><span>Contribution share</span><strong>{fmt(stakeholder.contribution_share_percent)}%</strong><small>Not legal ownership</small></article>
      <article className="metricCard"><span>Accepted points</span><strong>{fmt(stakeholder.accepted_points)}</strong><small>Historical accepted value</small></article>
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">PIPELINE</p><h3>Contribution lifecycle</h3></div>
        <span className="countPill">{String(workspace.scoring_model_version||"No active model")}</span>
      </div>
      <div className="metricGrid">
        <article className="metricCard"><span>Submitted / review</span><strong>{Number(counts.submitted||0)}</strong><small>Not yet accepted</small></article>
        <article className="metricCard"><span>Verified</span><strong>{Number(counts.verified||0)}</strong><small>Evidence confirmed</small></article>
        <article className="metricCard"><span>Scored</span><strong>{Number(counts.scored||0)}</strong><small>Versioned scoring applied</small></article>
        <article className="metricCard"><span>Minted</span><strong>{Number(counts.minted||0)}</strong><small>Sparks issued</small></article>
      </div>
    </section>

    {!simple&&<>
      <section className="panel">
        <div className="panelHead"><div><p className="eyebrow">PROFILE</p><h3>Stakeholder state</h3></div>{canReview&&<span className="countPill">Reviewer-capable role</span>}</div>
        <dl className="settingsList">
          <div><dt>Lifecycle</dt><dd>{String(profile.lifecycle_stage||"active_stakeholder").replaceAll("_"," ")}</dd></div>
          <div><dt>Status</dt><dd>{String(profile.status||"active")}</dd></div>
          <div><dt>Origin</dt><dd>{String(profile.origin||"invite")}</dd></div>
          <div><dt>Tracked points</dt><dd>{fmt(stakeholder.tracked_points)}</dd></div>
          <div><dt>Pending contributions</dt><dd>{fmt(stakeholder.pending_contributions)}</dd></div>
          <div><dt>Locked Sparks</dt><dd>{fmt(lockedSparks)}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <div className="panelHead"><div><p className="eyebrow">AUDITABLE CONTRIBUTIONS</p><h3>Your latest contribution events</h3></div><span className="countPill">{contributions.length}</span></div>
        {contributions.length?<div className="dataTable">
          <div className="dataRow headerRow"><span>Trace</span><span>Type</span><span>Lifecycle</span><span>Points</span><span>Date</span></div>
          {contributions.map(item=><div className="dataRow" key={item.id}>
            <b>{item.trace_key||item.id.slice(0,12)}</b>
            <span>{item.contribution_type.replaceAll("_"," ")}</span>
            <span>{item.lifecycle_state.replaceAll("_"," ")}</span>
            <span>{fmt(item.points)}</span>
            <span>{date(item.created_at)}</span>
          </div>)}
        </div>:<div className="emptyState"><div>◇</div><h3>No contribution events yet</h3><p>Accepted project work will appear here as it moves through the governed pipeline.</p></div>}
      </section>

      <section className="panel">
        <p className="eyebrow">ECONOMIC BOUNDARY</p>
        <h3>Separate ledgers, separate meanings</h3>
        <p className="muted">Contribution share is a DataNest calculation. It does not by itself create legal ownership. Sparks are internal utility entries and are separate from contractual royalty entitlements or royalties payable.</p>
      </section>
    </>}
  </>;
}
