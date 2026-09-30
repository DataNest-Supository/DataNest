export type DataNestImplementationState = "implemented" | "partial" | "target";

export type DataNestNomenclatureEntry = {
  key:string;
  name:string;
  acronym:string|null;
  definition:string;
  implementationState:DataNestImplementationState;
  public:boolean;
};

export const DATANEST_NOMENCLATURE = [
  {key:"ilm",name:"Inclusive Language Model",acronym:"ILM",definition:"The governed inclusive evidence-understanding layer. DataNest currently has partial ILM-1 orchestration foundations rather than a proprietary foundation-model claim.",implementationState:"partial",public:true},
  {key:"all",name:"Amalgamated Learning Language",acronym:"ALL",definition:"Target-state language-evolution layer that learns reviewed articulation patterns without overwriting source evidence.",implementationState:"target",public:true},
  {key:"csl",name:"Collective Source Language",acronym:"CSL",definition:"Target-state versioned collective semantic representation that retains scope, provenance, uncertainty, supporting evidence, contrary evidence, and supersession history.",implementationState:"target",public:true},
  {key:"gal",name:"Group Aligned Learning",acronym:"GAL",definition:"Target-state method for building governed collective understanding within an authorized group or scope.",implementationState:"target",public:true},
  {key:"galux",name:"Group Aligned Learning User-Experience",acronym:"GALUX",definition:"Target-state adaptive presentation layer that changes articulation for comprehension without changing underlying evidence, authority, or uncertainty.",implementationState:"target",public:true},
  {key:"ratb",name:"Resonance Allowance Tolerance Boundaries",acronym:"RATB",definition:"Target-state user-declared collaboration boundaries distinguishing allowance, tolerance, and hard non-negotiables.",implementationState:"target",public:true},
  {key:"rsgp",name:"Resonance Sovereign Governance Protocol",acronym:"RSGP",definition:"The approved constitutional governance model for Resonance DataNest, extending existing sovereign-governance and authority-execution foundations.",implementationState:"partial",public:true},
  {key:"project_director",name:"Project Director",acronym:null,definition:"Target-state governed AI orchestration representative for project lifecycle, UNIFI decomposition, TranScheduler conduct, evidence monitoring, and escalation within an explicit mandate.",implementationState:"target",public:true},
  {key:"conversation_specialist",name:"Conversation Specialist",acronym:null,definition:"Target-state governed relationship-intelligence and communication layer for approved internal and external conversation channels.",implementationState:"target",public:true},
  {key:"growth_spark",name:"Growth Spark",acronym:null,definition:"Target-state opportunity-sensing capability that converts eligible relationship signals into evidence-backed growth candidates; it is distinct from iBank Sparks.",implementationState:"target",public:true},
  {key:"barterer_tender",name:"Barterer Tender",acronym:null,definition:"Target-state iBank AI Representative for governed barter, tender, value-comparison, proposal, and bounded negotiation workflows.",implementationState:"target",public:true},
  {key:"n0nymous_squad",name:"N0nymous Squad",acronym:null,definition:"Pseudonymous evidence-based participation and capability consideration layer. Current implementation is partial and does not itself grant project, legal, financial, or governance authority.",implementationState:"partial",public:true},
  {key:"ibank",name:"Resonance iBank",acronym:"iBank",definition:"Target-state governed value, resource, and exchange layer. The future External Value Rail is separate from the current Sparks internal-utility rail and requires separate implementation and legal/governance gates.",implementationState:"target",public:true},
  {key:"sparks",name:"Sparks",acronym:null,definition:"Implemented DataNest internal utility for earned contribution utility and approved project services; current Sparks have no cash value and do not create ownership, voting, or financial authority.",implementationState:"implemented",public:true}
] as const satisfies readonly DataNestNomenclatureEntry[];

export function getDataNestNomenclatureEntry(key:string):DataNestNomenclatureEntry|undefined {
  return DATANEST_NOMENCLATURE.find(entry=>entry.key===key);
}
