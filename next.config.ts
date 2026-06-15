import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. A stray package-lock.json in a
  // parent directory (e.g. /var/www on the VPS) otherwise makes Next infer the
  // wrong project root and emit a build warning.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
