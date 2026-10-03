import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Contact & Assessment",
  description:"Request a DataNest fit and scope screen for assurance, delivery, governance or continuous oversight."
};

type ContactPageProps={
  searchParams?: Promise<{
    product?: string;
    service?: string;
  }>;
};

function cleanSelection(value?: string): string | null {
  if (!value) return null;
  const decoded=value.replace(/[<>]/g,"").trim();
  return decoded ? decoded.slice(0,120) : null;
}

export default async function ContactPage({searchParams}:ContactPageProps){
  const params=await searchParams;
  const selectedProduct=cleanSelection(params?.product);
  const selectedService=cleanSelection(params?.service);
  const selectedInterest=selectedProduct
    ? `Product: ${selectedProduct}`
    : selectedService
      ? `Service: ${selectedService}`
      : null;

  const issue=new URL("https://github.com/DataNest-Supository/DataNest/issues/new");
  issue.searchParams.set("template","trade-implementation-interest.yml");
  if(selectedInterest) issue.searchParams.set("title",`[TRADE] ${selectedInterest}`);

  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead">
        <span className="marketingTag">Start here</span>
        <h1>{selectedInterest ? `Let's scope ${selectedInterest.toLowerCase()}.` : "Tell DataNest what needs to change."}</h1>
        <p>Use the non-confidential intake to request a fit and scope screen for assurance, implementation, product or continuous oversight work.</p>
      </div>
      <div className="marketingFormShell">
        {selectedInterest && <div className="marketingNotice"><strong>Selected route:</strong> {selectedInterest}. The intake link below is pre-labelled so the request can enter the right commercial lane faster.</div>}
        <div className="marketingNotice" style={{marginTop:selectedInterest ? 12 : 0}}><strong>Do not submit secrets or confidential personal information.</strong> The public intake should contain only enough detail to establish scope and suitability. Detailed evidence is exchanged after an authorised engagement is agreed.</div>
        <p style={{color:"var(--text-secondary)",fontSize:12,lineHeight:1.7,marginTop:18}}>The current intake route is a GitHub issue template designed for trade and implementation interest. It records the initial request without making a commercial commitment.</p>
        <a
          className="marketingPrimary"
          href={issue.toString()}
          data-commercial-event="lead_handoff_started"
          data-commercial-product={selectedProduct ?? undefined}
          data-commercial-service={selectedService ?? undefined}
          data-commercial-cta="github-trade-intake"
        >Open Trade &amp; Implementation Interest ↗</a>
        <p style={{color:"var(--text-secondary)",fontSize:11,lineHeight:1.7,marginTop:18}}>For secure workspace access, use <a href="/workspace/" data-commercial-event="workspace_access_started" data-commercial-cta="contact-workspace" style={{color:"var(--brand-cyan)"}}>DataNest Workspace</a>.</p>
      </div>
    </section>
  </main><MarketingFooter/></div>;
}
