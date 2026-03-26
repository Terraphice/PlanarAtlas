#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { parseReleaseOptions, releaseOptionsToArgs } from "./lib/cli-options.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function runStep(step) {
  const result = spawnSync(step.command, step.args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`Failed: ${step.label}`);
  }
}

const options = parseReleaseOptions(process.argv.slice(2));
const forwardedArgs = releaseOptionsToArgs(options);

const steps = [
  {
    label: "Generate cards + thumbs + share pages + SEO files",
    command: "node",
    args: ["scripts/generate-all.js", ...forwardedArgs]
  },
  {
    label: "Sync per-card JSON",
    command: "node",
    args: ["scripts/sync-cards.js"]
  },
  {
    label: "Run unit tests",
    command: "npm",
    args: ["run", "test:unit"]
  },
  {
    label: "Run smoke tests",
    command: "npm",
    args: ["run", "test"]
  }
];

for (const step of steps) {
  console.log(`\n▶ ${step.label}`);
  try {
    runStep(step);
    console.log(`✓ Completed: ${step.label}`);
  } catch (error) {
    console.error(`\n✗ ${error.message}`);
    process.exit(1);
  }
}

console.log("\n✅ Card release workflow completed successfully.");
