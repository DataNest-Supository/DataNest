import { getSupabase } from "@/lib/supabase";

export type RonsasStatus = {
  contract: "ronsas-status@1";
  checkedAt: string;
  mode: "cloud";
  runtimeMode: "local-first";
  managedByDataNest: true;
  billingState: "free-promotion";
  independent: boolean;
  localInteractionRequired: boolean;
  authority: {
    owner: string;
    controlRepository: string;
    hubRepository: string;
    publicHub: string;
  };
  hub: {
    ok: boolean;
    status: number | null;
    latencyMs: number;
    origin: string;
    error?: string;
  };
  delivery: {
    brandedUrl: string;
    fallbackUrl: string;
    operationalUrl: string;
    ingress: {
      ok: boolean;
      status: number | null;
      latencyMs: number;
      origin: string;
      error?: string;
    };
    hubRegistration: {
      ok: boolean;
      status: number | null;
      latencyMs: number;
      endpoint: string;
      listed: boolean;
      error?: string;
    };
  };
};

export async function getRonsasStatus(): Promise<RonsasStatus> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("DataNest control plane is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("ronsas-status", {
    body: {},
  });

  if (error) throw error;

  const status = data as Partial<RonsasStatus> | null;
  if (
    !status ||
    status.contract !== "ronsas-status@1" ||
    status.mode !== "cloud" ||
    status.runtimeMode !== "local-first" ||
    status.managedByDataNest !== true ||
    status.billingState !== "free-promotion" ||
    status.independent !== false ||
    status.localInteractionRequired !== false ||
    !status.authority ||
    !status.hub ||
    !status.delivery ||
    typeof status.delivery.brandedUrl !== "string" ||
    typeof status.delivery.fallbackUrl !== "string" ||
    typeof status.delivery.operationalUrl !== "string" ||
    !status.delivery.ingress ||
    !status.delivery.hubRegistration ||
    typeof status.delivery.hubRegistration.listed !== "boolean"
  ) {
    throw new Error("RONSAS returned an invalid integration contract.");
  }

  return status as RonsasStatus;
}
