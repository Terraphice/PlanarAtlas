import {
  enrichCard,
  reconcileSelectedTags
} from "./gallery-utils.js";

import {
  initToastManager,
  initThemeController
} from "./gallery-ui.js";

import {
  initDeck,
  getCardDeckCount,
  addCardToDeck,
  removeCardFromDeck,
  isDeckPanelOpen,
  closeDeckPanel,
  setModalCardKey,
  isGameActive,
  syncGameHash,
  showGameModeDialog,
  clearAllDecks,
  clearTutorialFlags,
  getAllDecksForProfile,
  importProfileDecks,
  encodeProfileData,
  decodeProfileData,
  setPhenomenonAnimation,
  closeGameReaderView,
  setRiskyHellriding
} from "./deck.js";

import {
  STORAGE_KEY,
  preferences,
  filters,
  displayState,
  paginationState,
  sharedState,
  initStateCallbacks,
  applyFilters,
  applyStoredPreferencesToUI,
  persistPreferences,
  updateUrlFromState,
  buildTagFilters,
  buildGroupTagOptions,
  syncTagFilterUI,
  toggleTagFilter,
  clearAllFilters,
  readStateFromUrl
} from "./gallery-state.js";

import {
  initRenderCallbacks,
  renderGallery,
  renderActiveFilters,
  scheduleStackActiveUpdate
} from "./gallery-render.js";

import {
  initSearchCallbacks,
  renderSearchSuggestions,
  updateInlineAutocomplete,
  hideAllSearchSuggestions,
  handleSearchKeydown,
  syncSearchInputsFromTop,
  syncSearchInputsFromSidebar,
  setActiveSearchSurface
} from "./gallery-search.js";

import {
  initModalCallbacks,
  openModalByKey,
  renderModal,
  closeModal,
  showPreviousCard,
  showNextCard,
  getCurrentModalCardKey,
  getCardKeyFromHash,
  tryOpenCardFromHash,
  flipModalImage,
  copyCurrentCardLink
} from "./gallery-modal.js";

// \u2500\u2500 Constants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const ALL_PALETTES = ["standard", "gruvbox", "atom", "dracula", "solarized", "nord", "catppuccin", "scryfall"];
const THEME_PREFERENCES = ["system", "dark", "light"];
const VIEW_MODES = ["grid", "single", "stack", "list"];
const GROUP_MODES = ["none", "tag"];

// \u2500\u2500 DOM references \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const toastRegion = document.getElementById("toast-region");
const themeToggleButton = document.getElementById("theme-toggle");

const topSearch = document.getElementById("top-search");
const topSearchSuggestions = document.getElementById("top-search-suggestions");
const sidebarSearch = document.getElementById("sidebar-search");

const fuzzySearchToggle = document.getElementById("fuzzy-search-toggle");
const showHiddenToggle = document.getElementById("show-hidden-toggle");
const inlineAutocompleteToggle = document.getElementById("inline-autocomplete-toggle");
const phenomenonAnimationToggle = document.getElementById("phenomenon-animation-toggle");
const riskyHellridingToggle = document.getElementById("risky-hellriding-toggle");

const sidebar = document.getElementById("sidebar");
const sidebarContent = document.getElementById("sidebar-content");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarLip = document.getElementById("sidebar-lip");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const settingsMenuToggle = document.getElementById("settings-menu-toggle");
const settingsMenu = document.getElementById("settings-menu");
const settingsClearPreferencesButton = document.getElementById("settings-clear-preferences");
const settingsContactDeveloperLink = document.getElementById("settings-contact-developer");
const settingsExportProfileButton = document.getElementById("settings-export-profile");
const settingsImportProfileButton = document.getElementById("settings-import-profile");

const randomCardButton = document.getElementById("random-card-button");
const playGameButton = document.getElementById("play-game-button");
const mainPanel = document.querySelector(".main-panel");
const topbarCopy = document.querySelector(".topbar .topbar-copy");

const clearTagFiltersButton = document.getElementById("clear-tag-filters");
const clearAllFiltersButton = document.getElementById("clear-all-filters");

const viewModeSelect = document.getElementById("view-mode-select");
const groupBySelect = document.getElementById("group-by-select");
const groupTagPickerWrap = document.getElementById("group-tag-picker-wrap");
const groupTagSelect = document.getElementById("group-tag-select");

const confirmDialog = document.getElementById("confirm-dialog");
const confirmOkButton = document.getElementById("confirm-ok");
const confirmCancelButton = document.getElementById("confirm-cancel");

const modal = document.getElementById("card-modal");
const modalImageWrap = document.getElementById("modal-image-wrap");
const modalCloseButton = document.getElementById("modal-close");
const modalPrevButton = document.getElementById("modal-prev");
const modalNextButton = document.getElementById("modal-next");
const modalTagList = document.getElementById("modal-tag-list");
const modalCopyLinkButton = document.getElementById("modal-copy-link");
const activeFiltersEl = document.getElementById("active-filters");

// \u2500\u2500 Initialization \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

let randomLongPressTimer = null;
let suppressRandomClick = false;
let randomIconResetTimer = null;

const showToast = initToastManager(toastRegion);
const themeController = initThemeController({
  button: themeToggleButton,
  initialTheme: preferences.theme,
  initialPalette: preferences.themePalette,
  onChange(theme, palette) {
    persistPreferences(themeController);
    const paletteLabel = palette === "standard" ? "" : ` ${capitalize(palette)}`;
    showToast(`Theme set to ${theme}${paletteLabel}.`);
  }
});

function _persistPreferences() {
  persistPreferences(themeController);
}

// Wire cross-module callbacks
initStateCallbacks({
  renderGallery,
  renderSearchSuggestions,
  updateInlineAutocomplete,
  renderActiveFilters,
  renderModal,
  closeModal,
  getCurrentModalCardKey,
  hideAllSearchSuggestions
});

initRenderCallbacks({
  openModalByKey,
  addCardToDeck,
  removeCardFromDeck,
  getCardDeckCount,
  isDeckPanelOpen,
  persistPreferences: _persistPreferences
});

initSearchCallbacks({ openModalByKey });

initModalCallbacks({
  renderGallery,
  setModalCardKey,
  toggleTagFilter,
  showToast
});

init();

async function init() {
  try {
    readStateFromUrl();
    applyStoredPreferencesToUI();

    const response = await fetch("cards.json");
    if (!response.ok) throw new Error("Failed to load cards.json");

    const rawCards = await response.json();
    sharedState.allCards = rawCards.map(enrichCard);

    filters.tags = reconcileSelectedTags(filters.tags, sharedState.allCards);

    if (displayState.groupTag) {
      displayState.groupTag = reconcileSelectedTags(
        new Set([displayState.groupTag]),
        sharedState.allCards
      ).values().next().value || "";
    }

    buildTagFilters(sharedState.allCards);
    buildGroupTagOptions(sharedState.allCards);
    bindEvents();
    syncTagFilterUI();
    applyFilters({ updateUrl: false, preservePage: true });
    tryOpenCardFromHash();

    initDeck({
      cards: sharedState.allCards,
      showToast,
      onDeckChange: () => {
        const panelOpen = isDeckPanelOpen();
        document.getElementById("gallery").classList.toggle("deck-mode", panelOpen);
        mainPanel?.classList.toggle("deck-panel-offset", panelOpen);
      }
    });
    setPhenomenonAnimation(filters.phenomenonAnimation);
    setRiskyHellriding(filters.riskyHellriding);

    prefetchAllTranscripts(sharedState.allCards);
  } catch (error) {
    console.error(error);
    document.getElementById("gallery").innerHTML = `<p class="empty-state">Could not load gallery data.</p>`;
    document.getElementById("results-count").textContent = "";
  }
}

function prefetchAllTranscripts(cards) {
  const CONCURRENCY = 6;
  let index = 0;

  function next() {
    if (index >= cards.length) return;
    const card = cards[index++];

    if (sharedState.transcriptCache.has(card.key)) {
      next();
      return;
    }

    sharedState.transcriptCache.set(card.key, null);
    fetch(card.transcriptPath)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        sharedState.transcriptCache.set(card.key, text ? text.trim() : "");
        next();
      })
      .catch(() => {
        sharedState.transcriptCache.set(card.key, "");
        next();
      });
  }

  for (let i = 0; i < CONCURRENCY; i++) {
    next();
  }
}

// \u2500\u2500 Event binding \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function bindEvents() {
  topSearch.addEventListener("focus", () => {
    setActiveSearchSurface("top");
    renderSearchSuggestions();
    updateInlineAutocomplete();
  });

  sidebarSearch.addEventListener("focus", () => {
    setActiveSearchSurface("sidebar");
    hideAllSearchSuggestions();
    updateInlineAutocomplete();
  });

  topSearch.addEventListener("input", syncSearchInputsFromTop);
  sidebarSearch.addEventListener("input", syncSearchInputsFromSidebar);

  topSearch.addEventListener("keydown", handleSearchKeydown);
  sidebarSearch.addEventListener("keydown", handleSearchKeydown);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;

    const insideTopSearch = topSearch.contains(event.target) || topSearchSuggestions.contains(event.target);
    const insideSidebarSearch = sidebarSearch.contains(event.target);
    const insideSettings = settingsMenu.contains(event.target) || settingsMenuToggle.contains(event.target);

    if (!insideTopSearch && !insideSidebarSearch) {
      hideAllSearchSuggestions();
    }

    if (!insideSettings) {
      closeSettingsMenu();
    }
  });

  topbarCopy?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  fuzzySearchToggle.addEventListener("change", () => {
    filters.fuzzy = fuzzySearchToggle.checked;
    _persistPreferences();
    applyFilters();
  });

  showHiddenToggle.addEventListener("change", () => {
    filters.showHidden = showHiddenToggle.checked;
    _persistPreferences();
    applyFilters();
  });

  inlineAutocompleteToggle.addEventListener("change", () => {
    filters.inlineAutocomplete = inlineAutocompleteToggle.checked;
    _persistPreferences();
    updateInlineAutocomplete();
    applyFilters();
  });

  phenomenonAnimationToggle?.addEventListener("change", () => {
    filters.phenomenonAnimation = phenomenonAnimationToggle.checked;
    setPhenomenonAnimation(filters.phenomenonAnimation);
    _persistPreferences();
  });

  riskyHellridingToggle?.addEventListener("change", () => {
    filters.riskyHellriding = riskyHellridingToggle.checked;
    setRiskyHellriding(filters.riskyHellriding);
    _persistPreferences();
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
    _persistPreferences();
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  groupBySelect.addEventListener("change", () => {
    displayState.groupBy = groupBySelect.value;
    groupTagPickerWrap.classList.toggle("hidden", displayState.groupBy !== "tag");
    _persistPreferences();
    paginationState.currentPage = 1;
    paginationState.infiniteLoadedCount = paginationState.pageSize;
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  groupTagSelect.addEventListener("change", () => {
    displayState.groupTag = groupTagSelect.value;
    _persistPreferences();
    paginationState.currentPage = 1;
    paginationState.infiniteLoadedCount = paginationState.pageSize;
    renderGallery();
    scheduleStackActiveUpdate();
    updateUrlFromState();
  });

  sidebarToggle.addEventListener("click", closeSidebar);
  sidebarLip.addEventListener("click", toggleSidebar);
  sidebarBackdrop.addEventListener("click", closeSidebar);

  settingsMenuToggle.addEventListener("click", toggleSettingsMenu);
  settingsClearPreferencesButton.addEventListener("click", showClearPrefsConfirm);
  settingsContactDeveloperLink.addEventListener("click", closeSettingsMenu);
  settingsExportProfileButton?.addEventListener("click", exportProfile);
  settingsImportProfileButton?.addEventListener("click", importProfile);
  confirmOkButton?.addEventListener("click", executeClearAll);
  confirmCancelButton?.addEventListener("click", hideClearPrefsConfirm);
  confirmDialog?.addEventListener("click", (event) => {
    if (event.target === confirmDialog) hideClearPrefsConfirm();
  });

  randomCardButton.addEventListener("click", (event) => {
    if (suppressRandomClick) {
      suppressRandomClick = false;
      event.preventDefault();
      return;
    }

    if (event.altKey) {
      event.preventDefault();
      triggerChaosMode();
      return;
    }

    openRandomCard();
  });

  randomCardButton.addEventListener("pointerdown", handleRandomPointerDown);
  randomCardButton.addEventListener("pointerup", clearRandomLongPress);
  randomCardButton.addEventListener("pointercancel", clearRandomLongPress);
  randomCardButton.addEventListener("pointerleave", clearRandomLongPress);

  playGameButton?.addEventListener("click", () => {
    showGameModeDialog();
  });

  modal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeModal();
    }
  });

  modalCloseButton.addEventListener("click", closeModal);
  modalPrevButton.addEventListener("click", showPreviousCard);
  modalNextButton.addEventListener("click", showNextCard);
  modalCopyLinkButton.addEventListener("click", copyCurrentCardLink);

  modalImageWrap?.addEventListener("click", flipModalImage);

  modalTagList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.dataset.tag;
    if (!tag) return;
    event.preventDefault();
    event.stopPropagation();
    toggleTagFilter(tag);
  });

  activeFiltersEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.dataset.tag;
    if (!tag) return;
    event.preventDefault();
    toggleTagFilter(tag);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (confirmDialog && !confirmDialog.classList.contains("hidden")) {
        hideClearPrefsConfirm();
        return;
      }

      if (isGameActive()) {
        const readerView = document.getElementById("game-reader-view");
        if (readerView && !readerView.classList.contains("hidden")) {
          closeGameReaderView();
          return;
        }
        return;
      }

      if (!topSearchSuggestions.classList.contains("hidden")) {
        hideAllSearchSuggestions();
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

      if (isDeckPanelOpen()) {
        closeDeckPanel();
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
        setActiveSearchSurface("top");
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
        document.getElementById("gallery").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey && !modal.classList.contains("hidden")) {
      event.preventDefault();
      showNextCard();
    }

    if (event.key.toLowerCase() === "p" && !event.metaKey && !event.ctrlKey && !event.altKey && !modal.classList.contains("hidden")) {
      event.preventDefault();
      showPreviousCard();
    }

    if (modal.classList.contains("hidden")) return;

    if (event.key === "ArrowLeft") showPreviousCard();
    if (event.key === "ArrowRight") showNextCard();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#play" || (!window.location.hash && isGameActive())) {
      syncGameHash();
      return;
    }

    const key = getCardKeyFromHash();

    if (!key) {
      if (!modal.classList.contains("hidden")) closeModal(false);
      return;
    }

    openModalByKey(key, false);
  });

  window.addEventListener("popstate", () => {
    syncGameHash();

    readStateFromUrl();
    filters.tags = reconcileSelectedTags(filters.tags, sharedState.allCards);

    if (displayState.groupTag) {
      displayState.groupTag = reconcileSelectedTags(
        new Set([displayState.groupTag]),
        sharedState.allCards
      ).values().next().value || "";
    }

    applyStoredPreferencesToUI();
    buildGroupTagOptions(sharedState.allCards);
    syncTagFilterUI();
    applyFilters({ updateUrl: false, preservePage: true });
    tryOpenCardFromHash();
  });

  window.addEventListener("scroll", scheduleStackActiveUpdate, { passive: true });
  window.addEventListener("resize", scheduleStackActiveUpdate);
}

// \u2500\u2500 Sidebar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function openSidebar() {
  sidebar.classList.remove("collapsed");
  sidebar.classList.add("open");
  sidebarBackdrop.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebar.classList.add("collapsed");
  sidebarBackdrop.classList.add("hidden");
  hideAllSearchSuggestions();
  sidebarContent.scrollTop = 0;
}

function toggleSidebar() {
  if (sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
}

// \u2500\u2500 Settings menu \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function openSettingsMenu() {
  settingsMenu.classList.remove("hidden");
  settingsMenuToggle.setAttribute("aria-expanded", "true");
}

function closeSettingsMenu() {
  settingsMenu.classList.add("hidden");
  settingsMenuToggle.setAttribute("aria-expanded", "false");
  settingsMenu.scrollTop = 0;
}

function toggleSettingsMenu() {
  if (settingsMenu.classList.contains("hidden")) openSettingsMenu();
  else closeSettingsMenu();
}

// \u2500\u2500 Confirm dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function showClearPrefsConfirm() {
  closeSettingsMenu();
  confirmDialog?.classList.remove("hidden");
  document.body.classList.add("confirm-open");
}

function hideClearPrefsConfirm() {
  confirmDialog?.classList.add("hidden");
  document.body.classList.remove("confirm-open");
}

function executeClearAll() {
  hideClearPrefsConfirm();

  localStorage.removeItem(STORAGE_KEY);
  clearAllDecks();
  clearTutorialFlags();

  filters.search = "";
  filters.tags.clear();
  filters.fuzzy = false;
  filters.inlineAutocomplete = true;
  filters.showHidden = false;
  filters.riskyHellriding = true;
  setRiskyHellriding(true);

  displayState.viewMode = "grid";
  displayState.groupBy = "none";
  displayState.groupTag = "";

  paginationState.currentPage = 1;
  paginationState.pageSize = 20;
  paginationState.mode = "paginated";
  paginationState.infiniteLoadedCount = 20;

  themeController.setTheme("system", {
    silent: true,
    paletteOverride: "standard"
  });

  topSearch.value = "";
  sidebarSearch.value = "";
  const tsg = document.getElementById("top-search-ghost");
  const ssg = document.getElementById("sidebar-search-ghost");
  if (tsg) tsg.value = "";
  if (ssg) ssg.value = "";

  applyStoredPreferencesToUI();
  buildGroupTagOptions(sharedState.allCards);
  syncTagFilterUI();
  hideAllSearchSuggestions();
  applyFilters();

  showToast("All preferences and decks cleared.");
}

// \u2500\u2500 Profile export / import \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function exportProfile() {
  const prefsObj = {
    viewMode: displayState.viewMode,
    groupBy: displayState.groupBy,
    groupTag: displayState.groupTag,
    fuzzySearch: filters.fuzzy,
    inlineAutocomplete: filters.inlineAutocomplete,
    showHidden: filters.showHidden,
    theme: themeController.getTheme(),
    themePalette: themeController.getPalette(),
    pageSize: paginationState.pageSize,
    paginationMode: paginationState.mode,
    phenomenonAnimation: filters.phenomenonAnimation,
    riskyHellriding: filters.riskyHellriding
  };

  const seed = encodeProfileData(prefsObj);
  if (!seed) { showToast("Export failed."); return; }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(seed)
      .then(() => showToast("Profile seed copied to clipboard."))
      .catch(() => prompt("Copy your profile seed:", seed));
  } else {
    prompt("Copy your profile seed:", seed);
  }
  closeSettingsMenu();
}

function importProfile() {
  const seed = prompt("Paste a profile seed to import:");
  if (!seed?.trim()) return;

  const data = decodeProfileData(seed.trim());
  if (!data || data.v !== 1) { showToast("Invalid profile seed."); return; }

  if (data.p) {
    const p = data.p;
    if (["grid", "single", "stack", "list"].includes(p.viewMode)) displayState.viewMode = p.viewMode;
    if (["none", "tag"].includes(p.groupBy)) displayState.groupBy = p.groupBy;
    if (typeof p.groupTag === "string") displayState.groupTag = p.groupTag;
    if (typeof p.fuzzySearch === "boolean") filters.fuzzy = p.fuzzySearch;
    if (typeof p.inlineAutocomplete === "boolean") filters.inlineAutocomplete = p.inlineAutocomplete;
    if (typeof p.showHidden === "boolean") filters.showHidden = p.showHidden;
    if (typeof p.phenomenonAnimation === "boolean") {
      filters.phenomenonAnimation = p.phenomenonAnimation;
      setPhenomenonAnimation(filters.phenomenonAnimation);
    }
    if (typeof p.riskyHellriding === "boolean") {
      filters.riskyHellriding = p.riskyHellriding;
      setRiskyHellriding(filters.riskyHellriding);
    }
    if ([10, 20, 50, 100].includes(p.pageSize)) paginationState.pageSize = p.pageSize;
    if (["paginated", "infinite"].includes(p.paginationMode)) paginationState.mode = p.paginationMode;

    const validThemes = ["system", "dark", "light"];
    const validPalettes = ["standard", "gruvbox", "atom", "dracula", "solarized", "nord", "catppuccin", "scryfall"];
    const newTheme = validThemes.includes(p.theme) ? p.theme : "system";
    const newPalette = validPalettes.includes(p.themePalette) ? p.themePalette : "standard";
    themeController.setTheme(newTheme, { silent: true, paletteOverride: newPalette });
  }

  if (data.d) {
    importProfileDecks(data.d);
  }

  _persistPreferences();
  applyStoredPreferencesToUI();
  buildGroupTagOptions(sharedState.allCards);
  syncTagFilterUI();
  applyFilters();
  closeSettingsMenu();

  showToast("Profile imported.");
}

// \u2500\u2500 Random card / chaos mode \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function openRandomCard() {
  if (!sharedState.filteredCards.length) return;
  const randomIndex = Math.floor(Math.random() * sharedState.filteredCards.length);
  openModalByKey(sharedState.filteredCards[randomIndex].key, true);
}

function handleRandomPointerDown(event) {
  if (event.pointerType === "mouse") return;
  clearRandomLongPress();
  randomLongPressTimer = window.setTimeout(() => {
    suppressRandomClick = true;
    triggerChaosMode();
  }, 650);
}

function clearRandomLongPress() {
  if (randomLongPressTimer !== null) {
    window.clearTimeout(randomLongPressTimer);
    randomLongPressTimer = null;
  }
}

function triggerChaosIcon() {
  if (!randomCardButton) return;
  randomCardButton.classList.add("is-chaos");
  window.clearTimeout(randomIconResetTimer);
  randomIconResetTimer = window.setTimeout(() => {
    randomCardButton.classList.remove("is-chaos");
  }, 1200);
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function sampleTags(max = 3) {
  const allTags = [...new Set(sharedState.allCards.flatMap((card) => card.tags))];
  const count = Math.floor(Math.random() * (max + 1));
  const selected = new Set();

  while (selected.size < count && allTags.length > 0) {
    selected.add(randomFrom(allTags));
  }

  return selected;
}

function triggerChaosMode() {
  if (!sharedState.allCards.length) return;

  triggerChaosIcon();

  const randomTheme = randomFrom(THEME_PREFERENCES);
  const randomPalette = randomFrom(ALL_PALETTES);
  themeController.setTheme(randomTheme, {
    silent: true,
    paletteOverride: randomPalette,
    animate: true
  });

  filters.fuzzy = Math.random() < 0.5;
  filters.inlineAutocomplete = Math.random() < 0.5;
  filters.tags = sampleTags(3);

  const searchModeRoll = Math.random();
  if (searchModeRoll < 0.33) {
    filters.search = "";
  } else if (searchModeRoll < 0.66) {
    filters.search = randomFrom(sharedState.allCards).displayName;
  } else {
    filters.search = `tag:${randomFrom([...new Set(sharedState.allCards.flatMap((card) => card.tags))])}`;
  }

  displayState.viewMode = randomFrom(VIEW_MODES);
  displayState.groupBy = randomFrom(GROUP_MODES);
  displayState.groupTag = displayState.groupBy === "tag"
    ? randomFrom([...new Set(sharedState.allCards.flatMap((card) => card.tags))])
    : "";

  topSearch.value = filters.search;
  sidebarSearch.value = filters.search;
  const tsg = document.getElementById("top-search-ghost");
  const ssg = document.getElementById("sidebar-search-ghost");
  if (tsg) tsg.value = "";
  if (ssg) ssg.value = "";

  if (fuzzySearchToggle) fuzzySearchToggle.checked = filters.fuzzy;
  if (inlineAutocompleteToggle) inlineAutocompleteToggle.checked = filters.inlineAutocomplete;
  viewModeSelect.value = displayState.viewMode;
  groupBySelect.value = displayState.groupBy;
  groupTagPickerWrap.classList.toggle("hidden", displayState.groupBy !== "tag");
  buildGroupTagOptions(sharedState.allCards);
  syncTagFilterUI();

  applyFilters();
  renderGallery();
  scheduleStackActiveUpdate();

  showToast("Chaos unleashed.");
}

// \u2500\u2500 Utilities \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

// \u2500\u2500 Service worker registration \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
