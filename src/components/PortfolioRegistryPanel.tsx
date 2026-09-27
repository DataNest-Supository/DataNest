"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  canApprovePortfolio,
  canProposePortfolio,
  portfolioClassificationLabel,
  portfolioKindLabel,
  portfolioLifecycleLabel,
  type PortfolioRegistryRow,
  type PortfolioRole
} from "@/lib/portfolioRegistry";

type ClassificationRow={
  id:string;portfolio_item_id:string;classification:string;target_product_id:string|null;
  status:string;rationale:string|null;evidence_reference:string|null;created_at:string;
};
type RelationshipRow={
  id:string;source_item_id:string;target_item_id:string;relationship_type:string;criticality:string;
  status:string;rationale:string|null;evidence_reference:string|null;created_at:string;
};

export default function PortfolioRegistryPanel({
  projectId,currentUserId,role,historicalRonsasProductId
}:{
  projectId:string;
  currentUserId:string;
  role:PortfolioRole;
  historicalRonsasProductId:string|null;
}){
  const [items,setItems]=useState<PortfolioRegistryRow[]>([]);
  const [classifications,setClassifications]=useState<ClassificationRow[]>([]);
  const [relationships,setRelationships]=useState<RelationshipRow[]>([]);
  const [query,setQuery]=useState("");
  const [selectedSlug,setSelectedSlug]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const supabase=getSupabase();
      if(!supabase){setLoading(false);setError("Portfolio Registry unavailable.");return;}
      setLoading(true);
      setError("");
      const [itemResult,classificationResult,relationshipResult]=await Promise.all([
        supabase.from("portfolio_registry_view").select("*").eq("project_id",projectId).order("name"),
        supabase.from("portfolio_classifications").select("id,portfolio_item_id,classification,target_product_id,status,rationale,evidence_reference,created_at").eq("project_id",projectId).order("created_at",{ascending:false}),
        supabase.from("portfolio_relationships").select("id,source_item_id,target_item_id,relationship_type,criticality,status,rationale,evidence_reference,created_at").eq("project_id",projectId).order("created_at",{ascending:false})
      ]);
      if(!active)return;
      const nextError=itemResult.error||classificationResult.error||relationshipResult.error;
      if(nextError){
        setError("Portfolio Registry unavailable. "+nextError.message);
        setItems([]);setClassifications([]);setRelationships([]);
      }else{
        const nextItems=(itemResult.data||[]) as PortfolioRegistryRow[];
        setItems(nextItems);
        setClassifications((classificationResult.data||[]) as ClassificationRow[]);
        setRelationships((relationshipResult.data||[]) as RelationshipRow[]);
        const requested=new URL(window.location.href).searchParams.get("item")||"";
        setSelectedSlug(current=>{
          if(requested&&nextItems.some(item=>item.slug===requested))return requested;
          if(current&&nextItems.some(item=>item.slug===current))return current;
          return nextItems[0]?.slug||"";
        });
      }
      setLoading(false);
    };
    void load();
    return()=>{active=false;};
  },[projectId]);

  useEffect(()=>{
    if(!selectedSlug)return;
    const url=new URL(window.location.href);
    if(url.searchParams.get("item")===selectedSlug)return;
    url.searchParams.set("section","portfolio");
    url.searchParams.set("item",selectedSlug);
    window.history.replaceState(window.history.state,"",url.toString());
  },[selectedSlug]);

  const visible=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return items;
    return items.filter(item=>[
      item.name,item.slug,item.item_kind,item.review_state,item.active_classification||"",item.current_lifecycle||""
    ].join(" ").toLowerCase().includes(needle));
  },[items,query]);

  const selected=items.find(item=>item.slug===selectedSlug)||visible[0]||null;
  const selectedClassifications=selected?classifications.filter(row=>row.portfolio_item_id===selected.id):[];
  const selectedRelationships=selected?relationships.filter(row=>row.source_item_id===selected.id||row.target_item_id===selected.id):[];
  const historicalParent=selected?.metadata?.historical_catalog;
  const aiSuggestion=selected?.metadata?.ai_suggestion;
  const permissionSummary=canApprovePortfolio(role)
    ?"May propose and approve governed portfolio changes."
    :canProposePortfolio(role)
      ?"May propose changes; owner/admin approval remains required."
      :"Read-only portfolio access.";

  return <section className="portfolioRegistry" aria-labelledby="portfolio-registry-title" data-current-user={currentUserId}>
    <div className="portfolioRegistryHead">
      <div>
        <p className="eyebrow">PORTFOLIO REGISTRY</p>
        <h2 id="portfolio-registry-title">Classify what exists without inventing ownership.</h2>
        <p>Products, candidates, applications, modules and capabilities retain separate identity, classification and lifecycle state.</p>
      </div>
      <span className="catalogLiveBadge">{loading?"SYNCING":items.length+" ITEMS"}</span>
    </div>
    <div className="portfolioPermissionNote">{permissionSummary}</div>
    {error&&<div className="catalogError" role="alert">{error}</div>}
    <label className="portfolioSearch">Search registry<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search items, kinds, lifecycle…"/></label>
    <div className="portfolioRegistryGrid">
      <nav className="portfolioRegistryList" aria-label="Portfolio items">
        {visible.map(item=><button type="button" key={item.id} className={item.slug===selected?.slug?"active":""} onClick={()=>setSelectedSlug(item.slug)}>
          <b>{item.name}</b>
          <span>{portfolioKindLabel(item.item_kind)}</span>
          <small>{portfolioClassificationLabel(item.active_classification)} · {portfolioLifecycleLabel(item.current_lifecycle)}</small>
        </button>)}
        {!loading&&!visible.length&&<div className="catalogEmpty">No Portfolio Items match this view.</div>}
      </nav>
      <div className="portfolioRegistryDetail">
        {selected?<>
          <div className="portfolioRegistryTitle">
            <div><p className="eyebrow">{portfolioKindLabel(selected.item_kind)}</p><h3>{selected.name}</h3><small>{selected.slug}</small></div>
            <div className="portfolioBadgeStack">
              <span>{portfolioClassificationLabel(selected.active_classification)}</span>
              <span>{portfolioLifecycleLabel(selected.current_lifecycle)}</span>
            </div>
          </div>
          {selected.review_state==="pending_review"&&<div className="portfolioPendingReview"><b>PENDING REVIEW</b><span>Architectural ownership has not yet been approved.</span></div>}
          <section><h4>Provenance</h4>
            <dl className="portfolioFacts">
              <div><dt>Source authority</dt><dd>{selected.source_authority||"Registry"}</dd></div>
              <div><dt>Source reference</dt><dd>{selected.source_reference||"—"}</dd></div>
              <div><dt>Historical RONSAS link</dt><dd>{historicalRonsasProductId&&historicalParent?"Recorded historically":"Not asserted"}</dd></div>
            </dl>
          </section>
          <section><h4>Product Lab evidence</h4><p>{selected.product_lab_surface_count} surfaces · {selected.product_lab_test_run_count} test runs</p></section>
          <section><h4>Relationships</h4>
            {selectedRelationships.length?<ul>{selectedRelationships.map(row=><li key={row.id}><b>{row.relationship_type.replaceAll("_"," ")}</b> · {row.criticality} · {row.status}</li>)}</ul>:<p>No governed relationships recorded.</p>}
          </section>
          <section><h4>Classification history</h4>
            {selectedClassifications.length?<ul>{selectedClassifications.map(row=><li key={row.id}>{portfolioClassificationLabel(row.classification as PortfolioRegistryRow["active_classification"])} · {row.status}</li>)}</ul>:<p>No approved or proposed classification recorded.</p>}
          </section>
          {aiSuggestion!=null&&<section className="portfolioAiSuggestion"><h4>AI suggestion · non-authoritative</h4><p>{String(aiSuggestion)}</p></section>}
        </>:<div className="catalogEmpty">Select a Portfolio Item.</div>}
      </div>
    </div>
  </section>;
}
