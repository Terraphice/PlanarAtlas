// ── gallery-ui.js ─────────────────────────────────────────────────────────────
// ThemeController (palette and mode cycling) and ToastManager (ephemeral
// notification toasts).

const STANDARD_THEME_ORDER = ["system", "dark", "light"];
const THEME_GROUP_ORDER = ["azorius", "boros", "selesnya", "orzhov"];
const SPECIAL_THEME_BY_BASE = {
  boros: "newphyrexian",
  selesnya: "phyrexian"
};
const BASE_THEME_BY_SPECIAL = {
  newphyrexian: "boros",
  phyrexian: "selesnya"
};
const THEME_ICONS = {
  system: "◐",
  dark: "☾",
  light: "☀"
};

const THEME_GROUP_LABELS = {
  azorius: { light: "Azorius", dark: "Dimir" },
  boros: { light: "Boros", dark: "Rakdos" },
  selesnya: { light: "Selesnya", dark: "Golgari" },
  orzhov: { light: "Orzhov", dark: "Orzhov" },
  newphyrexian: { light: "New Phyrexian", dark: "New Phyrexian" },
  phyrexian: { light: "Phyrexian", dark: "Phyrexian" }
};

const PHYREXIAN_FONTS = [
  '"Phyrexian Language"',
  '"Noto Sans"',
  "sans-serif"
].join(", ");

function isAltPaletteEvent(event) {
  return Boolean(event?.altKey);
}

function getVisualThemeName(themeGroup, resolvedMode) {
  const labels = THEME_GROUP_LABELS[themeGroup] || THEME_GROUP_LABELS.azorius;
  return labels[resolvedMode] || labels.light;
}

function getResolvableThemeGroup(themeGroup) {
  if (THEME_GROUP_ORDER.includes(themeGroup)) return themeGroup;
  if (themeGroup === "newphyrexian") return "boros";
  if (themeGroup === "phyrexian") return "selesnya";
  return "azorius";
}

function updateManaPhyrexianSymbols(enablePhyrexian) {
  const selector = "i.ms, span.ms";
  const iconNodes = document.querySelectorAll(selector);

  iconNodes.forEach((node) => {
    const hasPlaneswalker =
      node.classList.contains("ms-planeswalker")
      || node.classList.contains("ms-pw")
      || node.dataset.originalManaIcon === "planeswalker";

    if (enablePhyrexian) {
      if (!hasPlaneswalker) return;
      if (!node.dataset.originalManaIcon) node.dataset.originalManaIcon = "planeswalker";
      node.classList.remove("ms-planeswalker", "ms-pw");
      node.classList.add("ms-phyrexian", "ms-p");
      return;
    }

    if (node.dataset.originalManaIcon !== "planeswalker") return;
    node.classList.remove("ms-phyrexian", "ms-p");
    node.classList.add("ms-planeswalker");
    delete node.dataset.originalManaIcon;
  });
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
  themeSelect,
  initialTheme = "system",
  initialThemeGroup = "azorius",
  onChange = () => {},
  onUnavailableSecretTheme = () => {}
}) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const glyph = button.querySelector(".theme-toggle-glyph");

  let theme = STANDARD_THEME_ORDER.includes(initialTheme) ? initialTheme : "system";
  let themeGroup = [...THEME_GROUP_ORDER, "newphyrexian", "phyrexian"].includes(initialThemeGroup)
    ? initialThemeGroup
    : "azorius";
  let suppressClick = false;
  let longPressTimer = null;

  function resolveMode(preference) {
    return preference === "system" ? (media.matches ? "dark" : "light") : preference;
  }

  function isPhyrexianThemeActive() {
    return themeGroup === "newphyrexian" || themeGroup === "phyrexian";
  }

  function getAnnouncementLabel() {
    return `${theme[0].toUpperCase()}${theme.slice(1)} · ${getVisualThemeName(themeGroup, resolveMode(theme))}`;
  }

  function getCurrentThemeOptions() {
    const resolvedMode = resolveMode(theme);
    const names = THEME_GROUP_ORDER.map((group) => ({
      value: group,
      label: getVisualThemeName(group, resolvedMode)
    }));

    if (themeGroup === "newphyrexian") {
      names.splice(2, 0, { value: "newphyrexian", label: "New Phyrexian" });
    }

    if (themeGroup === "phyrexian") {
      names.splice(3, 0, { value: "phyrexian", label: "Phyrexian" });
    }

    return names;
  }

  function applyTheme({ animate = false } = {}) {
    const resolvedMode = resolveMode(theme);
    const resolvedThemeGroup = getResolvableThemeGroup(themeGroup);

    document.documentElement.dataset.theme = resolvedMode;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.themeGroup = themeGroup;
    document.documentElement.dataset.themeBase = resolvedThemeGroup;
    document.documentElement.dataset.themeName = getVisualThemeName(themeGroup, resolvedMode).toLowerCase().replace(/\s+/g, "-");
    document.documentElement.dataset.phyrexian = isPhyrexianThemeActive() ? "true" : "false";

    button.dataset.mode = theme;
    button.setAttribute(
      "aria-label",
      `Theme: ${getAnnouncementLabel()}. Click to cycle dark/light/system mode.`
    );
    button.title = getAnnouncementLabel();

    if (themeSelect) {
      const options = getCurrentThemeOptions();
      themeSelect.innerHTML = "";
      options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        themeSelect.append(optionEl);
      });
      themeSelect.value = themeGroup;
    }

    document.documentElement.style.setProperty(
      "--site-font-family",
      isPhyrexianThemeActive()
        ? `${PHYREXIAN_FONTS}, var(--site-font-family-default)`
        : "var(--site-font-family-default)"
    );

    updateManaPhyrexianSymbols(isPhyrexianThemeActive());

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
    themeGroupOverride = themeGroup
  } = {}) {
    theme = STANDARD_THEME_ORDER.includes(nextTheme) ? nextTheme : "system";
    themeGroup = [...THEME_GROUP_ORDER, "newphyrexian", "phyrexian"].includes(themeGroupOverride) ? themeGroupOverride : "azorius";
    applyTheme({ animate });
    if (!silent) onChange(theme, themeGroup);
  }

  function setThemeGroup(nextThemeGroup, { animate = false, silent = false } = {}) {
    setTheme(theme, {
      animate,
      silent,
      themeGroupOverride: nextThemeGroup
    });
  }

  function cycleStandardTheme() {
    const currentIndex = STANDARD_THEME_ORDER.indexOf(theme);
    const nextTheme = STANDARD_THEME_ORDER[(currentIndex + 1) % STANDARD_THEME_ORDER.length];
    setTheme(nextTheme, { animate: true });
  }

  function toggleSecretTheme() {
    const resolvedMode = resolveMode(theme);
    const visibleThemeName = getVisualThemeName(themeGroup, resolvedMode);

    if (themeGroup === "newphyrexian" || themeGroup === "phyrexian") {
      const fallbackTheme = BASE_THEME_BY_SPECIAL[themeGroup];
      setThemeGroup(fallbackTheme, { animate: true });
      return;
    }

    if (visibleThemeName === "Boros") {
      setThemeGroup(SPECIAL_THEME_BY_BASE.boros, { animate: true });
      return;
    }

    if (visibleThemeName === "Golgari") {
      setThemeGroup(SPECIAL_THEME_BY_BASE.selesnya, { animate: true });
      return;
    }

    onUnavailableSecretTheme();
  }

  function handleButtonClick(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }

    if (isAltPaletteEvent(event)) {
      event.preventDefault();
      toggleSecretTheme();
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
      suppressClick = true;
      toggleSecretTheme();
    }, 650);
  }

  function handlePointerUp() {
    clearLongPressTimer();
  }

  function handlePointerCancel() {
    clearLongPressTimer();
  }

  button.addEventListener("click", handleButtonClick);
  button.addEventListener("pointerdown", handlePointerDown);
  button.addEventListener("pointerup", handlePointerUp);
  button.addEventListener("pointercancel", handlePointerCancel);
  button.addEventListener("pointerleave", handlePointerCancel);

  themeSelect?.addEventListener("change", () => {
    setThemeGroup(themeSelect.value, { animate: true });
  });

  media.addEventListener?.("change", () => {
    if (theme === "system") {
      applyTheme();
    }
  });

  const manaObserver = new MutationObserver(() => {
    if (!isPhyrexianThemeActive()) return;
    updateManaPhyrexianSymbols(true);
  });
  manaObserver.observe(document.body, { childList: true, subtree: true });

  applyTheme();

  return {
    getTheme() {
      return theme;
    },
    getThemeGroup() {
      return themeGroup;
    },
    getResolvedThemeName() {
      return getVisualThemeName(themeGroup, resolveMode(theme));
    },
    setTheme(nextTheme, options = {}) {
      setTheme(nextTheme, options);
    },
    setThemeGroup(nextThemeGroup, options = {}) {
      setThemeGroup(nextThemeGroup, options);
    }
  };
}
