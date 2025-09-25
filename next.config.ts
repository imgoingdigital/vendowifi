import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence root inference warning (multiple lockfiles higher in tree)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
