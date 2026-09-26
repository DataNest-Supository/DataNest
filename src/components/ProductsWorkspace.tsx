"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";


type CatalogProduct = {
  id:string;
  slug:string;
  name:string;
  full_name:string|null;
  category:string|null;
  lifecycle_status:string|null;
  mission:string|null;
  operating_model:string|null;
  primary_runtime:string|null;
  commercial_mode:string|null;
  billing_enabled:boolean;
  as_of_date:string|null;
  metadata:Record<string,unknown>;
};

type CatalogRecord = {
  id:string;
  product_id:string;
  record_type:string;
  code:string|null;
  name:string|null;
  status:string|null;
  sort_order:number;
  payload:Record<string,unknown>;
};

const catalogRecordLabels:Record<string,string> = {
  application:"Applications",
  component:"Architecture components",
  source_authority:"Source authorities",
  environment:"Environments",
  integration:"Integrations",
  governance_control:"Governance controls",
  risk:"Risks & issues",
  roadmap_item:"Roadmap",
  decision:"Decisions",
  evidence:"Evidence",
  datanest_branch:"DataNest branches"
};

const catalogRecordOrder = [
  "application","component","source_authority","environment","integration",
  "governance_control","risk","roadmap_item","decision","evidence","datanest_branch"
];

function payloadText(payload:Record<string,unknown>,...keys:string[]) {
  for (const key of keys) {
    const value=payload[key];
    if (typeof value==="string" && value.trim()) return value;
  }
  return "";
}

type LegalTask = {
  key:string;
  label:string;
  prompt:string;
  response:string[];
};

const legalTasks:LegalTask[] = [
  {
    key:"contract",
    label:"Review a contract",
    prompt:"Help me understand a clause before I speak to a lawyer.",
    response:[
      "Translate the clause into plain language without changing its meaning.",
      "Separate obligations, rights, dates, money terms and termination triggers.",
      "Flag ambiguous wording or missing context for a qualified lawyer to review.",
      "Ask for the governing jurisdiction before discussing law-specific implications."
    ]
  },
  {
    key:"timeline",
    label:"Build a matter timeline",
    prompt:"Turn my notes and documents into a clear legal-event timeline.",
    response:[
      "Order events, communications and documents by date and source.",
      "Mark disputed, missing or unverified facts instead of treating them as established.",
      "Surface potential deadlines as items to verify, never as authoritative filing advice.",
      "Prepare a concise chronology that can be handed to qualified counsel."
    ]
  },
  {
    key:"counsel",
    label:"Prepare for counsel",
    prompt:"Help me make the most of a meeting with a qualified lawyer.",
    response:[
      "Summarize the issue, desired outcome and known constraints.",
      "Create a document checklist and a list of unresolved factual questions.",
      "Generate focused questions about options, cost, process, risk and next steps.",
      "Keep final legal conclusions and strategy decisions with the human professional."
    ]
  },
  {
    key:"research",
    label:"Legal research map",
    prompt:"Show me what legal topics and sources I should research.",
    response:[
      "Identify likely legal topics from the facts without claiming a definitive diagnosis.",
      "Separate statutes, regulations, court decisions, contracts and policy sources.",
      "Prioritize official and primary sources and record their date and jurisdiction.",
      "Mark every conclusion that needs current-law verification by a qualified professional."
    ]
  }
];

export default function ProductsWorkspace({projectId}:{projectId:string}){
  const [selectedTask,setSelectedTask]=useState<LegalTask>(legalTasks[0]);
  const [catalogProducts,setCatalogProducts]=useState<CatalogProduct[]>([]);
  const [catalogRecords,setCatalogRecords]=useState<CatalogRecord[]>([]);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogError,setCatalogError]=useState("");

  useEffect(()=>{
    let active=true;
    const supabase=getSupabase();
    if(!supabase){setCatalogError("Product catalog is unavailable because the DataNest data connection is not configured.");setCatalogLoading(false);return;}

    setCatalogLoading(true);
    setCatalogError("");
    void Promise.all([
      supabase.from("products").select("id,slug,name,full_name,category,lifecycle_status,mission,operating_model,primary_runtime,commercial_mode,billing_enabled,as_of_date,metadata").eq("project_id",projectId).order("name"),
      supabase.from("product_records").select("id,product_id,record_type,code,name,status,sort_order,payload").eq("project_id",projectId).order("sort_order",{ascending:true})
    ]).then(([productResult,recordResult])=>{
      if(!active)return;
      const error=productResult.error||recordResult.error;
      if(error){setCatalogError(error.message);setCatalogProducts([]);setCatalogRecords([]);}
      else{
        setCatalogProducts((productResult.data||[]) as CatalogProduct[]);
        setCatalogRecords((recordResult.data||[]) as CatalogRecord[]);
      }
    }).finally(()=>{if(active)setCatalogLoading(false);});

    return()=>{active=false;};
  },[projectId]);

  const recordsByProduct=useMemo(()=>{
    const map=new Map<string,CatalogRecord[]>();
    for(const record of catalogRecords){
      const list=map.get(record.product_id)||[];
      list.push(record);
      map.set(record.product_id,list);
    }
    return map;
  },[catalogRecords]);

  return <div className="productsWorkspace">
    <section className="catalogStage" aria-labelledby="governed-catalog-title">
      <div className="catalogStageHead">
        <div>
          <p className="eyebrow">GOVERNED PRODUCT CATALOG</p>
          <h2 id="governed-catalog-title">Products that carry their architecture, evidence and decisions with them.</h2>
          <p>DataNest now treats each governed product as one traceable entity, with its applications, controls, risks, roadmap, evidence and promotion branches attached to the same product identity.</p>
        </div>
        <span className="catalogLiveBadge">{catalogLoading?"SYNCING":catalogProducts.length+" PRODUCT"+(catalogProducts.length===1?"":"S")}</span>
      </div>

      {catalogError&&<div className="catalogError" role="alert">{catalogError}</div>}
      {catalogLoading&&<div className="catalogLoading" role="status">Loading governed product records…</div>}
      {!catalogLoading&&!catalogError&&!catalogProducts.length&&<div className="catalogEmpty">No governed products have been imported for this project yet.</div>}

      <div className="catalogGrid">
        {catalogProducts.map((product,index)=>{
          const records=recordsByProduct.get(product.id)||[];
          const count=(type:string)=>records.filter(record=>record.record_type===type).length;
          const branches=records.filter(record=>record.record_type==="datanest_branch");
          return <article className="catalogProduct" key={product.id}>
            <div className="catalogProductTop">
              <div className="catalogIdentity">
                <span className="catalogOrdinal">{String(index+1).padStart(2,"0")}</span>
                <div>
                  <p className="productKicker">{product.category||"RESONANCE PRODUCT"}</p>
                  <h3>{product.name}</h3>
                  <p className="catalogFullName">{product.full_name}</p>
                </div>
              </div>
              <div className="catalogFlags">
                <span className="productStatus">{(product.lifecycle_status||"ACTIVE").toUpperCase()}</span>
                {!product.billing_enabled&&<span className="catalogInvariant">FREE PROMOTION · BILLING OFF</span>}
              </div>
            </div>

            <p className="catalogMission">{product.mission}</p>
            <div className="catalogFacts">
              <div><small>Runtime</small><b>{product.primary_runtime||"Governed runtime"}</b></div>
              <div><small>Applications</small><b>{count("application")}</b></div>
              <div><small>Components</small><b>{count("component")}</b></div>
              <div><small>Controls</small><b>{count("governance_control")}</b></div>
              <div><small>Open risks</small><b>{count("risk")}</b></div>
              <div><small>Roadmap</small><b>{count("roadmap_item")}</b></div>
            </div>

            {branches.length>0&&<div className="catalogBranchFlow" aria-label="DataNest product branch flow">
              {["intake","staging","audit","main"].map((name,branchIndex)=>{
                const branch=branches.find(item=>item.name===name);
                if(!branch)return null;
                return <div className="catalogBranchStep" key={branch.id}>
                  <span>{branchIndex+1}</span><b>{name}</b><small>{payloadText(branch.payload,"purpose","description")}</small>
                </div>;
              })}
            </div>}

            <details className="catalogDetails">
              <summary>Explore {records.length} governed records</summary>
              <div className="catalogRecordGroups">
                {catalogRecordOrder.map(type=>{
                  const items=records.filter(record=>record.record_type===type);
                  if(!items.length)return null;
                  return <section className="catalogRecordGroup" key={type}>
                    <div className="catalogRecordGroupHead"><h4>{catalogRecordLabels[type]||type}</h4><span>{items.length}</span></div>
                    <div className="catalogRecordList">
                      {items.map(record=><article className="catalogRecord" key={record.id}>
                        <div><small>{record.code||record.record_type.replaceAll("_"," ")}</small><b>{record.name||record.code||"Governed record"}</b></div>
                        {record.status&&<span>{record.status}</span>}
                        <p>{payloadText(record.payload,"description","rule","target_outcome","decision","summary","purpose","mitigation","location")}</p>
                      </article>)}
                    </div>
                  </section>;
                })}
              </div>
            </details>
            <div className="catalogFooter"><span>As of {product.as_of_date||"current snapshot"}</span><span>{records.length} linked records</span></div>
          </article>;
        })}
      </div>
    </section>
    <section className="productsHero" aria-labelledby="products-title">
      <div className="productsHeroCopy">
        <p className="eyebrow">RESONANCE PRODUCTS</p>
        <h2 id="products-title">Assistance with a human at the centre.</h2>
        <p>
          Resonance products turn governed AI capabilities into focused experiences with
          explicit scope, traceability and human escalation built into the interface.
        </p>
        <div className="productsHeroMeta" aria-label="Product principles">
          <span>Governed context</span>
          <span>Clear boundaries</span>
          <span>Human escalation</span>
        </div>
      </div>
      <div className="productsOrbitalMark" aria-hidden="true">
        <span className="productsOrbit orbitOne"/>
        <span className="productsOrbit orbitTwo"/>
        <span className="productsCore">R</span>
      </div>
    </section>

    <section className="productIndex" aria-labelledby="product-index-title">
      <div className="productIndexHead">
        <div>
          <p className="eyebrow">PRODUCT 01</p>
          <h3 id="product-index-title">Resonance Assistance</h3>
        </div>
        <span className="productStatus">FOUNDATION PRODUCT</span>
      </div>

      <div className="resonanceAssistanceCard">
        <div className="resonanceAssistanceCopy">
          <span className="productNumber">01</span>
          <p className="productKicker">SPECIALIST ASSISTANCE</p>
          <h3>Resonance Assistance</h3>
          <p className="productLead">
            A family of specialist AI assistants designed to help people understand,
            organize and prepare complex work while keeping consequential decisions with humans.
          </p>
          <div className="productCapabilities">
            <span>Context-aware</span>
            <span>Evidence-minded</span>
            <span>Role-bounded</span>
            <span>Escalation-ready</span>
          </div>
        </div>

        <div className="assistanceRail" aria-label="Resonance Assistance specialists">
          <article className="assistantMiniCard active">
            <div className="assistantMiniIcon">LE</div>
            <div>
              <small>FIRST SPECIALIST</small>
              <b>Legal Eagle</b>
              <span>Legal information + preparation</span>
            </div>
          </article>
          <article className="assistantMiniCard mutedCard">
            <div className="assistantMiniIcon">+</div>
            <div>
              <small>NEXT</small>
              <b>More specialists</b>
              <span>Added through governed product development.</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section className="legalEagleStage" aria-labelledby="legal-eagle-title">
      <div className="legalEagleIdentity">
        <div className="eagleSeal" aria-hidden="true">
          <span className="eagleWing leftWing">╲</span>
          <span className="eagleHead">LE</span>
          <span className="eagleWing rightWing">╱</span>
          <span className="eagleScale">⚖</span>
        </div>
        <div>
          <p className="eyebrow">RESONANCE ASSISTANCE · LEGAL</p>
          <h3 id="legal-eagle-title">Legal Eagle</h3>
          <p className="legalEagleTagline">A lawyer-bot concept for legal information, issue organization and counsel preparation.</p>
        </div>
        <span className="prototypeBadge">PRODUCT PREVIEW</span>
      </div>

      <div className="legalEagleGrid">
        <div className="legalEagleMain">
          <div className="legalIntroCard">
            <p className="legalSpeaker">LEGAL EAGLE</p>
            <h4>Bring the mess. Leave with a clearer brief.</h4>
            <p>
              Legal Eagle is designed to help a person turn documents, dates, questions and
              unfamiliar legal language into a structured package that is easier to understand
              and easier to take to qualified counsel.
            </p>
          </div>

          <div className="legalTaskPanel">
            <div className="legalTaskHeader">
              <div>
                <p className="eyebrow">GUIDED PREVIEW</p>
                <h4>Choose what you need help preparing.</h4>
              </div>
              <span>NO LEGAL CONCLUSION GENERATED</span>
            </div>

            <div className="legalTaskButtons" role="list" aria-label="Legal Eagle preview tasks">
              {legalTasks.map(task=><button
                key={task.key}
                type="button"
                className={selectedTask.key===task.key?"active":""}
                aria-pressed={selectedTask.key===task.key}
                onClick={()=>setSelectedTask(task)}
              >{task.label}</button>)}
            </div>

            <div className="legalConversationPreview" aria-live="polite">
              <div className="legalUserTurn">
                <span>YOU</span>
                <p>{selectedTask.prompt}</p>
              </div>
              <div className="legalBotTurn">
                <span>LEGAL EAGLE · PREVIEW WORKFLOW</span>
                <ul>
                  {selectedTask.response.map(item=><li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="legalBoundaryCard" aria-label="Legal Eagle boundaries">
          <p className="eyebrow">BOUNDARIES</p>
          <h4>Designed to assist—not represent.</h4>
          <p>
            Legal Eagle is not a law firm and does not create an attorney-client relationship.
            It should not be relied on as a substitute for advice from a qualified lawyer.
          </p>
          <div className="boundaryList">
            <div><b>Jurisdiction first</b><span>Laws and procedures vary by place and change over time.</span></div>
            <div><b>No autonomous deadlines</b><span>Filing, limitation and response dates must be verified independently.</span></div>
            <div><b>No representation</b><span>It does not contact courts, opposing parties or authorities as your lawyer.</span></div>
            <div><b>Human escalation</b><span>High-impact or urgent matters should move to qualified local counsel.</span></div>
          </div>
          <div className="urgentLegalNote">
            <strong>Urgent matter?</strong>
            <span>Use an appropriate emergency service or qualified local legal professional rather than relying on an AI assistant.</span>
          </div>
        </aside>
      </div>
    </section>

    <section className="productRoadmapStrip" aria-label="Resonance Assistance roadmap">
      <div><small>NOW</small><b>Legal Eagle</b><span>Legal information + preparation</span></div>
      <div><small>NEXT</small><b>Specialist framework</b><span>Shared identity, safety and escalation patterns</span></div>
      <div><small>LATER</small><b>Assistance marketplace</b><span>Governed specialist experiences under Resonance Assistance</span></div>
    </section>
  </div>;
}
