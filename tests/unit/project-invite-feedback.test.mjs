import test from "node:test";
import assert from "node:assert/strict";
import { activeMemberInviteError, projectInviteError, projectInviteConfirmation } from "../../src/lib/project-invite-feedback.ts";

test("active members receive an explicit explanation without another invite", () => {
  assert.match(activeMemberInviteError(" MEMBER@example.com ", [{email:"member@example.com",status:"active"}]), /already an active project member/);
  assert.equal(activeMemberInviteError("member@example.com", [{email:"member@example.com",status:"disabled"}]), null);
  assert.equal(activeMemberInviteError("new@example.com", [{email:null,status:"active"}]), null);
});

test("function errors expose server rejection reasons and preserve the response", async () => {
  for (const [status, message] of [[400,"You cannot invite yourself."],[403,"Only the owner may invite another admin."],[409,"Already a member."],[429,"Try again later."]]) {
    const context = new Response(JSON.stringify({error:message}), {status});
    assert.equal(await projectInviteError(Object.assign(new Error("non-2xx"), {context})), message);
    assert.equal(context.bodyUsed, false);
  }
});

test("gateway and network errors retain useful fallback messages", async () => {
  assert.equal(await projectInviteError(Object.assign(new Error("Gateway unavailable"), {context:new Response("not JSON")})), "Gateway unavailable");
  assert.equal(await projectInviteError(new Error("Failed to fetch")), "Failed to fetch");
  assert.match(await projectInviteError(null), /Unable to send/);
});

test("confirmed invitations name the recipient and explain the delivery mode", () => {
  for (const [delivery, expected] of [["invite",/sign in and accept/],["recovery",/account recovery email/],["magic-link",/magic sign-in link/]]) {
    const message = projectInviteConfirmation({ok:true,delivery}, "new@example.com");
    assert.match(message, /Project invitation sent to new@example.com/);
    assert.match(message, expected);
  }
});

test("empty, failed and unexpected responses never display sent confirmation", () => {
  for (const payload of [null,{}, {ok:false,delivery:"invite"},{ok:true},{ok:true,delivery:"unknown"}]) {
    assert.throws(() => projectInviteConfirmation(payload,"new@example.com"), /did not confirm success/);
  }
});
