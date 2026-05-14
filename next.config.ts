import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION ?? pkg.version,
    NEXT_PUBLIC_APP_SHA: process.env.APP_SHA ?? "",
  },
};

export default nextConfig;
