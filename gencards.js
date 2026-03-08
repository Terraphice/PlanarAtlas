const fs = require("fs");
const path = require("path");

const IMAGE_FOLDERS = ["complete", "incomplete"];
const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const cards = [];
const existingCardData = readExistingCardData("cardData.json");
const nextCardData = {};

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
    const inferredTypeTag = getInferredTypeTag(entry.name);
    const existing = existingCardData[key] || {};
    const existingTags = Array.isArray(existing.tags) ? existing.tags : [];

    cards.push({
      file: entry.name,
      folder
    });

    const mergedTags = uniqueTags([
      ...existingTags,
      ...(inferredTypeTag ? [inferredTypeTag] : [])
    ]);

    nextCardData[key] = {
      ...existing,
      tags: mergedTags
    };
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

const sortedCardData = Object.fromEntries(
  Object.entries(nextCardData).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  )
);

if (cards.length === 0) {
  console.error("No valid card images found. Refusing to overwrite cards.json/cardData.json.");
  process.exit(1);
}

fs.writeFileSync("cards.json", JSON.stringify(cards, null, 2) + "\n");
fs.writeFileSync("cardData.json", JSON.stringify(sortedCardData, null, 2) + "\n");

console.log(`Generated cards.json with ${cards.length} cards.`);
console.log(`Generated cardData.json with ${Object.keys(sortedCardData).length} entries.`);

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

function readExistingCardData(filepath) {
  if (!fs.existsSync(filepath)) return {};

  try {
    const raw = fs.readFileSync(filepath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn(`Could not parse ${filepath}; starting with empty metadata.`);
    return {};
  }
}