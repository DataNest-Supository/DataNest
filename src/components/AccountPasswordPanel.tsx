"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";

async function actionErrorMessage(error:unknown){
  const fallback=error instanceof Error?error.message:"Unable to complete the password action.";
  if(!error||typeof error!=="object"||!("context" in error))return fallback;
  const context=(error as {context?:Response}).context;
  if(!context||typeof context.clone!=="function")return fallback;
  try{
    const payload=await context.clone().json() as {error?:unknown};
    if(payload?.error)return String(payload.error);
  }catch{
    // Fall back to the client error when the Edge response has no JSON body.
  }
  return fallback;
}

export default function AccountPasswordPanel({projectId}:{projectId:string}) {
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [messageTone,setMessageTone]=useState<"neutral"|"good"|"error">("neutral");

  async function changePassword(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase)return;

    if(newPassword.length<12){
      setMessageTone("error");
      setMessage("Use a new password with at least 12 characters.");
      return;
    }
    if(newPassword.length>128){
      setMessageTone("error");
      setMessage("Use a new password with 128 characters or fewer.");
      return;
    }
    if(newPassword!==confirmPassword){
      setMessageTone("error");
      setMessage("The new passwords do not match.");
      return;
    }
    if(currentPassword===newPassword){
      setMessageTone("error");
      setMessage("Choose a new password that differs from your current password.");
      return;
    }

    setBusy(true);
    setMessage("");
    setMessageTone("neutral");
    try{
      const {data,error}=await supabase.functions.invoke("manage-own-password",{
        body:{
          projectId,
          action:"change",
          currentPassword,
          newPassword
        }
      });
      if(error)throw error;
      const payload=(data||{}) as {auditRecorded?:boolean};
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessageTone("good");
      setMessage(payload.auditRecorded===false
        ?"Password changed successfully. The security event could not be recorded; an owner can review the service logs."
        :"Password changed successfully and recorded in the security audit trail."
      );
    }catch(error){
      setMessageTone("error");
      setMessage(await actionErrorMessage(error));
    }finally{
      setBusy(false);
    }
  }

  async function sendRecoveryEmail(){
    const supabase=getSupabase();
    if(!supabase)return;

    setBusy(true);
    setMessage("");
    setMessageTone("neutral");
    try{
      const redirectTo=window.location.href.split("#")[0].split("?")[0];
      const {data,error}=await supabase.functions.invoke("manage-own-password",{
        body:{projectId,action:"email_reset",redirectTo}
      });
      if(error)throw error;
      const payload=(data||{}) as {auditRecorded?:boolean};
      setMessageTone("good");
      setMessage(payload.auditRecorded===false
        ?"Password reset email requested. The security event could not be recorded; an owner can review the service logs."
        :"Password reset email requested and recorded. Follow the secure link in your inbox to choose a new password."
      );
    }catch(error){
      setMessageTone("error");
      setMessage(await actionErrorMessage(error));
    }finally{
      setBusy(false);
    }
  }

  return <section className="panel accountSecurityPanel">
    <div className="panelHead">
      <div><p className="eyebrow">ACCOUNT SECURITY</p><h3>Change my password</h3></div>
      <span className="countPill">AUDITED</span>
    </div>
    <p className="muted">Confirm your current password before replacing it. Password material is processed only by Supabase Auth and is never written to DataNest project data or the security audit trail.</p>

    <form className="accountSecurityForm" onSubmit={changePassword} aria-busy={busy}>
      <label>Current password
        <input type="password" required autoComplete="current-password" value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)} placeholder="Current password"/>
      </label>
      <label>New password
        <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} placeholder="At least 12 characters"/>
      </label>
      <label>Confirm new password
        <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Re-enter new password"/>
      </label>
      <div className="accountSecurityActions">
        <button className="primaryButton compact" type="submit" disabled={busy}>{busy?"Working…":"Change password"}</button>
        <button className="secondaryButton compact" type="button" disabled={busy} onClick={()=>void sendRecoveryEmail()}>Email reset link</button>
      </div>
    </form>

    {message&&<div className={"accountSecurityMessage "+messageTone} role={messageTone==="error"?"alert":"status"} aria-live="polite">{message}</div>}
  </section>;
}
