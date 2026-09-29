"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AccountPasswordPanel() {
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
      const {data:userResult,error:userError}=await supabase.auth.getUser();
      if(userError||!userResult.user?.email){
        throw userError||new Error("Your signed-in account email could not be resolved.");
      }

      const {error:verifyError}=await supabase.auth.signInWithPassword({
        email:userResult.user.email,
        password:currentPassword
      });
      if(verifyError){
        throw new Error("Current password is incorrect.");
      }

      const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
      if(updateError)throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessageTone("good");
      setMessage("Password changed successfully.");
    }catch(error){
      setMessageTone("error");
      setMessage(error instanceof Error?error.message:"Unable to change your password.");
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
      const {data:userResult,error:userError}=await supabase.auth.getUser();
      const email=userResult.user?.email;
      if(userError||!email){
        throw userError||new Error("Your signed-in account email could not be resolved.");
      }

      const redirectTo=window.location.href.split("#")[0].split("?")[0];
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;

      setMessageTone("good");
      setMessage("Password reset email requested. Follow the secure link in your inbox to choose a new password.");
    }catch(error){
      setMessageTone("error");
      setMessage(error instanceof Error?error.message:"Unable to send a password reset email.");
    }finally{
      setBusy(false);
    }
  }

  return <section className="panel accountSecurityPanel">
    <div className="panelHead">
      <div><p className="eyebrow">ACCOUNT SECURITY</p><h3>Change my password</h3></div>
      <span className="countPill">SELF-SERVICE</span>
    </div>
    <p className="muted">Confirm your current password before replacing it. Your password is sent only to Supabase Auth and is never written to DataNest project data.</p>

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
