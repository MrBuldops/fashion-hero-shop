import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS repo. A stray ~/package-lock.json made
  // Next infer the home directory as the root, so Turbopack dev tried to
  // watch all of ~/ (incl. ~/node_modules) and exploded to 49GB RAM.
  turbopack: {
    root: import.meta.dirname,
  },
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
