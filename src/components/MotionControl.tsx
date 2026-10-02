"use client";

import { useEffect, useState } from "react";

type MotionPreference = "system" | "reduced" | "full";
const STORAGE_KEY = "datanest.motionPreference";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyMotion(preference: MotionPreference): void {
  const reduced = preference === "reduced" || (preference === "system" && prefersReducedMotion());
  document.documentElement.dataset.motionPaused = String(reduced);
  document.documentElement.dataset.motionPreference = preference;
}

export default function MotionControl() {
  const [preference, setPreference] = useState<MotionPreference>("system");

  useEffect(() => {
    const legacyPaused = localStorage.getItem("datanest.motionPaused");
    const saved = localStorage.getItem(STORAGE_KEY) as MotionPreference | null;
    const initial: MotionPreference =
      saved === "system" || saved === "reduced" || saved === "full"
        ? saved
        : legacyPaused === "true"
          ? "reduced"
          : "system";

    setPreference(initial);
    applyMotion(initial);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleSystemChange = () => {
      if ((localStorage.getItem(STORAGE_KEY) ?? initial) === "system") applyMotion("system");
    };
    media.addEventListener("change", handleSystemChange);

    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  function chooseMotion(next: MotionPreference) {
    setPreference(next);
    applyMotion(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.removeItem("datanest.motionPaused");
    } catch {
      // Motion preferences remain functional without storage.
    }
  }

  return (
    <label className="motionControl">
      <span>Motion</span>
      <select
        aria-label="Motion preference"
        value={preference}
        onChange={(event) => chooseMotion(event.target.value as MotionPreference)}
      >
        <option value="system">System</option>
        <option value="reduced">Reduced</option>
        <option value="full">Full</option>
      </select>
    </label>
  );
}
