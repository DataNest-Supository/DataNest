import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Products",
  description:"DataNest platform and governed RONSAS application portfolio with transparent commercial list pricing."
};

const products=[
  ["DataNest","Platform","Governed planning, AI collaboration, execution, evidence, transparency and product governance.","See platform →"],
  ["Career Compass","RONSAS app","Career-planning workflow designed as a low-friction recurring utility.","Standard R149/mo · Pro R299/mo"],
  ["Creative Studio","RONSAS app","Creative generation, studio workflows, moodboards, product work and library.","Creator R249/mo · Studio R699/mo · Team R1,499/mo"],
  ["ePublisher","RONSAS app","Publishing/export workflow with hosted premium features and quota-aware operation.","Creator R149/mo · Publisher R399/mo · Studio R899/mo"],
  ["LyricSync Studio","RONSAS app","Deterministic lyric timing and LRC export without an external service dependency.","Standard R99/mo · Studio R199/mo"],
  ["Scene Song Spark","RONSAS app","Deterministic scene/song ideation from concept, mood, duration and scene count.","Creator R79/mo · Studio R199/mo"],
  ["Sovereign Forge","RONSAS app","Governed project manifest/build tooling with DataNest as source authority.","Community free · Pro R499/mo · Team R1,499/mo · Enterprise"],
  ["SyncVision","RONSAS app","Music-video treatment, scene direction, rendering, vocal sync and delivery workflow.","Creator R299/mo · Studio R799/mo · Pro R1,499/mo"],
  ["YouTube Optimizer","RONSAS app","YouTube channel audits, content ideas, trends, monetisation and scheduling.","Creator R249/mo · Growth R649/mo · Agency R1,499/mo · Enterprise","youtube-optimizer"]
];

export default function ProductsPage(){
  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Product portfolio · price book effective 3 October 2026</span><h1>Products governed through the DataNest operating layer.</h1><p>Standard list prices are exclusive of VAT. Products marked promotional remain free while their active free-access promotion is enabled; the standard list price is the post-promotion commercial basis, not a claim that paid checkout is already active.</p></div>
      <div className="marketingGrid3">
        {products.map(([name,type,summary,price,slug])=>{const promotional=["Creative Studio","ePublisher","SyncVision","YouTube Optimizer"].includes(name); const href=name==="DataNest" ? "/workspace/" : promotional ? (name==="YouTube Optimizer" ? "https://youtubeoptimizer.life/" : `/DataNest/apps/${slug}/`) : `/contact/?product=${encodeURIComponent(name)}`; return <article className="marketingCard" key={name}><span className="marketingTag">{type}</span><h3 style={{marginTop:10}}>{name}</h3><p>{summary}</p><p style={{marginTop:12,color:"var(--brand-cyan)",fontSize:11,fontWeight:800}}>{price}</p><Link href={href} data-commercial-event={name==="DataNest" ? "workspace_access_started" : promotional ? "signup_started" : "lead_started"} data-commercial-product={name} data-commercial-cta={promotional ? "product-start-free" : name==="DataNest" ? "product-workspace" : "product-availability"}>{name==="DataNest" ? "Open workspace →" : promotional ? "Start free →" : "Request availability →"}</Link></article>})}
      </div>
    </section>

    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">RONSAS pricing logic</span><h2>Simple entry tiers, with usage controls where costs vary.</h2><p>Low-cost deterministic utilities use straightforward subscriptions. Compute-heavy products use tiered access and governed usage/credit controls so infrastructure cost does not disappear inside an “unlimited” promise.</p></div>
      <div className="marketingGrid3">
        <article className="marketingCard"><h3>Free acquisition</h3><p>Selected RONSAS products are currently in a free-access promotion. This supports adoption and cost measurement without falsely treating free promotional use as revenue.</p></article>
        <article className="marketingCard"><h3>Recurring software</h3><p>Career Compass, ePublisher, LyricSync Studio and Scene Song Spark use accessible monthly list prices suited to individual users and creators.</p></article>
        <article className="marketingCard"><h3>Compute-aware products</h3><p>Creative Studio, SyncVision and YouTube Optimizer use higher tiers and/or measurable usage controls to protect gross-margin discipline as usage scales.</p></article>
      </div>
    </section>

    <section className="marketingSection">
      <div className="marketingNotice"><strong>Financial-claim boundary:</strong> list prices and annualized list-price values in the RONSAS price book are commercial terms or arithmetic only. They do not represent realised revenue, customer demand, profit or forecast income.</div>
    </section>

    <section className="marketingSection">
      <div className="marketingBand"><div><h2>Need a product-specific commercial discussion?</h2><p>Request availability, onboarding, implementation or enterprise scope.</p></div><Link className="marketingPrimary" href="/contact/?product=portfolio" data-commercial-event="lead_started" data-commercial-product="RONSAS portfolio" data-commercial-cta="products-talk-to-datanest">Talk to DataNest</Link></div>
    </section>
  </main><MarketingFooter/></div>;
}
