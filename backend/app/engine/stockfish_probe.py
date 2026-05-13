"""Lightweight UCI probe for Stockfish identity (version string)."""

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


class StockfishVersionProbe:
    """Reads `id name` from a Stockfish binary via UCI (no long-running engine)."""

    @staticmethod
    async def read_id_name(binary_path: str, timeout: float = 5.0) -> Optional[str]:
        try:
            proc = await asyncio.create_subprocess_exec(
                binary_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            assert proc.stdin and proc.stdout
            proc.stdin.write(b"uci\nquit\n")
            await proc.stdin.drain()
            proc.stdin.close()

            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                line_b = await asyncio.wait_for(proc.stdout.readline(), timeout=1.0)
                if not line_b:
                    break
                line = line_b.decode(errors="ignore").strip()
                if line.startswith("id name "):
                    try:
                        await asyncio.wait_for(proc.wait(), timeout=2.0)
                    except asyncio.TimeoutError:
                        proc.kill()
                    return line[len("id name ") :].strip()
            try:
                await asyncio.wait_for(proc.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                proc.kill()
        except FileNotFoundError:
            logger.debug("Stockfish binary not found at %s", binary_path)
        except Exception as e:
            logger.debug("Stockfish version probe failed: %s", e)
        return None
