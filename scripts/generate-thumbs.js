#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = resolve(process.argv[1]) === resolve(__filename);

function detectImageTools() {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return { identify: "magick", convert: "magick", useSubcommands: true };
  } catch {
    // fall through
  }

  try {
    execFileSync("identify", ["-version"], { stdio: "ignore" });
    execFileSync("convert", ["-version"], { stdio: "ignore" });
    return { identify: "identify", convert: "convert", useSubcommands: false };
  } catch {
    return null;
  }
}

function toPosix(path) {
  return String(path).replace(/\\/g, "/");
}

function getReferenceDimensions(tools, thumbsDir) {
  if (!existsSync(thumbsDir)) return null;
  const files = readdirSync(thumbsDir)
    .filter((name) => extname(name).toLowerCase() === ".webp")
    .sort();

  for (const file of files) {
    const target = join(thumbsDir, file);
    try {
      const args = tools.useSubcommands
        ? ["identify", "-format", "%w %h", target]
        : ["-format", "%w %h", target];
      const size = execFileSync(tools.identify, args, { encoding: "utf8" }).trim();
      const [widthRaw, heightRaw] = size.split(/\s+/);
      const width = Number(widthRaw);
      const height = Number(heightRaw);
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        return { width, height };
      }
    } catch {
      // try next file
    }
  }

  return null;
}

function ensureThumb(tools, inputPath, outputPath, width, height) {
  const args = tools.useSubcommands
    ? [inputPath, "-resize", `${width}x${height}`, "-quality", "82", outputPath]
    : [inputPath, "-resize", `${width}x${height}`, "-quality", "82", outputPath];
  execFileSync(tools.convert, args);
}

function generateThumbs() {
  const tools = detectImageTools();
  if (!tools) {
    throw new Error('Missing image tools. Install ImageMagick ("magick" or "identify" + "convert") to run thumbnail generation.');
  }

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

  const reference = getReferenceDimensions(tools, thumbsDir);
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

    ensureThumb(tools, inputPath, outputPath, targetWidth, targetHeight);
    generated++;
    console.log(`Generated thumbnail: cards/thumbs/${uid}.webp`);
  }

  console.log(`Thumbnail sync complete: ${generated} generated, ${skipped} up-to-date, ${missing} skipped.`);
}

if (isDirectRun) {
  try {
    generateThumbs();
  } catch (err) {
    console.error(`Failed to generate thumbnails: ${err.message}`);
    process.exit(1);
  }
}
