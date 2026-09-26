export const RONSAS_ACRONYM="RONSAS";
export const RONSAS_NAME="Resonance Open Nova Sovereign Application Suite";
export const RONSAS_LABEL=RONSAS_ACRONYM+" · "+RONSAS_NAME;

import { getSupabase } from "@/lib/supabase";

export type RonsasStatus = {
  contract: "ronsas-status@1";
  checkedAt: string;
  mode: "cloud";
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
    status.localInteractionRequired !== false ||
    !status.authority ||
    !status.hub
  ) {
    throw new Error("RONSAS returned an invalid integration contract.");
  }

  return status as RonsasStatus;
}
