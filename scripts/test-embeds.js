import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateEmbedPages } from "./generate-embeds.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let passed = 0;
let failed = 0;

function pass(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failed += 1;
  console.error(`  ✗ ${msg}`);
}

function section(title) {
  console.log(`\n${title}`);
}

section("generateEmbedPages");

const result = generateEmbedPages(ROOT);
if (result.cards > 0) {
  pass(`Generated card pages (${result.cards})`);
} else {
  fail("No card pages generated");
}

if (result.tags > 0) {
  pass(`Generated tag pages (${result.tags})`);
} else {
  fail("No tag pages generated");
}

section("Share page integrity");

const cardHtmlPath = join(ROOT, "share", "card", "akoum", "index.html");
if (!existsSync(cardHtmlPath)) {
  fail("Card share page exists for /share/card/akoum/");
} else {
  const html = readFileSync(cardHtmlPath, "utf8");
  if (html.includes('property="og:title"')) pass("Card page has og:title");
  else fail("Card page missing og:title");

  if (html.includes('name="twitter:card" content="summary_large_image"')) pass("Card page has twitter summary_large_image");
  else fail("Card page missing twitter:card");

  if (html.includes("/?card=akoum")) pass("Card page redirects to query-based card URL");
  else fail("Card page missing query-based card redirect");
}

const tagHtmlPath = join(ROOT, "share", "tag", "official", "index.html");
if (!existsSync(tagHtmlPath)) {
  fail("Tag share page exists for /share/tag/official/");
} else {
  const html = readFileSync(tagHtmlPath, "utf8");
  if (html.includes('property="og:title"')) pass("Tag page has og:title");
  else fail("Tag page missing og:title");

  if (html.includes("/?tag=Official")) pass("Tag page redirects to tag filter URL");
  else fail("Tag page missing tag redirect");
}

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
