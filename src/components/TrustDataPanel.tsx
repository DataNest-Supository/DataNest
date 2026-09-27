"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Role="owner"|"admin"|"operator"|"viewer";

type RetentionPolicy={
  id:string;name:string;purpose:string;visibility_class:string;reuse_state:string;
  retention_days:number|null;post_retention_action:string;status:string;policy_version:string;
  proposed_by:string;approved_by:string|null;created_at:string;
};
type PolicyAssignment={
  id:string;object_type:string;object_id:string;visibility_class:string;reuse_state:string;
  purpose:string;status:string;created_at:string;
};
type ProviderProfile={
  id:string;provider_key:string;display_name:string;permitted_visibility_classes:string[];
  permitted_reuse_states:string[];permitted_purposes:string[];region_locality:string|null;
  retention_policy:string;training_reuse_policy:string;security_posture:string;
  contract_state:string;availability_state:string;evidence_reference:string|null;
  status:string;policy_version:string;proposed_by:string;approved_by:string|null;created_at:string;
};
type TrustManifest={
  id:string;scope_type:string;scope_id:string;manifest_version:string;publication_state:string;
  data_location_summary:string;access_policy_summary:string;learning_policy_summary:string;
  external_provider_policy_summary:string;retention_summary:string;export_portability_summary:string;
  audit_state_summary:string;governance_version_reference:string|null;evidence:Record<string,unknown>;
  created_by:string;approved_by:string|null;created_at:string;
};
type RetentionEvaluation={
  id:string;object_type:string;object_id:string;policy_version:string;evaluated_at:string;
  effective_age_days:number;proposed_action:string;reason:string;legal_hold:boolean;
  execution_authorized:boolean;trace_id:string;
};

const visibilityOptions=[
  ["public","Public"],["nest_private","Nest Private"],["project_restricted","Project Restricted"],
  ["organization_restricted","Organization Restricted"],["high_sensitivity","High Sensitivity"],["local_only","Local Only"]
] as const;

const reuseOptions=[
  ["runtime_only","Runtime Only"],["session_context","Session Context"],["project_learning_eligible","Project Learning Eligible"],
  ["project_certified_memory","Project Certified Memory"],["platform_learning_eligible","Platform Learning Eligible"],
  ["datanest_certified_knowledge","DataNest Certified Knowledge"],["publicly_reusable","Publicly Reusable"]
] as const;

function formatDate(value:string){
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}

function titleCase(value:string){
  return value.replaceAll("_"," ").replace(/\b\w/g,char=>char.toUpperCase());
}

export default function TrustDataPanel({
  projectId,currentUserId,role
}:{projectId:string;currentUserId:string;role:Role}){
  const [retentionPolicies,setRetentionPolicies]=useState<RetentionPolicy[]>([]);
  const [assignments,setAssignments]=useState<PolicyAssignment[]>([]);
  const [providerProfiles,setProviderProfiles]=useState<ProviderProfile[]>([]);
  const [manifests,setManifests]=useState<TrustManifest[]>([]);
  const [evaluations,setEvaluations]=useState<RetentionEvaluation[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const [retentionName,setRetentionName]=useState("Project working data");
  const [retentionPurpose,setRetentionPurpose]=useState("Governed project execution and evidence");
  const [retentionVisibility,setRetentionVisibility]=useState("project_restricted");
  const [retentionReuse,setRetentionReuse]=useState("project_learning_eligible");
  const [retentionDays,setRetentionDays]=useState("90");
  const [retentionAction,setRetentionAction]=useState("review");
  const [retentionVersion,setRetentionVersion]=useState("phase-c-v1");

  const [providerKey,setProviderKey]=useState("openai");
  const [providerName,setProviderName]=useState("OpenAI");
  const [providerVisibility,setProviderVisibility]=useState("project_restricted");
  const [providerReuse,setProviderReuse]=useState("project_learning_eligible");
  const [providerPurpose,setProviderPurpose]=useState("datanest_ai");
  const [providerRegion,setProviderRegion]=useState("external");
  const [providerEvidence,setProviderEvidence]=useState("");
  const [providerVersion,setProviderVersion]=useState("phase-c-v1");

  const [manifestVersion,setManifestVersion]=useState("phase-c-v1");
  const [manifestEvidence,setManifestEvidence]=useState("");

  const canPropose=role!=="viewer";
  const canApprove=role==="owner"||role==="admin";
  const isOwner=role==="owner";

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    setLoading(true);
    setError("");
    const [retentionResult,assignmentResult,providerResult,manifestResult,evaluationResult]=await Promise.all([
      supabase.from("retention_policies")
        .select("id,name,purpose,visibility_class,reuse_state,retention_days,post_retention_action,status,policy_version,proposed_by,approved_by,created_at")
        .eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("data_policy_assignments")
        .select("id,object_type,object_id,visibility_class,reuse_state,purpose,status,created_at")
        .eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("provider_trust_profiles")
        .select("id,provider_key,display_name,permitted_visibility_classes,permitted_reuse_states,permitted_purposes,region_locality,retention_policy,training_reuse_policy,security_posture,contract_state,availability_state,evidence_reference,status,policy_version,proposed_by,approved_by,created_at")
        .eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("trust_manifests")
        .select("id,scope_type,scope_id,manifest_version,publication_state,data_location_summary,access_policy_summary,learning_policy_summary,external_provider_policy_summary,retention_summary,export_portability_summary,audit_state_summary,governance_version_reference,evidence,created_by,approved_by,created_at")
        .eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("retention_evaluations")
        .select("id,object_type,object_id,policy_version,evaluated_at,effective_age_days,proposed_action,reason,legal_hold,execution_authorized,trace_id")
        .eq("project_id",projectId).order("evaluated_at",{ascending:false}).limit(50)
    ]);
    const firstError=retentionResult.error||assignmentResult.error||providerResult.error||manifestResult.error||evaluationResult.error;
    if(firstError)setError(firstError.message);
    else{
      setRetentionPolicies((retentionResult.data||[]) as RetentionPolicy[]);
      setAssignments((assignmentResult.data||[]) as PolicyAssignment[]);
      setProviderProfiles((providerResult.data||[]) as ProviderProfile[]);
      setManifests((manifestResult.data||[]) as TrustManifest[]);
      setEvaluations((evaluationResult.data||[]) as RetentionEvaluation[]);
    }
    setLoading(false);
  },[projectId]);

  useEffect(()=>{void load()},[load]);

  const activePolicyCount=useMemo(
    ()=>retentionPolicies.filter(item=>item.status==="active").length,
    [retentionPolicies]
  );
  const activeProviderCount=useMemo(
    ()=>providerProfiles.filter(item=>item.status==="active").length,
    [providerProfiles]
  );

  async function runRpc(name:string,args:Record<string,unknown>,success:string){
    const supabase=getSupabase();
    if(!supabase)return null;
    setBusy(true);setNotice("");setError("");
    const {data,error:rpcError}=await supabase.rpc(name,args);
    setBusy(false);
    if(rpcError){setError(rpcError.message);return null;}
    setNotice(success);
    await load();
    return data;
  }

  async function proposeRetention(event:FormEvent){
    event.preventDefault();
    if(!canPropose)return;
    await runRpc("propose_retention_policy_v1",{
      target_project:projectId,
      target_name:retentionName,
      target_purpose:retentionPurpose,
      target_visibility_class:retentionVisibility,
      target_reuse_state:retentionReuse,
      target_retention_days:retentionDays.trim()?Number(retentionDays):null,
      target_post_retention_action:retentionAction,
      target_policy_version:retentionVersion
    },"Retention policy proposed for independent review.");
  }

  async function proposeProvider(event:FormEvent){
    event.preventDefault();
    if(!canPropose)return;
    await runRpc("propose_provider_trust_profile_v1",{
      target_project:projectId,
      target_provider_key:providerKey,
      target_display_name:providerName,
      target_permitted_visibility_classes:[providerVisibility],
      target_permitted_reuse_states:[providerReuse],
      target_permitted_purposes:[providerPurpose],
      target_region_locality:providerRegion||null,
      target_retention_policy:"Provider contract/policy must be verified before broader use.",
      target_training_reuse_policy:"No training or reuse permission is implied by processing.",
      target_security_posture:"Evidence-backed review required.",
      target_contract_state:"unverified",
      target_availability_state:"available",
      target_evidence_reference:providerEvidence||null,
      target_policy_version:providerVersion
    },"Provider Trust Profile proposed for independent review.");
  }

  async function createManifest(event:FormEvent){
    event.preventDefault();
    if(!canPropose)return;
    const evidence=manifestEvidence.trim()?{reference:manifestEvidence.trim()}:{};
    await runRpc("save_trust_manifest_draft_v1",{
      target_project:projectId,
      target_scope_type:"project",
      target_scope_id:projectId,
      target_manifest_version:manifestVersion,
      target_data_location_summary:"Supabase remains the governed production data authority; hosting is replaceable delivery infrastructure.",
      target_access_policy_summary:"Project access remains role- and RLS-governed.",
      target_learning_policy_summary:"Processing permission is independent from learning and reuse permission.",
      target_external_provider_policy_summary:"External provider routing requires an active Provider Trust Profile plus existing provider authorization.",
      target_retention_summary:"Retention follows classification, declared purpose, governance requirements, and applicable obligations.",
      target_export_portability_summary:"Portability claims remain limited to implemented, authorized export surfaces.",
      target_audit_state_summary:"Trust claims require attributable evidence and do not replace certification.",
      target_governance_version_reference:"2026-09-27-datanest-ecosystem-business-operating-architecture-design",
      target_evidence:evidence
    },"Trust Manifest draft created.");
  }

  return <div className="stakeholderWorkspace" aria-label="Trust & Data">
    <section className="sectionIntro">
      <p className="eyebrow">TRUST & DATA</p>
      <h2>Data policy, provider trust and retention review</h2>
      <p>Processing permission is not learning permission. Visibility and reuse are governed independently, and provider routing must satisfy both policy and existing authorization.</p>
      <p><strong>Retention evaluation is review-only and does not automatically delete data.</strong></p>
    </section>

    {notice&&<div className="notice goodNotice" role="status">{notice}</div>}
    {error&&<div className="notice errorNotice" role="alert">{error}</div>}
    {loading&&<div className="notice">Loading Trust & Data state…</div>}

    <section className="metricGrid" aria-label="Trust and data summary">
      <article className="metricCard"><span>Active retention policies</span><strong>{activePolicyCount}</strong><small>{retentionPolicies.length} recorded versions</small></article>
      <article className="metricCard"><span>Active provider profiles</span><strong>{activeProviderCount}</strong><small>Policy metadata only · no credentials</small></article>
      <article className="metricCard"><span>Policy assignments</span><strong>{assignments.length}</strong><small>Visibility + reuse remain separate</small></article>
      <article className="metricCard"><span>Retention reviews</span><strong>{evaluations.length}</strong><small>Execution authorized: 0 by design</small></article>
    </section>

    <section className="twoCol stakeholderCols">
      <div className="panel">
        <p className="eyebrow">POLICY VOCABULARY</p>
        <h3>Visibility / processing boundary</h3>
        <div className="policyGrid">
          {visibilityOptions.map(([value,label])=><article key={value}><b>{label}</b><small>{value}</small></article>)}
        </div>
      </div>
      <div className="panel">
        <p className="eyebrow">POLICY VOCABULARY</p>
        <h3>Reuse / learning state</h3>
        <div className="policyGrid">
          {reuseOptions.map(([value,label])=><article key={value}><b>{label}</b><small>{value}</small></article>)}
        </div>
      </div>
    </section>

    <section className="twoCol stakeholderCols">
      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">RETENTION</p><h3>Policy versions</h3></div><span className="countPill">{retentionPolicies.length}</span></div>
        {retentionPolicies.map(item=><div className="settingRow" key={item.id}>
          <div><b>{item.name}</b><small>{titleCase(item.visibility_class)} · {titleCase(item.reuse_state)} · {item.retention_days==null?"no fixed threshold":item.retention_days+" days"} · {item.post_retention_action}</small></div>
          <div>
            <span className="badge">{item.status.toUpperCase()}</span>
            {item.status==="proposed"&&canApprove&&item.proposed_by!==currentUserId&&
              <button className="textButton" type="button" disabled={busy||(item.post_retention_action==="delete_candidate"&&!isOwner)}
                onClick={()=>void runRpc("approve_retention_policy_v1",{target_policy:item.id},"Retention policy approved.")}>Approve</button>}
          </div>
        </div>)}
        {!retentionPolicies.length&&<p className="muted">No retention policy versions recorded yet.</p>}
      </div>

      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">PROVIDER TRUST</p><h3>Approved routing metadata</h3></div><span className="countPill">{providerProfiles.length}</span></div>
        {providerProfiles.map(item=><div className="settingRow" key={item.id}>
          <div><b>{item.display_name}</b><small>{item.provider_key} · {item.permitted_visibility_classes.map(titleCase).join(", ")} · {item.permitted_purposes.join(", ")}</small><small>No credentials are stored in this profile.</small></div>
          <div>
            <span className="badge">{item.status.toUpperCase()}</span>
            {item.status==="proposed"&&canApprove&&item.proposed_by!==currentUserId&&
              <button className="textButton" type="button" disabled={busy}
                onClick={()=>void runRpc("approve_provider_trust_profile_v1",{target_profile:item.id},"Provider Trust Profile approved.")}>Approve</button>}
          </div>
        </div>)}
        {!providerProfiles.length&&<p className="muted">No active provider route is trusted by Phase C policy until a profile is independently approved.</p>}
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">TRUST MANIFEST</p><h3>Evidence-backed trust statements</h3></div><span className="countPill">{manifests.length}</span></div>
      {manifests.map(item=><div className="settingRow" key={item.id}>
        <div><b>{item.scope_type.toUpperCase()} · {item.manifest_version}</b><small>{item.publication_state.toUpperCase()} · {Object.keys(item.evidence||{}).length} evidence field(s) · {formatDate(item.created_at)}</small></div>
        <div>
          {item.publication_state==="draft"&&canApprove&&item.created_by!==currentUserId&&
            <button className="textButton" type="button" disabled={busy}
              onClick={()=>void runRpc("approve_trust_manifest_v1",{target_manifest:item.id,target_public:false},"Trust Manifest approved for internal use.")}>Approve internal</button>}
          {item.publication_state==="draft"&&isOwner&&item.created_by!==currentUserId&&
            <button className="textButton" type="button" disabled={busy||Object.keys(item.evidence||{}).length===0}
              onClick={()=>void runRpc("approve_trust_manifest_v1",{target_manifest:item.id,target_public:true},"Trust Manifest published with evidence.")}>Publish</button>}
        </div>
      </div>)}
      {!manifests.length&&<p className="muted">No Trust Manifest exists yet. Public trust claims remain unavailable until evidence-backed approval.</p>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">POLICY ASSIGNMENTS</p><h3>Governed object policy</h3></div><span className="countPill">{assignments.length}</span></div>
      {assignments.slice(0,20).map(item=><div className="settingRow" key={item.id}>
        <div><b>{titleCase(item.object_type)}</b><small>{item.object_id.slice(0,8)} · {titleCase(item.visibility_class)} · {titleCase(item.reuse_state)} · {item.purpose}</small></div>
        <span className="badge">{item.status.toUpperCase()}</span>
      </div>)}
      {!assignments.length&&<p className="muted">No governed object policy assignments recorded yet.</p>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">RETENTION EVALUATION</p><h3>Review-only candidates</h3></div>
        {canPropose&&<button className="secondaryButton compact" type="button" disabled={busy}
          onClick={()=>void runRpc("run_retention_evaluation_v1",{target_project:projectId},"Retention evaluation recorded review candidates without mutating source data.")}>Run dry review</button>}
      </div>
      {evaluations.map(item=><div className="settingRow" key={item.id}>
        <div><b>{titleCase(item.proposed_action)}</b><small>{titleCase(item.object_type)} · age {item.effective_age_days} days · {item.reason}</small><small>{item.trace_id}</small></div>
        <span className="badge">{item.execution_authorized?"AUTHORIZED":"REVIEW ONLY"}</span>
      </div>)}
      {!evaluations.length&&<p className="muted">No objects currently recorded as retention review candidates.</p>}
    </section>

    {canPropose&&<section className="twoCol stakeholderCols">
      <form className="panel plannerForm" onSubmit={proposeRetention}>
        <p className="eyebrow">PROPOSE RETENTION POLICY</p>
        <h3>Human-reviewed lifecycle policy</h3>
        <label>Name<input value={retentionName} onChange={event=>setRetentionName(event.target.value)} required/></label>
        <label>Purpose<textarea rows={3} value={retentionPurpose} onChange={event=>setRetentionPurpose(event.target.value)} required/></label>
        <div className="fieldRow">
          <label>Visibility<select value={retentionVisibility} onChange={event=>setRetentionVisibility(event.target.value)}>{visibilityOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label>Reuse<select value={retentionReuse} onChange={event=>setRetentionReuse(event.target.value)}>{reuseOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        </div>
        <div className="fieldRow">
          <label>Days<input inputMode="numeric" value={retentionDays} onChange={event=>setRetentionDays(event.target.value)}/></label>
          <label>After threshold<select value={retentionAction} onChange={event=>setRetentionAction(event.target.value)}>
            <option value="retain">Retain</option><option value="review">Review</option><option value="archive_candidate">Archive candidate</option><option value="delete_candidate">Delete candidate</option>
          </select></label>
        </div>
        <label>Policy version<input value={retentionVersion} onChange={event=>setRetentionVersion(event.target.value)} required/></label>
        <button className="primaryButton compact" disabled={busy||(!isOwner&&retentionAction==="delete_candidate")}>Propose retention policy</button>
      </form>

      <form className="panel plannerForm" onSubmit={proposeProvider}>
        <p className="eyebrow">PROPOSE PROVIDER TRUST PROFILE</p>
        <h3>Policy metadata only</h3>
        <div className="fieldRow">
          <label>Provider key<input value={providerKey} onChange={event=>setProviderKey(event.target.value)} required/></label>
          <label>Display name<input value={providerName} onChange={event=>setProviderName(event.target.value)} required/></label>
        </div>
        <div className="fieldRow">
          <label>Permitted visibility<select value={providerVisibility} onChange={event=>setProviderVisibility(event.target.value)}>{visibilityOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label>Permitted reuse<select value={providerReuse} onChange={event=>setProviderReuse(event.target.value)}>{reuseOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        </div>
        <label>Purpose<input value={providerPurpose} onChange={event=>setProviderPurpose(event.target.value)} required/></label>
        <div className="fieldRow">
          <label>Region / locality<input value={providerRegion} onChange={event=>setProviderRegion(event.target.value)}/></label>
          <label>Policy version<input value={providerVersion} onChange={event=>setProviderVersion(event.target.value)} required/></label>
        </div>
        <label>Evidence reference<input value={providerEvidence} onChange={event=>setProviderEvidence(event.target.value)} placeholder="Contract, security review or policy evidence"/></label>
        <button className="primaryButton compact" disabled={busy}>Propose Provider Trust Profile</button>
      </form>
    </section>}

    {canPropose&&<form className="panel plannerForm" onSubmit={createManifest}>
      <p className="eyebrow">DRAFT TRUST MANIFEST</p>
      <h3>Project trust statement</h3>
      <p className="muted">A draft is not a public claim. Public publication requires independent owner approval and non-empty evidence.</p>
      <div className="fieldRow">
        <label>Manifest version<input value={manifestVersion} onChange={event=>setManifestVersion(event.target.value)} required/></label>
        <label>Evidence reference<input value={manifestEvidence} onChange={event=>setManifestEvidence(event.target.value)} placeholder="PR, audit, release or verification reference"/></label>
      </div>
      <button className="primaryButton compact" disabled={busy}>Create Trust Manifest draft</button>
    </form>}
  </div>;
}
