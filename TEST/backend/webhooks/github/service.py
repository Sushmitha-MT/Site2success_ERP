"""
Event-driven routing:
  - pull_request (action=opened) → CREATE a task AND CREATE notification
  - push with commits            → ADD a comment to task_comments AND CREATE notification
 
New RBAC Notification Rule:
  - DO NOT notify the user who triggered the event.
  - Notify the Project Manager.
  - Notify the Team Lead (defined as any other 'project_manager' or 'manager' assigned to the project).
"""
import uuid
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
 
from app.models.tasks import Task
from app.models.task_comments import TaskComment
from app.models.projects import Project
from app.models.users import User
from app.models.project_members import ProjectMember
from app.models.notifications import Notification
from webhooks.github.schemas import GitHubPayload

logger = logging.getLogger(__name__)


def _create_notifications_for_managers(db: Session, project: Project, pusher_user: User, title: str, message: str):
    """
    Finds the project manager and any team leads (managers assigned to the project).
    Creates a notification for each, explicitly EXCLUDING the pusher_user.
    """
    notify_user_ids = set()

    # 1. Add Project Manager
    if project.manager_id:
        notify_user_ids.add(str(project.manager_id))

    # 2. Add any other "managers" assigned to the project as "Team Leads"
    team_leads = (
        db.query(User.id)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .filter(
            ProjectMember.project_id == project.id,
            User.role.in_(["project_manager", "manager"])
        )
        .all()
    )
    for (lead_id,) in team_leads:
        notify_user_ids.add(str(lead_id))

    # 3. Exclude the user who triggered the event
    pusher_id_str = str(pusher_user.id) if pusher_user else None
    if pusher_id_str in notify_user_ids:
        notify_user_ids.remove(pusher_id_str)

    # 4. Create the notifications
    for uid in notify_user_ids:
        try:
            notif = Notification(
                id=uuid.uuid4(),
                user_id=uid,
                title=title,
                message=message,
                is_read=False
            )
            db.add(notif)
        except Exception as e:
            logger.error(f"Failed to create notification for user {uid}: {e}")
            pass
            
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to commit notifications: {e}")
        db.rollback()


def _get_pusher_user(payload: GitHubPayload, db: Session) -> User | None:
    """Extract github_username and match it to an internal User."""
    github_username = None
    if payload.sender and payload.sender.login:
        github_username = payload.sender.login
        
    if not github_username:
        return None
        
    # Match with users in DB
    user = db.query(User).filter(User.github_username == github_username).first()
    return user


# ── Option A: Create a Task from a Pull Request event ─────────────────────────
def handle_pull_request_opened(payload: GitHubPayload, db: Session) -> dict:
    pr = payload.pull_request
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pull_request field missing in payload",
        )
 
    # Find project
    project = (
        db.query(Project)
        .filter(Project.name == payload.repository.name)
        .first()
    )
 
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No project found matching repository: {payload.repository.name}",
        )
 
    # Link pusher
    pusher_user = _get_pusher_user(payload, db)
    
    # Create Task
    task = Task(
        id=uuid.uuid4(),
        title=pr.title,
        description=pr.body or f"Auto-created from GitHub PR #{pr.number}",
        project_id=project.id,
        status="todo",
        priority="medium",
        order_index=0,
        assignee_id=pusher_user.id if pusher_user else None,
        github_event_type="pull_request",
        github_actor_username=payload.sender.login if payload.sender else "Unknown",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notification Logic
    if pusher_user:
        title = f"New Pull Request in {project.name}"
        message = f"User {pusher_user.full_name} ({pusher_user.github_username}) opened a pull request in Project {project.name}: '{pr.title}'"
        _create_notifications_for_managers(db, project, pusher_user, title, message)

    return {
        "message": "Task created from GitHub PR",
        "event_type": "task_created",
        "record_id": str(task.id),
    }

 
# ── Option B: Add a Comment from a Push event ─────────────────────────────────
def handle_push_event(payload: GitHubPayload, db: Session) -> dict:
    commits = payload.commits
    if not commits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No commits found in push payload",
        )
 
    commit_message = commits[-1].message
 
    # Find project by repo name
    project = (
        db.query(Project)
        .filter(Project.name == payload.repository.name)
        .first()
    )
 
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No project found matching repository: {payload.repository.name}",
        )
 
    # Find most recent task in that project
    task = (
        db.query(Task)
        .filter(Task.project_id == project.id)
        .order_by(Task.id.desc())
        .first()
    )
 
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tasks found in project to comment on",
        )
 
    # pusher
    pusher_user = _get_pusher_user(payload, db)

    comment = TaskComment(
        id=uuid.uuid4(),
        task_id=task.id,
        text=f"[GitHub Push] {commit_message}",
        user_id=pusher_user.id if pusher_user else None,
        github_event_type="push",
        github_actor_username=payload.sender.login if payload.sender else "Unknown",
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Notification Logic
    if pusher_user:
        title = f"Code Push to {project.name}"
        message = f"User {pusher_user.full_name} ({pusher_user.github_username}) pushed code to Project {project.name}"
        _create_notifications_for_managers(db, project, pusher_user, title, message)

    return {
        "message": "Comment added from GitHub push",
        "event_type": "comment_added",
        "record_id": str(comment.id),
    }
 
 
# ── Event Router ──────────────────────────────────────────────────────────────
def process_github_event(
    payload: GitHubPayload,
    event_type: str,
    db: Session,
) -> dict:
    """
    Routes GitHub webhook events to the correct handler.
    """
    if event_type == "pull_request" and payload.action == "opened":
        return handle_pull_request_opened(payload, db)
 
    elif event_type == "push":
        return handle_push_event(payload, db)
 
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported GitHub event type: {event_type}",
        )