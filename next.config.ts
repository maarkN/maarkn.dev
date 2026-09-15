import type { NextConfig } from "next";
import path from "node:path";

/** `YYYY.MM` of this build, shown by the terminal's `neofetch` as the "os" version. */
const buildDate = new Date().toISOString().slice(0, 7).replace("-", ".");

const nextConfig: NextConfig = {
  // Self-host build: emit a standalone server bundle for the Docker image.
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  images: {
    remotePatterns: [],
  },
  experimental: {
    // Tree-shake barrel imports from these heavy packages (smaller client JS).
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
};

export default nextConfig;
