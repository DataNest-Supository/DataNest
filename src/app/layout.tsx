import "./globals.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "DataNest",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const forceHttpsSource=basePath + "/force-https.js";
  const runtimeConfigSource=basePath + "/runtime-config.js";

  return (
    <html lang="en">
      <head>
        <script src={forceHttpsSource} />
        <script src={runtimeConfigSource} />
      </head>
      <body>{children}</body>
    </html>
  );
}
