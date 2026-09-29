import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export const metadata={
  title:"Resonance DataNest — Business OS & Collective Intelligence Architecture",
  description:"Approved target architecture for the Resonance DataNest Business OS and Collective Intelligence model."
};

const report=fs.readFileSync(
  path.join(process.cwd(),"docs/superpowers/specs/2026-09-29-datanest-business-os-collective-intelligence-design.md"),
  "utf8"
);

export default function BusinessOsPage(){
  return <main className="publicReportPage">
    <header>
      <Link href="./transparency">← Public Transparency</Link>
      <a href="https://github.com/DataNest-Supository/DataNest/blob/main/docs/superpowers/specs/2026-09-29-datanest-business-os-collective-intelligence-design.md">Source ↗</a>
    </header>
    <article>
      <p className="eyebrow">APPROVED TARGET ARCHITECTURE</p>
      <h1>Resonance DataNest — Business OS &amp; Collective Intelligence Architecture</h1>
      <p className="muted">Approved target architecture · implementation status varies by section.</p>
      <p className="muted">The source-controlled specification is rendered as read-only text. Target-state concepts remain target state until separately implemented, verified and promoted.</p>
      <div className="publicReportFrame"><pre>{report}</pre></div>
    </article>
  </main>;
}
