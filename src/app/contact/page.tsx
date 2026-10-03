import { Suspense } from "react";
import ContactContent from "@/components/marketing/ContactContent";

export const metadata={
  title:"Contact & Assessment",
  description:"Request a DataNest fit and scope screen for assurance, delivery, governance or continuous oversight."
};

export default function ContactPage(){
  return <Suspense fallback={<main className="marketingContainer"><section className="marketingSection"><p>Loading commercial intake…</p></section></main>}><ContactContent/></Suspense>;
}
