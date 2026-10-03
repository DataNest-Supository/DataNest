import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const PROJECT_ID = "c2aa30c1-fc82-4524-8510-021ac0fef967";
const allowedOrigins = new Set([
  "https://datanest-supository.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const allowedEvents = new Set([
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
]);

const rateBuckets = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 12_000;

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
});

function response(
  body: unknown,
  status: number,
  origin: string | null
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function boundedText(value: unknown, max = 250): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeReferrerOrigin(value: unknown): string | null {
  const raw = boundedText(value, 500);
  if (!raw) return null;
  try {
    return new URL(raw).origin.slice(0, 200);
  } catch {
    return null;
  }
}

function cleanUtm(value: unknown): string | null {
  return boundedText(value, 120);
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    rateBuckets.set(key, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return response({ ok: false, error: "POST required" }, 405, origin);
  }

  if (origin && !allowedOrigins.has(origin)) {
    return response({ ok: false, error: "Origin not allowed" }, 403, origin);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response({ ok: false, error: "Payload too large" }, 413, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return response({ ok: false, error: "Invalid JSON" }, 400, origin);
  }

  const event = boundedText(body.event, 64)?.toLowerCase() ?? "";
  const path = boundedText(body.path, 500) ?? "/";
  const sessionId = body.sessionId;

  if (!allowedEvents.has(event)) {
    return response({ ok: false, error: "Unsupported event" }, 400, origin);
  }

  if (!isUuid(sessionId)) {
    return response({ ok: false, error: "Session id required" }, 400, origin);
  }

  const rateKey = `${origin ?? "unknown"}:${sessionId}`;
  if (!checkRateLimit(rateKey)) {
    return response({ ok: false, error: "Rate limit exceeded" }, 429, origin);
  }

  const payload = {
    schema_version: 1,
    source: "public_marketing",
    session_id: sessionId,
    path,
    referrer_origin: safeReferrerOrigin(body.referrer),
    page_title: boundedText(body.pageTitle, 180),
    product: boundedText(body.product, 120),
    service: boundedText(body.service, 160),
    plan: boundedText(body.plan, 120),
    cta: boundedText(body.cta, 120),
    source: cleanUtm(body.source),
    medium: cleanUtm(body.medium),
    campaign: cleanUtm(body.campaign),
    content: cleanUtm(body.content),
    term: cleanUtm(body.term)
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return response({ ok: false, error: "Server configuration unavailable" }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase.from("events").insert({
    project_id: PROJECT_ID,
    event_type: `COMMERCIAL_${event.toUpperCase()}`,
    actor: "commercial_funnel_anonymous",
    payload
  });

  if (error) {
    return response({ ok: false, error: "Event capture failed" }, 500, origin);
  }

  return response({ ok: true }, 202, origin);
});
