#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = resolve(process.argv[1]) === resolve(__filename);

function toPosix(path) {
  return String(path).replace(/\\/g, "/");
}

async function getSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    throw new Error('Missing dependency "sharp". Install it with: npm install --save-dev sharp');
  }
}

async function getReferenceDimensions(sharp, thumbsDir) {
  if (!existsSync(thumbsDir)) return null;
  const files = readdirSync(thumbsDir)
    .filter((name) => extname(name).toLowerCase() === ".webp")
    .sort();

  for (const file of files) {
    try {
      const metadata = await sharp(join(thumbsDir, file)).metadata();
      if (metadata.width && metadata.height) {
        return { width: metadata.width, height: metadata.height };
      }
    } catch {
      // try next file
    }
  }

  return null;
}

async function ensureThumb(sharp, inputPath, outputPath, width, height) {
  await sharp(inputPath)
    .resize(width, height, { fit: "inside" })
    .webp({ quality: 82 })
    .toFile(outputPath);
}

async function generateThumbs() {
  const sharp = await getSharp();
  const __dirname = dirname(__filename);
  const root = join(__dirname, "..");
  const cardsJsonPath = join(root, "cards.json");
  const thumbsDir = join(root, "cards", "thumbs");

  if (!existsSync(cardsJsonPath)) {
    throw new Error("cards.json not found");
  }

  if (!existsSync(thumbsDir)) {
    mkdirSync(thumbsDir, { recursive: true });
  }

  const raw = readFileSync(cardsJsonPath, "utf8");
  const cards = JSON.parse(raw);
  if (!Array.isArray(cards)) {
    throw new Error("cards.json must contain an array");
  }

  const reference = await getReferenceDimensions(sharp, thumbsDir);
  const targetWidth = reference?.width ?? 336;
  const targetHeight = reference?.height ?? 468;

  let generated = 0;
  let skipped = 0;
  let missing = 0;

  for (const card of cards) {
    const uid = typeof card?.uid === "string" ? card.uid.trim() : "";
    const imagePath = typeof card?.image === "string" ? card.image.trim() : "";

    if (!uid || !imagePath) {
      console.warn(`Skipping card with missing uid/image: ${JSON.stringify(card)}`);
      missing++;
      continue;
    }

    const inputPath = join(root, imagePath);
    const outputPath = join(thumbsDir, `${uid}.webp`);

    if (!existsSync(inputPath)) {
      console.warn(`Missing source image for ${uid}: ${toPosix(imagePath)}`);
      missing++;
      continue;
    }

    if (existsSync(outputPath)) {
      const srcStat = statSync(inputPath);
      const outStat = statSync(outputPath);
      if (outStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    await ensureThumb(sharp, inputPath, outputPath, targetWidth, targetHeight);
    generated++;
    console.log(`Generated thumbnail: cards/thumbs/${uid}.webp`);
  }

  console.log(`Thumbnail sync complete: ${generated} generated, ${skipped} up-to-date, ${missing} skipped.`);
}

if (isDirectRun) {
  generateThumbs().catch((err) => {
    console.error(`Failed to generate thumbnails: ${err.message}`);
    process.exit(1);
  });
}
