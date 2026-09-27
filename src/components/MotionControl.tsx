"use client";

import { useEffect, useState } from "react";

export default function MotionControl() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("datanest.motionPaused") === "true";
      setPaused(saved);
      document.documentElement.dataset.motionPaused = String(saved);
    } catch {
      // Motion controls also work when browser storage is unavailable.
    }
  }, []);

  function toggle() {
    const next = !paused;
    setPaused(next);
    document.documentElement.dataset.motionPaused = String(next);
    try { localStorage.setItem("datanest.motionPaused", String(next)); } catch {}
  }

  return <button className="motionControl" type="button" aria-pressed={paused} onClick={toggle}>
    <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> Pause animations
  </button>;
}
