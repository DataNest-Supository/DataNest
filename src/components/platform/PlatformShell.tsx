import type { ReactNode } from "react";

export default function PlatformShell({
  navigation,topbar,context,children,footer
}:{
  navigation:ReactNode;
  topbar:ReactNode;
  context?:ReactNode;
  children:ReactNode;
  footer?:ReactNode;
}) {
  return <>
    {navigation}
    <main className="mainPane">
      {topbar}
      <div className="contentPane">
        {context}
        {children}
      </div>
      {footer}
    </main>
  </>;
}
