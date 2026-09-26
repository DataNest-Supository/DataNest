// @ts-expect-error Supabase Edge resolves pinned npm: imports; repository Node tsc does not.
import { withSupabase } from "npm:@supabase/server@1.8.0";

const CONTRACT = "ronsas-status@1";
const HUB_ORIGIN = "https://reson8.life/";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function assertCloudOnlyOrigin(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();

  if (url.protocol !== "https:") {
    throw new Error("RONSAS Hub must use HTTPS.");
  }

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    throw new Error("Local RONSAS origins are not permitted.");
  }

  if (host !== "reson8.life" && host !== "www.reson8.life") {
    throw new Error("RONSAS Hub origin is outside the AppDev authority allowlist.");
  }

  return url;
}

async function probe(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "Resonance-DataNest-RONSAS/1",
      },
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      origin: url.origin,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      origin: url.origin,
      error: error instanceof Error ? error.message : "RONSAS Hub probe failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  fetch: withSupabase({ auth: "user" }, async () => {
    try {
      const hubUrl = assertCloudOnlyOrigin(HUB_ORIGIN);
      const hub = await probe(hubUrl);

      return json({
        contract: CONTRACT,
        checkedAt: new Date().toISOString(),
        mode: "cloud",
        independent: true,
        localInteractionRequired: false,
        authority: {
          owner: "ResonanceAppDev",
          controlRepository: "resonance36912-cell/RONSAS",
          hubRepository: "resonance36912-cell/resonance-hub",
          publicHub: HUB_ORIGIN,
        },
        hub,
      });
    } catch (error) {
      return json(
        {
          contract: CONTRACT,
          checkedAt: new Date().toISOString(),
          mode: "cloud",
          independent: true,
          localInteractionRequired: false,
          error: error instanceof Error ? error.message : "RONSAS integration failed.",
        },
        500,
      );
    }
  }),
};
