// ── gallery-ui.js ─────────────────────────────────────────────────────────────
// ThemeController (theme family + mode cycling) and ToastManager (ephemeral
// notification toasts).

const STANDARD_THEME_ORDER = ["system", "dark", "light"];

const THEME_FAMILIES = {
  azorius: {
    labels: { light: "Azorius", dark: "Dimir" },
    guildIcons: { light: "ms-guild-azorius", dark: "ms-guild-dimir" },
    resolvedThemes: { light: "azorius", dark: "dimir" }
  },
  boros: {
    labels: { light: "Boros", dark: "Rakdos" },
    guildIcons: { light: "ms-guild-boros", dark: "ms-guild-rakdos" },
    resolvedThemes: { light: "boros", dark: "rakdos" }
  },
  selesnya: {
    labels: { light: "Selesnya", dark: "Golgari" },
    guildIcons: { light: "ms-guild-selesnya", dark: "ms-guild-golgari" },
    resolvedThemes: { light: "selesnya", dark: "golgari" }
  },
  orzhov: {
    labels: { light: "Orzhov", dark: "Orzhov" },
    guildIcons: { light: "ms-guild-orzhov", dark: "ms-guild-orzhov" },
    resolvedThemes: { light: "orzhov-light", dark: "orzhov-dark" }
  },
  "new-phyrexian": {
    labels: { light: "New Phyrexian", dark: "New Phyrexian" },
    guildIcons: { light: "ms-ability-phyrexian", dark: "ms-ability-phyrexian" },
    resolvedThemes: { light: "new-phyrexian", dark: "new-phyrexian" },
    phyrexianScript: true,
    phyrexianManaSymbol: true
  },
  phyrexian: {
    labels: { light: "Phyrexian", dark: "Phyrexian" },
    guildIcons: { light: "ms-ability-phyrexian", dark: "ms-ability-phyrexian" },
    resolvedThemes: { light: "phyrexian", dark: "phyrexian" },
    phyrexianScript: true,
    phyrexianManaSymbol: true
  }
};

const MODE_THEME_OPTIONS = {
  light: ["azorius", "boros", "selesnya", "orzhov"],
  dark: ["azorius", "boros", "selesnya", "orzhov"]
};

const SECRET_ALT_BY_THEME = {
  boros: "new-phyrexian",
  golgari: "phyrexian",
  "new-phyrexian": "boros",
  phyrexian: "selesnya"
};
const SECRET_THEME_FAMILIES = new Set(["new-phyrexian", "phyrexian"]);

const THEME_ICONS = {
  system: "◐",
  dark: "☾",
  light: "☀"
};

const THEME_LABELS = {
  system: "System",
  dark: "Dark",
  light: "Light"
};

function isAltThemeEvent(event) {
  return Boolean(event?.altKey);
}

export function initToastManager(container) {
  let currentToast = null;
  let hideTimer = null;
  let removeTimer = null;

  return function showToast(message, duration = 1400) {
    clearTimeout(hideTimer);
    clearTimeout(removeTimer);

    if (currentToast) {
      currentToast.remove();
      currentToast = null;
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    currentToast = toast;

    hideTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");

      removeTimer = window.setTimeout(() => {
        if (toast === currentToast) currentToast = null;
        toast.remove();
      }, 180);
    }, duration);
  };
}

export function initThemeController({
  button,
  themeSelect = null,
  themeMenu = null,
  themeTrigger = null,
  initialTheme = "system",
  initialThemeFamily = "azorius",
  onChange = () => {},
  onSecretTheme = () => {}
}) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const glyph = button.querySelector(".theme-toggle-glyph");

  let theme = STANDARD_THEME_ORDER.includes(initialTheme) ? initialTheme : "system";
  let themeFamily = THEME_FAMILIES[initialThemeFamily] ? initialThemeFamily : "azorius";
  let suppressClick = false;
  let longPressTimer = null;
  let menuOpen = false;

  function resolveThemeMode(preference) {
    return preference === "system" ? (media.matches ? "dark" : "light") : preference;
  }

  function getResolvedThemeName() {
    const mode = resolveThemeMode(theme);
    const family = THEME_FAMILIES[themeFamily] || THEME_FAMILIES.azorius;
    return family.resolvedThemes[mode];
  }

  function isPhyrexianScriptEnabled() {
    const family = THEME_FAMILIES[themeFamily] || THEME_FAMILIES.azorius;
    return Boolean(family.phyrexianScript);
  }

  function isPhyrexianManaSymbolEnabled() {
    const family = THEME_FAMILIES[themeFamily] || THEME_FAMILIES.azorius;
    return Boolean(family.phyrexianManaSymbol);
  }

  function getThemeLabelForCurrentMode() {
    const mode = resolveThemeMode(theme);
    const family = THEME_FAMILIES[themeFamily] || THEME_FAMILIES.azorius;
    return family.labels[mode];
  }

  function getAnnouncementLabel() {
    const modeLabel = THEME_LABELS[theme];
    const themeLabel = getThemeLabelForCurrentMode();
    return `${modeLabel} · ${themeLabel}`;
  }

  function updateThemeOptions() {
    if (!themeSelect && !themeMenu) return;

    const mode = resolveThemeMode(theme);
    const options = [...MODE_THEME_OPTIONS[mode]];
    const currentFamily = THEME_FAMILIES[themeFamily] ? themeFamily : "azorius";
    if (SECRET_THEME_FAMILIES.has(currentFamily)) options.push(currentFamily);

    if (themeSelect) themeSelect.innerHTML = "";
    if (themeMenu) themeMenu.innerHTML = "";

    for (const optionFamily of options) {
      const family = THEME_FAMILIES[optionFamily];
      const optionLabel = `— ${family.labels[mode]}`;

      if (themeSelect) {
        const option = document.createElement("option");
        option.value = optionFamily;
        option.textContent = optionLabel;
        themeSelect.appendChild(option);
      }

      if (themeMenu) {
        const optionButton = document.createElement("button");
        optionButton.type = "button";
        optionButton.className = "settings-theme-option";
        if (optionFamily === currentFamily) optionButton.classList.add("is-active");
        optionButton.dataset.themeFamily = optionFamily;
        optionButton.innerHTML = `<i class="ms ${family.guildIcons[mode]}" aria-hidden="true"></i><span>${optionLabel}</span>`;
        themeMenu.appendChild(optionButton);
      }
    }

    if (themeSelect) {
      if (options.includes(currentFamily)) {
        themeSelect.value = currentFamily;
      } else {
        themeSelect.selectedIndex = -1;
      }
    }

    if (themeTrigger) {
      const family = THEME_FAMILIES[currentFamily];
      themeTrigger.innerHTML = `<i class="ms ${family.guildIcons[mode]}" aria-hidden="true"></i><span>— ${family.labels[mode]}</span>`;
    }
  }

  function setMenuOpen(nextOpen) {
    menuOpen = nextOpen;
    if (!themeMenu || !themeTrigger) return;
    themeMenu.classList.toggle("hidden", !menuOpen);
    themeTrigger.setAttribute("aria-expanded", menuOpen ? "true" : "false");
  }

  function syncPlaneswalkerManaGlyphs() {
    const usePhyrexian = isPhyrexianManaSymbolEnabled();
    const icons = document.querySelectorAll("i.ms-planeswalker, i.ms-phyrexian, i.ms-p, i.ms-ability-phyrexian");
    for (const icon of icons) {
      icon.classList.remove("ms-planeswalker", "ms-phyrexian", "ms-p", "ms-cost", "ms-ability-phyrexian");
      if (usePhyrexian) {
        icon.classList.add("ms-ability-phyrexian");
      } else {
        icon.classList.add("ms-planeswalker");
      }
    }
  }

  function applyTheme({ animate = false } = {}) {
    const resolvedMode = resolveThemeMode(theme);
    const resolvedThemeName = getResolvedThemeName();

    updateThemeOptions();

    document.documentElement.dataset.theme = resolvedMode;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.themeName = resolvedThemeName;
    document.documentElement.dataset.themeFamily = themeFamily;
    document.documentElement.dataset.phyrexianScript = isPhyrexianScriptEnabled() ? "true" : "false";
    document.documentElement.dataset.phyrexianMana = isPhyrexianManaSymbolEnabled() ? "true" : "false";
    syncPlaneswalkerManaGlyphs();

    button.dataset.mode = theme;
    button.dataset.themeFamily = themeFamily;
    button.setAttribute(
      "aria-label",
      `Theme: ${getAnnouncementLabel()}. Click to cycle dark/light mode.`
    );
    button.title = getAnnouncementLabel();

    if (!glyph) return;

    if (animate) {
      button.classList.add("is-changing");
      window.setTimeout(() => {
        glyph.textContent = THEME_ICONS[theme];
        button.classList.remove("is-changing");
      }, 90);
    } else {
      glyph.textContent = THEME_ICONS[theme];
    }
  }

  function setTheme(nextTheme, {
    animate = false,
    silent = false,
    themeFamilyOverride = themeFamily,
    allowSecretFamily = false
  } = {}) {
    theme = STANDARD_THEME_ORDER.includes(nextTheme) ? nextTheme : "system";

    const mode = resolveThemeMode(theme);
    const validFamilies = MODE_THEME_OPTIONS[mode];
    const candidateFamily = THEME_FAMILIES[themeFamilyOverride] ? themeFamilyOverride : "azorius";
    const isAllowedSecret = SECRET_THEME_FAMILIES.has(candidateFamily) && (allowSecretFamily || themeFamily === candidateFamily);
    themeFamily = validFamilies.includes(candidateFamily) || isAllowedSecret ? candidateFamily : validFamilies[0];

    applyTheme({ animate });
    if (!silent) onChange(theme, themeFamily, getThemeLabelForCurrentMode());
  }

  function cycleStandardTheme() {
    const currentIndex = STANDARD_THEME_ORDER.indexOf(theme);
    const nextTheme = STANDARD_THEME_ORDER[(currentIndex + 1) % STANDARD_THEME_ORDER.length];
    setTheme(nextTheme, { animate: true });
  }

  function tryToggleSecretTheme() {
    const currentThemeName = getResolvedThemeName();
    const secretFamily = SECRET_ALT_BY_THEME[currentThemeName];
    if (!secretFamily) return false;

    setTheme(theme, {
      animate: true,
      themeFamilyOverride: secretFamily,
      allowSecretFamily: true
    });
    onSecretTheme(secretFamily, currentThemeName);

    return true;
  }

  function handleButtonClick(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }

    if (isAltThemeEvent(event)) {
      event.preventDefault();
      tryToggleSecretTheme();
      return;
    }

    cycleStandardTheme();
  }

  function clearLongPressTimer() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse") return;
    clearLongPressTimer();

    longPressTimer = window.setTimeout(() => {
      const changed = tryToggleSecretTheme();
      suppressClick = changed;
    }, 650);
  }

  function handlePointerUp() {
    clearLongPressTimer();
  }

  function handlePointerCancel() {
    clearLongPressTimer();
  }

  function handleThemeSelectChange() {
    if (!themeSelect) return;
    const nextFamily = themeSelect.value;
    setTheme(theme, {
      themeFamilyOverride: nextFamily
    });
  }

  function handleThemeTriggerClick(event) {
    event.preventDefault();
    setMenuOpen(!menuOpen);
  }

  function handleThemeMenuClick(event) {
    const optionButton = event.target.closest?.(".settings-theme-option");
    if (!optionButton) return;
    const nextFamily = optionButton.dataset.themeFamily;
    if (!nextFamily) return;
    setTheme(theme, { themeFamilyOverride: nextFamily });
    setMenuOpen(false);
  }

  function handleDocumentClick(event) {
    if (!menuOpen || !themeMenu || !themeTrigger) return;
    if (themeMenu.contains(event.target) || themeTrigger.contains(event.target)) return;
    setMenuOpen(false);
  }

  button.addEventListener("click", handleButtonClick);
  button.addEventListener("pointerdown", handlePointerDown);
  button.addEventListener("pointerup", handlePointerUp);
  button.addEventListener("pointercancel", handlePointerCancel);
  button.addEventListener("pointerleave", handlePointerCancel);
  themeSelect?.addEventListener("change", handleThemeSelectChange);
  themeTrigger?.addEventListener("click", handleThemeTriggerClick);
  themeMenu?.addEventListener("click", handleThemeMenuClick);
  document.addEventListener("click", handleDocumentClick);

  media.addEventListener?.("change", () => {
    if (theme === "system") {
      applyTheme();
      onChange(theme, themeFamily, getThemeLabelForCurrentMode());
    }
  });

  applyTheme();

  return {
    getTheme() {
      return theme;
    },
    getThemeFamily() {
      return themeFamily;
    },
    getResolvedThemeName() {
      return getResolvedThemeName();
    },
    getResolvedThemeMode() {
      return resolveThemeMode(theme);
    },
    setTheme(nextTheme, options = {}) {
      setTheme(nextTheme, options);
    },
    updateThemeOptions
  };
}
