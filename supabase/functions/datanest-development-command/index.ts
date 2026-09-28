import { createClient } from "@supabase/supabase-js";
import { callOpenAiCompatibleProvider } from "../_shared/provider.ts";
import { buildDevelopmentCommandPrompt,formatDualAdvocacyResponse,parseDualAdvocacyResponse } from "../_shared/dualAdvocacy.ts";

Deno.serve(async()=>new Response(JSON.stringify({error:"Development Command setup in progress"}),{status:503,headers:{"Content-Type":"application/json"}}));
