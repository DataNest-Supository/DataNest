import Link from "next/link";
import ThemeControl from "@/components/platform/ThemeControl";
import ResonanceBrandLockup from "@/components/platform/ResonanceBrandLockup";

export default function MarketingHeader(){
  return (
    <header className="marketingHeader">
      <Link href="/" className="marketingBrand" aria-label="DataNest home">
        <ResonanceBrandLockup compact />
      </Link>
      <nav className="marketingNav" aria-label="Main navigation">
        <Link href="/solutions/">Solutions</Link>
        <Link href="/products/">Products</Link>
        <Link href="/pricing/">Pricing</Link>
        <Link href="/system-charter/">Evidence</Link>
        <Link href="/contact/">Contact</Link>
      </nav>
      <div className="marketingHeaderActions">
        <ThemeControl compact />
        <Link href="/workspace/" className="marketingSignIn" data-commercial-event="workspace_access_started" data-commercial-cta="header-workspace">Workspace</Link>
        <Link href="/contact/" className="marketingCta" data-commercial-event="lead_started" data-commercial-service="assessment" data-commercial-cta="header-request-assessment">Request assessment</Link>
      </div>
    </header>
  );
}
