import { execSync } from "node:child_process";

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
