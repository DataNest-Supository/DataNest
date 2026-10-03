import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Contact & Assessment",
  description:"Request a DataNest fit and scope screen for assurance, delivery, governance or continuous oversight."
};

const issueUrl="https://github.com/DataNest-Supository/DataNest/issues/new?template=trade-implementation-interest.yml";

export default function ContactPage(){
  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Start here</span><h1>Tell DataNest what needs to change.</h1><p>Use the non-confidential intake to request a fit and scope screen for assurance, implementation, product or continuous oversight work.</p></div>
      <div className="marketingFormShell">
        <div className="marketingNotice"><strong>Do not submit secrets or confidential personal information.</strong> The public intake should contain only enough detail to establish scope and suitability. Detailed evidence is exchanged after an authorised engagement is agreed.</div>
        <p style={{color:"var(--text-secondary)",fontSize:12,lineHeight:1.7,marginTop:18}}>The current intake route is a GitHub issue template designed for trade and implementation interest. It records the initial request without making a commercial commitment.</p>
        <a className="marketingPrimary" href={issueUrl}>Open Trade &amp; Implementation Interest ↗</a>
        <p style={{color:"var(--text-secondary)",fontSize:11,lineHeight:1.7,marginTop:18}}>For secure workspace access, use <a href="/workspace/" style={{color:"var(--brand-cyan)"}}>DataNest Workspace</a>.</p>
      </div>
    </section>
  </main><MarketingFooter/></div>;
}
