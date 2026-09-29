import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const UI_GOVERNANCE_SCHEMA_VERSION="ui-governance-release-v1";
export const UI_GOVERNANCE_DESIGN_SPEC=
  "docs/superpowers/specs/2026-09-29-resonance-datanest-ui-governance-system-design.md";
export const UI_GOVERNANCE_IMPLEMENTATION_PLANS=[
  "docs/superpowers/plans/2026-09-29-resonance-datanest-ui-foundation-shell.md",
  "docs/superpowers/plans/2026-09-29-resonance-datanest-governance-legal-centre.md",
  "docs/superpowers/plans/2026-09-29-resonance-datanest-ronsas-ui-migration.md",
  "docs/superpowers/plans/2026-09-29-resonance-datanest-certification-production-gates.md"
];

const REVIEW_ENV=[
  ["prVerification","DATANEST_UI_PR_VERIFICATION_REF"],
  ["securityScan","DATANEST_UI_SECURITY_REF"],
  ["ronsasValidation","DATANEST_UI_RONSAS_VALIDATION_REF"],
  ["visualReview","DATANEST_UI_VISUAL_REVIEW_REF"],
  ["governanceReview","DATANEST_UI_GOVERNANCE_REVIEW_REF"],
  ["legalReview","DATANEST_UI_LEGAL_REVIEW_REF"],
  ["externalReview","DATANEST_UI_EXTERNAL_REVIEW_REF"],
  ["productionAuthorization","DATANEST_UI_AUTHORIZATION_REF"]
];

function clean(value){
  return typeof value==="string" ? value.trim() : "";
}

function isPlaceholder(value){
  const normalized=clean(value).toLowerCase();
  return !normalized || normalized==="pending" || normalized==="todo" || normalized==="tbd";
}

export function hasUiGovernanceEnvironment(env=process.env){
  return [
    "DATANEST_UI_RELEASE_SHA",
    "DATANEST_UI_RELEASE_STATE",
    ...REVIEW_ENV.map(([,envName])=>envName)
  ].some((name)=>env[name]!==undefined);
}

export function buildUiGovernanceEvidence(env=process.env){
  const releaseState=clean(env.DATANEST_UI_RELEASE_STATE) || "candidate";
  if (releaseState!=="candidate" && releaseState!=="authorized") {
    throw new Error("DATANEST_UI_RELEASE_STATE must be candidate or authorized");
  }

  const releaseSha=clean(env.DATANEST_UI_RELEASE_SHA);
  if (!releaseSha) {
    throw new Error("DATANEST_UI_RELEASE_SHA is required");
  }

  if (releaseState==="authorized") {
    for (const [,envName] of REVIEW_ENV) {
      if (isPlaceholder(env[envName])) {
        throw new Error(`${envName} must contain a non-placeholder review reference for an authorized release`);
      }
    }
  }

  const evidence={};
  for (const [key,envName] of REVIEW_ENV) {
    const raw=clean(env[envName]);
    const supplied=!isPlaceholder(raw);
    const candidateAuthorization=releaseState==="candidate" && key==="productionAuthorization";
    evidence[key]={
      status:supplied && !candidateAuthorization ? "supplied" : "pending",
      reference:supplied && !candidateAuthorization ? raw : null
    };
  }

  return {
    schemaVersion:UI_GOVERNANCE_SCHEMA_VERSION,
    project:"Resonance DataNest",
    releaseSha,
    releaseState,
    authorized:releaseState==="authorized",
    designSpec:UI_GOVERNANCE_DESIGN_SPEC,
    implementationPlans:UI_GOVERNANCE_IMPLEMENTATION_PLANS,
    evidence,
    generatedAt:new Date().toISOString()
  };
}

export function writeUiGovernanceEvidence(
  target=resolve("public/ui-governance-release.json"),
  env=process.env
){
  const output=resolve(target);
  const evidence=buildUiGovernanceEvidence(env);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(evidence)+"\n","utf8");
  return evidence;
}

const directInvocation=
  process.argv[1] &&
  import.meta.url===pathToFileURL(resolve(process.argv[1])).href;

if (directInvocation) {
  const target=process.argv[2] || "public/ui-governance-release.json";
  const evidence=writeUiGovernanceEvidence(target);
  console.log("Wrote UI governance evidence for",evidence.releaseSha,evidence.releaseState);
}
