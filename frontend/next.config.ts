import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@verichain/shared", "@verichain/hedera"],
  turbopack: {
    root: path.resolve(frontendDir, ".."),
  },
  allowedDevOrigins: ["pedigree-landscape-jump.ngrok-free.dev"],
};

export default nextConfig;
