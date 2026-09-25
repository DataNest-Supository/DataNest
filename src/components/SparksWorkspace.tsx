"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Balance={account_id:string;account_type:"project"|"platform"|"locked";project_id:string|null;balance:number};
type Service={
  id:string;service_key:string;service_version:number;name:string;description:string|null;
  spark_price:number;status:string;fulfillment_mode:string;terms:string|null;terms_version:string;
};
type Redemption={
  id:string;trace_key:string;user_id:string;service_id:string;service_key:string;service_version:number;
  service_name:string;quantity:number;unit_spark_price:number;total_sparks:number;status:string;
  request_note:string|null;resolution_note:string|null;requested_at:string;resolved_at:string|null;
};
type LedgerEntry={
  id:string;entry_type:string;amount:number;trace_key:string;policy_version:string;
  account_type:string;metadata:Record<string,unknown>;created_at:string;
};
type Workspace={
  policy:Record<string,unknown>;
  balances:Balance[];
  services:Service[];
  redemptions:Redemption[];
  ledger:LedgerEntry[];
  metrics:Record<string,number>;
  can_operate:boolean;
  can_manage_services:boolean;
  boundaries:Record<string,boolean>;
};

function fmt(value:unknown){
  const n=Number(value||0);
  return Number.isFinite(n)?new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(n):"0";
}
function date(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function label(value:string){return value.replaceAll("_"," ");}

export default function SparksWorkspace({
  projectId,currentUserId,canOperate,canManage,setNotice,setError
}:{
  projectId:string;
  currentUserId:string;
  canOperate:boolean;
  canManage:boolean;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [serviceKey,setServiceKey]=useState("");
  const [serviceName,setServiceName]=useState("");
  const [serviceDescription,setServiceDescription]=useState("");
  const [serviceTerms,setServiceTerms]=useState("");
  const [servicePrice,setServicePrice]=useState("100");
  const [selectedServiceId,setSelectedServiceId]=useState("");
  const [quantity,setQuantity]=useState("1");
  const [requestNote,setRequestNote]=useState("");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("get_sparks_workspace_v1",{target_project:projectId});
    if(error){
      setError(error.message);
      setWorkspace(null);
    }else{
      const next=(data||null) as Workspace|null;
      setWorkspace(next);
      if(next?.services?.length){
        setSelectedServiceId(current=>current&&next.services.some(item=>item.id===current)?current:next.services[0].id);
      }else{
        setSelectedServiceId("");
      }
    }
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  const projectBalance=useMemo(
    ()=>workspace?.balances.find(item=>item.account_type==="project"&&item.project_id===projectId)?.balance||0,
    [workspace,projectId]
  );
  const lockedBalance=useMemo(
    ()=>workspace?.balances.find(item=>item.account_type==="locked"&&item.project_id===projectId)?.balance||0,
    [workspace,projectId]
  );
  const platformBalance=useMemo(
    ()=>workspace?.balances.find(item=>item.account_type==="platform"&&item.project_id===null)?.balance||0,
    [workspace]
  );
  const selectedService=useMemo(
    ()=>workspace?.services.find(item=>item.id===selectedServiceId)||null,
    [workspace,selectedServiceId]
  );

  async function publishService(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!canManage)return;
    const price=Number(servicePrice);
    if(!serviceKey.trim()||!serviceName.trim()||!Number.isFinite(price)||price<=0)return;

    setBusy(true);setError("");
    const {error}=await supabase.rpc("publish_spark_service_v1",{
      target_project:projectId,
      target_service_key:serviceKey.trim().toLowerCase(),
      target_name:serviceName.trim(),
      target_spark_price:price,
      target_description:serviceDescription.trim()||null,
      target_terms:serviceTerms.trim()||null
    });
    if(error)setError(error.message);
    else{
      setServiceKey("");setServiceName("");setServiceDescription("");setServiceTerms("");setServicePrice("100");
      setNotice("Spark service published under the internal-utility policy.");
      await load();
    }
    setBusy(false);
  }

  async function requestRedemption(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!selectedService)return;
    const qty=Math.max(1,Math.min(100,Number(quantity)||1));

    setBusy(true);setError("");
    const {error}=await supabase.rpc("request_spark_redemption_v1",{
      target_service:selectedService.id,
      target_quantity:qty,
      target_request_key:crypto.randomUUID(),
      target_note:requestNote.trim()||null
    });
    if(error)setError(error.message);
    else{
      setQuantity("1");setRequestNote("");
      setNotice("Sparks reserved. They remain locked until the service is fulfilled or the request is cancelled.");
      await load();
    }
    setBusy(false);
  }

  async function cancelRedemption(id:string){
    const supabase=getSupabase();if(!supabase)return;
    setBusy(true);setError("");
    const {error}=await supabase.rpc("cancel_spark_redemption_v1",{
      target_redemption:id,target_reason:"Cancelled from the Sparks workspace."
    });
    if(error)setError(error.message);
    else{setNotice("Spark reservation released.");await load();}
    setBusy(false);
  }

  async function fulfillRedemption(id:string){
    const supabase=getSupabase();if(!supabase||!canOperate)return;
    setBusy(true);setError("");
    const {error}=await supabase.rpc("fulfill_spark_redemption_v1",{
      target_redemption:id,target_note:"Fulfilled from the Sparks workspace."
    });
    if(error)setError(error.message);
    else{setNotice("Spark service fulfilled; the locked Sparks were consumed.");await load();}
    setBusy(false);
  }

  if(loading)return <section className="panel"><p className="muted">Loading Sparks…</p></section>;
  if(!workspace)return <section className="panel"><p className="muted">Sparks workspace is unavailable.</p></section>;

  const metrics=workspace.metrics||{};
  const boundaries=workspace.boundaries||{};

  return <div>
    <section className="heroPanel">
      <div>
        <p className="eyebrow">SPARKS · INTERNAL UTILITY</p>
        <h2>Earned contribution utility, not money</h2>
        <p>Project Sparks are earned from governed contributions and may be reserved for approved Resonance services. They cannot be bought for cash, redeemed for cash, transferred peer-to-peer, traded, or used to change contribution history, ownership or royalties.</p>
        <div className="heroActions">
          <button className="secondaryButton compact" onClick={()=>void load()}>Refresh</button>
        </div>
      </div>
      <div className="stackDiagram">
        <div>Certified work <b>Earn</b></div><span>↓</span>
        <div>Project wallet <b>Spendable</b></div><span>↓</span>
        <div>Service request <b>Locked</b></div><span>↓</span>
        <div>Fulfillment <b>Consumed</b></div>
      </div>
    </section>

    <section className="metricGrid">
      <article className="metricCard"><span>Project Sparks</span><strong>{fmt(projectBalance)}</strong><small>Spendable internal utility</small></article>
      <article className="metricCard"><span>Locked Sparks</span><strong>{fmt(lockedBalance)}</strong><small>Reserved for pending services</small></article>
      <article className="metricCard"><span>Lifetime earned</span><strong>{fmt(metrics.lifetime_contribution_awards)}</strong><small>Certified contribution awards</small></article>
      <article className="metricCard"><span>Lifetime spent</span><strong>{fmt(metrics.lifetime_service_spend)}</strong><small>Fulfilled approved services</small></article>
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">ECONOMIC BOUNDARY</p><h3>Internal utility policy</h3></div>
        <span className="countPill">{String(workspace.policy?.policy_version||"internal-utility-v1")}</span>
      </div>
      <dl className="settingsList">
        <div><dt>Cash purchase</dt><dd>{boundaries.cash_purchase_enabled?"Enabled":"Disabled"}</dd></div>
        <div><dt>Cash redemption</dt><dd>{boundaries.cash_redemption_enabled?"Enabled":"Disabled"}</dd></div>
        <div><dt>Peer-to-peer transfer</dt><dd>{boundaries.p2p_transfer_enabled?"Enabled":"Disabled"}</dd></div>
        <div><dt>External transfer / secondary market</dt><dd>{boundaries.external_transfer_enabled||boundaries.secondary_market_enabled?"Enabled":"Disabled"}</dd></div>
        <div><dt>Platform Sparks</dt><dd>{fmt(platformBalance)} · reserved; platform spending is disabled in v1</dd></div>
        <div><dt>Contribution / ownership effects</dt><dd>None</dd></div>
      </dl>
      <p className="muted">Spending Sparks does not erase historical contribution points, change reputation, create legal ownership, or create a royalty entitlement.</p>
    </section>

    {canManage&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">SERVICE CATALOG</p><h3>Publish an approved project service</h3></div><span className="countPill">Owner / admin</span></div>
      <form onSubmit={publishService} className="settingsGrid">
        <label>Service key<input value={serviceKey} onChange={e=>setServiceKey(e.target.value)} placeholder="design-review"/></label>
        <label>Name<input value={serviceName} onChange={e=>setServiceName(e.target.value)} placeholder="Design review"/></label>
        <label>Spark price<input type="number" min="0.01" step="0.01" value={servicePrice} onChange={e=>setServicePrice(e.target.value)}/></label>
        <label>Description<input value={serviceDescription} onChange={e=>setServiceDescription(e.target.value)} placeholder="What the internal service provides"/></label>
        <label>Terms<input value={serviceTerms} onChange={e=>setServiceTerms(e.target.value)} placeholder="Internal fulfillment terms"/></label>
        <button className="primaryButton" disabled={busy||!serviceKey.trim()||!serviceName.trim()}>Publish service</button>
      </form>
    </section>}

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">REDEEM</p><h3>Approved project services</h3></div><span className="countPill">{workspace.services.length}</span></div>
      {workspace.services.length?<form onSubmit={requestRedemption} className="settingsGrid">
        <label>Service<select value={selectedServiceId} onChange={e=>setSelectedServiceId(e.target.value)}>
          {workspace.services.map(service=><option key={service.id} value={service.id}>{service.name+" · "+fmt(service.spark_price)+" Sparks"}</option>)}
        </select></label>
        <label>Quantity<input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
        <label>Request note<input value={requestNote} onChange={e=>setRequestNote(e.target.value)} placeholder="Optional context for fulfillment"/></label>
        <div>
          <p className="muted">{selectedService?.description||"Approved internal Resonance service."}</p>
          {selectedService?.terms&&<small>{selectedService.terms}</small>}
        </div>
        <button className="primaryButton" disabled={busy||!selectedServiceId}>
          Reserve {fmt((selectedService?.spark_price||0)*(Number(quantity)||1))} Sparks
        </button>
      </form>:<div className="emptyState"><div>◇</div><h3>No approved Spark services yet</h3><p>An owner/admin can publish project-scoped internal services. No cash checkout is available.</p></div>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">RESERVATIONS</p><h3>Service requests</h3></div><span className="countPill">{workspace.redemptions.length}</span></div>
      {workspace.redemptions.length?<div className="dataTable">
        <div className="dataRow headerRow"><span>Service</span><span>Sparks</span><span>Status</span><span>Requested</span><span>Action</span></div>
        {workspace.redemptions.map(item=><div className="dataRow" key={item.id}>
          <div><b>{item.service_name}</b><small>{item.trace_key}</small></div>
          <span>{fmt(item.total_sparks)}</span>
          <span>{label(item.status)}</span>
          <span>{date(item.requested_at)}</span>
          <span className="rowActions">
            {item.status==="held"&&item.user_id===currentUserId&&<button className="textButton" disabled={busy} onClick={()=>void cancelRedemption(item.id)}>Cancel</button>}
            {item.status==="held"&&canOperate&&<button className="textButton" disabled={busy} onClick={()=>void fulfillRedemption(item.id)}>Fulfill</button>}
          </span>
        </div>)}
      </div>:<div className="emptyState"><div>◇</div><h3>No Spark reservations</h3><p>Approved service requests will appear here with a DN-SPARK trace.</p></div>}
    </section>

    <section className="panel">
      <div className="panelHead"><div><p className="eyebrow">APPEND-ONLY LEDGER</p><h3>Your latest Spark entries</h3></div><span className="countPill">{workspace.ledger.length}</span></div>
      {workspace.ledger.length?<div className="dataTable">
        <div className="dataRow headerRow"><span>Trace</span><span>Entry</span><span>Account</span><span>Amount</span><span>Date</span></div>
        {workspace.ledger.map(item=><div className="dataRow" key={item.id}>
          <b>{item.trace_key}</b>
          <span>{label(item.entry_type)}</span>
          <span>{label(item.account_type)}</span>
          <span>{Number(item.amount)>0?"+":""}{fmt(item.amount)}</span>
          <span>{date(item.created_at)}</span>
        </div>)}
      </div>:<div className="emptyState"><div>◇</div><h3>No Spark ledger entries yet</h3><p>Certified contribution awards and governed service reservations will appear here.</p></div>}
      <p className="muted">Ledger entries are append-only. Corrections use compensating entries rather than editing history.</p>
    </section>
  </div>;
}
