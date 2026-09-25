import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"supabase/functions/datanest-ai-upload/index.ts"),"utf8");
const config=fs.readFileSync(path.join(root,"supabase/config.toml"),"utf8");

test("DataNest AI upload gateway is JWT protected and uses explicit Job authorization",()=>{
  assert.match(config,/\[functions\.datanest-ai-upload\][\s\S]*verify_jwt\s*=\s*true/);
  assert.match(source,/auth\.getUser\(\)/);
  assert.match(source,/authorize_datanest_ai_file_access/);
  assert.match(source,/await authorizeJob\(userClient,jobId\)/);
});

test("upload slots are server generated on dedicated staging TUS",()=>{
  assert.match(source,/incoming\/"\+submissionId\+"\/"\+String\(item\.id\)\+"\/"/);
  assert.match(source,/qchttpcyqlqnhvahprhz\.storage\.supabase\.co\/storage\/v1\/upload\/resumable/);
  assert.match(source,/createSignedUploadUrl\(path,\{upsert:false\}\)/);
  assert.match(source,/validateBatch\(files\)/);
});

test("file queue wake-up sends only item identifiers through a service-only RPC",()=>{
  assert.match(source,/service_enqueue_datanest_file_item/);
  assert.match(source,/target_item:itemId/);
  assert.match(source,/target_queue:"datanest_file_ingestion"/);
});

test("all post-create actions reauthorize the selected Job before staging reads",()=>{
  const authorizationIndex=source.indexOf("await authorizeJob(userClient,jobId);");
  for(const action of ['if(action==="finalize_item")','if(action==="status")','if(action==="retry_item")','if(action==="source_link")']){
    const actionIndex=source.indexOf(action);
    assert.ok(actionIndex>authorizationIndex,action+" must run after authorization");
  }
});

test("source links require canonical server-verified SHA paths",()=>{
  assert.match(source,/verified_sha256/);
  assert.match(source,/sha256\/"\+hash\.slice\(0,2\)\+"\/"\+hash\.slice\(2,4\)\+"\/"\+hash/);
  assert.match(source,/createSignedUrl\(path,60\)/);
});

test("gateway never serializes service credentials",()=>{
  assert.match(source,/DATANEST_AI_STAGING_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source,/json\(\{[^}]*serviceKey/);
  assert.doesNotMatch(source,/json\(\{[^}]*stagingEnv\.key/);
});
