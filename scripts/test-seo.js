#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE_ORIGIN = "https://planaratlas.terraphice.dev";

let failures = 0;

function pass(message) {
  console.log(`✓ ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  failures += 1;
}

function assertIncludes(content, snippet, message) {
  if (content.includes(snippet)) pass(message);
  else fail(message);
}

const files = [
  "robots.txt",
  "sitemap.xml",
  ".well-known/security.txt"
];

for (const file of files) {
  if (existsSync(join(ROOT, file))) pass(`${file} exists`);
  else fail(`${file} exists`);
}

const robots = readFileSync(join(ROOT, "robots.txt"), "utf8");
assertIncludes(robots, "User-agent: *", "robots.txt defines a catch-all user-agent");
assertIncludes(robots, "Disallow: /share/", "robots.txt disallows share redirect pages");
assertIncludes(robots, `Sitemap: ${SITE_ORIGIN}/sitemap.xml`, "robots.txt advertises sitemap.xml");

const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
assertIncludes(sitemap, "<urlset", "sitemap.xml contains a urlset root");
assertIncludes(sitemap, `<loc>${SITE_ORIGIN}/</loc>`, "sitemap.xml includes the homepage");
assertIncludes(sitemap, `<loc>${SITE_ORIGIN}/PRIVACY.md</loc>`, "sitemap.xml includes the privacy policy");

const security = readFileSync(join(ROOT, ".well-known/security.txt"), "utf8");
assertIncludes(security, "Contact: mailto:me@terraphice.dev", "security.txt includes the primary contact");
assertIncludes(security, `Canonical: ${SITE_ORIGIN}/.well-known/security.txt`, "security.txt includes a canonical URL");
assertIncludes(security, "Expires:", "security.txt includes an expiration date");

if (failures > 0) {
  process.exit(1);
}
