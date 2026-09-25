import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "DataNest | Resonance AppDev",
  description: "DataNest by Resonance AppDev — plan projects, collaborate with governed AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Lora:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <script src={basePath + "/runtime-config.js"} />
      </head>
      <body>{children}</body>
    </html>
  );
}
