import {
  Inter,
  Inter_Tight,
  Instrument_Serif,
  JetBrains_Mono
} from "next/font/google";
import ThemeBootstrapScript from "@/components/platform/ThemeBootstrapScript";
import ThemeControl from "@/components/platform/ThemeControl";
import "./resonance-design-system.css";
import "./globals.css";
import "./external-auditor.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import "./datanest-ai-command-center.css";
import "./datanest-ai-zoom.css";
import type { ReactNode } from "react";

const interTight=Inter_Tight({
  subsets:["latin"],
  variable:"--font-inter-tight",
  display:"swap"
});

const inter=Inter({
  subsets:["latin"],
  variable:"--font-inter",
  display:"swap"
});

const instrumentSerif=Instrument_Serif({
  subsets:["latin"],
  weight:"400",
  style:"italic",
  variable:"--font-instrument-serif",
  display:"swap"
});

const jetBrainsMono=JetBrains_Mono({
  subsets:["latin"],
  variable:"--font-jetbrains-mono",
  display:"swap"
});

// Keep focused DataNest AI refinements last so UX overrides remain authoritative.
export const metadata = {
  title: "DataNest",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const forceHttpsSource=basePath + "/force-https.js";
  const runtimeConfigSource=basePath + "/runtime-config.js";
  const fontVariables=[
    interTight.variable,
    inter.variable,
    instrumentSerif.variable,
    jetBrainsMono.variable
  ].join(" ");

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeBootstrapScript />
        <script src={forceHttpsSource} />
        <script src={runtimeConfigSource} />
      </head>
      <body>
        {children}
        <div className="themeControlDock"><ThemeControl compact /></div>
      </body>
    </html>
  );
}
