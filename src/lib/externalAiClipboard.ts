export type ExternalAiClipboardCandidateInput = {
  clipboardText:string;
  currentResponse:string;
  blockedTexts?:string[];
};

export function selectExternalAiClipboardCandidate({
  clipboardText,
  currentResponse,
  blockedTexts=[]
}:ExternalAiClipboardCandidateInput):string|null{
  const candidate=clipboardText.trim();
  if(!candidate)return null;
  if(candidate===currentResponse.trim())return null;

  const blocked=blockedTexts
    .map(value=>value.trim())
    .filter(Boolean);

  if(blocked.includes(candidate))return null;

  if(
    candidate.startsWith("RESONANCE DATANEST — LIVE EXTERNAL AI HANDOFF")&&
    candidate.includes("[DATANEST TRACKING HEADER]")
  ){
    return null;
  }

  return candidate;
}
