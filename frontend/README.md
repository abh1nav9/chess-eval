# ChessEval Frontend

Vite + React + TypeScript SPA for submitting games or FEN positions, watching async PGN analysis, and exploring results on an interactive board with Win%-mapped eval bar and chart, move list, engine lines, summary, and board-themed UI.

## Architecture

The UI is a client-only app that talks to the **ChessEval backend** over HTTP and (for PGN jobs) **WebSocket**. State is split by concern: server-backed analysis in Zustand + TanStack Query, board replay in a dedicated game store, and UI chrome (tabs, **light/dark theme**, **board theme**, sidebar) in `uiStore` (persisted in `localStorage`).

```mermaid
flowchart LR
  subgraph app [React app]
    Router[React Router]
    Pages[Pages / layouts]
    Board[Board + EvalBar]
    Side[Analysis sidebar]
    Stores[Zustand stores]
  end

  subgraph server [Backend localhost:8888]
    API[REST /api/v1]
    WS[WebSocket /api/v1/ws/analysis/id]
  end

  Router --> Pages
  Pages --> Board
  Pages --> Side
  Pages --> Stores
  Stores --> API
  Stores --> WS
```

**What the app does today**

1. **Setup** (`SetupView`): user pastes **PGN** or opens **Chess.com**, enters a public username; the app calls `GET /api/v1/chesscom/player/{user}/recent-games` (backend proxy—Chess.com blocks browser CORS). The response includes each game’s PGN plus **`player_profiles`** (from Chess.com `pub/player/{username}`: display name, FIDE-style **title**, **avatar** URL) and per-game **`white_*` / `black_*`** display fields. The game list shows title + name + rating. **Analyze** sends the same **`POST /api/v1/analyze/pgn`** + WebSocket flow as a pasted PGN (only `pgn` is posted to the API); the client stores **`analysis_id`**, loads the PGN into **`gameStore`**, and opens a **WebSocket** for **`progress`** / **`completed`** / **`failed`**. For Chess.com rows it also sets **`chessComPlayerOverlay`** in **`analysisStore`** so **`PlayerInfo`** can show **GM / IM** (etc.), real names, and avatars (**`referrerPolicy="no-referrer"`**, with icon fallback if the image fails). Pasting PGN or loading a stored analysis clears that overlay; **Re-analyze** keeps the overlay when it was already set. FEN submit uses `POST /api/v1/analyze/fen` and shows a single-position result (when enabled in the UI); FEN mode clears the Chess.com overlay.
2. **Analysis page**: chessboard (`react-chessboard` + `chess.js` FEN history), **eval bar** (strip height matches board; fill uses **`evalToBarPercent`** in `src/utils/evalBarPercent.ts`—Lichess-style sigmoid on centipawns from API **pawns** white POV, plus asymptotic mate heights; bar square colors follow `--color-white-square` / `--color-black-square`). **PlayerInfo** shows the same eval string to the **left of avatars** when analysis is loaded. **Board controls** (first/prev/next/last + flip + keyboard) stay synced with **`selectedMoveIndex`**. Sidebar tabs (**Moves**, **Engine**, **Summary**). **Eval graph** (Chart.js): Y-axis is **white win %** (0–100%), same `evalToBarPercent` as the bar; tooltips show pawn eval (or mate) and win %. **Flip board** swaps which player row sits above or below the board.
3. **Live exploration**: from the analyzed position you can play alternate moves on the board; the client requests FEN analysis and merges live eval into the store **without clearing** the PGN move list (`setExplorationFenEval` path).
4. **Sounds**: MP3s under `public/sounds/` are driven by **`GameSoundCoordinator`** (`src/audio/`): game start or timeout (from PGN `[Termination]` when present) when analysis is ready; move outcomes (piece move, capture, castle, check, mate, stalemate) on user moves and on line navigation (forward and single-step back; jump-to-start uses a generic move clip).
5. **Progress overlay**: while a PGN job is running, a modal shows engine progress; it clears when the WebSocket delivers `completed` with the full result.
6. **Styling**: Tailwind CSS v4 with semantic tokens in `src/index.css` (light/dark via `data-theme` on `html`, persisted in `uiStore`). **`src/styles/boardChrome.css`** (loaded after base CSS) overrides backgrounds, borders, accents, and board square CSS variables per **`data-board-theme`** (`classic` | `brown` | `gray` | `blue` | `pink`) so the app chrome matches the selected board palette. Board width/height constant: `src/constants/boardLayout.ts` (`ANALYSIS_BOARD_PIXEL_SIZE`).

**Eval mapping (reference)**

Design notes and formulas live in the repo root **`evalbar.md`** (sigmoid constant, mate curve, comparison to Chess.com linear). The implemented helpers are `cpToBarPercent`, `mateToBarPercent`, and `evalToBarPercent` in **`src/utils/evalBarPercent.ts`**; labels use **`src/utils/formatEvalDisplay.ts`**.

**Integration notes**

- Vite **`/api` proxy** (see `vite.config.ts`) forwards REST calls to the backend so the browser can use same-origin `/api/...` in dev.
- The WebSocket URL defaults to **`VITE_WS_URL`** if set; otherwise **`ws(s)://` + `window.location.host`**, so in dev the Vite **`/api` proxy** (see `vite.config.ts`, `ws: true`) can forward **`/api/v1/ws/analysis/...`** to the backend. Set **`VITE_WS_URL`** (e.g. `ws://localhost:8888`) if your API host differs from the SPA host.

## Tech stack

- **React** 19, **Vite** 8, **TypeScript**
- **Tailwind CSS** v4 (`@tailwindcss/vite`)
- **react-router-dom** v7
- **Zustand** (analysis, game, UI state) and **TanStack Query** (mutations / optional queries)
- **chess.js** + **react-chessboard** for the board
- **Chart.js** + **react-chartjs-2** + **chartjs-plugin-annotation** for the eval graph
- **Framer Motion** for transitions
- **Axios** for HTTP

## Getting started

```bash
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:5173`

Production build:

```bash
npm run build
```

Output: `dist/`. Preview locally: `npm run preview`.

## Project layout

| Path | Purpose |
|------|---------|
| `src/app/` | `App.tsx`, router, providers |
| `src/pages/` | Route-level pages (e.g. `AnalysisPage`) |
| `src/components/layout/` | Shell, header, page wrapper |
| `src/components/board/` | Board, eval bar, controls, player info |
| `src/components/analysis/` | Setup, sidebar, move list, Chess.com import, progress overlay |
| `src/components/charts/` | Eval graph |
| `src/audio/` | Sound path map + `GameSoundCoordinator` |
| `src/store/` | `analysisStore`, `gameStore`, `uiStore` |
| `src/hooks/` | PGN/FEN mutations, WebSocket subscription |
| `src/services/` | Axios API client (`analysisService`, `chessComService`) |
| `src/utils/` | **`evalBarPercent`** (bar + chart white win %), **`formatEvalDisplay`**, live move classification, PGN termination, sound replay, **`chessComBoardOverlay`** |
| `src/styles/` | Per-board chromatic overrides (`boardChrome.css`) |
| `src/constants/boardLayout.ts` | Analysis board pixel size (eval bar height) |
| `src/types/` | Shared TS types aligned with backend payloads |
| `public/sounds/` | Board / session MP3 assets |

## Lint

```bash
npm run lint
```
