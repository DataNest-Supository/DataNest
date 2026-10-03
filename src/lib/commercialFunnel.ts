import { getSupabase } from "@/lib/supabase";

export const COMMERCIAL_EVENT_NAMES = [
  "landing_view",
  "solution_view",
  "pricing_view",
  "lead_started",
  "lead_handoff_started",
  "signup_started",
  "signup_completed",
  "activation_completed",
  "core_feature_used",
  "return_session",
  "pricing_intent",
  "checkout_started",
  "checkout_completed",
  "subscription_active",
  "subscription_cancelled",
  "renewal",
  "sales_qualified",
  "proposal_sent",
  "deal_won",
  "deal_lost",
  "workspace_access_started"
] as const;

export type CommercialEventName = typeof COMMERCIAL_EVENT_NAMES[number];

type CommercialEventDetails = {
  path?: string;
  pageTitle?: string;
  product?: string;
  service?: string;
  plan?: string;
  cta?: string;
  referrer?: string;
};

const SESSION_KEY = "datanest-commercial-session";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = window.localStorage.getItem(SESSION_KEY);
    if (current) return current;
    const next = window.crypto?.randomUUID?.();
    if (!next) return null;
    window.localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return null;
  }
}

function getUtmValue(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(name) || undefined;
}

export function trackCommercialEvent(
  event: CommercialEventName,
  details: CommercialEventDetails = {}
): void {
  if (typeof window === "undefined") return;

  const supabase = getSupabase();
  const sessionId = getSessionId();
  if (!supabase || !sessionId) return;

  const payload = {
    event,
    sessionId,
    path: details.path ?? window.location.pathname,
    pageTitle: details.pageTitle ?? document.title,
    product: details.product,
    service: details.service,
    plan: details.plan,
    cta: details.cta,
    referrer: details.referrer ?? document.referrer,
    source: getUtmValue("utm_source"),
    medium: getUtmValue("utm_medium"),
    campaign: getUtmValue("utm_campaign"),
    content: getUtmValue("utm_content"),
    term: getUtmValue("utm_term")
  };

  void supabase.functions
    .invoke("datanest-commercial-funnel", { body: payload })
    .catch(() => {
      // Commercial telemetry is best-effort and must never block the user journey.
    });
}
