import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const seed=fs.readFileSync(path.join(root,"scripts/seed-datanest-ai-e2e.mjs"),"utf8");

test("DataNest AI E2E seed closes only stale launched external sessions for deterministic fixture jobs",()=>{
  assert.match(seed,/closeStaleLaunchedExternalAiSessions/);
  assert.match(seed,/\.from\("external_ai_sessions"\)/);
  assert.match(seed,/\.update\(\{status:"closed",closed_at:now,updated_at:now\}\)/);
  assert.match(seed,/\.eq\("user_id",userId\)/);
  assert.match(seed,/\.in\("job_id",jobIds\)/);
  assert.match(seed,/\.eq\("status","launched"\)/);
  assert.match(seed,/\[job\.id,switchJob\.id\]/);
});

test("DataNest AI E2E seed does not delete external AI session history",()=>{
  assert.doesNotMatch(seed,/\.from\("external_ai_sessions"\)[\s\S]{0,260}\.delete\(\)/);
});
