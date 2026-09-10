import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@verichain/shared", "@verichain/hedera"],
  turbopack: {
    root: path.resolve(frontendDir, ".."),
    resolveAlias: {
      // Relative to turbopack.root (repo root). Absolute aliases break Turbopack.
      "@verichain/shared/abi/VeriChainRegistry.json":
        "./packages/shared/abi/VeriChainRegistry.json",
    },
  },
  allowedDevOrigins: ["pedigree-landscape-jump.ngrok-free.dev"],
};

export default nextConfig;
