import json
import logging
from typing import Any, Dict, Set

from fastapi import WebSocket
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections for analysis progress."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, analysis_id: str):
        await websocket.accept()
        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = set()
        self.active_connections[analysis_id].add(websocket)
        logger.info(f"WebSocket connected for analysis: {analysis_id}")

    def disconnect(self, websocket: WebSocket, analysis_id: str):
        if analysis_id in self.active_connections:
            self.active_connections[analysis_id].discard(websocket)
            if not self.active_connections[analysis_id]:
                del self.active_connections[analysis_id]
        logger.info(f"WebSocket disconnected for analysis: {analysis_id}")

    async def broadcast(self, analysis_id: str, event: BaseModel):
        """Send a typed Pydantic event to all clients watching this analysis."""
        if analysis_id not in self.active_connections:
            return
        payload = event.model_dump_json()
        dead: set[WebSocket] = set()
        for conn in self.active_connections[analysis_id]:
            try:
                await conn.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send WS message: {e}")
                dead.add(conn)
        for d in dead:
            self.active_connections[analysis_id].discard(d)

    async def broadcast_progress(self, analysis_id: str, progress: Dict[str, Any]):
        """Legacy dict broadcast — serializes with json."""
        if analysis_id not in self.active_connections:
            return
        dead: set[WebSocket] = set()
        try:
            payload_str = json.dumps(progress, default=str)
        except Exception as e:
            logger.warning(f"Failed to serialize WS payload: {e}")
            return
        for conn in self.active_connections[analysis_id]:
            try:
                await conn.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Failed to send WS message: {e}")
                dead.add(conn)
        for d in dead:
            self.active_connections[analysis_id].discard(d)


manager = ConnectionManager()
