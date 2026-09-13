import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  allowedDevOrigins: ["pedigree-landscape-jump.ngrok-free.dev"],
};

export default nextConfig;
