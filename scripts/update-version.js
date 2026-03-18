#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const versionPath = join(root, 'version.json');

const current = JSON.parse(readFileSync(versionPath, 'utf8'));
const version = process.env.PLANAR_VERSION || current.version || '0.0.0';
const commit = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 8)
  : execSync('git rev-parse --short=8 HEAD', { cwd: root, encoding: 'utf8' }).trim();
const commitTimestamp = process.env.PLANAR_COMMIT_TIMESTAMP
  || execSync('git log -1 --format=%cI', { cwd: root, encoding: 'utf8' }).trim();
const buildTimestamp = process.env.PLANAR_BUILD_TIMESTAMP || new Date().toISOString();

const payload = {
  version,
  buildTimestamp,
  commitTimestamp,
  commit,
};

writeFileSync(versionPath, `${JSON.stringify(payload)}\n`);
console.log(`Updated version.json to ${version} (${commit})`);
