#!/usr/bin/env node
// scripts/test-generate.js
// Unit tests for generate-cards.js helper functions.
// Run with: node scripts/test-generate.js

import {
  getInferredType,
  getDisplayName,
  getCardSlug,
  slugifyName,
  uniqueTags,
  isOfficialCard,
  getDerivedTypeTag,
  mergeCardTags,
  getCanonicalAssetPaths,
  getUniqueSlug,
  parseCliOptions
} from "./generate-cards.js";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function section(name) {
  console.log(`\n${name}`);
}

// ── getInferredType ───────────────────────────────────────────────────────────

section("getInferredType");
assert(getInferredType("Plane_Akoum.png") === "Plane", "Plane_ prefix → 'Plane'");
assert(getInferredType("Phenomenon_Tunnel.jpg") === "Phenomenon", "Phenomenon_ prefix → 'Phenomenon'");
assert(getInferredType("plane_lowercase.png") === "Plane", "Case-insensitive plane prefix");
assert(getInferredType("Plane-Hyphenated.png") === "Plane", "Plane with hyphen separator");
assert(getInferredType("Plane Spaced.png") === "Plane", "Plane with space separator");
assert(getInferredType("CustomCard.png") === null, "No type prefix → null");
assert(getInferredType("Planetary.png") === null, "Partial prefix 'Planetary' → null (no separator)");
assert(getInferredType("") === null, "Empty string → null");

// ── getDisplayName ────────────────────────────────────────────────────────────

section("getDisplayName");
assert(getDisplayName("Plane_Akoum.png") === "Akoum", "Strips 'Plane_' prefix and .png");
assert(getDisplayName("Phenomenon_Interplanar_Tunnel.jpg") === "Interplanar Tunnel", "Strips Phenomenon_ and converts underscores");
assert(getDisplayName("Plane_The_Library_of_Leng.png") === "The Library of Leng", "Multi-word names");
assert(getDisplayName("Phenomenon_Atlas Consultation.png") === "Atlas Consultation", "Space-separated name");
assert(getDisplayName("Example Plane.jpg") === "Example Plane", "Non-prefixed filenames keep human-readable name");

// ── canonical asset paths ────────────────────────────────────────────────────

section("getCanonicalAssetPaths");
assert(
  deepEqual(getCanonicalAssetPaths("69127fa3-878a-44c3-a42e-5901b58a010e", ".jpg"), {
    image: "cards/images/69127fa3-878a-44c3-a42e-5901b58a010e.jpg",
    thumb: "cards/thumbs/69127fa3-878a-44c3-a42e-5901b58a010e.webp",
    transcript: "cards/transcripts/69127fa3-878a-44c3-a42e-5901b58a010e.md"
  }),
  "Canonical paths are uid-based"
);

// ── getUniqueSlug ─────────────────────────────────────────────────────────────

section("getUniqueSlug");
const slugTracker = new Map();
assert(getUniqueSlug("academy_at_tolaria_west", slugTracker) === "academy_at_tolaria_west", "First slug is unchanged");
assert(getUniqueSlug("academy_at_tolaria_west", slugTracker) === "academy_at_tolaria_west_2", "Second duplicate gets _2 suffix");
assert(getUniqueSlug("academy_at_tolaria_west", slugTracker) === "academy_at_tolaria_west_3", "Third duplicate gets _3 suffix");

// ── parseCliOptions ───────────────────────────────────────────────────────────

section("parseCliOptions");
assert(
  deepEqual(parseCliOptions(["--official", "--type", "plane", "--set", "OPCA"]), {
    classification: "official",
    type: "Plane",
    setCode: "OPCA"
  }),
  "Parses separate argument forms"
);
assert(
  deepEqual(parseCliOptions(["--custom", "--type=phenomenon", "--set=PBT"]), {
    classification: "custom",
    type: "Phenomenon",
    setCode: "PBT"
  }),
  "Parses equals-sign argument forms"
);

// ── slugifyName / getCardSlug ────────────────────────────────────────────────

section("slugifyName / getCardSlug");
assert(slugifyName("Akoum") === "akoum", "slugifyName lowercases simple names");
assert(slugifyName("Atlas Consultation") === "atlas_consultation", "slugifyName converts spaces to underscores");
assert(getCardSlug("Plane_Akoum.png") === "akoum", "Plane_Akoum → akoum");
assert(getCardSlug("Phenomenon_Atlas Consultation.png") === "atlas_consultation", "Spaces → underscores");
assert(getCardSlug("Phenomenon_Interplanar_Tunnel.jpg") === "interplanar_tunnel", "Underscores normalized");
assert(getCardSlug("CustomCard.png") === null, "No type prefix → null");

// ── uniqueTags ────────────────────────────────────────────────────────────────

section("uniqueTags");
assert(deepEqual(uniqueTags(["Zendikar", "OPCA"]), ["Zendikar", "OPCA"]), "Unique tags unchanged");
assert(deepEqual(uniqueTags(["Zendikar", "zendikar"]), ["Zendikar"]), "Case-insensitive dedup keeps first");
assert(deepEqual(uniqueTags(["Zendikar", "Zendikar"]), ["Zendikar"]), "Exact duplicate removed");
assert(deepEqual(uniqueTags([]), []), "Empty array returns empty");
assert(deepEqual(uniqueTags(["  Zendikar  ", "OPCA"]), ["Zendikar", "OPCA"]), "Trims whitespace");
assert(deepEqual(uniqueTags(["", "  ", "Zendikar"]), ["Zendikar"]), "Filters empty/whitespace-only tags");
assert(deepEqual(uniqueTags(["Zendikar", "OPCA", "zendikar", "opca"]), ["Zendikar", "OPCA"]), "Multiple duplicates removed");

// ── getDerivedTypeTag ───────────────────────────────────────────────────────

section("getDerivedTypeTag");
assert(getDerivedTypeTag("Plane") === ":top:badge:tr:green:Plane", "Plane type gets green Plane badge");
assert(getDerivedTypeTag("Phenomenon") === ":top:badge:tr:purple:Phenomenon", "Phenomenon type gets purple Phenomenon badge");
assert(getDerivedTypeTag("Scheme") === null, "Unknown type gets no derived badge");

// ── mergeCardTags ────────────────────────────────────────────────────────────

section("mergeCardTags");
assert(
  deepEqual(mergeCardTags([":top:badge:tr:amber:Custom", "PBT"], "Phenomenon"), [":top:badge:tr:amber:Custom", "PBT", ":top:badge:tr:purple:Phenomenon"]),
  "Phenomenon badge is appended alongside existing tags"
);
assert(
  deepEqual(mergeCardTags(["Plane", ":top:badge:tr:green:Plane", "Zendikar"], "Plane"), ["Zendikar", ":top:badge:tr:green:Plane"]),
  "Legacy plain and badge type tags collapse to one canonical Plane badge"
);

// ── isOfficialCard ────────────────────────────────────────────────────────────

section("isOfficialCard");
assert(isOfficialCard([":top:badge:tr:green:Official"]) === true, "Top badge with Official label → true");
assert(isOfficialCard(["badge:tr:green:Official"]) === true, "Badge with Official label → true");
assert(isOfficialCard([":top:badge:tr:amber:Custom"]) === false, "Custom badge → false");
assert(isOfficialCard(["Zendikar"]) === false, "No badge → false");
assert(isOfficialCard([]) === false, "Empty tags → false");

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
