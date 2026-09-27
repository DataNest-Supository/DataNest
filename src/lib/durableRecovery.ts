"use client";

import { getSupabase } from "@/lib/supabase";
import type { PendingMutationIntent, PendingMutationVerification } from "@/lib/pendingMutation";

export type DurableRecoveryResolution="confirmed"|"superseded_after_absence";

export type DurableRecoveryRecord<T extends Record<string,unknown>=Record<string,unknown>>={
  id:string;
  projectId:string;
  userId:string;
  scope:string;
  mutationKind:string;
  requestKey:string;
  payload:T;
  startedAt:string;
  verificationState:PendingMutationVerification;
  lastCheckedAt:string|null;
  attemptCount:number;
  lastAttemptAt:string;
  active:boolean;
  resolvedAt:string|null;
  resolution:DurableRecoveryResolution|null;
};

function objectValue(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Durable recovery response is malformed.");
  return value as Record<string,unknown>;
}

function stringValue(value:unknown,label:string){
  if(typeof value!=="string"||!value)throw new Error("Durable recovery "+label+" is missing.");
  return value;
}

function normalizeRecord<T extends Record<string,unknown>>(value:unknown):DurableRecoveryRecord<T>{
  const row=objectValue(value);
  const payload=objectValue(row.payload) as T;
  const verification=String(row.verification_state||"unverified");
  if(!["unverified","unconfirmed","confirmed_absent"].includes(verification)){
    throw new Error("Durable recovery verification state is invalid.");
  }
  const resolution=row.resolution===null||row.resolution===undefined?null:String(row.resolution);
  if(resolution!==null&&!["confirmed","superseded_after_absence"].includes(resolution)){
    throw new Error("Durable recovery resolution is invalid.");
  }
  return {
    id:stringValue(row.id,"id"),
    projectId:stringValue(row.project_id,"project"),
    userId:stringValue(row.user_id,"user"),
    scope:stringValue(row.scope,"scope"),
    mutationKind:stringValue(row.mutation_kind,"kind"),
    requestKey:stringValue(row.request_key,"request identity"),
    payload,
    startedAt:stringValue(row.started_at,"start time"),
    verificationState:verification as PendingMutationVerification,
    lastCheckedAt:typeof row.last_checked_at==="string"?row.last_checked_at:null,
    attemptCount:Number(row.attempt_count||0),
    lastAttemptAt:stringValue(row.last_attempt_at,"last attempt"),
    active:row.active===undefined?row.resolved_at==null:Boolean(row.active),
    resolvedAt:typeof row.resolved_at==="string"?row.resolved_at:null,
    resolution:resolution as DurableRecoveryResolution|null
  };
}

export async function listDurableRecoveries(projectId:string){
  const supabase=getSupabase();
  if(!supabase)throw new Error("Durable recovery ledger is unavailable.");
  const {data,error}=await supabase.rpc("list_mutation_recoveries_v1",{target_project:projectId});
  if(error)throw error;
  if(!Array.isArray(data))throw new Error("Durable recovery ledger returned an invalid list.");
  return data.map(item=>normalizeRecord(item));
}

export async function registerDurableRecovery<T extends Record<string,unknown>>(
  projectId:string,
  scope:string,
  intent:PendingMutationIntent<T>
){
  const supabase=getSupabase();
  if(!supabase)throw new Error("Durable recovery ledger is unavailable.");
  const {data,error}=await supabase.rpc("register_mutation_recovery_v1",{
    target_project:projectId,
    target_scope:scope,
    target_kind:intent.kind,
    target_request_key:intent.requestKey,
    target_payload:intent.payload,
    target_started_at:intent.startedAt
  });
  if(error)throw error;
  return normalizeRecord<T>(data);
}

export async function markDurableRecoveryVerification(
  projectId:string,
  scope:string,
  requestKey:string,
  state:Exclude<PendingMutationVerification,"unverified">
){
  const supabase=getSupabase();
  if(!supabase)throw new Error("Durable recovery ledger is unavailable.");
  const {error}=await supabase.rpc("mark_mutation_recovery_verification_v1",{
    target_project:projectId,
    target_scope:scope,
    target_request_key:requestKey,
    target_state:state
  });
  if(error)throw error;
}

export async function resolveDurableRecovery(
  projectId:string,
  scope:string,
  requestKey:string,
  resolution:DurableRecoveryResolution
){
  const supabase=getSupabase();
  if(!supabase)throw new Error("Durable recovery ledger is unavailable.");
  const {error}=await supabase.rpc("resolve_mutation_recovery_v1",{
    target_project:projectId,
    target_scope:scope,
    target_request_key:requestKey,
    target_resolution:resolution
  });
  if(error)throw error;
}

export function durableRecoveryToPendingIntent<T extends Record<string,unknown>>(
  record:DurableRecoveryRecord<T>
):PendingMutationIntent<T>{
  return {
    kind:record.mutationKind,
    requestKey:record.requestKey,
    payload:record.payload,
    startedAt:record.startedAt,
    verificationState:record.verificationState,
    lastCheckedAt:record.lastCheckedAt,
    durable:true
  };
}
