"use client";
import type { AssessmentBundle } from "@/lib/externalAuditTypes";

export default function ExternalAuditDocuments({bundle,onPublish}:{bundle:AssessmentBundle;onPublish:()=>void}){
  const download=(kind:"json"|"csv")=>{
    const payload=kind==="json"
      ?JSON.stringify(bundle,null,2)
      :[
        "type,id,status,reference",
        ...bundle.sources.map(source=>["source",source.id,source.acquisition_state,source.canonical_reference].map(csv).join(",")),
        ...bundle.findings.map(finding=>["finding",finding.id,finding.state,finding.criterion_id].map(csv).join(",")),
        ...bundle.actions.map(action=>["action",action.id,action.status,action.job_id||""].map(csv).join(","))
      ].join("\n");
    const blob=new Blob([payload],{type:kind==="json"?"application/json":"text/csv"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;anchor.download=`external-audit-${bundle.assessment.id}-r${bundle.assessment.revision}.${kind}`;
    anchor.click();URL.revokeObjectURL(url);
  };
  return <section className="externalAuditSection" aria-labelledby="traceability-heading">
    <div className="externalAuditSectionHeader">
      <div><p className="eyebrow">STANDARDS & TRACEABILITY</p><h3 id="traceability-heading">Traceable documentation</h3></div>
      <div className="externalAuditActions"><button className="secondaryButton compact" onClick={onPublish}>Publish report</button><button className="secondaryButton compact" onClick={()=>download("json")}>Export JSON</button><button className="secondaryButton compact" onClick={()=>download("csv")}>Export CSV</button></div>
    </div>
    <p className="muted">Assessment {bundle.assessment.id} · revision {bundle.assessment.revision}. This is an assisted assessment record, not an ISO certificate or accreditation decision.</p>
    <div className="externalAuditGrid">
      <article><b>Evidence register</b><span>{bundle.sources.length} snapshots</span><small>{bundle.sources.filter(s=>s.acquisition_state!=="captured").length} coverage gaps</small></article>
      <article><b>Findings register</b><span>{bundle.findings.length} findings</span><small>{bundle.findings.filter(f=>f.claim_kind!=="observed").length} inferred / unknown</small></article>
      <article><b>Optimization actions</b><span>{bundle.actions.length} actions</span><small>{bundle.actions.filter(a=>Boolean(a.job_id)).length} UNIFI jobs</small></article>
      <article><b>Immutable documents</b><span>{bundle.documents.length} versions</span><small>{bundle.events.length} review / trace events</small></article>
    </div>
    {bundle.documents.length>0&&<div className="externalAuditList">{bundle.documents.map(doc=><div key={doc.id}><b>{doc.kind.replaceAll("_"," ")}</b><span>{doc.format.toUpperCase()} · SHA-256 {doc.content_hash.slice(0,12)}…</span><small>{new Date(doc.generated_at).toLocaleString()}</small><button className="secondaryButton compact" onClick={()=>downloadPublished(doc.content_text,doc.format,doc.id)}>Download published version</button></div>)}</div>}
  </section>;
}
function downloadPublished(content:string,format:string,id:string){const blob=new Blob([content],{type:format==="json"?"application/json":format==="csv"?"text/csv":"text/html"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`external-audit-${id}.${format}`;anchor.click();URL.revokeObjectURL(url);}\nfunction csv(value:unknown){const text=String(value??"");return /[",\\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;}
