"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SingleFlightResult<T>={
  started:boolean;
  value?:T;
};

export function useSingleFlight(){
  const mountedRef=useRef(true);
  const activeRef=useRef<string|null>(null);
  const [activeAction,setActiveAction]=useState<string|null>(null);

  useEffect(()=>{
    mountedRef.current=true;
    return()=>{mountedRef.current=false;};
  },[]);

  useEffect(()=>{
    if(activeAction===null)return;
    const protectInFlightRequest=(event:BeforeUnloadEvent)=>{
      event.preventDefault();
      event.returnValue="";
    };
    window.addEventListener("beforeunload",protectInFlightRequest);
    return()=>window.removeEventListener("beforeunload",protectInFlightRequest);
  },[activeAction]);

  const run=useCallback(async<T>(key:string,action:()=>Promise<T>):Promise<SingleFlightResult<T>>=>{
    if(activeRef.current!==null)return {started:false};
    activeRef.current=key;
    if(mountedRef.current)setActiveAction(key);
    try{
      return {started:true,value:await action()};
    }finally{
      activeRef.current=null;
      if(mountedRef.current)setActiveAction(null);
    }
  },[]);

  return {
    activeAction,
    busy:activeAction!==null,
    run
  };
}
