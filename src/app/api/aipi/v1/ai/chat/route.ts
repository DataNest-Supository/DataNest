import { randomUUID } from "node:crypto";
import {
  AIPI_MAX_BODY_BYTES,
  AIPI_POLICY_VERSION,
  AipiError,
  authorizeBearer,
  makeAuditEvent,
  parseAllowedModels,
  requireProject,
  resolveUpstreamConfig,
  validateChatPayload,
} from "@/lib/aipiCore";
import { callAipiProvider } from "@/lib/aipiProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number, requestId: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-AiPI-Request-Id": requestId,
    },
  });
}

function audit(input: Parameters<typeof makeAuditEvent>[0]) {
  // Deliberately excludes request bodies, prompts, bearer tokens, and provider secrets.
  console.info(JSON.stringify(makeAuditEvent(input)));
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const startedAtMs = Date.now();
  const rawProject = request.headers.get("x-resonance-project")?.trim() || "unknown";

  if (!authorizeBearer(request.headers.get("authorization"), process.env.AIPI_API_KEYS)) {
    audit({
      requestId,
      project: rawProject,
      action: "ai.chat",
      outcome: "denied",
      startedAtMs,
    });
    return json(
      { error: { code: "unauthorized", message: "A valid AiPI bearer token is required." } },
      401,
      requestId,
    );
  }

  let project = rawProject;
  let model: string | undefined;
  try {
    project = requireProject(request.headers.get("x-resonance-project"));

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > AIPI_MAX_BODY_BYTES) {
      throw new AipiError("request_too_large", 413, "AiPI requests are limited to 256 KiB.");
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > AIPI_MAX_BODY_BYTES) {
      throw new AipiError("request_too_large", 413, "AiPI requests are limited to 256 KiB.");
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AipiError("invalid_json", 400, "The request body must contain valid JSON.");
    }

    const allowedModels = parseAllowedModels(
      process.env.AIPI_ALLOWED_MODELS,
      process.env.DATANEST_SHARED_AI_MODEL,
    );
    const payload = validateChatPayload(body, allowedModels);
    model = payload.model;

    const upstream = resolveUpstreamConfig({
      url: process.env.AIPI_UPSTREAM_URL || process.env.DATANEST_SHARED_AI_BASE_URL,
      host: process.env.AIPI_UPSTREAM_HOST || process.env.DATANEST_SHARED_AI_HOST,
      apiKey: process.env.AIPI_UPSTREAM_API_KEY || process.env.DATANEST_SHARED_AI_SECRET,
    });

    const result = await callAipiProvider({
      config: upstream,
      model: payload.model,
      messages: payload.messages,
      temperature: payload.temperature,
      maxOutputTokens: payload.max_output_tokens,
    });

    audit({
      requestId,
      project,
      action: "ai.chat",
      outcome: "allowed",
      model,
      startedAtMs,
    });

    return json(
      {
        id: requestId,
        object: "aipi.chat.completion",
        status: "completed",
        model: payload.model,
        output: {
          role: "assistant",
          content: result.content,
        },
        usage: {
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
        },
        governance: {
          policy: AIPI_POLICY_VERSION,
          approved: true,
          project,
        },
      },
      200,
      requestId,
    );
  } catch (error) {
    const safeError = error instanceof AipiError
      ? error
      : new AipiError("internal_error", 500, "AiPI could not complete the request.");

    audit({
      requestId,
      project,
      action: "ai.chat",
      outcome: safeError.status >= 500 ? "failed" : "denied",
      model,
      startedAtMs,
    });

    return json(
      { error: { code: safeError.code, message: safeError.message } },
      safeError.status,
      requestId,
    );
  }
}
