from fastapi import APIRouter, Depends, Header, status, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, List
 
from app.db.session import get_db
from app.middleware.auth import get_current_user_db
from app.models.users import User
from app.models.projects import Project
from app.models.tasks import Task
from app.models.task_comments import TaskComment
from webhooks.github.schemas import GitHubPayload, GitHubWebhookResponse, GitHubActivityItem
from webhooks.github.service import process_github_event
 
router = APIRouter(prefix="/webhooks", tags=["Webhooks - GitHub"])
 
 
@router.get(
    "/",
    response_model=List[GitHubActivityItem],
    summary="Get recent GitHub activity",
)
def get_github_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_db),
):
    """
    Returns the latest 50 GitHub-related events (PRs and Pushes).
    Restricted to super_admin and manager roles.
    """
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can view GitHub activity",
        )

    # 1. Fetch GitHub PR Tasks
    pr_tasks = (
        db.query(Task, Project, User)
        .join(Project, Task.project_id == Project.id)
        .outerjoin(User, Task.assignee_id == User.id)
        .filter(Task.github_event_type == "pull_request")
        .order_by(Task.created_at.desc())
        .limit(50)
        .all()
    )

    # 2. Fetch GitHub Push Comments
    push_comments = (
        db.query(TaskComment, Task, Project, User)
        .join(Task, TaskComment.task_id == Task.id)
        .join(Project, Task.project_id == Project.id)
        .outerjoin(User, TaskComment.user_id == User.id)
        .filter(TaskComment.github_event_type == "push")
        .order_by(TaskComment.created_at.desc())
        .limit(50)
        .all()
    )

    activity = []

    # Process PRs
    for task, project, user in pr_tasks:
        activity.append(GitHubActivityItem(
            event_type="pull_request",
            repo=project.name,
            title=task.title,
            timestamp=task.created_at.isoformat() if task.created_at else "",
            actor=user.full_name if user else task.github_actor_username or "Unknown",
            actor_matched=True if user else False,
            pr_number=None # Could parse from description if needed
        ))

    # Process Pushes
    for comment, task, project, user in push_comments:
        title = comment.text
        if title.startswith("[GitHub Push] "):
            title = title.replace("[GitHub Push] ", "")

        activity.append(GitHubActivityItem(
            event_type="push",
            repo=project.name,
            title=title,
            timestamp=comment.created_at.isoformat() if comment.created_at else "",
            actor=user.full_name if user else comment.github_actor_username or "Unknown",
            actor_matched=True if user else False
        ))

    # Sort merged list by timestamp desc
    activity.sort(key=lambda x: x.timestamp, reverse=True)
    
    return activity[:50]


@router.post(
    "/github",
    response_model=GitHubWebhookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive GitHub push and pull_request events",
)
def github_webhook(
    payload: GitHubPayload,
    db: Session = Depends(get_db),
    x_github_event: Annotated[str | None, Header()] = None,
):
    """
    Webhook endpoint called by GitHub.
    Routes based on X-GitHub-Event header:
      - pull_request (action=opened) → creates a Task
      - push                         → adds a comment to task_comments
    """
    if not x_github_event:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="X-GitHub-Event header is required",
        )
 
    result = process_github_event(
        payload=payload,
        event_type=x_github_event,
        db=db,
    )
 
    return GitHubWebhookResponse(**result)