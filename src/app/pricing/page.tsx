import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Pricing",
  description:"DataNest launch pricing for regulatory readiness, technical assurance, continuous oversight and specialist advisory."
};

const packages=[
  ["Regulatory & Controls Baseline","R8,500","once-off","1 environment","Governance/control inventory, priority findings and executive brief."],
  ["Compliance Readiness Review","R17,500","once-off","Defined scope","POPIA/PAIA and standards-aligned readiness mapping, evidence gaps and remediation plan."],
  ["Technical Audit & Evidence Pack","R25,000","once-off","App, cloud or repository","Control review, evidence register, risk-ranked findings and implementation backlog."],
  ["Continuous Digital Oversight","R7,500","per month","1 defined environment","Authorised monitoring, monthly control review, drift/change detection and escalation register."],
  ["Enterprise Oversight","R18,500","per month","Multi-system","Governance dashboard, supplier/control evidence tracking and quarterly deep review."],
  ["Specialist Advisory","R1,850","per hour","Advisory scope","Architecture, governance, security, evidence, remediation and implementation advisory."]
];

export default function PricingPage(){
  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Launch pricing · ZAR</span><h1>Defined commercial entry points.</h1><p>Published starting prices make it easier to understand the engagement. Prices are exclusive of VAT; final scope, authorisation, exclusions and applicable taxes or third-party costs are agreed in writing.</p></div>
      <div className="marketingGrid3">
        {packages.map(([name,price,cadence,scope,summary])=><article className="marketingCard" key={name}><h3>{name}</h3><div className="marketingPrice">{price} <small>{cadence}</small></div><p><strong>Scope:</strong> {scope}</p><p style={{marginTop:8}}>{summary}</p><Link href="/contact/">Request this engagement →</Link></article>)}
      </div>
    </section>
    <section className="marketingSection">
      <div className="marketingNotice"><strong>Commercial boundary:</strong> taxes, travel, specialist third-party tools and external certification/registration fees are excluded unless the written quotation says otherwise. DataNest does not present itself as a statutory regulator, accredited certification body or IRBA-registered audit firm. Reserved activities are handled only within the applicable lawful/qualified boundary.</div>
    </section>
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Expansion path</span><h2>One-off work can become recurring oversight.</h2><p>A baseline or audit can lead into remediation, verification and ongoing monitoring when that is useful to the client.</p></div>
      <div className="marketingSteps"><article className="marketingStep"><h3>Baseline</h3><p>Understand the environment and priority gaps.</p></article><article className="marketingStep"><h3>Remediate</h3><p>Implement agreed changes under a separate scope.</p></article><article className="marketingStep"><h3>Verify</h3><p>Re-test changes and package evidence.</p></article><article className="marketingStep"><h3>Oversight</h3><p>Keep monitoring and evidence current.</p></article></div>
    </section>

    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Financial basis</span><h2>Published prices support transparent commercial planning.</h2><p>Annualized values below are arithmetic at published list prices, not forecasts or guarantees.</p></div>
      <div className="marketingGrid3">
        <article className="marketingCard"><h3>Continuous Oversight</h3><div className="marketingPrice">R90,000 <small>annualized list price</small></div><p>R7,500/month × 12 months for one continuous oversight engagement.</p></article>
        <article className="marketingCard"><h3>Enterprise Oversight</h3><div className="marketingPrice">R222,000 <small>annualized list price</small></div><p>R18,500/month × 12 months for one enterprise oversight engagement.</p></article>
        <article className="marketingCard"><h3>Example service mix</h3><div className="marketingPrice">R58,500 <small>illustrative first-month list value</small></div><p>One Baseline + one Readiness Review + one Technical Audit + one month of Continuous Oversight. This is a pricing arithmetic example, not an income forecast.</p></article>
      </div>
      <div className="marketingNotice" style={{marginTop:18}}><strong>Financial-claim boundary:</strong> published prices and arithmetic list values are factual commercial terms. Realised revenue, profit, demand and forecasts require actual accounting, pipeline and capacity evidence.</div>
    </section>
    <section className="marketingSection"><div className="marketingBand"><div><h2>Not sure which package fits?</h2><p>Start with a no-cost fit and scope screen.</p></div><Link className="marketingPrimary" href="/contact/">Request assessment</Link></div></section>
  </main><MarketingFooter/></div>;
}
