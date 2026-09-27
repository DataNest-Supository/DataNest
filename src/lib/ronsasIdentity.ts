export const RONSAS_FULL_NAME = "Resonance Open Nova Sovereign Application Suite";

type GovernedProductIdentity = {
  slug?: string | null;
  name?: string | null;
  full_name?: string | null;
};

export function governedProductFullName(product: GovernedProductIdentity) {
  const slug=(product.slug||"").trim().toLowerCase();
  const name=(product.name||"").trim().toUpperCase();
  if(slug==="ronsas"||name==="RONSAS")return RONSAS_FULL_NAME;
  return product.full_name?.trim()||product.name?.trim()||"";
}
