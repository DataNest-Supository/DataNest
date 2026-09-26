"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Member={
  user_id:string;
  email:string|null;
  role:"owner"|"admin"|"operator"|"viewer";
  status:string;
  created_at:string;
  updated_at:string;
  formal_voting_eligible:boolean;
};

type Invitation={
  id:string;
  user_id:string;
  email:string;
  role:"admin"|"operator"|"viewer";
  status:string;
  invited_by:string;
  invited_at:string;
  expires_at:string;
  accepted_at:string|null;
  revoked_at:string|null;
};

type InviteState="idle"|"sending"|"sent"|"failed";

type Workspace={
  members:Member[];
  invitations:Invitation[];
  active_formal_voter_count:number;
  can_invite:boolean;
  can_invite_admin:boolean;
  caller_role:string|null;
  boundaries:Record<string,boolean>;
};

function date(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function label(value:string){return value.replaceAll("_"," ");}

async function inviteErrorMessage(error:unknown){
  const fallback=error instanceof Error?error.message:"Unable to send project-member invitation.";
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

export default function ProjectMembersPanel({
  projectId,setNotice,setError
}:{
  projectId:string;
  setNotice:(value:string)=>void;
  setError:(value:string)=>void;
}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"admin"|"operator"|"viewer">("viewer");
  const [inviteState,setInviteState]=useState<InviteState>("idle");
  const [inviteFeedback,setInviteFeedback]=useState("");

  const load=useCallback(async()=>{
    const supabase=getSupabase();if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("get_project_membership_workspace_v1",{target_project:projectId});
    if(error){setError(error.message);setWorkspace(null);}
    else setWorkspace((data||null) as Workspace|null);
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  async function sendInvite(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!workspace?.can_invite||!email.trim())return;

    const targetEmail=email.trim().toLowerCase();
    setBusy(true);
    setInviteState("sending");
    setInviteFeedback("Sending invitation to "+targetEmail+"…");
    setError("");
    try{
      const {data,error}=await supabase.functions.invoke("send-project-member-invite",{
        body:{projectId,email:targetEmail,role}
      });
      if(error)throw error;
      const payload=(data||{}) as Record<string,unknown>;
      const delivery=String(payload.delivery||"invite");
      const feedback=delivery==="recovery"
        ?"Invite sent to "+targetEmail+". The existing account will receive a secure account link and must sign in to accept project access."
        :"Invite sent to "+targetEmail+". The recipient must authenticate and accept before project access or voting becomes active.";
      setEmail("");
      setInviteState("sent");
      setInviteFeedback(feedback);
      setNotice(feedback);
      await load();
    }catch(inviteError){
      const feedback=await inviteErrorMessage(inviteError);
      setInviteState("failed");
      setInviteFeedback("Invite failed. "+feedback);
      setError(feedback);
    }finally{
      setBusy(false);
    }
  }

  async function revokeInvite(id:string){
    const supabase=getSupabase();if(!supabase)return;
    setBusy(true);setError("");
    const {error}=await supabase.rpc("revoke_project_member_invite_v1",{
      target_invite:id,
      target_reason:"Revoked from the Governance membership workspace."
    });
    if(error)setError(error.message);
    else{
      setNotice("Pending project invitation revoked. It remains in the audit history and is not voting-eligible.");
      await load();
    }
    setBusy(false);
  }

  if(loading)return <section className="panel"><p className="muted">Loading project membership…</p></section>;
  if(!workspace)return <section className="panel"><p className="muted">Project membership workspace is unavailable.</p></section>;

  const pending=workspace.invitations.filter(item=>item.status==="invited");

  return <section className="panel">
    <div className="panelHead">
      <div><p className="eyebrow">FORMAL MEMBERSHIP</p><h3>Project members + governance voters</h3></div>
      <span className="countPill">{workspace.active_formal_voter_count} ACTIVE VOTER{workspace.active_formal_voter_count===1?"":"S"}</span>
    </div>

    <p className="muted">Only authenticated members with <b>active</b> project membership can cast formal governance votes. Sending an invitation never creates an independent vote by itself.</p>

    {workspace.can_invite&&<form className="settingsGrid" onSubmit={sendInvite}>
      <label>Invite email
        <input
          type="email"
          required
          value={email}
          onChange={event=>{
            setEmail(event.target.value);
            if(inviteState!=="idle"){setInviteState("idle");setInviteFeedback("");}
          }}
          placeholder="reviewer@example.com"
        />
      </label>
      <label>Project role
        <select value={role} onChange={event=>{
          setRole(event.target.value as "admin"|"operator"|"viewer");
          if(inviteState!=="idle"){setInviteState("idle");setInviteFeedback("");}
        }}>
          <option value="viewer">Viewer · formal vote + read access</option>
          <option value="operator">Operator · formal vote + operational access</option>
          {workspace.can_invite_admin&&<option value="admin">Admin · formal vote + administration</option>}
        </select>
      </label>
      <div>
        <p className="muted">For independent protocol review, <b>Viewer</b> is sufficient unless the person also needs operational or administrative authority.</p>
      </div>
      <div className="inviteActionCell">
        <button
          className={"primaryButton inviteSubmitButton "+inviteState}
          disabled={busy||!email.trim()}
          aria-describedby="project-invite-feedback"
        >
          <span className="inviteButtonContent">
            <span className="inviteButtonIcon" aria-hidden="true">
              {inviteState==="sent"?"✓":inviteState==="failed"?"!":inviteState==="sending"?"":"↗"}
            </span>
            <span>{inviteState==="sending"?"Sending invite…":inviteState==="sent"?"Invite sent":inviteState==="failed"?"Invite failed · Retry":"Send project invite"}</span>
          </span>
        </button>
        <div
          id="project-invite-feedback"
          className={"inviteFeedback "+inviteState}
          role={inviteState==="failed"?"alert":"status"}
          aria-live="polite"
        >{inviteFeedback}</div>
      </div>
    </form>}

    <div className="dataTable">
      <div className="dataRow headerRow"><span>Member</span><span>Role</span><span>Status</span><span>Formal vote</span><span>Updated</span></div>
      {workspace.members.map(member=><div className="dataRow" key={member.user_id}>
        <div><b>{member.email||member.user_id}</b><small>{member.user_id}</small></div>
        <span>{member.role}</span>
        <span>{label(member.status)}</span>
        <span>{member.formal_voting_eligible?"eligible":"not eligible"}</span>
        <span>{date(member.updated_at)}</span>
      </div>)}
    </div>

    {workspace.can_invite&&<>
      <div className="panelHead">
        <div><p className="eyebrow">INVITATIONS</p><h3>Pending + historical</h3></div>
        <span className="countPill">{pending.length} PENDING</span>
      </div>
      {workspace.invitations.length?<div className="dataTable">
        <div className="dataRow headerRow"><span>Invitee</span><span>Role</span><span>Status</span><span>Expiry</span><span>Action</span></div>
        {workspace.invitations.map(invite=><div className="dataRow" key={invite.id}>
          <div><b>{invite.email}</b><small>{invite.id}</small></div>
          <span>{invite.role}</span>
          <span>{label(invite.status)}</span>
          <span>{date(invite.expires_at)}</span>
          <span>{invite.status==="invited"
            ?<button className="textButton" disabled={busy} onClick={()=>void revokeInvite(invite.id)}>Revoke</button>
            :"—"}</span>
        </div>)}
      </div>:<p className="muted">No project-member invitations have been issued yet.</p>}
    </>}

    <p className="muted">Invite boundaries: no self-invite, no owner invitation, admin invitations require the owner, and acceptance requires the matching authenticated account.</p>
  </section>;
}
