"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { trackCommercialEvent } from "@/lib/commercialFunnel";
import "../marketing.css";

function cleanSelection(value: string | null): string | null {
  if (!value) return null;
  const decoded=value.replace(/[<>]/g,"").trim();
  return decoded ? decoded.slice(0,120) : null;
}

export default function ContactContent(){
  const searchParams=useSearchParams();
  const selectedProduct=cleanSelection(searchParams.get("product"));
  const selectedService=cleanSelection(searchParams.get("service"));

  const selectedInterest=selectedProduct
    ? `Product: ${selectedProduct}`
    : selectedService
      ? `Service: ${selectedService}`
      : null;

  const issueUrl=useMemo(()=>{
    const issue=new URL("https://github.com/DataNest-Supository/DataNest/issues/new");
    issue.searchParams.set("template","trade-implementation-interest.yml");
    if(selectedInterest) issue.searchParams.set("title",`[TRADE] ${selectedInterest}`);
    return issue.toString();
  },[selectedInterest]);

  const heading=selectedInterest
    ? `Let's scope ${selectedInterest.toLowerCase()}.`
    : "Tell DataNest what needs to change.";

  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead">
        <span className="marketingTag">Start here</span>
        <h1>{heading}</h1>
        <p>Use the non-confidential intake to request a fit and scope screen for assurance, implementation, product or continuous oversight work.</p>
      </div>
      <div className="marketingFormShell">
        {selectedInterest && <div className="marketingNotice"><strong>Selected route:</strong> {selectedInterest}. The intake link below is pre-labelled so the request can enter the right commercial lane faster.</div>}
        <div className="marketingNotice" style={{marginTop:selectedInterest ? 12 : 0}}><strong>Do not submit secrets or confidential personal information.</strong> The public intake should contain only enough detail to establish scope and suitability. Detailed evidence is exchanged after an authorised engagement is agreed.</div>
        <p style={{color:"var(--text-secondary)",fontSize:12,lineHeight:1.7,marginTop:18}}>The current intake route is a GitHub issue template designed for trade and implementation interest. It records the initial request without making a commercial commitment.</p>
        <a
          className="marketingPrimary"
          href={issueUrl}
          onClick={()=>{
            trackCommercialEvent("lead_handoff_started",{
              product:selectedProduct ?? undefined,
              service:selectedService ?? undefined,
              cta:"github-trade-intake"
            });
          }}
        >Open Trade &amp; Implementation Interest ↗</a>
        <p style={{color:"var(--text-secondary)",fontSize:11,lineHeight:1.7,marginTop:18}}>For secure workspace access, use <a href="/workspace/" style={{color:"var(--brand-cyan)"}}>DataNest Workspace</a>.</p>
      </div>
    </section>
  </main><MarketingFooter/></div>;
}
