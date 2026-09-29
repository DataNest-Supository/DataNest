"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSingleFlight } from "@/lib/singleFlight";

type StandardItem={
  id:string;
  standard_key:string;
  version:number;
  title:string;
  authority:string;
  edition:string;
  applicability_state:"reference"|"applicable"|"monitor"|"not_applicable";
  rationale:string;
  source_url:string|null;
  review_after:string;
  last_reviewed_at:string|null;
  review_due:boolean;
};

type Observation={
  id:string;
  trace_key:string;
  source_kind:string;
  source_ref:string|null;
  summary:string;
  severity:"info"|"low"|"moderate"|"high"|"critical";
  confidence:number|null;
  observed_at:string;
  recorder_role:string;
  authoritative_change:boolean;
};

type Candidate={
  id:string;
  trace_key:string;
  title:string;
  problem_statement:string;
  hypothesis:string;
  desired_outcome:string;
  source_observation_ids:string[];
  standard_refs:string[];
  risk_class:"low"|"moderate"|"high"|"critical";
  confidence:number|null;
  status:"proposed"|"needs_evidence"|"ready_for_governance"|"converted_to_proposal"|"dismissed";
  linked_governance_proposal_id:string|null;
  governance_effect:boolean;
  updated_at:string;
};

type Cycle={
  id:string;
  trace_key:string;
  window_start:string;
  window_end:string;
  previous_cycle_id:string|null;
  metrics:Record<string,unknown>;
  signals:Array<Record<string,unknown>>;
  governance_effect:boolean;
  created_at:string;
};

type Control={
  id:string;
  control_key:string;
  version:number;
  title:string;
  purpose:string;
  control_kind:string;
  standard_refs:string[];
  implementation_refs:string[];
  rationale:string;
  governance_effect:boolean;
  evidence_count:number;
  latest_evidence_at:string|null;
};

type ControlEvidence={
  id:string;
  control_id:string;
  trace_key:string;
  evidence_kind:string;
  evidence_ref:string;
  evidence_digest:string|null;
  summary:string;
  evidence_state:"observed"|"passed"|"failed"|"superseded";
  observed_at:string;
  recorder_role:string;
  authoritative_change:boolean;
};

type StandardWatchEvent={
  id:string;
  standard_id:string;
  standard_key:string;
  observation_id:string;
  trace_key:string;
  event_type:string;
  source_authority:string;
  source_url:string;
  observed_edition:string|null;
  summary:string;
  observed_at:string;
  recorder_role:string;
  authoritative_change:boolean;
};

type Workspace={
  role:string|null;
  can_manage:boolean;
  can_record_control_evidence:boolean;
  standards:StandardItem[];
  observations:Observation[];
  candidates:Candidate[];
  cycles:Cycle[];
  controls:Control[];
  control_evidence:ControlEvidence[];
  standard_watch:StandardWatchEvent[];
  boundaries:Record<string,unknown>;
};

function date(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{
    year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"
  }).format(new Date(value));
}

function label(value:string){
  return value.replaceAll("_"," ");
}

function metric(value:unknown){
  return typeof value==="number"||typeof value==="string"?String(value):"—";
}

export default function GovernanceImprovementPanel({
  projectId,setNotice,setError
}:{
  projectId:string;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true);
  const {activeAction,run}=useSingleFlight();

  const [observationKind,setObservationKind]=useState("manual");
  const [observationSummary,setObservationSummary]=useState("");
  const [observationSeverity,setObservationSeverity]=useState("info");
  const [observationSourceRef,setObservationSourceRef]=useState("");

  const [candidateTitle,setCandidateTitle]=useState("");
  const [candidateProblem,setCandidateProblem]=useState("");
  const [candidateHypothesis,setCandidateHypothesis]=useState("");
  const [candidateOutcome,setCandidateOutcome]=useState("");
  const [candidateObservation,setCandidateObservation]=useState("");
  const [candidateStandards,setCandidateStandards]=useState("");
  const [candidateRisk,setCandidateRisk]=useState("moderate");

  const [standardId,setStandardId]=useState("");
  const [standardState,setStandardState]=useState<StandardItem["applicability_state"]>("reference");
  const [standardRationale,setStandardRationale]=useState("");
  const [reviewRationales,setReviewRationales]=useState<Record<string,string>>({});

  const [controlEvidenceControlId,setControlEvidenceControlId]=useState("");
  const [controlEvidenceKind,setControlEvidenceKind]=useState("repository");
  const [controlEvidenceRef,setControlEvidenceRef]=useState("");
  const [controlEvidenceSummary,setControlEvidenceSummary]=useState("");
  const [controlEvidenceState,setControlEvidenceState]=useState<ControlEvidence["evidence_state"]>("observed");

  const [watchStandardId,setWatchStandardId]=useState("");
  const [watchEventType,setWatchEventType]=useState("status_checked");
  const [watchSourceUrl,setWatchSourceUrl]=useState("");
  const [watchObservedEdition,setWatchObservedEdition]=useState("");
  const [watchSummary,setWatchSummary]=useState("");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("get_governance_improvement_workspace_v1",{
      target_project:projectId
    });
    if(error){
      setError(error.message);
      setWorkspace(null);
    }else{
      const raw=(data||null) as Partial<Workspace>|null;
      const next=raw?({
        ...raw,
        can_manage:Boolean(raw.can_manage),
        can_record_control_evidence:Boolean(raw.can_record_control_evidence),
        standards:raw.standards||[],
        observations:raw.observations||[],
        candidates:raw.candidates||[],
        cycles:raw.cycles||[],
        controls:raw.controls||[],
        control_evidence:raw.control_evidence||[],
        standard_watch:raw.standard_watch||[],
        boundaries:raw.boundaries||{}
      } as Workspace):null;
      setWorkspace(next);
      setStandardId(current=>
        current&&next?.standards.some(item=>item.id===current)
          ?current
          :next?.standards[0]?.id||""
      );
      setCandidateObservation(current=>
        current&&next?.observations.some(item=>item.id===current)
          ?current
          :next?.observations[0]?.id||""
      );
      setControlEvidenceControlId(current=>
        current&&next?.controls.some(item=>item.id===current)
          ?current
          :next?.controls[0]?.id||""
      );
      setWatchStandardId(current=>
        current&&next?.standards.some(item=>item.id===current)
          ?current
          :next?.standards[0]?.id||""
      );
    }
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  const latestCycle=workspace?.cycles[0]||null;
  const dueStandards=useMemo(
    ()=>workspace?.standards.filter(item=>item.review_due)||[],
    [workspace]
  );
  const openCandidates=useMemo(
    ()=>workspace?.candidates.filter(item=>["proposed","needs_evidence","ready_for_governance"].includes(item.status))||[],
    [workspace]
  );

  async function action(key:string,work:()=>Promise<void>){
    await run(key,async()=>{
      setError("");
      await work();
      await load();
    }).catch(error=>{
      setError(error instanceof Error?error.message:"Governance improvement action failed.");
    });
  }

  async function runCycle(){
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage)return;
    await action("run-governance-cycle",async()=>{
      setNotice("Recording governed 90-day improvement snapshot…");
      const {error}=await supabase.rpc("run_governance_improvement_cycle_v1",{
        target_project:projectId,
        target_window_days:90
      });
      if(error)throw error;
      setNotice("Governance review snapshot recorded. Signals are review evidence only; no governance rule changed.");
    });
  }

  async function recordObservation(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase)return;
    await action("record-governance-observation",async()=>{
      const {error}=await supabase.rpc("record_governance_observation_v1",{
        target_project:projectId,
        target_source_kind:observationKind,
        target_summary:observationSummary.trim(),
        target_severity:observationSeverity,
        target_confidence:null,
        target_source_ref:observationSourceRef.trim()||null,
        target_evidence:{source:"governance_improvement_workspace"},
        target_observed_at:new Date().toISOString()
      });
      if(error)throw error;
      setObservationSummary("");
      setObservationSourceRef("");
      setNotice("Governance observation recorded as append-only evidence.");
    });
  }

  async function createCandidate(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase)return;
    const standardRefs=candidateStandards
      .split(",")
      .map(item=>item.trim())
      .filter(Boolean);
    const observationIds=candidateObservation?[candidateObservation]:[];
    await action("create-governance-improvement",async()=>{
      const {error}=await supabase.rpc("create_governance_improvement_candidate_v1",{
        target_project:projectId,
        target_title:candidateTitle.trim(),
        target_problem_statement:candidateProblem.trim(),
        target_hypothesis:candidateHypothesis.trim(),
        target_desired_outcome:candidateOutcome.trim(),
        target_source_observation_ids:observationIds,
        target_standard_refs:standardRefs,
        target_risk_class:candidateRisk,
        target_confidence:null,
        target_proposed_change:{source:"human_governance_improvement"},
        target_guardrails:{preserve_sovereign_governance:true}
      });
      if(error)throw error;
      setCandidateTitle("");
      setCandidateProblem("");
      setCandidateHypothesis("");
      setCandidateOutcome("");
      setCandidateStandards("");
      setNotice("Improvement candidate recorded. It has no governance effect until human review and the formal proposal process.");
    });
  }

  async function reviewCandidate(candidate:Candidate,decision:"needs_evidence"|"ready_for_governance"|"dismissed"){
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage)return;
    const rationale=(reviewRationales[candidate.id]||"").trim();
    if(rationale.length<3){
      setError("Enter a review rationale before recording the decision.");
      return;
    }
    await action("review-governance-improvement:"+candidate.id,async()=>{
      const {error}=await supabase.rpc("review_governance_improvement_candidate_v1",{
        target_candidate:candidate.id,
        target_decision:decision,
        target_rationale:rationale,
        target_evidence:{source:"governance_improvement_workspace"}
      });
      if(error)throw error;
      setReviewRationales(current=>({...current,[candidate.id]:""}));
      setNotice("Improvement review recorded. Formal governance authority remains unchanged.");
    });
  }

  async function routeCandidate(candidate:Candidate){
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage)return;
    await action("route-governance-improvement:"+candidate.id,async()=>{
      const {error}=await supabase.rpc("convert_governance_improvement_to_proposal_v1",{
        target_candidate:candidate.id,
        target_proposal_type:"process_change"
      });
      if(error)throw error;
      setNotice("Improvement routed into a normal Governance proposal. It still requires formal voting and decision controls.");
    });
  }

  async function reviewStandard(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage||!standardId)return;
    await action("review-governance-standard:"+standardId,async()=>{
      const {error}=await supabase.rpc("review_governance_standard_v1",{
        target_standard:standardId,
        target_applicability_state:standardState,
        target_rationale:standardRationale.trim(),
        target_review_days:90,
        target_metadata:{source:"governance_improvement_workspace"}
      });
      if(error)throw error;
      setStandardRationale("");
      setNotice("Standards assessment versioned. This records applicability review, not ISO certification.");
    });
  }

  async function recordControlEvidence(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!workspace?.can_record_control_evidence||!controlEvidenceControlId)return;
    await action("record-control-evidence:"+controlEvidenceControlId,async()=>{
      const {error}=await supabase.rpc("record_governance_control_evidence_v1",{
        target_control:controlEvidenceControlId,
        target_evidence_kind:controlEvidenceKind,
        target_evidence_ref:controlEvidenceRef.trim(),
        target_summary:controlEvidenceSummary.trim(),
        target_evidence_state:controlEvidenceState,
        target_evidence_digest:null,
        target_provenance:{source:"governance_improvement_workspace"},
        target_observed_at:new Date().toISOString()
      });
      if(error)throw error;
      setControlEvidenceRef("");
      setControlEvidenceSummary("");
      setControlEvidenceState("observed");
      setNotice("Control evidence recorded as append-only provenance. Evidence does not create governance authority or a conformity claim.");
    });
  }

  async function recordStandardsWatch(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!workspace?.can_manage||!watchStandardId)return;
    await action("record-standards-watch:"+watchStandardId,async()=>{
      const {error}=await supabase.rpc("record_governance_standard_watch_event_v1",{
        target_standard:watchStandardId,
        target_event_type:watchEventType,
        target_source_url:watchSourceUrl.trim(),
        target_summary:watchSummary.trim(),
        target_observed_edition:watchObservedEdition.trim()||null,
        target_evidence:{source:"governance_improvement_workspace"},
        target_observed_at:new Date().toISOString()
      });
      if(error)throw error;
      setWatchSourceUrl("");
      setWatchObservedEdition("");
      setWatchSummary("");
      setNotice("Standards lifecycle evidence recorded. The standards register and applicability state were not changed automatically.");
    });
  }

  if(loading)return <section className="panel"><p className="muted">Loading continuous governance evidence…</p></section>;
  if(!workspace)return <section className="panel"><p className="muted">Continuous governance workspace is unavailable.</p></section>;

  return <div>
    <section className="heroPanel">
      <div>
        <p className="eyebrow">CONTINUOUS GOVERNANCE OPTIMIZATION</p>
        <h2>Learn about governance without learning around governance</h2>
        <p>
          Evidence sensors detect standards drift, operational outcomes, disputes and improvement opportunities.
          The learning layer can create reviewed proposals, but it cannot vote, decide, ratify, grant authority or rewrite history.
        </p>
        <div className="heroActions">
          <button className="secondaryButton compact" onClick={()=>void load()}>Refresh evidence</button>
          {workspace.can_manage&&<button className="primaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void runCycle()}>
            Record 90-day review snapshot
          </button>}
        </div>
      </div>
    </section>

    <section className="metricGrid">
      <article className="metricCard"><span>Standards tracked</span><strong>{workspace.standards.length}</strong><small>{dueStandards.length} due for DataNest review</small></article>
      <article className="metricCard"><span>Controls mapped</span><strong>{workspace.controls.length}</strong><small>{workspace.control_evidence.length} provenance links</small></article>
      <article className="metricCard"><span>Standards watch</span><strong>{workspace.standard_watch.length}</strong><small>Lifecycle observations</small></article>
      <article className="metricCard"><span>Evidence observations</span><strong>{workspace.observations.length}</strong><small>Append-only review evidence</small></article>
      <article className="metricCard"><span>Open improvements</span><strong>{openCandidates.length}</strong><small>Non-authoritative hypotheses</small></article>
      <article className="metricCard"><span>Review cycles</span><strong>{workspace.cycles.length}</strong><small>Longitudinal governance evidence</small></article>
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">GOVERNANCE CHANGE FIREWALL</p><h3>Authority boundaries</h3></div>
        <span className="badge good">ENFORCED</span>
      </div>
      <div className="manifestMeta">
        <span>learning can vote: no</span>
        <span>learning can close proposals: no</span>
        <span>learning can ratify: no</span>
        <span>evidence repetition raises truth: no</span>
      </div>
      <p className="muted">Human-reviewed improvements enter the existing Sovereign Governance proposal process; they never bypass it.</p>
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">CONTROL-EVIDENCE GRAPH</p><h3>Standards → controls → implementation → evidence</h3></div>
        <span className="countPill">{workspace.controls.length} controls</span>
      </div>
      <p className="muted">Mapped controls describe implementation intent and provenance. A mapped standard, passing test or repeated observation is not a conformity claim and does not increase authority.</p>
      {workspace.controls.length?<div className="manifestList">
        {workspace.controls.map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween">
            <div><b>{item.control_key} · {item.title}</b><small>{label(item.control_kind)} · v{item.version}</small></div>
            <span className="badge neutral">{item.evidence_count} evidence</span>
          </div>
          <p>{item.purpose}</p>
          <div className="manifestMeta">
            <span>standards · {item.standard_refs.join(", ")||"none"}</span>
            <span>latest evidence · {date(item.latest_evidence_at)}</span>
            <span>governance effect: no</span>
          </div>
          <small>implementation · {item.implementation_refs.join(" · ")||"not recorded"}</small>
        </article>)}
      </div>:<p className="muted">No active governance controls are mapped yet.</p>}

      {workspace.control_evidence.length>0&&<details className="quietDisclosure">
        <summary>Recent control evidence · {workspace.control_evidence.length}</summary>
        <div className="manifestList">
          {workspace.control_evidence.slice(0,20).map(item=><article className="manifestCard" key={item.id}>
            <div className="rowBetween"><b>{label(item.evidence_kind)}</b><span className="badge neutral">{label(item.evidence_state)}</span></div>
            <p>{item.summary}</p>
            <div className="manifestMeta"><span>{item.evidence_ref}</span><span>{item.trace_key}</span><span>{date(item.observed_at)}</span></div>
          </article>)}
        </div>
      </details>}

      {workspace.can_record_control_evidence&&workspace.controls.length>0&&<form className="settingsGrid" onSubmit={recordControlEvidence}>
        <label>Control<select value={controlEvidenceControlId} onChange={event=>setControlEvidenceControlId(event.target.value)}>
          {workspace.controls.map(item=><option key={item.id} value={item.id}>{item.control_key} · {item.title}</option>)}
        </select></label>
        <label>Evidence kind<select value={controlEvidenceKind} onChange={event=>setControlEvidenceKind(event.target.value)}>
          <option value="repository">Repository</option><option value="migration">Migration</option><option value="test">Test</option>
          <option value="workflow">Workflow</option><option value="deployment">Deployment</option><option value="observation">Observation</option>
          <option value="incident">Incident</option><option value="external_audit">External audit</option>
          <option value="certified_memory">Certified Memory</option><option value="manual">Manual</option>
        </select></label>
        <label>Evidence state<select value={controlEvidenceState} onChange={event=>setControlEvidenceState(event.target.value as ControlEvidence["evidence_state"])}>
          <option value="observed">Observed</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="superseded">Superseded</option>
        </select></label>
        <label>Evidence reference<input value={controlEvidenceRef} onChange={event=>setControlEvidenceRef(event.target.value)} placeholder="Commit, migration, test, workflow run, deployment or trace reference"/></label>
        <label>Evidence summary<textarea rows={3} value={controlEvidenceSummary} onChange={event=>setControlEvidenceSummary(event.target.value)} placeholder="State exactly what this evidence supports and its limitations."/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||!controlEvidenceControlId||controlEvidenceRef.trim().length<1||controlEvidenceSummary.trim().length<3}>Record control evidence</button>
      </form>}
    </section>

    {latestCycle&&<section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">LATEST REVIEW SNAPSHOT</p><h3>{latestCycle.trace_key}</h3></div>
        <span className="countPill">{date(latestCycle.created_at)}</span>
      </div>
      <div className="metricGrid">
        <article className="metricCard"><span>Proposals</span><strong>{metric(latestCycle.metrics.proposal_count)}</strong><small>Window activity</small></article>
        <article className="metricCard"><span>Decisions</span><strong>{metric(latestCycle.metrics.decision_count)}</strong><small>{metric(latestCycle.metrics.accepted_decision_count)} accepted</small></article>
        <article className="metricCard"><span>Distinct voters</span><strong>{metric(latestCycle.metrics.distinct_voter_count)}</strong><small>{metric(latestCycle.metrics.eligible_member_count)} current eligible members</small></article>
        <article className="metricCard"><span>Open disputes</span><strong>{metric(latestCycle.metrics.open_dispute_count)}</strong><small>Source records preserved</small></article>
      </div>
      {latestCycle.signals.length>0?<div className="manifestList">
        {latestCycle.signals.map((signal,index)=><article className="manifestCard" key={index}>
          <b>{label(String(signal.signal||"review signal"))}</b>
          <p>{String(signal.meaning||"Human review required.")}</p>
          <small>count {metric(signal.count)}</small>
        </article>)}
      </div>:<p className="muted">No deterministic review triggers were present in this snapshot. That is not a claim that governance is risk-free.</p>}
    </section>}

    <details className="panel quietDisclosure" open={dueStandards.length>0}>
      <summary>Living standards register · {workspace.standards.length} references</summary>
      <div className="manifestList">
        {workspace.standards.map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween">
            <div><b>{item.title}</b><small>{item.authority} · {item.edition} · v{item.version}</small></div>
            <span className={"badge "+(item.review_due?"warn":"neutral")}>{item.review_due?"REVIEW DUE":label(item.applicability_state)}</span>
          </div>
          <p>{item.rationale}</p>
          <div className="manifestMeta">
            <span>{item.standard_key}</span>
            <span>review by {date(item.review_after)}</span>
            <span>conformity claim: no</span>
          </div>
        </article>)}
      </div>
      {workspace.can_manage&&<form className="settingsGrid" onSubmit={reviewStandard}>
        <label>Standard<select value={standardId} onChange={event=>setStandardId(event.target.value)}>
          {workspace.standards.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>
        <label>Applicability<select value={standardState} onChange={event=>setStandardState(event.target.value as StandardItem["applicability_state"])}>
          <option value="reference">Reference</option>
          <option value="applicable">Applicable</option>
          <option value="monitor">Monitor</option>
          <option value="not_applicable">Not applicable</option>
        </select></label>
        <label>Assessment rationale<textarea rows={3} value={standardRationale} onChange={event=>setStandardRationale(event.target.value)} placeholder="Record scope, evidence checked, limitations and why this state applies."/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||!standardId||standardRationale.trim().length<3}>Record versioned standards review</button>
      </form>}
    </details>

    <details className="panel quietDisclosure" open={workspace.standard_watch.length>0}>
      <summary>Standards lifecycle watch · {workspace.standard_watch.length} observations</summary>
      <p className="muted">Record authoritative-source lifecycle changes as evidence. Watch events never rewrite the standards register, applicability, or certification state automatically.</p>
      {workspace.standard_watch.length>0&&<div className="manifestList">
        {workspace.standard_watch.slice(0,20).map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween">
            <div><b>{item.standard_key} · {label(item.event_type)}</b><small>{item.source_authority} · {date(item.observed_at)}</small></div>
            <span className="badge neutral">REVIEW EVIDENCE</span>
          </div>
          <p>{item.summary}</p>
          <div className="manifestMeta">
            <span>{item.observed_edition?("observed edition · "+item.observed_edition):"edition unchanged/unspecified"}</span>
            <span>{item.trace_key}</span>
            <span>automatic applicability change: no</span>
          </div>
        </article>)}
      </div>}
      {workspace.can_manage&&<form className="settingsGrid" onSubmit={recordStandardsWatch}>
        <label>Standard<select value={watchStandardId} onChange={event=>setWatchStandardId(event.target.value)}>
          {workspace.standards.map(item=><option key={item.id} value={item.id}>{item.title} · {item.edition}</option>)}
        </select></label>
        <label>Lifecycle event<select value={watchEventType} onChange={event=>setWatchEventType(event.target.value)}>
          <option value="status_checked">Status checked</option>
          <option value="revision_announced">Revision announced</option>
          <option value="new_edition_published">New edition published</option>
          <option value="amendment_published">Amendment published</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="superseded">Superseded</option>
          <option value="guidance_updated">Guidance updated</option>
          <option value="other">Other</option>
        </select></label>
        <label>Authoritative HTTPS source<input type="url" value={watchSourceUrl} onChange={event=>setWatchSourceUrl(event.target.value)} placeholder="https://official-authority.example/..."/></label>
        <label>Observed edition<input value={watchObservedEdition} onChange={event=>setWatchObservedEdition(event.target.value)} placeholder="Optional published/revision edition"/></label>
        <label>Lifecycle observation<textarea rows={3} value={watchSummary} onChange={event=>setWatchSummary(event.target.value)} placeholder="Describe the source-backed lifecycle change and what requires human review."/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||!watchStandardId||!watchSourceUrl.trim().toLowerCase().startsWith("https://")||watchSummary.trim().length<3}>Record standards watch evidence</button>
      </form>}
    </details>

    <details className="panel quietDisclosure">
      <summary>Record governance observation</summary>
      <form className="settingsGrid" onSubmit={recordObservation}>
        <label>Evidence source<select value={observationKind} onChange={event=>setObservationKind(event.target.value)}>
          <option value="manual">Manual review</option>
          <option value="stakeholder_feedback">Stakeholder feedback</option>
          {workspace.can_manage&&<>
            <option value="audit">Audit</option>
            <option value="external_audit">External audit</option>
            <option value="incident">Incident</option>
            <option value="metric">Metric</option>
            <option value="dispute">Dispute</option>
            <option value="decision_outcome">Decision outcome</option>
            <option value="standards_change">Standards change</option>
            <option value="certified_memory_review">Certified Memory review</option>
          </>}
        </select></label>
        <label>Severity<select value={observationSeverity} onChange={event=>setObservationSeverity(event.target.value)}>
          <option value="info">Info</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option>
        </select></label>
        <label>Source reference<input value={observationSourceRef} onChange={event=>setObservationSourceRef(event.target.value)} placeholder="Optional trace, audit finding, incident or document reference"/></label>
        <label>Observation<textarea rows={4} value={observationSummary} onChange={event=>setObservationSummary(event.target.value)} placeholder="What was observed? Separate facts from interpretation and uncertainty."/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||observationSummary.trim().length<3}>Record evidence</button>
      </form>
    </details>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">OBSERVATION LEDGER</p><h3>Governance evidence</h3></div><span className="countPill">{workspace.observations.length}</span></div>
      {workspace.observations.length?<div className="manifestList">
        {workspace.observations.slice(0,20).map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween"><b>{label(item.source_kind)}</b><span className={"badge "+(["high","critical"].includes(item.severity)?"warn":"neutral")}>{item.severity}</span></div>
          <p>{item.summary}</p>
          <div className="manifestMeta"><span>{item.trace_key}</span><span>{date(item.observed_at)}</span><span>authority change: no</span></div>
        </article>)}
      </div>:<p className="muted">No continuous-governance observations have been recorded yet.</p>}
    </section>

    <details className="panel quietDisclosure">
      <summary>Create evidence-linked improvement candidate</summary>
      <form className="settingsGrid" onSubmit={createCandidate}>
        <label>Title<input value={candidateTitle} onChange={event=>setCandidateTitle(event.target.value)} placeholder="Improvement hypothesis title"/></label>
        <label>Risk class<select value={candidateRisk} onChange={event=>setCandidateRisk(event.target.value)}>
          <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option>
        </select></label>
        <label>Source observation<select value={candidateObservation} onChange={event=>setCandidateObservation(event.target.value)}>
          <option value="">No observation selected</option>
          {workspace.observations.map(item=><option key={item.id} value={item.id}>{item.trace_key} · {item.summary.slice(0,80)}</option>)}
        </select></label>
        <label>Standards references<input value={candidateStandards} onChange={event=>setCandidateStandards(event.target.value)} placeholder="Comma-separated standard keys, e.g. iso-iec-42001-2023"/></label>
        <label>Problem statement<textarea rows={3} value={candidateProblem} onChange={event=>setCandidateProblem(event.target.value)} placeholder="Evidence-backed governance problem or opportunity"/></label>
        <label>Hypothesis<textarea rows={3} value={candidateHypothesis} onChange={event=>setCandidateHypothesis(event.target.value)} placeholder="What change might improve the outcome, and why?"/></label>
        <label>Desired outcome<textarea rows={3} value={candidateOutcome} onChange={event=>setCandidateOutcome(event.target.value)} placeholder="Observable result that would support or challenge the hypothesis"/></label>
        <button className="primaryButton" disabled={
          Boolean(activeAction)||
          candidateTitle.trim().length<3||
          candidateProblem.trim().length<3||
          candidateHypothesis.trim().length<3||
          candidateOutcome.trim().length<3||
          (!candidateObservation&&!candidateStandards.trim())
        }>Create non-authoritative candidate</button>
      </form>
    </details>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">IMPROVEMENT PIPELINE</p><h3>Evidence → human review → formal governance</h3></div><span className="countPill">{workspace.candidates.length}</span></div>
      {workspace.candidates.length?<div className="manifestList">
        {workspace.candidates.map(candidate=><article className="manifestCard" key={candidate.id}>
          <div className="rowBetween">
            <div><b>{candidate.title}</b><small>{candidate.trace_key} · {candidate.risk_class} risk</small></div>
            <span className={"badge "+(candidate.status==="ready_for_governance"?"good":"neutral")}>{label(candidate.status)}</span>
          </div>
          <p><b>Problem:</b> {candidate.problem_statement}</p>
          <p><b>Hypothesis:</b> {candidate.hypothesis}</p>
          <p><b>Desired outcome:</b> {candidate.desired_outcome}</p>
          <div className="manifestMeta">
            <span>{candidate.source_observation_ids.length} observation refs</span>
            <span>{candidate.standard_refs.length} standards refs</span>
            <span>governance effect: no</span>
          </div>
          {workspace.can_manage&&["proposed","needs_evidence","ready_for_governance"].includes(candidate.status)&&<>
            <label>Review rationale<input value={reviewRationales[candidate.id]||""} onChange={event=>setReviewRationales(current=>({...current,[candidate.id]:event.target.value}))} placeholder="Evidence checked, limitations and reason for the review decision"/></label>
            <div className="rowActions">
              <button className="secondaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void reviewCandidate(candidate,"needs_evidence")}>Needs evidence</button>
              <button className="secondaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void reviewCandidate(candidate,"ready_for_governance")}>Ready for governance</button>
              <button className="textButton" disabled={Boolean(activeAction)} onClick={()=>void reviewCandidate(candidate,"dismissed")}>Dismiss</button>
              {candidate.status==="ready_for_governance"&&<button className="primaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void routeCandidate(candidate)}>Open formal process-change proposal</button>}
            </div>
          </>}
          {candidate.linked_governance_proposal_id&&<small>Formal proposal {candidate.linked_governance_proposal_id}</small>}
        </article>)}
      </div>:<p className="muted">No governance improvement candidates have been recorded.</p>}
    </section>

    <p className="muted">
      Continuous learning here means continuous evidence and reviewability, not autonomous constitutional change.
      Formal adoption remains in Sovereign Governance.
    </p>
  </div>;
}
