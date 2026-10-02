import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const pages=fs.readFileSync(path.join(root,".github/workflows/pages.yml"),"utf8");
const certification=fs.readFileSync(path.join(root,".github/workflows/datanest-ai-certification.yml"),"utf8");

test("progressive-live manifest verifier resolves mode in its own Node process",()=>{
  assert.match(
    pages,
    /const mode=process\.env\.RELEASE_MODE;\s+const manifest=JSON\.parse\(fs\.readFileSync\("\/tmp\/release-manifest\.json","utf8"\)\);[\s\S]*if\(mode!=="progressive_live"\)\{/
  );
  assert.match(pages,/Live release must carry a verified production database attestation/);
  assert.match(pages,/Live release must carry a verified Edge Function attestation/);
});

test("manual DataNest AI certification dispatch writes classification evidence before upload",()=>{
  assert.match(
    certification,
    /if \[ "\$EVENT_NAME" = "workflow_dispatch" \]; then[\s\S]*reason=manual_dispatch[\s\S]*certification-artifacts\/datanest-ai-classification\.json[\s\S]*reason:"manual_dispatch"[\s\S]*exit 0/
  );
  assert.match(
    certification,
    /name: Preserve classification evidence[\s\S]*path: certification-artifacts\/datanest-ai-classification\.json[\s\S]*if-no-files-found: error/
  );
});
