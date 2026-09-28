import "./globals.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import type { ReactNode } from "react";

const configuredPublicOrigin = (process.env.DATANEST_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");

export const metadata = {
  ...(configuredPublicOrigin ? {
    metadataBase: new URL(configuredPublicOrigin),
    alternates: { canonical: "/" }
  } : {}),
  title: "Resonance DataNest",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <html lang="en">
      <head>
        <script src={basePath + "/runtime-config.js"} />
      </head>
      <body>{children}</body>
    </html>
  );
}
