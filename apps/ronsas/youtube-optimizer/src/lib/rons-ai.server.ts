export type RonsAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RonsAiResponse = {
  message?: { content?: unknown };
  model?: string;
  external_ai_used?: boolean;
};

import {getCloudRuntime,requireCloudCapability} from "./datanest-cloud.server";

function configuredGateway(): string {
  return `${requireCloudCapability(getCloudRuntime(),"ai")}/v1/ai/chat`;
}
export async function ronsAiChat(
  messages: readonly RonsAiMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (!messages.length) throw new Error("RONS AI requires at least one message");
  const model = process.env["RONS_AI_MODEL"]?.trim();
  const response = await fetchImpl(configuredGateway(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...(model ? { model } : {}), messages }),
  });
  if (!response.ok) {
    if (response.status === 503) throw new Error("DataNest cloud AI is unavailable");
    throw new Error(`Sovereign AI request failed (${response.status})`);
  }
  const payload = (await response.json()) as RonsAiResponse;
  if (payload.external_ai_used === true) throw new Error("RONS AI response violated sovereign mode");
  const content = payload.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Sovereign AI returned no text content");
  }
  return content.trim();
}
