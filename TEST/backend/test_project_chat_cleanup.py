import uuid
from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.projects import Project
from app.models.project_messages import ProjectMessage
from app.models.archived_project_messages import ArchivedProjectMessage
from app.tasks.project_chat_cleanup import archive_old_project_messages

def run_test():
    db = SessionLocal()
    try:
        print("Starting cleanup test...")
        
        # 1. Provide a dummy project
        project_id = uuid.uuid4()
        dummy_project = Project(
            id=project_id,
            name="Test Project Chat Cleanup",
            description="Just for testing",
            status="active",
        )
        db.add(dummy_project)
        db.commit()
        
        # 2. Add an old message
        old_message_id = uuid.uuid4()
        old_time = datetime.utcnow() - timedelta(hours=25)
        
        old_msg = ProjectMessage(
            id=old_message_id,
            project_id=project_id,
            sender_name="System",
            message="This is a very old message",
            created_at=old_time,
            updated_at=old_time,
        )
        db.add(old_msg)
        
        # 3. Add a new message
        new_message_id = uuid.uuid4()
        new_time = datetime.utcnow() - timedelta(hours=1)
        
        new_msg = ProjectMessage(
            id=new_message_id,
            project_id=project_id,
            sender_name="System",
            message="This is a new message",
            created_at=new_time,
            updated_at=new_time,
        )
        db.add(new_msg)
        
        db.commit()
        
        print("Initial state:")
        print(f"ProjectMessage count: {db.query(ProjectMessage).filter_by(project_id=project_id).count()}")
        print(f"ArchivedProjectMessage count: {db.query(ArchivedProjectMessage).filter_by(project_id=project_id).count()}")
        
        # Run cleanup
        print("Running cleanup task...")
        archive_old_project_messages()
        
        # Verify
        print("Final state:")
        active_count = db.query(ProjectMessage).filter_by(project_id=project_id).count()
        archived_count = db.query(ArchivedProjectMessage).filter_by(project_id=project_id).count()
        print(f"ProjectMessage count: {active_count} (Expected: 1)")
        print(f"ArchivedProjectMessage count: {archived_count} (Expected: 1)")
        
        assert active_count == 1
        assert archived_count == 1
        
        print("TEST PASSED!")
        
    except Exception as e:
        print(f"Test failed: {e}")
        db.rollback()
    finally:
        # Cleanup test data
        db.query(ArchivedProjectMessage).filter_by(project_id=project_id).delete()
        db.query(ProjectMessage).filter_by(project_id=project_id).delete()
        db.query(Project).filter_by(id=project_id).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    run_test()
