import type { NextConfig } from "next";

const pages = process.env.DATANEST_STATIC_EXPORT === "true";
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const publicOrigin = (process.env.DATANEST_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
const rootDomainExport = pages && publicOrigin === "https://reson8.life";
const basePath = configuredBasePath !== undefined
  ? configuredBasePath
  : pages
    ? rootDomainExport
      ? ""
      : "/DataNest"
    : "";

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
