import "./globals.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "reson8.datanest.life",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const runtimeConfigSource=basePath + "/runtime-config.js";
  const reson8WireSource=basePath + "/reson8-wire.js";

  return (
    <html lang="en">
      <head>
        <script src={reson8WireSource} />
        <script src={runtimeConfigSource} />
      </head>
      <body>{children}</body>
    </html>
  );
}
