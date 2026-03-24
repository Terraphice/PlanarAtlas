// ── gallery-ui.js ─────────────────────────────────────────────────────────────
// ThemeController (mode + guild theme mapping) and ToastManager (ephemeral
// notification toasts).

const STANDARD_THEME_ORDER = ["system", "dark", "light"];

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

const GUILD_PAIRS = {
  azorius: { light: "azorius", dark: "dimir" },
  boros: { light: "boros", dark: "rakdos" },
  selesnya: { light: "selesnya", dark: "golgari" },
  orzhov: { light: "orzhov", dark: "orzhov" }
};

const LIGHT_GUILD_OPTIONS = [
  { value: "azorius", label: "Azorius" },
  { value: "boros", label: "Boros" },
  { value: "selesnya", label: "Selesnya" },
  { value: "orzhov", label: "Orzhov" }
];

const DARK_GUILD_OPTIONS = [
  { value: "dimir", label: "Dimir" },
  { value: "rakdos", label: "Rakdos" },
  { value: "golgari", label: "Golgari" },
  { value: "orzhov", label: "Orzhov" }
];

const SECRET_THEME_BY_GUILD = {
  boros: "new-phyrexian",
  golgari: "phyrexian"
};

const GUILD_NAME_BY_ID = {
  azorius: "Azorius",
  dimir: "Dimir",
  boros: "Boros",
  rakdos: "Rakdos",
  selesnya: "Selesnya",
  golgari: "Golgari",
  orzhov: "Orzhov",
  "new-phyrexian": "New Phyrexian",
  phyrexian: "Phyrexian"
};

function isAltPaletteEvent(event) {
  return Boolean(event?.altKey);
}

function findPairKeyFromGuild(guild) {
  if (!guild) return "azorius";

  for (const [pairKey, mapping] of Object.entries(GUILD_PAIRS)) {
    if (mapping.light === guild || mapping.dark === guild) return pairKey;
  }

  return "azorius";
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
  initialTheme = "system",
  initialPalette = "azorius",
  onChange = () => {}
}) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const glyph = button.querySelector(".theme-toggle-glyph");

  let theme = STANDARD_THEME_ORDER.includes(initialTheme) ? initialTheme : "system";
  let guildPair = Object.hasOwn(GUILD_PAIRS, initialPalette) ? initialPalette : findPairKeyFromGuild(initialPalette);
  let activeSecretTheme = initialPalette === "new-phyrexian" || initialPalette === "phyrexian" ? initialPalette : null;
  let suppressClick = false;
  let longPressTimer = null;

  function resolveMode(preference) {
    return preference === "system" ? (media.matches ? "dark" : "light") : preference;
  }

  function getCurrentGuild({ resolvedMode = resolveMode(theme), includeSecret = true } = {}) {
    if (includeSecret && activeSecretTheme) return activeSecretTheme;
    return GUILD_PAIRS[guildPair][resolvedMode];
  }

  function refreshThemeOptions() {
    if (!themeSelect) return;
    const resolvedMode = resolveMode(theme);
    const options = resolvedMode === "dark" ? DARK_GUILD_OPTIONS : LIGHT_GUILD_OPTIONS;
    const currentGuild = getCurrentGuild({ resolvedMode, includeSecret: false });

    themeSelect.innerHTML = "";
    for (const option of options) {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      themeSelect.appendChild(optionEl);
    }

    themeSelect.value = options.some((option) => option.value === currentGuild)
      ? currentGuild
      : options[0].value;
  }

  function getAnnouncementLabel() {
    const themeLabel = THEME_LABELS[theme];
    const guildName = GUILD_NAME_BY_ID[getCurrentGuild()] || "Azorius";
    return `${themeLabel} · ${guildName}`;
  }

  function applyTheme({ animate = false } = {}) {
    const resolvedMode = resolveMode(theme);
    const guild = getCurrentGuild({ resolvedMode });
    const scriptMode = guild === "new-phyrexian" || guild === "phyrexian" ? "phyrexian" : "latin";

    document.documentElement.dataset.theme = guild === "new-phyrexian"
      ? "light"
      : guild === "phyrexian"
        ? "dark"
        : resolvedMode;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.palette = guild;
    document.documentElement.dataset.script = scriptMode;

    button.dataset.mode = theme;
    button.dataset.palette = guild;
    button.setAttribute(
      "aria-label",
      `Theme: ${getAnnouncementLabel()}. Click to cycle dark/light mode.`
    );
    button.title = getAnnouncementLabel();

    refreshThemeOptions();

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
    paletteOverride = guildPair,
    clearSecret = true
  } = {}) {
    theme = STANDARD_THEME_ORDER.includes(nextTheme) ? nextTheme : "system";

    if (Object.hasOwn(GUILD_PAIRS, paletteOverride)) {
      guildPair = paletteOverride;
    } else if (paletteOverride === "new-phyrexian" || paletteOverride === "phyrexian") {
      guildPair = findPairKeyFromGuild(paletteOverride === "new-phyrexian" ? "boros" : "golgari");
      activeSecretTheme = paletteOverride;
    } else {
      guildPair = findPairKeyFromGuild(paletteOverride);
    }

    if (clearSecret) activeSecretTheme = null;

    applyTheme({ animate });
    if (!silent) onChange(theme, getCurrentGuild());
  }

  function cycleStandardTheme() {
    const currentIndex = STANDARD_THEME_ORDER.indexOf(theme);
    const nextTheme = STANDARD_THEME_ORDER[(currentIndex + 1) % STANDARD_THEME_ORDER.length];
    setTheme(nextTheme, { animate: true, clearSecret: true });
  }

  function toggleSecretTheme() {
    const activeGuild = getCurrentGuild({ includeSecret: false });
    const secretTheme = SECRET_THEME_BY_GUILD[activeGuild];

    if (!secretTheme) return;

    const isAlreadyActive = activeSecretTheme === secretTheme;
    activeSecretTheme = isAlreadyActive ? null : secretTheme;
    applyTheme({ animate: true });
    onChange(theme, getCurrentGuild());
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

  function handleThemeSelectChange() {
    if (!themeSelect?.value) return;
    const nextPair = findPairKeyFromGuild(themeSelect.value);
    guildPair = nextPair;
    activeSecretTheme = null;
    applyTheme();
    onChange(theme, getCurrentGuild());
  }

  button.addEventListener("click", handleButtonClick);
  button.addEventListener("pointerdown", handlePointerDown);
  button.addEventListener("pointerup", clearLongPressTimer);
  button.addEventListener("pointercancel", clearLongPressTimer);
  button.addEventListener("pointerleave", clearLongPressTimer);

  themeSelect?.addEventListener("change", handleThemeSelectChange);

  media.addEventListener?.("change", () => {
    if (theme === "system") {
      applyTheme();
      onChange(theme, getCurrentGuild());
    }
  });

  applyTheme();

  return {
    getTheme() {
      return theme;
    },
    getPalette() {
      return activeSecretTheme || guildPair;
    },
    getResolvedTheme() {
      return resolveMode(theme);
    },
    setTheme(nextTheme, options = {}) {
      setTheme(nextTheme, options);
    }
  };
}
