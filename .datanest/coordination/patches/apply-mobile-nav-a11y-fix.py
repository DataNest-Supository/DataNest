from pathlib import Path

app_path = Path("src/components/DataNestApp.tsx")
shell_path = Path("src/components/platform/PlatformShell.tsx")
checkpoint_path = Path(".datanest/coordination/checkpoints/CP-MOBILE-NAV-A11Y-20261003.md")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


app = app_path.read_text()
app = replace_once(app,
'''  const previousViewRef=useRef<ViewKey>("overview");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);''',
'''  const previousViewRef=useRef<ViewKey>("overview");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [compactNavigation,setCompactNavigation]=useState(false);
  const navigationRef=useRef<HTMLElement|null>(null);
  const mobileMenuButtonRef=useRef<HTMLButtonElement|null>(null);
  const mobileCloseButtonRef=useRef<HTMLButtonElement|null>(null);
  const [commandOpen,setCommandOpen]=useState(false);''', "state refs")

app = replace_once(app,
'''  useEffect(()=>{
    if(!mobileOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setMobileOpen(false);
    };
    window.addEventListener("keydown",closeOnEscape);
    return()=>window.removeEventListener("keydown",closeOnEscape);
  },[mobileOpen]);''',
'''  useEffect(()=>{
    const media=window.matchMedia("(max-width: 900px)");
    const syncCompactNavigation=()=>{
      setCompactNavigation(media.matches);
      if(!media.matches)setMobileOpen(false);
    };
    syncCompactNavigation();
    media.addEventListener("change",syncCompactNavigation);
    return()=>media.removeEventListener("change",syncCompactNavigation);
  },[]);
  useEffect(()=>{
    if(!compactNavigation||!mobileOpen)return;
    const previousBodyOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const frame=window.requestAnimationFrame(()=>mobileCloseButtonRef.current?.focus({preventScroll:true}));
    return()=>{
      window.cancelAnimationFrame(frame);
      document.body.style.overflow=previousBodyOverflow;
    };
  },[compactNavigation,mobileOpen]);''', "effects")

app = replace_once(app,
'''  function openCommandPalette(){
    commandReturnFocusRef.current=quickSwitchButtonRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);''',
'''  function closeMobileNavigation(restoreFocus=true){
    setMobileOpen(false);
    if(!restoreFocus||!compactNavigation)return;
    window.requestAnimationFrame(()=>mobileMenuButtonRef.current?.focus({preventScroll:true}));
  }

  function trapMobileNavigationFocus(event:import("react").KeyboardEvent<HTMLElement>){
    if(!compactNavigation||!mobileOpen)return;
    if(event.key==="Escape"){
      event.preventDefault();
      event.stopPropagation();
      closeMobileNavigation();
      return;
    }
    if(event.key!=="Tab")return;
    const focusable=Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
    )).filter(element=>element.getClientRects().length>0&&!element.hasAttribute("inert"));
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    const active=document.activeElement;
    if(event.shiftKey&&active===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
  }

  function openCommandPalette(){
    commandReturnFocusRef.current=quickSwitchButtonRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);''', "helpers")

app = replace_once(app, '''    <PlatformShell
      navigation={<>''', '''    <PlatformShell
      navigationOpen={compactNavigation&&mobileOpen}
      navigation={<>''', "shell wiring")
app = replace_once(app, '''    <aside id="datanest-navigation" aria-label="DataNest navigation" className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="sidebarTop">''', '''    <aside
      ref={navigationRef}
      id="datanest-navigation"
      aria-label="DataNest navigation"
      className={"sidebar "+(mobileOpen?"open":"")}
      role={compactNavigation&&mobileOpen?"dialog":undefined}
      aria-modal={compactNavigation&&mobileOpen?true:undefined}
      inert={compactNavigation&&!mobileOpen}
      onKeyDown={trapMobileNavigationFocus}
    >
      <div className="sidebarTop">''', "aside semantics")
app = replace_once(app, '''        <button className="closeMenu" onClick={()=>setMobileOpen(false)} aria-label="Close menu" aria-controls="datanest-navigation">×</button>''', '''        <button ref={mobileCloseButtonRef} className="closeMenu" type="button" onClick={()=>closeMobileNavigation()} aria-label="Close menu" aria-controls="datanest-navigation">×</button>''', "close button")
app = replace_once(app, '''        onNavigate={next=>{setView(next as ViewKey);setMobileOpen(false);}}''', '''        onNavigate={next=>{
          const nextView=next as ViewKey;
          const restoreLauncher=nextView===view;
          setView(nextView);
          closeMobileNavigation(restoreLauncher);
        }}''', "nav selection")
app = replace_once(app, '''        <button className="textButton" onClick={signOut}>Sign out</button>''', '''        <button className="textButton" type="button" onClick={signOut}>Sign out</button>''', "sign out")
app = replace_once(app, '''    {mobileOpen&&<button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}''', '''    {mobileOpen&&<button className="scrim" type="button" onClick={()=>closeMobileNavigation()} aria-label="Close navigation"/>}''', "scrim")
app = replace_once(app, '''        <button className="menuButton" onClick={()=>setMobileOpen(true)} aria-label="Open menu" aria-controls="datanest-navigation" aria-expanded={mobileOpen}>☰</button>''', '''        <button ref={mobileMenuButtonRef} className="menuButton" type="button" onClick={()=>setMobileOpen(true)} aria-label="Open menu" aria-controls="datanest-navigation" aria-expanded={mobileOpen}>☰</button>''', "launcher")
app_path.write_text(app)

shell_path.write_text('''import type { ReactNode } from "react";\n\nexport default function PlatformShell({\n  navigation,topbar,context,children,footer,navigationOpen=false\n}:{\n  navigation:ReactNode;\n  topbar:ReactNode;\n  context?:ReactNode;\n  children:ReactNode;\n  footer?:ReactNode;\n  navigationOpen?:boolean;\n}) {\n  return <>\n    {navigation}\n    <main className="mainPane" inert={navigationOpen} aria-hidden={navigationOpen||undefined}>\n      {topbar}\n      <div className="contentPane">\n        {context}\n        {children}\n      </div>\n      {footer}\n    </main>\n  </>;\n}\n''')

checkpoint = checkpoint_path.read_text()
if "## Remediation applied" not in checkpoint:
    checkpoint += '''\n\n## Remediation applied\n\nThe branch-head remediation moves compact-navigation state and effects into `DataNestApp.tsx`, restores `PlatformShell.tsx` to display-only rendering, and leaves the browser acceptance contract unchanged. Exact source anchors must match before any write occurs.\n\nResume by checking exact-head CI and PR Verification. Do not weaken the source-contract test and do not merge until all protected-main gates and fresh human/code-owner approval are satisfied.\n'''
checkpoint_path.write_text(checkpoint)

if any(token in shell_path.read_text() for token in ("useState", "useEffect", "getSupabase", "window.history")):
    raise SystemExit("PlatformShell remains stateful")
for token in ('navigationOpen={compactNavigation&&mobileOpen}', 'role={compactNavigation&&mobileOpen?"dialog":undefined}', 'inert={compactNavigation&&!mobileOpen}', 'onKeyDown={trapMobileNavigationFocus}', 'document.body.style.overflow="hidden"', 'mobileMenuButtonRef.current?.focus'):
    if token not in app:
        raise SystemExit(f"missing contract token: {token}")
print("mobile navigation accessibility remediation applied")
