"use client";

import type { NavigationItem } from "@/components/platform/navigationTypes";

const navigationGlyphs:Record<string,string> = {
  overview:"◎",
  ai:"✦",
  stakeholder:"◌",
  sparks:"✧",
  impact:"◉",
  thinktank:"◈",
  governance:"◆",
  products:"◉",
  external_auditor:"◫",
  productlab:"▣",
  unifi:"◇",
  scheduler:"⌁",
  runs:"▶",
  checkpoints:"↺",
  audit:"≡",
  transparency:"◎",
  settings:"⚙"
};

export default function GlobalNavigation({
  items,currentView,onNavigate,onOpenQuickSwitch
}:{
  items:readonly NavigationItem[];
  currentView:string;
  onNavigate:(view:string)=>void;
  onOpenQuickSwitch:()=>void;
}) {
  void onOpenQuickSwitch;
  const groups=Array.from(new Set(items.map(item=>item.group)));
  return <nav className="navStack" aria-label="Project workspaces">
    {groups.map(group=><details
      className="navGroup navDisclosure"
      key={group+String(items.some(item=>item.group===group&&item.id===currentView))}
      open={group==="Core"||items.some(item=>item.group===group&&item.id===currentView)}
    >
      <summary>{group}</summary>
      {items.filter(item=>item.group===group).map(item=><button
        key={item.id}
        className={(currentView===item.id?"active ":"")+(item.id==="ai"?"aiHeroNav":"")}
        aria-label={item.label}
        aria-current={currentView===item.id?"page":undefined}
        onClick={()=>onNavigate(item.id)}
      >
        <span aria-hidden="true">{navigationGlyphs[item.id]||"•"}</span>{item.label}
      </button>)}
    </details>)}
  </nav>;
}
