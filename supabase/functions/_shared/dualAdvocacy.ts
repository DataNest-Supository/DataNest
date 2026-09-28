export type DualAdvocacyResponse={
  angelsAdvocate:string;
  devilsAdvocate:string;
  synthesis:string;
};

function clean(value:unknown):string{
  return typeof value==="string"?value.trim():"";
}

export function buildDevelopmentCommandPrompt(input:{
  job:Record<string,unknown>;
  workingMemory:string[];
  userMessage:string;
}):string{
  return [
    "You are the DataNest Development Command dual-advocacy reasoning engine.",
    "Use cumulative working memory as development context, separate from Certified Memory.",
    "Return only valid JSON with keys angelsAdvocate, devilsAdvocate, synthesis.",
    "The Angel's Advocate makes the strongest practical case for the command.",
    "The Devil's Advocate makes the strongest practical case against it, including risks, hidden assumptions, and failure modes.",
    "The synthesis reconciles both views into a concise next step.",
    "Do not claim deployments, approvals, or external actions unless they are present in context.",
    "CUMULATIVE WORKING MEMORY:",
    JSON.stringify(input.workingMemory),
    "CURRENT JOB:",
    JSON.stringify(input.job),
    "CURRENT USER COMMAND:",
    input.userMessage
  ].join("\n\n");
}

export function parseDualAdvocacyResponse(raw:string):DualAdvocacyResponse{
  const trimmed=raw.trim();
  const unfenced=trimmed.replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"").trim();
  try{
    const value=JSON.parse(unfenced) as Record<string,unknown>;
    const angelsAdvocate=clean(value.angelsAdvocate);
    const devilsAdvocate=clean(value.devilsAdvocate);
    const synthesis=clean(value.synthesis);
    if(angelsAdvocate&&devilsAdvocate&&synthesis)return {angelsAdvocate,devilsAdvocate,synthesis};
  }catch{}
  return {
    angelsAdvocate:trimmed,
    devilsAdvocate:"A distinct opposing analysis was not returned.",
    synthesis:"Re-run the command to obtain the complete dual-advocacy response."
  };
}

export function formatDualAdvocacyResponse(value:DualAdvocacyResponse):string{
  return [
    "ANGEL'S ADVOCATE",value.angelsAdvocate,"",
    "DEVIL'S ADVOCATE",value.devilsAdvocate,"",
    "SYNTHESIS",value.synthesis
  ].join("\n");
}
