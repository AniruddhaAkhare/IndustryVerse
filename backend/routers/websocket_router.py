from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json

from services.realtime_stream_service import stream_realtime

router = APIRouter()

@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()

    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Industry Verse AI stream active"
        })

        async for payload in stream_realtime(interval_secs=5):
            await websocket.send_text(payload)

    except WebSocketDisconnect:
        print("Client disconnected")