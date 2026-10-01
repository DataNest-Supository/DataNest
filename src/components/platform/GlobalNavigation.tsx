"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WorkspaceGlyph from "./WorkspaceGlyph";
import type { NavigationItem } from "@/components/platform/navigationTypes";

const legalLinks=[
  {href:"/legal",label:"Legal Centre"},
  {href:"/governance",label:"Governance"},
  {href:"/privacy",label:"Privacy"},
  {href:"/terms",label:"Terms"},
  {href:"/disclaimers",label:"Disclaimers"}
] as const;

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
  const activeGroup=items.find(item=>item.id===currentView)?.group;
  const [openGroups,setOpenGroups]=useState<Set<string>>(
    ()=>new Set(groups.filter(group=>group==="Core"||group===activeGroup))
  );

  useEffect(()=>{
    if(!activeGroup)return;
    setOpenGroups(previous=>{
      if(previous.has(activeGroup))return previous;
      const next=new Set(previous);
      next.add(activeGroup);
      return next;
    });
  },[activeGroup]);

  return <>
    <nav className="navStack" aria-label="Project workspaces">
      {groups.map(group=><details
        className="navGroup navDisclosure"
        key={group}
        open={group==="Core"||items.some(item=>item.group===group&&item.id===currentView)||openGroups.has(group)}
        onToggle={event=>{
          const isOpen=event.currentTarget.open;
          setOpenGroups(previous=>{
            const next=new Set(previous);
            if(isOpen)next.add(group);
            else next.delete(group);
            return next;
          });
        }}
      >
        <summary>{group}</summary>
        {items.filter(item=>item.group===group).map(item=><button
          key={item.id}
          className={(currentView===item.id?"active ":"")+(item.id==="ai"?"aiHeroNav":"")}
          aria-label={item.label}
          aria-current={currentView===item.id?"page":undefined}
          onClick={()=>onNavigate(item.id)}
        >
          <span aria-hidden="true"><WorkspaceGlyph view={item.id}/></span>{item.label}
        </button>)}
      </details>)}
    </nav>
    <nav className="navLegalSection" aria-label="Governance and legal links">
      <p>Governance &amp; Legal</p>
      <div className="navLegalLinks">
        {legalLinks.map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}
      </div>
    </nav>
  </>;
}
