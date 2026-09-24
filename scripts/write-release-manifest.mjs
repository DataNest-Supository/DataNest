import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const target=resolve(process.argv[2] || "public/release-manifest.json");
const manifest={
  project:"Resonance DataNest",
  frontendCommit:process.env.DATANEST_RELEASE_SHA || process.env.GITHUB_SHA || "local",
  databaseRelease:process.env.DATANEST_DB_RELEASE || "external-ai-companion-v1",
  baseline:{
    release:process.env.DATANEST_BASELINE_RELEASE || "external-ai-sidebar-v1",
    frontendCommit:process.env.DATANEST_BASELINE_SHA || "a7b78c398292d95a3eb0f355507917b899eeb0ee"
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
