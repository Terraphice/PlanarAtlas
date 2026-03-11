import { escapeHtml, shuffleArray } from "./gallery-utils.js";

// ── DOM references ────────────────────────────────────────────────────────────

const gameView = document.getElementById("game-view");
const gameCardImageBtn = document.getElementById("game-card-image-btn");
const gameCardImage = document.getElementById("game-card-image");
const gameSidePanel = document.getElementById("game-side-panel");
const gameBtnTl = document.getElementById("game-btn-tl");
const gameDieIcon = document.getElementById("game-die-icon");
const gameCostDisplay = document.getElementById("game-cost-display");
const gameCostValue = document.getElementById("game-cost-value");
const diePlaneswalkerPopup = document.getElementById("die-planeswalker-popup");
const dieChaosPopup = document.getElementById("die-chaos-popup");
const classicViewCardBtn = document.getElementById("classic-view-card-btn");
const classicCardNameLabel = document.getElementById("classic-card-name-label");
const classicLibraryLabel = document.getElementById("classic-library-label");
const bemMapArea = document.getElementById("bem-map-area");
const gameToolsAddTop = document.getElementById("game-tools-add-top");
const gameToolsAddBottom = document.getElementById("game-tools-add-bottom");
const gameToolsReturnTop = document.getElementById("game-tools-return-top");
const gameToolsReturnBottom = document.getElementById("game-tools-return-bottom");
const gameToolsShuffle = document.getElementById("game-tools-shuffle");
const gameLibraryToggle = document.getElementById("game-library-toggle");
const gameToolsRevealToggle = document.getElementById("game-tools-reveal-toggle");

// ── Module state ──────────────────────────────────────────────────────────────

let st = null;
let cbs = {};
let bemCbs = {};

// ── Initialization ────────────────────────────────────────────────────────────

export function initClassicMode(deckState, callbacks) {
  st = deckState;
  cbs = callbacks;
  return {
    startClassicGame,
    gamePlaneswalk,
    gameRollDie,
    updateGameView,
    renderGameSidePanel,
    syncGameToolsState,
    buildMainCardActions,
    buildSideCardActions,
    showGamePlaceholder,
    updateCostDisplay,
    resetDieIcon,
    closePlaneswalkerPopup,
    closeChaosPopup,
    setBemCallbacks
  };
}

export function setBemCallbacks(bemCallbacks) {
  bemCbs = bemCallbacks;
}

// ── Game start ────────────────────────────────────────────────────────────────

function startClassicGame() {
  const total = cbs.getDeckTotal();
  if (total === 0) { st.showToast("Add cards to your deck first."); return; }

  const shuffled = shuffleArray(cbs.buildDeckArray());
  st.gameState = {
    mode: "classic",
    remaining: shuffled,
    activePlanes: [],
    focusedIndex: 0,
    dieRolling: false,
    chaosCost: 0,
    exiled: [],
    _dieResetTimer: null
  };

  st.gameActive = true;
  cbs.closeDeckPanel();
  document.body.classList.add("game-open");
  gameView?.classList.remove("hidden");
  gameView?.classList.remove("bem-active");
  bemMapArea?.classList.add("hidden");
  showGamePlaceholder();
  resetDieIcon();
  updateCostDisplay();
  cbs.syncBemTrButton();

  if (window.location.hash !== "#play") {
    history.pushState(null, "", `${window.location.pathname}${window.location.search}#play`);
  }
}

// ── Planeswalk ────────────────────────────────────────────────────────────────

function gamePlaneswalk() {
  const gameState = st.gameState;
  if (!gameState) return;
  if (gameState.mode === "bem") return;

  const { activePlanes, remaining } = gameState;

  for (const card of activePlanes) remaining.push(card);

  if (remaining.length === 0) {
    gameState.activePlanes = [];
    gameState.focusedIndex = 0;
    updateGameView();
    st.showToast("No more planes in the library.");
    return;
  }

  const nextCard = remaining.shift();
  gameState.activePlanes = [nextCard];
  gameState.focusedIndex = 0;
  updateGameView();
}

// ── Die rolling ───────────────────────────────────────────────────────────────

function gameRollDie() {
  const gameState = st.gameState;
  if (!gameState || gameState.dieRolling) return;

  gameState.dieRolling = true;
  gameBtnTl?.classList.add("game-die-rolling");

  setTimeout(() => {
    const gs = st.gameState;
    if (!gs) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    gs.dieRolling = false;
    gameBtnTl?.classList.remove("game-die-rolling");
    gs.chaosCost++;
    updateCostDisplay();
    applyDieResult(roll);
  }, 500);
}

function applyDieResult(roll) {
  if (!gameDieIcon) return;
  gameBtnTl?.classList.remove("game-die-chaos", "game-die-walk", "game-die-blank");
  gameDieIcon.className = "";
  gameDieIcon.textContent = "";

  if (roll === 1) {
    gameDieIcon.className = "ms ms-chaos";
    gameDieIcon.setAttribute("aria-label", "Chaos!");
    gameBtnTl?.classList.add("game-die-chaos");
  } else if (roll === 6) {
    gameDieIcon.className = "ms ms-planeswalker";
    gameDieIcon.setAttribute("aria-label", "Planeswalk!");
    gameBtnTl?.classList.add("game-die-walk");
  } else {
    gameDieIcon.className = "game-die-blank-text";
    gameDieIcon.textContent = "BLANK";
    gameDieIcon.setAttribute("aria-label", "No effect");
    gameBtnTl?.classList.add("game-die-blank");
  }

  gameDieIcon.classList.remove("game-die-flash");
  void gameDieIcon.offsetWidth;
  gameDieIcon.classList.add("game-die-flash");

  if (roll === 1) showChaosPopup();
  else if (roll === 6) showPlaneswalkerPopup();
}

function showPlaneswalkerPopup() {
  diePlaneswalkerPopup?.classList.remove("hidden");
}

export function closePlaneswalkerPopup() {
  diePlaneswalkerPopup?.classList.add("hidden");
}

export function executePlaneswalkerAction() {
  closePlaneswalkerPopup();
  const gameState = st.gameState;
  if (!gameState) return;
  if (gameState.mode === "bem") {
    const cell = gameState.bemGrid?.get(bemCbs.bemKey?.(gameState.bemPos.x, gameState.bemPos.y));
    if (cell?.placeholder && !cell?.card) {
      bemCbs.bemFillPlaceholder?.();
    } else if (cell?.card?.type === "Phenomenon") {
      bemCbs.bemResolvePhenomenon?.();
    } else {
      bemCbs.toggleBemPlaneswalkMode?.();
    }
  } else {
    gamePlaneswalk();
  }
}

function showChaosPopup() {
  dieChaosPopup?.classList.remove("hidden");
}

export function closeChaosPopup() {
  dieChaosPopup?.classList.add("hidden");
}

export function resetDieIcon() {
  if (!gameDieIcon) return;
  gameDieIcon.className = "ms ms-chaos";
  gameDieIcon.textContent = "";
  gameDieIcon.removeAttribute("aria-label");
  gameBtnTl?.classList.remove("game-die-chaos", "game-die-walk", "game-die-blank");
}

// ── Cost display ──────────────────────────────────────────────────────────────

export function updateCostDisplay() {
  const gameState = st.gameState;
  if (!gameState) return;
  const cost = gameState.chaosCost;
  if (gameCostValue) gameCostValue.textContent = cost;
  if (gameCostDisplay) gameCostDisplay.classList.toggle("game-cost-visible", cost > 0);
}

// ── Placeholder ───────────────────────────────────────────────────────────────

export function showGamePlaceholder() {
  const gameState = st.gameState;
  if (gameCardImage) {
    gameCardImage.src = "images/assets/card-preview.jpg";
    gameCardImage.alt = "Click to planeswalk";
  }
  if (gameSidePanel) gameSidePanel.innerHTML = "";
  if (gameCardImageBtn) {
    gameCardImageBtn.setAttribute("aria-label", "Planeswalk");
    gameCardImageBtn.classList.add("game-card-image-btn-placeholder");
    gameCardImageBtn.classList.remove("active-plane", "active-phenomenon");
  }
  if (classicViewCardBtn) classicViewCardBtn.classList.add("hidden");
  syncGameToolsState(gameState?.remaining.length ?? 0);
}

// ── Game view ─────────────────────────────────────────────────────────────────

export function updateGameView() {
  const gameState = st.gameState;
  if (!gameState) return;

  const { activePlanes, focusedIndex, remaining } = gameState;

  if (gameState.mode === "bem") {
    renderGameSidePanel(activePlanes, focusedIndex);
    syncGameToolsState(remaining.length);
    return;
  }

  const focused = activePlanes[focusedIndex] ?? activePlanes[0];

  if (!focused) {
    showGamePlaceholder();
    return;
  }

  if (gameCardImage) {
    gameCardImage.src = focused.imagePath;
    gameCardImage.alt = focused.displayName;
  }
  if (gameCardImageBtn) {
    gameCardImageBtn.setAttribute("aria-label", st.easyPlaneswalk ? "Planeswalk" : "View card close-up");
    gameCardImageBtn.classList.remove("game-card-image-btn-placeholder");
    gameCardImageBtn.classList.toggle("active-plane", focused.type !== "Phenomenon");
    gameCardImageBtn.classList.toggle("active-phenomenon", focused.type === "Phenomenon");
  }

  if (classicViewCardBtn) {
    classicViewCardBtn.classList.remove("hidden");
    if (classicCardNameLabel) classicCardNameLabel.textContent = focused.displayName;
    if (classicLibraryLabel) classicLibraryLabel.textContent = `${remaining.length} left`;
  }

  renderGameSidePanel(activePlanes, focusedIndex);
  syncGameToolsState(remaining.length);
}

export function renderGameSidePanel(activePlanes, focusedIndex) {
  const gameState = st.gameState;
  if (!gameSidePanel) return;
  gameSidePanel.innerHTML = "";

  const isBem = gameState?.mode === "bem";

  if (isBem) {
    for (let i = 0; i < activePlanes.length; i++) {
      const card = activePlanes[i];
      const idx = i;
      const sideCard = document.createElement("button");
      sideCard.type = "button";
      sideCard.className = "game-side-card";
      sideCard.setAttribute("aria-label", `View ${card.displayName} (opens card reader)`);
      sideCard.innerHTML = `
        <img class="game-side-card-img" src="${card.thumbPath}" alt="${escapeHtml(card.displayName)}" />
        <div class="game-side-card-label">${escapeHtml(card.displayName)}</div>
      `;
      sideCard.addEventListener("click", () => {
        if (!st.gameState) return;
        cbs.openGameReaderView(card, buildSideCardActions(idx));
      });
      gameSidePanel.appendChild(sideCard);
    }
    return;
  }

  if (activePlanes.length <= 1) return;

  const cycleBtn = document.createElement("button");
  cycleBtn.type = "button";
  cycleBtn.className = "game-cycle-btn";
  cycleBtn.setAttribute("aria-label", "Cycle active planes");
  cycleBtn.innerHTML = `<span class="game-cycle-icon" aria-hidden="true">\u21BB</span>`;
  cycleBtn.addEventListener("click", () => {
    const gs = st.gameState;
    if (!gs) return;
    gs.focusedIndex = (focusedIndex + 1) % activePlanes.length;
    updateGameView();
  });
  gameSidePanel.appendChild(cycleBtn);

  for (let i = 0; i < activePlanes.length; i++) {
    if (i === focusedIndex) continue;
    const card = activePlanes[i];
    const idx = i;

    const sideCard = document.createElement("button");
    sideCard.type = "button";
    sideCard.className = "game-side-card";
    sideCard.setAttribute("aria-label", `View ${card.displayName} (opens card reader)`);
    sideCard.innerHTML = `
      <img class="game-side-card-img" src="${card.thumbPath}" alt="${escapeHtml(card.displayName)}" />
      <div class="game-side-card-label">${escapeHtml(card.displayName)}</div>
    `;
    sideCard.addEventListener("click", () => {
      if (!st.gameState) return;
      cbs.openGameReaderView(card, buildSideCardActions(idx));
    });
    gameSidePanel.appendChild(sideCard);
  }
}

export function syncGameToolsState(remainingCount) {
  const gameState = st.gameState;
  const isBem = gameState?.mode === "bem";
  if (gameToolsAddTop) {
    gameToolsAddTop.disabled = remainingCount === 0;
    const span = gameToolsAddTop.querySelector("span");
    if (span) span.textContent = `Add Top of Library (${remainingCount} left)`;
  }
  if (gameToolsAddBottom) {
    gameToolsAddBottom.disabled = remainingCount === 0;
    const span = gameToolsAddBottom.querySelector("span");
    if (span) span.textContent = `Add Bottom of Library (${remainingCount} left)`;
  }
  if (gameToolsReturnTop) {
    gameToolsReturnTop.disabled = !gameState || (!isBem && gameState.activePlanes.length === 0);
  }
  if (gameToolsReturnBottom) {
    gameToolsReturnBottom.disabled = !gameState || (!isBem && gameState.activePlanes.length === 0);
  }
  if (gameToolsShuffle) gameToolsShuffle.disabled = !gameState;
  if (gameLibraryToggle) gameLibraryToggle.disabled = !gameState;
  if (gameToolsRevealToggle) gameToolsRevealToggle.disabled = !gameState;
}

// ── Card actions ──────────────────────────────────────────────────────────────

export function buildMainCardActions(focusedIdx) {
  return [
    {
      label: "Planeswalk Away",
      action: () => { cbs.closeGameReaderView(); gamePlaneswalk(); }
    },
    {
      label: "Return to Top",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(focusedIdx, 1)[0];
        if (!card) return;
        gameState.remaining.unshift(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} returned to top.`);
      }
    },
    {
      label: "Return to Bottom",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(focusedIdx, 1)[0];
        if (!card) return;
        gameState.remaining.push(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} returned to bottom.`);
      }
    },
    {
      label: "Shuffle Into Library",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(focusedIdx, 1)[0];
        if (!card) return;
        gameState.remaining.push(card);
        gameState.remaining = shuffleArray(gameState.remaining);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} shuffled into library.`);
      }
    },
    {
      label: "Exile",
      danger: true,
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(focusedIdx, 1)[0];
        if (!card) return;
        gameState.exiled.push(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} exiled.`);
      }
    }
  ];
}

export function buildSideCardActions(sideIdx) {
  return [
    {
      label: "Make Main",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        gameState.focusedIndex = sideIdx;
        cbs.closeGameReaderView();
        updateGameView();
      }
    },
    {
      label: "Planeswalk Here",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(sideIdx, 1)[0];
        if (!card) return;
        gameState.remaining.push(...gameState.activePlanes);
        gameState.activePlanes = [card];
        gameState.focusedIndex = 0;
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`Planeswalked to ${card.displayName}.`);
      }
    },
    {
      label: "Return to Top",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(sideIdx, 1)[0];
        if (!card) return;
        gameState.remaining.unshift(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} returned to top.`);
      }
    },
    {
      label: "Return to Bottom",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(sideIdx, 1)[0];
        if (!card) return;
        gameState.remaining.push(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} returned to bottom.`);
      }
    },
    {
      label: "Shuffle Into Library",
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(sideIdx, 1)[0];
        if (!card) return;
        gameState.remaining.push(card);
        gameState.remaining = shuffleArray(gameState.remaining);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} shuffled into library.`);
      }
    },
    {
      label: "Exile",
      danger: true,
      action: () => {
        const gameState = st.gameState;
        if (!gameState) return;
        const card = gameState.activePlanes.splice(sideIdx, 1)[0];
        if (!card) return;
        gameState.exiled.push(card);
        gameState.focusedIndex = Math.min(gameState.focusedIndex, Math.max(0, gameState.activePlanes.length - 1));
        cbs.closeGameReaderView();
        updateGameView();
        st.showToast(`${card.displayName} exiled.`);
      }
    }
  ];
}
