import test from "node:test";
import assert from "node:assert/strict";
import {selectLatestAuthorizedSessionId} from "../../supabase/functions/_shared/datanestAiSessionSelection.ts";

test("selects the newest populated session that belongs to the authorized user",()=>{
  const result=selectLatestAuthorizedSessionId(
    [
      {session_id:"foreign",created_at:"2026-09-29T15:10:00Z"},
      {session_id:"current",created_at:"2026-09-29T15:09:00Z"},
      {session_id:"older",created_at:"2026-09-08T00:00:00Z"}
    ],
    new Set(["current","older"])
  );
  assert.equal(result,"current");
});

test("fails closed when no populated session belongs to the authorized user",()=>{
  const result=selectLatestAuthorizedSessionId(
    [{session_id:"foreign",created_at:"2026-09-29T15:10:00Z"}],
    new Set(["current"])
  );
  assert.equal(result,null);
});
