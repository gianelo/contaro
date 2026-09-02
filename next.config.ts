import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; there is a stray package-lock.json in the home
  // directory that Turbopack would otherwise try to reason about.
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
