import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(
  "supabase/functions/manage-ai-provider-v2/index.ts",
  "utf8"
);

test("provider-management responses strip decrypted credentials at the browser boundary",()=>{
  assert.match(
    source,
    /function publicConnection\(value:unknown\)\{[\s\S]*const \{secret:_secret,\.\.\.safe\}=value/
  );
  assert.match(source,/connection:publicConnection\(connection\)/);
  assert.match(source,/connection:publicConnection\(\{[\s\S]*processing_region:personalProcessingRegion/);
  assert.doesNotMatch(
    source,
    /return json\(\{ok:true,[\s\S]{0,120}connection\},200,origin\)/
  );
});
