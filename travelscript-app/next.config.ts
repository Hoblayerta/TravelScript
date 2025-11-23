import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "thread-stream", "pino-pretty"],
  turbopack: {},
};

export default nextConfig;
