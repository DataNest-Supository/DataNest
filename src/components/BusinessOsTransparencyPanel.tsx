import { DATANEST_PLATFORM_DEFINITION } from "@/lib/ecosystemAuthority";
import { DATANEST_NOMENCLATURE, type DataNestImplementationState } from "@/lib/datanestNomenclature";

const publicBasePath=process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const statePresentation:Record<DataNestImplementationState,{label:string;className:string}> = {
  implemented:{label:"IMPLEMENTED",className:"good"},
  partial:{label:"PARTIAL",className:"warn"},
  target:{label:"TARGET",className:"neutral"}
};

export default function BusinessOsTransparencyPanel(){
  const publicEntries=DATANEST_NOMENCLATURE.filter(entry=>entry.public);
  return <section className="panel businessOsTransparencyPanel" aria-labelledby="business-os-transparency-heading">
    <div className="panelHead">
      <div>
        <p className="eyebrow">BUSINESS OS ARCHITECTURE</p>
        <h2 id="business-os-transparency-heading">Business OS Architecture</h2>
      </div>
      <span className="countPill">PUBLIC MODEL</span>
    </div>
    <p>{DATANEST_PLATFORM_DEFINITION}</p>
    <p><b>Approved target architecture:</b> implementation status varies by component. Documented target-state capabilities are not presented as live until implementation and evidence exist.</p>
    <div className="businessOsStateLegend" aria-label="Implementation state legend">
      <span className="badge good">IMPLEMENTED</span>
      <span className="badge warn">PARTIAL</span>
      <span className="badge neutral">TARGET</span>
    </div>
    <div className="businessOsNomenclatureGrid">
      {publicEntries.map(entry=>{
        const state=statePresentation[entry.implementationState];
        return <article className="businessOsNomenclatureCard" key={entry.key}>
          <header>
            <h3>{entry.name}{entry.acronym&&entry.acronym!==entry.name?" · "+entry.acronym:""}</h3>
            <span className={"badge "+state.className}>{state.label}</span>
          </header>
          <p>{entry.definition}</p>
        </article>;
      })}
    </div>
    <p><b>Current boundary:</b> Sparks remain internal utility; iBank and the External Value Rail are target-state architecture in Phase 1.</p>
    <div className="businessOsTransparencyActions">
      <a className="primaryButton compact linkButton" href="./business-os">Open Business OS architecture</a>
      <a className="secondaryButton compact linkButton" href={`${publicBasePath}/transparency/business-os/nomenclature.json`}>Machine-readable nomenclature</a>
    </div>
  </section>;
}
