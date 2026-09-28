import { afterEach, describe, expect, test } from "vitest";
import { ronsAiChat } from "@/lib/rons-ai.server";

const oldUrl = process.env["DATANEST_CLOUD_AI_URL"];
const oldModel = process.env["RONS_AI_MODEL"];

afterEach(() => {
  if (oldUrl === undefined) delete process.env["DATANEST_CLOUD_AI_URL"];
  else process.env["DATANEST_CLOUD_AI_URL"] = oldUrl;
  if (oldModel === undefined) delete process.env["RONS_AI_MODEL"];
  else process.env["RONS_AI_MODEL"] = oldModel;
});

describe("RONS cloud AI client", () => {
  test("uses an explicitly configured private cloud service", async () => {
    process.env["DATANEST_CLOUD_AI_URL"]="http://ai.railway.internal:8080";
    const mockFetch = (async (input, init) => {
      expect(String(input)).toBe("http://ai.railway.internal:8080/v1/ai/chat");
      const headers = init?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBeUndefined();
      const body = JSON.parse(String(init?.body));
      expect(body.messages[0].content).toBe("hello");
      return Response.json({ message: { content: "cloud answer" }, external_ai_used: false });
    }) as typeof fetch;
    expect(await ronsAiChat([{ role: "user", content: "hello" }], mockFetch)).toBe("cloud answer");
  });

  test("rejects external-AI responses", async () => {
    process.env["DATANEST_CLOUD_AI_URL"]="https://ai.example.com";
    const mockFetch = (async () => Response.json({
      message: { content: "external" }, external_ai_used: true,
    })) as typeof fetch;
    await expect(ronsAiChat([{ role: "user", content: "hello" }], mockFetch))
      .rejects.toThrow("violated sovereign mode");
  });

  test("blocks loopback gateways and missing configuration", async () => {
    process.env["DATANEST_CLOUD_AI_URL"] = "http://127.0.0.1:58600";
    const mockFetch = (async () => Response.json({ message: { content: "no" } })) as typeof fetch;
    await expect(ronsAiChat([{ role: "user", content: "hello" }], mockFetch))
      .rejects.toThrow("DataNest cloud ai is unavailable");
  });
});
