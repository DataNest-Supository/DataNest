import "./globals.css";
import "./entry.css";
import type { ReactNode } from "react";

export const metadata = {
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
