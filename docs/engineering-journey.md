# Engineering journey: challenges/problems in ChessEval

ChessEval is a full-stack chess analysis product: **FastAPI** talks to **Stockfish** over **UCI**, persists games in **MongoDB**, streams progress over **WebSockets**, and a **React + Vite** client renders the board, charts, and engine lines. This document focuses on **non-trivial engineering problems** that showed up while wiring engines, browsers, and distributed state—not cosmetic polish.

---

## 1. UCI scores are side-to-move; our product is white-centric

**Problem:** Stockfish (and UCI in general) reports centipawn and mate scores **relative to the side to move** on the position you analyzed. Most of our pipeline—classifications, accuracy-style metrics, charts, and API consumers—assumes evaluations in **White’s perspective** everywhere.

If you skip normalization, a position that is “+0.5 for Black” can surface as **-0.5** or the opposite sign depending on whose turn it is, and anything derived from deltas between moves becomes wrong in hard-to-spot ways.

**What we did:** A dedicated **`WhitePovEngineNormalizer`** flips scores when `chess.Board(fen).turn` is Black, including nested **MultiPV** results so secondary lines stay consistent. That keeps one invariant end-to-end: **store and serve White POV**, and only talk “side to move” at the engine boundary.

This is a classic integration trap: the engine is correct; the **contract** between engine protocol and app semantics is where bugs live.

---

## 2. One Stockfish process, many jobs: throughput vs correctness

**Problem:** Spawning a Stockfish process per request is simple but heavy (startup, `isready`, option setup, hash allocation). Keeping **one long-lived engine** per API instance saves RAM and cold-start latency—but Stockfish is **stateful**: hash tables, thread pool, and the current search are not safe to share across arbitrary concurrent searches.

**What we did:**

- A **pooled `StockfishEngine`** is started in app lifespan when possible; analysis work either uses that pool or falls back to a per-job engine if startup fails.
- When the pool is active, **PGN analysis** runs under a **global `asyncio.Lock`** so only one full game search mutates that process at a time, while a **semaphore** caps how many analyses are in flight overall so we do not queue unbounded memory and work.
- The engine wrapper itself serializes commands with its **own lock** and exposes **`ucinewgame`** at game boundaries so hash state does not bleed across unrelated PGNs.

The engineering tradeoff is explicit: we accept **serialization of PGN jobs** against a single process in exchange for predictable resource use on small hosts. Wrong locking shows up as rare crashes or nonsense PVs; too little locking shows up as intermittent nonsense—both are expensive to debug.

---

## 3. The analysis pipeline: cost control without lying about the game

A naïve implementation runs the same depth on every move until the heat death of the universe. Real users want **Chess.com-like** behavior: spend compute where tactics swing, skim quiet positions, respect opening theory, and still return **MultiPV** data for UI lines.

Concrete sub-problems we had to encode:

### Tiered depth vs “full depth” runs

When the requested game depth equals the configured **default game depth**, we enable **tiered** search: depth per move depends on **eval swing** from the previous position (and early opening plies can stay shallow). When the user asks for a **non-default** depth (e.g. 36), tiering turns off and every move uses that depth—same pipeline, different scheduling policy.

### Two-pass swing resolution

With **`ANALYSIS_TWO_PASS_ENABLED`**, we run **cheap** searches on FEN before and after the move to estimate tactical volatility, then map swing centipawns to a target depth via **`resolve_depth_from_swing`**. That is a deliberate **latency vs risk** knob: one extra pair of shallow probes buys a data-driven depth choice for the expensive pass.

### Book moves vs engine moves

We detect **opening book depth** from consecutive positions in the opening tree, and optionally consult a **Polyglot** probe so “book but not in our PGN tree” moves still get classified as book. The hard part is **boundary correctness**: once you leave book, engine evaluation must attach cleanly without double-counting or skipping progress broadcasts.

### MultiPV and avoiding redundant searches

At each non-book position we often run **MultiPV**. If the **played move is already the best line** in that MultiPV bundle, the “position after the move” evaluation can be **read from an alternate PV line** instead of spawning another root search (`played_child_is_root_multipv`). We also **carry** the previous position’s “after” result forward as the next position’s “before” when that chain is valid—small optimizations that matter when a game has 80 moves and each root search is expensive.

### Accuracy / Lichess-style fields under pressure

For accuracy-related follow-ups we sometimes need a **child position after the best move**. If the engine’s reported best UCI is not legal on our reconstructed board (data repair paths), we **re-query** at a bounded depth and retry—real-world defensive code against inconsistent PV parsing or edge-case FEN handling, not a happy-path demo.

### Position cache

Repeated FENs (common in analysis + exploration) hit a **Mongo-backed position cache** keyed by hash with a **minimum depth** gate before reuse. Cache writes are best-effort (failures should not take down analysis); that is another production detail: **correctness must not depend on cache success**.

---

## 4. WebSockets across environments: URLs, TLS, and flaky networks

**Problem:** The browser connects to **`/api/v1/ws/analysis/:id`**, but the host for HTTP API calls is not always the host for WebSockets in real deployments (reverse proxies, separate API subdomain, preview vs production). A naive `new WebSocket("ws://localhost:8888/...")` baked into the client breaks the moment the UI is served from another origin.

**What we did:**

- **`VITE_WS_URL`** can override the WebSocket base; otherwise we derive **`ws` vs `wss`** from `window.location` so local HTTPS and production line up with how browsers expect mixed content rules to work.
- On **unclean closes** while a job is still running, we apply **exponential backoff** up to a cap and reconnect—mobile tabs sleep, laptops change Wi-Fi, deploys roll. We deliberately **stop** reconnecting once a terminal **`completed`** / **`failed`** message arrives (`doneRef`) so we do not spin forever after success.
- Progress payloads are **defensively parsed** (unknown fields, partial progress before move totals exist). We also anchor an **ETA clock** from the first progress event that knows total moves—small UX logic that depends on understanding noisy, out-of-order-ish server messages.

The hard lesson: WebSockets are easy in a demo on one machine; they are **routing, TLS, and lifecycle** problems in production.

---

## 5. Browser security vs product features: Chess.com avatars

**Problem:** Browsers enforce **CORS** and often **referrer** policies on hotlinked images. Chess.com avatars live on their CDN; linking them directly from our SPA can fail depending on environment, and brittle “just disable security” answers are not acceptable.

**What we did:** Only rewrite URLs that are actually on **`images.chess.com`**, and route them through **`/api/v1/proxy/avatar`** on our API with a query parameter. The browser talks to **our origin**; the server fetches the image. That moves cross-origin complexity to a place we control.

---

## 6. Two evaluation sources in the UI: precomputed PGN vs live exploration

**Problem:** After a game is analyzed, users explore variations. The board may need a **live FEN evaluation** while the move list still reflects the **stored PGN analysis**. The eval bar, engine lines, and “who is better” readout must pick the **right source** based on mode (`isExploring`, presence of `fenResult`, selected move index), or the UI will show a smooth chart from the game while the bar shows an unrelated snapshot—or vice versa.

**What we did:** Central branching in the analysis page (and mirrored logic in board-related hooks) so **exploration + `fenResult` wins** for current eval, otherwise we walk **`pgnResult.moves`** with careful index semantics (`eval_before` at the start of the game vs `eval_after` on each row).

This is state-machine work disguised as React props: the bug class is **stale closure** and **mixed sources of truth**, not CSS.

---

## 7. Shipping Stockfish inside Linux containers

**Problem:** Developer laptops are macOS or Windows; production images are **Linux glibc**. You cannot copy a local Mac Stockfish binary into a generic Linux image and expect it to run. You also do not want to hand-edit release tags every month.

**What we did:** At **image build time**, resolve **Stockfish’s latest GitHub release** via the API, download the **Linux x86-64 AVX2** artifact, locate the binary inside the tarball with **`find`** (upstream layout can shift slightly), and install to `/usr/local/bin/stockfish`. Language runtimes and databases stay **pinned** in Compose so the moving part is the engine artifact we explicitly chose to float.

Tradeoff: builds need **network access** to GitHub; air-gapped environments need a different supply path.

---

## Closing

The recurring theme is **boundary discipline**: engine protocol vs domain semantics, process sharing vs concurrency, HTTP client vs WebSocket transport, browser same-origin rules vs third-party CDNs, and cached or tiered compute vs user-visible truth. Those are the places where systems look “almost done” for a long time—and where solid engineering actually shows up.
