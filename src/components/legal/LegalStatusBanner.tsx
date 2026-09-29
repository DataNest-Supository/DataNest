import type { LegalDocumentMeta } from "@/lib/legalRegistry";

const statusLabel = (status:LegalDocumentMeta["status"])=>{
  if(status==="draft-review-required") return "Human / legal review required";
  if(status==="approved") return "Approved";
  return "Superseded";
};

export default function LegalStatusBanner({document}:{document:LegalDocumentMeta}){
  return <aside className={"legalStatusBanner "+document.status} aria-label={document.title+" review status"}>
    <div className="legalStatusBannerHead">
      <span className="legalStatusLabel">{statusLabel(document.status)}</span>
      <code>{document.version}</code>
    </div>
    <dl className="legalStatusMeta">
      <div><dt>Effective date</dt><dd>{document.effectiveDate??"Not yet effective"}</dd></div>
      <div><dt>Review owner</dt><dd>{document.reviewOwner}</dd></div>
      <div><dt>Change summary</dt><dd>{document.changeSummary}</dd></div>
    </dl>
  </aside>;
}
