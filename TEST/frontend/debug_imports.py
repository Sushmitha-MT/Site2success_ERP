try:
    print("Checking app.routes.auth...")
    from app.routes import auth
    print("Checking app.routes.users...")
    from app.routes import users
    print("Checking app.routes.projects...")
    from app.routes import projects
    print("Checking app.routes.sprints...")
    from app.routes import sprints
    print("Checking app.routes.tasks...")
    from app.routes import tasks
    print("Checking app.routes.workspace...")
    from app.routes import workspace
    print("Checking app.routes.finance...")
    from app.routes import finance
    print("Checking app.routes.clients...")
    from app.routes import clients
    print("Checking app.routes.deliverables...")
    from app.routes import deliverables
    print("Checking app.routes.webhooks...")
    from app.routes import webhooks
    print("Checking app.routes.dashboard...")
    from app.routes import dashboard
    print("Checking app.routes.admin...")
    from app.routes import admin
    print("All routers imported successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
