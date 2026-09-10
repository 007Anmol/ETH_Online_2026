#!/usr/bin/env node
/**
 * One-command env setup for any laptop.
 * Pins Node 20+, installs all workspace packages into a single node_modules.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 20 || (major === 20 && minor < 9)) {
  console.error(
    `VeriChain needs Node.js >= 20.9.0. This machine has ${process.version}.`,
  );
  console.error("");
  console.error("If you use nvm (recommended):");
  console.error("  nvm install");
  console.error("  nvm use");
  console.error("");
  console.error("Then run:  npm run setup");
  process.exit(1);
}

console.log(`Node ${process.version}`);
console.log("Installing frontend + @verichain/shared + @verichain/hedera...");
execSync("npm install", { cwd: root, stdio: "inherit" });

const envExample = join(root, "frontend/.env.example");
const envLocal = join(root, "frontend/.env.local");
if (existsSync(envExample) && !existsSync(envLocal)) {
  copyFileSync(envExample, envLocal);
  console.log("Created frontend/.env.local from .env.example — add secrets before running.");
} else {
  console.log("frontend/.env.local already exists.");
}

console.log("");
console.log("Ready. From the repo root:");
console.log("  npm run dev");
