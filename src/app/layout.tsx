import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Resonance DataNest",
  description: "UNIFI + TranScheduler project operating environment"
};

export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
