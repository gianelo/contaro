import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; there is a stray package-lock.json in the home
  // directory that Turbopack would otherwise try to reason about.
  turbopack: { root: path.resolve(import.meta.dirname) },
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/espacios/*/informe": [
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff",
      "./src/reports/fonts/*.otf",
    ],
  },
};

export default nextConfig;
