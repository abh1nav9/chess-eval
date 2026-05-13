from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

@router.websocket("/ws/analysis/{analysis_id}")
async def websocket_endpoint(websocket: WebSocket, analysis_id: str):
    """WebSocket endpoint for receiving real-time analysis progress."""
    await manager.connect(websocket, analysis_id)
    try:
        while True:
            # Keep connection alive, we don't expect messages from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, analysis_id)
    except Exception as e:
        logger.error(f"WebSocket error for {analysis_id}: {e}")
        manager.disconnect(websocket, analysis_id)
