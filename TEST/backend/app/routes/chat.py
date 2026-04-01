"""
app/routes/chat.py
------------------
Real-time company chat via WebSocket + REST APIs.
  WS  /ws/chat              — real-time broadcast to all connected users
  GET /chat/messages        — fetch last N messages (auth required)
  POST /chat/upload         — upload image/video/document (auth required)
"""

import os
import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File,
    WebSocket, WebSocketDisconnect, status, Form
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.chat_messages import ChatMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

# ── Upload config ──────────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "chat")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_MB = 20
ALLOWED_MIME_PREFIXES = ["image/", "video/"]
ALLOWED_DOCUMENT_MIMES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
]
BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi", ".vbs", ".ps1"]


def _classify_file_type(content_type: str, filename: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    return "document"


# ── WebSocket Connection Manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        data = json.dumps(message, default=str)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time chat.
    Client sends: { "token": "<jwt>", "message": "...", "file_url": ..., "file_type": ..., "file_name": ... }
    Server broadcasts the saved message to ALL connected clients.
    """
    from app.middleware.auth import get_current_user
    from fastapi import WebSocketDisconnect
    from jose import jwt, JWTError
    import os

    SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION")
    ALGORITHM = "HS256"

    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            # 1. Authenticate via token in payload
            token = data.get("token")
            if not token:
                await websocket.send_text(json.dumps({"error": "No token provided"}))
                continue

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
                sender_name = payload.get("sub", "Unknown")
                # Try to get full_name from DB
                from app.models.users import User
                db_user = db.query(User).filter(User.id == user_id).first()
                if db_user:
                    sender_name = db_user.full_name
            except JWTError:
                await websocket.send_text(json.dumps({"error": "Invalid token"}))
                continue

            msg_text = data.get("message", "").strip() or None
            file_url = data.get("file_url") or None
            file_type = data.get("file_type") or None
            file_name = data.get("file_name") or None

            if not msg_text and not file_url:
                continue  # ignore empty payloads

            # 2. Persist message
            chat_msg = ChatMessage(
                id=uuid.uuid4(),
                sender_id=str(user_id),
                sender_name=sender_name,
                message=msg_text,
                file_url=file_url,
                file_type=file_type,
                file_name=file_name,
                created_at=datetime.utcnow(),
            )
            db.add(chat_msg)
            db.commit()
            db.refresh(chat_msg)

            # 3. Broadcast to all
            await manager.broadcast({
                "type": "new",
                "data": {
                    "id": str(chat_msg.id),
                    "sender_id": str(chat_msg.sender_id),
                    "sender_name": chat_msg.sender_name,
                    "message": chat_msg.message,
                    "file_url": chat_msg.file_url,
                    "file_type": chat_msg.file_type,
                    "file_name": chat_msg.file_name,
                    "created_at": chat_msg.created_at.isoformat(),
                    "updated_at": chat_msg.updated_at.isoformat() if chat_msg.updated_at else None,
                }
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# ── REST: Get message history ──────────────────────────────────────────────────

@router.get("/messages")
def get_messages(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch the last N community chat messages (authenticated users only).
    Always filtered to the last 7 days as an API-level safety layer —
    even if the background archive job has not run yet, old messages are
    never exposed to clients.
    """
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.created_at >= seven_days_ago)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "sender_name": m.sender_name,
            "message": m.message,
            "file_url": m.file_url,
            "file_type": m.file_type,
            "file_name": m.file_name,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        }
        for m in messages
    ]


# ── REST: File upload ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a file for the chat.
    - Validates MIME type and extension
    - Limits size to MAX_FILE_SIZE_MB
    - Returns { file_url, file_type, file_name }
    """
    # Extension check
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not allowed.",
        )

    content_type = file.content_type or "application/octet-stream"
    is_allowed = (
        content_type.startswith("image/")
        or content_type.startswith("video/")
        or content_type in ALLOWED_DOCUMENT_MIMES
    )
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{content_type}' is not allowed.",
        )

    # Read and size check
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size is {MAX_FILE_SIZE_MB} MB.",
        )

    # Save to disk
    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as f:
        f.write(contents)

    file_type = _classify_file_type(content_type, filename)
    file_url = f"/chat/files/{unique_name}"

    return {
        "file_url": file_url,
        "file_type": file_type,
        "file_name": filename,
    }


# ── Static file serving for uploaded chat files ────────────────────────────────

from fastapi.responses import FileResponse

@router.get("/files/{filename}")
def serve_chat_file(filename: str):
    """Serve uploaded chat files."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


# ── REST: Edit/Delete ──────────────────────────────────────────────────────────

@router.put("/messages/{message_id}")
async def edit_message(
    message_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Edit a chat message (sender only)."""
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if str(msg.sender_id) != str(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    new_text = payload.get("message", "").strip()
    if not new_text and not msg.file_url:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg.message = new_text
    msg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Broadcast edit
    await manager.broadcast({
        "type": "edit",
        "data": {
            "id": str(msg.id),
            "message": msg.message,
            "updated_at": msg.updated_at.isoformat(),
        }
    })
    return {"status": "ok"}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat message (sender only)."""
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if str(msg.sender_id) != str(current_user["user_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    # Delete physical file if exists
    if msg.file_url:
        filename = msg.file_url.split("/")[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete chat file: {e}")

    db.delete(msg)
    db.commit()

    # Broadcast delete
    await manager.broadcast({
        "type": "delete",
        "data": {"id": str(message_id)}
    })
    return {"status": "ok"}
