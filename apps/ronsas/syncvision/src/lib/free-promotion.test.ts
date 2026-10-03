import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hubCheckoutUrl, tierMeets } from "@/lib/entitlement";
import { FREE_PROMOTION_ACTIVE } from "@/lib/promotion";

describe("free-promotion commercial guard", () => {
  it("keeps the promotion enabled and grants paid-tier capability checks", () => {
    expect(FREE_PROMOTION_ACTIVE).toBe(true);
    expect(tierMeets("free", "business")).toBe(true);
    expect(tierMeets(null, "creator")).toBe(true);
  });

  it("never constructs a Hub checkout URL", () => {
    for (const sku of ["sync_vision:creator:monthly", "sync_vision:pro:monthly", "sync_vision:business:monthly"]) {
      expect(hubCheckoutUrl(sku, "https://example.test/back")).toBe("/");
    }
  });

  it("keeps list prices informational while the free promotion remains active", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/landing/PricingSection.tsx"), "utf8");
    expect(source).toContain("Standard list prices");
    expect(source).toContain("post-promotion commercial basis");
    expect(source).toContain("paid access is not activated while the promotion is enabled");
    expect(source).not.toContain("hubCheckoutUrl");
    expect(source).not.toContain("Buy Creator");
    expect(source).toContain("Open Sync Vision free");
  });

  it("does not point free offer metadata at a pricing checkout surface", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).not.toContain('"url": "https://www.reson8.life/pricing"');
  });
});
