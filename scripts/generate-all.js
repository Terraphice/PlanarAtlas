#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { parseReleaseOptions, releaseOptionsToArgs } from "./lib/cli-options.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function runScript(script, args = []) {
  const result = spawnSync("node", [script, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${script} failed`);
  }
}

const options = parseReleaseOptions(process.argv.slice(2));
const forwardedArgs = releaseOptionsToArgs(options);

const scripts = [
  ["scripts/generate-cards.js", forwardedArgs],
  ["scripts/generate-thumbs.js", []],
  ["scripts/generate-embeds.js", []],
  ["scripts/generate-seo.js", []]
];

for (const [script, args] of scripts) {
  runScript(script, args);
}
