import Link from "next/link";
import TraceabilityWorkspace from "@/components/TraceabilityWorkspace";

export const metadata={
  title:"LIBERTY-IN-ALL Traceability · DataNest",
  description:"Continuously refreshed public DataNest traceability index for stakeholders, auditors, regulators, users and other interested parties.",
  alternates:{canonical:"https://datanest-supository.github.io/DataNest/traceability/"}
};

export default function TraceabilityPage(){
  return <main className="publicEvidenceShell">
    <header className="publicEvidenceHeader">
      <Link href="/transparency">← Public Transparency</Link>
      <span>PUBLIC TRACEABILITY</span>
    </header>
    <TraceabilityWorkspace/>
    <footer className="publicEvidenceFooter">
      <span>LIBERTY-IN-ALL publishes sanitized evidence and does not grant authority.</span>
      <a href="https://github.com/DataNest-Supository/DataNest/blob/main/docs/LIBERTY_IN_ALL_STANDARD.md">Standard source ↗</a>
    </footer>
  </main>;
}
