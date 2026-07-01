import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Self-host build: emit a standalone server bundle for the Docker image.
  output: "standalone",
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
