"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import ResonancePortfolioPulse from "@/components/ResonancePortfolioPulse";


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
  source_branch:"Source branches",
  roadmap_item:"Roadmap",
  decision:"Decisions",
  evidence:"Evidence",
  datanest_branch:"DataNest branches"
};

const catalogRecordOrder = [
  "application","component","source_authority","environment","integration",
  "governance_control","risk","source_branch","roadmap_item","decision","evidence","datanest_branch"
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

type Job = {
  id:string;
  job_number:number;
  title:string;
  status:string;
  updated_at:string;
};

type LegalMessage = {
  id:string;
  role:"user"|"assistant";
  content:string;
  traceId?:string;
  provider?:string;
};

type ContextEvent = {
  id:string;
  trace_id:string;
  source_type:string;
  source_provider:string|null;
  content:string;
  created_at:string;
};

type Props = {
  projectId:string;
};

const legalTasks:LegalTask[] = [
  {
    key:"contract",
    label:"Review a contract",
    prompt:"Paste a clause or agreement and ask what it means, what obligations it creates, and what a lawyer should verify.",
    response:[
      "Translate clauses into plain language without changing their apparent meaning.",
      "Separate obligations, rights, dates, money terms and termination triggers.",
      "Flag ambiguity, missing definitions and facts that need qualified legal review.",
      "Avoid inventing governing law, deadlines or enforceability conclusions."
    ]
  },
  {
    key:"timeline",
    label:"Build a matter timeline",
    prompt:"Paste notes, dates or correspondence and ask Legal Eagle to organize the sequence of events.",
    response:[
      "Order events, communications and documents by date and source.",
      "Mark disputed, missing or unverified facts instead of treating them as established.",
      "Surface possible deadline questions as items to verify—not authoritative filing advice.",
      "Produce a chronology that is easier to hand to qualified counsel."
    ]
  },
  {
    key:"counsel",
    label:"Prepare for counsel",
    prompt:"Describe the matter and ask for a concise briefing pack and questions for a qualified lawyer.",
    response:[
      "Summarize the issue, desired outcome and known constraints.",
      "Create a document checklist and unresolved factual questions.",
      "Generate focused questions about options, process, cost, risk and next steps.",
      "Keep final legal conclusions and strategic decisions with the human professional."
    ]
  },
  {
    key:"research",
    label:"Legal research map",
    prompt:"Describe the issue and ask what primary legal sources and topics should be checked.",
    response:[
      "Identify likely legal topics without claiming a definitive legal diagnosis.",
      "Separate statutes, regulations, court decisions, contracts and policy sources.",
      "Prioritize official and primary sources and record their date and jurisdiction.",
      "Never fabricate citations; mark current-law points that require verification."
    ]
  }
];

function jobCode(job:Job){
  return "JOB-"+String(job.job_number).padStart(5,"0");
}

function legalSessionKey(jobId:string){
  return "datanest.legalEagle.session."+jobId;
}

export default function ProductsWorkspace({projectId}:{projectId:string}){
  const [selectedTask,setSelectedTask]=useState<LegalTask>(legalTasks[0]);
  const [catalogProducts,setCatalogProducts]=useState<CatalogProduct[]>([]);
  const [catalogRecords,setCatalogRecords]=useState<CatalogRecord[]>([]);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogError,setCatalogError]=useState("");
  const [selectedProductId,setSelectedProductId]=useState("");
  const [recordQuery,setRecordQuery]=useState("");
  const [recordTypeFilter,setRecordTypeFilter]=useState("all");
  const [catalogUrlReady,setCatalogUrlReady]=useState(false);
  const [catalogDetailsOpen,setCatalogDetailsOpen]=useState(false);
  const [catalogShareNotice,setCatalogShareNotice]=useState("");

  const [jobs,setJobs]=useState<Job[]>([]);
  const [selectedJobId,setSelectedJobId]=useState("");
  const [jurisdiction,setJurisdiction]=useState("");
  const [sessionId,setSessionId]=useState("");
  const [messages,setMessages]=useState<LegalMessage[]>([]);
  const [draft,setDraft]=useState("");
  const [loadingMatter,setLoadingMatter]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const selectedJob=useMemo(
    ()=>jobs.find(job=>job.id===selectedJobId)||null,
    [jobs,selectedJobId]
  );

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const supabase=getSupabase();
      if(!supabase)return;
      setLoadingMatter(true);
      const {data,error:queryError}=await supabase
        .from("jobs")
        .select("id,job_number,title,status,updated_at")
        .eq("project_id",projectId)
        .order("updated_at",{ascending:false})
        .limit(50);
      if(!active)return;
      setLoadingMatter(false);
      if(queryError){
        setError(queryError.message);
        return;
      }
      const next=(data||[]) as Job[];
      setJobs(next);
      setSelectedJobId(current=>current&&next.some(job=>job.id===current)
        ?current
        :next[0]?.id||"");
    };
    void load();
    return()=>{active=false;};
  },[projectId]);

  useEffect(()=>{
    let active=true;
    const restore=async()=>{
      setMessages([]);
      setSessionId("");
      setNotice("");
      setError("");
      if(!selectedJobId)return;
      const saved=window.localStorage.getItem(legalSessionKey(selectedJobId));
      if(!saved)return;
      const supabase=getSupabase();
      if(!supabase)return;
      setLoadingMatter(true);
      const {data,error:contextError}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{action:"context",jobId:selectedJobId,sessionId:saved}
      });
      if(!active)return;
      setLoadingMatter(false);
      if(contextError){
        window.localStorage.removeItem(legalSessionKey(selectedJobId));
        return;
      }
      const payload=(data||{}) as Record<string,unknown>;
      const nextSession=String(payload.sessionId||saved);
      const events=Array.isArray(payload.events)?payload.events as ContextEvent[]:[];
      const restored=events
        .filter(item=>item.source_type==="human"||item.source_type==="datanest_ai")
        .map(item=>({
          id:item.id,
          role:item.source_type==="datanest_ai"?"assistant" as const:"user" as const,
          content:item.content,
          traceId:item.trace_id,
          provider:item.source_provider||undefined
        }));
      setSessionId(nextSession);
      setMessages(restored);
    };
    void restore();
    return()=>{active=false;};
  },[selectedJobId]);

  function newSession(){
    if(selectedJobId)window.localStorage.removeItem(legalSessionKey(selectedJobId));
    setSessionId("");
    setMessages([]);
    setDraft("");
    setNotice("Started a fresh Legal Eagle session for this matter.");
    setError("");
  }

  async function send(event:FormEvent){
    event.preventDefault();
    const message=draft.trim();
    const cleanJurisdiction=jurisdiction.trim();
    if(!message||busy)return;
    if(!selectedJob){
      setError("Select a DataNest Job to use as the Legal Eagle matter workspace.");
      return;
    }
    if(!cleanJurisdiction){
      setError("Enter the relevant jurisdiction before asking Legal Eagle for substantive assistance.");
      return;
    }

    const supabase=getSupabase();
    if(!supabase)return;
    const clientRequestId=crypto.randomUUID();
    setBusy(true);
    setError("");
    setNotice("");
    setMessages(current=>[...current,{
      id:clientRequestId+"-human",
      role:"user",
      content:message
    }]);
    setDraft("");

    try{
      const {data,error:invokeError}=await supabase.functions.invoke("datanest-ai-chat",{
        body:{
          action:"chat",
          jobId:selectedJob.id,
          sessionId:sessionId||null,
          clientRequestId,
          message,
          productMode:"legal_eagle",
          jurisdiction:cleanJurisdiction,
          legalTask:selectedTask.key
        }
      });
      if(invokeError)throw invokeError;
      const payload=(data||{}) as Record<string,unknown>;
      const nextSession=String(payload.sessionId||sessionId||"");
      const assistant=String(payload.assistant||"").trim();
      if(nextSession){
        setSessionId(nextSession);
        window.localStorage.setItem(legalSessionKey(selectedJob.id),nextSession);
      }
      if(assistant){
        setMessages(current=>[...current,{
          id:String(payload.outputTraceId||clientRequestId+"-assistant"),
          role:"assistant",
          content:assistant,
          traceId:String(payload.outputTraceId||""),
          provider:String(payload.providerLabel||payload.providerMode||"DataNest AI")
        }]);
      }
      setNotice(
        String(payload.providerMode||"")==="embedded"
          ?"Legal Eagle recorded the matter input, but no governed external provider was available for substantive reasoning."
          :"Legal Eagle responded through the governed DataNest AI provider route. This legal session is excluded from automatic project-wide learning."
      );
    }catch(sendError){
      setError(sendError instanceof Error?sendError.message:"Legal Eagle could not process this request.");
    }finally{
      setBusy(false);
    }
  }


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
        const nextProducts=(productResult.data||[]) as CatalogProduct[];
        setCatalogProducts(nextProducts);
        setCatalogRecords((recordResult.data||[]) as CatalogRecord[]);
        setSelectedProductId(current=>nextProducts.some(product=>product.id===current)?current:(nextProducts[0]?.id||""));
      }
    }).finally(()=>{if(active)setCatalogLoading(false);});

    return()=>{active=false;};
  },[projectId]);

  useEffect(()=>{
    if(!catalogProducts.length)return;
    const syncCatalogViewFromUrl=()=>{
      const url=new URL(window.location.href);
      const requestedProduct=url.searchParams.get("product");
      const requestedType=url.searchParams.get("recordType");
      const requestedQuery=url.searchParams.get("q")||"";
      const matchedProduct=requestedProduct
        ?catalogProducts.find(product=>product.slug===requestedProduct||product.id===requestedProduct)
        :null;

      setSelectedProductId(current=>matchedProduct?.id
        ||(catalogProducts.some(product=>product.id===current)?current:catalogProducts[0]?.id||""));
      const nextType=requestedType&&catalogRecordOrder.includes(requestedType) ? requestedType : "all";
      setRecordTypeFilter(nextType);
      setRecordQuery(requestedQuery);
      setCatalogDetailsOpen(Boolean(requestedQuery)||nextType!=="all");
      setCatalogUrlReady(true);
    };

    syncCatalogViewFromUrl();
    window.addEventListener("popstate",syncCatalogViewFromUrl);
    return()=>window.removeEventListener("popstate",syncCatalogViewFromUrl);
  },[catalogProducts]);

  useEffect(()=>{
    if(!catalogUrlReady||!selectedProductId)return;
    const selectedProduct=catalogProducts.find(product=>product.id===selectedProductId);
    if(!selectedProduct)return;
    const url=new URL(window.location.href);
    const query=recordQuery.trim();
    const nextProduct=selectedProduct.slug||selectedProduct.id;
    const currentProduct=url.searchParams.get("product");
    const currentType=url.searchParams.get("recordType");
    const currentQuery=url.searchParams.get("q");

    if(currentProduct===nextProduct
      &&currentType===(recordTypeFilter==="all"?null:recordTypeFilter)
      &&currentQuery===(query||null))return;

    url.searchParams.set("product",nextProduct);
    if(recordTypeFilter==="all")url.searchParams.delete("recordType");
    else url.searchParams.set("recordType",recordTypeFilter);
    if(query)url.searchParams.set("q",query);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state,"",url.toString());
  },[catalogUrlReady,catalogProducts,selectedProductId,recordQuery,recordTypeFilter]);

  async function copyCatalogViewLink(){
    const href=window.location.href;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(href);
      }else{
        const textarea=document.createElement("textarea");
        textarea.value=href;
        textarea.setAttribute("readonly","");
        textarea.style.position="fixed";
        textarea.style.opacity="0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied=document.execCommand("copy");
        textarea.remove();
        if(!copied)throw new Error("copy command unavailable");
      }
      setCatalogShareNotice("View link copied.");
    }catch{
      setCatalogShareNotice("Copy unavailable. Use your browser address bar.");
    }
    window.setTimeout(()=>setCatalogShareNotice(""),3000);
  }

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
    <ResonancePortfolioPulse products={catalogProducts} records={catalogRecords} loading={catalogLoading}/>
    <section className="catalogStage" aria-labelledby="governed-catalog-title">
      <div className="catalogStageHead">
        <div>
          <p className="eyebrow">GOVERNED PRODUCT CATALOG</p>
          <h2 id="governed-catalog-title">Products that carry their architecture, evidence and decisions with them.</h2>
          <p>DataNest now treats each governed product as one traceable entity, with its applications, controls, risks, roadmap, evidence and promotion branches attached to the same product identity.</p>
        </div>
        <div className="catalogStageBadges">
          <span className="catalogLiveBadge">{catalogLoading?"SYNCING":catalogProducts.length+" PRODUCT"+(catalogProducts.length===1?"":"S")}</span>
          <div className="catalogShareControl">
            <span className="catalogLinkBadge">SHAREABLE VIEW · URL SYNCED</span>
            <button type="button" className="catalogCopyLinkButton" onClick={()=>void copyCatalogViewLink()}>
              Copy view link
            </button>
          </div>
        </div>
      </div>

      {catalogShareNotice&&<div className="catalogShareNotice" role="status" aria-live="polite">{catalogShareNotice}</div>}
      {catalogError&&<div className="catalogError" role="alert">{catalogError}</div>}
      {catalogLoading&&<div className="catalogLoading" role="status">Loading governed product records…</div>}
      {!catalogLoading&&!catalogError&&!catalogProducts.length&&<div className="catalogEmpty">No governed products have been imported for this project yet.</div>}

      {catalogProducts.length>0&&<nav className="catalogNavigator" aria-label="Governed products">
        {catalogProducts.map((product,index)=>{
          const linked=(recordsByProduct.get(product.id)||[]).length;
          return <button
            key={product.id}
            type="button"
            className={selectedProductId===product.id?"active":""}
            aria-pressed={selectedProductId===product.id}
            onClick={()=>{
              setSelectedProductId(product.id);
              setRecordQuery("");
              setRecordTypeFilter("all");
              setCatalogDetailsOpen(false);
            }}
          >
            <span>{String(index+1).padStart(2,"0")}</span>
            <b>{product.name}</b>
            <small>{linked} linked records</small>
          </button>;
        })}
      </nav>}

      <div className="catalogGrid">
        {catalogProducts.filter(product=>!selectedProductId||product.id===selectedProductId).map((product,index)=>{
          const records=recordsByProduct.get(product.id)||[];
          const count=(type:string)=>records.filter(record=>record.record_type===type).length;
          const branches=records.filter(record=>record.record_type==="datanest_branch");
          const query=recordQuery.trim().toLowerCase();
          const visibleRecords=records.filter(record=>{
            if(recordTypeFilter!=="all"&&record.record_type!==recordTypeFilter)return false;
            if(!query)return true;
            const haystack=[
              record.code||"",
              record.name||"",
              record.status||"",
              record.record_type,
              JSON.stringify(record.payload||{})
            ].join(" ").toLowerCase();
            return haystack.includes(query);
          });
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

            <details
              className="catalogDetails"
              open={catalogDetailsOpen}
              onToggle={event=>setCatalogDetailsOpen(event.currentTarget.open)}
            >
              <summary>Explore {records.length} governed records</summary>
              <div className="catalogRecordToolbar">
                <label>
                  <span>Search governed records</span>
                  <input
                    aria-label="Search governed product records"
                    value={recordQuery}
                    onChange={event=>setRecordQuery(event.target.value)}
                    placeholder="Search apps, controls, risks, evidence…"
                  />
                </label>
                <label>
                  <span>Record type</span>
                  <select
                    aria-label="Filter governed record type"
                    value={recordTypeFilter}
                    onChange={event=>setRecordTypeFilter(event.target.value)}
                  >
                    <option value="all">All record types</option>
                    {catalogRecordOrder
                      .filter(type=>records.some(record=>record.record_type===type))
                      .map(type=><option value={type} key={type}>{catalogRecordLabels[type]||type}</option>)}
                  </select>
                </label>
                <div className="catalogRecordResultCount" aria-live="polite">
                  <b>{visibleRecords.length}</b>
                  <span>{visibleRecords.length===1?"record":"records"} shown</span>
                </div>
              </div>
              <div className="catalogRecordGroups">
                {catalogRecordOrder.map(type=>{
                  const items=visibleRecords.filter(record=>record.record_type===type);
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
                {!visibleRecords.length&&<div className="catalogNoResults">
                  <b>No governed records match this view.</b>
                  <span>Clear the search or choose another record type.</span>
                </div>}
              </div>
            </details>
            <div className="catalogFooter"><span>As of {product.as_of_date||"current snapshot"}</span><span>{records.length} linked records</span></div>
          </article>;
        })}
      </div>
    </section>
    <details className="conceptIncubator">
      <summary>
        <span><b>Product Concept Incubator</b><small>Explore governed specialist experiences that are live or incubating but not yet promoted as standalone catalog products.</small></span>
        <span>Resonance Assistance · Legal Eagle</span>
      </summary>
      <div className="conceptIncubatorBody">
    <section className="productsHero" aria-labelledby="products-title">
      <div className="productsHeroCopy">
        <p className="eyebrow">PRODUCT CONCEPT INCUBATOR</p>
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
          <p className="eyebrow">CONCEPT 01</p>
          <h3 id="product-index-title">Resonance Assistance</h3>
        </div>
        <span className="productStatus">PRODUCT CONCEPT</span>
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
              <small>FIRST SPECIALIST · LIVE</small>
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
          <p className="legalEagleTagline">Governed legal information, issue organization and counsel preparation inside a traceable DataNest matter workspace.</p>
        </div>
        <span className="prototypeBadge">GOVERNED ASSISTANT</span>
      </div>

      <div className="legalEagleGrid">
        <div className="legalEagleMain">
          <div className="legalIntroCard">
            <p className="legalSpeaker">LEGAL EAGLE</p>
            <h4>Bring the mess. Leave with a clearer brief.</h4>
            <p>
              Anchor a legal question to a DataNest Job, state the relevant jurisdiction, and
              use Legal Eagle to organize facts, explain language, map research and prepare for
              qualified counsel. Legal sessions remain scoped to the selected Job and are excluded
              from automatic project-wide learning.
            </p>
          </div>

          <section className="legalWorkspacePanel" aria-label="Legal Eagle assistant">
            <div className="legalTaskHeader">
              <div>
                <p className="eyebrow">LIVE MATTER WORKSPACE</p>
                <h4>Ask Legal Eagle</h4>
              </div>
              <span>INFORMATION · PREPARATION · HUMAN REVIEW</span>
            </div>

            <div className="legalWorkspaceControls">
              <label>
                Matter / DataNest Job
                <select
                  aria-label="Legal Eagle matter"
                  value={selectedJobId}
                  onChange={event=>setSelectedJobId(event.target.value)}
                  disabled={loadingMatter||!jobs.length}
                >
                  {!jobs.length&&<option value="">No Jobs available</option>}
                  {jobs.map(job=><option value={job.id} key={job.id}>
                    {jobCode(job)+" · "+job.title}
                  </option>)}
                </select>
              </label>
              <label>
                Relevant jurisdiction
                <input
                  aria-label="Legal jurisdiction"
                  value={jurisdiction}
                  onChange={event=>setJurisdiction(event.target.value)}
                  placeholder="e.g. South Africa · Gauteng"
                  maxLength={160}
                />
              </label>
            </div>

            <div className="legalTaskButtons" role="list" aria-label="Legal Eagle tasks">
              {legalTasks.map(task=><button
                key={task.key}
                type="button"
                className={selectedTask.key===task.key?"active":""}
                aria-pressed={selectedTask.key===task.key}
                onClick={()=>setSelectedTask(task)}
              >{task.label}</button>)}
            </div>

            <div className="legalTaskBrief">
              <b>{selectedTask.label}</b>
              <p>{selectedTask.prompt}</p>
              <ul>{selectedTask.response.map(item=><li key={item}>{item}</li>)}</ul>
            </div>

            <div className="legalChatTranscript" aria-live="polite">
              {!messages.length&&<div className="legalChatEmpty">
                <span className="assistantMiniIcon">LE</span>
                <div>
                  <b>Legal Eagle is ready for a matter.</b>
                  <p>Select a DataNest Job, enter the jurisdiction, then paste your question, facts, clause or document excerpt.</p>
                </div>
              </div>}
              {messages.map(item=><article
                className={"legalChatTurn "+item.role}
                key={item.id}
              >
                <div className="legalChatTurnHead">
                  <b>{item.role==="assistant"?"LEGAL EAGLE":"YOU"}</b>
                  {item.traceId&&<span>{item.traceId}</span>}
                </div>
                <p>{item.content}</p>
                {item.provider&&<small>{item.provider}</small>}
              </article>)}
            </div>

            <form className="legalComposer" onSubmit={send}>
              <label>
                Question, facts, clause or document excerpt
                <textarea
                  rows={7}
                  value={draft}
                  maxLength={12000}
                  onChange={event=>setDraft(event.target.value)}
                  placeholder={selectedTask.prompt}
                  disabled={!selectedJob||busy}
                />
              </label>
              <div className="legalComposerFooter">
                <div>
                  <small>Job-scoped · traceable · not eligible for automatic project-wide learning</small>
                  {sessionId&&<button type="button" className="textButton legalNewSession" onClick={newSession}>New legal session</button>}
                </div>
                <button
                  className="primaryButton"
                  disabled={busy||!draft.trim()||!selectedJob||!jurisdiction.trim()}
                >{busy?"Legal Eagle is reasoning…":"Ask Legal Eagle"}</button>
              </div>
            </form>

            {notice&&<div className="legalAssistantNotice good" role="status">{notice}</div>}
            {error&&<div className="legalAssistantNotice bad" role="alert">{error}</div>}
          </section>
        </div>

        <aside className="legalBoundaryCard" aria-label="Legal Eagle boundaries">
          <p className="eyebrow">BOUNDARIES</p>
          <h4>Designed to assist—not represent.</h4>
          <p>
            Legal Eagle is not a law firm and does not create an attorney-client relationship
            or legal privilege. It should not be relied on as a substitute for advice from a
            qualified lawyer.
          </p>
          <div className="boundaryList">
            <div><b>Jurisdiction first</b><span>Laws and procedures vary by place and change over time.</span></div>
            <div><b>No fabricated authority</b><span>Legal Eagle is instructed not to invent statutes, cases, rules, citations or deadlines.</span></div>
            <div><b>No autonomous deadlines</b><span>Filing, limitation and response dates must be verified independently.</span></div>
            <div><b>No representation</b><span>It does not contact courts, opposing parties or authorities as your lawyer.</span></div>
            <div><b>Human escalation</b><span>High-impact or urgent matters should move to qualified local counsel.</span></div>
          </div>
          <div className="urgentLegalNote">
            <strong>Urgent matter?</strong>
            <span>For an imminent deadline, arrest or detention, personal safety issue, eviction, deportation, or other high-impact matter, use an appropriate emergency service or qualified local legal professional rather than relying on an AI assistant.</span>
          </div>
        </aside>
      </div>
    </section>

    <section className="productRoadmapStrip" aria-label="Resonance Assistance roadmap">
      <div><small>NOW</small><b>Legal Eagle</b><span>Governed legal information + matter preparation</span></div>
      <div><small>NEXT</small><b>Document workspace</b><span>Source-linked files, extraction and issue mapping</span></div>
      <div><small>LATER</small><b>Assistance marketplace</b><span>Governed specialist experiences under Resonance Assistance</span></div>
    </section>
      </div>
    </details>
  </div>;
}
