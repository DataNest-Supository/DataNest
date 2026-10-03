import Link from "next/link";

export default function MarketingFooter(){
  return (
    <footer className="marketingFooter">
      <div>
        <strong>DataNest</strong>
        <p>Governed digital and AI operations with evidence at every step.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/solutions/">Solutions</Link>
        <Link href="/products/">Products</Link>
        <Link href="/pricing/">Pricing</Link>
        <Link href="/assurance/">Assurance</Link>
        <Link href="/transparency/">Transparency</Link>
        <Link href="/workspace/">Workspace</Link>
      </nav>
      <small>Human approval remains the final gate for consequential action. Standards references describe alignment targets, not certification.</small>
    </footer>
  );
}
