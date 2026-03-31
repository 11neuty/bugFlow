import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcrypt"],
  turbopack: {
    root: workspaceRoot,
  },
  allowedDevOrigins: ["192.168.200.229"],
};

export default nextConfig;