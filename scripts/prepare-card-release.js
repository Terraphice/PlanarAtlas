#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const STEPS = [
  { label: "Build cards.json + embeds + SEO", cmd: ["npm", "run", "generate"] },
  { label: "Sync per-card JSON", cmd: ["npm", "run", "sync"] },
  { label: "Run generation unit tests", cmd: ["npm", "run", "test:generate"] },
  { label: "Run sync unit tests", cmd: ["npm", "run", "test:sync"] },
  { label: "Run smoke tests", cmd: ["npm", "run", "test"] }
];

for (const step of STEPS) {
  console.log(`\n▶ ${step.label}`);
  const [command, ...args] = step.cmd;
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    console.error(`\n✗ Failed: ${step.label}`);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ Completed: ${step.label}`);
}

console.log("\n✅ Card release workflow completed successfully.");
