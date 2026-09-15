import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

# Active client connections
active_connections: Set[WebSocket] = set()


async def broadcast_event(event: dict):
    """
    Broadcast an event to all connected WebSocket clients.
    """
    if not active_connections:
        return

    data = json.dumps(event)
    disconnected = set()

    for ws in list(active_connections):
        try:
            await ws.send_text(data)
        except Exception:
            disconnected.add(ws)

    for ws in disconnected:
        active_connections.discard(ws)


@router.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry, AIS ticks, and detection alerts.
    """
    await websocket.accept()
    active_connections.add(websocket)
    logger.info("WebSocket client connected. Total active: %d", len(active_connections))

    try:
        # Initial connection handshake
        await websocket.send_text(json.dumps({
            "type": "connection",
            "state": "LIVE"
        }))

        # Send initial message rate
        await websocket.send_text(json.dumps({
            "type": "ais_tick",
            "payload": {
                "messageRate": 1340,
                "receivedAt": datetime.now(timezone.utc).isoformat()
            }
        }))

        # Keep-alive and telemetry ticker loop
        tick_counter = 0
        while True:
            await asyncio.sleep(5)
            tick_counter += 1

            # Push live AIS message rate tick
            await websocket.send_text(json.dumps({
                "type": "ais_tick",
                "payload": {
                    "messageRate": 1280 + (tick_counter % 7) * 15,
                    "receivedAt": datetime.now(timezone.utc).isoformat()
                }
            }))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.warning("WebSocket connection error: %s", str(e))
    finally:
        active_connections.discard(websocket)
