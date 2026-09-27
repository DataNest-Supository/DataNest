"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const SESSION_DRAFT_PREFIX="datanest.sessionDraft.";

export type SessionDraftMeta={
  hydrated:boolean;
  hasStoredDraft:boolean;
  discardStoredDraft:()=>void;
};

export function useSessionDraftState<T>(
  key:string,
  initialValue:T
):[T,Dispatch<SetStateAction<T>>,SessionDraftMeta]{
  const storageKey=SESSION_DRAFT_PREFIX+key;
  const initialRef=useRef(initialValue);
  const [value,setValue]=useState<T>(initialValue);
  const [hydratedKey,setHydratedKey]=useState<string|null>(null);
  const [hasStoredDraft,setHasStoredDraft]=useState(false);

  useEffect(()=>{
    initialRef.current=initialValue;
  },[initialValue]);

  useEffect(()=>{
    setHydratedKey(null);
    let restored=false;
    try{
      const raw=window.sessionStorage.getItem(storageKey);
      if(raw!==null){
        setValue(JSON.parse(raw) as T);
        restored=true;
      }else{
        setValue(initialRef.current);
      }
    }catch{
      try{window.sessionStorage.removeItem(storageKey);}catch{}
      setValue(initialRef.current);
    }
    setHasStoredDraft(restored);
    setHydratedKey(storageKey);
  },[storageKey]);

  useEffect(()=>{
    if(hydratedKey!==storageKey)return;
    try{
      const current=JSON.stringify(value);
      const baseline=JSON.stringify(initialRef.current);
      if(current===baseline){
        window.sessionStorage.removeItem(storageKey);
        setHasStoredDraft(false);
      }else{
        window.sessionStorage.setItem(storageKey,current);
        setHasStoredDraft(true);
      }
    }catch{
      // Session draft persistence is a resilience aid; form editing must keep working if storage is unavailable.
    }
  },[hydratedKey,storageKey,value]);

  const discardStoredDraft=useCallback(()=>{
    try{window.sessionStorage.removeItem(storageKey);}catch{}
    setValue(initialRef.current);
    setHasStoredDraft(false);
  },[storageKey]);

  return [value,setValue,{
    hydrated:hydratedKey===storageKey,
    hasStoredDraft,
    discardStoredDraft
  }];
}
