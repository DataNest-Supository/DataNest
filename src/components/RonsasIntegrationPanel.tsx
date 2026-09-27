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
    message: "Checking RONSAS DataNest integration…",
  });

  const refresh = useCallback(async () => {
    setState({
      kind: "checking",
      status: null,
      message: "Checking RONSAS DataNest integration…",
    });

    try {
      const status = await getRonsasStatus();
      setState({
        kind: "ready",
        status,
        message: status.hub.ok
          ? "DataNest-managed RONSAS status is reachable."
          : "DataNest-managed RONSAS is available but the public Hub is currently degraded.",
      });
    } catch (error) {
      setState({
        kind: "unavailable",
        status: null,
        message:
          error instanceof Error
            ? error.message
            : "RONSAS DataNest integration is unavailable.",
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
          <h3>DataNest integration</h3>
          <p className="muted">{state.message}</p>
        </div>
        <button className="secondaryButton compact" type="button" onClick={() => void refresh()}>
          {state.kind === "checking" ? "Checking…" : "Refresh"}
        </button>
      </div>

      <dl className="settingsList">
        <div><dt>Contract</dt><dd>{status?.contract || "ronsas-status@1"}</dd></div>
        <div><dt>Status channel</dt><dd>Cloud</dd></div>
        <div><dt>Runtime model</dt><dd>{status?.runtimeMode || "local-first"}</dd></div>
        <div><dt>DataNest authority</dt><dd>{status?.managedByDataNest === false ? "INVALID" : "Managed · required"}</dd></div>
        <div><dt>Commercial mode</dt><dd>{status?.billingState || "free-promotion"}</dd></div>
        <div><dt>RONSAS Hub</dt><dd>{hubState}{status?.hub.status ? ` · HTTP ${status.hub.status}` : ""}</dd></div>
        <div><dt>AppDev authority</dt><dd>{status?.authority.owner || "DataNest-Supository"}</dd></div>
        <div><dt>Control source</dt><dd>{status?.authority.controlRepository || "DataNest-Supository/DataNest"}</dd></div>
        <div><dt>Hub source</dt><dd>{status?.authority.hubRepository || "DataNest-Supository/DataNest"}</dd></div>
        <div><dt>Checked</dt><dd>{status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : "—"}</dd></div>
      </dl>
    </div>
  );
}
