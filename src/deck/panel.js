// ── deck-panel.js ─────────────────────────────────────────────────────────────
// Deck panel UI: open/close/shelve, list rendering, slot management,
// card overlays, auto-import, and deck import/export.

import { escapeHtml, isHiddenCard } from "../gallery/utils.js";
import { encodeDeck, decodeDeck } from "./codec.js";

// ── Module state ──────────────────────────────────────────────────────────────

let deckPanelOpen = false;
let deckPanelShelved = false;

// ── Context (set by initDeckPanel) ───────────────────────────────────────────

let ctx = null;

// ── DOM references ────────────────────────────────────────────────────────────

const deckPanel = document.getElementById("deck-panel");
const deckCardList = document.getElementById("deck-card-list");
const deckTotalEl = document.getElementById("deck-total-count");
const deckPlayBtn = document.getElementById("deck-play-btn");
const deckImportBtn = document.getElementById("deck-import-btn");
const deckExportBtn = document.getElementById("deck-export-btn");
const deckImportMenu = document.getElementById("deck-import-menu");
const deckExportMenu = document.getElementById("deck-export-menu");
const deckLinkBtn = document.getElementById("deck-link-btn");
const deckClearBtn = document.getElementById("deck-clear-btn");
const deckCloseBtn = document.getElementById("deck-close-btn");
const deckButton = document.getElementById("deck-button");
const deckButtonBadge = document.getElementById("deck-button-badge");
const deckAutoimportBtn = document.getElementById("deck-autoimport-btn");
const deckAutoimportMenu = document.getElementById("deck-autoimport-menu");
const deckAutoimportTagList = document.getElementById("deck-autoimport-tag-list");
const deckSlotSelect = document.getElementById("deck-slot-select");
const deckSlotNameInput = document.getElementById("deck-slot-name-input");
const deckPanelLip = document.getElementById("deck-panel-lip");
const modalDeckWrap = document.querySelector(".modal-deck-wrap");
const modalDeckDec = document.getElementById("modal-deck-dec");
const modalDeckInc = document.getElementById("modal-deck-inc");
const modalDeckCount = document.getElementById("modal-deck-count");

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Initialises the deck panel module with shared state accessors and callbacks.
 * Binds all deck panel DOM events.
 * @param {object} context - Shared context from deck.js.
 */
export function initDeckPanel(context) {
  ctx = context;
  if (modalDeckCount) modalDeckCount.max = ctx.MAX_CARD_COUNT;
  bindDeckPanelEvents();
}

// ── Panel open/close/shelve ───────────────────────────────────────────────────

/** Toggles the deck panel open or closed. */
export function toggleDeckPanel() {
  if (deckPanelOpen || deckPanelShelved) closeDeckPanel();
  else openDeckPanel();
}

/** Opens the deck panel. */
export function openDeckPanel() {
  deckPanelOpen = true;
  deckPanelShelved = false;
  deckPanel?.classList.remove("hidden", "shelved");
  deckButton?.classList.add("deck-panel-open");
  const total = ctx.getDeckTotal();
  if (deckButtonBadge) {
    deckButtonBadge.textContent = total > 0 ? String(total) : "";
    deckButtonBadge.classList.toggle("hidden", total === 0);
  }
  renderDeckList();
  ctx.onDeckChange();
  requestAnimationFrame(() => {
    deckPanel?.classList.add("open");
  });
}

/** Closes the deck panel. */
export function closeDeckPanel() {
  deckPanelOpen = false;
  deckPanelShelved = false;
  deckPanel?.classList.remove("open", "shelved");
  deckButton?.classList.remove("deck-panel-open");
  deckAutoimportMenu?.classList.add("hidden");
  deckButtonBadge?.classList.add("hidden");
  ctx.onDeckChange();
  const panel = deckPanel;
  if (panel) {
    const onEnd = () => {
      if (!panel.classList.contains("open") && !panel.classList.contains("shelved")) {
        panel.classList.add("hidden");
      }
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }
}

function shelvePanel() {
  if (!deckPanelOpen) return;
  deckPanelOpen = false;
  deckPanelShelved = true;
  deckPanel?.classList.remove("open");
  deckPanel?.classList.add("shelved");
  ctx.onDeckChange();
}

function unshelvePanel() {
  if (!deckPanelShelved) return;
  deckPanelShelved = false;
  deckPanelOpen = true;
  deckPanel?.classList.remove("shelved");
  renderDeckList();
  requestAnimationFrame(() => {
    deckPanel?.classList.add("open");
  });
  ctx.onDeckChange();
}

/** @returns {boolean} True if the deck panel is open or shelved. */
export function isDeckPanelOpen() {
  return deckPanelOpen || deckPanelShelved;
}

// ── Deck list rendering ───────────────────────────────────────────────────────

/** Re-renders the full sorted deck card list inside the panel. */
export function renderDeckList() {
  if (!deckCardList) return;
  deckCardList.innerHTML = "";

  const deck = ctx.deckCards();
  if (deck.size === 0) {
    deckCardList.innerHTML = `<p class="deck-empty-state">No cards yet. Browse the gallery and use the <strong>+</strong> buttons to add cards.</p>`;
    return;
  }

  const allCards = ctx.getAllCards();
  const sortedEntries = [...deck.entries()]
    .map(([key, count]) => ({ key, count, card: allCards.find((c) => c.uid === key) }))
    .filter((e) => e.card)
    .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName, undefined, { sensitivity: "base" }));

  for (const { key, count, card } of sortedEntries) {
    const item = document.createElement("div");
    item.className = "deck-card-item";
    item.dataset.cardKey = key;

    item.innerHTML = `
      <img class="deck-card-thumb" src="${card.thumbPath}" alt="${escapeHtml(card.displayName)}" loading="lazy" />
      <div class="deck-card-info">
        <span class="deck-card-name">${escapeHtml(card.displayName)}</span>
        <span class="deck-card-type">${escapeHtml(card.type)}</span>
      </div>
      <div class="deck-card-controls">
        <button class="deck-count-btn" data-key="${escapeHtml(key)}" data-action="dec" aria-label="Remove one copy" type="button"${count <= 0 ? " disabled" : ""}>−</button>
        <span class="deck-card-count">${count}</span>
        <button class="deck-count-btn" data-key="${escapeHtml(key)}" data-action="inc" aria-label="Add one copy" type="button"${count >= ctx.MAX_CARD_COUNT ? " disabled" : ""}>+</button>
      </div>
    `;

    for (const btn of item.querySelectorAll(".deck-count-btn")) {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "inc") ctx.addCardToDeck(key);
        else if (action === "dec") ctx.removeCardFromDeck(key);
      });
    }

    deckCardList.appendChild(item);
  }
}

// ── Deck slot management ──────────────────────────────────────────────────────

/**
 * Switches the active deck slot and refreshes the panel.
 * @param {number} slot - The slot index to switch to (0-based).
 */
export function switchDeckSlot(slot) {
  if (slot < 0 || slot >= ctx.NUM_DECK_SLOTS) return;
  if (slot === ctx.getCurrentSlot()) return;
  ctx.setCurrentSlot(slot);
  ctx.saveDecksToStorage();
  renderDeckList();
  renderDeckSlotDropdown();
  updateDeckButton();
  updateAllCardOverlays();
}

/**
 * Re-renders the slot selector dropdown.
 * @param {{ updateNameInput?: boolean }} [options]
 */
export function renderDeckSlotDropdown({ updateNameInput = true } = {}) {
  if (!deckSlotSelect) return;
  deckSlotSelect.innerHTML = "";
  const deckNames = ctx.getDeckNames();
  const currentSlot = ctx.getCurrentSlot();
  const allDecks = ctx.getAllDecks();
  for (let i = 0; i < ctx.NUM_DECK_SLOTS; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    const count = [...allDecks[i].values()].reduce((a, b) => a + b, 0);
    opt.textContent = `${deckNames[i]}${count > 0 ? ` (${count})` : ""}`;
    if (i === currentSlot) opt.selected = true;
    deckSlotSelect.appendChild(opt);
  }
  if (updateNameInput && deckSlotNameInput) {
    deckSlotNameInput.value = deckNames[currentSlot];
  }
}

// ── Deck button ───────────────────────────────────────────────────────────────

/** Updates the deck button badge and aria-label to reflect the current deck size. */
export function updateDeckButton() {
  const total = ctx.getDeckTotal();
  if (deckButtonBadge) {
    deckButtonBadge.textContent = total > 0 ? String(total) : "";
    if (deckPanelOpen || deckPanelShelved) {
      deckButtonBadge.classList.toggle("hidden", total === 0);
    }
  }
  if (deckButton) {
    deckButton.setAttribute("aria-label", total > 0 ? `Deck builder (${total} cards)` : "Deck builder");
  }
  if (deckTotalEl) {
    deckTotalEl.textContent = `${total} ${total === 1 ? "card" : "cards"}`;
  }
}

// ── Card item refresh ─────────────────────────────────────────────────────────

/**
 * Efficiently updates a single card item in the deck panel list without a full re-render.
 * @param {string} cardKey - The card key to refresh.
 */
export function refreshDeckCardItem(cardKey) {
  if (!deckCardList || !deckPanelOpen) return;
  const deck = ctx.deckCards();
  const count = deck.get(cardKey) || 0;
  const existing = deckCardList.querySelector(`[data-card-key="${CSS.escape(cardKey)}"]`);

  if (count === 0 && existing) {
    existing.remove();
    if (deck.size === 0) {
      deckCardList.innerHTML = `<p class="deck-empty-state">No cards yet. Browse the gallery and use the <strong>+</strong> buttons to add cards.</p>`;
    }
    return;
  }

  if (!existing) {
    renderDeckList();
    return;
  }

  const countEl = existing.querySelector(".deck-card-count");
  if (countEl) countEl.textContent = count;
  const decBtn = existing.querySelector("[data-action='dec']");
  if (decBtn) decBtn.disabled = count <= 0;
  const incBtn = existing.querySelector("[data-action='inc']");
  if (incBtn) incBtn.disabled = count >= ctx.MAX_CARD_COUNT;
}

// ── Card overlays ─────────────────────────────────────────────────────────────

function applyOverlayCount(overlay, count) {
  const countEl = overlay.querySelector(".deck-overlay-count");
  if (countEl) countEl.textContent = count > 0 ? count : "";
  overlay.classList.toggle("deck-has-count", count > 0);
  const decBtn = overlay.querySelector(".deck-overlay-dec");
  if (decBtn) decBtn.disabled = count === 0;
}

function applyListRowCount(row, count) {
  const countEl = row.querySelector(".list-deck-count");
  const decBtn = row.querySelector("[data-action='dec']");
  if (countEl) countEl.textContent = count > 0 ? String(count) : "·";
  if (decBtn) decBtn.disabled = count === 0;
}

/**
 * Updates all visible deck overlays and list rows for a single card key.
 * @param {string} cardKey
 */
export function updateCardOverlays(cardKey) {
  const count = ctx.deckCards().get(cardKey) || 0;
  for (const overlay of document.querySelectorAll(`.deck-card-overlay[data-card-key="${CSS.escape(cardKey)}"]`)) {
    applyOverlayCount(overlay, count);
  }
  for (const row of document.querySelectorAll(`.list-card-row[data-card-key="${CSS.escape(cardKey)}"]`)) {
    applyListRowCount(row, count);
  }
}

/** Updates all visible deck overlays and list rows for every card in the gallery. */
export function updateAllCardOverlays() {
  for (const overlay of document.querySelectorAll(".deck-card-overlay")) {
    const key = overlay.dataset.cardKey;
    if (!key) continue;
    const count = ctx.deckCards().get(key) || 0;
    applyOverlayCount(overlay, count);
  }
  for (const row of document.querySelectorAll(".list-card-row[data-card-key]")) {
    const key = row.dataset.cardKey;
    if (!key) continue;
    const count = ctx.deckCards().get(key) || 0;
    applyListRowCount(row, count);
  }
}

// ── Modal deck button ─────────────────────────────────────────────────────────

/**
 * Updates the modal deck quantity control for a given card.
 * @param {string} cardKey
 */
export function updateModalDeckButton(cardKey) {
  if (!modalDeckWrap || modalDeckWrap.dataset.cardKey !== cardKey) return;
  const count = ctx.deckCards().get(cardKey) || 0;
  if (modalDeckCount && modalDeckCount !== document.activeElement) {
    modalDeckCount.value = count;
  }
  if (modalDeckDec) modalDeckDec.disabled = count <= 0;
  if (modalDeckInc) modalDeckInc.disabled = count >= ctx.MAX_CARD_COUNT;
  modalDeckWrap.classList.toggle("deck-in-deck", count > 0);
}

/**
 * Sets the card key tracked by the modal deck control and refreshes its display.
 * @param {string} cardKey
 */
export function setModalCardKey(cardKey) {
  if (!modalDeckWrap) return;
  modalDeckWrap.dataset.cardKey = cardKey;
  updateModalDeckButton(cardKey);
}

// ── Auto-import ───────────────────────────────────────────────────────────────

function buildAutoimportTagList() {
  if (!deckAutoimportTagList) return;
  deckAutoimportTagList.innerHTML = "";
  const allCards = ctx.getAllCards();
  const allTags = [...new Set(allCards.flatMap((c) => c.tags))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  for (const tag of allTags) {
    if (tag.toLowerCase() === "hidden" || tag.startsWith("badge:") || tag.startsWith(":top:badge:")) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-autoimport-tag-item";
    btn.textContent = tag;
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      autoImportCards(`tag:${tag}`);
      deckAutoimportMenu?.classList.add("hidden");
    });
    deckAutoimportTagList.appendChild(btn);
  }
}

/**
 * Auto-imports cards matching a filter into the current deck slot.
 * Named filters: "official", "custom", "planes", "phenomena".
 * Prefixed filter: "tag:<tagName>" imports all cards with that tag (case-insensitive).
 * @param {string} filter - The filter string.
 */
function autoImportCards(filter) {
  const allCards = ctx.getAllCards();
  const deck = ctx.deckCards();

  let candidates;
  switch (filter) {
    case "all":
      candidates = allCards.filter((c) => !isHiddenCard(c.normalizedTags));
      break;
    case "official":
      candidates = allCards.filter((c) => !isHiddenCard(c.normalizedTags) && c.normalizedTags.some((t) => t.includes("official")));
      break;
    case "custom":
      candidates = allCards.filter((c) => !isHiddenCard(c.normalizedTags) && c.normalizedTags.some((t) => t.includes("custom")));
      break;
    case "planes":
      candidates = allCards.filter((c) => c.type === "Plane" && !isHiddenCard(c.normalizedTags));
      break;
    case "phenomena":
      candidates = allCards.filter((c) => c.type === "Phenomenon" && !isHiddenCard(c.normalizedTags));
      break;
    default:
      if (filter.startsWith("tag:")) {
        const tag = filter.slice(4).toLowerCase();
        candidates = allCards.filter((c) => c.normalizedTags.includes(tag) && !isHiddenCard(c.normalizedTags));
      } else {
        candidates = allCards.filter((c) => !isHiddenCard(c.normalizedTags) && c.normalizedTags.includes(filter.toLowerCase()));
      }
  }

  let added = 0;
  for (const card of candidates) {
    if (!deck.has(card.uid)) {
      deck.set(card.uid, 1);
      added++;
    }
  }

  ctx.saveDecksToStorage();
  updateDeckButton();
  renderDeckList();
  updateAllCardOverlays();
  renderDeckSlotDropdown();
  ctx.showToast(added > 0 ? `Added ${added} card${added !== 1 ? "s" : ""} to deck.` : "No new cards to add.");
}

// ── Import / Export ───────────────────────────────────────────────────────────

function getSetCodeFromTags(tags = []) {
  const setCodes = tags.filter((tag) => /^[A-Z]{2,6}$/.test(tag) || tag === "MagicCon");
  const upperOnly = setCodes.filter((tag) => /^[A-Z]+$/.test(tag));
  return upperOnly[0] || setCodes[0] || "";
}

function parseIllustratorFromTranscript(text) {
  const match = text.match(/^Illustrated by:\s*(.+)$/m);
  return match ? match[1].trim() : "";
}

async function getCardArtist(card) {
  if (!card?.transcriptPath) return "";
  try {
    const response = await fetch(card.transcriptPath);
    if (!response.ok) return "";
    const transcript = await response.text();
    return parseIllustratorFromTranscript(transcript.trim());
  } catch {
    return "";
  }
}

function toDeckRows(deckMap) {
  const allCards = ctx.getAllCards();
  return [...deckMap.entries()]
    .map(([uid, count]) => ({ card: allCards.find((entry) => entry.uid === uid), count }))
    .filter((entry) => entry.card && entry.count > 0)
    .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName, undefined, { sensitivity: "base" }));
}

function downloadDeckText(text, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new globalThis.Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatDeckRaw(deckMap) {
  return toDeckRows(deckMap)
    .map(({ card, count }) => {
      const setCode = getSetCodeFromTags(card.tags);
      return `${card.displayName}${setCode ? ` (${setCode})` : ""} ${count}`;
    })
    .join("\n");
}

async function formatDeckCsv(deckMap) {
  const rows = toDeckRows(deckMap);
  const parts = ["name,set_code,artist,count"];
  for (const { card, count } of rows) {
    const setCode = getSetCodeFromTags(card.tags);
    const artist = await getCardArtist(card);
    const escaped = [card.displayName, setCode, artist, String(count)].map((value) => `"${String(value).replace(/"/g, "\"\"")}"`);
    parts.push(escaped.join(","));
  }
  return parts.join("\n");
}

async function formatDeckJson(deckMap) {
  const rows = toDeckRows(deckMap);
  const cards = [];
  for (const { card, count } of rows) {
    cards.push({
      name: card.displayName,
      setCode: getSetCodeFromTags(card.tags),
      artist: await getCardArtist(card),
      count
    });
  }
  return JSON.stringify({ format: "planar-atlas-deck-v1", cards }, null, 2);
}

/** Encodes the current deck to a seed and copies it to the clipboard. */
export function exportDeckSeed() {
  const seed = encodeDeck(ctx.deckCards());
  if (!seed) { ctx.showToast("Deck is empty."); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(seed).then(() => ctx.showToast("Deck seed copied!")).catch(() => prompt("Copy this deck seed:", seed));
  } else {
    prompt("Copy this deck seed:", seed);
  }
}

function parseCsvLines(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const [header, ...rows] = lines;
  const hasHeader = header.toLowerCase().includes("name") && header.toLowerCase().includes("set");
  const body = hasHeader ? rows : [header, ...rows];
  return body.map((line) => {
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "\"" && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else if (ch === "\"") {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

function makeNameIndex() {
  const byName = new Map();
  for (const card of ctx.getAllCards()) {
    const key = card.displayName.trim().toLowerCase();
    const list = byName.get(key) || [];
    list.push(card);
    byName.set(key, list);
  }
  return byName;
}

function parseRawLine(line) {
  const match = line.match(/^(.*\S)\s+(\d+)\s*$/);
  if (!match) return null;
  const namePart = match[1].trim();
  const count = Math.max(1, Math.min(ctx.MAX_CARD_COUNT, parseInt(match[2], 10)));
  const setMatch = namePart.match(/^(.*\S)\s+\(([A-Za-z0-9]+)\)$/);
  if (setMatch) {
    return { name: setMatch[1].trim(), setCode: setMatch[2].trim(), count };
  }
  return { name: namePart, setCode: "", count };
}

function showConflictChoice(name, options, copyIndex, totalCopies) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "deck-conflict-overlay";
    const cardsHtml = options.map((card, index) => `
      <div class="deck-conflict-card">
        <img class="deck-conflict-image" src="${card.thumbPath}" alt="${escapeHtml(card.displayName)}" />
        <div class="deck-conflict-meta">
          <strong>${escapeHtml(card.displayName)}</strong>
          <span>${escapeHtml(card.type)}</span>
          <span>Set: ${escapeHtml(getSetCodeFromTags(card.tags) || "Unknown")}</span>
        </div>
        <button class="neutral-button-base deck-action-btn deck-conflict-select" data-choice="${index}" type="button">Select</button>
      </div>
    `).join("");
    overlay.innerHTML = `
      <div class="deck-conflict-dialog">
        <h3>Resolve duplicate card name</h3>
        <p>${escapeHtml(name)} copy ${copyIndex} of ${totalCopies}</p>
        <div class="deck-conflict-grid">${cardsHtml}</div>
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      const btn = event.target.closest(".deck-conflict-select");
      if (!btn) return;
      const choice = parseInt(btn.dataset.choice, 10);
      overlay.remove();
      resolve(options[choice] || null);
    });
    document.body.appendChild(overlay);
  });
}

async function resolveDeckEntries(entries) {
  const byName = makeNameIndex();
  const resolved = new Map();
  let skipped = 0;
  for (const entry of entries) {
    const options = byName.get(entry.name.toLowerCase()) || [];
    if (!options.length) {
      skipped += entry.count;
      continue;
    }
    if (options.length === 1) {
      const uid = options[0].uid;
      resolved.set(uid, Math.min(ctx.MAX_CARD_COUNT, (resolved.get(uid) || 0) + entry.count));
      continue;
    }
    if (entry.setCode) {
      const bySet = options.find((card) => getSetCodeFromTags(card.tags).toLowerCase() === entry.setCode.toLowerCase());
      if (bySet) {
        const uid = bySet.uid;
        resolved.set(uid, Math.min(ctx.MAX_CARD_COUNT, (resolved.get(uid) || 0) + entry.count));
        continue;
      }
    }
    for (let i = 0; i < entry.count; i++) {
      const selected = await showConflictChoice(entry.name, options, i + 1, entry.count);
      if (!selected) {
        skipped++;
        continue;
      }
      const uid = selected.uid;
      resolved.set(uid, Math.min(ctx.MAX_CARD_COUNT, (resolved.get(uid) || 0) + 1));
    }
  }
  return { map: resolved, skipped };
}

async function parseImportedText(text, formatHint = "auto") {
  const trimmed = text.trim();
  if (!trimmed) return { map: new Map(), skipped: 0 };

  if (formatHint === "b64" || (formatHint === "auto" && trimmed.startsWith("d2:"))) {
    return { map: decodeDeck(trimmed), skipped: 0 };
  }

  if (formatHint === "json" || formatHint === "auto") {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.cards) ? parsed.cards : [];
      if (items.length) {
        const normalized = items
          .map((item) => ({
            name: String(item.name || "").trim(),
            setCode: String(item.setCode || item.set_code || "").trim(),
            count: Math.max(1, Math.min(ctx.MAX_CARD_COUNT, parseInt(item.count ?? 1, 10) || 1))
          }))
          .filter((item) => item.name);
        return resolveDeckEntries(normalized);
      }
    } catch {
      // continue to next parser
    }
  }

  if (formatHint === "csv" || (formatHint === "auto" && trimmed.includes(",") && trimmed.toLowerCase().includes("name"))) {
    const rows = parseCsvLines(trimmed);
    const entries = rows
      .map((cols) => ({
        name: String(cols[0] || "").replace(/^"|"$/g, "").trim(),
        setCode: String(cols[1] || "").replace(/^"|"$/g, "").trim(),
        count: Math.max(1, Math.min(ctx.MAX_CARD_COUNT, parseInt(String(cols[3] || "1").replace(/^"|"$/g, ""), 10) || 1))
      }))
      .filter((item) => item.name);
    return resolveDeckEntries(entries);
  }

  const rawEntries = trimmed
    .split(/\r?\n/)
    .map((line) => parseRawLine(line))
    .filter(Boolean);
  return resolveDeckEntries(rawEntries);
}

async function applyImportedDeckText(text, formatHint = "auto") {
  const decoded = await parseImportedText(text, formatHint);
  if (decoded.map.size === 0) {
    ctx.showToast("Invalid or empty deck import.");
    return;
  }
  const valid = ctx.filterValidDeck(decoded.map);
  const skippedUnknown = decoded.map.size - valid.size;
  const skipped = decoded.skipped + skippedUnknown;
  ctx.setCurrentDeckMap(valid);
  ctx.saveDecksToStorage();
  updateDeckButton();
  renderDeckList();
  updateAllCardOverlays();
  renderDeckSlotDropdown();
  const total = ctx.getDeckTotal();
  if (skipped > 0) {
    ctx.showToast(`Imported ${total} cards (${skipped} unknown card${skipped > 1 ? "s" : ""} skipped).`);
  } else {
    ctx.showToast(`Imported deck: ${total} card${total !== 1 ? "s" : ""}.`);
  }
}

async function importDeckFromClipboard() {
  if (!navigator.clipboard?.readText) {
    ctx.showToast("Clipboard read is not supported in this browser.");
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    await applyImportedDeckText(text, "auto");
  } catch {
    ctx.showToast("Could not read clipboard.");
  }
}

function importDeckFromFile(format) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = format === "json" ? ".json,application/json" : format === "csv" ? ".csv,text/csv" : ".txt,.text,text/plain";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    await applyImportedDeckText(text, format);
  });
  input.click();
}

/** Encodes the current deck as a shareable link and copies it to the clipboard. */
export function shareDeckLink() {
  const seed = encodeDeck(ctx.deckCards());
  if (!seed) { ctx.showToast("Deck is empty."); return; }
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("deck", seed);
  const urlStr = url.toString();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(urlStr).then(() => ctx.showToast("Deck link copied!")).catch(() => prompt("Copy this deck link:", urlStr));
  } else {
    prompt("Copy this deck link:", urlStr);
  }
}

// ── Modal deck input ──────────────────────────────────────────────────────────

function applyModalDeckInput() {
  if (!modalDeckCount || !modalDeckWrap) return;
  const cardKey = modalDeckWrap.dataset.cardKey;
  if (!cardKey) return;
  const raw = parseInt(modalDeckCount.value, 10);
  ctx.setCardDeckCount(cardKey, isNaN(raw) ? 0 : raw);
}

// ── Event binding ─────────────────────────────────────────────────────────────

function bindDeckPanelEvents() {
  deckButton?.addEventListener("click", toggleDeckPanel);
  deckCloseBtn?.addEventListener("click", closeDeckPanel);
  deckPlayBtn?.addEventListener("click", () => ctx.showGameModeDialog());
  deckClearBtn?.addEventListener("click", () => ctx.clearDeck());
  deckExportBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const hidden = deckExportMenu?.classList.contains("hidden");
    deckImportMenu?.classList.add("hidden");
    if (hidden) deckExportMenu?.classList.remove("hidden");
    else deckExportMenu?.classList.add("hidden");
  });
  deckImportBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const hidden = deckImportMenu?.classList.contains("hidden");
    deckExportMenu?.classList.add("hidden");
    if (hidden) deckImportMenu?.classList.remove("hidden");
    else deckImportMenu?.classList.add("hidden");
  });
  deckLinkBtn?.addEventListener("click", shareDeckLink);

  deckSlotSelect?.addEventListener("change", () => {
    const slot = parseInt(deckSlotSelect.value, 10);
    if (!isNaN(slot)) switchDeckSlot(slot);
  });

  deckSlotNameInput?.addEventListener("input", () => {
    const rawValue = deckSlotNameInput.value;
    const deckNames = ctx.getDeckNames();
    deckNames[ctx.getCurrentSlot()] = rawValue.trim() || `Deck ${ctx.getCurrentSlot() + 1}`;
    ctx.setDeckNames(deckNames);
    ctx.saveDeckNamesToStorage();
    const savedValue = rawValue;
    renderDeckSlotDropdown({ updateNameInput: false });
    if (deckSlotNameInput) deckSlotNameInput.value = savedValue;
  });

  deckSlotNameInput?.addEventListener("blur", () => {
    if (deckSlotNameInput && !deckSlotNameInput.value.trim()) {
      const deckNames = ctx.getDeckNames();
      deckNames[ctx.getCurrentSlot()] = `Deck ${ctx.getCurrentSlot() + 1}`;
      ctx.setDeckNames(deckNames);
      ctx.saveDeckNamesToStorage();
      renderDeckSlotDropdown();
    }
  });

  deckPanelLip?.addEventListener("click", () => {
    if (deckPanelShelved) {
      unshelvePanel();
    } else {
      shelvePanel();
    }
  });

  deckAutoimportBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const hidden = deckAutoimportMenu?.classList.contains("hidden");
    if (hidden) {
      buildAutoimportTagList();
      deckAutoimportMenu?.classList.remove("hidden");
    } else {
      deckAutoimportMenu?.classList.add("hidden");
    }
  });

  deckAutoimportMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = event.target.closest(".deck-autoimport-item[data-action]");
    if (!item) return;
    autoImportCards(item.dataset.action);
    deckAutoimportMenu?.classList.add("hidden");
  });

  const tagToggle = deckAutoimportMenu?.querySelector(".deck-autoimport-tag-toggle");
  tagToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    deckAutoimportTagList?.classList.toggle("hidden");
  });

  deckExportMenu?.addEventListener("click", async (event) => {
    event.stopPropagation();
    const item = event.target.closest(".deck-format-item[data-action]");
    if (!item) return;
    const action = item.dataset.action;
    deckExportMenu?.classList.add("hidden");
    const deckMap = ctx.deckCards();
    if (deckMap.size === 0) {
      ctx.showToast("Deck is empty.");
      return;
    }
    if (action === "b64") {
      const seed = encodeDeck(deckMap);
      if (!seed) {
        ctx.showToast("Deck is empty.");
        return;
      }
      downloadDeckText(seed, "deck-export.txt");
      return;
    }
    if (action === "json") {
      downloadDeckText(await formatDeckJson(deckMap), "deck-export.json", "application/json;charset=utf-8");
      return;
    }
    if (action === "csv") {
      downloadDeckText(await formatDeckCsv(deckMap), "deck-export.csv", "text/csv;charset=utf-8");
      return;
    }
    if (action === "raw") {
      downloadDeckText(formatDeckRaw(deckMap), "deck-export.txt");
      return;
    }
    if (action === "clip") {
      exportDeckSeed();
    }
  });

  deckImportMenu?.addEventListener("click", async (event) => {
    event.stopPropagation();
    const item = event.target.closest(".deck-format-item[data-action]");
    if (!item) return;
    const action = item.dataset.action;
    deckImportMenu?.classList.add("hidden");
    if (action === "clip") {
      await importDeckFromClipboard();
      return;
    }
    importDeckFromFile(action);
  });

  document.addEventListener("click", () => {
    deckAutoimportMenu?.classList.add("hidden");
    deckExportMenu?.classList.add("hidden");
    deckImportMenu?.classList.add("hidden");
  });

  modalDeckDec?.addEventListener("click", () => {
    const cardKey = modalDeckWrap?.dataset.cardKey;
    if (cardKey) ctx.removeCardFromDeck(cardKey);
  });

  modalDeckInc?.addEventListener("click", () => {
    const cardKey = modalDeckWrap?.dataset.cardKey;
    if (cardKey) ctx.addCardToDeck(cardKey);
  });

  modalDeckCount?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      applyModalDeckInput();
      modalDeckCount.blur();
    }
  });

  modalDeckCount?.addEventListener("blur", () => {
    applyModalDeckInput();
  });
}
