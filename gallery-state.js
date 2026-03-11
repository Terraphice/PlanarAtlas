import {
  loadPreferences,
  savePreferences,
  reconcileSelectedTags,
  readUrlState,
  writeUrlState,
  matchesFilters,
  parseSearchQuery,
  getTagLabel,
  getTagToneClass,
  isTopTag,
  parseBadgeTag,
  sortCards
} from "./gallery-utils.js";

export const STORAGE_KEY = "planechaseGalleryPreferences.v2";

export const preferences = loadPreferences(STORAGE_KEY);

export const filters = {
  search: "",
  tags: new Set(),
  fuzzy: preferences.fuzzySearch,
  inlineAutocomplete: preferences.inlineAutocomplete,
  showHidden: preferences.showHidden,
  phenomenonAnimation: preferences.phenomenonAnimation,
  riskyHellriding: preferences.riskyHellriding
};

export const displayState = {
  viewMode: preferences.viewMode,
  groupBy: preferences.groupBy,
  groupTag: preferences.groupTag
};

export const paginationState = {
  currentPage: 1,
  pageSize: preferences.pageSize,
  mode: preferences.paginationMode,
  infiniteLoadedCount: preferences.pageSize
};

// Shared mutable state — all modules reference properties of this object
export const sharedState = {
  allCards: [],
  filteredCards: [],
  currentModalIndex: -1,
  transcriptCache: new Map()
};

// ── DOM references ────────────────────────────────────────────────────────────

const topSearch = document.getElementById("top-search");
const sidebarSearch = document.getElementById("sidebar-search");
const topSearchGhost = document.getElementById("top-search-ghost");
const sidebarSearchGhost = document.getElementById("sidebar-search-ghost");
const viewModeSelect = document.getElementById("view-mode-select");
const groupBySelect = document.getElementById("group-by-select");
const groupTagPickerWrap = document.getElementById("group-tag-picker-wrap");
const groupTagSelect = document.getElementById("group-tag-select");
const tagFilterList = document.getElementById("tag-filter-list");
const modal = document.getElementById("card-modal");

// ── Cross-module callbacks ────────────────────────────────────────────────────

let _renderGallery = () => {};
let _renderSearchSuggestions = () => {};
let _updateInlineAutocomplete = () => {};
let _renderActiveFilters = () => {};
let _renderModal = async () => {};
let _closeModal = () => {};
let _getCurrentModalCardKey = () => null;
let _hideAllSearchSuggestions = () => {};

export function initStateCallbacks({
  renderGallery,
  renderSearchSuggestions,
  updateInlineAutocomplete,
  renderActiveFilters,
  renderModal,
  closeModal,
  getCurrentModalCardKey,
  hideAllSearchSuggestions
}) {
  if (renderGallery) _renderGallery = renderGallery;
  if (renderSearchSuggestions) _renderSearchSuggestions = renderSearchSuggestions;
  if (updateInlineAutocomplete) _updateInlineAutocomplete = updateInlineAutocomplete;
  if (renderActiveFilters) _renderActiveFilters = renderActiveFilters;
  if (renderModal) _renderModal = renderModal;
  if (closeModal) _closeModal = closeModal;
  if (getCurrentModalCardKey) _getCurrentModalCardKey = getCurrentModalCardKey;
  if (hideAllSearchSuggestions) _hideAllSearchSuggestions = hideAllSearchSuggestions;
}

// ── State management ──────────────────────────────────────────────────────────

export function applyFilters({ updateUrl = true, preservePage = false } = {}) {
  const parsedQuery = parseSearchQuery(filters.search);

  sharedState.filteredCards = sharedState.allCards.filter(
    (card) => matchesFilters(card, parsedQuery, filters, sharedState.transcriptCache)
  );
  sortCards(sharedState.filteredCards);

  if (!preservePage) {
    paginationState.currentPage = 1;
    paginationState.infiniteLoadedCount = paginationState.pageSize;
  } else {
    const totalPages = Math.max(1, Math.ceil(sharedState.filteredCards.length / paginationState.pageSize));
    paginationState.currentPage = Math.min(paginationState.currentPage, totalPages);
    paginationState.infiniteLoadedCount = paginationState.pageSize;
  }

  _renderActiveFilters(parsedQuery);
  _renderGallery();
  _renderSearchSuggestions();
  _updateInlineAutocomplete();

  if (updateUrl) updateUrlFromState();
}

export function applyStoredPreferencesToUI() {
  viewModeSelect.value = displayState.viewMode;
  groupBySelect.value = displayState.groupBy;

  const fuzzySearchToggle = document.getElementById("fuzzy-search-toggle");
  const showHiddenToggle = document.getElementById("show-hidden-toggle");
  const inlineAutocompleteToggle = document.getElementById("inline-autocomplete-toggle");
  const phenomenonAnimationToggle = document.getElementById("phenomenon-animation-toggle");
  const riskyHellridingToggle = document.getElementById("risky-hellriding-toggle");

  if (fuzzySearchToggle) fuzzySearchToggle.checked = filters.fuzzy;
  if (showHiddenToggle) showHiddenToggle.checked = filters.showHidden;
  if (inlineAutocompleteToggle) inlineAutocompleteToggle.checked = filters.inlineAutocomplete;
  if (phenomenonAnimationToggle) phenomenonAnimationToggle.checked = filters.phenomenonAnimation;
  if (riskyHellridingToggle) riskyHellridingToggle.checked = filters.riskyHellriding;

  topSearch.value = filters.search;
  sidebarSearch.value = filters.search;
  topSearchGhost.value = "";
  sidebarSearchGhost.value = "";
  groupTagPickerWrap.classList.toggle("hidden", displayState.groupBy !== "tag");
}

export function persistPreferences(themeController) {
  savePreferences(
    STORAGE_KEY,
    displayState,
    filters,
    themeController.getTheme(),
    themeController.getPalette(),
    paginationState
  );
}

export function updateUrlFromState(options) {
  writeUrlState(filters, displayState, { ...options, paginationState });
}

// ── Tag filter management ─────────────────────────────────────────────────────

export function buildTagFilters(cards) {
  const allTags = [...new Set(cards.flatMap((card) => card.tags))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  const topTags = allTags.filter(isTopTag);
  const regularTags = allTags.filter((tag) => !isTopTag(tag) && tag.toLowerCase() !== "hidden");

  tagFilterList.innerHTML = "";

  for (const tag of topTags) {
    tagFilterList.appendChild(createTagFilterChip(tag));
  }

  if (topTags.length > 0 && regularTags.length > 0) {
    const divider = document.createElement("div");
    divider.className = "tag-filter-divider";
    divider.setAttribute("aria-hidden", "true");
    tagFilterList.appendChild(divider);
  }

  for (const tag of regularTags) {
    tagFilterList.appendChild(createTagFilterChip(tag));
  }

  syncTagFilterUI();
}

function createTagFilterChip(tag) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = getTagToneClass(tag, "tag-chip");
  button.textContent = getTagLabel(tag);
  button.dataset.tag = tag;

  button.addEventListener("click", () => {
    toggleTagFilter(tag);
  });

  return button;
}

export function buildGroupTagOptions(cards) {
  const tags = [...new Set(cards.flatMap((card) => card.tags))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  groupTagSelect.innerHTML = `<option value="">Choose a tag...</option>`;

  for (const tag of tags) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = getTagLabel(tag);
    groupTagSelect.appendChild(option);
  }

  if (displayState.groupTag && tags.includes(displayState.groupTag)) {
    groupTagSelect.value = displayState.groupTag;
  } else {
    displayState.groupTag = "";
    groupTagSelect.value = "";
  }
}

export function syncTagFilterUI() {
  const chips = [...tagFilterList.querySelectorAll(".tag-chip")];
  for (const chip of chips) {
    chip.classList.toggle("active", filters.tags.has(chip.dataset.tag));
  }
}

export function toggleTagFilter(tag) {
  const currentKey = _getCurrentModalCardKey();

  if (filters.tags.has(tag)) filters.tags.delete(tag);
  else filters.tags.add(tag);

  syncTagFilterUI();
  applyFilters();

  if (!modal.classList.contains("hidden") && currentKey) {
    const matchingIndex = sharedState.filteredCards.findIndex((card) => card.key === currentKey);

    if (matchingIndex === -1) {
      _closeModal(false);
      return;
    }

    sharedState.currentModalIndex = matchingIndex;
    _renderModal(sharedState.filteredCards[sharedState.currentModalIndex], false);
  }
}

export function clearAllFilters() {
  filters.search = "";
  filters.tags.clear();

  topSearch.value = "";
  sidebarSearch.value = "";
  topSearchGhost.value = "";
  sidebarSearchGhost.value = "";

  syncTagFilterUI();
  _hideAllSearchSuggestions();
  applyFilters();
}

export function readStateFromUrl() {
  readUrlState(filters, displayState, paginationState);
}
