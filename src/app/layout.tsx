import "./globals.css";
import "./entry.css";
import "./datanest-ai-optimized.css";
import type { ReactNode } from "react";

function resolveRuntimeConfigSource(basePath:string){
  const fallback=basePath + "/runtime-config.js";
  const configured=(process.env.DATANEST_RUNTIME_CONFIG_URL||"").trim();
  if(!configured)return fallback;

  try{
    const url=new URL(configured);
    const host=url.hostname.toLowerCase();
    const trusted=url.protocol==="https:"&&(
      host==="datanest-supository.github.io"||
      host==="reson8.life"||
      host.endsWith(".reson8.life")
    );
    return trusted?url.toString():fallback;
  }catch{
    return fallback;
  }
}

export const metadata = {
  title: "Resonance DataNest",
  description: "Plan projects, collaborate with DataNest AI, and review traceable work in one workspace."
};

export default function RootLayout({children}:{children:ReactNode}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const runtimeConfigSource=resolveRuntimeConfigSource(basePath);

  return (
    <html lang="en">
      <head>
        <script src={runtimeConfigSource} />
      </head>
      <body>{children}</body>
    </html>
  );
}
