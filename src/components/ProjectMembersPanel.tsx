"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
function normalizeEmail(value:string){return value.trim().toLowerCase();}
function shortId(value:string){return value.length>12?value.slice(0,8)+"…"+value.slice(-4):value;}

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

  const load=useCallback(async()=>{
    const supabase=getSupabase();if(!supabase)return;
    setLoading(true);
    const {data,error}=await supabase.rpc("get_project_membership_workspace_v1",{target_project:projectId});
    if(error){setError(error.message);setWorkspace(null);}
    else setWorkspace((data||null) as Workspace|null);
    setLoading(false);
  },[projectId,setError]);

  useEffect(()=>{void load();},[load]);

  const normalizedEmail=normalizeEmail(email);
  const matchingMember=useMemo(
    ()=>workspace?.members.find(member=>normalizeEmail(member.email||"")===normalizedEmail)||null,
    [workspace,normalizedEmail]
  );
  const matchingPendingInvite=useMemo(
    ()=>workspace?.invitations.find(invite=>invite.status==="invited"&&normalizeEmail(invite.email)===normalizedEmail)||null,
    [workspace,normalizedEmail]
  );
  const memberAlreadyActive=matchingMember?.status==="active";
  const pending=workspace?.invitations.filter(item=>item.status==="invited")||[];

  async function deliverInvite(targetEmail:string,targetRole:"admin"|"operator"|"viewer",clearAfter:boolean){
    const supabase=getSupabase();
    if(!supabase||!workspace?.can_invite)return;

    setBusy(true);setError("");
    try{
      const {data,error}=await supabase.functions.invoke("send-project-member-invite",{
        body:{projectId,email:normalizeEmail(targetEmail),role:targetRole}
      });
      if(error)throw error;
      const payload=(data||{}) as Record<string,unknown>;
      const delivery=String(payload.delivery||"invite");
      if(clearAfter)setEmail("");
      setNotice(
        delivery==="recovery"
          ?"Access email queued for the existing DataNest account. Voting remains disabled until that person signs in and accepts."
          :"Project invitation email queued. Voting remains disabled until that person authenticates and accepts."
      );
      await load();
    }catch(inviteError){
      setError(inviteError instanceof Error?inviteError.message:"Unable to send project-member invitation.");
    }finally{
      setBusy(false);
    }
  }

  async function sendInvite(event:FormEvent){
    event.preventDefault();
    if(!normalizedEmail||memberAlreadyActive){
      if(memberAlreadyActive)setNotice("This email is already an active project member. No duplicate invitation is required.");
      return;
    }
    await deliverInvite(normalizedEmail,role,true);
  }

  async function resendInvite(invite:Invitation){
    await deliverInvite(invite.email,invite.role,false);
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

  return <section className="panel membershipPanel">
    <div className="panelHead">
      <div><p className="eyebrow">FORMAL MEMBERSHIP</p><h3>Project members + governance voters</h3></div>
      <span className="countPill">{workspace.active_formal_voter_count} ACTIVE VOTER{workspace.active_formal_voter_count===1?"":"S"}</span>
    </div>

    <p className="muted">Only authenticated members with <b>active</b> project membership can cast formal governance votes. Sending an invitation never creates an independent vote by itself.</p>

    {workspace.can_invite&&<form className="projectInviteForm" onSubmit={sendInvite}>
      <div className="projectInviteFields">
        <label>Invite email
          <input
            type="email"
            required
            value={email}
            onChange={event=>setEmail(event.target.value)}
            placeholder="reviewer@example.com"
            aria-describedby="project-invite-context"
          />
        </label>
        <label>Project role
          <select value={role} onChange={event=>setRole(event.target.value as "admin"|"operator"|"viewer")}>
            <option value="viewer">Viewer · vote + read</option>
            <option value="operator">Operator · vote + operations</option>
            {workspace.can_invite_admin&&<option value="admin">Admin · vote + administration</option>}
          </select>
        </label>
        <button className="primaryButton projectInviteAction" disabled={busy||!normalizedEmail||Boolean(memberAlreadyActive)}>
          {busy?"Sending…":memberAlreadyActive?"Already active":matchingPendingInvite?"Resend project invite":"Send project invite"}
        </button>
      </div>

      <div
        id="project-invite-context"
        className={"inviteContext "+(memberAlreadyActive?"good":matchingPendingInvite?"warn":"neutral")}
        aria-live="polite"
      >
        {memberAlreadyActive
          ?<><b>Already a member.</b> {matchingMember?.email} is active as {matchingMember?.role}; DataNest will not send a duplicate invitation.</>
          :matchingPendingInvite
            ?<><b>Invitation already pending.</b> Resending replaces the pending link and refreshes its expiry. Current expiry: {date(matchingPendingInvite.expires_at)}.</>
            :<><b>Invite lifecycle.</b> Viewer is sufficient for independent protocol review. Membership becomes voting-eligible only after the matching account signs in and accepts.</>}
      </div>
    </form>}

    <div className="dataTable membershipTable">
      <div className="dataRow headerRow"><span>Member</span><span>Role</span><span>Status</span><span>Formal vote</span><span>Updated</span></div>
      {workspace.members.map(member=><div className="dataRow" key={member.user_id}>
        <div className="membershipIdentity" data-label="Member"><b>{member.email||"Authenticated member"}</b><small title={member.user_id}>ID {shortId(member.user_id)}</small></div>
        <span data-label="Role"><span className="badge neutral">{member.role}</span></span>
        <span data-label="Status"><span className={"badge "+(member.status==="active"?"good":"bad")}>{label(member.status)}</span></span>
        <span data-label="Formal vote">{member.formal_voting_eligible?"Eligible":"Not eligible"}</span>
        <span data-label="Updated">{date(member.updated_at)}</span>
      </div>)}
    </div>

    {workspace.can_invite&&<>
      <div className="panelHead membershipSectionHead">
        <div><p className="eyebrow">INVITATIONS</p><h3>Pending + historical</h3></div>
        <span className="countPill">{pending.length} PENDING</span>
      </div>
      {workspace.invitations.length?<div className="dataTable membershipTable invitationTable">
        <div className="dataRow headerRow"><span>Invitee</span><span>Role</span><span>Status</span><span>Expiry</span><span>Action</span></div>
        {workspace.invitations.map(invite=><div className="dataRow" key={invite.id}>
          <div className="membershipIdentity" data-label="Invitee"><b>{invite.email}</b><small title={invite.id}>Invite {shortId(invite.id)}</small></div>
          <span data-label="Role"><span className="badge neutral">{invite.role}</span></span>
          <span data-label="Status"><span className={"badge "+(invite.status==="invited"?"live":"neutral")}>{label(invite.status)}</span></span>
          <span data-label="Expiry">{date(invite.expires_at)}</span>
          <span className="inviteRowActions" data-label="Action">{invite.status==="invited"
            ?<>
              <button className="textButton" type="button" disabled={busy} onClick={()=>void resendInvite(invite)}>Resend</button>
              <button className="textButton dangerTextButton" type="button" disabled={busy} onClick={()=>void revokeInvite(invite.id)}>Revoke</button>
            </>
            :"—"}</span>
        </div>)}
      </div>:<p className="muted">No project-member invitations have been issued yet.</p>}
    </>}

    <p className="muted membershipFootnote">Invite boundaries: no self-invite, no owner invitation, admin invitations require the owner, and acceptance requires the matching authenticated account.</p>
  </section>;
}
