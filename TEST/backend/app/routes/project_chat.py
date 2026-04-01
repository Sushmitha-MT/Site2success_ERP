import os
import uuid
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File,
    WebSocket, WebSocketDisconnect, status
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.projects import Project
from app.models.project_members import ProjectMember
from app.models.project_messages import ProjectMessage
from app.models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/project-chat", tags=["Project Chat"])

# ── Upload config ──────────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "project_chat")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_MB = 25
ALLOWED_DOCUMENT_MIMES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
]
class MessageCreate(BaseModel):
    message: str

BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi", ".vbs", ".ps1"]

def _classify_file_type(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    return "file"

def _is_member(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """
    STRICT ACCESS CONTROL: Check if user is either the Project Lead 
    or an explicitly added collaborator. NO role-based overrides.
    """
    # 1. Check if user is the Project Manager/Lead
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False
    if project.manager_id == user_id:
        return True
    
    # 2. Check if user is an added Project Member
    membership = db.query(ProjectMember).filter_by(project_id=project_id, user_id=user_id).first()
    return membership is not None

# ── WebSocket Connection Manager ──────────────────────────────────────────────

class ProjectConnectionManager:
    def __init__(self):
        # project_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, project_id: str, message: dict):
        if project_id not in self.active_connections:
            return
        data = json.dumps(message, default=str)
        dead = []
        for connection in self.active_connections[project_id]:
            try:
                await connection.send_text(data)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d, project_id)

manager = ProjectConnectionManager()

# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@router.websocket("/ws/{project_id}")
async def websocket_project_chat(
    websocket: WebSocket,
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    WebSocket for per-project chat. 
    Strictly restricted to assigned project members only.
    """
    SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION")
    ALGORITHM = "HS256"
    
    pid = uuid.UUID(project_id)
    
    # 1. Accept and ask for token
    await manager.connect(websocket, project_id)
    
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            
            # Authenticate via token in payload
            token = data.get("token")
            if not token:
                await websocket.send_text(json.dumps({"error": "Unauthorized: No token"}))
                continue
            
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                uid_str = payload.get("user_id")
                if not uid_str:
                    raise JWTError()
                uid = uuid.UUID(uid_str)
            except (JWTError, ValueError):
                await websocket.send_text(json.dumps({"error": "Unauthorized: Invalid token"}))
                continue

            # GOLDEN RULE: Strict membership check
            if not _is_member(db, pid, uid):
                await websocket.send_text(json.dumps({"error": "Forbidden: Not a project member"}))
                continue

            # Process Message
            msg_text = data.get("message", "").strip() or None
            file_url = data.get("file_url") or None
            file_type = data.get("file_type") or None
            file_name = data.get("file_name") or None

            if not msg_text and not file_url:
                continue

            # Get user name
            db_user = db.query(User).filter(User.id == uid).first()
            sender_name = db_user.full_name if db_user else "Unknown"

            # Persist
            new_msg = ProjectMessage(
                project_id=pid,
                sender_id=uid,
                sender_name=sender_name,
                message=msg_text,
                file_url=file_url,
                file_type=file_type,
                file_name=file_name
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

            # Broadcast
            await manager.broadcast(project_id, {
                "type": "message",
                "data": {
                    "id": str(new_msg.id),
                    "project_id": str(new_msg.project_id),
                    "sender_id": str(new_msg.sender_id),
                    "sender_name": new_msg.sender_name,
                    "message": new_msg.message,
                    "file_url": new_msg.file_url,
                    "file_type": new_msg.file_type,
                    "file_name": new_msg.file_name,
                    "created_at": new_msg.created_at.isoformat()
                }
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
    except Exception as e:
        logger.error(f"Project WebSocket error: {e}")
        manager.disconnect(websocket, project_id)

# ── REST: History ──────────────────────────────────────────────────────────────

@router.get("/{project_id}/messages")
def get_project_messages(
    project_id: uuid.UUID,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch history. Strict membership check applied."""
    uid = uuid.UUID(current_user["user_id"])
    if not _is_member(db, project_id, uid):
        raise HTTPException(status_code=403, detail="Access denied: Not a project member")

    messages = (
        db.query(ProjectMessage)
        .filter(ProjectMessage.project_id == project_id)
        .order_by(ProjectMessage.created_at.asc())
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
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

# ── REST: Send Message (Reliability) ──────────────────────────────────────────

@router.post("/{project_id}/messages")
async def send_project_chat_message(
    project_id: uuid.UUID,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(current_user["user_id"])
        if not _is_member(db, project_id, uid):
            raise HTTPException(status_code=403, detail="Access denied: Not a project member")

        msg_text = data.message.strip()
        if not msg_text:
            raise HTTPException(status_code=400, detail="Empty message")

        # Get user name
        db_user = db.query(User).filter(User.id == uid).first()
        sender_name = db_user.full_name if db_user else "Unknown"

        # Persist
        new_msg = ProjectMessage(
            project_id=project_id,
            sender_id=uid,
            sender_name=sender_name,
            message=msg_text
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Broadcast to all online members
        payload = {
            "type": "message",
            "data": {
                "id": str(new_msg.id),
                "project_id": str(new_msg.project_id),
                "sender_id": str(new_msg.sender_id),
                "sender_name": new_msg.sender_name,
                "message": new_msg.message,
                "file_url": new_msg.file_url,
                "file_type": new_msg.file_type,
                "file_name": new_msg.file_name,
                "created_at": new_msg.created_at.isoformat()
            }
        }
        await manager.broadcast(str(project_id), payload)
        return payload["data"]
    except Exception as e:
        import traceback
        with open("chat_debug.log", "a") as f:
            f.write(f"\n[{datetime.now()}] POST ERROR: {str(e)}\n{traceback.format_exc()}\n")
        raise HTTPException(status_code=500, detail=str(e))

# ── REST: File Upload ──────────────────────────────────────────────────────────

@router.post("/{project_id}/upload")
async def upload_project_chat_file(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Secure file upload for project chat."""
    uid = uuid.UUID(current_user["user_id"])
    if not _is_member(db, project_id, uid):
        raise HTTPException(status_code=403, detail="Access denied")

    # Extension check
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    unique_name = f"{uuid.uuid4()}_{filename}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as f:
        f.write(contents)

    file_type = _classify_file_type(file.content_type or "")
    file_url = f"/api/v1/project-chat/files/{unique_name}"

    return {
        "file_url": file_url,
        "file_type": file_type,
        "file_name": filename
    }

@router.get("/files/{filename}")
def serve_project_chat_file(filename: str):
    """Serve files."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
