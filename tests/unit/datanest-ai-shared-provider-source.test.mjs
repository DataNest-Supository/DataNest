import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl=new URL("../../supabase/functions/datanest-ai-chat/index.ts",import.meta.url);
const source=await readFile(sourceUrl,"utf8");

test("DataNest AI supports a server-side shared open-source provider fallback",()=>{
  for(const name of [
    "DATANEST_SHARED_AI_BASE_URL",
    "DATANEST_SHARED_AI_HOST",
    "DATANEST_SHARED_AI_MODEL",
    "DATANEST_SHARED_AI_SECRET",
    "DATANEST_SHARED_AI_LABEL"
  ]){
    assert.match(source,new RegExp(name));
  }

  assert.match(source,/service_upsert_ai_provider_connection_v2/);
  assert.match(source,/target_provider:"openai_compatible"/);
  assert.match(source,/if\(existing\|\|input\.requestedConnection\)return existing/);
});

test("shared provider endpoint remains HTTPS and host-bound",()=>{
  assert.match(source,/url\.protocol!==\"https:\"/);
  assert.match(source,/url\.hostname\.toLowerCase\(\)!==endpointHost/);
  assert.match(source,/\(url\.port&&url\.port!==\"443\"\)/);
});
