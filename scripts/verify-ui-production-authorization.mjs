import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildUiGovernanceEvidence } from "./write-ui-governance-evidence.mjs";

export const REQUIRED_CONFIRMATION="AUTHORIZE PRODUCTION";

export function verifyUiProductionAuthorization(env=process.env){
  const releaseSha=(env.DATANEST_UI_RELEASE_SHA || "").trim();
  if (!/^[0-9a-f]{40}$/i.test(releaseSha)) {
    throw new Error("DATANEST_UI_RELEASE_SHA must be an exact 40-character Git commit SHA");
  }

  if ((env.DATANEST_UI_PRODUCTION_CONFIRMATION || "").trim()!==REQUIRED_CONFIRMATION) {
    throw new Error(`DATANEST_UI_PRODUCTION_CONFIRMATION must equal ${REQUIRED_CONFIRMATION}`);
  }

  const evidence=buildUiGovernanceEvidence({
    ...env,
    DATANEST_UI_RELEASE_SHA:releaseSha,
    DATANEST_UI_RELEASE_STATE:"authorized"
  });

  if (!evidence.authorized) {
    throw new Error("Production authorization payload did not resolve to authorized state");
  }

  return evidence;
}

const directInvocation=
  process.argv[1] &&
  import.meta.url===pathToFileURL(resolve(process.argv[1])).href;

if (directInvocation) {
  const evidence=verifyUiProductionAuthorization();
  console.log("Validated UI production authorization payload for",evidence.releaseSha);
}
