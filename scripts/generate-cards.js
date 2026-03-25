import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync, mkdirSync } from "fs";
import { join, extname, dirname, resolve, basename } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

// ── Exported helper functions (also used by tests) ────────────────────────────

export function getInferredType(filename) {
  if (/^plane[-_ ]/i.test(filename)) return "Plane";
  if (/^phenomenon[-_ ]/i.test(filename)) return "Phenomenon";
  return null;
}

export function getDisplayName(filename) {
  const withoutExtension = basename(filename).replace(/\.[^.]+$/, "");
  const withoutTypePrefix = withoutExtension.replace(/^(Plane|Phenomenon)[-_ ]+/i, "");
  return withoutTypePrefix.replace(/[_-]+/g, " ").trim();
}

export function getCardSlug(filename) {
  const type = getInferredType(filename);
  if (!type) return null;
  const name = getDisplayName(filename);
  return slugifyName(name);
}

export function slugifyName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\u2014/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function uniqueTags(tags) {
  const seen = new Set();
  return tags
    .filter((tag) => {
      const key = String(tag).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((tag) => String(tag).trim());
}

export function isOfficialCard(tags) {
  return tags.some((tag) => {
    const stripped = tag.startsWith(":top:") ? tag.slice(5) : tag;
    if (stripped.startsWith("badge:")) {
      const parts = stripped.split(":");
      if (parts.length >= 4) {
        const label = parts.slice(3).join(":");
        return label.toLowerCase().includes("official");
      }
    }
    return false;
  });
}

export function getDerivedTypeTag(type) {
  if (type === "Plane") return ":top:badge:tr:green:Plane";
  if (type === "Phenomenon") return ":top:badge:tr:purple:Phenomenon";
  return null;
}

export function mergeCardTags(existingTags, type) {
  const derivedTypeTag = getDerivedTypeTag(type);

  const mergedTags = uniqueTags(Array.isArray(existingTags) ? existingTags : []).filter((tag) => {
    const lower = tag.toLowerCase().trim();
    if (lower === "plane" || lower === "phenomenon") return false;

    const stripped = lower.startsWith(":top:") ? lower.slice(5) : lower;
    if (stripped.startsWith("badge:")) {
      const parts = stripped.split(":");
      if (parts.length >= 4) {
        const label = parts.slice(3).join(":").trim();
        if (label === "plane" || label === "phenomenon") return false;
      }
    }

    return true;
  });

  return derivedTypeTag ? uniqueTags([...mergedTags, derivedTypeTag]) : mergedTags;
}

export function getCanonicalAssetPaths(cardUid, imageExtension = ".png") {
  return {
    image: `cards/images/${cardUid}${imageExtension}`,
    thumb: `cards/thumbs/${cardUid}.webp`,
    transcript: `cards/transcripts/${cardUid}.md`
  };
}

export function getUniqueSlug(baseSlug, seenCounts) {
  const normalizedBase = (baseSlug || "").trim() || "card";
  const count = (seenCounts.get(normalizedBase) || 0) + 1;
  seenCounts.set(normalizedBase, count);
  return count === 1 ? normalizedBase : `${normalizedBase}_${count}`;
}

export function parseCliOptions(argv = []) {
  const options = {
    classification: null,
    type: null,
    setCode: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const [flag, inlineValue] = arg.split("=", 2);
    const hasInlineValue = typeof inlineValue === "string";
    const nextValue = hasInlineValue ? inlineValue : argv[i + 1];

    const consumeNext = () => {
      if (!hasInlineValue) i++;
      return nextValue;
    };

    if (flag === "--official") {
      options.classification = "official";
      continue;
    }

    if (flag === "--custom") {
      options.classification = "custom";
      continue;
    }

    if (flag === "--type" && nextValue) {
      options.type = consumeNext();
      continue;
    }

    if (flag === "--set" && nextValue) {
      options.setCode = consumeNext();
    }
  }

  const normalizedType = String(options.type || "").trim().toLowerCase();
  if (normalizedType === "plane") options.type = "Plane";
  else if (normalizedType === "phenomenon") options.type = "Phenomenon";
  else options.type = null;

  const normalizedClassification = String(options.classification || "").trim().toLowerCase();
  if (normalizedClassification !== "official" && normalizedClassification !== "custom") {
    options.classification = null;
  }

  const normalizedSetCode = String(options.setCode || "").trim();
  options.setCode = normalizedSetCode || null;

  return options;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function readExistingCards(filepath) {
  if (!existsSync(filepath)) return [];

  try {
    const raw = readFileSync(filepath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`Could not parse ${filepath}; starting with empty metadata.`);
    return [];
  }
}

// ── Main script (only runs when executed directly) ────────────────────────────

function normalizeExistingCard(card, slug) {
  const type = typeof card.type === "string" ? card.type : null;
  const mergedTags = mergeCardTags(card.tags, type);
  const official = isOfficialCard(mergedTags);
  const uid = getCardUid(card, official);
  const imageExt = getImageExtension(card.image);
  const canonicalAssets = getCanonicalAssetPaths(uid, imageExt);

  const { id: _legacyId, ...rest } = card;

  return {
    ...rest,
    slug,
    uid,
    image: canonicalAssets.image,
    thumb: canonicalAssets.thumb,
    transcript: canonicalAssets.transcript,
    tags: mergedTags
  };
}

function getCardUid(existingCard, isOfficial) {
  if (typeof existingCard?.uid === "string" && existingCard.uid.trim()) {
    return existingCard.uid.trim();
  }

  if (isOfficial && typeof existingCard?.scryfallId === "string" && existingCard.scryfallId.trim()) {
    return `scryfall_${existingCard.scryfallId.trim()}`;
  }

  return randomUUID();
}

function getImageExtension(imagePath) {
  const ext = typeof imagePath === "string" ? extname(imagePath).toLowerCase() : "";
  return ext || ".png";
}

function tryRenameAsset(root, previousPath, nextPath) {
  if (!previousPath || !nextPath || previousPath === nextPath) return;

  const from = join(root, previousPath);
  const to = join(root, nextPath);
  if (!existsSync(from) || existsSync(to)) return;

  try {
    renameSync(from, to);
    console.log(`Renamed: ${previousPath} -> ${nextPath}`);
  } catch (err) {
    console.warn(`Could not rename ${previousPath} -> ${nextPath}: ${err.message}`);
  }
}

function getSourceBadgeTag(classification) {
  if (classification === "official") return ":top:badge:tr:green:Official";
  if (classification === "custom") return ":top:badge:tr:amber:Custom";
  return null;
}

function getNewImageCandidates(root, existingCards) {
  const imagesDir = join(root, "cards", "images");
  if (!existsSync(imagesDir)) return [];

  const referencedImagePaths = new Set(
    existingCards
      .map((card) => (typeof card?.image === "string" ? card.image.replace(/\\/g, "/") : null))
      .filter(Boolean)
  );

  const files = readdirSync(imagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  return files
    .filter((filename) => SUPPORTED_IMAGE_EXTENSIONS.has(extname(filename).toLowerCase()))
    .map((filename) => ({
      filename,
      relativePath: `cards/images/${filename}`
    }))
    .filter((image) => !referencedImagePaths.has(image.relativePath));
}

function ensurePlaceholderTranscript(root, transcriptPath, cardName) {
  const absolutePath = join(root, transcriptPath);
  if (existsSync(absolutePath)) return;

  mkdirSync(dirname(absolutePath), { recursive: true });
  const content = [
    `# ${cardName}`,
    "",
    "Transcript pending. Placeholder content generated by the card import workflow.",
    ""
  ].join("\n");
  writeFileSync(absolutePath, content, "utf8");
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  const __dirname = dirname(__filename);
  const ROOT = join(__dirname, "..");

  const OUTPUT_FILE = join(ROOT, "cards.json");

  const existingCards = readExistingCards(OUTPUT_FILE);
  const cards = [];
  if (existingCards.length === 0) {
    console.error("cards.json is empty. Add cards with uid metadata before generating.");
    process.exit(1);
  }
  const cliOptions = parseCliOptions(process.argv.slice(2));

  const slugTracker = new Map();

  for (const existing of existingCards) {
    if (!existing || typeof existing !== "object") continue;
    const fallbackName = typeof existing.name === "string" ? existing.name : "";
    const baseSlug = slugifyName(fallbackName) || "card";
    const nextSlug = getUniqueSlug(baseSlug, slugTracker);
    const normalizedCard = normalizeExistingCard(existing, nextSlug);

    tryRenameAsset(ROOT, existing.image, normalizedCard.image);
    tryRenameAsset(ROOT, existing.thumb, normalizedCard.thumb);
    tryRenameAsset(ROOT, existing.transcript, normalizedCard.transcript);

    cards.push(normalizedCard);
  }

  const newImages = getNewImageCandidates(ROOT, cards);
  for (const image of newImages) {
    const inferredType = getInferredType(image.filename);
    const cardType = cliOptions.type || inferredType;
    if (!cardType) {
      console.warn(`Skipping ${image.relativePath}: no inferred type and no --type provided.`);
      continue;
    }

    const cardName = getDisplayName(image.filename) || "Unnamed Card";
    const cardUid = randomUUID();
    const imageExtension = extname(image.filename).toLowerCase() || ".png";
    const canonicalAssets = getCanonicalAssetPaths(cardUid, imageExtension);
    const baseSlug = slugifyName(cardName) || "card";
    const slug = getUniqueSlug(baseSlug, slugTracker);
    const sourceBadge = getSourceBadgeTag(cliOptions.classification);
    const derivedTypeTag = getDerivedTypeTag(cardType);
    const tags = uniqueTags([sourceBadge, cliOptions.setCode, derivedTypeTag]);

    const newCard = {
      uid: cardUid,
      name: cardName,
      type: cardType,
      slug,
      image: canonicalAssets.image,
      thumb: canonicalAssets.thumb,
      transcript: canonicalAssets.transcript,
      tags,
      scryfallId: null
    };

    tryRenameAsset(ROOT, image.relativePath, canonicalAssets.image);
    ensurePlaceholderTranscript(ROOT, canonicalAssets.transcript, cardName);
    cards.push(newCard);
    console.log(`Added card: ${cardName} (${cardUid})`);
  }

  cards.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });

  if (cards.length === 0) {
    if (existingCards.length === 0) {
      console.error("No valid cards found. Refusing to overwrite cards.json.");
      process.exit(1);
    }

    const fallbackSlugTracker = new Map();
    const normalizedCards = existingCards
      .filter((card) => card && typeof card === "object")
      .map((card) => {
        const fallbackName = typeof card.name === "string" ? card.name : "";
        const baseSlug = slugifyName(fallbackName) || "card";
        const nextSlug = getUniqueSlug(baseSlug, fallbackSlugTracker);
        return normalizeExistingCard(card, nextSlug);
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    writeFileSync(OUTPUT_FILE, JSON.stringify(normalizedCards, null, 2) + "\n");
    console.log(`Normalized cards.json tags for ${normalizedCards.length} cards from existing card data.`);
    process.exit(0);
  }

  try {
    writeFileSync(OUTPUT_FILE, JSON.stringify(cards, null, 2) + "\n");
    console.log(`Generated cards.json with ${cards.length} cards.`);
  } catch (err) {
    console.error(`Failed to write cards.json: ${err.message}`);
    process.exit(1);
  }
}
