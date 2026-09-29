"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSingleFlight } from "@/lib/singleFlight";

type Suggestion={
  id:string;trace_key:string;title:string;summary:string;source_kind:string;source_ref:string;
  source_observation_ids:string[];risk_class:"low"|"moderate"|"high"|"critical";expected_benefit:string|null;
  external_review_state:string;human_review_state:string;status:string;release_eligible:boolean;
  production_authority:boolean;deployment_authority:boolean;live_action_authority:boolean;updated_at:string;
};
type Review={
  id:string;suggestion_id:string;review_kind:"external"|"human";decision:string;reviewer_display_name:string;
  reviewer_org:string|null;rationale:string;evidence_ref:string|null;independence_attested:boolean;created_at:string;
};
type DossierDocument={
  id:string;document_key:string;title:string;document_kind:string;regulatory_scope:string[];current_revision:number;
  current_content_hash:string|null;current_source_ref:string|null;current_source_commit:string|null;updated_at:string;
};
type DossierRevision={
  id:string;document_id:string;revision:number;content_hash:string;source_ref:string;source_commit:string|null;
  change_summary:string;created_at:string;
};
type Opportunity={
  id:string;trace_key:string;title:string;problem_signal:string;opportunity_hypothesis:string;evidence_refs:string[];
  currency:string;projection_low:number;projection_base:number;projection_high:number;horizon_months:number;
  confidence:number;projection_indicator:string;projection_spread_pct:number|null;status:string;
  review_rationale:string|null;decision_authority:boolean;financial_commitment:boolean;updated_at:string;
};
type AuditObservation={id:string;trace_key:string;source_kind:string;source_ref:string|null;summary:string;severity:string;confidence:number|null;observed_at:string};
type Workspace={
  role:string|null;can_manage:boolean;can_contribute:boolean;suggestions:Suggestion[];reviews:Review[];
  dossier_documents:DossierDocument[];dossier_revisions:DossierRevision[];opportunities:Opportunity[];
  audit_observations:AuditObservation[];boundaries:Record<string,unknown>;
};

function date(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function label(value:string){return value.replaceAll("_"," ");}

export default function PlatformReviewPanel({projectId,setNotice,setError}:{projectId:string;setNotice:(value:string)=>void;setError:(value:string)=>void;}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true);
  const {activeAction,run}=useSingleFlight();

  const [suggestionTitle,setSuggestionTitle]=useState("");
  const [suggestionSummary,setSuggestionSummary]=useState("");
  const [suggestionSourceKind,setSuggestionSourceKind]=useState("self_audit");
  const [suggestionSourceRef,setSuggestionSourceRef]=useState("");
  const [suggestionObservationId,setSuggestionObservationId]=useState("");
  const [suggestionRisk,setSuggestionRisk]=useState("moderate");
  const [suggestionBenefit,setSuggestionBenefit]=useState("");

  const [reviewSuggestionId,setReviewSuggestionId]=useState("");
  const [reviewKind,setReviewKind]=useState<"external"|"human">("external");
  const [reviewDecision,setReviewDecision]=useState("accepted");
  const [reviewerName,setReviewerName]=useState("");
  const [reviewerOrg,setReviewerOrg]=useState("");
  const [reviewEvidenceRef,setReviewEvidenceRef]=useState("");
  const [reviewRationale,setReviewRationale]=useState("");
  const [reviewIndependence,setReviewIndependence]=useState(false);

  const [documentKey,setDocumentKey]=useState("");
  const [documentTitle,setDocumentTitle]=useState("");
  const [documentKind,setDocumentKind]=useState("controlled_document");
  const [documentScope,setDocumentScope]=useState("");
  const [documentHash,setDocumentHash]=useState("");
  const [documentSourceRef,setDocumentSourceRef]=useState("");
  const [documentSourceCommit,setDocumentSourceCommit]=useState("");
  const [documentSummary,setDocumentSummary]=useState("");

  const [opportunityTitle,setOpportunityTitle]=useState("");
  const [opportunitySignal,setOpportunitySignal]=useState("");
  const [opportunityHypothesis,setOpportunityHypothesis]=useState("");
  const [opportunityEvidence,setOpportunityEvidence]=useState("");
  const [opportunityCurrency,setOpportunityCurrency]=useState("ZAR");
  const [opportunityLow,setOpportunityLow]=useState("0");
  const [opportunityBase,setOpportunityBase]=useState("0");
  const [opportunityHigh,setOpportunityHigh]=useState("0");
  const [opportunityHorizon,setOpportunityHorizon]=useState("12");
  const [opportunityConfidence,setOpportunityConfidence]=useState("0.5");
  const [opportunityAssumptions,setOpportunityAssumptions]=useState("");

  const [opportunityReviewRationales,setOpportunityReviewRationales]=useState<Record<string,string>>({});

  const load=useCallback(async()=>{
    const supabase=getSupabase();if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("get_platform_review_workspace_v1",{target_project:projectId});
    if(error){setError(error.message);setWorkspace(null);}
    else{
      const raw=(data||null) as Partial<Workspace>|null;
      const next=raw?({
        ...raw,
        can_manage:Boolean(raw.can_manage),
        can_contribute:Boolean(raw.can_contribute),
        suggestions:raw.suggestions||[],
        reviews:raw.reviews||[],
        dossier_documents:raw.dossier_documents||[],
        dossier_revisions:raw.dossier_revisions||[],
        opportunities:raw.opportunities||[],
        audit_observations:raw.audit_observations||[],
        boundaries:raw.boundaries||{}
      } as Workspace):null;
      setWorkspace(next);
      setSuggestionObservationId(current=>current&&next?.audit_observations.some(item=>item.id===current)?current:next?.audit_observations[0]?.id||"");
      setReviewSuggestionId(current=>current&&next?.suggestions.some(item=>item.id===current)?current:next?.suggestions[0]?.id||"");
    }
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    const channel=supabase.channel("platform-dossier:"+projectId)
      .on("postgres_changes",{event:"*",schema:"public",table:"platform_dossier_documents",filter:"project_id=eq."+projectId},()=>void load())
      .on("postgres_changes",{event:"*",schema:"public",table:"platform_dossier_revisions",filter:"project_id=eq."+projectId},()=>void load())
      .on("postgres_changes",{event:"*",schema:"public",table:"platform_dossier_events",filter:"project_id=eq."+projectId},()=>void load())
      .subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[projectId,load]);

  async function action(key:string,work:()=>Promise<void>){
    await run(key,async()=>{setError("");await work();await load();}).catch(error=>{
      setError(error instanceof Error?error.message:"Platform review action failed.");
    });
  }

  async function createSuggestion(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase||!workspace?.can_contribute)return;
    await action("create-platform-update-suggestion",async()=>{
      const {error}=await supabase.rpc("create_platform_update_suggestion_v1",{
        target_project:projectId,target_title:suggestionTitle.trim(),target_summary:suggestionSummary.trim(),
        target_source_kind:suggestionSourceKind,target_source_ref:suggestionSourceRef.trim(),
        target_source_observation_ids:suggestionObservationId?[suggestionObservationId]:[],
        target_risk_class:suggestionRisk,target_suggested_change:{source:"platform_update_suggester"},
        target_expected_benefit:suggestionBenefit.trim()||null
      });
      if(error)throw error;
      setSuggestionTitle("");setSuggestionSummary("");setSuggestionSourceRef("");setSuggestionBenefit("");
      setNotice("Platform update suggestion recorded. External review evidence and human approval are both required before release eligibility.");
    });
  }

  async function recordReview(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage||!reviewSuggestionId)return;
    await action("record-platform-review:"+reviewSuggestionId,async()=>{
      const {error}=await supabase.rpc("record_platform_update_review_v1",{
        target_suggestion:reviewSuggestionId,target_review_kind:reviewKind,target_decision:reviewDecision,
        target_reviewer_display_name:reviewerName.trim(),target_reviewer_org:reviewerOrg.trim()||null,
        target_rationale:reviewRationale.trim(),target_evidence_ref:reviewEvidenceRef.trim()||null,
        target_independence_attested:reviewKind==="external"?reviewIndependence:false
      });
      if(error)throw error;
      setReviewRationale("");setReviewEvidenceRef("");
      if(reviewKind==="external"){setReviewerName("");setReviewerOrg("");setReviewIndependence(false);}
      setNotice(reviewKind==="external"
        ?"External review recorded. Human review is still required before release eligibility."
        :"Human review recorded. Release eligibility does not authorize production, deployment, or live action.");
    });
  }

  async function recordDossier(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase||!workspace?.can_contribute)return;
    await action("record-dossier-revision",async()=>{
      const {error}=await supabase.rpc("record_platform_dossier_revision_v1",{
        target_project:projectId,target_document_key:documentKey.trim(),target_title:documentTitle.trim(),
        target_document_kind:documentKind,target_regulatory_scope:documentScope.split(",").map(item=>item.trim()).filter(Boolean),
        target_content_hash:documentHash.trim().toLowerCase(),target_source_ref:documentSourceRef.trim(),
        target_source_commit:documentSourceCommit.trim()||null,target_change_summary:documentSummary.trim(),
        target_metadata:{source:"platform_dossier_ui"}
      });
      if(error)throw error;
      setDocumentHash("");setDocumentSourceRef("");setDocumentSourceCommit("");setDocumentSummary("");
      setNotice("Platform dossier revision recorded with immutable hash provenance and realtime traceability.");
    });
  }

  async function createOpportunity(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();if(!supabase||!workspace?.can_contribute)return;
    await action("create-business-opportunity",async()=>{
      const assumptions=opportunityAssumptions.split("\n").map(item=>item.trim()).filter(Boolean);
      const {error}=await supabase.rpc("create_business_opportunity_v1",{
        target_project:projectId,target_title:opportunityTitle.trim(),target_problem_signal:opportunitySignal.trim(),
        target_opportunity_hypothesis:opportunityHypothesis.trim(),
        target_evidence_refs:opportunityEvidence.split(",").map(item=>item.trim()).filter(Boolean),
        target_currency:opportunityCurrency.trim().toUpperCase(),target_projection_low:Number(opportunityLow),
        target_projection_base:Number(opportunityBase),target_projection_high:Number(opportunityHigh),
        target_horizon_months:Number(opportunityHorizon),target_confidence:Number(opportunityConfidence),
        target_assumptions:{items:assumptions}
      });
      if(error)throw error;
      setOpportunityTitle("");setOpportunitySignal("");setOpportunityHypothesis("");setOpportunityEvidence("");setOpportunityAssumptions("");
      setOpportunityLow("0");setOpportunityBase("0");setOpportunityHigh("0");
      setNotice("Business opportunity projection recorded as decision-support evidence, not a commitment.");
    });
  }

  async function reviewOpportunity(item:Opportunity,decision:"needs_evidence"|"reviewed"|"dismissed"){
    const supabase=getSupabase();if(!supabase||!workspace?.can_manage)return;
    const rationale=(opportunityReviewRationales[item.id]||"").trim();
    if(rationale.length<3){setError("Enter an opportunity review rationale.");return;}
    await action("review-business-opportunity:"+item.id,async()=>{
      const {error}=await supabase.rpc("review_business_opportunity_v1",{
        target_opportunity:item.id,target_decision:decision,target_rationale:rationale,target_evidence_refs:[]
      });
      if(error)throw error;
      setOpportunityReviewRationales(current=>({...current,[item.id]:""}));
      setNotice("Business opportunity review recorded. The projection still carries no decision or financial authority.");
    });
  }

  const releaseEligible=useMemo(()=>workspace?.suggestions.filter(item=>item.release_eligible)||[],[workspace]);

  if(loading)return <section className="panel"><p className="muted">Loading platform review evidence…</p></section>;
  if(!workspace)return <section className="panel"><p className="muted">Platform review workspace is unavailable.</p></section>;

  return <div>
    <section className="heroPanel">
      <div>
        <p className="eyebrow">PLATFORM REVIEW & REGULATORY TRACEABILITY</p>
        <h2>Suggest, review, trace, then release</h2>
        <p>Self-audit findings can become platform-update suggestions, but no suggestion can become release-eligible until independent external review evidence and authenticated human review are both recorded.</p>
        <div className="heroActions"><button className="secondaryButton compact" onClick={()=>void load()}>Refresh evidence</button></div>
      </div>
    </section>

    <section className="metricGrid">
      <article className="metricCard"><span>Update suggestions</span><strong>{workspace.suggestions.length}</strong><small>{releaseEligible.length} release-eligible after both reviews</small></article>
      <article className="metricCard"><span>Dossier documents</span><strong>{workspace.dossier_documents.length}</strong><small>{workspace.dossier_revisions.length} immutable revisions</small></article>
      <article className="metricCard"><span>Audit inputs</span><strong>{workspace.audit_observations.length}</strong><small>Self/external audit evidence available</small></article>
      <article className="metricCard"><span>Opportunities</span><strong>{workspace.opportunities.length}</strong><small>Evidence-bounded projection indicators</small></article>
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">RELEASE FIREWALL</p><h3>Human and external review remain separate from deployment</h3></div><span className="badge good">ENFORCED</span></div>
      <div className="manifestMeta">
        <span>external review before human approval: yes</span>
        <span>release eligibility = production authority: no</span>
        <span>release eligibility = deployment authority: no</span>
        <span>release eligibility = live action authority: no</span>
      </div>
    </section>

    {workspace.can_contribute&&<details className="panel quietDisclosure" open>
      <summary>Platform update suggester · post self-audit</summary>
      <form className="settingsGrid" onSubmit={createSuggestion}>
        <label>Title<input value={suggestionTitle} onChange={e=>setSuggestionTitle(e.target.value)} placeholder="Platform update suggestion"/></label>
        <label>Risk class<select value={suggestionRisk} onChange={e=>setSuggestionRisk(e.target.value)}><option>low</option><option>moderate</option><option>high</option><option>critical</option></select></label>
        <label>Source kind<select value={suggestionSourceKind} onChange={e=>setSuggestionSourceKind(e.target.value)}><option value="self_audit">Self audit</option><option value="external_audit">External audit</option><option value="governance_observation">Governance observation</option><option value="manual">Manual</option></select></label>
        <label>Audit observation<select value={suggestionObservationId} onChange={e=>setSuggestionObservationId(e.target.value)}><option value="">No linked observation</option>{workspace.audit_observations.map(item=><option key={item.id} value={item.id}>{item.trace_key} · {item.summary.slice(0,80)}</option>)}</select></label>
        <label>Source reference<input value={suggestionSourceRef} onChange={e=>setSuggestionSourceRef(e.target.value)} placeholder="Audit trace, report, run, commit, or evidence reference"/></label>
        <label>Expected benefit<input value={suggestionBenefit} onChange={e=>setSuggestionBenefit(e.target.value)} placeholder="Expected measurable benefit"/></label>
        <label>Suggestion<textarea rows={4} value={suggestionSummary} onChange={e=>setSuggestionSummary(e.target.value)} placeholder="Describe the proposed platform change, evidence basis, and uncertainty."/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||suggestionTitle.trim().length<3||suggestionSummary.trim().length<3||suggestionSourceRef.trim().length<3}>Create review-gated suggestion</button>
      </form>
    </details>}

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">UPDATE REVIEW QUEUE</p><h3>External review → human review → release eligibility</h3></div><span className="countPill">{workspace.suggestions.length}</span></div>
      {workspace.suggestions.length?<div className="manifestList">
        {workspace.suggestions.map(item=><article className="manifestCard" key={item.id}>
          <div className="rowBetween"><div><b>{item.title}</b><small>{item.trace_key} · {label(item.risk_class)} risk</small></div><span className={"badge "+(item.release_eligible?"good":"neutral")}>{label(item.status)}</span></div>
          <p>{item.summary}</p>
          {item.expected_benefit&&<p><b>Expected benefit:</b> {item.expected_benefit}</p>}
          <div className="manifestMeta"><span>external · {label(item.external_review_state)}</span><span>human · {label(item.human_review_state)}</span><span>updated · {date(item.updated_at)}</span></div>
          <small>production authority: no · deployment authority: no · live action authority: no</small>
        </article>)}
      </div>:<p className="muted">No platform update suggestions have been recorded.</p>}
    </section>

    {workspace.can_manage&&workspace.suggestions.length>0&&<details className="panel quietDisclosure">
      <summary>Record external or human review</summary>
      <form className="settingsGrid" onSubmit={recordReview}>
        <label>Suggestion<select value={reviewSuggestionId} onChange={e=>setReviewSuggestionId(e.target.value)}>{workspace.suggestions.map(item=><option key={item.id} value={item.id}>{item.trace_key} · {item.title}</option>)}</select></label>
        <label>Review kind<select value={reviewKind} onChange={e=>setReviewKind(e.target.value as "external"|"human")}><option value="external">External review</option><option value="human">Human approval review</option></select></label>
        <label>Decision<select value={reviewDecision} onChange={e=>setReviewDecision(e.target.value)}><option value="accepted">Accepted</option><option value="needs_changes">Needs changes</option><option value="rejected">Rejected</option></select></label>
        <label>Reviewer<input value={reviewerName} onChange={e=>setReviewerName(e.target.value)} placeholder={reviewKind==="external"?"Named external reviewer":"Human reviewer name"}/></label>
        <label>Reviewer organization<input value={reviewerOrg} onChange={e=>setReviewerOrg(e.target.value)} placeholder={reviewKind==="external"?"Independent reviewer organization":"Optional"}/></label>
        <label>Evidence reference<input value={reviewEvidenceRef} onChange={e=>setReviewEvidenceRef(e.target.value)} placeholder={reviewKind==="external"?"External review report / evidence reference":"Optional review evidence"}/></label>
        <label>Rationale<textarea rows={3} value={reviewRationale} onChange={e=>setReviewRationale(e.target.value)} placeholder="What was reviewed, limitations, and why this decision was reached."/></label>
        {reviewKind==="external"&&<label><input type="checkbox" checked={reviewIndependence} onChange={e=>setReviewIndependence(e.target.checked)}/> Reviewer independence verified for this review record</label>}
        <button className="primaryButton" disabled={Boolean(activeAction)||!reviewSuggestionId||reviewRationale.trim().length<3||(reviewKind==="external"&&(!reviewerName.trim()||!reviewerOrg.trim()||!reviewEvidenceRef.trim()||!reviewIndependence))}>Record review decision</button>
      </form>
    </details>}

    <details className="panel quietDisclosure" open={workspace.dossier_documents.length>0}>
      <summary>Platform dossier · realtime regulatory traceability</summary>
      <p className="muted">Each revision is append-only evidence with SHA-256 provenance. A dossier update is not regulatory approval, conformity, production release, or deployment evidence by itself.</p>
      {workspace.dossier_documents.length?<div className="manifestList">{workspace.dossier_documents.map(item=><article className="manifestCard" key={item.id}>
        <div className="rowBetween"><div><b>{item.title}</b><small>{item.document_key} · {label(item.document_kind)}</small></div><span className="badge neutral">v{item.current_revision}</span></div>
        <div className="manifestMeta"><span>{item.regulatory_scope.join(", ")||"scope not tagged"}</span><span>{item.current_content_hash?.slice(0,16)||"no hash"}…</span><span>{date(item.updated_at)}</span></div>
        <small>{item.current_source_ref||"No source reference"}{item.current_source_commit?" · "+item.current_source_commit:""}</small>
      </article>)}</div>:<p className="muted">No dossier documents have been registered.</p>}
      {workspace.can_contribute&&<form className="settingsGrid" onSubmit={recordDossier}>
        <label>Document key<input value={documentKey} onChange={e=>setDocumentKey(e.target.value)} placeholder="platform-architecture"/></label>
        <label>Title<input value={documentTitle} onChange={e=>setDocumentTitle(e.target.value)} placeholder="Platform architecture"/></label>
        <label>Kind<select value={documentKind} onChange={e=>setDocumentKind(e.target.value)}><option value="controlled_document">Controlled document</option><option value="policy">Policy</option><option value="architecture">Architecture</option><option value="procedure">Procedure</option><option value="release_evidence">Release evidence</option><option value="audit_report">Audit report</option><option value="risk_record">Risk record</option><option value="regulatory_record">Regulatory record</option><option value="other">Other</option></select></label>
        <label>Regulatory scope<input value={documentScope} onChange={e=>setDocumentScope(e.target.value)} placeholder="POPIA, ISO/IEC 27001, ISO/IEC 42001"/></label>
        <label>SHA-256 content hash<input value={documentHash} onChange={e=>setDocumentHash(e.target.value)} placeholder="64 hex characters"/></label>
        <label>Source reference<input value={documentSourceRef} onChange={e=>setDocumentSourceRef(e.target.value)} placeholder="docs/ARCHITECTURE.md or controlled external reference"/></label>
        <label>Source commit<input value={documentSourceCommit} onChange={e=>setDocumentSourceCommit(e.target.value)} placeholder="Optional Git commit SHA"/></label>
        <label>Change summary<textarea rows={3} value={documentSummary} onChange={e=>setDocumentSummary(e.target.value)} placeholder="What changed and why?"/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||documentKey.trim().length<2||documentTitle.trim().length<2||!/^[0-9a-fA-F]{64}$/.test(documentHash.trim())||documentSourceRef.trim().length<2||documentSummary.trim().length<3}>Record dossier revision</button>
      </form>}
    </details>

    <details className="panel quietDisclosure" open={workspace.opportunities.length>0}>
      <summary>Business Opportunity Identifier & Projection Indicator</summary>
      <p className="muted">Projection ranges require evidence references, explicit assumptions, horizon, and confidence. They are decision-support estimates only and never financial commitments.</p>
      {workspace.opportunities.length?<div className="manifestList">{workspace.opportunities.map(item=><article className="manifestCard" key={item.id}>
        <div className="rowBetween"><div><b>{item.title}</b><small>{item.trace_key} · {label(item.status)}</small></div><span className={"badge "+(item.projection_indicator==="evidence_supported"?"good":"neutral")}>{label(item.projection_indicator)}</span></div>
        <p><b>Signal:</b> {item.problem_signal}</p><p><b>Hypothesis:</b> {item.opportunity_hypothesis}</p>
        <div className="manifestMeta"><span>{item.currency} {Number(item.projection_low).toLocaleString()} low</span><span>{item.currency} {Number(item.projection_base).toLocaleString()} base</span><span>{item.currency} {Number(item.projection_high).toLocaleString()} high</span><span>{item.horizon_months} months</span><span>{Math.round(Number(item.confidence)*100)}% evidence confidence</span>{item.projection_spread_pct!==null&&<span>{item.projection_spread_pct}% range spread</span>}</div>
        <small>evidence refs · {item.evidence_refs.join(" · ")} · decision authority: no · financial commitment: no</small>
        {workspace.can_manage&&item.status!=="dismissed"&&<><label>Review rationale<input value={opportunityReviewRationales[item.id]||""} onChange={e=>setOpportunityReviewRationales(current=>({...current,[item.id]:e.target.value}))} placeholder="Evidence checked, uncertainty, and review decision"/></label><div className="rowActions"><button className="secondaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void reviewOpportunity(item,"needs_evidence")}>Needs evidence</button><button className="secondaryButton compact" disabled={Boolean(activeAction)} onClick={()=>void reviewOpportunity(item,"reviewed")}>Reviewed</button><button className="textButton" disabled={Boolean(activeAction)} onClick={()=>void reviewOpportunity(item,"dismissed")}>Dismiss</button></div></>}
      </article>)}</div>:<p className="muted">No business opportunities have been recorded.</p>}
      {workspace.can_contribute&&<form className="settingsGrid" onSubmit={createOpportunity}>
        <label>Opportunity title<input value={opportunityTitle} onChange={e=>setOpportunityTitle(e.target.value)} placeholder="Business opportunity"/></label>
        <label>Currency<input value={opportunityCurrency} onChange={e=>setOpportunityCurrency(e.target.value)} maxLength={3}/></label>
        <label>Problem / market signal<textarea rows={3} value={opportunitySignal} onChange={e=>setOpportunitySignal(e.target.value)} placeholder="Observed unmet need, demand signal, cost, trend, or operational friction."/></label>
        <label>Opportunity hypothesis<textarea rows={3} value={opportunityHypothesis} onChange={e=>setOpportunityHypothesis(e.target.value)} placeholder="What value could be created, for whom, and why?"/></label>
        <label>Evidence references<input value={opportunityEvidence} onChange={e=>setOpportunityEvidence(e.target.value)} placeholder="Comma-separated audit, market, customer, revenue, or operational evidence"/></label>
        <label>Low projection<input type="number" min="0" step="0.01" value={opportunityLow} onChange={e=>setOpportunityLow(e.target.value)}/></label>
        <label>Base projection<input type="number" min="0" step="0.01" value={opportunityBase} onChange={e=>setOpportunityBase(e.target.value)}/></label>
        <label>High projection<input type="number" min="0" step="0.01" value={opportunityHigh} onChange={e=>setOpportunityHigh(e.target.value)}/></label>
        <label>Horizon months<input type="number" min="1" max="120" value={opportunityHorizon} onChange={e=>setOpportunityHorizon(e.target.value)}/></label>
        <label>Evidence confidence · 0–1<input type="number" min="0" max="1" step="0.05" value={opportunityConfidence} onChange={e=>setOpportunityConfidence(e.target.value)}/></label>
        <label>Assumptions · one per line<textarea rows={4} value={opportunityAssumptions} onChange={e=>setOpportunityAssumptions(e.target.value)} placeholder={"Demand conversion remains stable\nNo material regulatory blocker\nDelivery capacity available"}/></label>
        <button className="primaryButton" disabled={Boolean(activeAction)||opportunityTitle.trim().length<3||opportunitySignal.trim().length<3||opportunityHypothesis.trim().length<3||!opportunityEvidence.trim()}>Record opportunity projection</button>
      </form>}
    </details>
  </div>;
}
