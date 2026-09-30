"use client";

import { useEffect, useState } from "react";
import styles from "./AdminRndModeToggle.module.css";

export const MIRROR_DATANEST_URL = "https://datanest-supository.github.io/Mirror-DataNest/";
const STORAGE_KEY = "datanest:admin-rd-test-mode";

export default function AdminRndModeToggle({role}:{role:"owner"|"admin"}) {
  const [enabled,setEnabled]=useState(false);

  useEffect(()=>{
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY)==="enabled");
    } catch {
      setEnabled(false);
    }
  },[]);

  function setMode(next:boolean){
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY,next?"enabled":"disabled");
    } catch {
      // Local preference storage is optional; access still works from this control.
    }
    if(next){
      window.open(MIRROR_DATANEST_URL,"_blank","noopener,noreferrer");
    }
  }

  return <section className={styles.control} aria-label="R&D Test Mode access">
    <div className={styles.copy}>
      <span className={styles.eyebrow}>ADMIN · R&D</span>
      <b>R&D Test Mode</b>
      <small>Open Mirror-DataNest for ungated experimentation. Production remains governed.</small>
    </div>
    <button
      className={styles.switch}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled?"Disable R&D Test Mode shortcut":"Enable R&D Test Mode and open Mirror-DataNest"}
      title={role.toUpperCase()+" access · Mirror-DataNest"}
      onClick={()=>setMode(!enabled)}
    >
      <span className={styles.track} data-enabled={enabled?"true":"false"}>
        <span className={styles.thumb}/>
      </span>
      <span className={styles.state}>{enabled?"ON":"OFF"}</span>
    </button>
    {enabled&&<a className={styles.openLink} href={MIRROR_DATANEST_URL} target="_blank" rel="noreferrer">
      Open R&D workspace <span aria-hidden="true">↗</span>
    </a>}
  </section>;
}
