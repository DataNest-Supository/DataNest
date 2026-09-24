import type { NextConfig } from "next";

const pages = process.env.DATANEST_STATIC_EXPORT === "true";
const basePath = pages ? "/DataNest" : "";

const nextConfig: NextConfig = {
  output: pages ? "export" : "standalone",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: pages,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true }
};

export default nextConfig;
