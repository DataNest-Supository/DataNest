import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Solutions",
  description:"DataNest solutions for AI governance, digital assurance, technical audit, delivery and continuous oversight."
};

const solutions=[
  ["AI governance & readiness","For teams adopting AI that need clear use boundaries, evidence, risk controls and reviewable operating practices.","AI inventory, governance controls, evidence mapping, implementation backlog and readiness review."],
  ["Technical assurance","For software, cloud and data environments where management or procurement needs evidence instead of unsupported claims.","Repository/application/cloud control review, findings, evidence pack and remediation priorities."],
  ["Digital delivery & improvement","For organisations that need a governed path from intent through implementation, verification and production.","Planning, scheduling, product delivery, testing, evidence and controlled release."],
  ["Continuous oversight","For environments where controls must stay visible after the assessment or implementation is complete.","Authorised drift/change monitoring, monthly control review, evidence maintenance and escalation tracking."]
];

export default function SolutionsPage(){
  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Solutions</span><h1>One operating model, four commercial entry points.</h1><p>Start with the problem you need solved. DataNest connects the engagement to evidence, implementation and ongoing oversight when the relationship expands.</p></div>
      <div className="marketingGrid3">
        {solutions.map(([name,summary,deliverables])=><article className="marketingCard" key={name}><h3>{name}</h3><p>{summary}</p><p className="muted" style={{marginTop:12}}><strong>Typical output:</strong> {deliverables}</p><Link href="/contact/">Discuss this solution →</Link></article>)}
      </div>
    </section>
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Operating sequence</span><h2>From evidence to durable improvement.</h2></div>
      <div className="marketingSteps">
        <article className="marketingStep"><h3>Scope</h3><p>Define authorised systems, people, data, jurisdiction and desired outcome.</p></article>
        <article className="marketingStep"><h3>Assess</h3><p>Collect and classify evidence, limitations and material gaps.</p></article>
        <article className="marketingStep"><h3>Act</h3><p>Plan and implement bounded changes with human approval where required.</p></article>
        <article className="marketingStep"><h3>Monitor</h3><p>Track evidence, drift and outcomes so improvement remains operational.</p></article>
      </div>
    </section>
    <section className="marketingSection"><div className="marketingBand"><div><h2>Need the right starting package?</h2><p>The fit/scope screen is available before a paid engagement.</p></div><Link className="marketingPrimary" href="/contact/">Request a scope screen</Link></div></section>
  </main><MarketingFooter/></div>;
}
