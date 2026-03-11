import { shuffleArray } from "./gallery-utils.js";

// ── BEM constants ─────────────────────────────────────────────────────────────

const BEM_VIEW_RADIUS = 1;
const BEM_FALLOFF_DIST = 2;
const BEM_FACEDOWN_IMG = "images/assets/card-preview.jpg";
const BEM_DRAG_THRESHOLD = 44;
const BEM_ZOOM_KEY = "planar-atlas-bem-zoom-v1";

// ── DOM references ────────────────────────────────────────────────────────────

const gameView = document.getElementById("game-view");
const bemMapArea = document.getElementById("bem-map-area");
const bemMapEl = document.getElementById("bem-map");
const bemViewCardBtn = document.getElementById("bem-view-card-btn");
const bemZoomSelect = document.getElementById("bem-zoom-select");
const gameBtnTr = document.getElementById("game-btn-tr");
const bemCardNameLabel = document.getElementById("bem-card-name-label");
const bemStatusLabel = document.getElementById("bem-status-label");

// ── Module state ──────────────────────────────────────────────────────────────

let bemPlaneswalkPending = false;
let bemViewOffset = { dx: 0, dy: 0 };
let bemDragPointerId = null;
let bemDragStart = null;
let bemDragHandled = false;
let bemLandOnPhenomenon = false;
let bemZoomLevel = "default";

let st = null;
let cbs = {};

// ── Initialization ────────────────────────────────────────────────────────────

export function initBemMode(deckState, callbacks) {
  st = deckState;
  cbs = callbacks;
  return {
    startBemGame,
    renderBemMap,
    updateBemInfoBar,
    syncBemTrButton,
    loadBemZoom,
    applyBemZoom,
    setBemZoom,
    resetBemState,
    handleBemCellClick,
    handleBemArrowKey,
    handleBemPointerDown,
    handleBemPointerMove,
    handleBemPointerUp,
    buildBemCardActions,
    buildBemAdjacentCardActions,
    toggleBemPlaneswalkMode,
    bemFillPlaceholder,
    bemResolvePhenomenon,
    bemKey
  };
}

export function resetBemState() {
  bemPlaneswalkPending = false;
  bemLandOnPhenomenon = false;
}

// ── BEM key helper ────────────────────────────────────────────────────────────

export function bemKey(x, y) {
  return `${x},${y}`;
}

// ── Card drawing helpers ──────────────────────────────────────────────────────

function bemDrawNonPhenomenon(remaining) {
  let attempts = 0;
  while (remaining.length > 0 && attempts < remaining.length) {
    const card = remaining.shift();
    if (card.type !== "Phenomenon") return card;
    remaining.push(card);
    attempts++;
  }
  return null;
}

// ── Game start ────────────────────────────────────────────────────────────────

export function startBemGame() {
  const total = cbs.getDeckTotal();
  if (total === 0) { st.showToast("Add cards to your deck first."); return; }

  const shuffled = shuffleArray(cbs.buildDeckArray());

  const bemGrid = new Map();
  const positions = [
    { dx: 0, dy: 0, faceUp: true },
    { dx: 1, dy: 0, faceUp: true },
    { dx: -1, dy: 0, faceUp: true },
    { dx: 0, dy: 1, faceUp: true },
    { dx: 0, dy: -1, faceUp: true },
    { dx: 1, dy: 1, faceUp: false },
    { dx: -1, dy: 1, faceUp: false },
    { dx: 1, dy: -1, faceUp: false },
    { dx: -1, dy: -1, faceUp: false }
  ];

  for (const { dx, dy, faceUp } of positions) {
    if (faceUp) {
      if (shuffled.length === 0) {
        bemGrid.set(bemKey(dx, dy), { card: null, faceUp: true, placeholder: true });
        continue;
      }
      const card = bemDrawNonPhenomenon(shuffled);
      if (card) {
        bemGrid.set(bemKey(dx, dy), { card, faceUp: true });
      } else {
        bemGrid.set(bemKey(dx, dy), { card: null, faceUp: true, placeholder: true });
      }
    } else {
      if (shuffled.length === 0) break;
      const card = shuffled.shift();
      if (card) bemGrid.set(bemKey(dx, dy), { card, faceUp: false });
    }
  }

  bemViewOffset = { dx: 0, dy: 0 };
  bemPlaneswalkPending = false;

  st.gameState = {
    mode: "bem",
    remaining: shuffled,
    exiled: [],
    chaosCost: 0,
    dieRolling: false,
    _dieResetTimer: null,
    activePlanes: [],
    focusedIndex: 0,
    bemGrid,
    bemPos: { x: 0, y: 0 },
    bemHellridedPositions: new Set()
  };

  st.gameActive = true;
  cbs.closeDeckPanel();
  document.body.classList.add("game-open");
  gameView?.classList.remove("hidden");
  gameView?.classList.add("bem-active");
  bemMapArea?.classList.remove("hidden");
  cbs.resetDieIcon();
  cbs.updateCostDisplay();
  renderBemMap();
  updateBemInfoBar();
  syncBemTrButton();

  if (window.location.hash !== "#play") {
    history.pushState(null, "", `${window.location.pathname}${window.location.search}#play`);
  }

  st.showToast("The game has begun!");
}

// ── BEM map helpers ───────────────────────────────────────────────────────────

function bemDiscoverAdjacent() {
  const gameState = st.gameState;
  const { bemGrid, bemPos, remaining } = gameState;
  const { x: px, y: py } = bemPos;

  const dirs = [
    { dx: 0, dy: -1, faceUp: true },
    { dx: 0, dy: 1, faceUp: true },
    { dx: -1, dy: 0, faceUp: true },
    { dx: 1, dy: 0, faceUp: true },
    { dx: -1, dy: -1, faceUp: false },
    { dx: 1, dy: -1, faceUp: false },
    { dx: -1, dy: 1, faceUp: false },
    { dx: 1, dy: 1, faceUp: false }
  ];

  for (const { dx, dy, faceUp } of dirs) {
    const nx = px + dx;
    const ny = py + dy;
    const key = bemKey(nx, ny);
    if (!bemGrid.has(key)) {
      if (faceUp) {
        const card = bemDrawNonPhenomenon(remaining);
        if (card) {
          bemGrid.set(key, { card, faceUp: true });
        } else {
          bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        }
      } else if (remaining.length > 0) {
        const card = remaining.shift();
        if (card) bemGrid.set(key, { card, faceUp: false });
      }
    }
  }
}

function bemRemoveFalloff() {
  const gameState = st.gameState;
  const { bemGrid, bemPos, remaining } = gameState;
  const { x: px, y: py } = bemPos;

  for (const [key, cell] of [...bemGrid.entries()]) {
    const [cx, cy] = key.split(",").map(Number);
    const dist = Math.max(Math.abs(cx - px), Math.abs(cy - py));
    if (dist > BEM_FALLOFF_DIST) {
      bemGrid.delete(key);
      if (cell.card && !cell.placeholder) remaining.push(cell.card);
    }
  }
}

function bemClearActivePlanesToBottom() {
  const gameState = st.gameState;
  if (!gameState?.activePlanes?.length) return;
  gameState.remaining.push(...shuffleArray([...gameState.activePlanes]));
  gameState.activePlanes = [];
  gameState.focusedIndex = 0;
}

// ── Player movement ───────────────────────────────────────────────────────────

function bemMovePlayer(nx, ny) {
  const gameState = st.gameState;
  if (!gameState?.bemGrid || !gameState?.bemPos) return;

  const { bemGrid, bemPos } = gameState;
  const { x: px, y: py } = bemPos;
  const dx = nx - px;
  const dy = ny - py;

  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return;
  if (dx === 0 && dy === 0) return;

  const isDiag = Math.abs(dx) === 1 && Math.abs(dy) === 1;
  const key = bemKey(nx, ny);
  const cell = bemGrid.get(key);

  if (!cell) return;

  if (cell.placeholder && !cell.card) {
    const { remaining } = gameState;
    const nextCard = bemDrawNonPhenomenon(remaining);
    if (nextCard) {
      cell.card = nextCard;
      cell.placeholder = false;
      st.showToast(`Moving to ${nextCard.displayName}.`);
    } else {
      st.showToast("Moving to empty spot, no planes remain.");
    }
    bemLandOnPhenomenon = cell.card?.type === "Phenomenon" && st.phenomenonAnimationEnabled;
    gameState.bemPos = { x: nx, y: ny };
    bemViewOffset = { dx: 0, dy: 0 };
    bemClearActivePlanesToBottom();
    const orthDirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
    for (const { dx: odx, dy: ody } of orthDirs) {
      const adjCell = bemGrid.get(bemKey(nx + odx, ny + ody));
      if (adjCell && !adjCell.faceUp) adjCell.faceUp = true;
    }
    bemPlaneswalkPending = false;
    bemRemoveFalloff();
    bemDiscoverAdjacent();
    renderBemMap();
    updateBemInfoBar();
    syncBemTrButton();
    cbs.closeAllGameMenus();
    return;
  }

  if (isDiag) {
    if (cell.faceUp) {
      st.showToast("Can only Hellride to a face-down diagonal card.");
      return;
    }

    const originalCard = cell.card;
    const alreadyHellrided = gameState.bemHellridedPositions?.has(key);
    if (st.riskyHellridingEnabled && originalCard.type !== "Phenomenon" && !alreadyHellrided) {
      gameState.bemHellridedPositions?.add(key);
      const phenIdx = gameState.remaining.findIndex(c => c.type === "Phenomenon");
      if (phenIdx !== -1 && Math.random() < 2 / 3) {
        const [phenomenon] = gameState.remaining.splice(phenIdx, 1);
        cell.card = phenomenon;
        cell.queuedCard = originalCard;
      }
    }

    cell.faceUp = true;
    st.showToast("Hellriding!");
  } else {
    if (!cell.faceUp) cell.faceUp = true;
    st.showToast(`Moving to ${cell.card.displayName}.`);
  }

  bemLandOnPhenomenon = cell.card?.type === "Phenomenon" && st.phenomenonAnimationEnabled;

  gameState.bemPos = { x: nx, y: ny };
  bemViewOffset = { dx: 0, dy: 0 };

  bemClearActivePlanesToBottom();

  const orthDirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  for (const { dx: odx, dy: ody } of orthDirs) {
    const adjCell = bemGrid.get(bemKey(nx + odx, ny + ody));
    if (adjCell && !adjCell.faceUp) adjCell.faceUp = true;
  }

  bemPlaneswalkPending = false;
  bemRemoveFalloff();
  bemDiscoverAdjacent();

  renderBemMap();
  updateBemInfoBar();
  syncBemTrButton();
  cbs.closeAllGameMenus();
}

// ── Phenomenon / placeholder resolution ──────────────────────────────────────

export function bemResolvePhenomenon() {
  const gameState = st.gameState;
  if (!gameState?.bemGrid || !gameState?.bemPos) return;

  const { bemGrid, bemPos, remaining } = gameState;
  const key = bemKey(bemPos.x, bemPos.y);
  const cell = bemGrid.get(key);

  if (!cell || cell.card.type !== "Phenomenon") {
    st.showToast("No phenomenon to resolve here.");
    return;
  }

  const phenomenon = cell.card;
  const nextCard = cell.queuedCard ?? bemDrawNonPhenomenon(remaining);
  delete cell.queuedCard;

  remaining.push(phenomenon);

  if (nextCard) {
    bemGrid.set(key, { card: nextCard, faceUp: true });
    st.showToast(`${phenomenon.displayName} resolved. ${nextCard.displayName} appears.`);
  } else {
    bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
    st.showToast(`${phenomenon.displayName} resolved. No planes remain.`);
  }

  renderBemMap();
  updateBemInfoBar();
  syncBemTrButton();
}

export function bemFillPlaceholder() {
  const gameState = st.gameState;
  if (!gameState?.bemGrid || !gameState?.bemPos) return;

  const { bemGrid, bemPos, remaining } = gameState;
  const key = bemKey(bemPos.x, bemPos.y);
  const cell = bemGrid.get(key);

  if (!cell?.placeholder) return;

  if (remaining.length === 0) {
    st.showToast("Library is empty.");
    return;
  }

  const nextCard = bemDrawNonPhenomenon(remaining);
  if (nextCard) {
    bemLandOnPhenomenon = nextCard.type === "Phenomenon" && st.phenomenonAnimationEnabled;
    bemGrid.set(key, { card: nextCard, faceUp: true });
    st.showToast(`${nextCard.displayName} revealed.`);
  } else {
    st.showToast("No planes remain in the library.");
  }

  renderBemMap();
  updateBemInfoBar();
  syncBemTrButton();
}

// ── TR button sync ────────────────────────────────────────────────────────────

export function syncBemTrButton() {
  if (!gameBtnTr) return;
  const gameState = st.gameState;
  const isBem = gameState?.mode === "bem";
  const currentCell = isBem ? gameState.bemGrid?.get(bemKey(gameState.bemPos.x, gameState.bemPos.y)) : null;
  const isPhenomenon = isBem && currentCell?.card?.type === "Phenomenon";
  const isPlaceholder = isBem && currentCell?.placeholder && !currentCell?.card;

  gameBtnTr.classList.toggle("bem-phenomenon-active", !!isPhenomenon);
  gameBtnTr.classList.toggle("bem-planeswalk-pending", !!(isBem && bemPlaneswalkPending && !isPlaceholder));
  gameBtnTr.setAttribute("aria-label", isBem
    ? (isPhenomenon ? "Resolve Phenomenon"
      : isPlaceholder ? "Reveal Card"
      : bemPlaneswalkPending ? "Cancel Planeswalk"
      : "Planeswalk")
    : "Planeswalk");
}

// ── Map rendering ─────────────────────────────────────────────────────────────

export function renderBemMap() {
  const gameState = st.gameState;
  if (!bemMapEl || !gameState?.bemGrid || !gameState?.bemPos) return;

  const { bemGrid, bemPos } = gameState;
  const { x: px, y: py } = bemPos;
  const viewX = px + bemViewOffset.dx;
  const viewY = py + bemViewOffset.dy;
  const isPanning = bemViewOffset.dx !== 0 || bemViewOffset.dy !== 0;

  bemMapEl.innerHTML = "";

  const R = BEM_VIEW_RADIUS;
  for (let gy = -R; gy <= R; gy++) {
    for (let gx = -R; gx <= R; gx++) {
      const cx = viewX + gx;
      const cy = viewY + gy;
      const key = bemKey(cx, cy);
      const cell = bemGrid.get(key);

      const div = document.createElement("div");
      div.style.gridColumn = (gx + R + 1).toString();
      div.style.gridRow = (gy + R + 1).toString();
      div.className = "bem-cell";
      div.dataset.x = cx;
      div.dataset.y = cy;

      const pdx = cx - px;
      const pdy = cy - py;
      const isPlayer = pdx === 0 && pdy === 0;
      const isDiagToPlayer = Math.abs(pdx) === 1 && Math.abs(pdy) === 1;
      const isOrthogToPlayer = (Math.abs(pdx) + Math.abs(pdy)) === 1;

      if (bemPlaneswalkPending && !isPlayer && !isPanning) {
        if (isOrthogToPlayer && cell?.faceUp) div.classList.add("bem-cell-planeswalk-glow");
        else if (isDiagToPlayer && cell && !cell.faceUp) div.classList.add("bem-cell-hellride-glow");
      }

      if (!cell) {
        div.classList.add(isPlayer ? "bem-cell-faceup" : "bem-cell-void");
        if (isPlayer) div.classList.add("bem-cell-player");
      } else if (cell.placeholder && !cell.card) {
        div.classList.add("bem-cell-placeholder");
        if (isPlayer) div.classList.add("bem-cell-player");
        const img = document.createElement("img");
        img.className = "bem-cell-placeholder-img";
        img.src = "images/assets/card-preview.jpg";
        img.alt = "";
        div.appendChild(img);
      } else if (cell.faceUp) {
        div.classList.add("bem-cell-faceup");

        const img = document.createElement("img");
        img.className = "bem-cell-img";
        img.src = cell.card.thumbPath;
        img.alt = cell.card.displayName;
        div.appendChild(img);

        const lbl = document.createElement("div");
        lbl.className = "bem-cell-label";
        lbl.textContent = cell.card.displayName;
        div.appendChild(lbl);

        if (isPlayer) {
          div.classList.add("bem-cell-player");
          if (cell.card.type === "Phenomenon") {
            div.classList.add("bem-cell-phenomenon");
            if (bemLandOnPhenomenon) {
              div.classList.add("bem-cell-phenomenon-landing");
              bemLandOnPhenomenon = false;
            }
          } else {
            div.classList.add("bem-cell-active-plane");
          }
        } else if (isOrthogToPlayer && !isPanning) {
          if (!bemPlaneswalkPending) div.classList.add("bem-cell-moveable");
        }
      } else {
        div.classList.add("bem-cell-facedown");

        const img = document.createElement("img");
        img.className = "bem-cell-img";
        img.src = BEM_FACEDOWN_IMG;
        img.alt = "Face-down card";
        div.appendChild(img);

        if (isDiagToPlayer && !isPanning) {
          if (!bemPlaneswalkPending) div.classList.add("bem-cell-hellride");
          const hint = document.createElement("span");
          hint.className = "bem-cell-hellride-hint";
          hint.textContent = "\u26A1";
          div.appendChild(hint);
        }
      }

      bemMapEl.appendChild(div);
    }
  }
}

// ── Info bar ──────────────────────────────────────────────────────────────────

export function updateBemInfoBar() {
  const gameState = st.gameState;
  if (!gameState?.bemGrid || !gameState?.bemPos) return;

  const cell = gameState.bemGrid.get(bemKey(gameState.bemPos.x, gameState.bemPos.y));

  if (cell?.placeholder && !cell?.card) {
    if (bemCardNameLabel) bemCardNameLabel.textContent = "Empty Cell";
    if (bemStatusLabel) bemStatusLabel.textContent = "Planeswalk to reveal a card.";
  } else {
    const card = cell?.card;
    if (bemCardNameLabel) {
      bemCardNameLabel.textContent = card ? card.displayName : "";
    }
    if (bemStatusLabel) {
      if (card?.type === "Phenomenon") {
        bemStatusLabel.textContent = "You've encountered a Phenomenon!";
      } else {
        const remaining = gameState.remaining.length;
        bemStatusLabel.textContent = `${remaining} card${remaining !== 1 ? "s" : ""} left`;
      }
    }
  }

  cbs.renderGameSidePanel(gameState.activePlanes, gameState.focusedIndex);
  cbs.syncGameToolsState(gameState.remaining.length);
}

// ── Cell click / touch handling ───────────────────────────────────────────────

export function handleBemCellClick(event) {
  const gameState = st.gameState;
  if (!gameState || gameState.mode !== "bem") return;
  if (bemDragHandled) {
    bemDragHandled = false;
    return;
  }
  const cell = event.target.closest(".bem-cell");
  if (!cell) return;

  const nx = parseInt(cell.dataset.x, 10);
  const ny = parseInt(cell.dataset.y, 10);
  if (isNaN(nx) || isNaN(ny)) return;

  const { x: px, y: py } = gameState.bemPos;
  const dx = nx - px;
  const dy = ny - py;
  const isPanning = bemViewOffset.dx !== 0 || bemViewOffset.dy !== 0;

  if (dx === 0 && dy === 0) {
    if (st.easyPlaneswalk) {
      if (isPanning) {
        bemViewOffset = { dx: 0, dy: 0 };
        renderBemMap();
        st.showToast("Returned to your position.");
        return;
      }
      const currentCell = gameState.bemGrid.get(bemKey(nx, ny));
      if (currentCell?.placeholder && !currentCell?.card) {
        bemFillPlaceholder();
      } else if (currentCell?.card?.type === "Phenomenon") {
        bemResolvePhenomenon();
      } else {
        toggleBemPlaneswalkMode();
      }
      return;
    }
    const gridCell = gameState.bemGrid.get(bemKey(nx, ny));
    if (gridCell?.card) cbs.openGameReaderView(gridCell.card, buildBemCardActions());
    return;
  }

  if (bemPlaneswalkPending) {
    if (isPanning) {
      bemViewOffset = { dx: 0, dy: 0 };
      renderBemMap();
      st.showToast("Returned to your position. Select a direction to planeswalk.");
      return;
    }
    const isOrthog = (Math.abs(dx) + Math.abs(dy)) === 1;
    const isDiag = Math.abs(dx) === 1 && Math.abs(dy) === 1;
    const gridCell = gameState.bemGrid.get(bemKey(nx, ny));
    if ((isOrthog && gridCell?.faceUp) || (isDiag && gridCell && !gridCell.faceUp)) {
      bemMovePlayer(nx, ny);
    } else {
      bemPlaneswalkPending = false;
      renderBemMap();
      syncBemTrButton();
    }
    return;
  }

  if (st.easyPlaneswalk) {
    if (isPanning) {
      bemViewOffset = { dx: 0, dy: 0 };
      renderBemMap();
      st.showToast("Returned to your position. Tap an adjacent card to move.");
      return;
    }
    const isValidMove = (Math.abs(dx) + Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 1);
    if (isValidMove) {
      bemMovePlayer(nx, ny);
    } else {
      const gridCell = gameState.bemGrid.get(bemKey(nx, ny));
      if (gridCell?.card && gridCell.faceUp) cbs.openGameReaderView(gridCell.card, buildBemAdjacentCardActions(nx, ny));
    }
    return;
  }

  const gridCell = gameState.bemGrid.get(bemKey(nx, ny));
  if (gridCell?.card && gridCell.faceUp) {
    cbs.openGameReaderView(gridCell.card, buildBemAdjacentCardActions(nx, ny));
  }
}

// ── Planeswalk mode toggle ────────────────────────────────────────────────────

export function toggleBemPlaneswalkMode() {
  const gameState = st.gameState;
  if (!gameState?.bemGrid) return;
  const isPanning = bemViewOffset.dx !== 0 || bemViewOffset.dy !== 0;
  if (isPanning) {
    bemViewOffset = { dx: 0, dy: 0 };
    renderBemMap();
    st.showToast("Returned to your position. Planeswalk again to continue.");
    return;
  }
  bemPlaneswalkPending = !bemPlaneswalkPending;
  renderBemMap();
  syncBemTrButton();
  if (bemPlaneswalkPending) {
    st.showToast("Choose an adjacent card to planeswalk to.");
  }
}

// ── Arrow key / drag navigation ───────────────────────────────────────────────

export function handleBemArrowKey(event) {
  const gameState = st.gameState;
  if (!st.gameActive || gameState?.mode !== "bem") return;
  if (document.body.classList.contains("game-reader-open")) return;
  if (document.body.classList.contains("tutorial-open")) return;
  let panDx = 0, panDy = 0;
  switch (event.key) {
    case "ArrowLeft":  panDx = -1; break;
    case "ArrowRight": panDx = 1;  break;
    case "ArrowUp":    panDy = -1; break;
    case "ArrowDown":  panDy = 1;  break;
    default: return;
  }
  event.preventDefault();

  const { x: px, y: py } = gameState.bemPos;
  const newViewX = px + bemViewOffset.dx + panDx;
  const newViewY = py + bemViewOffset.dy + panDy;
  if (!gameState.bemGrid.has(bemKey(newViewX, newViewY))) return;

  bemViewOffset = { dx: bemViewOffset.dx + panDx, dy: bemViewOffset.dy + panDy };
  renderBemMap();
}

export function handleBemPointerDown(event) {
  const gameState = st.gameState;
  if (!gameState?.bemGrid) return;
  if (bemDragPointerId !== null) return;
  if (event.pointerType === "mouse" && event.button !== 1) return;
  bemDragPointerId = event.pointerId;
  bemDragStart = { x: event.clientX, y: event.clientY };
  bemDragHandled = false;
}

export function handleBemPointerMove(event) {
  if (event.pointerId !== bemDragPointerId || !bemDragStart || !st.gameState?.bemGrid) return;
  const dx = event.clientX - bemDragStart.x;
  const dy = event.clientY - bemDragStart.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < BEM_DRAG_THRESHOLD && ady < BEM_DRAG_THRESHOLD) return;

  bemDragHandled = true;
  bemDragPointerId = null;
  bemDragStart = null;

  let panDx = 0;
  let panDy = 0;

  const isPortraitMobile = event.pointerType !== "mouse" && window.innerHeight > window.innerWidth;

  if (isPortraitMobile) {
    if (adx >= ady) {
      panDy = dx > 0 ? -1 : 1;
    } else {
      panDx = dy > 0 ? 1 : -1;
    }
  } else {
    if (adx >= ady) {
      panDx = dx > 0 ? -1 : 1;
    } else {
      panDy = dy > 0 ? -1 : 1;
    }
  }

  const gameState = st.gameState;
  const { x: px, y: py } = gameState.bemPos;
  const newViewX = px + bemViewOffset.dx + panDx;
  const newViewY = py + bemViewOffset.dy + panDy;
  if (!gameState.bemGrid.has(bemKey(newViewX, newViewY))) return;

  bemViewOffset = { dx: bemViewOffset.dx + panDx, dy: bemViewOffset.dy + panDy };
  renderBemMap();
}

export function handleBemPointerUp(event) {
  if (event.pointerId === bemDragPointerId) {
    bemDragPointerId = null;
    bemDragStart = null;
  }
}

// ── Card action builders ──────────────────────────────────────────────────────

export function buildBemCardActions() {
  return [
    {
      label: "Return to Library",
      action: () => {
        const gameState = st.gameState;
        if (!gameState?.bemGrid || !gameState?.bemPos) return;
        const key = bemKey(gameState.bemPos.x, gameState.bemPos.y);
        const cell = gameState.bemGrid.get(key);
        if (!cell?.card) return;
        const cardName = cell.card.displayName;
        gameState.remaining.push(cell.card);
        gameState.bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        cbs.closeGameReaderView();
        renderBemMap();
        updateBemInfoBar();
        syncBemTrButton();
        st.showToast(`${cardName} returned to library.`);
      }
    },
    {
      label: "Return to Top",
      action: () => {
        const gameState = st.gameState;
        if (!gameState?.bemGrid || !gameState?.bemPos) return;
        const key = bemKey(gameState.bemPos.x, gameState.bemPos.y);
        const cell = gameState.bemGrid.get(key);
        if (!cell?.card) return;
        const cardName = cell.card.displayName;
        gameState.remaining.unshift(cell.card);
        gameState.bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        cbs.closeGameReaderView();
        renderBemMap();
        updateBemInfoBar();
        syncBemTrButton();
        st.showToast(`${cardName} returned to top.`);
      }
    },
    {
      label: "Return to Bottom",
      action: () => {
        const gameState = st.gameState;
        if (!gameState?.bemGrid || !gameState?.bemPos) return;
        const key = bemKey(gameState.bemPos.x, gameState.bemPos.y);
        const cell = gameState.bemGrid.get(key);
        if (!cell?.card) return;
        const cardName = cell.card.displayName;
        gameState.remaining.push(cell.card);
        gameState.bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        cbs.closeGameReaderView();
        renderBemMap();
        updateBemInfoBar();
        syncBemTrButton();
        st.showToast(`${cardName} returned to bottom.`);
      }
    },
    {
      label: "Shuffle Into Library",
      action: () => {
        const gameState = st.gameState;
        if (!gameState?.bemGrid || !gameState?.bemPos) return;
        const key = bemKey(gameState.bemPos.x, gameState.bemPos.y);
        const cell = gameState.bemGrid.get(key);
        if (!cell?.card) return;
        const cardName = cell.card.displayName;
        gameState.remaining.push(cell.card);
        gameState.remaining = shuffleArray(gameState.remaining);
        gameState.bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        cbs.closeGameReaderView();
        renderBemMap();
        updateBemInfoBar();
        syncBemTrButton();
        st.showToast(`${cardName} shuffled into library.`);
      }
    },
    {
      label: "Exile",
      danger: true,
      action: () => {
        const gameState = st.gameState;
        if (!gameState?.bemGrid || !gameState?.bemPos) return;
        const key = bemKey(gameState.bemPos.x, gameState.bemPos.y);
        const cell = gameState.bemGrid.get(key);
        if (!cell?.card) return;
        const cardName = cell.card.displayName;
        gameState.exiled.push(cell.card);
        gameState.bemGrid.set(key, { card: null, faceUp: true, placeholder: true });
        cbs.closeGameReaderView();
        renderBemMap();
        updateBemInfoBar();
        syncBemTrButton();
        st.showToast(`${cardName} exiled.`);
      }
    }
  ];
}

export function buildBemAdjacentCardActions(nx, ny) {
  return [
    {
      label: "Planeswalk Here",
      action: () => {
        cbs.closeGameReaderView();
        bemMovePlayer(nx, ny);
      }
    }
  ];
}

// ── Zoom ──────────────────────────────────────────────────────────────────────

export function setBemZoom(val) {
  if (val === "close" || val === "default" || val === "far") {
    bemZoomLevel = val;
    applyBemZoom();
    if (bemZoomSelect) bemZoomSelect.value = val;
    try { localStorage.setItem(BEM_ZOOM_KEY, val); } catch { /* ignore */ }
  }
}

export function loadBemZoom() {
  try {
    const stored = localStorage.getItem(BEM_ZOOM_KEY);
    if (stored === "close" || stored === "default" || stored === "far") {
      bemZoomLevel = stored;
    }
  } catch {
    // ignore
  }
  if (bemZoomSelect) bemZoomSelect.value = bemZoomLevel;
  applyBemZoom();
}

export function applyBemZoom() {
  if (!gameView) return;
  gameView.classList.remove("bem-zoom-close", "bem-zoom-far");
  if (bemZoomLevel === "close") gameView.classList.add("bem-zoom-close");
  else if (bemZoomLevel === "far") gameView.classList.add("bem-zoom-far");
}
