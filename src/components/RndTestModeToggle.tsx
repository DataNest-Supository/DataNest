"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "datanest.rnd.test-mode";

export default function RndTestModeToggle({
  projectId,
  role
}:{
  projectId:string;
  role:"owner"|"admin";
}) {
  const [enabled,setEnabled]=useState(false);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    try { setEnabled(window.localStorage.getItem(STORAGE_KEY)==="true"); }
    finally { setHydrated(true); }
  },[]);

  function setMode(next:boolean){
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY,next?"true":"false");
      window.dispatchEvent(new CustomEvent("datanest-rnd-test-mode",{detail:{enabled:next}}));
    } catch {}
  }

  return <section className="panel" aria-labelledby="rnd-test-mode-heading">
    <div className="panelHead">
      <div>
        <p className="eyebrow">R&amp;D MIRROR</p>
        <h3 id="rnd-test-mode-heading">R&amp;D Test Mode</h3>
        <p>Mirror-only development and release-rehearsal mode. It never grants production authority and is only exposed when the mirror build flag is enabled.</p>
      </div>
      <span className={"badge "+(enabled?"good":"quiet")}>{enabled?"R&amp;D TEST ON":"LIVE MODE"}</span>
    </div>
    <div className="settingsList">
      <div><dt>Project</dt><dd>{projectId}</dd></div>
      <div><dt>Admin role</dt><dd>{role}</dd></div>
      <div><dt>Production authority</dt><dd>Never granted by this toggle</dd></div>
      <div><dt>Persistence</dt><dd>Browser-local only</dd></div>
      <div><dt>Backend boundary</dt><dd>Mirror R&amp;D environment</dd></div>
    </div>
    <div className="rowActions">
      <button className={enabled?"secondaryButton compact":"primaryButton compact"} type="button" onClick={()=>setMode(!enabled)} disabled={!hydrated} aria-pressed={enabled}>
        {enabled?"Disable R&amp;D Test Mode":"Enable R&amp;D Test Mode"}
      </button>
    </div>
    {enabled&&<div className="authMessage" role="status">R&amp;D Test Mode is active in this browser. Production governance and deployment gates remain unchanged.</div>}
  </section>;
}
