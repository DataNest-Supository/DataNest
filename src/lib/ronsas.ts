export const RONSAS_ACRONYM = "RONSAS";
export const RONSAS_FULL_NAME = "Resonance Open Nova Sovereign Application Suite";

export function governedProductFullName(product:{
  slug?:string|null;
  name?:string|null;
  full_name?:string|null;
}){
  const slug=(product.slug||"").trim().toLowerCase();
  const name=(product.name||"").trim().toUpperCase();
  if(slug==="ronsas"||name===RONSAS_ACRONYM)return RONSAS_FULL_NAME;
  return product.full_name?.trim()||product.name?.trim()||"Governed product";
}
