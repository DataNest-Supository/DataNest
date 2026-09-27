"use client";

import { useCallback, useEffect, useState } from "react";
import { getRonsasStatus, type RonsasStatus } from "@/lib/ronsas";

type State =
  | { kind: "checking"; status: null; message: string }
  | { kind: "ready"; status: RonsasStatus; message: string }
  | { kind: "unavailable"; status: null; message: string };

export default function RonsasIntegrationPanel() {
  const [state, setState] = useState<State>({
    kind: "checking",
    status: null,
    message: "Checking RONSAS cloud integration…",
  });

  const refresh = useCallback(async () => {
    setState({
      kind: "checking",
      status: null,
      message: "Checking RONSAS cloud integration…",
    });

    try {
      const status = await getRonsasStatus();
      setState({
        kind: "ready",
        status,
        message: status.hub.ok
          ? "RONSAS cloud integration is reachable."
          : "RONSAS cloud integration is available but the Hub is currently degraded.",
      });
    } catch (error) {
      setState({
        kind: "unavailable",
        status: null,
        message:
          error instanceof Error
            ? error.message
            : "RONSAS cloud integration is unavailable.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const status = state.status;
  const hubState = status?.hub.ok ? "ONLINE" : state.kind === "checking" ? "CHECKING" : "DEGRADED";

  return (
    <div className="panel fullWidth" aria-label="RONSAS integration">
      <div className="panelHead">
        <div>
          <p className="eyebrow">RONSAS · RESONANCE APPDEV</p>
          <h3>Cloud integration</h3>
          <p className="muted">{state.message}</p>
        </div>
        <button className="secondaryButton compact" type="button" onClick={() => void refresh()}>
          {state.kind === "checking" ? "Checking…" : "Refresh"}
        </button>
      </div>

      <dl className="settingsList">
        <div><dt>Contract</dt><dd>{status?.contract || "ronsas-status@1"}</dd></div>
        <div><dt>Execution mode</dt><dd>Cloud-only</dd></div>
        <div><dt>Local interaction</dt><dd>Not required</dd></div>
        <div><dt>DataNest dependency</dt><dd>Independent · non-blocking</dd></div>
        <div><dt>RONSAS Hub</dt><dd>{hubState}{status?.hub.status ? ` · HTTP ${status.hub.status}` : ""}</dd></div>
        <div><dt>AppDev authority</dt><dd>{status?.authority.owner || "ResonanceAppDev"}</dd></div>
        <div><dt>Control source</dt><dd>{status?.authority.controlRepository || "resonance36912-cell/RONSAS"}</dd></div>
        <div><dt>Hub source</dt><dd>{status?.authority.hubRepository || "resonance36912-cell/resonance-hub"}</dd></div>
        <div><dt>Checked</dt><dd>{status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : "—"}</dd></div>
      </dl>
    </div>
  );
}
