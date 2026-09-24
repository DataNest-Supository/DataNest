"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import AiReconciliationPanel from "@/components/AiReconciliationPanel";

type Stakeholder = {
  user_id:string;
  email:string|null;
  status:string;
  origin:string;
  first_accepted_at:string|null;
  verified_points:number;
  accepted_points?:number;
  tracked_points:number;
  human_inputs:number;
  development_updates:number;
  tests_run:number;
  prompts_dispatched:number;
  ai_usage_units:number;
  verified_ai_usage_units?:number;
  declared_ai_credit_units:number;
  pending_contributions?:number;
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
  endpoint_host?:string|null;
  model:string;
  status:string;
  is_default:boolean;
  last_used_at:string|null;
  last_error:string|null;
  last_rotated_at?:string|null;
  updated_at:string;
};
type Contribution = {
  id:string;
  user_id:string;
  contribution_type:string;
  quantity:number;
  unit:string;
  points:number;
  proposed_points:number;
  monetary_value_minor:number|null;
  currency:string|null;
  verified:boolean;
  verification_source:string|null;
  evidence_state:string;
  contribution_state:string;
  scoring_state:string;
  accepted_by:string|null;
  accepted_at:string|null;
  metadata:Record<string,unknown>;
  created_at:string;
};
type BudgetStatus = {
  policy_id:string|null;
  daily_request_limit:number;
  monthly_token_limit:number;
  monthly_cost_limit_minor:number|null;
  max_output_tokens:number;
  concurrency_limit:number;
  allowed_providers:string[];
  allowed_models:string[];
  currency:string;
  daily_requests_used:number;
  monthly_tokens_used:number;
  monthly_cost_used_minor:number;
};
type AllowDomain = {project_id:string;hostname:string;active:boolean;created_at:string;updated_at:string};
type StakeHistory = {id:string;trigger_type:string;trigger_ref:string|null;snapshot:Summary;created_at:string};

const contributionColumns="id,user_id,contribution_type,quantity,unit,points,proposed_points,monetary_value_minor,currency,verified,verification_source,evidence_state,contribution_state,scoring_state,accepted_by,accepted_at,metadata,created_at";

function formatDate(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function money(minor:number|null|undefined,currency:string){
  if(minor==null)return "—";
  return (minor/100).toFixed(2)+" "+currency;
}
function stateTone(value:string){
  const v=value.toLowerCase();
  if(["accepted","scored","verified_usage","verified_activity","active"].includes(v))return "good";
  if(["rejected","failed","disabled","removed"].includes(v))return "bad";
  if(["reported","unscored","error","paused"].includes(v))return "warn";
  return "neutral";
}

export default function StakeholderDashboard({
  projectId,currentUserId,canManageStake
}:{
  projectId:string;
  currentUserId:string;
  canManageStake:boolean;
}){
  const [summary,setSummary]=useState<Summary|null>(null);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [pending,setPending]=useState<Contribution[]>([]);
  const [accepted,setAccepted]=useState<Contribution[]>([]);
  const [myContributions,setMyContributions]=useState<Contribution[]>([]);
  const [budget,setBudget]=useState<BudgetStatus|null>(null);
  const [allowlist,setAllowlist]=useState<AllowDomain[]>([]);
  const [history,setHistory]=useState<StakeHistory[]>([]);

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
  const [domainHost,setDomainHost]=useState("");
  const [dailyLimit,setDailyLimit]=useState("100");
  const [monthlyTokens,setMonthlyTokens]=useState("2000000");
  const [monthlyCost,setMonthlyCost]=useState("");
  const [maxOutput,setMaxOutput]=useState("4000");
  const [concurrency,setConcurrency]=useState("2");
  const [allowedModels,setAllowedModels]=useState("*");
  const [budgetCurrency,setBudgetCurrency]=useState("ZAR");

  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    setError("");

    const pendingQuery=canManageStake
      ? supabase.from("contribution_ledger").select(contributionColumns)
          .eq("project_id",projectId).eq("contribution_state","reported")
          .order("created_at",{ascending:false}).limit(50)
      : Promise.resolve({data:[],error:null});
    const acceptedQuery=canManageStake
      ? supabase.from("contribution_ledger").select(contributionColumns)
          .eq("project_id",projectId).eq("contribution_state","accepted")
          .eq("scoring_state","scored").order("accepted_at",{ascending:false}).limit(25)
      : Promise.resolve({data:[],error:null});

    const [summaryResult,connectionsResult,myResult,pendingResult,acceptedResult,budgetResult,allowResult,historyResult]=await Promise.all([
      supabase.rpc("get_stakeholder_summary",{target_project:projectId}),
      supabase.from("ai_provider_connections")
        .select("id,provider,label,api_base_url,endpoint_host,model,status,is_default,last_used_at,last_error,last_rotated_at,updated_at")
        .eq("project_id",projectId).eq("user_id",currentUserId)
        .order("updated_at",{ascending:false}),
      supabase.from("contribution_ledger").select(contributionColumns)
        .eq("project_id",projectId).eq("user_id",currentUserId)
        .order("created_at",{ascending:false}).limit(30),
      pendingQuery,
      acceptedQuery,
      supabase.rpc("get_ai_budget_status",{target_project:projectId}),
      supabase.from("ai_provider_domain_allowlist")
        .select("project_id,hostname,active,created_at,updated_at")
        .eq("project_id",projectId).order("hostname"),
      supabase.rpc("get_stake_history",{target_project:projectId})
    ]);

    const firstError=summaryResult.error||connectionsResult.error||myResult.error||
      pendingResult.error||acceptedResult.error||budgetResult.error||allowResult.error||historyResult.error;
    if(firstError){setError(firstError.message);return;}

    const nextSummary=(summaryResult.data||null) as Summary|null;
    setSummary(nextSummary);
    setPool(nextSummary?.stakeholder_pool_percent==null?"":String(nextSummary.stakeholder_pool_percent));
    setConnections((connectionsResult.data||[]) as Connection[]);
    setMyContributions((myResult.data||[]) as Contribution[]);
    setPending((pendingResult.data||[]) as Contribution[]);
    setAccepted((acceptedResult.data||[]) as Contribution[]);
    const nextBudget=(budgetResult.data||null) as BudgetStatus|null;
    setBudget(nextBudget);
    if(nextBudget){
      setDailyLimit(String(nextBudget.daily_request_limit));
      setMonthlyTokens(String(nextBudget.monthly_token_limit));
      setMonthlyCost(nextBudget.monthly_cost_limit_minor==null?"":String(nextBudget.monthly_cost_limit_minor/100));
      setMaxOutput(String(nextBudget.max_output_tokens));
      setConcurrency(String(nextBudget.concurrency_limit));
      setAllowedModels((nextBudget.allowed_models||["*"]).join(", "));
      setBudgetCurrency(nextBudget.currency||"ZAR");
    }
    setAllowlist((allowResult.data||[]) as AllowDomain[]);
    setHistory((historyResult.data||[]) as StakeHistory[]);
  },[projectId,currentUserId,canManageStake]);

  useEffect(()=>{void load()},[load]);

  useEffect(()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    const refresh=()=>void load();
    const channel=supabase.channel("stakeholder-integrity-"+projectId)
      .on("postgres_changes",{event:"*",schema:"public",table:"contribution_ledger",filter:"project_id=eq."+projectId},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"ai_usage_requests",filter:"project_id=eq."+projectId},refresh)
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[projectId,load]);

  async function connectProvider(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase)return;
    setBusy(true);setNotice("");setError("");
    const {data,error:invokeError}=await supabase.functions.invoke("manage-ai-provider-v2",{
      body:{action:"connect",projectId,provider,label,apiBaseUrl:endpoint,model,apiKey}
    });
    setBusy(false);
    if(invokeError){setError(invokeError.message);return;}
    const payload=(data||{}) as Record<string,unknown>;
    if(payload.error){setError(String(payload.error));return;}
    setApiKey("");
    setNotice("AI provider connected or rotated. Credentials remain server-side in Vault.");
    await load();
  }

  async function connectionAction(action:"disable"|"delete",connectionId:string){
    const supabase=getSupabase();
    if(!supabase)return;
    if(action==="delete"&&!window.confirm("Delete this AI connection and its encrypted Vault secret?"))return;
    const {data,error:invokeError}=await supabase.functions.invoke("manage-ai-provider-v2",{
      body:{action,projectId,connectionId}
    });
    if(invokeError){setError(invokeError.message);return;}
    const payload=(data||{}) as Record<string,unknown>;
    if(payload.error){setError(String(payload.error));return;}
    setNotice(action==="delete"?"AI connection and Vault secret deleted.":"AI connection disabled.");
    await load();
  }

  async function logExternalCredit(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase)return;
    const amount=creditAmount.trim()?Math.round(Number(creditAmount)*100):null;
    const {error:creditError}=await supabase.rpc("submit_external_ai_credit",{
      target_project:projectId,target_job:null,target_provider:creditProvider,
      target_quantity:Number(creditQuantity),target_unit:creditUnit,
      target_monetary_value_minor:amount,target_currency:amount==null?null:creditCurrency,
      target_note:creditNote||null
    });
    if(creditError){setError(creditError.message);return;}
    setCreditQuantity("1");setCreditAmount("");setCreditNote("");
    setNotice("External AI activity reported. It does not affect stake until independently accepted and scored.");
    await load();
  }

  async function acceptContribution(item:Contribution){
    const supabase=getSupabase();
    if(!supabase)return;
    if(item.user_id===currentUserId){setError("A stakeholder cannot approve their own contribution.");return;}
    const {error:acceptError}=await supabase.rpc("accept_contribution",{target_contribution:item.id});
    if(acceptError){setError(acceptError.message);return;}
    setNotice("Contribution independently accepted and scored under the current policy version.");
    await load();
  }

  async function rejectContribution(item:Contribution){
    const supabase=getSupabase();
    if(!supabase)return;
    if(item.user_id===currentUserId){setError("A stakeholder cannot review their own contribution.");return;}
    const reason=window.prompt("Reason for rejection:");
    if(!reason?.trim())return;
    const {error:rejectError}=await supabase.rpc("reject_contribution",{
      target_contribution:item.id,target_reason:reason.trim()
    });
    if(rejectError){setError(rejectError.message);return;}
    setNotice("Contribution rejected with an auditable reason.");
    await load();
  }

  async function reverseContribution(item:Contribution){
    const supabase=getSupabase();
    if(!supabase)return;
    const reason=window.prompt("Reason for reversal/correction:");
    if(!reason?.trim())return;
    const {error:reverseError}=await supabase.rpc("reverse_contribution",{
      target_contribution:item.id,target_reason:reason.trim()
    });
    if(reverseError){setError(reverseError.message);return;}
    setNotice("Reversal entry created. The original contribution remains in history.");
    await load();
  }

  async function savePool(){
    const supabase=getSupabase();
    if(!supabase)return;
    const value=pool.trim()===""?null:Number(pool);
    const {error:poolError}=await supabase.rpc("set_stakeholder_pool",{
      target_project:projectId,target_pool_percent:value
    });
    if(poolError){setError(poolError.message);return;}
    setNotice("Stakeholder pool saved as a new scoring-policy version.");
    await load();
  }

  async function addDomain(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!domainHost.trim())return;
    const {error:domainError}=await supabase.rpc("set_ai_provider_domain",{
      target_project:projectId,target_hostname:domainHost.trim().toLowerCase(),target_active:true
    });
    if(domainError){setError(domainError.message);return;}
    setDomainHost("");setNotice("Compatible AI provider hostname added to the server allowlist.");
    await load();
  }

  async function toggleDomain(domain:AllowDomain){
    const supabase=getSupabase();
    if(!supabase)return;
    if(domain.hostname==="api.openai.com"&&domain.active){
      setError("The canonical OpenAI API host remains enabled for OpenAI connections.");
      return;
    }
    const {error:domainError}=await supabase.rpc("set_ai_provider_domain",{
      target_project:projectId,target_hostname:domain.hostname,target_active:!domain.active
    });
    if(domainError){setError(domainError.message);return;}
    await load();
  }

  async function saveProjectBudget(){
    const supabase=getSupabase();
    if(!supabase)return;
    const models=allowedModels.split(",").map(x=>x.trim()).filter(Boolean);
    const {error:budgetError}=await supabase.rpc("set_ai_budget_policy",{
      target_project:projectId,target_user:null,
      target_daily_request_limit:Number(dailyLimit),
      target_monthly_token_limit:Number(monthlyTokens),
      target_monthly_cost_limit_minor:monthlyCost.trim()?Math.round(Number(monthlyCost)*100):null,
      target_max_output_tokens:Number(maxOutput),
      target_concurrency_limit:Number(concurrency),
      target_allowed_providers:["openai","openai_compatible"],
      target_allowed_models:models.length?models:["*"],
      target_currency:budgetCurrency
    });
    if(budgetError){setError(budgetError.message);return;}
    setNotice("Project AI budget policy updated.");
    await load();
  }

  return <div className="stakeholderWorkspace">
    <section className="sectionIntro">
      <p className="eyebrow">STAKEHOLDERS</p>
      <h2>Contribution Integrity & AI Spend</h2>
      <p>Usage evidence, accepted contribution, and scored value are separate states. Suggested stake remains non-binding and is calculated only from independently accepted, scored contribution.</p>
    </section>

    {notice&&<div className="notice goodNotice">{notice}</div>}
    {error&&<div className="notice errorNotice" role="alert">{error}</div>}

    <section className="metricGrid">
      <article className="metricCard"><span>Stakeholders</span><strong>{summary?.stakeholders?.length||0}</strong><small>Active contribution profiles</small></article>
      <article className="metricCard"><span>Stakeholder pool</span><strong>{summary?.stakeholder_pool_percent==null?"—":summary.stakeholder_pool_percent+"%"}</strong><small>Owner-defined · non-binding</small></article>
      <article className="metricCard"><span>AI requests today</span><strong>{budget?.daily_requests_used||0}</strong><small>{budget?.daily_request_limit??"—"} daily limit</small></article>
      <article className="metricCard"><span>Monthly AI tokens</span><strong>{budget?.monthly_tokens_used||0}</strong><small>{budget?.monthly_token_limit??"—"} limit</small></article>
      <article className="metricCard"><span>Monthly reconciled/known cost</span><strong>{money(budget?.monthly_cost_used_minor,budget?.currency||"ZAR")}</strong><small>{budget?.monthly_cost_limit_minor==null?"No cost ceiling configured":"Limit "+money(budget.monthly_cost_limit_minor,budget.currency)}</small></article>
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">CONTRIBUTION POOL</p><h3>Accepted contribution & suggested allocation</h3></div><span className="countPill">{summary?.formula_version||"—"}</span></div>
      {canManageStake&&<div className="stakePoolControl">
        <label>Stakeholder pool % <input type="number" min="0" max="100" step="0.01" value={pool} onChange={e=>setPool(e.target.value)} placeholder="Not allocated"/></label>
        <button className="secondaryButton compact" type="button" onClick={()=>void savePool()}>Save new policy version</button>
      </div>}
      <div className="stakeTable">
        <div className="stakeRow headerRow"><span>Stakeholder</span><span>Accepted pts</span><span>Tracked pts</span><span>Verified AI</span><span>Pending</span><span>Contribution share</span><span>Suggested product stake</span></div>
        {(summary?.stakeholders||[]).map(s=><div className="stakeRow" key={s.user_id}>
          <div><b>{s.email||s.user_id.slice(0,8)}</b><small>{s.origin} · {s.status}</small></div>
          <span>{Number(s.accepted_points??s.verified_points).toFixed(2)}</span>
          <span>{Number(s.tracked_points).toFixed(2)}</span>
          <span>{Number(s.verified_ai_usage_units??s.ai_usage_units).toFixed(2)}</span>
          <span>{s.pending_contributions??0}</span>
          <b>{Number(s.contribution_share_percent).toFixed(2)}%</b>
          <b>{s.suggested_product_stake_percent==null?"—":Number(s.suggested_product_stake_percent).toFixed(2)+"%"}</b>
        </div>)}
      </div>
      <p className="securityNote">Suggested stake is advisory only. It does not create, transfer, vest, or evidence legal ownership without a separate approved agreement.</p>
    </section>

    <section className="twoCol stakeholderCols">
      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">BYO AI</p><h3>Stakeholder-funded provider</h3></div></div>
        <p className="muted">OpenAI uses its canonical API endpoint. Other compatible providers require an owner/admin-approved hostname. Credentials are encrypted in Vault and are never returned to the browser.</p>
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
            <label>Model<input value={model} onChange={e=>setModel(e.target.value)} placeholder="Allowed provider model ID" required/></label>
            <label>API credential<input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Encrypted server-side" required/></label>
          </div>
          <button className="primaryButton" disabled={busy}>{busy?"Connecting…":"Connect / rotate provider"}</button>
        </form>
        <div className="connectionList">
          {connections.map(c=><article className="connectionCard" key={c.id}>
            <div className="rowBetween"><div><b>{c.label}</b><small>{c.provider} · {c.model}</small></div><span className={"badge "+stateTone(c.status)}>{c.status}</span></div>
            <p className="muted">{c.api_base_url}</p>
            <div className="manifestMeta"><span>Last used {formatDate(c.last_used_at)}</span><span>Rotated {formatDate(c.last_rotated_at||null)}</span>{c.is_default&&<span>Default</span>}</div>
            {c.last_error&&<p className="errorText">Last provider failure is stored as a sanitized status; reconnect/rotate to recover.</p>}
            <div className="rowActions">
              {c.status!=="disabled"&&<button className="textButton" type="button" onClick={()=>void connectionAction("disable",c.id)}>Disable</button>}
              <button className="textButton dangerText" type="button" onClick={()=>void connectionAction("delete",c.id)}>Delete + revoke secret</button>
            </div>
          </article>)}
          {!connections.length&&<div className="emptyState"><div>◎</div><h3>No provider connected</h3><p>Embedded UNIFI Copilot remains available without external spend.</p></div>}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">EXTERNAL AI ACTIVITY</p><h3>Report work performed outside DataNest</h3></div></div>
        <p className="muted">Use this for ChatGPT or another AI account used outside the integrated API path. Reported activity is never scored automatically and requires an independent owner/admin reviewer.</p>
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
          <label>Evidence note<textarea rows={3} value={creditNote} onChange={e=>setCreditNote(e.target.value)} placeholder="What development work did this usage support?"/></label>
          <button className="secondaryButton">Report external AI activity</button>
        </form>
        <div className="manifestList">
          {myContributions.slice(0,12).map(c=><article className="manifestCard" key={c.id}>
            <div className="rowBetween"><b>{c.contribution_type.replaceAll("_"," ")}</b><span className={"badge "+stateTone(c.contribution_state)}>{c.contribution_state.toUpperCase()}</span></div>
            <div className="manifestMeta">
              <span>{Number(c.quantity).toFixed(2)} {c.unit}</span>
              <span>{c.evidence_state.replaceAll("_"," ")}</span>
              <span>{c.scoring_state==="scored"?Number(c.points).toFixed(2)+" pts":Number(c.proposed_points).toFixed(2)+" proposed"}</span>
              <span>{formatDate(c.created_at)}</span>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    {canManageStake&&<section className="twoCol stakeholderCols">
      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">AI POLICY</p><h3>Project spend & output limits</h3></div></div>
        <div className="plannerForm">
          <div className="fieldRow">
            <label>Daily provider requests<input type="number" min="0" value={dailyLimit} onChange={e=>setDailyLimit(e.target.value)}/></label>
            <label>Monthly tokens<input type="number" min="0" value={monthlyTokens} onChange={e=>setMonthlyTokens(e.target.value)}/></label>
          </div>
          <div className="fieldRow">
            <label>Monthly cost ceiling<input type="number" min="0" step="0.01" value={monthlyCost} onChange={e=>setMonthlyCost(e.target.value)} placeholder="Optional"/></label>
            <label>Currency<input value={budgetCurrency} onChange={e=>setBudgetCurrency(e.target.value)} maxLength={3}/></label>
          </div>
          <div className="fieldRow">
            <label>Max output tokens/request<input type="number" min="1" value={maxOutput} onChange={e=>setMaxOutput(e.target.value)}/></label>
            <label>Concurrent provider calls<input type="number" min="1" value={concurrency} onChange={e=>setConcurrency(e.target.value)}/></label>
          </div>
          <label>Allowed models<input value={allowedModels} onChange={e=>setAllowedModels(e.target.value)} placeholder="*, or comma-separated exact model IDs"/></label>
          <button className="primaryButton" type="button" onClick={()=>void saveProjectBudget()}>Save project AI policy</button>
        </div>
      </div>
      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">OUTBOUND ALLOWLIST</p><h3>Compatible AI provider hosts</h3></div></div>
        <form className="surfaceForm compactPolicyForm" onSubmit={addDomain}>
          <label>Hostname<input value={domainHost} onChange={e=>setDomainHost(e.target.value)} placeholder="api.example.com" required/></label>
          <button className="secondaryButton">Allow hostname</button>
        </form>
        <div className="manifestList">
          {allowlist.map(d=><article className="manifestCard" key={d.hostname}>
            <div className="rowBetween"><b>{d.hostname}</b><button className="textButton" type="button" onClick={()=>void toggleDomain(d)}>{d.active?"Disable":"Enable"}</button></div>
            <small>{d.active?"Provider calls allowed":"Blocked"}</small>
          </article>)}
        </div>
      </div>
    </section>}

    {canManageStake&&<AiReconciliationPanel projectId={projectId}/>}

    {canManageStake&&pending.length>0&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">INDEPENDENT REVIEW</p><h3>Reported or verified activity awaiting acceptance</h3></div><span className="countPill">{pending.length} pending</span></div>
      <div className="manifestList">
        {pending.map(c=><article className="manifestCard" key={c.id}>
          <div className="rowBetween"><div><b>{String(c.metadata?.provider||c.contribution_type)}</b><small>{c.evidence_state.replaceAll("_"," ")} · {Number(c.proposed_points).toFixed(2)} proposed pts</small></div><span className={"badge "+stateTone(c.evidence_state)}>{c.evidence_state}</span></div>
          <p>User {c.user_id.slice(0,8)} · {Number(c.quantity).toFixed(2)} {c.unit}{c.monetary_value_minor!=null?" · "+money(c.monetary_value_minor,c.currency||""):""}</p>
          <div className="rowActions">
            <button className="primaryButton compact" type="button" disabled={c.user_id===currentUserId} onClick={()=>void acceptContribution(c)}>Accept + score</button>
            <button className="secondaryButton compact" type="button" disabled={c.user_id===currentUserId} onClick={()=>void rejectContribution(c)}>Reject</button>
          </div>
          {c.user_id===currentUserId&&<small>Independent reviewer required; self-approval is blocked.</small>}
        </article>)}
      </div>
    </section>}

    {canManageStake&&accepted.length>0&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">CORRECTIONS</p><h3>Recent accepted contributions</h3></div></div>
      <div className="manifestList">
        {accepted.map(c=><article className="manifestCard" key={c.id}>
          <div className="rowBetween"><div><b>{c.contribution_type.replaceAll("_"," ")}</b><small>{Number(c.points).toFixed(2)} pts · accepted {formatDate(c.accepted_at)}</small></div><button className="textButton" type="button" onClick={()=>void reverseContribution(c)}>Create reversal</button></div>
        </article>)}
      </div>
    </section>}

    {history.length>0&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">SCORING HISTORY</p><h3>Calculation snapshots</h3></div><span className="countPill">{history.length}</span></div>
      <div className="manifestList">
        {history.slice(0,8).map(h=><article className="manifestCard" key={h.id}>
          <div className="rowBetween"><b>{h.trigger_type.replaceAll("_"," ")}</b><small>{formatDate(h.created_at)}</small></div>
          <p>{h.snapshot.stakeholder_pool_percent==null?"No stakeholder pool":"Pool "+h.snapshot.stakeholder_pool_percent+"%"} · {h.snapshot.stakeholders?.length||0} stakeholders</p>
        </article>)}
      </div>
    </section>}
  </div>;
}
