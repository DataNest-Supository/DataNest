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
  const deliveryState = status?.delivery.publicDelivery.ok
    ? "LIVE"
    : state.kind === "checking"
      ? "CHECKING"
      : "DEGRADED";
  const hubListingState = status?.delivery.hubRegistration.listed
    ? "LISTED"
    : state.kind === "checking"
      ? "CHECKING"
      : "PENDING";

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
        <div><dt>DataNest authority</dt><dd>Managed · required</dd></div>
        <div><dt>Commercial mode</dt><dd>{status?.billingState || "free-promotion"}</dd></div>
        <div><dt>RONSAS Hub</dt><dd>{hubState}{status?.hub.status ? ` · HTTP ${status.hub.status}` : ""}{status?.authority.publicHub&&<> · <a className="catalogRecordLaunch" href={status.authority.publicHub} target="_blank" rel="noreferrer" aria-label="Open RONSAS from integration settings">Open RONSAS ↗</a></>}</dd></div>
        <div><dt>Canonical name</dt><dd>{status?.delivery.canonicalName || "reson8.datanest.life"}</dd></div>
        <div><dt>Branded URL</dt><dd>{status?.delivery.brandedUrl || "https://reson8.datanest.life/"} · {status?.delivery.brandedState || "reserved"}</dd></div>
        <div><dt>Public delivery</dt><dd>{deliveryState}{status?.delivery.publicDelivery.status ? ` · HTTP ${status.delivery.publicDelivery.status}` : ""} · {status?.delivery.provider || "GitHub Pages"}</dd></div>
        <div><dt>Operational URL</dt><dd>{status?.delivery.operationalUrl ? <a className="catalogRecordLaunch" href={status.delivery.operationalUrl} target="_blank" rel="noreferrer" aria-label="Open operational DataNest delivery URL">Open DataNest ↗</a> : "—"}</dd></div>
        <div><dt>Hub listing</dt><dd>{hubListingState}{status?.delivery.hubRegistration.status ? ` · HTTP ${status.delivery.hubRegistration.status}` : ""}</dd></div>
        <div><dt>Backup host</dt><dd>{status?.delivery.backupHost ? `${status.delivery.backupHost.provider} · ${status.delivery.backupHost.path} · artifact recovery` : "Dropbox · /DataNest-AI-Backups · artifact recovery"}</dd></div>
        <div><dt>Local PC backup hosting</dt><dd>DISABLED</dd></div>
        <div><dt>AppDev authority</dt><dd>{status?.authority.owner || "DataNest-Supository"}</dd></div>
        <div><dt>Control source</dt><dd>{status?.authority.controlRepository || "DataNest-Supository/DataNest"}</dd></div>
        <div><dt>Hub source</dt><dd>{status?.authority.hubRepository || "DataNest-Supository/DataNest"}</dd></div>
        <div><dt>Checked</dt><dd>{status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : "—"}</dd></div>
      </dl>
    </div>
  );
}
