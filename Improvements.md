# ChessEval — Deep Analysis, Architecture Audit & Improvement Roadmap

---

## Part 1 — How Chess.com Analyses Games (Server + Client)

Understanding their pipeline gives you a target to aim for, even at personal scale.

### 1.1 Server-Side

**Infrastructure**

Chess.com runs a distributed fleet of Stockfish workers behind a job queue (likely backed by Redis or a similar broker). When you click "Analysis", your game is serialised and enqueued. Workers pull jobs, spin up a Stockfish process, and write results back to a database. Because positions repeat across millions of games, they maintain a **position cache** keyed by Zobrist hash — if a position has already been evaluated at sufficient depth it is served instantly from cache without touching the engine.

**Depth strategy — tiered, not flat**

They do *not* evaluate every move at the same depth. A typical tiered approach:

| Game phase | Effective depth |
|---|---|
| Book moves (opening DB lookup) | No engine call at all |
| Early middlegame (ply < ~20) | Depth 18–22 |
| Late middlegame / endgame | Depth 22–26 |
| Decisive positions (eval swing > 200 cp) | Re-search at depth 28+ |

This keeps total per-game wall-clock time manageable while spending engine budget where it matters.

**Multi-PV and classification**

For each position they request **at least 2–3 PV lines** (`MultiPV 3`). The delta between the played move's evaluation and the best move's evaluation (centipawn loss) feeds into their classification thresholds. Accuracy percentages use a sigmoid curve mapping centipawn loss to 0–100.

**Opening book**

Moves that fall inside a known ECO opening tree are marked `book` with no engine evaluation at all. They maintain a curated Polyglot or custom opening database.

**Missed-win & missed-mate detection**

A second pass scans for positions where one side had forced mate or a decisive advantage (eval ≥ ~300 cp) and then lost it. These are surfaced separately as "missed wins."

**Persistence**

Results are stored per-move as a document/row containing: FEN, best move, evaluation (cp or mate), top N PV lines, centipawn loss, and classification. The full game document references all move records.

---

### 1.2 Client-Side

**Progressive rendering**

The client does not wait for the full game result. As soon as the WebSocket (or SSE stream) delivers the first analysed move, the board and eval bar begin updating. Move classifications appear move-by-move. This hides latency.

**Board state machine**

The board maintains an independent cursor (selected move index) over an immutable array of FEN snapshots produced at page load from the PGN. Navigation never calls the server — it's purely client-side FEN replay.

**Eval bar**

The bar maps centipawn evaluation through a `tanh`-like curve so it never literally pins to the top or bottom for non-mate evals. Mate-in-N is rendered as an asymptotic approach, e.g. `+M5 → 95 % white`.

**Move arrows**

For the selected move the board overlays:
- Green arrow: the best engine move
- Orange/red arrow: the played move (when different from best)

These are drawn on an SVG layer over the board canvas.

**Accuracy score**

Per-player accuracy is the mean of move-level accuracy scores (derived from the sigmoid centipawn curve), displayed as a percentage. Displayed prominently at the top of the report.

**Opening name**

The ECO code and opening name are looked up client-side from a static JSON table keyed by the first ~10 moves hash, or streamed in the analysis payload.

---

## Part 2 — Audit of Your ChessEval System

### 2.1 Backend — Issues & Fixes

---

#### ❌ Issue 1 — Flat depth for every position wastes engine budget

**Current behaviour**: `STOCKFISH_DEPTH` is applied uniformly to every move in the game.

**Problem**: A forcing sequence in move 35 needs more depth than a quiet opening move at move 4. Flat depth either over-spends on easy positions or under-evaluates critical ones.

**Fix**: Implement dynamic depth in `AnalysisPipeline`:

```python
BASE_DEPTH = settings.stockfish_depth

def get_depth_for_position(ply: int, prev_eval: int | None, cur_eval: int | None) -> int:
    # Eval swing in centipawns
    swing = abs((cur_eval or 0) - (prev_eval or 0))
    
    if swing >= 300:          # decisive swing — re-search deeper
        return min(BASE_DEPTH + 6, settings.max_analysis_depth)
    if swing >= 150:          # significant inaccuracy
        return min(BASE_DEPTH + 2, settings.max_analysis_depth)
    if ply < 10:              # early opening — shallow is fine
        return max(BASE_DEPTH - 4, 12)
    return BASE_DEPTH
```

---

#### ❌ Issue 2 — No position cache for PGN analysis

**Current behaviour**: The `POST /api/v1/analyze/fen` endpoint mentions a position cache, but the PGN pipeline calls Stockfish fresh for every position, even if the same game was analysed before.

**Fix**: In `AnalysisPipeline`, before calling the engine, query the MongoDB position cache by FEN:

```python
async def evaluate_position(self, fen: str, depth: int) -> EvalResult:
    cached = await self.position_repo.get_by_fen(fen, min_depth=depth)
    if cached:
        return cached.eval_result
    result = await self.engine.analyse(fen, depth)
    await self.position_repo.upsert(fen, depth, result)
    return result
```

Add a MongoDB index: `db.positions.create_index([("fen", 1), ("depth", -1)])`.

---

#### ❌ Issue 3 — MultiPV is not used during PGN analysis

**Current behaviour**: The engine likely runs with `MultiPV 1` for game analysis, so you only know the best move and its eval — you cannot compute the eval of the *played* move when it differs from the best move.

**Problem**: Without MultiPV ≥ 2, centipawn loss is approximated by evaluating the resulting position after the played move in a second engine call. This is slower and less accurate because positional evaluation is not symmetric.

**Fix**: Set `MultiPV 3` for game analysis positions and parse all three lines. The played move's eval is whichever PV matches the played move, or the evaluation of its resulting position.

In `StockfishEngine`:
```python
async def analyse_multi(self, fen: str, depth: int, multipv: int = 3) -> list[PVLine]:
    await self._send(f"setoption name MultiPV value {multipv}")
    # ... existing go depth logic
    # parse "info depth N multipv K score cp X pv <moves>" lines
```

---

#### ❌ Issue 4 — No opening book integration

**Current behaviour**: Every move is sent to Stockfish, including the first 10 book moves. `book` classification exists in `classifier.py` but is likely never triggered reliably.

**Fix**: Bundle a Polyglot `.bin` opening book (or a JSON ECO table) and skip engine evaluation for book positions:

```python
import chess.polyglot

def is_book_move(board: chess.Board, move: chess.Move, book_path: str) -> bool:
    with chess.polyglot.open_reader(book_path) as reader:
        return any(entry.move == move for entry in reader.find_all(board))
```

Set `EvalResult(classification="book", cp=0, best_move=None)` for these positions and skip the engine call entirely. This alone cuts analysis time by 15–25% on most games.

---

#### ❌ Issue 5 — No accuracy score calculation

**Current behaviour**: Move classifications (blunder / mistake / inaccuracy / best) exist but there is no per-player accuracy percentage — the primary KPI chess.com users look at.

**Fix**: Add an accuracy calculator using the standard sigmoid formula used in engine-based accuracy scoring:

```python
import math

def cp_to_win_percent(cp: float) -> float:
    """Convert centipawn eval to win probability (0-1)."""
    return 1 / (1 + math.exp(-0.00368208 * cp))

def move_accuracy(cp_before: float, cp_after: float, is_white: bool) -> float:
    """
    cp_before: eval (from white's POV) before the move
    cp_after: eval (from white's POV) after the move
    """
    if not is_white:
        cp_before, cp_after = -cp_before, -cp_after
    win_before = cp_to_win_percent(cp_before)
    win_after = cp_to_win_percent(cp_after)
    raw = max(0.0, win_after - win_before)          # loss in win probability
    accuracy = 103.1668 * math.exp(-0.04354 * (raw * 100)) - 3.1669
    return max(0.0, min(100.0, accuracy))

def game_accuracy(move_accuracies: list[float]) -> float:
    return sum(move_accuracies) / len(move_accuracies) if move_accuracies else 0.0
```

Add `white_accuracy: float` and `black_accuracy: float` to your `AnalysisResult` schema and store them in MongoDB.

---

#### ❌ Issue 6 — No missed-win / missed-mate detection pass

**Current behaviour**: Classifications are applied per-move in isolation. If White had a forced mate in 3 and played something else, this is classified as a blunder but not surfaced as a "missed mate."

**Fix**: Add a post-processing pass in `AnalysisPipeline.summarise()`:

```python
def find_missed_wins(moves: list[MoveResult]) -> list[int]:
    missed = []
    for i, move in enumerate(moves):
        prev = moves[i - 1] if i > 0 else None
        if prev and prev.best_eval.mate is not None and move.classification == "blunder":
            missed.append(i)
    return missed
```

Store as `missed_wins: list[int]` (ply indices) in the game summary.

---

#### ❌ Issue 7 — WebSocket payload uses raw `datetime` objects

**Current behaviour**: The docs mention `jsonable_encoder` is used to serialise datetimes in WebSocket payloads. This is a patch, not a fix.

**Fix**: Define explicit Pydantic schemas for every WebSocket event and use `.model_dump(mode="json")`:

```python
class ProgressEvent(BaseModel):
    event: Literal["progress"] = "progress"
    move_index: int
    total_moves: int
    percentage: float
    last_move: MoveResult | None = None

class CompletedEvent(BaseModel):
    event: Literal["completed"] = "completed"
    result: AnalysisResult

# In ConnectionManager
await ws.send_text(ProgressEvent(...).model_dump_json())
```

This makes the contract explicit and removes the jsonable_encoder dependency.

---

#### ❌ Issue 8 — Stockfish engine is not pooled

**Current behaviour**: Each analysis job appears to start and stop a Stockfish process.

**Problem**: `asyncio` subprocess startup costs ~50–100 ms each time. For a 40-move game with two positions per move, that's 80 process spawns.

**Fix**: Keep a single Stockfish process alive for the duration of the app using the lifespan hook in `app/main.py`, and reset state with `ucinewgame` between games:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = StockfishEngine(settings.stockfish_path)
    await engine.start()
    app.state.engine = engine
    yield
    await engine.stop()
```

Inject via `Request.app.state.engine` in `AnalysisService`. If you ever parallelise, use a small `asyncio.Queue`-based pool of 2–4 processes.

---

#### ❌ Issue 9 — No ECO opening name in analysis result

**Current behaviour**: The analysis result contains move data and evaluations but no opening name or ECO code.

**Fix**: Add a lightweight ECO lookup. Bundle `eco.json` (freely available from the `chess-openings` dataset):

```python
# app/analysis/opening.py
import json, chess, chess.pgn
from functools import lru_cache

@lru_cache(maxsize=1)
def load_eco() -> dict[str, dict]:
    with open("data/eco.json") as f:
        return {entry["epd"]: entry for entry in json.load(f)}

def detect_opening(board_history: list[chess.Board]) -> dict | None:
    eco = load_eco()
    for board in reversed(board_history):
        epd = board.epd()
        if epd in eco:
            return eco[epd]   # {"name": "...", "eco": "B20", "pgn": "..."}
    return None
```

Add `opening_name: str | None` and `opening_eco: str | None` to `AnalysisResult`.

---

### 2.2 Frontend — Issues & Fixes

---

#### ❌ Issue 10 — WebSocket URL is hardcoded to `localhost`

**Current behaviour** (from your docs): `ws://localhost:8000` is hardcoded.

**Problem**: Breaks the moment you deploy anywhere else, share with a friend, or run behind a reverse proxy.

**Fix**:

```typescript
// src/services/websocket.ts
const WS_BASE = import.meta.env.VITE_WS_URL ?? 
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

export const createAnalysisSocket = (analysisId: string) =>
  new WebSocket(`${WS_BASE}/api/v1/ws/analysis/${analysisId}`);
```

Add `VITE_WS_URL=` to `.env.example` (empty by default, auto-detected in prod).

---

#### ❌ Issue 11 — No best-move / played-move arrows on the board

**Current behaviour**: The board shows the current position but no visual indication of what the engine recommended vs what was played.

**Fix**: `react-chessboard` accepts a `customArrows` prop:

```tsx
// In Board component
const arrows: [Square, Square, string][] = [];

if (currentMove?.best_move && currentMove.best_move !== currentMove.played_move) {
  // Engine recommendation — green
  arrows.push([currentMove.best_move.slice(0,2) as Square, 
               currentMove.best_move.slice(2,4) as Square, 
               "rgba(0, 200, 100, 0.8)"]);
}
if (currentMove?.played_move) {
  // Played move — blue (or red if blunder)
  const color = currentMove.classification === "blunder" 
    ? "rgba(220, 50, 50, 0.75)" 
    : "rgba(80, 140, 230, 0.75)";
  arrows.push([currentMove.played_move.slice(0,2) as Square,
               currentMove.played_move.slice(2,4) as Square,
               color]);
}

<Chessboard customArrows={arrows} ... />
```

---

#### ❌ Issue 12 — Eval bar is linear, not sigmoid

**Current behaviour**: The eval bar almost certainly maps centipawns linearly, meaning `+10.00` looks the same as `+999`.

**Fix**: Apply a tanh transform so the bar saturates gracefully:

```typescript
// src/utils/eval.ts
export function evalToBarPercent(cp: number | null, mateIn: number | null): number {
  if (mateIn !== null) {
    return mateIn > 0 ? 97 : 3;   // near but not fully pinned
  }
  if (cp === null) return 50;
  // tanh maps ±∞ to ±1; scale so ±400cp ≈ 80/20 split
  return 50 + 47 * Math.tanh(cp / 650);
}
```

---

#### ❌ Issue 13 — No accuracy score display

**Current behaviour**: There is no per-player accuracy percentage shown in the UI.

**Fix**: Once the backend emits `white_accuracy` and `black_accuracy` in the completed payload, display them prominently in the Summary tab:

```tsx
// src/components/analysis/AccuracyBadge.tsx
const color = (acc: number) =>
  acc >= 90 ? "#5cb85c" : acc >= 75 ? "#f0ad4e" : "#d9534f";

export const AccuracyBadge = ({ label, accuracy }: { label: string; accuracy: number }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs text-muted uppercase tracking-widest">{label}</span>
    <span className="text-3xl font-bold tabular-nums" style={{ color: color(accuracy) }}>
      {accuracy.toFixed(1)}
      <span className="text-lg font-normal text-muted">%</span>
    </span>
  </div>
);
```

---

#### ❌ Issue 14 — WebSocket has no reconnection logic

**Current behaviour**: If the WebSocket drops mid-analysis (network blip, server restart) the progress overlay freezes with no recovery path.

**Fix**: Implement exponential back-off reconnection in `useAnalysisWebSocket`:

```typescript
const reconnectDelay = useRef(1000);

const connect = useCallback(() => {
  const ws = createAnalysisSocket(analysisId);
  wsRef.current = ws;

  ws.onclose = (e) => {
    if (!e.wasClean && reconnectDelay.current < 16000) {
      setTimeout(() => {
        reconnectDelay.current *= 2;
        connect();
      }, reconnectDelay.current);
    }
  };

  ws.onmessage = (e) => {
    reconnectDelay.current = 1000; // reset on successful message
    // ... existing handler
  };
}, [analysisId]);
```

---

#### ❌ Issue 15 — No opening name display

**Current behaviour**: The opening is never displayed anywhere.

**Fix**: Show the ECO code and name in the analysis page header once the completed payload arrives:

```tsx
{analysis?.opening_name && (
  <p className="text-sm text-muted">
    <span className="font-mono text-accent">{analysis.opening_eco}</span>
    {" · "}
    {analysis.opening_name}
  </p>
)}
```

---

#### ❌ Issue 16 — Eval chart has no move-click integration

**Current behaviour**: The eval graph (Chart.js) shows the evaluation curve but clicking on it does not navigate the board to that move.

**Fix**: Wire Chart.js `onClick` to `gameStore.setSelectedMoveIndex`:

```typescript
const options: ChartOptions<"line"> = {
  onClick: (_event, elements) => {
    if (elements.length > 0) {
      const idx = elements[0].index;
      gameStore.setSelectedMoveIndex(idx);
    }
  },
  // ...
};
```

---

#### ❌ Issue 17 — No board orientation toggle

**Current behaviour**: The board is fixed to white's perspective.

**Fix**: Add a flip button. `react-chessboard` accepts `boardOrientation`:

```tsx
const [flipped, setFlipped] = useState(false);

<button onClick={() => setFlipped(f => !f)} title="Flip board">⇅</button>
<Chessboard boardOrientation={flipped ? "black" : "white"} ... />
```

Auto-set `flipped` based on which colour the user played when PGN metadata contains a matching player name.

---

## Part 3 — Recommended `.env` Additions

```ini
# Existing
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=chess_eval
STOCKFISH_PATH=/opt/homebrew/bin/stockfish
STOCKFISH_DEPTH=18
STOCKFISH_MOVETIME=0
STOCKFISH_THREADS=2
STOCKFISH_HASH_MB=256

# New
STOCKFISH_MULTIPV=3               # lines to request per position
OPENING_BOOK_PATH=data/eco.json   # ECO lookup table path
POSITION_CACHE_MIN_DEPTH=12       # only cache positions evaluated >= this depth
MAX_CONCURRENT_ANALYSES=2         # engine pool size if you parallelise
```

---

## Part 4 — Prioritised Implementation Order

| Priority | Change | Impact | Effort |
|---|---|---|---|
| 🔴 1 | MultiPV ≥ 2 for accurate centipawn loss | Correctness of every classification | Medium |
| 🔴 2 | Position cache for FEN in PGN pipeline | Speed — avoids redundant engine calls | Low |
| 🔴 3 | WebSocket hardcoded URL fix (frontend) | Deployability | Trivial |
| 🟠 4 | Sigmoid eval bar | Visual correctness | Trivial |
| 🟠 5 | Accuracy score (backend + frontend) | Core KPI, big UX win | Medium |
| 🟠 6 | Opening book + ECO name | Authenticity, speed | Low |
| 🟠 7 | Best-move / played-move arrows | Essential board UX | Low |
| 🟡 8 | WebSocket reconnection | Reliability | Low |
| 🟡 9 | Dynamic depth by position | Engine efficiency | Medium |
| 🟡 10 | Engine process pooling | Performance | Medium |
| 🟡 11 | Eval chart click navigation | UX polish | Trivial |
| 🟡 12 | Board flip button | UX polish | Trivial |
| 🟢 13 | Missed win/mate detection | Analytical depth | Medium |
| 🟢 14 | Explicit WebSocket Pydantic events | Code quality | Low |

---

## Part 5 — What You Can Skip at Personal Scale

Chess.com does the following that you do **not** need:

- **Distributed worker fleet** — a single persistent Stockfish process is more than enough for one user.
- **Pre-computed position cache at opening book scale** — a Polyglot file is sufficient; you don't need to pre-analyse millions of positions.
- **CDN-delivered board assets / WASM Stockfish for client-side analysis** — your backend approach is simpler and more accurate.
- **Real-time concurrent analysis of thousands of games** — not relevant.
- **Anti-cheat / engine detection** — not relevant.

Focus your energy on correctness (MultiPV, accurate centipawn loss, accuracy scores) and the board UX (arrows, eval bar, chart interactivity). Those three areas give you 90% of the chess.com analysis experience at near-zero infrastructure cost.