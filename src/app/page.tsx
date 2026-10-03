import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "./marketing.css";

export const metadata = {
  title: "Governed Digital & AI Operations",
  description: "DataNest helps organisations build, govern and continuously improve digital and AI operations with evidence at every step.",
  keywords: ["AI governance", "digital operations", "technical assurance", "technical audit", "AI readiness", "South Africa"]
};

const assuranceOffers = [
  ["Regulatory & Controls Baseline", "R8,500", "Map one environment, identify priority control gaps and leave with an executive brief."],
  ["Compliance Readiness Review", "R17,500", "Map POPIA/PAIA and standards-aligned readiness, evidence gaps and remediation actions."],
  ["Technical Audit & Evidence Pack", "R25,000", "Review application, cloud or repository controls and produce risk-ranked evidence and backlog."],
  ["Continuous Digital Oversight", "R7,500 / month", "Monitor authorised drift, change, evidence and escalations after the initial assessment."]
];

export default function Home(){
  return (
    <div className="marketingShell">
      <MarketingHeader />
      <main>
        <section className="marketingContainer marketingHero">
          <div>
            <p className="marketingEyebrow">DATANEST · GOVERNED DIGITAL &amp; AI OPERATIONS</p>
            <h1>Move from <span className="marketingGradient">idea to operation</span> with evidence at every step.</h1>
            <p className="marketingHeroLead">
              DataNest combines digital delivery, AI governance, technical assurance and continuous oversight
              in one human-governed operating layer. Build what matters, prove what changed and keep the
              environment under review.
            </p>
            <div className="marketingActions">
              <Link className="marketingPrimary" href="/contact/" data-commercial-event="lead_started" data-commercial-service="assessment" data-commercial-cta="hero-request-assessment">Request an assessment</Link>
              <Link className="marketingSecondary" href="/solutions/">Explore solutions</Link>
              <Link className="marketingSecondary" href="/workspace/" data-commercial-event="workspace_access_started" data-commercial-cta="hero-workspace">Sign in to workspace</Link>
            </div>
          </div>
          <div className="marketingProof" aria-label="DataNest operating model">
            <article><b>01 · ASSESS</b><p>Understand governance, software, AI, data and operational controls before committing to change.</p></article>
            <article><b>02 · BUILD</b><p>Turn approved intent into governed work using planning, scheduling, evidence and release controls.</p></article>
            <article><b>03 · EVIDENCE</b><p>Connect decisions, implementation, verification and outcomes to source-controlled evidence.</p></article>
            <article><b>04 · OVERSIGHT</b><p>Keep monitoring drift, control health and improvement after deployment.</p></article>
          </div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingSectionHead">
            <span className="marketingTag">Three ways in</span>
            <h2>Buy the outcome you need now.</h2>
            <p>DataNest is designed so an organisation can start with a focused service and expand into implementation, recurring oversight or platform use.</p>
          </div>
          <div className="marketingGrid3">
            <article className="marketingCard"><h3>Assess</h3><p>AI governance, readiness, technical controls, evidence and risk discovery for a defined environment.</p><Link href="/assurance/">View assurance services →</Link></article>
            <article className="marketingCard"><h3>Build &amp; improve</h3><p>Governed digital-product, AI workflow and operational improvement work from intent through verified release.</p><Link href="/solutions/">See delivery solutions →</Link></article>
            <article className="marketingCard"><h3>Operate</h3><p>Continuous oversight, drift detection and evidence maintenance for teams that need ongoing control.</p><Link href="/pricing/">View recurring options →</Link></article>
          </div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingSectionHead">
            <span className="marketingTag">Revenue-ready service catalogue</span>
            <h2>Start with a defined engagement, then expand.</h2>
            <p>Current launch pricing is published up front. Prices are exclusive of VAT; scope, authorization, exclusions and regulated-activity boundaries remain explicit before work starts.</p>
          </div>
          <div className="marketingGrid4">
            {assuranceOffers.map(([name,price,summary]) => (
              <article className="marketingCard" key={name}>
                <h3>{name}</h3>
                <div className="marketingPrice">{price}</div>
                <p>{summary}</p>
                <Link href="/pricing/">Pricing &amp; scope →</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingSectionHead">
            <span className="marketingTag">Financial basis</span>
            <h2>Published pricing can be planned without pretending it is revenue.</h2>
            <p>Annualized figures below are arithmetic at current list prices. They describe commercial value at list price, not demand, profit or realised income.</p>
          </div>
          <div className="marketingGrid3">
            <article className="marketingCard"><h3>Continuous Oversight</h3><div className="marketingPrice">R90,000 <small>annualized list value</small></div><p>R7,500/month × 12 months for one engagement.</p></article>
            <article className="marketingCard"><h3>Enterprise Oversight</h3><div className="marketingPrice">R222,000 <small>annualized list value</small></div><p>R18,500/month × 12 months for one engagement.</p></article>
            <article className="marketingCard"><h3>Lifecycle example</h3><div className="marketingPrice">R58,500 <small>illustrative first-month list value</small></div><p>One Baseline + one Readiness Review + one Technical Audit + one month of Continuous Oversight.</p></article>
          </div>
          <div className="marketingNotice" style={{marginTop:18}}><strong>Financial-claim boundary:</strong> list prices and arithmetic values are published commercial terms. Realised revenue, profit, demand and forecasts require actual accounting, pipeline and capacity evidence.</div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingSectionHead">
            <span className="marketingTag">How the system compounds</span>
            <h2>Assessment can become implementation, evidence and recurring oversight.</h2>
          </div>
          <div className="marketingSteps">
            <article className="marketingStep"><h3>Discover</h3><p>Define the environment, desired outcome, authority and evidence baseline.</p></article>
            <article className="marketingStep"><h3>Remediate</h3><p>Turn findings into bounded implementation work, with human approval for consequential changes.</p></article>
            <article className="marketingStep"><h3>Verify</h3><p>Produce exact-version evidence showing what was changed and how it was checked.</p></article>
            <article className="marketingStep"><h3>Continue</h3><p>Convert completed work into an ongoing oversight, optimisation or platform relationship.</p></article>
          </div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingBand">
            <div><h2>Need a defensible starting point?</h2><p>Request a fit and scope screen before committing to a paid engagement.</p></div>
            <Link className="marketingPrimary" href="/contact/" data-commercial-event="lead_started" data-commercial-service="assessment" data-commercial-cta="scope-conversation">Start a scope conversation</Link>
          </div>
        </section>

        <section className="marketingContainer marketingSection">
          <div className="marketingGrid3">
            <article className="marketingCard"><h3>Human-governed</h3><p>AI can advise, coordinate and analyse, but consequential production, financial and legal authority stays explicitly controlled.</p></article>
            <article className="marketingCard"><h3>Evidence-led</h3><p>Claims are designed to remain traceable to source, version, verification and review evidence.</p></article>
            <article className="marketingCard"><h3>Provider-replaceable</h3><p>DataNest treats infrastructure as replaceable delivery machinery rather than the source of product identity or governance authority.</p></article>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
