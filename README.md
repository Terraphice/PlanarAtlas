<div align="center">

<img src="assets/social-preview.jpg" alt="Planar Atlas, a feature-complete Planechase tool" width="100%" style="border-radius:12px;" />

# Planar Atlas

**A feature-complete Planechase tool for Magic: The Gathering**

Browse a fully searchable gallery of every plane and phenomenon, build and share custom decks, and assist
live Planechase games, all in a single installable web app with no accounts and no servers. (Games require real-life Magic: The Gathering cards, and are not fully simulated. The game utility tools only simulate the planar deck and planar map for Blind Eternities Map mode, for use with real cards. Please support Wizard of The Coast and Magic: The Gathering, use/buy real cards!)

[![Live Site](https://img.shields.io/badge/Live_Site-planaratlas.terraphice.dev-6366f1?style=for-the-badge&logo=firefox&logoColor=white)](https://planaratlas.terraphice.dev)
[![PWA](https://img.shields.io/badge/PWA-Installable_&_Offline-22c55e?style=for-the-badge&logo=pwa&logoColor=white)](https://planaratlas.terraphice.dev)

[![Total Cards](https://img.shields.io/badge/Total_Cards-230-6366f1?style=for-the-badge)](https://planaratlas.terraphice.dev)
[![Official Cards](https://img.shields.io/badge/Official_Cards-206-22c55e?style=for-the-badge)](https://planaratlas.terraphice.dev)
[![Custom Cards](https://img.shields.io/badge/Custom_Cards-24-f59e0b?style=for-the-badge)](https://planaratlas.terraphice.dev)

</div>

---

## Overview

Planar Atlas started as a personal tool and grew into the most comprehensive Planechase companion available. Every card is rendered at full resolution with searchable transcripts, tagged by set and world, and ready to drop into a custom deck. The game companion handles the planar library, planar die, and other features for both variants of Planechase, as well as a robust undo/redo history system, searching, exiling, revealing, planeswalking, rolling, shuffling, phenomena reminder banners, and simultaneous active cards.

There is no backend, no login, and nothing to install unless you wish to run the project locally. The entire application is a static web page that caches itself for offline use the first time it loads.

---

## Features

| Feature | Details |
|---|---|
| **Gallery** | Grid, Singleton, Stack, and List views with paginated or infinite-scroll browsing. |
| **Search** | Full search syntax: keywords, tags, card types, oracle text, regex, and fuzzy matching. |
| **Deck Builder** | Multiple named deck slots, per-slot import and export, and drag-free card management. |
| **Classic Planechase** | Shared-deck game companion mode with planeswalking, the planar die, and utility tooling. |
| **Blind Eternities Map** | Shared-deck laid out as an explorable map, with risky hell-riding to unknown planes. |
| **Profile Seeds** | Export your entire setup (all preferences and every deck) as a single shareable string, or share decks individually. |
| **Undo History** | Reverse (and un-reverse!) up to 20 game actions from the Tools menu: Planeswalks, die rolls, card moves, etc. |
| **Keyboard Play** | Full keyboard control so you never have to reach for the mouse mid-game! |
| **Themes** | 8+ familiar color palette selections, applied consistently across the entire site. (Some are hidden!) |
| **Offline / PWA** | Installs like a native app and works without an internet connection after first load! |
| **Onboarding** | First-run tutorial for both game companion modes so new players can jump straight in. |

---

## Gallery

The gallery is the heart of Planar Atlas. Every card in the library is available at full resolution, each with a readable transcript loaded on demand. Cards are tagged by set, world, content type, etc., and the tag system powers every filtering and grouping feature. These cards are directly from Scryfall, and aren't redistributed by this project nor used to play a standalone game, as permitted in the Wizards' Fan Content Policy.

### View Modes

| Mode | Description |
|---|---|
| **Grid** | Compact thumbnail grid, ideal for browsing or picking cards for a deck. |
| **Singleton** | One card fills the viewport for a focused reading experience. |
| **Stack** | Overlapping fan of cards, providing a more compact aesthetic. |
| **List** | Condensed rows with badges, tags, and metadata visible at a glance. Geek view. |

### Filtering and Grouping

Cards can be filtered by any combination of search terms and toggled options. The group-by feature organises the gallery into collapsible sections by any tag value, useful for browsing by world, by set, or by card type.

Pagination modes include **paginated** browsing (10, 20, 50, or 100 cards per page) and **infinite scroll** with lazy loading and navigation buttons.

---

## Search Syntax

The search bar supports a rich query language for precise filtering.

| Syntax | Matches |
|---|---|
| `mishra` | Cards with that text anywhere in the name (fuzzy when fuzzy mode is on) |
| `name:workshop` | Cards whose display name contains the given word |
| `tag:Plane` | Cards tagged with the given value |
| `type:Phenomenon` | Cards of type Phenomenon |
| `oracle:whenever` | Cards whose transcript contains "whenever" |
| `"exact phrase"` | Cards containing the exact quoted phrase |
| `/expr[ae]ss/` | Cards matching the given regular expression |
| `-tag:hidden` | Negate any term with a leading `-` |

Multiple terms are combined with an implicit AND. Fuzzy matching uses Levenshtein distance and can be toggled on or off in preferences.

A toggleable inline autocomplete ghost suggests completions as you type. Press `Tab` to accept or use the arrow keys to navigate the suggestion list.

---

## Deck Builder

The deck builder supports multiple named deck slots saved to your browser's local storage. Cards can be added from the gallery or from within a game session. Each deck slot supports:

- **Rename and reorder**: Give each deck a meaningful name, for easier and better organization.
- **Import / Export**: Copy a deck as a plain text list or paste one in.
- **Sharing via seeds**: All decks generate a seed for portable sharing.

---

## Planechase Companion

### Classic Mode

The traditional shared-deck format. All players share a single combined planar deck and take turns planeswalking, rolling the planar die, and encountering planes & phenomena. The game companion handles all Planechase functions, like the planar deck, planar die, etc.

### Blind Eternities Map

A shared planar deck is laid out as an interconnected map of face-down cards. Planes are revealed as players move between adjacent nodes. Planar Atlas renders the full map layout, tracks the active position, and provides many options and tools for resolving cards. Risk-takers may choose to hellride to unknown (diagonal) face-down cards, with a configurable chance of encountering a phenomenon along the way.

 Planar Atlas does not substitute nor claim to substitute the full game-loop. You still need real Magic: The Gathering cards to play, and this tool serves only as a helper/companion to real cards. Please support Wizards and Magic: The Gathering, use/buy real cards!

Planar Atlas handles:

- Shuffling and activating the opening plane.
- Encountering phenomena automatically when they surface.
- Rolling the planar die with cost tracking and animations.
- Tracking the planar deck, active planes, map, and the exile zone.
- Simultaneous active planes and phenomena at once.
- Searching the planar library and revealing cards from the top or bottom, with multiple view styles.
- Detailed views and transcripts for every card, including cards not currently in play.
- Undo for every game action up to 20 steps back, and redo for undone actions.
- Shuffle, exile, and place-on-top/bottom support for cards in play and in the library.
- Planeswalking. (Moving between planes, highlighting available choices, and hellriding.)

---

## Keyboard Shortcuts

The full game companion is usable without a mouse, for easy access while playing with real cards.

| Key | Action |
|---|---|
| `Arrow Keys` | Move around the planar map |
| `Space` | Roll the planar die |
| `Enter` | Planeswalk to the next plane, or enter Planeswalking mode/confirm selection |
| `I` | Inspect the current card in detailed view |
| `T` | Toggle the Tools menu |
| `Z` | Undo last game action |
| `R` | Redo next game action |
| `Escape` | Close any open panel or overlay |

---

## Theme System

Click the theme button in the top bar to cycle through three brightness modes: **System** (follows OS preference), **Dark**, and **Light**. Alt-click to cycle through the eight available colour palettes. (Long-press on mobile!)

| Palette | Inspiration |
|---|---|
| `standard` | Planar Atlas default, deep navy with blue accents |
| `gruvbox` | Warm retro tones from the Gruvbox colour scheme |
| `atom` | Cool-grey inspired by the Atom editor |
| `dracula` | Vivid purple and pink from the Dracula palette |
| `solarized` | Muted, low-contrast tones from Solarized |
| `nord` | Icy blue-grey from the Nord palette |
| `catppuccin` | Soft pastel mocha from Catppuccin |
| `scryfall` [WIP] | Familiar purple & blue tones echoing Scryfall's UI |

All palettes support both dark and light variants. Preferences persist across sessions via `localStorage`.

---

## Card Library

The library covers both official Wizards of the Coast Planechase releases and curated community custom content, and is actively growing. Each card is badged **Official** or **Custom** in the gallery for clarity.

Every card includes a high-resolution image and a plain-text transcript, as well as more efficient thumbnail images. Transcripts are loaded asynchronously in the card detail modal and are also indexed by the `oracle:` search operator.

---

## Adding a New Card Set (Production Workflow)

If you're importing a new set of cards, use the release workflow command below. It runs generation, sync, and verification steps in the correct order and stops immediately on any failure:

```bash
npm run cards:prepare-release
```

This command performs:

1. `npm run generate` (rebuilds `cards.json`, static share embeds, and SEO pages)
2. `npm run sync` (syncs per-card files under `cards/`)
3. `npm run test:generate`
4. `npm run test:sync`
5. `npm run test` (full smoke test)

Before running it, ensure new files are in place:

- Card images in `cards/images/` (`.png`, `.jpg`, and `.jpeg` are supported)
- Transcript files in `cards/transcripts/` (`.md` preferred)

Thumbnails in `cards/thumbs/` are generated automatically from `cards.json` using `npm run generate:thumbs`, and are included in the full `npm run generate` workflow.

To bulk-import new images that are not yet represented in `cards.json`, run `npm run generate` with optional flags:

```bash
node scripts/generate-cards.js --custom --type plane --set PBT
```

When these flags are provided, orphaned images in `cards/images/` are converted into new card records. Each new card gets a generated UID, its image is renamed to the UID filename, and a placeholder transcript is created automatically. The card `name` is inferred from the original image filename (for example, `Example Plane.jpg` becomes `"Example Plane"`).

---

## Profile Seeds

A profile seed is a compact encoded string that captures your entire Planar Atlas state: all preferences, all deck slots and their contents, and your current theme. Share a seed with another player and they can import it to get an identical setup in seconds, no account or file transfer needed.

Seeds are generated and imported inside the Settings panel, at the bottom, as well as within the deck-builder.

---

## Architecture

Planar Atlas is a vanilla JavaScript single-page application with no framework, no bundler, and no runtime dependencies beyond a few CDN-loaded libraries.

| Module | Purpose |
|---|---|
| `src/gallery/index.js` | Application entry point: fetches card data, wires DOM events, and delegates to all other modules |
| `src/gallery/render.js` | Card rendering in all view modes, pagination, and tag-based grouping |
| `src/gallery/search.js` | Search input, suggestion list, keyboard navigation, and ghost-text autocomplete |
| `src/gallery/modal.js` | Card detail modal: navigation, transcript loading, and phenomenon flip animation |
| `src/gallery/state.js` | Shared state objects for preferences, filters, display, and pagination |
| `src/gallery/utils.js` | Stateless helpers: search parsing, fuzzy matching, card enrichment, and URL state |
| `src/gallery/ui.js` | Theme controller (palettes and modes) and toast notification manager |
| `src/deck/index.js` | Deck builder, game orchestration for both game modes, profile seed encoding, and undo history |
| `src/deck/panel.js` | Deck panel UI: open/close, list rendering, slot management, and import/export |
| `src/deck/codec.js` | Pure encoding/decoding for deck seeds and game state seeds |
| `src/game/state.js` | Game state machine: history, undo/redo, state encoding/decoding, and game lifecycle |
| `src/game/ui.js` | Shared game UI: card reader, reveal overlay, library view, die rolling, and tutorial |
| `src/game/classic.js` | Rendering layer for the Classic shared-deck game mode |
| `src/game/bem.js` | Rendering layer for the Blind Eternities Map game mode |
| `src/changelog.js` | Fetches the latest GitHub release and shows a "What's New" panel once per version |
| `sw.js` | Service worker: caches all modules, card images, and CDN assets for offline use |
| `scripts/generate-cards.js` | Node.js script: regenerates `cards.json` from the card images directory |
| `scripts/sync-cards.js` | Node.js script: syncs per-card JSON files in `cards/` from `cards.json` |
| `scripts/generate-embeds.js` | Node.js script: generates static social share pages for card and tag URLs under `share/` |

CDN runtime dependencies: [marked.js](https://marked.js.org/) (Markdown rendering), [DOMPurify](https://github.com/cure53/DOMPurify) (HTML sanitisation), [mana-font](https://mana.andrewgioia.com/) (MTG symbol font).

---

## Contributing

Contributions are welcome. The easiest way to contribute is to add card images or transcripts for planes and phenomena that are missing from the library. See the existing files in `cards/images/` and `cards/transcripts/` for the expected formats and naming conventions.

I'm honestly choosy about which custom cards are welcome in the library, for now. Please understand that any denied PR/contribution of custom cards
isn't so much an attack on the quality or design, but more so a desire to reduce duplicate/excessive design, or maintain scope.

For code contributions, open an issue first to discuss the change, then submit a pull request. Run `npm test` and `npm run test:unit` to verify your changes, and manually test affected features against the checklist in the repository.

---

## Disclaimer

Planar Atlas is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast. Magic: The Gathering, Planechase, and all associated card names and artwork are property of Wizards of the Coast LLC. Custom card images created by the community are the property of their respective creators. Please don't sue me, I'm broke.
