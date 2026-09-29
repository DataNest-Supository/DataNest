import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalDocumentMeta } from "@/lib/legalRegistry";
import LegalStatusBanner from "@/components/legal/LegalStatusBanner";

export default function LegalDocumentLayout({document,children}:{document:LegalDocumentMeta;children:ReactNode}){
  return <main className="legalDocumentShell" id="main-content">
    <header className="legalDocumentHeader">
      <Link href="/legal" className="legalBackLink">← Governance &amp; Legal Centre</Link>
      <p className="eyebrow">GOVERNED POLICY RECORD</p>
      <h1>{document.title}</h1>
    </header>
    <LegalStatusBanner document={document}/>
    <article className="legalDocumentBody">{children}</article>
  </main>;
}
