import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HUB_URL } from "@/lib/entitlement";
import { FREE_PROMOTION_ACTIVE, FREE_PROMOTION } from "@/lib/promotion";

export function PricingSection() {
  const eyebrow = FREE_PROMOTION_ACTIVE ? FREE_PROMOTION.shortLabel : "Costing in progress";

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="border-t border-white/5 bg-secondary/30">
      <div className="container py-14 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/25 bg-card/60 p-8 text-center backdrop-blur-xl sm:p-12">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> {eyebrow}
          </p>
          <h2 id="pricing-heading" className="mt-6 text-3xl font-bold sm:text-5xl">{FREE_PROMOTION.headline}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{FREE_PROMOTION.description}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            No payment, pack, credit top-up, checkout, or subscription is required while the promotion is active.
            Storyboard, rendering, lipsync, storage, and provider usage remain measurable for cost control.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            {[["Creator","R299/month","Music creators and independent releases"],["Studio","R799/month","Regular production and richer workflow capacity"],["Pro","R1,499/month","High-volume professional production"]].map(([name,price,scope]) => (
              <article key={name} className="rounded-2xl border border-white/10 bg-background/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">{name}</p>
                <p className="mt-2 text-2xl font-display font-bold">{price}</p>
                <p className="mt-2 text-xs text-muted-foreground">{scope}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-4 max-w-3xl text-xs text-muted-foreground">
            Standard list prices, effective 3 October 2026, are the post-promotion commercial basis. Usage/credit
            controls remain applicable to compute-heavy generation; paid access is not activated while the promotion is enabled.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full"><a href="/login">Open Sync Vision free</a></Button>
            <Button asChild variant="outline" className="rounded-full"><a href={HUB_URL}>Back to Resonance Hub</a></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
