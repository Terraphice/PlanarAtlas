import {
  getTagLabel,
  getTagToneClass,
  escapeHtml,
  enhanceManaSymbols,
  sortCards
} from "./gallery-utils.js";

import {
  filters,
  displayState,
  paginationState,
  sharedState
} from "./gallery-state.js";

// ── DOM references ────────────────────────────────────────────────────────────

const modal = document.getElementById("card-modal");
const modalImageWrap = document.getElementById("modal-image-wrap");
const modalImage = document.getElementById("modal-image");
const modalName = document.getElementById("modal-card-name");
const modalType = document.getElementById("modal-card-type");
const modalTranscript = document.getElementById("modal-transcript");
const modalSourceLink = document.getElementById("modal-source-link");
const modalScryfallLink = document.getElementById("modal-scryfall-link");
const modalPrevButton = document.getElementById("modal-prev");
const modalNextButton = document.getElementById("modal-next");
const modalTagList = document.getElementById("modal-tag-list");

// ── Module state ──────────────────────────────────────────────────────────────

let modalImageFlipped = false;
let modalCurrentCardImagePath = "";

// ── Cross-module callbacks ────────────────────────────────────────────────────

let _renderGallery = () => {};
let _setModalCardKey = () => {};
let _toggleTagFilter = () => {};
let _showToast = () => {};

export function initModalCallbacks({
  renderGallery,
  setModalCardKey,
  toggleTagFilter,
  showToast
}) {
  if (renderGallery) _renderGallery = renderGallery;
  if (setModalCardKey) _setModalCardKey = setModalCardKey;
  if (toggleTagFilter) _toggleTagFilter = toggleTagFilter;
  if (showToast) _showToast = showToast;
}

// ── Modal navigation ──────────────────────────────────────────────────────────

export function openModalByKey(cardKey, updateHash = true) {
  let index = sharedState.filteredCards.findIndex((card) => card.key === cardKey);

  if (index === -1) {
    const cardInAll = sharedState.allCards.find((card) => card.key === cardKey);
    if (!cardInAll) return;

    if (!sharedState.filteredCards.some((card) => card.key === cardKey)) {
      sharedState.filteredCards = [...sharedState.allCards];
      sortCards(sharedState.filteredCards);
      paginationState.currentPage = 1;
      paginationState.infiniteLoadedCount = paginationState.pageSize;
      _renderGallery();
    }

    index = sharedState.filteredCards.findIndex((card) => card.key === cardKey);
    if (index === -1) return;
  }

  if (paginationState.mode === "paginated") {
    const targetPage = Math.floor(index / paginationState.pageSize) + 1;
    if (targetPage !== paginationState.currentPage) {
      paginationState.currentPage = targetPage;
      _renderGallery();
    }
  } else if (paginationState.mode === "infinite" && index >= paginationState.infiniteLoadedCount) {
    paginationState.infiniteLoadedCount = index + 1;
    _renderGallery();
  }

  sharedState.currentModalIndex = index;
  renderModal(sharedState.filteredCards[sharedState.currentModalIndex], updateHash);
}

export async function renderModal(card, updateHash = true) {
  modalImageFlipped = false;
  modalCurrentCardImagePath = card.imagePath;
  modalImageWrap?.classList.remove("modal-image-flipped");
  modalImage.src = "";
  modalImage.alt = card.displayName;
  modalImage.src = card.imagePath;
  modalName.textContent = card.displayName;
  modalType.textContent = card.type;
  modalSourceLink.href = card.imagePath;

  const scryfallQuery = encodeURIComponent(`"${card.displayName}"`);
  modalScryfallLink.href = `https://scryfall.com/search?q=${scryfallQuery}&utm_source=planar-atlas&utm_medium=referral`;

  _setModalCardKey(card.key);

  modalTagList.innerHTML = "";
  for (const tag of card.tags) {
    modalTagList.appendChild(createModalTagChip(tag));
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  updateModalNavButtons();

  if (updateHash) updateUrlForCard(card);
  preloadAdjacentImages();

  const cached = sharedState.transcriptCache.get(card.key);
  if (typeof cached === "string") {
    renderTranscriptMarkdown(cached || "No transcript available.");
    return;
  }

  modalTranscript.innerHTML = "Loading transcript…";

  try {
    const response = await fetch(card.transcriptPath);
    if (!response.ok) throw new Error("Transcript not found");

    const transcript = await response.text();
    sharedState.transcriptCache.set(card.key, transcript.trim());
    renderTranscriptMarkdown(transcript.trim() || "No transcript available.");
  } catch {
    sharedState.transcriptCache.set(card.key, "");
    renderTranscriptMarkdown("No transcript available.");
  }
}

export function closeModal(updateHash = true) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  modalImage.src = "";
  modalImage.alt = "";
  modalSourceLink.href = "#";
  modalTranscript.innerHTML = "No transcript available.";
  modalTagList.innerHTML = "";
  sharedState.currentModalIndex = -1;

  if (updateHash) clearCardHash();
}

export function showPreviousCard() {
  const { start } = getPageBounds();
  if (sharedState.currentModalIndex <= start) return;
  sharedState.currentModalIndex -= 1;
  renderModal(sharedState.filteredCards[sharedState.currentModalIndex], true);
}

export function showNextCard() {
  const { end } = getPageBounds();
  if (sharedState.currentModalIndex >= end) return;
  sharedState.currentModalIndex += 1;
  renderModal(sharedState.filteredCards[sharedState.currentModalIndex], true);
}

function getPageBounds() {
  if (paginationState.mode === "paginated") {
    const start = (paginationState.currentPage - 1) * paginationState.pageSize;
    const end = Math.min(start + paginationState.pageSize, sharedState.filteredCards.length) - 1;
    return { start, end };
  }
  return { start: 0, end: Math.min(paginationState.infiniteLoadedCount, sharedState.filteredCards.length) - 1 };
}

function updateModalNavButtons() {
  const { start, end } = getPageBounds();
  modalPrevButton.disabled = sharedState.currentModalIndex <= start;
  modalNextButton.disabled = sharedState.currentModalIndex >= end;
}

function preloadAdjacentImages() {
  preloadCardImage(sharedState.filteredCards[sharedState.currentModalIndex - 1]);
  preloadCardImage(sharedState.filteredCards[sharedState.currentModalIndex + 1]);
}

function preloadCardImage(card) {
  if (!card || !card.imagePath) return;
  const img = new Image();
  img.src = card.imagePath;
}

// ── URL management ────────────────────────────────────────────────────────────

function updateUrlForCard(card) {
  const hash = `#card=${encodeURIComponent(card.key)}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;

  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== url) {
    history.pushState(null, "", url);
  }
}

function clearCardHash() {
  if (window.location.hash.startsWith("#card=")) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

export function getCardKeyFromHash() {
  const match = window.location.hash.match(/^#card=(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function tryOpenCardFromHash() {
  const key = getCardKeyFromHash();
  if (!key) return;
  openModalByKey(key, false);
}

export function getCurrentModalCardKey() {
  const hashKey = getCardKeyFromHash();
  if (hashKey) return hashKey;

  if (sharedState.currentModalIndex >= 0 && sharedState.currentModalIndex < sharedState.filteredCards.length) {
    return sharedState.filteredCards[sharedState.currentModalIndex].key;
  }

  return null;
}

// ── Transcript rendering ──────────────────────────────────────────────────────

function renderTranscriptMarkdown(markdownText) {
  const rawHtml = marked.parse(markdownText, { breaks: true });
  const safeHtml = DOMPurify.sanitize(rawHtml);
  modalTranscript.innerHTML = enhanceManaSymbols(safeHtml);
}

// ── Image flip ────────────────────────────────────────────────────────────────

export function flipModalImage() {
  if (!modalImage || !modalImageWrap) return;

  const wasFlipped = modalImageFlipped;
  modalImageFlipped = !wasFlipped;

  modalImageWrap.classList.add("modal-image-spinning");

  setTimeout(() => {
    if (wasFlipped) {
      modalImage.src = modalCurrentCardImagePath;
      modalImage.alt = modalName.textContent;
    } else {
      modalImage.src = "images/assets/card-preview.jpg";
      modalImage.alt = "Card back";
    }
    modalImageWrap.classList.toggle("modal-image-flipped", modalImageFlipped);
  }, 200);

  setTimeout(() => {
    modalImageWrap.classList.remove("modal-image-spinning");
  }, 400);
}

// ── Copy link ─────────────────────────────────────────────────────────────────

export async function copyCurrentCardLink() {
  if (sharedState.currentModalIndex < 0 || sharedState.currentModalIndex >= sharedState.filteredCards.length) return;

  try {
    await navigator.clipboard.writeText(window.location.href);
    _showToast("Link copied.");
  } catch {
    _showToast("Copy failed.");
  }
}

// ── Tag chips in modal ────────────────────────────────────────────────────────

function createModalTagChip(tag) {
  const chip = document.createElement("span");
  chip.className = getTagToneClass(tag, "modal-tag");
  chip.textContent = getTagLabel(tag);
  chip.dataset.tag = tag;
  chip.classList.toggle("active", filters.tags.has(tag));

  chip.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    _toggleTagFilter(tag);
  });

  return chip;
}
