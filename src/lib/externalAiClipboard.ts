export type ExternalAiClipboardCandidateInput = {
  clipboardText:string;
  currentResponse:string;
  blockedTexts?:string[];
  allowReplace?:boolean;
  expectedTraceKey?:string;
};

export function selectExternalAiClipboardCandidate({
  clipboardText,
  currentResponse,
  blockedTexts=[],
  allowReplace=false,
  expectedTraceKey=""
}:ExternalAiClipboardCandidateInput):string|null{
  // Automatic capture must never replace a response already under review.
  if(!allowReplace&&currentResponse.trim())return null;
  const candidate=clipboardText.trim();
  if(!candidate)return null;
  if(candidate===currentResponse.trim())return null;

  const blocked=blockedTexts
    .map(value=>value.trim())
    .filter(Boolean);

  if(blocked.includes(candidate))return null;

  if(!allowReplace&&expectedTraceKey.trim()){
    const trace=expectedTraceKey.trim();
    if(!candidate.split(/\\r?\\n/)[0].includes(trace))return null;
  }

  if(
    candidate.startsWith("RESONANCE DATANEST — LIVE EXTERNAL AI HANDOFF")&&
    candidate.includes("[DATANEST TRACKING HEADER]")
  ){
    return null;
  }

  return candidate;
}

export type ClipboardAutoCaptureAccess = "unknown"|"prompt"|"granted"|"denied"|"unsupported";

export function shouldAttemptClipboardAutoCapture(
  access:ClipboardAutoCaptureAccess,
  enabled:boolean
):boolean{
  return enabled&&access==="granted";
}
