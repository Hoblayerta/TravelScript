import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude porto from webpack bundling (optional dependency with viem katana compatibility issues)
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      porto: false,
      pino: false,
      'thread-stream': false,
    };

    // Externalize problematic modules on client side
    if (!isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('porto', 'pino', 'thread-stream');
      }
    }

    return config;
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      // Use empty module for porto to avoid katana export error from viem
      porto: path.resolve(__dirname, 'node_modules/next/dist/build/webpack/empty.js'),
      // Use empty modules for problematic pino/thread-stream packages
      pino: path.resolve(__dirname, 'node_modules/next/dist/build/webpack/empty.js'),
      'thread-stream': path.resolve(__dirname, 'node_modules/next/dist/build/webpack/empty.js'),
    },
  },
};

export default nextConfig;
