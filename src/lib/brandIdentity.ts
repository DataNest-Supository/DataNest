export const DATANEST_DISPLAY_NAME = "Resonance DataNest";
export const RSGP_GOVERNANCE_LABEL = "RSGP Governed";

export const RESONANCE_BUSINESS_IDENTITY = {
  legalOperator:"Resonance Sole Proprietorship",
  businessBrand:"Resonance App Development",
  platform:"Resonance DataNest",
  governance:"RSGP"
} as const;

export function applicationAttribution(name:string):string {
  return `${name} — a governed Resonance DataNest application by Resonance App Development.`;
}
