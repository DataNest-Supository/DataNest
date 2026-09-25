export function activeMemberInviteError(
  email: string,
  members: ReadonlyArray<{ email: string | null; status: string }>
): string | null {
  const normalized = email.trim().toLowerCase();
  return members.some(member => member.status === "active" && member.email?.toLowerCase() === normalized)
    ? `${normalized} is already an active project member. No invitation was sent.`
    : null;
}

export async function projectInviteError(error: unknown): Promise<string> {
  // FunctionsHttpError keeps the useful server message in its Response context.
  if (error && typeof error === "object" && "context" in error && error.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
      if (typeof body?.message === "string" && body.message.trim()) return body.message;
    } catch { /* Keep the SDK error for non-JSON gateway responses. */ }
  }
  return error instanceof Error ? error.message : "Unable to send project invitation. Please try again.";
}

export function projectInviteConfirmation(data: unknown, email: string): string {
  const payload = data as { ok?: unknown; delivery?: unknown } | null;
  if (payload?.ok !== true || !["invite", "recovery", "magic-link"].includes(String(payload.delivery))) {
    throw new Error("The invite service did not confirm success. Check the invitations list before retrying.");
  }
  const detail = payload.delivery === "recovery"
    ? "The existing account will receive an account recovery email to sign in."
    : payload.delivery === "magic-link"
      ? "The existing account will receive a magic sign-in link."
      : "The recipient must sign in and accept to activate membership.";
  return `Project invitation sent to ${email}. ${detail}`;
}
