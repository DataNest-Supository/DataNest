"use client";

import { useEffect } from "react";
import {
  COMMERCIAL_EVENT_NAMES,
  trackCommercialEvent,
  type CommercialEventName
} from "@/lib/commercialFunnel";

function pageEvent(path: string): CommercialEventName | null {
  if (path === "/" || path === "/DataNest/" || path === "") return "landing_view";
  if (path.includes("/pricing")) return "pricing_view";
  if (path.includes("/solutions")) return "solution_view";
  return null;
}

export default function CommercialFunnelTracker() {
  useEffect(() => {
    const path = window.location.pathname;
    const event = pageEvent(path);
    if (event) {
      trackCommercialEvent(event, { path });
    }

    const onClick = (rawEvent: MouseEvent) => {
      const target = rawEvent.target;
      if (!(target instanceof Element)) return;
      const element = target.closest<HTMLElement>("[data-commercial-event]");
      if (!element) return;

      const eventName = element.dataset.commercialEvent as CommercialEventName | undefined;
      if (!eventName || !COMMERCIAL_EVENT_NAMES.includes(eventName)) return;

      trackCommercialEvent(eventName, {
        path,
        product: element.dataset.commercialProduct,
        service: element.dataset.commercialService,
        plan: element.dataset.commercialPlan,
        cta: element.dataset.commercialCta
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
