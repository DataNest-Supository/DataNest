"use client";

import { useEffect, useState, type ReactNode } from "react";

const COMPACT_NAVIGATION_QUERY="(max-width: 900px)";
const NAVIGATION_ID="datanest-navigation";

function compactNavigationFocusable(container:HTMLElement){
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
  )).filter(element=>element.getClientRects().length>0&&!element.hasAttribute("inert"));
}

export default function PlatformShell({
  navigation,topbar,context,children,footer,navigationOpen=false
}:{
  navigation:ReactNode;
  topbar:ReactNode;
  context?:ReactNode;
  children:ReactNode;
  footer?:ReactNode;
  navigationOpen?:boolean;
}) {
  const [compactNavigationOpen,setCompactNavigationOpen]=useState(false);

  useEffect(()=>{
    const navigationElement=document.getElementById(NAVIGATION_ID);
    if(!navigationElement)return;

    const media=window.matchMedia(COMPACT_NAVIGATION_QUERY);
    let wasCompactOpen=false;
    let previousBodyOverflow=document.body.style.overflow;
    let suppressRestore=false;

    const closeButton=()=>navigationElement.querySelector<HTMLButtonElement>(".closeMenu");
    const menuButton=()=>document.querySelector<HTMLButtonElement>(`.menuButton[aria-controls="${NAVIGATION_ID}"]`);

    const restoreLauncherWhenSafe=()=>{
      window.requestAnimationFrame(()=>{
        window.setTimeout(()=>{
          const quickSwitch=document.querySelector('[role="dialog"][aria-label="Quick switch DataNest workspace"]');
          const active=document.activeElement instanceof HTMLElement?document.activeElement:null;
          if(quickSwitch||active?.id==="workspace-title")return;
          if(active&&active!==document.body&&!navigationElement.contains(active))return;
          menuButton()?.focus({preventScroll:true});
        },0);
      });
    };

    const applyNavigationState=()=>{
      const compact=media.matches;
      const open=compact&&navigationElement.classList.contains("open");
      setCompactNavigationOpen(open);

      if(!compact){
        navigationElement.removeAttribute("inert");
        navigationElement.removeAttribute("role");
        navigationElement.removeAttribute("aria-modal");
        if(wasCompactOpen)document.body.style.overflow=previousBodyOverflow;
        wasCompactOpen=false;
        return;
      }

      if(open){
        navigationElement.removeAttribute("inert");
        navigationElement.setAttribute("role","dialog");
        navigationElement.setAttribute("aria-modal","true");
        if(!wasCompactOpen){
          previousBodyOverflow=document.body.style.overflow;
          document.body.style.overflow="hidden";
          window.requestAnimationFrame(()=>closeButton()?.focus({preventScroll:true}));
        }
      }else{
        navigationElement.setAttribute("inert","");
        navigationElement.removeAttribute("role");
        navigationElement.removeAttribute("aria-modal");
        if(wasCompactOpen){
          document.body.style.overflow=previousBodyOverflow;
          if(suppressRestore)suppressRestore=false;
          else restoreLauncherWhenSafe();
        }
      }

      wasCompactOpen=open;
    };

    const handleNavigationKeyDown=(event:KeyboardEvent)=>{
      if(!media.matches||!navigationElement.classList.contains("open"))return;
      if(event.key==="Escape"){
        event.preventDefault();
        event.stopPropagation();
        closeButton()?.click();
        return;
      }
      if(event.key!=="Tab")return;

      const focusable=compactNavigationFocusable(navigationElement);
      if(!focusable.length)return;
      const first=focusable[0];
      const last=focusable[focusable.length-1];
      const active=document.activeElement;
      if(event.shiftKey&&active===first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey&&active===last){
        event.preventDefault();
        first.focus();
      }
    };

    const handleMediaChange=()=>{
      if(!media.matches&&navigationElement.classList.contains("open")){
        suppressRestore=true;
        closeButton()?.click();
      }
      applyNavigationState();
    };

    const observer=new MutationObserver(applyNavigationState);
    observer.observe(navigationElement,{attributes:true,attributeFilter:["class"]});
    navigationElement.addEventListener("keydown",handleNavigationKeyDown);
    media.addEventListener("change",handleMediaChange);
    applyNavigationState();

    return()=>{
      observer.disconnect();
      navigationElement.removeEventListener("keydown",handleNavigationKeyDown);
      media.removeEventListener("change",handleMediaChange);
      navigationElement.removeAttribute("inert");
      navigationElement.removeAttribute("role");
      navigationElement.removeAttribute("aria-modal");
      if(wasCompactOpen)document.body.style.overflow=previousBodyOverflow;
    };
  },[]);

  const effectiveNavigationOpen=navigationOpen||compactNavigationOpen;

  return <>
    {navigation}
    <main className="mainPane" inert={effectiveNavigationOpen} aria-hidden={effectiveNavigationOpen||undefined}>
      {topbar}
      <div className="contentPane">
        {context}
        {children}
      </div>
      {footer}
    </main>
  </>;
}
