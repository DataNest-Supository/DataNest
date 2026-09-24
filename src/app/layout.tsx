import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Resonance DataNest",
  description: "UNIFI + TranScheduler project operating environment"
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
