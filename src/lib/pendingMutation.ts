"use client";

const PENDING_MUTATION_PREFIX="datanest.pendingMutation.";

export type PendingMutationIntent<T extends Record<string,unknown>=Record<string,unknown>>={
  kind:string;
  requestKey:string;
  payload:T;
  startedAt:string;
};

function storageKey(scope:string){
  return PENDING_MUTATION_PREFIX+scope;
}

function validIntent(value:unknown):value is PendingMutationIntent{
  if(!value||typeof value!=="object")return false;
  const item=value as Record<string,unknown>;
  return typeof item.kind==="string"
    &&typeof item.requestKey==="string"
    &&item.requestKey.length>0
    &&typeof item.startedAt==="string"
    &&Boolean(item.payload)
    &&typeof item.payload==="object"
    &&!Array.isArray(item.payload);
}

export function loadPendingMutation<T extends Record<string,unknown>>(scope:string):PendingMutationIntent<T>|null{
  try{
    const raw=window.sessionStorage.getItem(storageKey(scope));
    if(!raw)return null;
    const parsed=JSON.parse(raw) as unknown;
    if(!validIntent(parsed)){
      window.sessionStorage.removeItem(storageKey(scope));
      return null;
    }
    return parsed as PendingMutationIntent<T>;
  }catch{
    try{window.sessionStorage.removeItem(storageKey(scope));}catch{}
    return null;
  }
}

export function getOrCreatePendingMutation<T extends Record<string,unknown>>(
  scope:string,
  kind:string,
  payload:T
):PendingMutationIntent<T>{
  const existing=loadPendingMutation<T>(scope);
  if(existing&&existing.kind===kind&&JSON.stringify(existing.payload)===JSON.stringify(payload))return existing;

  const next:PendingMutationIntent<T>={
    kind,
    requestKey:crypto.randomUUID(),
    payload,
    startedAt:new Date().toISOString()
  };
  try{
    window.sessionStorage.setItem(storageKey(scope),JSON.stringify(next));
  }catch{
    // The request can still proceed; server idempotency remains authoritative for this attempt.
  }
  return next;
}

export function clearPendingMutation(scope:string){
  try{window.sessionStorage.removeItem(storageKey(scope));}catch{}
}

export function pendingMutationStorageKey(scope:string){
  return storageKey(scope);
}
