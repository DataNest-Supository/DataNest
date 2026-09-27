export type AutonomyLevel="A0"|"A1"|"A2"|"A3"|"A4";
export type ExecutionOperation="observe"|"prepare"|"write"|"execute"|"promote"|"destruct";
export type AuthorityEnvelopeState="draft"|"approved"|"rejected"|"revoked"|"expired";
export type CapabilityLeaseState="active"|"released"|"expired"|"revoked"|"exhausted";
export type ExecutionCircuitBreakerCategory=
  |"autonomous_write"
  |"deployment"
  |"external_communication"
  |"resource_execution";
export type ExecutionAuthorityRole="owner"|"admin"|"operator"|"viewer";

export const autonomyLevels:AutonomyLevel[]=["A0","A1","A2","A3","A4"];
export const executionOperations:ExecutionOperation[]=["observe","prepare","write","execute","promote","destruct"];

export const autonomyLabels:Record<AutonomyLevel,string>={
  A0:"Observe",
  A1:"Advise",
  A2:"Prepare",
  A3:"Execute",
  A4:"High-impact"
};

export const autonomyDescriptions:Record<AutonomyLevel,string>={
  A0:"Retrieve, monitor, inspect and summarize.",
  A1:"Analyze and recommend without execution authority.",
  A2:"Prepare actionable work but require approval before execution.",
  A3:"Perform bounded, reversible work under an approved Capability Lease.",
  A4:"Legal, financial, ownership, destructive, constitutional or materially irreversible action. Human approval is mandatory and generic automation is disabled."
};

export const permissionGradient:ExecutionOperation[]=[
  "observe","prepare","write","execute","promote","destruct"
];

export function canProposeExecutionAuthority(role:ExecutionAuthorityRole){
  return role==="owner"||role==="admin"||role==="operator";
}

export function canApproveExecutionAuthority(role:ExecutionAuthorityRole,level:AutonomyLevel){
  if(level==="A4")return role==="owner";
  if(level==="A3")return role==="owner"||role==="admin";
  return role==="owner"||role==="admin"||role==="operator";
}

export function canManageCircuitBreakers(role:ExecutionAuthorityRole){
  return role==="owner"||role==="admin";
}

export function executionAuthorityLabel(value:string|null|undefined){
  if(!value)return "—";
  return value.replaceAll("_"," ").replace(/\b\w/g,match=>match.toUpperCase());
}
