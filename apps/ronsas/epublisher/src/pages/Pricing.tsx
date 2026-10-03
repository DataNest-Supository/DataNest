import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/storyforge/PageHeader";
import { AppFooter } from "@/components/storyforge/AppFooter";
import { Seo } from "@/components/Seo";
import { useI18n } from "@/lib/i18n";
import { HUB_URL } from "@/lib/hub";
import { FREE_PROMOTION_ACTIVE, FREE_PROMOTION } from "@/lib/promotion";

export default function Pricing() {
  const { t } = useI18n();
  const eyebrow = FREE_PROMOTION_ACTIVE ? FREE_PROMOTION.shortLabel : "Costing in progress";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo title="Free Access Promotion - Resonance ePublisher" description={FREE_PROMOTION.description} path="/pricing" />
      <PageHeader links={[
        { to: "/", label: t("nav.home") },
        { to: "/about", label: t("nav.about") },
        { to: "/contact", label: t("nav.contact") },
      ]} />
      <main className="flex-1 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-primary/25 bg-card/60 p-8 sm:p-12 shadow-brand-glow">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-mono uppercase tracking-[0.22em] text-primary mb-5">
            <Sparkles className="w-3 h-3" /> {eyebrow}
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight">{FREE_PROMOTION.headline}</h1>
          <p className="mt-5 text-lg text-muted-foreground">{FREE_PROMOTION.description}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            No payment, credit pack, checkout, or subscription is required while the promotion is active. Sign in so
            real generation, provider, storage, and support usage can continue to inform sustainable pricing.
          </p>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {[["Creator","R149/month","Individual publishing"],["Publisher","R399/month","Higher-volume publishing"],["Studio","R899/month","Professional publishing workflow"]].map(([name,price,scope]) => (
              <article key={name} className="rounded-2xl border border-white/10 bg-background/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">{name}</p>
                <p className="mt-2 text-2xl font-display font-bold">{price}</p>
                <p className="mt-2 text-xs text-muted-foreground">{scope}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Standard list prices, effective 3 October 2026, are the post-promotion commercial basis and are not
            currently charged while free promotion access remains enabled.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-white rounded-full">
              <Link to="/app">Open ePublisher free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <a href={HUB_URL} target="_blank" rel="noopener noreferrer">Back to Resonance Hub</a>
            </Button>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
