import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const SITE_ORIGIN = "https://planaratlas.terraphice.dev";
const SECURITY_CONTACT = "mailto:me@terraphice.dev";
const SECURITY_POLICY = `${SITE_ORIGIN}/PRIVACY.md`;
const SECURITY_CANONICAL = `${SITE_ORIGIN}/.well-known/security.txt`;
const ACKNOWLEDGMENTS = "https://github.com/Terraphice/PlanarAtlas";
const EXCLUDED_PATH_PREFIXES = ["/share/", "/cards/", "/transcripts/", "/scripts/"];

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildRobotsTxt() {
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...EXCLUDED_PATH_PREFIXES.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`
  ];
  return `${lines.join("\n")}\n`;
}

function buildSitemapXml(lastModifiedIso) {
  const urls = [
    {
      loc: `${SITE_ORIGIN}/`,
      lastmod: lastModifiedIso,
      changefreq: "weekly",
      priority: "1.0"
    },
    {
      loc: `${SITE_ORIGIN}/PRIVACY.md`,
      lastmod: lastModifiedIso,
      changefreq: "yearly",
      priority: "0.3"
    }
  ];

  const body = urls.map((entry) => `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildSecurityTxt(nowIso) {
  const expires = new Date(new Date(nowIso).getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString();
  return [
    `Contact: ${SECURITY_CONTACT}`,
    `Contact: ${ACKNOWLEDGMENTS}/issues`,
    `Policy: ${SECURITY_POLICY}`,
    `Canonical: ${SECURITY_CANONICAL}`,
    `Acknowledgments: ${ACKNOWLEDGMENTS}`,
    `Preferred-Languages: en`,
    `Expires: ${expires}`
  ].join("\n") + "\n";
}

function generateSeoFiles(rootDir) {
  const version = JSON.parse(readFileSync(join(rootDir, "version.json"), "utf8"));
  const lastModifiedIso = toIsoDate(version.buildTimestamp || version.commitTimestamp || Date.now());

  writeFileSync(join(rootDir, "robots.txt"), buildRobotsTxt());
  writeFileSync(join(rootDir, "sitemap.xml"), buildSitemapXml(lastModifiedIso));

  const wellKnownDir = join(rootDir, ".well-known");
  mkdirSync(wellKnownDir, { recursive: true });
  writeFileSync(join(wellKnownDir, "security.txt"), buildSecurityTxt(lastModifiedIso));

  return { lastModifiedIso };
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  const rootDir = join(dirname(__filename), "..");
  const result = generateSeoFiles(rootDir);
  console.log(`Generated SEO files with lastmod ${result.lastModifiedIso}.`);
}

export { generateSeoFiles, buildRobotsTxt, buildSitemapXml, buildSecurityTxt };
