#!/usr/bin/env node

import { strict as assert } from "assert";
import test from "node:test";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { generateEmbedPages } from "./generate-embeds.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

test("generateEmbedPages produces share pages for cards and tags", () => {
  const result = generateEmbedPages(ROOT);
  assert.ok(result.cards > 0);
  assert.ok(result.tags > 0);

  const cards = JSON.parse(readFileSync(join(ROOT, "cards.json"), "utf8"));
  const firstCard = cards[0];
  assert.ok(firstCard?.uid, "cards.json should contain at least one uid");

  const cardPage = join(ROOT, "share", "card", firstCard.uid, "index.html");
  assert.ok(existsSync(cardPage), `missing generated page: ${cardPage}`);

  const html = readFileSync(cardPage, "utf8");
  assert.ok(html.includes('property="og:title"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes(`/?card=${encodeURIComponent(firstCard.uid)}`));
});
