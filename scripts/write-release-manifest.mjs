import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const target=resolve(process.argv[2] || "public/release-manifest.json");
const manifest={
  project:"Resonance DataNest",
  frontendCommit:process.env.DATANEST_RELEASE_SHA || process.env.GITHUB_SHA || "local",
  databaseRelease:process.env.DATANEST_DB_RELEASE || "datanest-project-member-invitations-v1",
  baseline:{
    release:process.env.DATANEST_BASELINE_RELEASE || "reload-latest-v1",
    frontendCommit:process.env.DATANEST_BASELINE_SHA || "592149b0898f6703b28e9fa33e73bd0799cae3fd"
  },
  edgeFunctions:{
    aiChat:process.env.DATANEST_EDGE_AI || "datanest-ai-chat@1",
    externalIntake:process.env.DATANEST_EDGE_INTAKE || "datanest-ai-intake@1",
    certification:process.env.DATANEST_EDGE_CERTIFICATION || "datanest-ai-certification@1",
    providerManager:process.env.DATANEST_EDGE_PROVIDER || "manage-ai-provider-v2@1",
    invitations:process.env.DATANEST_EDGE_INVITES || "send-job-invite@1",
    projectInvitations:process.env.DATANEST_EDGE_PROJECT_INVITES || "send-project-member-invite@2"
  },
  supabaseProject:"sgqdmfgjbprsoqsmgigi",
  generatedAt:new Date().toISOString()
};
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(manifest)+"\n","utf8");
console.log("Wrote release manifest for",manifest.frontendCommit);
