import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import "../marketing.css";

export const metadata={
  title:"Products",
  description:"DataNest platform and governed RONSAS application portfolio."
};

const products=[
  ["DataNest","Platform","Governed planning, AI collaboration, execution, evidence, transparency and product governance."],
  ["Career Compass","RONSAS app","Career-oriented product surface in the governed RONSAS portfolio."],
  ["Creative Studio","RONSAS app","Creative production application in the governed RONSAS portfolio."],
  ["ePublisher","RONSAS app","Publishing-oriented product surface in the governed RONSAS portfolio."],
  ["LyricSync Studio","RONSAS app","Lyric and media workflow product in the governed RONSAS portfolio."],
  ["Scene Song Spark","RONSAS app","Creative ideation product in the governed RONSAS portfolio."],
  ["Sovereign Forge","RONSAS app","Sovereign source, registry and replication-oriented product surface."],
  ["SyncVision","RONSAS app","Synchronisation and visibility product surface in the governed portfolio."],
  ["YouTube Optimizer","RONSAS app","Externally deployed optimization product with its own public delivery route."]
];

export default function ProductsPage(){
  return <div className="marketingShell"><MarketingHeader/><main className="marketingContainer">
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Product portfolio</span><h1>Products governed through the DataNest operating layer.</h1><p>Product registration in the Supository establishes lifecycle and provenance relationships. Commercial availability, pricing and general availability remain product-specific.</p></div>
      <div className="marketingGrid3">
        {products.map(([name,type,summary])=><article className="marketingCard" key={name}><span className="marketingTag">{type}</span><h3 style={{marginTop:10}}>{name}</h3><p>{summary}</p><Link href="/contact/">Ask about availability →</Link></article>)}
      </div>
    </section>
    <section className="marketingSection">
      <div className="marketingSectionHead"><span className="marketingTag">Why the portfolio matters</span><h2>Products share a governed operating model.</h2><p>Where appropriate, DataNest can apply shared planning, evidence, quality, security and lifecycle controls without forcing every product into the same customer journey.</p></div>
    </section>
  </main><MarketingFooter/></div>;
}
