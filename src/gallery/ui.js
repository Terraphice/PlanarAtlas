// ── gallery-ui.js ─────────────────────────────────────────────────────────────
// ThemeController (guild/faction and mode cycling) and ToastManager (ephemeral
// notification toasts).

const STANDARD_THEME_ORDER = ["system", "dark", "light"];
const THEME_FAMILY_ORDER = ["azorius_dimir", "boros_rakdos", "selesnya_golgari", "orzhov", "new_phyrexian", "phyrexian"];

const THEME_ICONS = {
  system: "◐",
  dark: "☾",
  light: "☀"
};

const THEME_MODE_LABELS = {
  system: "System",
  dark: "Dark",
  light: "Light"
};

const FAMILY_LABELS = {
  azorius_dimir: { light: "Azorius", dark: "Dimir" },
  boros_rakdos: { light: "Boros", dark: "Rakdos" },
  selesnya_golgari: { light: "Selesnya", dark: "Golgari" },
  orzhov: { light: "Orzhov", dark: "Orzhov" },
  new_phyrexian: { light: "New Phyrexian", dark: "New Phyrexian" },
  phyrexian: { light: "Phyrexian", dark: "Phyrexian" }
};

const SECRET_FAMILIES = new Set(["new_phyrexian", "phyrexian"]);

function isSecretThemeEvent(event) {
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
  initialTheme = "system",
  initialFamily = "azorius_dimir",
  onChange = () => {},
  onSecretThemeUnavailable = () => {}
}) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const glyph = button.querySelector(".theme-toggle-glyph");

  let theme = STANDARD_THEME_ORDER.includes(initialTheme) ? initialTheme : "system";
  let family = THEME_FAMILY_ORDER.includes(initialFamily) ? initialFamily : "azorius_dimir";
  let suppressClick = false;
  let longPressTimer = null;

  function resolveTheme(preference) {
    return preference === "system" ? (media.matches ? "dark" : "light") : preference;
  }

  function getResolvedThemeName() {
    const resolved = resolveTheme(theme);
    return FAMILY_LABELS[family]?.[resolved] || FAMILY_LABELS.azorius_dimir[resolved];
  }

  function isPhyrexianScriptFamily(nextFamily = family) {
    return nextFamily === "new_phyrexian" || nextFamily === "phyrexian";
  }

  function getAnnouncementLabel() {
    return `${THEME_MODE_LABELS[theme]} · ${getResolvedThemeName()}`;
  }

  function getThemeOptions() {
    const resolved = resolveTheme(theme);
    return THEME_FAMILY_ORDER.map((value) => ({
      value,
      label: FAMILY_LABELS[value][resolved],
      secret: SECRET_FAMILIES.has(value)
    }));
  }

  function applyTheme({ animate = false } = {}) {
    const resolvedTheme = resolveTheme(theme);
    const resolvedThemeName = getResolvedThemeName();

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.themeFamily = family;
    document.documentElement.dataset.themeName = resolvedThemeName;
    document.documentElement.dataset.phyrexianFont = isPhyrexianScriptFamily() ? "true" : "false";

    button.dataset.mode = theme;
    button.dataset.themeFamily = family;
    button.setAttribute(
      "aria-label",
      `Theme: ${getAnnouncementLabel()}. Click to cycle light/dark/system mode.`
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
    familyOverride = family
  } = {}) {
    theme = STANDARD_THEME_ORDER.includes(nextTheme) ? nextTheme : "system";
    family = THEME_FAMILY_ORDER.includes(familyOverride) ? familyOverride : "azorius_dimir";
    applyTheme({ animate });
    if (!silent) onChange(theme, family, getResolvedThemeName());
  }

  function cycleStandardTheme() {
    const currentIndex = STANDARD_THEME_ORDER.indexOf(theme);
    const nextTheme = STANDARD_THEME_ORDER[(currentIndex + 1) % STANDARD_THEME_ORDER.length];
    setTheme(nextTheme, { animate: true });
  }

  function isGolgariActive() {
    return family === "selesnya_golgari" && resolveTheme(theme) === "dark";
  }

  function toggleSecretTheme() {
    if (family === "boros_rakdos") {
      setTheme(theme, { animate: true, familyOverride: "new_phyrexian" });
      return true;
    }

    if (family === "new_phyrexian") {
      setTheme(theme, { animate: true, familyOverride: "boros_rakdos" });
      return true;
    }

    if (isGolgariActive()) {
      setTheme(theme, { animate: true, familyOverride: "phyrexian" });
      return true;
    }

    if (family === "phyrexian") {
      setTheme(theme, { animate: true, familyOverride: "selesnya_golgari" });
      return true;
    }

    onSecretThemeUnavailable();
    return false;
  }

  function handleButtonClick(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }

    if (isSecretThemeEvent(event)) {
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

  media.addEventListener?.("change", () => {
    if (theme === "system") {
      applyTheme();
      onChange(theme, family, getResolvedThemeName());
    }
  });

  applyTheme();

  return {
    getTheme() {
      return theme;
    },
    getThemeFamily() {
      return family;
    },
    getThemeOptions,
    getResolvedTheme() {
      return resolveTheme(theme);
    },
    getResolvedThemeName,
    setTheme(nextTheme, options = {}) {
      setTheme(nextTheme, options);
    }
  };
}
