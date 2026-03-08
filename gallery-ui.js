const THEME_ORDER = ["system", "dark", "light"];
const THEME_ICONS = {
  system: "◐",
  dark: "☾",
  light: "☀"
};
const THEME_LABELS = {
  system: "System theme",
  dark: "Dark theme",
  light: "Light theme"
};

function resolvePaletteFromModifiers(event) {
  if (event?.ctrlKey) return "atom";
  if (event?.altKey) return "gruvbox";
  return "standard";
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
        if (toast === currentToast) {
          currentToast = null;
        }
        toast.remove();
      }, 180);
    }, duration);
  };
}

export function initThemeController({ button, initialTheme = "system", initialPalette = "standard", onChange = () => {} }) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const glyph = button.querySelector(".theme-toggle-glyph");

  let theme = THEME_ORDER.includes(initialTheme) ? initialTheme : "system";
  let palette = ["standard", "gruvbox", "atom"].includes(initialPalette) ? initialPalette : "standard";

  function resolveTheme(preference) {
    return preference === "system"
      ? (media.matches ? "dark" : "light")
      : preference;
  }

  function getAnnouncementLabel() {
    const themeLabel = THEME_LABELS[theme];

    if (palette === "gruvbox") {
      return `${themeLabel} · Gruvbox`;
    }

    if (palette === "atom") {
      return `${themeLabel} · Atom`;
    }

    return themeLabel;
  }

  function updateButton({ animate = false } = {}) {
    const nextGlyph = THEME_ICONS[theme];
    const nextLabel = getAnnouncementLabel();

    button.dataset.mode = theme;
    button.dataset.palette = palette;
    button.setAttribute("aria-label", `Theme: ${nextLabel}. Click to cycle theme. Hold Alt for Gruvbox or Ctrl for Atom.`);
    button.title = `Theme: ${nextLabel}`;

    if (!glyph) return;

    if (animate) {
      button.classList.add("is-changing");
      window.setTimeout(() => {
        glyph.textContent = nextGlyph;
        button.classList.remove("is-changing");
      }, 110);
      return;
    }

    glyph.textContent = nextGlyph;
  }

  function applyTheme({ animate = false } = {}) {
    document.documentElement.dataset.theme = resolveTheme(theme);
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.palette = palette;
    updateButton({ animate });
  }

  function setTheme(nextTheme, { animate = false, silent = false, paletteOverride } = {}) {
    theme = THEME_ORDER.includes(nextTheme) ? nextTheme : "system";

    if (paletteOverride && ["standard", "gruvbox", "atom"].includes(paletteOverride)) {
      palette = paletteOverride;
    }

    applyTheme({ animate });

    if (!silent) {
      onChange(theme, palette);
    }
  }

  function cycleTheme(event) {
    const index = THEME_ORDER.indexOf(theme);
    const nextTheme = THEME_ORDER[(index + 1) % THEME_ORDER.length];
    const nextPalette = resolvePaletteFromModifiers(event);

    setTheme(nextTheme, {
      animate: true,
      paletteOverride: nextPalette
    });
  }

  button.addEventListener("click", cycleTheme);

  media.addEventListener?.("change", () => {
    if (theme === "system") {
      applyTheme();
    }
  });

  applyTheme();

  return {
    getTheme() {
      return theme;
    },
    getPalette() {
      return palette;
    },
    getResolvedTheme() {
      return resolveTheme(theme);
    },
    setTheme(nextTheme, options = {}) {
      setTheme(nextTheme, options);
    }
  };
}