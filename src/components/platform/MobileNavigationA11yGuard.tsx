"use client";

import { useEffect } from "react";

const NAVIGATION_ID="datanest-navigation";
const MENU_LAUNCHER_SELECTOR='button[aria-controls="datanest-navigation"][aria-label="Open menu"]';
const SKIP_LINK_SELECTOR=".skipLink";

function currentWorkspace(){
  return document.querySelector<HTMLElement>("[data-workspace]")?.dataset.workspace||null;
}

function mobileDialogOpen(sidebar:HTMLElement|null){
  return Boolean(
    sidebar&&
    sidebar.getAttribute("role")==="dialog"&&
    sidebar.getAttribute("aria-modal")==="true"&&
    !sidebar.hasAttribute("inert")
  );
}

export default function MobileNavigationA11yGuard(){
  useEffect(()=>{
    let wasOpen=false;
    let workspaceAtOpen:string|null=null;
    let lastSidebarAction:HTMLElement|null=null;
    let restoreFrame=0;

    const setSkipLinkIsolation=(isolated:boolean)=>{
      const skipLink=document.querySelector<HTMLElement>(SKIP_LINK_SELECTOR);
      if(!skipLink)return;

      if(isolated){
        if(!skipLink.hasAttribute("inert"))skipLink.setAttribute("inert","");
        if(skipLink.getAttribute("aria-hidden")!=="true")skipLink.setAttribute("aria-hidden","true");
        return;
      }

      if(skipLink.hasAttribute("inert"))skipLink.removeAttribute("inert");
      if(skipLink.getAttribute("aria-hidden")==="true")skipLink.removeAttribute("aria-hidden");
    };

    const restoreStrandedFocus=()=>{
      const sidebar=document.getElementById(NAVIGATION_ID);
      const active=document.activeElement instanceof HTMLElement?document.activeElement:null;
      const focusIsStranded=!active||active===document.body||Boolean(sidebar?.contains(active));
      if(!focusIsStranded)return;

      // If the sidebar handed focus to another modal, that modal owns restoration.
      const nextModal=document.querySelector<HTMLElement>(
        `[role="dialog"][aria-modal="true"]:not(#${NAVIGATION_ID})`
      );
      if(nextModal)return;

      // Cross-view navigation already focuses the destination workspace title.
      // Only repair same-view closures where the active control becomes inert.
      const workspaceNow=currentWorkspace();
      if(workspaceAtOpen&&workspaceNow&&workspaceNow!==workspaceAtOpen)return;

      const accountSecurityAction=Boolean(lastSidebarAction?.closest(".accountSecurityShortcut"));
      // Account security owns a pending focus request inside DataNestApp. Let the
      // owning component consume that request so it cannot replay on a later
      // return to Settings.
      if(accountSecurityAction)return;

      const destination=document.querySelector<HTMLElement>(MENU_LAUNCHER_SELECTOR);
      if(!destination?.isConnected)return;

      window.cancelAnimationFrame(restoreFrame);
      restoreFrame=window.requestAnimationFrame(()=>{
        if(destination.isConnected)destination.focus({preventScroll:true});
      });
    };

    const synchronize=()=>{
      const sidebar=document.getElementById(NAVIGATION_ID);
      const isOpen=mobileDialogOpen(sidebar);
      setSkipLinkIsolation(isOpen);

      if(isOpen&&!wasOpen){
        workspaceAtOpen=currentWorkspace();
        lastSidebarAction=null;
      }else if(!isOpen&&wasOpen){
        restoreStrandedFocus();
      }

      wasOpen=isOpen;
    };

    const rememberSidebarAction=(event:MouseEvent)=>{
      const sidebar=document.getElementById(NAVIGATION_ID);
      if(!mobileDialogOpen(sidebar))return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const action=target.closest<HTMLElement>('button,a,[role="button"]');
      if(action&&sidebar?.contains(action))lastSidebarAction=action;
    };

    document.addEventListener("click",rememberSidebarAction,true);
    const observer=new MutationObserver(synchronize);
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:["class","role","aria-modal","inert","aria-hidden","data-workspace"]
    });
    synchronize();

    return()=>{
      document.removeEventListener("click",rememberSidebarAction,true);
      observer.disconnect();
      window.cancelAnimationFrame(restoreFrame);
      setSkipLinkIsolation(false);
    };
  },[]);

  return null;
}
