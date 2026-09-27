"use client";

const SESSION_REQUEST_PREFIX="datanest.requestKey.";

function storageKey(scope:string){
  return SESSION_REQUEST_PREFIX+scope;
}

export function getOrCreateSessionRequestKey(scope:string){
  const key=storageKey(scope);
  try{
    const existing=window.sessionStorage.getItem(key);
    if(existing)return existing;
    const value=crypto.randomUUID();
    window.sessionStorage.setItem(key,value);
    return value;
  }catch{
    return crypto.randomUUID();
  }
}

export function clearSessionRequestKey(scope:string){
  try{
    window.sessionStorage.removeItem(storageKey(scope));
  }catch{
    // Idempotency storage is a client resilience aid; successful server state remains authoritative.
  }
}
