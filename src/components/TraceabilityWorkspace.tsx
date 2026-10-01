"use client";

import { useEffect, useMemo, useState } from "react";

type Relation={type:string;target:string};
type TraceRecord={
  id:string;
  type:string;
  title:string;
  status:string;
  authority:string;
  source:string|null;
  revision:string|null;
  digest:string|null;
  observedAt:string|null;
  effectiveAt:string|null;
  audience:string[];
  sensitivity:string;
  productionAuthorization:boolean;
  relations:Relation[];
  limitations:string[];
};
type TraceIndex={
  schemaVersion:string;
  generatedAt:string;
  canonicalSha:string|null;
  authority:string;
  productionAuthorization:boolean;
  compliance:{status:string;conformant:boolean;blockers:string[];warnings:string[]};
  summary:{recordCount:number;currentRecordCount:number;unavailableRecordCount:number;liveEvidenceAvailable:number;liveEvidenceTotal:number;types:Record<string,number>};
  liveEvidence:Array<{id:string;valid:boolean;status?:string;generatedAt?:string|null;[key:string]:unknown}>;
  records:TraceRecord[];
  publicationBoundary:Record<string,boolean>;
};
type Bootstrap={
  liveIndex:string;
  standardPage:string;
  sourceHistory:string;
  updateModel:string;
  notice:string;
};

const publicBasePath=process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const bootstrapUrl=`${publicBasePath}/transparency/liberty-in-all/index.json`;

function formatTime(value:string|null|undefined){
  if(!value)return "Unavailable";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):date.toLocaleString();
}

export default function TraceabilityWorkspace(){
  const [bootstrap,setBootstrap]=useState<Bootstrap|null>(null);
  const [index,setIndex]=useState<TraceIndex|null>(null);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [type,setType]=useState("all");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    setError("");
    try{
      const bootstrapResponse=await fetch(bootstrapUrl,{cache:"no-store"});
      if(!bootstrapResponse.ok)throw new Error(`Bootstrap registry unavailable (${bootstrapResponse.status}).`);
      const meta=await bootstrapResponse.json() as Bootstrap;
      setBootstrap(meta);
      const liveResponse=await fetch(meta.liveIndex,{cache:"no-store"});
      if(!liveResponse.ok)throw new Error(`Live traceability index unavailable (${liveResponse.status}).`);
      const live=await liveResponse.json() as TraceIndex;
      setIndex(live);
    }catch(err){
      setError(err instanceof Error?err.message:"Traceability index unavailable.");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    void load();
    const timer=window.setInterval(()=>void load(),60_000);
    return()=>window.clearInterval(timer);
  },[]);

  const types=useMemo(()=>["all",...Object.keys(index?.summary?.types||{}).sort()], [index]);
  const visible=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return (index?.records||[]).filter(item=>{
      if(type!=="all"&&item.type!==type)return false;
      if(!needle)return true;
      return [item.id,item.type,item.title,item.status,item.authority,item.source||"",...(item.limitations||[])]
        .join(" ").toLowerCase().includes(needle);
    });
  },[index,query,type]);

  return <div className="transparencyWorkspace">
    <section className="heroPanel transparencyHero" aria-labelledby="traceability-title">
      <div>
        <p className="eyebrow">LIBERTY-IN-ALL · PUBLIC TRACEABILITY</p>
        <h1 id="traceability-title">On-demand system evidence index</h1>
        <p>
          Continuously refreshed, source-linked visibility for interested individuals and parties, users, stakeholders,
          auditors, regulators, developers and operators. Public records are evidence and context—not production,
          financial, legal, ownership or governance authority.
        </p>
        <div className="heroActions">
          <button className="primaryButton compact" type="button" onClick={()=>void load()} disabled={loading}>
            {loading?"Refreshing…":"Refresh live index"}
          </button>
          {bootstrap&&<a className="secondaryButton compact linkButton" href={bootstrap.standardPage}>Read LIBERTY-IN-ALL standard</a>}
          {bootstrap&&<a className="secondaryButton compact linkButton" href={bootstrap.sourceHistory}>Index history</a>}
        </div>
      </div>
      <div className="stackDiagram" aria-label="Traceability lifecycle">
        <div>Source / control <b>Identified</b></div><span aria-hidden="true">↓</span>
        <div>Evidence <b>Attributed</b></div><span aria-hidden="true">↓</span>
        <div>Index <b>Sanitized</b></div><span aria-hidden="true">↓</span>
        <div>Public view <b>On demand</b></div>
      </div>
    </section>

    <section className="metricGrid" aria-label="Traceability status">
      <article className="metricCard"><span>Indexed records</span><strong>{index?.summary?.recordCount ?? "—"}</strong><small>Stable IDs across public evidence</small></article>
      <article className="metricCard"><span>Current records</span><strong>{index?.summary?.currentRecordCount ?? "—"}</strong><small>Unavailable state remains explicit</small></article>
      <article className="metricCard"><span>Live evidence</span><strong>{index?`${index.summary.liveEvidenceAvailable}/${index.summary.liveEvidenceTotal}`:"—"}</strong><small>Sanitized specialized-tree summaries</small></article>
      <article className="metricCard"><span>LIA state</span><strong>{index?.compliance?.status?.toUpperCase() ?? "—"}</strong><small>{bootstrap?.updateModel||"Event-driven + scheduled"}</small></article>
    </section>

    {error&&<section className="notice errorNotice" role="alert">
      <b>Live index limitation:</b> {error} The canonical bootstrap/standard remain public; no healthy state is inferred from missing live evidence.
    </section>}

    <section className="notice goodNotice" role="note" aria-label="Publication boundary">
      <b>Publication boundary:</b> secrets, reusable credentials, private authentication material, protected personal data and private AI memory are excluded.
      Material adverse findings are not filtered merely because they are unfavorable.
    </section>

    <section className="panel" aria-labelledby="trace-search-heading">
      <div className="panelHead">
        <div><p className="eyebrow">INDEX</p><h2 id="trace-search-heading">Search traceable records</h2></div>
        <span className="countPill">{visible.length} VISIBLE</span>
      </div>
      <div className="fieldRow">
        <label>Search
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="ID, title, authority, state, limitation…" />
        </label>
        <label>Record type
          <select value={type} onChange={event=>setType(event.target.value)}>
            {types.map(item=><option key={item} value={item}>{item==="all"?"All record types":item}</option>)}
          </select>
        </label>
      </div>
      {!index&&!loading&&<p className="muted">The live automation index is not available yet.</p>}
      {index&&<div className="transparencyFindingsWrap">
        <table className="transparencyFindingsTable">
          <thead><tr><th>ID</th><th>Record</th><th>Status</th><th>Authority</th><th>Source / revision</th><th>Limitations</th></tr></thead>
          <tbody>
            {visible.map(item=><tr key={item.id}>
              <td><b>{item.id}</b><small>{item.type}</small></td>
              <td>{item.title}<small>{item.sensitivity}</small></td>
              <td><span className={"badge "+(item.status==="unavailable"?"warn":"neutral")}>{item.status}</span></td>
              <td>{item.authority}<small>Prod auth: {item.productionAuthorization?"YES":"NO"}</small></td>
              <td>{item.source?.startsWith("http")
                ?<a href={item.source}>{item.source}</a>
                :<code>{item.source||"—"}</code>}
                <small>{item.revision?item.revision.slice(0,12):"revision unavailable"}</small>
              </td>
              <td>{item.limitations.length?item.limitations.join(" · "):"—"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </section>

    {index&&<section className="panel" aria-labelledby="live-evidence-heading">
      <div className="panelHead">
        <div><p className="eyebrow">LIVE EVIDENCE</p><h2 id="live-evidence-heading">Specialized-tree observation state</h2></div>
        <span className="countPill">{formatTime(index.generatedAt)}</span>
      </div>
      <div className="cardGrid">
        {index.liveEvidence.map(item=><article className="capabilityCard panel" key={item.id}>
          <p className="eyebrow">{item.id}</p>
          <h3>{String(item.status||"unavailable")}</h3>
          <p>{item.valid?"Validated schema + non-authorizing evidence.":"Unavailable or invalid evidence; no favorable state inferred."}</p>
          <small>{formatTime(item.generatedAt as string|null|undefined)}</small>
        </article>)}
      </div>
    </section>}

    <section className="panel" aria-labelledby="trace-meta-heading">
      <div className="panelHead"><div><p className="eyebrow">PROVENANCE</p><h2 id="trace-meta-heading">Current index identity</h2></div></div>
      <dl className="transparencyMeta">
        <div><dt>Canonical SHA</dt><dd><code>{index?.canonicalSha||"Unavailable"}</code></dd></div>
        <div><dt>Generated</dt><dd>{formatTime(index?.generatedAt)}</dd></div>
        <div><dt>Authority</dt><dd>{index?.authority||"Public traceability observation"}</dd></div>
        <div><dt>Production authorization</dt><dd>{index?.productionAuthorization?"YES":"NO"}</dd></div>
      </dl>
    </section>
  </div>;
}
