import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("Resonance DataNest brand migration",()=>{
  it("loads canonical fonts and the deliberate DataNest adapter",()=>{
    const main=read("src/main.tsx");
    const pkg=JSON.parse(read("package.json"));
    expect(main).toContain('@fontsource-variable/inter-tight');
    expect(main).toContain('@fontsource-variable/inter');
    expect(main).toContain('@fontsource/instrument-serif/400-italic.css');
    expect(main).toContain('@fontsource-variable/jetbrains-mono');
    expect(main.indexOf('./resonance-datanest-adapter.css')).toBeGreaterThan(main.indexOf('./index.css'));
    for(const dependency of ["@fontsource-variable/inter-tight","@fontsource-variable/inter","@fontsource/instrument-serif","@fontsource-variable/jetbrains-mono"]){
      expect(pkg.dependencies?.[dependency]).toBeTruthy();
    }
  });

  it("publishes canonical operator platform governance and legal attribution",()=>{
    const footer=read("src/components/brand/ResonanceFooter.tsx");
    expect(footer).toContain("Resonance Sole Proprietorship");
    expect(footer).toContain("Resonance App Development");
    expect(footer).toContain("Resonance DataNest");
    expect(footer).toContain("RSGP Governed");
    expect(footer).toContain("/legal");
    expect(footer).toContain("/governance");
    expect(footer).toContain("free promotion");
    expect(footer).not.toMatch(/checkout/i);
  });

  it("keeps legacy policy copy visibly review-gated and removes manufactured dates and guarantees",()=>{
    const terms=read("src/pages/Terms.tsx");
    const privacy=read("src/pages/Privacy.tsx");
    for(const source of [terms,privacy]){
      expect(source).toContain("Review required");
      expect(source).not.toMatch(/new Date\s*\(|toLocaleDateString\s*\(/);
    }
    expect(privacy).not.toMatch(/industry-standard encryption|not retained beyond the generation session/i);
  });

  it("provides light contrast focus and reduced-motion adapter rules",()=>{
    const adapter=read("src/resonance-datanest-adapter.css");
    expect(adapter).toContain("@media (prefers-color-scheme: light)");
    expect(adapter).toContain("@media (prefers-contrast: more)");
    expect(adapter).toContain("@media (prefers-reduced-motion: reduce)");
    expect(adapter).toContain("--dn-app-accent");
    expect(adapter).toContain("font-family");
  });
});
