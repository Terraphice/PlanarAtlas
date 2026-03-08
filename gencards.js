const fs = require("fs");
const path = require("path");

const IMAGE_FOLDERS = ["complete", "incomplete"];
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const OUTPUT_FILE = "cards.json";

const existingCards = readExistingCards(OUTPUT_FILE);
const existingByKey = new Map(existingCards.map((card) => [getCardKey(card.file), card]));

const cards = [];

for (const folder of IMAGE_FOLDERS) {
  const folderPath = path.join("images", "cards", folder);

  if (!fs.existsSync(folderPath)) {
    continue;
  }

  const files = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of files) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!VALID_EXTENSIONS.has(extension)) continue;

    const key = getCardKey(entry.name);
    const existing = existingByKey.get(key) || {};
    const inferredTypeTag = getInferredTypeTag(entry.name);

    const mergedTags = uniqueTags([
      ...(Array.isArray(existing.tags) ? existing.tags : []),
      ...(inferredTypeTag ? [inferredTypeTag] : [])
    ]);

    cards.push({
      file: entry.name,
      folder,
      tags: mergedTags
    });
  }
}

cards.sort((a, b) => {
  if (a.folder !== b.folder) {
    return a.folder.localeCompare(b.folder);
  }

  return a.file.localeCompare(b.file, undefined, {
    numeric: true,
    sensitivity: "base"
  });
});

if (cards.length === 0) {
  console.error("No valid card images found. Refusing to overwrite cards.json.");
  process.exit(1);
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cards, null, 2) + "\n");
console.log(`Generated ${OUTPUT_FILE} with ${cards.length} cards.`);

function getCardKey(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function getInferredTypeTag(filename) {
  if (/^plane[-_ ]/i.test(filename)) return "plane";
  if (/^phenomenon[-_ ]/i.test(filename)) return "phenomenon";
  return null;
}

function uniqueTags(tags) {
  return [...new Set(
    tags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean)
  )];
}

function readExistingCards(filepath) {
  if (!fs.existsSync(filepath)) return [];

  try {
    const raw = fs.readFileSync(filepath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`Could not parse ${filepath}; starting with empty metadata.`);
    return [];
  }
}