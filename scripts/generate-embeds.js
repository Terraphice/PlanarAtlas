import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const SITE_ORIGIN = "https://planechase.terraphice.dev";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBadgeTag(tag) {
  if (typeof tag !== "string") return null;
  const stripped = tag.startsWith(":top:") ? tag.slice(5) : tag;
  const parts = stripped.split(":");
  if (parts.length < 4 || parts[0] !== "badge") return null;

  const corner = parts[1];
  const color = parts[2];
  const label = parts.slice(3).join(":").trim();

  if (!["tl", "tr", "bl", "br"].includes(corner)) return null;
  if (!["green", "amber", "blue", "red", "purple", "gray"].includes(color)) return null;
  if (!label) return null;

  return { corner, color, label };
}

function normalizeTagLabel(tag) {
  if (typeof tag !== "string") return "";
  const badge = parseBadgeTag(tag.trim());
  if (badge) return badge.label;
  return tag.trim();
}

function slugifyTag(tag) {
  return normalizeTagLabel(tag)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "tag";
}

function toAbsoluteUrl(pathnameOrPath) {
  const normalizedPath = String(pathnameOrPath).startsWith("/")
    ? pathnameOrPath
    : `/${pathnameOrPath}`;
  return `${SITE_ORIGIN}${encodeURI(normalizedPath)}`;
}

function buildMetaPage({ title, description, imageUrl, canonicalUrl, redirectTarget, robots = "noindex,follow" }) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedImage = escapeHtml(imageUrl);
  const escapedCanonical = escapeHtml(canonicalUrl);
  const escapedRedirect = escapeHtml(redirectTarget);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <link rel="canonical" href="${escapedCanonical}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Planar Atlas">
  <meta property="og:title" content="${escapedTitle}">
  <meta property="og:description" content="${escapedDescription}">
  <meta property="og:url" content="${escapedCanonical}">
  <meta property="og:image" content="${escapedImage}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapedTitle}">
  <meta name="twitter:description" content="${escapedDescription}">
  <meta name="twitter:image" content="${escapedImage}">

  <meta http-equiv="refresh" content="0;url=${escapedRedirect}">
  <script>
    window.location.replace(${JSON.stringify(redirectTarget)});
  </script>
</head>
<body>
  <p>Redirecting… <a href="${escapedRedirect}">Continue</a></p>
</body>
</html>
`;
}

function writePage(rootDir, relativeDir, html) {
  const outDir = join(rootDir, relativeDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

function buildCardDescription(card) {
  const visibleTags = (card.tags || [])
    .map(normalizeTagLabel)
    .filter(Boolean)
    .filter((tag) => tag.toLowerCase() !== "hidden")
    .slice(0, 2);

  const tagSuffix = visibleTags.length ? ` • ${visibleTags.join(" • ")}` : "";
  return `${card.type} card on Planar Atlas${tagSuffix}`;
}

function generateEmbedPages(rootDir) {
  const cardsPath = join(rootDir, "cards.json");
  const cards = JSON.parse(readFileSync(cardsPath, "utf8"));

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("cards.json is empty or invalid.");
  }

  const outRoot = join(rootDir, "share");
  rmSync(outRoot, { recursive: true, force: true });

  const tagMap = new Map();

  for (const card of cards) {
    const cardSlug = card.slug || card.uid;
    const cardTitle = `${card.name} · ${card.type} | Planar Atlas`;
    const cardDescription = buildCardDescription(card);
    const cardImage = toAbsoluteUrl(card.thumb || card.image || "assets/social-preview.jpg");
    const canonicalUrl = `${SITE_ORIGIN}/share/card/${encodeURIComponent(cardSlug)}/`;
    const redirectTarget = `${SITE_ORIGIN}/?card=${encodeURIComponent(cardSlug)}`;

    writePage(rootDir, `share/card/${cardSlug}`, buildMetaPage({
      title: cardTitle,
      description: cardDescription,
      imageUrl: cardImage,
      canonicalUrl,
      redirectTarget
    }));

    for (const rawTag of card.tags || []) {
      const raw = String(rawTag || "").trim();
      if (!raw || raw.toLowerCase() === "hidden") continue;
      const label = normalizeTagLabel(raw);
      if (!label || label.toLowerCase() === "hidden") continue;

      const key = raw.toLowerCase();
      if (!tagMap.has(key)) {
        tagMap.set(key, { rawTag: raw, label, cards: [] });
      }
      tagMap.get(key).cards.push(card);
    }
  }

  const usedSlugs = new Set();
  for (const entry of [...tagMap.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))) {
    const { rawTag, label, cards: cardsForTag } = entry;
    let slug = slugifyTag(label);
    if (usedSlugs.has(slug)) {
      let i = 2;
      while (usedSlugs.has(`${slug}-${i}`)) i += 1;
      slug = `${slug}-${i}`;
    }
    usedSlugs.add(slug);

    const sampleCard = cardsForTag[0];
    const imageUrl = toAbsoluteUrl(sampleCard?.thumb || sampleCard?.image || "assets/social-preview.jpg");
    const title = `${label} cards | Planar Atlas`;
    const description = `${cardsForTag.length} card${cardsForTag.length === 1 ? "" : "s"} tagged “${label}” on Planar Atlas.`;
    const canonicalUrl = `${SITE_ORIGIN}/share/tag/${slug}/`;
    const redirectTarget = `${SITE_ORIGIN}/?tags=${encodeURIComponent(rawTag)}`;

    writePage(rootDir, `share/tag/${slug}`, buildMetaPage({
      title,
      description,
      imageUrl,
      canonicalUrl,
      redirectTarget
    }));
  }

  const landingHtml = buildMetaPage({
    title: "Planar Atlas share links",
    description: "Shareable social preview endpoints for cards and tags.",
    imageUrl: toAbsoluteUrl("assets/social-preview.jpg"),
    canonicalUrl: `${SITE_ORIGIN}/share/`,
    redirectTarget: `${SITE_ORIGIN}/`
  });

  writePage(rootDir, "share", landingHtml);

  return { cards: cards.length, tags: tagMap.size };
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  const __dirname = dirname(__filename);
  const ROOT = join(__dirname, "..");
  const result = generateEmbedPages(ROOT);
  console.log(`Generated embed pages for ${result.cards} cards and ${result.tags} tags.`);
}

export {
  normalizeTagLabel,
  slugifyTag,
  generateEmbedPages
};
