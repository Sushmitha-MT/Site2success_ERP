"""
app/main.py
-----------
FastAPI app entry point.
Registers CORS middleware and all API routers created for Week 1 task.
Includes APScheduler for the rolling 7-day community chat cleanup job.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.tasks.chat_cleanup import archive_old_community_messages
from app.tasks.project_chat_cleanup import archive_old_project_messages

load_dotenv()

logger = logging.getLogger(__name__)

# ── APScheduler setup ─────────────────────────────────────────────────────────
scheduler = BackgroundScheduler(timezone="UTC")

# Run daily at 02:00 UTC — rolling 7-day community chat archive
scheduler.add_job(
    archive_old_community_messages,
    trigger=CronTrigger(hour=2, minute=0),
    id="community_chat_cleanup",
    name="Community Chat 7-Day Rolling Archive",
    replace_existing=True,
    misfire_grace_time=3600,  # tolerate up to 1-hour delay before skipping
)

# Run daily at 03:00 UTC — rolling 24-hour project chat archive
scheduler.add_job(
    archive_old_project_messages,
    trigger=CronTrigger(hour=3, minute=0),
    id="project_chat_cleanup",
    name="Project Chat 24-Hour Rolling Archive",
    replace_existing=True,
    misfire_grace_time=3600,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start/stop APScheduler alongside the FastAPI server."""
    scheduler.start()
    logger.info(
        "APScheduler started. Community chat cleanup scheduled daily at 02:00 UTC."
    )
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler shut down.")

# Import all route files (Week 1 RBAC + Week 2 Auth & User Management)
from app.routes import projects, sprints, tasks, workspace, finance
from app.routes import auth, users, clients, attendance
from app.routes import chat, project_chat, notifications
from webhooks.jibble.router import router as jibble_router
from webhooks.github.router import router as github_router

API_PREFIX = "/api/v1"

app = FastAPI(
    title="ERP System API",
    version="1.0.0",
    description="ERP System — RBAC + Project System (Week 1, Leelavathi)",
    lifespan=lifespan,
)

# Allowed origins for CORS
ALLOWED_ORIGINS = [
    "https://site2success-erp-fpsl.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

# Allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(sprints.router,  prefix=API_PREFIX)
app.include_router(tasks.router,    prefix=API_PREFIX)
app.include_router(workspace.router, prefix=API_PREFIX)
app.include_router(finance.router,  prefix=API_PREFIX)
app.include_router(auth.router,     prefix=API_PREFIX)
app.include_router(users.router,    prefix=API_PREFIX)
app.include_router(clients.router,  prefix=API_PREFIX)
app.include_router(attendance.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(project_chat.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(jibble_router)
app.include_router(github_router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import logging
    logging.error(f"Global error: {exc}", exc_info=True)
    from fastapi.responses import JSONResponse
    
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )
    # Manually add CORS headers for safety on 500s
    response.headers["Access-Control-Allow-Origin"] = "https://site2success-erp-fpsl.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.get("/")
def root():
    return {
        "message": "ERP System API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }
