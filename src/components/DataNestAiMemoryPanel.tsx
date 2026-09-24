"use client";

export type CertifiedMemoryItem = {
  id:string;
  normalized_knowledge:string;
  category:string;
  effective_version:number;
  certification_id:string;
  source_job_ids:string[];
  source_trace_ids:string[];
  certification_class:string;
  confidence:number|null;
  policy_version:string;
  content_hash:string;
  supersedes_memory_id:string|null;
  promoted_at:string;
};

function formatDate(value:string){
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"
  }).format(new Date(value));
}

export default function DataNestAiMemoryPanel({items}:{items:CertifiedMemoryItem[]}){
  return <section className="panel datanestAiMemoryPanel">
    <div className="panelHead">
      <div>
        <p className="eyebrow">CERTIFIED MEMORY</p>
        <h3>Project-wide reusable knowledge</h3>
      </div>
      <span className="countPill">{items.length}</span>
    </div>
    <p className="muted">
      Only certified knowledge can influence other Job Manifests. Raw chat and AI Companion evidence stays in staging.
    </p>
    <div className="manifestList">
      {items.map(item=><article className="manifestCard" key={item.id}>
        <div className="rowBetween">
          <div>
            <b>{item.category.replaceAll("_"," ")}</b>
            <small>{"Memory v"+item.effective_version+" · promoted "+formatDate(item.promoted_at)}</small>
          </div>
          <span className="badge good">CERTIFIED</span>
        </div>
        <p>{item.normalized_knowledge}</p>
        <div className="manifestMeta">
          <span>{item.certification_class}</span>
          <span>{item.source_job_ids.length+" source Job"+(item.source_job_ids.length===1?"":"s")}</span>
          <span>{item.confidence==null?"confidence —":"confidence "+Math.round(item.confidence*100)+"%"}</span>
        </div>
        <details>
          <summary>Provenance</summary>
          <code>{JSON.stringify({
            certificationId:item.certification_id,
            sourceJobIds:item.source_job_ids,
            sourceTraceIds:item.source_trace_ids,
            policyVersion:item.policy_version,
            contentHash:item.content_hash,
            supersedes:item.supersedes_memory_id
          },null,2)}</code>
        </details>
      </article>)}
      {!items.length&&<div className="emptyState">
        <div>✓</div>
        <h3>No certified memory yet</h3>
        <p>Learning candidates appear here only after governed validation and certification.</p>
      </div>}
    </div>
  </section>;
}
