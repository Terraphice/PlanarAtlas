import {
  loadPreferences,
  savePreferences,
  enrichCard,
  sortCards,
  reconcileSelectedTags,
  readUrlState,
  writeUrlState,
  matchesFilters,
  parseSearchQuery,
  getTagLabel,
  getTagToneClass,
  getBadgeTags,
  parseBadgeTag,
  escapeHtml
} from "./gallery-utils.js";

import {
  initToastManager,
  initThemeController
} from "./gallery-ui.js";

const STORAGE_KEY = "planechaseGalleryPreferences.v2";

let allCards = [];
let filteredCards = [];
let currentModalIndex = -1;
let stackActiveRaf = null;
let suggestionIndex = -1;

const resultsCount = document.getElementById("results-count");
const activeFilters = document.getElementById("active-filters");
const tagFilterList = document.getElementById("tag-filter-list");
const searchSuggestions = document.getElementById("search-suggestions");

const topSearch = document.querySelector(".search-input-real");
const topSearchGhost = document.querySelector(".search-input-ghost");
const sidebarSearch = document.getElementById("sidebar-search");
const fuzzySearchToggle = document.getElementById("fuzzy-search-toggle");
const inlineAutocompleteToggle = document.getElementById("inline-autocomplete-toggle");

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarLip = document.getElementById("sidebar-lip");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const randomCardButton = document.getElementById("random-card-button");

const clearTagFiltersButton = document.getElementById("clear-tag-filters");
const clearAllFiltersButton = document.getElementById("clear-all-filters");

const viewModeSelect = document.getElementById("view-mode-select");
const groupBySelect = document.getElementById("group-by-select");
const groupTagPickerWrap = document.getElementById("group-tag-picker-wrap");
const groupTagSelect = document.getElementById("group-tag-select");

const settingsMenuToggle = document.getElementById("settings-menu-toggle");
const settingsMenu = document.getElementById("settings-menu");
const settingsClearPreferencesButton = document.getElementById("settings-clear-preferences");
const settingsContactDeveloperLink = document.getElementById("settings-contact-developer");
const themeToggleButton = document.getElementById("theme-toggle");

const modal = document.getElementById("card-modal");
const modalImage = document.getElementById("modal-image");
const modalName = document.getElementById("modal-card-name");
const modalType = document.getElementById("modal-card-type");
const modalTranscript = document.getElementById("modal-transcript");
const modalSourceLink = document.getElementById("modal-source-link");
const modalCloseButton = document.getElementById("modal-close");
const modalPrevButton = document.getElementById("modal-prev");
const modalNextButton = document.getElementById("modal-next");
const modalTagList = document.getElementById("modal-tag-list");
const modalCopyLinkButton = document.getElementById("modal-copy-link");
const gallery = document.getElementById("gallery");
const toastRegion = document.getElementById("toast-region");

const preferences = loadPreferences(STORAGE_KEY);

const filters = {
  search: "",
  tags: new Set(),
  fuzzy: preferences.fuzzySearch,
  inlineAutocomplete: preferences.inlineAutocomplete
};

const displayState = {
  viewMode: preferences.viewMode,
  groupBy: preferences.groupBy,
  groupTag: preferences.groupTag
};

const showToast = initToastManager(toastRegion);
const themeController = initThemeController({
  button: themeToggleButton,
  initialTheme: preferences.theme,
  initialPalette: preferences.themePalette,
  onChange(theme, palette) {
    persistPreferences();

    const paletteLabel = palette === "gruvbox"
      ? " Gruvbox"
      : palette === "atom"
        ? " Atom"
        : "";

    const themeLabel = theme === "system"
      ? "system"
      : theme;

    showToast(`Theme set to ${themeLabel}${paletteLabel}.`);
  }
});

init();

async function init() {
  try {
    readUrlState(filters, displayState);
    applyStoredPreferencesToUI();

    const response = await fetch("cards.json");
    if (!response.ok) {
      throw new Error("Failed to load cards.json");
    }

    const rawCards = await response.json();
    allCards = rawCards.map(enrichCard);

    filters.tags = reconcileSelectedTags(filters.tags, allCards);

    if (displayState.groupTag) {
      displayState.groupTag = reconcileSelectedTags(new Set([displayState.groupTag]), allCards).values().next().value || "";
    }

    buildTagFilters(allCards);
    buildGroupTagOptions(allCards);
    bindEvents();
    syncTagFilterUI();
    applyFilters({ updateUrl: false });
    tryOpenCardFromHash();
  } catch (error) {
    console.error(error);
    gallery.innerHTML = `<p class="empty-state">Could not load gallery data.</p>`;
    resultsCount.textContent = "";
  }
}

function applyStoredPreferencesToUI() {
  viewModeSelect.value = displayState.viewMode;
  groupBySelect.value = displayState.groupBy;
  fuzzySearchToggle.checked = filters.fuzzy;
  inlineAutocompleteToggle.checked = filters.inlineAutocomplete;
  topSearch.value = filters.search;
  sidebarSearch.value = filters.search;
  groupTagPickerWrap.classList.toggle("hidden", displayState.groupBy !== "tag");
}

function persistPreferences() {
  savePreferences(
    STORAGE_KEY,
    displayState,
    filters,
    themeController.getTheme(),
    themeController.getPalette()
  );
}

function updateUrlFromState(options) {
  writeUrlState(filters, displayState, options);
}

function bindEvents() {
  topSearch.addEventListener("input", syncSearchInputsFromTop);
  sidebarSearch.addEventListener("input", syncSearchInputsFromSidebar);

  topSearch.addEventListener("focus", () => {
    renderSearchSuggestions();
    updateInlineAutocomplete();
  });

  topSearch.addEventListener("keydown", handleTopSearchKeydown);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;

    const insideSearch =
      topSearch.contains(event.target) ||
      searchSuggestions.contains(event.target);

    const insideSettings =
      settingsMenu.contains(event.target) ||
      settingsMenuToggle.contains(event.target);

    if (!insideSearch) {
      hideSearchSuggestions();
    }

    if (!insideSettings) {
      closeSettingsMenu();
    }
  });

  fuzzySearchToggle.addEventListener("change", () => {
    filters.fuzzy = fuzzySearchToggle.checked;
    persistPreferences();
    applyFilters();
  });

  inlineAutocompleteToggle.addEventListener("change", () => {
    filters.inlineAutocomplete = inlineAutocompleteToggle.checked;
    persistPreferences();
    updateInlineAutocomplete();
    applyFilters();
  });

  clearTagFiltersButton.addEventListener("click", () => {
    filters.tags.clear();
    syncTagFilterUI();
    applyFilters();
    showToast("Tag filters cleared.");
  });

  clearAllFiltersButton.addEventListener("click", () => {
    clearAllFilters();
    showToast("All filters cleared.");
  });

  viewModeSelect.addEventListener("change", () => {
    displayState.viewMode = viewModeSelect.value;
    persistPreferences();
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  groupBySelect.addEventListener("change", () => {
    displayState.groupBy = groupBySelect.value;
    groupTagPickerWrap.classList.toggle("hidden", displayState.groupBy !== "tag");
    persistPreferences();
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  groupTagSelect.addEventListener("change", () => {
    displayState.groupTag = groupTagSelect.value;
    persistPreferences();
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  sidebarToggle.addEventListener("click", closeSidebar);
  sidebarLip.addEventListener("click", toggleSidebar);
  sidebarBackdrop.addEventListener("click", closeSidebar);

  settingsMenuToggle.addEventListener("click", () => {
    toggleSettingsMenu();
  });

  settingsClearPreferencesButton.addEventListener("click", clearSavedPreferences);
  settingsContactDeveloperLink.addEventListener("click", () => {
    closeSettingsMenu();
  });

  randomCardButton.addEventListener("click", openRandomCard);

  modal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeModal();
    }
  });

  modalCloseButton.addEventListener("click", closeModal);
  modalPrevButton.addEventListener("click", showPreviousCard);
  modalNextButton.addEventListener("click", showNextCard);
  modalCopyLinkButton.addEventListener("click", copyCurrentCardLink);

  modalTagList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tag = target.dataset.tag;
    if (!tag) return;

    event.preventDefault();
    event.stopPropagation();
    toggleTagFilter(tag);
  });

  activeFilters.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tag = target.dataset.tag;
    if (!tag) return;

    event.preventDefault();
    toggleTagFilter(tag);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!searchSuggestions.classList.contains("hidden")) {
        hideSearchSuggestions();
        return;
      }

      if (!settingsMenu.classList.contains("hidden")) {
        closeSettingsMenu();
        return;
      }

      if (!modal.classList.contains("hidden")) {
        closeModal();
        return;
      }

      if (sidebar.classList.contains("open")) {
        closeSidebar();
        return;
      }
    }

    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const active = document.activeElement;
      const typing = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
      );

      if (!typing) {
        event.preventDefault();
        topSearch.focus();
      }
    }

    if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const active = document.activeElement;
      const typing = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
      );

      if (!typing) {
        toggleSidebar();
      }
    }

    if (event.key.toLowerCase() === "g" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const active = document.activeElement;
      const typing = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
      );

      if (!typing) {
        event.preventDefault();
        gallery.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!modal.classList.contains("hidden")) {
        event.preventDefault();
        showNextCard();
      }
    }

    if (event.key.toLowerCase() === "p" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!modal.classList.contains("hidden")) {
        event.preventDefault();
        showPreviousCard();
      }
    }

    if (modal.classList.contains("hidden")) return;

    if (event.key === "ArrowLeft") showPreviousCard();
    if (event.key === "ArrowRight") showNextCard();
  });

  window.addEventListener("hashchange", () => {
    const key = getCardKeyFromHash();

    if (!key) {
      if (!modal.classList.contains("hidden")) {
        closeModal(false);
      }
      return;
    }

    openModalByKey(key, false);
  });

  window.addEventListener("popstate", () => {
    readUrlState(filters, displayState);
    filters.tags = reconcileSelectedTags(filters.tags, allCards);

    if (displayState.groupTag) {
      displayState.groupTag = reconcileSelectedTags(new Set([displayState.groupTag]), allCards).values().next().value || "";
    }

    applyStoredPreferencesToUI();
    buildGroupTagOptions(allCards);
    syncTagFilterUI();
    applyFilters({ updateUrl: false });
    tryOpenCardFromHash();
  });

  window.addEventListener("scroll", scheduleStackActiveUpdate, { passive: true });
  window.addEventListener("resize", scheduleStackActiveUpdate);
}

function syncSearchInputsFromTop() {
  const value = topSearch.value;
  sidebarSearch.value = value;
  filters.search = value.trim();
  applyFilters();
}

function syncSearchInputsFromSidebar() {
  const value = sidebarSearch.value;
  topSearch.value = value;
  filters.search = value.trim();
  applyFilters();
}

function openSidebar() {
  sidebar.classList.remove("collapsed");
  sidebar.classList.add("open");
  sidebarBackdrop.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebar.classList.add("collapsed");
  sidebarBackdrop.classList.add("hidden");
}

function toggleSidebar() {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSettingsMenu() {
  settingsMenu.classList.remove("hidden");
  settingsMenuToggle.setAttribute("aria-expanded", "true");
}

function closeSettingsMenu() {
  settingsMenu.classList.add("hidden");
  settingsMenuToggle.setAttribute("aria-expanded", "false");
}

function toggleSettingsMenu() {
  if (settingsMenu.classList.contains("hidden")) {
    openSettingsMenu();
  } else {
    closeSettingsMenu();
  }
}

function buildTagFilters(cards) {
  const tags = [...new Set(cards.flatMap((card) => card.tags))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  tagFilterList.innerHTML = "";

  for (const tag of tags) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = getTagToneClass(tag, "tag-chip");
    button.textContent = getTagLabel(tag);
    button.dataset.tag = tag;

    button.addEventListener("click", () => {
      toggleTagFilter(tag);
    });

    tagFilterList.appendChild(button);
  }

  syncTagFilterUI();
}

function buildGroupTagOptions(cards) {
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
    persistPreferences();
  }
}

function syncTagFilterUI() {
  const chips = [...tagFilterList.querySelectorAll(".tag-chip")];
  for (const chip of chips) {
    chip.classList.toggle("active", filters.tags.has(chip.dataset.tag));
  }
}

function toggleTagFilter(tag) {
  const currentKey = getCurrentModalCardKey();

  if (filters.tags.has(tag)) {
    filters.tags.delete(tag);
  } else {
    filters.tags.add(tag);
  }

  syncTagFilterUI();
  applyFilters();

  if (!modal.classList.contains("hidden") && currentKey) {
    const matchingIndex = filteredCards.findIndex((card) => card.key === currentKey);

    if (matchingIndex === -1) {
      closeModal(false);
      return;
    }

    currentModalIndex = matchingIndex;
    renderModal(filteredCards[currentModalIndex], false);
  }
}

function getCurrentModalCardKey() {
  const hashKey = getCardKeyFromHash();
  if (hashKey) return hashKey;

  if (currentModalIndex >= 0 && currentModalIndex < filteredCards.length) {
    return filteredCards[currentModalIndex].key;
  }

  return null;
}

function applyFilters({ updateUrl = true } = {}) {
  const parsedQuery = parseSearchQuery(filters.search);

  filteredCards = allCards.filter((card) => matchesFilters(card, parsedQuery, filters));
  sortCards(filteredCards);

  renderActiveFilters(parsedQuery);
  renderGallery();
  renderSearchSuggestions();
  updateInlineAutocomplete();

  if (updateUrl) {
    updateUrlFromState();
  }
}

function renderGallery() {
  gallery.innerHTML = "";
  resultsCount.textContent = `${filteredCards.length} ${filteredCards.length === 1 ? "card" : "cards"}`;

  if (filteredCards.length === 0) {
    gallery.innerHTML = `<p class="empty-state">No cards match the current filters.</p>`;
    return;
  }

  if (displayState.groupBy === "none") {
    const wrapper = document.createElement("div");
    wrapper.className = getLayoutClassName();

    filteredCards.forEach((card, index) => {
      const element = createCardElement(card, index);
      wrapper.appendChild(element);
    });

    gallery.appendChild(wrapper);
    scheduleStackActiveUpdate();
    return;
  }

  const grouped = groupCards(filteredCards, displayState.groupBy, displayState.groupTag);
  const groupsWrap = document.createElement("div");
  groupsWrap.className = "result-groups";

  for (const group of grouped) {
    if (!group.cards.length) continue;

    const section = document.createElement("section");
    section.className = "result-group";

    const inner = document.createElement("div");
    inner.className = `${getLayoutClassName()} result-group-body`;

    group.cards.forEach((card, index) => {
      const element = createCardElement(card, index);
      inner.appendChild(element);
    });

    section.innerHTML = `
      <div class="result-group-header">
        <h3 class="result-group-title">${escapeHtml(group.label)}</h3>
        <p class="result-group-meta">${group.cards.length} ${group.cards.length === 1 ? "card" : "cards"}</p>
      </div>
    `;

    section.appendChild(inner);
    groupsWrap.appendChild(section);
  }

  gallery.appendChild(groupsWrap);
  scheduleStackActiveUpdate();
}

function getLayoutClassName() {
  if (displayState.viewMode === "single") return "single-card-layout";
  if (displayState.viewMode === "stack") return "stack-card-layout";
  return "card-grid";
}

function groupCards(cards, mode, selectedTag) {
  const groups = new Map();

  if (mode === "tag") {
    if (!selectedTag) {
      addCardToGroup(groups, "Ungrouped", ...cards);
    } else {
      const selectedTagLower = selectedTag.toLowerCase();

      addCardToGroup(
        groups,
        `Has tag: ${getTagLabel(selectedTag)}`,
        ...cards.filter((card) => card.normalizedTags.includes(selectedTagLower))
      );

      addCardToGroup(
        groups,
        `Missing tag: ${getTagLabel(selectedTag)}`,
        ...cards.filter((card) => !card.normalizedTags.includes(selectedTagLower))
      );
    }
  }

  return [...groups.entries()].map(([label, groupedCards]) => ({
    label,
    cards: groupedCards
  }));
}

function addCardToGroup(map, label, ...cards) {
  if (!map.has(label)) {
    map.set(label, []);
  }
  map.get(label).push(...cards);
}

function createCardElement(card, index = 0) {
  const cardButton = document.createElement("button");
  cardButton.type = "button";
  cardButton.className = "card-link";
  cardButton.setAttribute("aria-label", `Open viewer for ${card.displayName}`);
  cardButton.dataset.cardKey = card.key;

  if (displayState.viewMode === "single") {
    cardButton.classList.add("single-card-item");
  }

  if (displayState.viewMode === "stack") {
    cardButton.classList.add("stack-card-item");
    cardButton.style.zIndex = String(index + 1);
  }

  const article = document.createElement("article");
  article.className = "card";

  const badgeLayer = renderCardBadgeLayer(card);
  if (badgeLayer) {
    article.appendChild(badgeLayer);
  }

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image-wrap";
  imageWrap.innerHTML = `<img class="card-image" src="${card.imagePath}" alt="${escapeHtml(card.displayName)}" loading="lazy" />`;

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const nameRow = document.createElement("div");
  nameRow.className = "card-name-row";
  nameRow.innerHTML = `
    <h3 class="card-name">${escapeHtml(card.displayName)}</h3>
    <div class="card-type">${escapeHtml(card.type)}</div>
  `;

  const tagsContainer = document.createElement("div");
  tagsContainer.className = "card-tags";

  for (const tag of card.tags.slice(0, 6)) {
    tagsContainer.appendChild(createTagChipElement(tag, "card-tag"));
  }

  footer.appendChild(nameRow);
  footer.appendChild(tagsContainer);

  article.appendChild(imageWrap);
  article.appendChild(footer);
  cardButton.appendChild(article);

  cardButton.addEventListener("click", () => openModalByKey(card.key, true));
  return cardButton;
}

function renderCardBadgeLayer(card) {
  const badges = getBadgeTags(card.tags);
  if (badges.length === 0) return null;

  const grouped = {
    tl: [],
    tr: [],
    bl: [],
    br: []
  };

  for (const badge of badges) {
    grouped[badge.corner].push(badge);
  }

  const layer = document.createElement("div");
  layer.className = "card-badge-layer";

  for (const corner of ["tl", "tr", "bl", "br"]) {
    if (grouped[corner].length === 0) continue;

    const stack = document.createElement("div");
    stack.className = `card-badge-stack ${corner}`;

    for (const badge of grouped[corner]) {
      const badgeEl = document.createElement("div");
      badgeEl.className = `card-badge tone-${badge.color}`;
      badgeEl.textContent = badge.label;
      stack.appendChild(badgeEl);
    }

    layer.appendChild(stack);
  }

  return layer;
}

function createTagChipElement(tag, className = "card-tag") {
  const chip = document.createElement("span");
  chip.className = getTagToneClass(tag, className);
  chip.textContent = getTagLabel(tag);
  chip.dataset.tag = tag;
  chip.classList.toggle("active", filters.tags.has(tag));

  chip.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleTagFilter(tag);
  });

  return chip;
}

function scheduleStackActiveUpdate() {
  if (stackActiveRaf !== null) return;

  stackActiveRaf = window.requestAnimationFrame(() => {
    stackActiveRaf = null;
    updateStackActiveCard();
  });
}

function updateStackActiveCard() {
  if (displayState.viewMode !== "stack") return;

  const stackItems = [...gallery.querySelectorAll(".stack-card-item")];
  if (!stackItems.length) return;

  stackItems.forEach((item, index) => {
    item.classList.remove("stack-active");
    item.style.zIndex = String(index + 1);
  });

  const prefersCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (!prefersCoarsePointer) return;

  const viewportCenter = window.innerHeight / 2;
  let bestItem = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of stackItems) {
    const rect = item.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      continue;
    }

    const itemCenter = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenter - viewportCenter);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestItem = item;
    }
  }

  if (!bestItem) {
    bestItem = stackItems[0];
  }

  bestItem.classList.add("stack-active");
  bestItem.style.zIndex = "50";
}

function renderActiveFilters(parsedQuery) {
  activeFilters.innerHTML = "";

  const pillData = [];

  if (filters.search) {
    pillData.push({ label: `Search: ${filters.search}`, removable: false });
  }

  for (const tag of filters.tags) {
    pillData.push({
      label: `Tag: ${getTagLabel(tag)}`,
      removable: true,
      tag
    });
  }

  for (const value of parsedQuery.tagTerms) {
    pillData.push({ label: `tag:${value}`, removable: false });
  }

  for (const value of parsedQuery.negTagTerms) {
    pillData.push({ label: `-tag:${value}`, removable: false });
  }

  for (const value of parsedQuery.nameTerms) {
    pillData.push({ label: `name:${value}`, removable: false });
  }

  for (const value of parsedQuery.negNameTerms) {
    pillData.push({ label: `-name:${value}`, removable: false });
  }

  if (parsedQuery.regexSource) {
    pillData.push({ label: `regex:${parsedQuery.regexSource}`, removable: false });
  }

  if (filters.fuzzy) {
    pillData.push({ label: "Fuzzy: on", removable: false });
  }

  for (const pill of pillData) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "active-filter-pill";
    element.textContent = pill.removable ? `${pill.label} ×` : pill.label;

    if (pill.removable) {
      element.classList.add("active-filter-pill-removable");
      element.dataset.tag = pill.tag;

      const badge = parseBadgeTag(pill.tag);
      if (badge) {
        element.classList.add(`tone-${badge.color}`);
      }
    } else {
      element.disabled = true;
    }

    activeFilters.appendChild(element);
  }
}

function renderSearchSuggestions() {
  const query = filters.search.trim();
  const suggestions = buildSuggestions(query);

  suggestionIndex = -1;
  searchSuggestions.innerHTML = "";

  if (!query || suggestions.length === 0) {
    hideSearchSuggestions();
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-suggestion";
    button.setAttribute("role", "option");
    button.dataset.index = String(index);
    button.innerHTML = `
      <span class="search-suggestion-title">${escapeHtml(suggestion.title)}</span>
      <span class="search-suggestion-meta">${escapeHtml(suggestion.meta)}</span>
    `;

    button.addEventListener("click", () => {
      applySuggestion(suggestion);
    });

    searchSuggestions.appendChild(button);
  });

  searchSuggestions.classList.remove("hidden");
}

function buildSuggestions(query) {
  const queryLower = query.toLowerCase();
  const parsed = parseSearchQuery(query);
  const matches = allCards
    .filter((card) => matchesFilters(card, parsed, filters))
    .slice(0, 6);

  const suggestions = [];

  for (const card of matches) {
    suggestions.push({
      kind: "card",
      value: card.displayName,
      title: card.displayName,
      meta: `${card.type} · ${card.tags.slice(0, 3).map(getTagLabel).join(" · ")}`,
      cardKey: card.key
    });
  }

  const matchingTags = [...new Set(
    allCards.flatMap((card) => card.tags).filter((tag) => getTagLabel(tag).toLowerCase().includes(queryLower))
  )].slice(0, 4);

  for (const tag of matchingTags) {
    suggestions.push({
      kind: "tag",
      value: `tag:${tag}`,
      title: `tag:${getTagLabel(tag)}`,
      meta: "Filter by tag"
    });
  }

  return suggestions.slice(0, 8);
}

function getBestCardSuggestion() {
  const query = filters.search.trim();
  if (!query) return null;
  if (query.includes(":") || /^\/.*\/[gimsuy]*$/.test(query)) return null;

  const normalized = query.toLowerCase();
  const candidates = filteredCards
    .filter((card) => card.displayName.toLowerCase().includes(normalized))
    .sort((a, b) => {
      const aStarts = a.displayName.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.displayName.toLowerCase().startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.displayName.length - b.displayName.length;
    });

  if (!candidates.length) return null;

  const card = candidates[0];
  return {
    kind: "card",
    value: card.displayName,
    title: card.displayName,
    meta: `${card.type} · ${card.tags.slice(0, 3).map(getTagLabel).join(" · ")}`,
    cardKey: card.key
  };
}

function updateInlineAutocomplete() {
  if (!filters.inlineAutocomplete) {
    topSearchGhost.value = "";
    return;
  }

  const query = topSearch.value;
  if (!query.trim()) {
    topSearchGhost.value = "";
    return;
  }

  if (query.includes(":") || /^\/.*\/[gimsuy]*$/.test(query)) {
    topSearchGhost.value = "";
    return;
  }

  const bestCard = getBestCardSuggestion();
  if (!bestCard) {
    topSearchGhost.value = "";
    return;
  }

  const cardName = bestCard.title;
  if (!cardName.toLowerCase().startsWith(query.toLowerCase()) || cardName.length <= query.length) {
    topSearchGhost.value = "";
    return;
  }

  topSearchGhost.value = query + cardName.slice(query.length);
}

function applySuggestion(suggestion) {
  topSearch.value = suggestion.value;
  sidebarSearch.value = suggestion.value;
  filters.search = suggestion.value.trim();
  hideSearchSuggestions();
  applyFilters();
  topSearch.blur();
}

function hideSearchSuggestions() {
  searchSuggestions.classList.add("hidden");
  searchSuggestions.innerHTML = "";
  suggestionIndex = -1;
}

function handleTopSearchKeydown(event) {
  const items = [...searchSuggestions.querySelectorAll(".search-suggestion")];
  const hasSuggestionsOpen = !searchSuggestions.classList.contains("hidden") && items.length > 0;

  if (event.key === "Tab" && filters.inlineAutocomplete) {
    const query = topSearch.value;
    const ghost = topSearchGhost.value;

    if (ghost && ghost.length > query.length && ghost.toLowerCase().startsWith(query.toLowerCase())) {
      event.preventDefault();
      topSearch.value = ghost;
      sidebarSearch.value = ghost;
      filters.search = ghost.trim();
      applyFilters();
      return;
    }
  }

  if (event.key === "ArrowDown" && hasSuggestionsOpen) {
    event.preventDefault();
    suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
    updateSuggestionHighlight(items);
    return;
  }

  if (event.key === "ArrowUp" && hasSuggestionsOpen) {
    event.preventDefault();
    suggestionIndex = Math.max(suggestionIndex - 1, 0);
    updateSuggestionHighlight(items);
    return;
  }

  if (event.key === "Enter") {
    if (hasSuggestionsOpen && suggestionIndex >= 0) {
      event.preventDefault();
      items[suggestionIndex].click();
      return;
    }

    const bestCard = getBestCardSuggestion();
    if (bestCard) {
      event.preventDefault();
      openModalByKey(bestCard.cardKey, true);
      hideSearchSuggestions();
      return;
    }
  }

  if (event.key === "Escape") {
    hideSearchSuggestions();
  }
}

function updateSuggestionHighlight(items) {
  items.forEach((item, index) => {
    item.classList.toggle("is-active", index === suggestionIndex);
  });
}

function openModalByKey(cardKey, updateHash = true) {
  let index = filteredCards.findIndex((card) => card.key === cardKey);

  if (index === -1) {
    const cardInAll = allCards.find((card) => card.key === cardKey);
    if (!cardInAll) return;

    if (!filteredCards.some((card) => card.key === cardKey)) {
      filteredCards = [...allCards];
      sortCards(filteredCards);
      renderGallery();
    }

    index = filteredCards.findIndex((card) => card.key === cardKey);
    if (index === -1) return;
  }

  currentModalIndex = index;
  renderModal(filteredCards[currentModalIndex], updateHash);
}

async function renderModal(card, updateHash = true) {
  modalImage.src = card.imagePath;
  modalImage.alt = card.displayName;
  modalName.textContent = card.displayName;
  modalType.textContent = card.type;
  modalSourceLink.href = card.imagePath;

  modalTagList.innerHTML = "";

  for (const tag of card.tags) {
    modalTagList.appendChild(createTagChipElement(tag, "modal-tag"));
  }

  modalTranscript.innerHTML = "Loading transcript…";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  updateModalNavButtons();

  if (updateHash) {
    updateUrlForCard(card);
  }

  preloadAdjacentImages();

  try {
    let response = await fetch(card.transcriptPathMd, { cache: "no-store" });

    if (!response.ok) {
      response = await fetch(card.transcriptPathTxt, { cache: "no-store" });
    }

    if (!response.ok) throw new Error("Transcript not found");

    const transcript = await response.text();
    renderTranscriptMarkdown(transcript.trim() || "No transcript available.");
  } catch {
    renderTranscriptMarkdown("No transcript available.");
  }
}

function closeModal(updateHash = true) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  modalImage.src = "";
  modalImage.alt = "";
  modalSourceLink.href = "#";
  modalTranscript.innerHTML = "No transcript available.";
  modalTagList.innerHTML = "";
  currentModalIndex = -1;

  if (updateHash) {
    clearCardHash();
  }
}

function showPreviousCard() {
  if (currentModalIndex <= 0) return;
  currentModalIndex -= 1;
  renderModal(filteredCards[currentModalIndex], true);
}

function showNextCard() {
  if (currentModalIndex >= filteredCards.length - 1) return;
  currentModalIndex += 1;
  renderModal(filteredCards[currentModalIndex], true);
}

function updateModalNavButtons() {
  modalPrevButton.disabled = currentModalIndex <= 0;
  modalNextButton.disabled = currentModalIndex >= filteredCards.length - 1;
}

function preloadAdjacentImages() {
  preloadCardImage(filteredCards[currentModalIndex - 1]);
  preloadCardImage(filteredCards[currentModalIndex + 1]);
}

function preloadCardImage(card) {
  if (!card || !card.imagePath) return;
  const img = new Image();
  img.src = card.imagePath;
}

function openRandomCard() {
  if (!filteredCards.length) return;
  const randomIndex = Math.floor(Math.random() * filteredCards.length);
  openModalByKey(filteredCards[randomIndex].key, true);
}

async function copyCurrentCardLink() {
  if (currentModalIndex < 0 || currentModalIndex >= filteredCards.length) return;

  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Link copied.");
  } catch {
    showToast("Copy failed.");
  }
}

function clearSavedPreferences() {
  localStorage.removeItem(STORAGE_KEY);

  filters.search = "";
  filters.tags.clear();
  filters.fuzzy = false;
  filters.inlineAutocomplete = true;

  displayState.viewMode = "grid";
  displayState.groupBy = "none";
  displayState.groupTag = "";

  themeController.setTheme("system", {
    silent: true,
    paletteOverride: "standard"
  });

  topSearch.value = "";
  sidebarSearch.value = "";
  topSearchGhost.value = "";

  applyStoredPreferencesToUI();
  buildGroupTagOptions(allCards);
  syncTagFilterUI();
  hideSearchSuggestions();
  applyFilters();
  closeSettingsMenu();

  showToast("Preferences cleared.");
}

function clearAllFilters() {
  filters.search = "";
  filters.tags.clear();

  topSearch.value = "";
  sidebarSearch.value = "";
  topSearchGhost.value = "";

  syncTagFilterUI();
  hideSearchSuggestions();
  applyFilters();
  tryOpenCardFromHash();
}

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

function getCardKeyFromHash() {
  const match = window.location.hash.match(/^#card=(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function tryOpenCardFromHash() {
  const key = getCardKeyFromHash();
  if (!key) return;
  openModalByKey(key, false);
}

function renderTranscriptMarkdown(markdownText) {
  const rawHtml = marked.parse(markdownText, {
    breaks: true
  });

  const safeHtml = DOMPurify.sanitize(rawHtml);
  modalTranscript.innerHTML = enhanceManaSymbols(safeHtml);
}

function enhanceManaSymbols(html) {
  return html.replace(/\{([^}]+)\}/g, (_, rawSymbol) => {
    const symbol = rawSymbol.trim().toLowerCase();
    const classes = getManaClasses(symbol);

    if (!classes) {
      return `{${escapeHtml(rawSymbol)}}`;
    }

    return `<i class="${classes}" aria-label="${escapeHtml(rawSymbol.toUpperCase())}" title="${escapeHtml(rawSymbol.toUpperCase())}"></i>`;
  });
}

function getManaClasses(symbol) {
  const raw = symbol.replace(/\s+/g, "");

  const aliases = {
    t: "tap",
    q: "untap",
    planeswalk: "planeswalker"
  };

  const normalized = aliases[raw] || raw;

  const direct = new Set([
    "w", "u", "b", "r", "g", "c",
    "x", "y", "z",
    "tap", "untap",
    "chaos",
    "planeswalker"
  ]);

  if (direct.has(normalized)) {
    return normalized === "tap" || normalized === "untap" || normalized === "planeswalker"
      ? `ms ms-${normalized}`
      : `ms ms-${normalized} ms-cost`;
  }

  if (/^(0|[1-9]|10|11|12|13|14|15|16|17|18|19|20|100|1000000|infinity|1\/2)$/.test(normalized)) {
    const converted = normalized === "1/2" ? "1-2" : normalized;
    return `ms ms-${converted} ms-cost`;
  }

  if (/^[wubrgc]\/[wubrgc]$/.test(normalized)) {
    return `ms ms-${normalized.replace("/", "")} ms-cost`;
  }

  if (/^2\/[wubrg]$/.test(normalized)) {
    return `ms ms-${normalized.replace("/", "")} ms-cost`;
  }

  if (/^[wubrg]\/p$/.test(normalized)) {
    return `ms ms-${normalized.replace("/", "")} ms-cost`;
  }

  return null;
}