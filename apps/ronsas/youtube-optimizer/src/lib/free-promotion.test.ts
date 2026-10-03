import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkoutUrl, tierMeets } from "@/lib/entitlement";
import { FREE_PROMOTION_ACTIVE } from "@/lib/promotion";

describe("free-promotion commercial guard", () => {
  it("keeps the promotion enabled and grants paid-tier capability checks", () => {
    expect(FREE_PROMOTION_ACTIVE).toBe(true);
    expect(tierMeets("free", "business")).toBe(true);
    expect(tierMeets(null, "pro")).toBe(true);
  });

  it("routes every former purchase path into the free app", () => {
    for (const plan of ["credits", "project", "studio", "business"]) {
      const url = checkoutUrl(plan, "https://example.test/back");
      expect(url).not.toContain("checkout");
      expect(url).not.toContain("reson8.life");
    }
  });

  it("keeps list prices informational while shipping no paid pricing lock CTA", () => {
    const pricing = readFileSync(resolve(process.cwd(), "src/pages/Pricing.tsx"), "utf8");
    const locked = readFileSync(resolve(process.cwd(), "src/components/LockedSection.tsx"), "utf8");
    const llms = readFileSync(resolve(process.cwd(), "public/llms.txt"), "utf8");

    expect(pricing).toContain("Standard list prices");
    expect(pricing).toContain("post-promotion commercial basis");
    expect(pricing).toMatch(/are not\s+currently charged while free promotion access remains enabled/);
    expect(pricing).not.toContain("Project pack");
    expect(locked).not.toContain("HUB_PRICING_URL");
    expect(locked).not.toContain("View hub pricing");
    expect(llms).not.toMatch(/R\s?\d/);
    expect(llms).not.toContain("Hub checkout");
    expect(llms).toContain("no charge");
  });
});
