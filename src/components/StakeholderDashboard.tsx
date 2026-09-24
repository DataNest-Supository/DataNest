"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Stakeholder = {
  user_id:string;
  email:string|null;
  status:string;
  origin:string;
  first_accepted_at:string|null;
  verified_points:number;
  tracked_points:number;
  human_inputs:number;
  development_updates:number;
  tests_run:number;
  prompts_dispatched:number;
  ai_usage_units:number;
  declared_ai_credit_units:number;
  unverified_credit_entries:number;
  contribution_share_percent:number;
  suggested_product_stake_percent:number|null;
};

type Summary = {
  stakeholder_pool_percent:number|null;
  non_binding:boolean;
  formula_version:string;
  stakeholders:Stakeholder[];
};

type Connection = {
  id:string;
  provider:string;
  label:string;
  api_base_url:string;
  model:string;
  status:string;
  is_default:boolean;
  last_used_at:string|null;
  last_error:string|null;
  updated_at:string;
};

type Contribution = {
  id:string;
  user_id:string;
  contribution_type:string;
  quantity:number;
  unit:string;
  points:number;
  monetary_value_minor:number|null;
  currency:string|null;
  verified:boolean;
  verification_source:string|null;
  metadata:Record<string,unknown>;
  created_at:string;
};

function formatDate(value:string|null) {
  if(!value) return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}

export default function StakeholderDashboard({
  projectId,currentUserId,canManageStake
}:{
  projectId:string;
  currentUserId:string;
  canManageStake:boolean;
}) {
  const [summary,setSummary]=useState<Summary|null>(null);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [pending,setPending]=useState<Contribution[]>([]);
  const [myContributions,setMyContributions]=useState<Contribution[]>([]);
  const [provider,setProvider]=useState("openai");
  const [label,setLabel]=useState("My OpenAI");
  const [endpoint,setEndpoint]=useState("https://api.openai.com/v1/chat/completions");
  const [model,setModel]=useState("");
  const [apiKey,setApiKey]=useState("");
  const [creditProvider,setCreditProvider]=useState("ChatGPT / external AI");
  const [creditQuantity,setCreditQuantity]=useState("1");
  const [creditUnit,setCreditUnit]=useState("credit");
  const [creditAmount,setCreditAmount]=useState("");
  const [creditCurrency,setCreditCurrency]=useState("ZAR");
  const [creditNote,setCreditNote]=useState("");
  const [pool,setPool]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase) return;
    setError("");
    const [summaryResult,connectionsResult,myResult,pendingResult]=await Promise.all([
      supabase.rpc("get_stakeholder_summary",{target_project:projectId}),
      supabase.from("ai_provider_connections")
        .select("id,provider,label,api_base_url,model,status,is_default,last_used_at,last_error,updated_at")
        .eq("project_id",projectId)
        .eq("user_id",currentUserId)
        .order("updated_at",{ascending:false}),
      supabase.from("contribution_ledger")
        .select("id,user_id,contribution_type,quantity,unit,points,monetary_value_minor,currency,verified,verification_source,metadata,created_at")
        .eq("project_id",projectId)
        .eq("user_id",currentUserId)
        .order("created_at",{ascending:false})
        .limit(20),
      canManageStake
        ? supabase.from("contribution_ledger")
            .select("id,user_id,contribution_type,quantity,unit,points,monetary_value_minor,currency,verified,verification_source,metadata,created_at")
            .eq("project_id",projectId)
            .eq("verified",false)
            .order("created_at",{ascending:false})
            .limit(30)
        : Promise.resolve({data:[],error:null})
    ]);

    const firstError=summaryResult.error||connectionsResult.error||myResult.error||pendingResult.error;
    if(firstError){setError(firstError.message);return;}

    const next=(summaryResult.data||null) as Summary|null;
    setSummary(next);
    setPool(next?.stakeholder_pool_percent==null?"":String(next.stakeholder_pool_percent));
    setConnections((connectionsResult.data||[]) as Connection[]);
    setMyContributions((myResult.data||[]) as Contribution[]);
    setPending((pendingResult.data||[]) as Contribution[]);
  },[projectId,currentUserId,canManageStake]);

  useEffect(()=>{void load()},[load]);

  useEffect(()=>{
    const supabase=getSupabase();
    if(!supabase) return;
    const channel=supabase.channel("stakeholder-ledger-"+projectId)
      .on("postgres_changes",{event:"*",schema:"public",table:"contribution_ledger",filter:"project_id=eq."+projectId},()=>void load())
      .subscribe();
    return ()=>{void supabase.removeChannel(channel)};
  },[projectId,load]);

  async function connectProvider(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase) return;
    setBusy(true);setNotice("");setError("");
    const {data,error:invokeError}=await supabase.functions.invoke("manage-ai-provider",{
      body:{
        action:"connect",projectId,provider,label,
        apiBaseUrl:endpoint,model,apiKey
      }
    });
    setBusy(false);
    if(invokeError){setError(invokeError.message);return;}
    const payload=(data||{}) as Record<string,unknown>;
    if(payload.error){setError(String(payload.error));return;}
    setApiKey("");
    setNotice("AI provider connected. UNIFI Copilot will use this stakeholder account first.");
    await load();
  }

  async function disableConnection(connectionId:string){
    const supabase=getSupabase();
    if(!supabase) return;
    const {data,error:invokeError}=await supabase.functions.invoke("manage-ai-provider",{
      body:{action:"disable",projectId,connectionId}
    });
    if(invokeError){setError(invokeError.message);return;}
    const payload=(data||{}) as Record<string,unknown>;
    if(payload.error){setError(String(payload.error));return;}
    setNotice("AI provider connection disabled.");
    await load();
  }

  async function logExternalCredit(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase) return;
    const amount=creditAmount.trim()?Math.round(Number(creditAmount)*100):null;
    const {error:creditError}=await supabase.rpc("submit_external_ai_credit",{
      target_project:projectId,
      target_job:null,
      target_provider:creditProvider,
      target_quantity:Number(creditQuantity),
      target_unit:creditUnit,
      target_monetary_value_minor:amount,
      target_currency:amount==null?null:creditCurrency,
      target_note:creditNote||null
    });
    if(creditError){setError(creditError.message);return;}
    setCreditQuantity("1");setCreditAmount("");setCreditNote("");
    setNotice("External AI credit investment logged as unverified pending owner/admin review.");
    await load();
  }

  async function verifyContribution(id:string){
    const supabase=getSupabase();
    if(!supabase) return;
    const {error:verifyError}=await supabase.rpc("verify_contribution",{target_contribution:id});
    if(verifyError){setError(verifyError.message);return;}
    setNotice("Contribution verified and included in the contribution pool calculation.");
    await load();
  }

  async function savePool(){
    const supabase=getSupabase();
    if(!supabase) return;
    const value=pool.trim()===""?null:Number(pool);
    const {error:poolError}=await supabase.rpc("set_stakeholder_pool",{
      target_project:projectId,target_pool_percent:value
    });
    if(poolError){setError(poolError.message);return;}
    setNotice(value==null?"Stakeholder pool cleared.":"Stakeholder pool updated.");
    await load();
  }

  return <div className="stakeholderWorkspace">
    <section className="sectionIntro">
      <p className="eyebrow">STAKEHOLDERS</p>
      <h2>Contribution & AI Credit Ledger</h2>
      <p>Accepted collaborators become tracked stakeholders. Contribution Share is derived from verified activity; Suggested Product Stake is non-binding and only appears when an owner/admin sets a stakeholder pool.</p>
    </section>

    {notice&&<div className="notice goodNotice">{notice}</div>}
    {error&&<div className="notice errorNotice">{error}</div>}

    <section className="metricGrid">
      <article className="metricCard"><span>Stakeholders</span><strong>{summary?.stakeholders?.length||0}</strong><small>Active contribution profiles</small></article>
      <article className="metricCard"><span>Stakeholder pool</span><strong>{summary?.stakeholder_pool_percent==null?"—":summary.stakeholder_pool_percent+"%"}</strong><small>Owner-defined, non-binding</small></article>
      <article className="metricCard"><span>My AI connections</span><strong>{connections.filter(x=>x.status==="active").length}</strong><small>Vault-encrypted credentials</small></article>
      <article className="metricCard"><span>Pending credit reviews</span><strong>{canManageStake?pending.length:summary?.stakeholders?.find(x=>x.user_id===currentUserId)?.unverified_credit_entries||0}</strong><small>Unverified external AI investment</small></article>
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">CONTRIBUTION POOL</p><h3>Suggested stakeholder allocation</h3></div><span className="countPill">{summary?.formula_version||"—"}</span></div>
      {canManageStake&&<div className="stakePoolControl">
        <label>Stakeholder pool % <input type="number" min="0" max="100" step="0.01" value={pool} onChange={e=>setPool(e.target.value)} placeholder="Not allocated"/></label>
        <button className="secondaryButton compact" type="button" onClick={()=>void savePool()}>Save pool</button>
      </div>}
      <div className="stakeTable">
        <div className="stakeRow headerRow"><span>Stakeholder</span><span>Verified pts</span><span>Human</span><span>AI units</span><span>Tests</span><span>Contribution share</span><span>Suggested product stake</span></div>
        {(summary?.stakeholders||[]).map(s=><div className="stakeRow" key={s.user_id}>
          <div><b>{s.email||s.user_id.slice(0,8)}</b><small>{s.origin} · {s.status}</small></div>
          <span>{Number(s.verified_points).toFixed(2)}</span>
          <span>{s.human_inputs+s.development_updates+s.prompts_dispatched}</span>
          <span>{Number(s.ai_usage_units+s.declared_ai_credit_units).toFixed(2)}</span>
          <span>{s.tests_run}</span>
          <b>{Number(s.contribution_share_percent).toFixed(2)}%</b>
          <b>{s.suggested_product_stake_percent==null?"—":Number(s.suggested_product_stake_percent).toFixed(2)+"%"}</b>
        </div>)}
      </div>
      <p className="securityNote">Contribution and stake figures are advisory only. They do not create, transfer, vest, or evidence legal ownership without a separate approved agreement.</p>
    </section>

    <section className="twoCol stakeholderCols">
      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">BYO AI</p><h3>Use your own AI credit</h3></div></div>
        <p className="muted">Connect an OpenAI API or compatible provider. The credential is sent to a JWT-protected server function and stored encrypted in Supabase Vault; it is never returned to the browser.</p>
        <form className="plannerForm" onSubmit={connectProvider}>
          <div className="fieldRow">
            <label>Provider<select value={provider} onChange={e=>{
              setProvider(e.target.value);
              if(e.target.value==="openai")setEndpoint("https://api.openai.com/v1/chat/completions");
            }}><option value="openai">OpenAI API</option><option value="openai_compatible">OpenAI-compatible</option></select></label>
            <label>Connection label<input value={label} onChange={e=>setLabel(e.target.value)} required/></label>
          </div>
          <label>API endpoint<input type="url" value={endpoint} onChange={e=>setEndpoint(e.target.value)} required/></label>
          <div className="fieldRow">
            <label>Model<input value={model} onChange={e=>setModel(e.target.value)} placeholder="Provider model ID" required/></label>
            <label>API credential<input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Stored encrypted" required/></label>
          </div>
          <button className="primaryButton" disabled={busy}>{busy?"Connecting…":"Connect AI provider"}</button>
        </form>
        <div className="connectionList">
          {connections.map(c=><article className="connectionCard" key={c.id}>
            <div className="rowBetween"><div><b>{c.label}</b><small>{c.provider} · {c.model}</small></div><span className={"badge "+(c.status==="active"?"good":"warn")}>{c.status}</span></div>
            <p className="muted">{c.api_base_url}</p>
            <div className="manifestMeta"><span>Last used {formatDate(c.last_used_at)}</span>{c.is_default&&<span>Default</span>}</div>
            {c.last_error&&<p className="errorText">{c.last_error}</p>}
            {c.status!=="disabled"&&<button className="textButton" type="button" onClick={()=>void disableConnection(c.id)}>Disable</button>}
          </article>)}
          {!connections.length&&<div className="emptyState"><div>◎</div><h3>No provider connected</h3><p>Embedded UNIFI Copilot remains available.</p></div>}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">EXTERNAL AI CREDIT</p><h3>Log usage outside DataNest</h3></div></div>
        <p className="muted">Use this for development performed in your own ChatGPT or other AI account outside the integrated API connection. Self-reported entries do not affect the stake suggestion until an owner/admin verifies them.</p>
        <form className="plannerForm" onSubmit={logExternalCredit}>
          <label>AI account/provider<input value={creditProvider} onChange={e=>setCreditProvider(e.target.value)} required/></label>
          <div className="fieldRow">
            <label>Quantity<input type="number" min="0.0001" step="0.0001" value={creditQuantity} onChange={e=>setCreditQuantity(e.target.value)} required/></label>
            <label>Unit<input value={creditUnit} onChange={e=>setCreditUnit(e.target.value)} placeholder="credit / minute / message" required/></label>
          </div>
          <div className="fieldRow">
            <label>Optional value<input type="number" min="0" step="0.01" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} placeholder="0.00"/></label>
            <label>Currency<input value={creditCurrency} onChange={e=>setCreditCurrency(e.target.value)} maxLength={3}/></label>
          </div>
          <label>Note<textarea rows={3} value={creditNote} onChange={e=>setCreditNote(e.target.value)} placeholder="What development work did this AI usage support?"/></label>
          <button className="secondaryButton">Log external AI investment</button>
        </form>

        <div className="manifestList">
          {myContributions.slice(0,10).map(c=><article className="manifestCard" key={c.id}>
            <div className="rowBetween"><b>{c.contribution_type.replaceAll("_"," ")}</b><span className={"badge "+(c.verified?"good":"warn")}>{c.verified?"VERIFIED":"PENDING"}</span></div>
            <div className="manifestMeta"><span>{Number(c.quantity).toFixed(2)} {c.unit}</span><span>{Number(c.points).toFixed(2)} pts</span><span>{formatDate(c.created_at)}</span></div>
          </article>)}
        </div>
      </div>
    </section>

    {canManageStake&&pending.length>0&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">OWNER REVIEW</p><h3>Verify stakeholder credit investment</h3></div><span className="countPill">{pending.length} pending</span></div>
      <div className="manifestList">
        {pending.map(c=><article className="manifestCard" key={c.id}>
          <div className="rowBetween"><b>{String(c.metadata?.provider||c.contribution_type)}</b><button className="primaryButton compact" type="button" onClick={()=>void verifyContribution(c.id)}>Verify</button></div>
          <p>User {c.user_id.slice(0,8)} · {Number(c.quantity).toFixed(2)} {c.unit}{c.monetary_value_minor!=null?" · "+((c.monetary_value_minor/100).toFixed(2))+" "+(c.currency||""):""}</p>
          <small>{formatDate(c.created_at)}</small>
        </article>)}
      </div>
    </section>}
  </div>;
}
