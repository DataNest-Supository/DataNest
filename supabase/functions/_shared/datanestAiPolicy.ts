export type ProjectRole = "owner" | "admin" | "operator" | "viewer";
export type RiskClass = "low" | "normal" | "high";
export type CertificationAuthority = "automation" | "admin" | "owner";
export type TrustState = "uncertified" | "certified";

const ownerOnly = new Set([
  "architecture",
  "security",
  "authentication",
  "authorization",
  "governance",
  "destructive",
  "production_policy"
]);

export function requiredCertificationAuthority(input: {
  category: string;
  riskClass: RiskClass;
  hasConflict: boolean;
}): CertificationAuthority {
  if (input.hasConflict || input.riskClass === "high" || ownerOnly.has(input.category)) return "owner";
  if (input.riskClass === "normal") return "admin";
  return "automation";
}

export function canAutoCertify(input: {
  category: string;
  riskClass: RiskClass;
  hasConflict: boolean;
  allGatesPassed: boolean;
  evidenceCount: number;
}): boolean {
  return (
    input.allGatesPassed &&
    input.evidenceCount >= 2 &&
    requiredCertificationAuthority(input) === "automation"
  );
}

export function canUseUncertifiedEvidence(
  evidence: { projectId: string; jobId: string; sessionId: string },
  context: { projectId: string; jobId: string; sessionId: string }
): boolean {
  return evidence.projectId === context.projectId &&
    evidence.jobId === context.jobId &&
    evidence.sessionId === context.sessionId;
}

export function contextTrustLabel(state: TrustState): "UNCERTIFIED" | "CERTIFIED" {
  return state === "certified" ? "CERTIFIED" : "UNCERTIFIED";
}
