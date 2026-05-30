import type { NextConfig } from "next";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Load the monorepo root .env into process.env so NEXT_PUBLIC_* vars are
// available when Next.js inlines them into the client bundle. Shell / CI
// environment variables already set take priority.
const rootEnvPath = join(__dirname, "../../.env");
if (existsSync(rootEnvPath)) {
  for (const line of readFileSync(rootEnvPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
