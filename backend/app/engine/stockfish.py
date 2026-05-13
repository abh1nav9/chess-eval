"""
Async Stockfish engine wrapper.

Communicates with the Stockfish binary via UCI protocol using asyncio subprocesses.
Designed to be used as a context manager for proper lifecycle management.
"""

import asyncio
import logging
from typing import List, Optional

from app.engine.types import EngineConfig, EngineResult, EngineScore, ScoreType

logger = logging.getLogger(__name__)


class StockfishEngine:
    """Async wrapper around the Stockfish UCI engine binary.
    
    Usage:
        async with StockfishEngine(config) as engine:
            result = await engine.analyze_position(fen)
    """

    def __init__(self, config: EngineConfig):
        self.config = config
        self._process: Optional[asyncio.subprocess.Process] = None
        self._lock = asyncio.Lock()
        self._ready = False

    async def start(self) -> None:
        """Start the Stockfish process and initialize UCI."""
        try:
            self._process = await asyncio.create_subprocess_exec(
                self.config.path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            # Initialize UCI protocol
            await self._send_command("uci")
            uci_lines = await self._wait_for("uciok", timeout=10.0)
            for ln in uci_lines:
                if ln.startswith("id name "):
                    logger.info("Stockfish identity: %s", ln[len("id name ") :].strip())
                    break

            # Configure engine
            await self._send_command(f"setoption name Threads value {self.config.threads}")
            await self._send_command(f"setoption name Hash value {self.config.hash_mb}")
            await self._send_command(f"setoption name MultiPV value {self.config.multi_pv}")

            await self._send_command("isready")
            await self._wait_for("readyok", timeout=10.0)
            self._ready = True
            logger.info("Stockfish engine started successfully")
        except FileNotFoundError:
            raise RuntimeError(
                f"Stockfish binary not found at: {self.config.path}. "
                "Install Stockfish or update STOCKFISH_PATH in your .env"
            )
        except Exception as e:
            logger.error(f"Failed to start Stockfish: {e}")
            await self.quit()
            raise

    async def new_game(self) -> None:
        """Send ucinewgame to clear hash tables. Call once per game, not per position."""
        async with self._lock:
            await self._send_command("ucinewgame")
            await self._send_command("isready")
            await self._wait_for("readyok", timeout=5.0)

    async def quit(self) -> None:
        """Gracefully shut down the engine process."""
        if self._process and self._process.returncode is None:
            try:
                await self._send_command("quit")
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except (asyncio.TimeoutError, Exception):
                self._process.kill()
                await self._process.wait()
            finally:
                self._ready = False
                logger.info("Stockfish engine stopped")

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.quit()

    async def analyze_position(
        self,
        fen: str,
        depth: Optional[int] = None,
        movetime: Optional[int] = None,
    ) -> EngineResult:
        """Analyze a single position and return the engine evaluation.
        
        Args:
            fen: FEN string of the position to analyze.
            depth: Search depth (overrides config default).
            movetime: Time limit in ms (overrides config default).
            
        Returns:
            EngineResult with score, best move, PV, and metadata.
        """
        async with self._lock:
            if not self._ready:
                raise RuntimeError("Engine not initialized. Call start() first.")

            depth = depth or self.config.depth
            movetime = self.config.movetime if movetime is None else movetime

            await self._send_command(f"position fen {fen}")
            await self._send_command("isready")
            await self._wait_for("readyok", timeout=5.0)

            if movetime and movetime > 0:
                go_cmd = f"go depth {depth} movetime {movetime}"
                parse_timeout = max(45.0, movetime / 1000.0 + 45.0)
            else:
                go_cmd = f"go depth {depth}"
                parse_timeout = max(60.0, float(depth) * 2.0)

            await self._send_command(go_cmd)

            return await self._parse_analysis_output(timeout=parse_timeout)

    async def analyze_position_multi_pv(
        self,
        fen: str,
        num_lines: int = 3,
        depth: Optional[int] = None,
    ) -> List[EngineResult]:
        """Analyze a position and return multiple principal variations."""
        async with self._lock:
            if not self._ready:
                raise RuntimeError("Engine not initialized. Call start() first.")

            depth = depth or self.config.depth

            await self._send_command(f"setoption name MultiPV value {num_lines}")
            await self._send_command("isready")
            await self._wait_for("readyok", timeout=5.0)

            await self._send_command(f"position fen {fen}")
            await self._send_command(f"go depth {depth}")

            results = await self._parse_multi_pv_output(
                num_lines=num_lines, timeout=max(90.0, float(depth) * 3.0)
            )

            # Reset MultiPV
            await self._send_command(f"setoption name MultiPV value {self.config.multi_pv}")

            return results

    async def _send_command(self, command: str) -> None:
        """Send a UCI command to the engine."""
        if self._process and self._process.stdin:
            self._process.stdin.write(f"{command}\n".encode())
            await self._process.stdin.drain()

    async def _read_line(self, timeout: float = 30.0) -> str:
        """Read a single line from engine stdout."""
        if not self._process or not self._process.stdout:
            raise RuntimeError("Engine process not available")
        try:
            line = await asyncio.wait_for(
                self._process.stdout.readline(), timeout=timeout
            )
            return line.decode().strip()
        except asyncio.TimeoutError:
            raise RuntimeError(f"Engine read timeout after {timeout}s")

    async def _wait_for(self, expected: str, timeout: float = 30.0) -> List[str]:
        """Read lines until the expected token is found."""
        lines: List[str] = []
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            remaining = deadline - asyncio.get_event_loop().time()
            line = await self._read_line(timeout=remaining)
            lines.append(line)
            if expected in line:
                return lines
        raise RuntimeError(f"Timed out waiting for '{expected}'")

    async def _parse_analysis_output(self, timeout: float = 60.0) -> EngineResult:
        """Parse UCI info lines until bestmove, return the final evaluation."""
        best_score: Optional[EngineScore] = None
        best_pv: List[str] = []
        best_depth = 0
        best_nodes = 0
        best_time = 0
        best_nps = 0

        deadline = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < deadline:
            remaining = deadline - asyncio.get_event_loop().time()
            line = await self._read_line(timeout=remaining)

            if line.startswith("bestmove"):
                parts = line.split()
                best_move = parts[1] if len(parts) > 1 else ""

                if best_score is None:
                    best_score = EngineScore(ScoreType.CENTIPAWN, 0)

                return EngineResult(
                    score=best_score,
                    best_move=best_move,
                    pv=best_pv,
                    depth=best_depth,
                    nodes=best_nodes,
                    time_ms=best_time,
                    nps=best_nps,
                )

            if line.startswith("info") and "score" in line:
                parsed = self._parse_info_line(line)
                if parsed:
                    score, pv, depth, nodes, time_ms, nps = parsed
                    # Only update from the highest-depth, PV1 line
                    if depth >= best_depth:
                        best_score = score
                        best_pv = pv
                        best_depth = depth
                        best_nodes = nodes
                        best_time = time_ms
                        best_nps = nps

        raise RuntimeError("Engine analysis timed out")

    async def _parse_multi_pv_output(
        self, num_lines: int, timeout: float = 60.0
    ) -> List[EngineResult]:
        """Parse multi-PV output and return a list of engine results."""
        pv_results: dict[int, EngineResult] = {}
        max_depth = 0

        deadline = asyncio.get_event_loop().time() + timeout

        while asyncio.get_event_loop().time() < deadline:
            remaining = deadline - asyncio.get_event_loop().time()
            line = await self._read_line(timeout=remaining)

            if line.startswith("bestmove"):
                break

            if line.startswith("info") and "multipv" in line and "score" in line:
                tokens = line.split()
                try:
                    mpv_idx = tokens.index("multipv")
                    pv_num = int(tokens[mpv_idx + 1])
                except (ValueError, IndexError):
                    continue

                parsed = self._parse_info_line(line)
                if parsed:
                    score, pv, depth, nodes, time_ms, nps = parsed
                    if depth >= max_depth:
                        max_depth = depth
                        best_move = pv[0] if pv else ""
                        pv_results[pv_num] = EngineResult(
                            score=score,
                            best_move=best_move,
                            pv=pv,
                            depth=depth,
                            nodes=nodes,
                            time_ms=time_ms,
                            nps=nps,
                        )

        results = [pv_results[k] for k in sorted(pv_results.keys())]
        return results[:num_lines]

    @staticmethod
    def _parse_info_line(
        line: str,
    ) -> Optional[tuple[EngineScore, List[str], int, int, int, int]]:
        """Parse a UCI info line into structured components."""
        tokens = line.split()
        score: Optional[EngineScore] = None
        pv: List[str] = []
        depth = 0
        nodes = 0
        time_ms = 0
        nps = 0

        i = 0
        while i < len(tokens):
            token = tokens[i]

            if token == "depth" and i + 1 < len(tokens):
                try:
                    depth = int(tokens[i + 1])
                except ValueError:
                    pass
                i += 2
            elif token == "score" and i + 2 < len(tokens):
                score_type_str = tokens[i + 1]
                try:
                    score_val = int(tokens[i + 2])
                except ValueError:
                    i += 3
                    continue
                if score_type_str == "cp":
                    score = EngineScore(ScoreType.CENTIPAWN, score_val)
                elif score_type_str == "mate":
                    score = EngineScore(ScoreType.MATE, score_val)
                i += 3
            elif token == "nodes" and i + 1 < len(tokens):
                try:
                    nodes = int(tokens[i + 1])
                except ValueError:
                    pass
                i += 2
            elif token == "time" and i + 1 < len(tokens):
                try:
                    time_ms = int(tokens[i + 1])
                except ValueError:
                    pass
                i += 2
            elif token == "nps" and i + 1 < len(tokens):
                try:
                    nps = int(tokens[i + 1])
                except ValueError:
                    pass
                i += 2
            elif token == "pv":
                pv = tokens[i + 1:]
                break
            else:
                i += 1

        if score is None:
            return None

        return score, pv, depth, nodes, time_ms, nps
