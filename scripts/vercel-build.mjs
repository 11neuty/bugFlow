import { existsSync } from "node:fs";
import { copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function run(command) {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
}

run("npx prisma generate");

if (process.env.DIRECT_URL?.trim()) {
  run("npx prisma migrate deploy");
} else {
  console.warn(
    "[vercel-build] DIRECT_URL is not set. Skipping prisma migrate deploy and assuming the production schema already exists.",
  );
}

run("npx next build");

const routesManifestPath = join(".next", "routes-manifest.json");
const deterministicRoutesManifestPath = join(
  ".next",
  "routes-manifest-deterministic.json",
);

if (
  existsSync(routesManifestPath) &&
  !existsSync(deterministicRoutesManifestPath)
) {
  copyFileSync(routesManifestPath, deterministicRoutesManifestPath);
  console.warn(
    "[vercel-build] Added routes-manifest-deterministic.json as a compatibility fallback for Vercel packaging.",
  );
}
