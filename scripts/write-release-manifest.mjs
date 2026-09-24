import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const target=resolve(process.argv[2] || "public/release-manifest.json");
const manifest={
  project:"Resonance DataNest",
  frontendCommit:process.env.DATANEST_RELEASE_SHA || process.env.GITHUB_SHA || "local",
  databaseRelease:process.env.DATANEST_DB_RELEASE || "external-ai-sidebar-v1",
  baseline:{
    release:process.env.DATANEST_BASELINE_RELEASE || "stakeholder-pilot-v1",
    frontendCommit:process.env.DATANEST_BASELINE_SHA || "83b74b5bb74b9669b0f0aed42274f1d888a26702"
  },
  edgeFunctions:{
    aiChat:process.env.DATANEST_EDGE_AI || "rnd-ai-chat-v3@1",
    providerManager:process.env.DATANEST_EDGE_PROVIDER || "manage-ai-provider-v2@1",
    invitations:process.env.DATANEST_EDGE_INVITES || "send-job-invite@1"
  },
  supabaseProject:"sgqdmfgjbprsoqsmgigi",
  generatedAt:new Date().toISOString()
};
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(manifest)+"\n","utf8");
console.log("Wrote release manifest for",manifest.frontendCommit);
