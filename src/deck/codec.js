// ── deck-codec.js ─────────────────────────────────────────────────────────────
// Pure encoding/decoding utilities for deck and game state seeds.
// These functions have no DOM or module-state dependencies.

/**
 * Compresses a card id for encoding in a seed string.
 * IDs are now name-based slugs with no type prefix, so no compression is needed.
 * @param {string} id - The card id (e.g. "akoum").
 * @returns {string} The id unchanged.
 */
export function compressKey(id) {
  return id;
}

/**
 * Decompresses a card id token from a legacy d1: seed.
 * Legacy seeds used a single-character type prefix (p/n/u) before the name slug.
 * @param {string | null | undefined} compressed - The compressed token (e.g. "pakoum").
 * @returns {string | null} The expanded legacy id (e.g. "plane_akoum"), or null if invalid.
 */
export function decompressKey(compressed) {
  if (!compressed || compressed.length < 2) return null;
  const pre = compressed[0];
  const rest = compressed.slice(1);
  if (pre === "p") return "plane_" + rest;
  if (pre === "n") return "phenomenon_" + rest;
  if (pre === "u") return rest;
  return null;
}

/**
 * Converts a legacy card key to the current name-only id format (e.g. "akoum").
 * Handles three legacy formats:
 *   1. Old Plane_Akoum / Phenomenon_Foo format (d1: seeds after decompressKey expansion)
 *   2. Intermediate plane_akoum / phenomenon_foo format (brief d2: transition period)
 *   3. Current akoum format — returned unchanged.
 * @param {string} oldKey - Legacy format card key.
 * @returns {string} Current name-only card id.
 */
export function remapLegacyKey(oldKey) {
  let name = null;
  if (/^Plane[-_ ]/i.test(oldKey)) {
    name = oldKey.replace(/^Plane[-_ ]+/i, "");
  } else if (/^Phenomenon[-_ ]/i.test(oldKey)) {
    name = oldKey.replace(/^Phenomenon[-_ ]+/i, "");
  } else if (oldKey.startsWith("plane_")) {
    name = oldKey.slice(6);
  } else if (oldKey.startsWith("phenomenon_")) {
    name = oldKey.slice(11);
  }
  if (name !== null) {
    return name
      .toLowerCase()
      .replace(/\u2014/g, "-")
      .replace(/[ _]+/g, "_")
      .replace(/[^a-z0-9_-]/g, "");
  }
  return oldKey;
}

/**
 * Encodes a UTF-8 string to a URL-safe base64 string (no +, /, or = characters).
 * @param {string} str - The string to encode.
 * @returns {string} URL-safe base64 encoded string.
 */
export function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Decodes a URL-safe base64 string back to a UTF-8 string.
 * @param {string} b64 - URL-safe base64 string to decode.
 * @returns {string} The decoded UTF-8 string.
 */
export function fromBase64Url(b64) {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padding));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a deck map to a shareable "d2:" seed string using the new id format.
 * @param {Map<string, number>} map - Map of card id → count.
 * @returns {string} Encoded seed, or empty string if the deck is empty.
 */
export function encodeDeck(map) {
  const entries = [...map.entries()]
    .filter(([, c]) => c > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return "";

  const raw = entries.map(([k, c]) => {
    const ck = compressKey(k);
    return c === 1 ? ck : `${ck}*${c}`;
  }).join(",");

  try {
    return "d2:" + toBase64Url(raw);
  } catch {
    return "";
  }
}

/**
 * Decodes a deck seed string into a deck map.
 * Supports "d2:" (new format) and "d1:" (legacy format, remaps keys automatically).
 * @param {string | null | undefined} seed - The seed string to decode.
 * @param {number} [maxCardCount=9] - Maximum allowed copies per card.
 * @returns {Map<string, number>} Map of card id → count; empty map if invalid.
 */
export function decodeDeck(seed, maxCardCount = 9) {
  const isLegacy = seed?.startsWith("d1:");
  if (!seed?.startsWith("d2:") && !isLegacy) return new Map();
  try {
    const raw = fromBase64Url(seed.slice(3));
    const map = new Map();
    for (const part of raw.split(",")) {
      if (!part) continue;
      const starIdx = part.lastIndexOf("*");
      let ck, count;
      if (starIdx >= 1 && /^\d+$/.test(part.slice(starIdx + 1))) {
        ck = part.slice(0, starIdx);
        count = Math.max(1, Math.min(maxCardCount, parseInt(part.slice(starIdx + 1), 10)));
      } else {
        ck = part;
        count = 1;
      }
      let id;
      if (isLegacy) {
        // d1: seeds used p/n/u prefix compression; expand then remap to current id format
        id = decompressKey(ck);
        if (!id) continue;
        id = remapLegacyKey(id);
      } else {
        // d2: seeds store raw ids; apply remapLegacyKey to handle the intermediate
        // plane_xxx / phenomenon_xxx format from before this refactor
        id = remapLegacyKey(ck);
      }
      map.set(id, count);
    }
    return map;
  } catch {
    return new Map();
  }
}
