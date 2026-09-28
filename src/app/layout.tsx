import "./globals.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import type { ReactNode } from "react";

const reson8WireScript='if(window.location.hostname==="reson8.datanest.life"){window.location.replace("https://reson8.life/");}';

export const metadata = {
  title: "reson8.datanest.life",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const runtimeConfigSource=basePath + "/runtime-config.js";

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html:reson8WireScript}} />
        <script src={runtimeConfigSource} />
      </head>
      <body>{children}</body>
    </html>
  );
}
