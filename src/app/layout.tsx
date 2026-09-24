import "./globals.css";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resonance DataNest",
  description: "UNIFI + TranScheduler project operating environment"
};

function runtimeConfigScript() {
  const config = {
    supabaseUrl:
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "",
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      ""
  };

  return `window.__DATANEST_CONFIG__=${JSON.stringify(config).replace(/</g, "\\u003c")};`;
}

export default function RootLayout({children}:{children:ReactNode}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: runtimeConfigScript()}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
