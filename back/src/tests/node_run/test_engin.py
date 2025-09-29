from flask import Flask, current_app
from flask_login import current_user, user_logged_in

from app import MyApp
from configs import lazy_config
from core.account_manager import AccountService
from models.model_account import Account, RoleTypes, Tenant, TenantAccountJoin
from parts.app.app_service import WorkflowService
from parts.app.node_run.engine_manager import EngineManager
from utils import (util_celery, util_database, util_login, util_mail,
                   util_migrate, util_redis, util_storage)
from utils.util_database import db

app = Flask(__name__)


def init_all():
    # 创建一个Flask应用程序用于测试
    app.config.from_mapping(lazy_config.model_dump())
    util_database.init_app(app)
    util_migrate.init(app, db)
    util_redis.init_app(app)
    util_storage.init_app(app)
    util_celery.init_app(app)
    util_login.init_app(app)
    util_mail.init_app(app)


def test_engine(app_id: str, workspace_id: str, user_id: str, task_inputs: list):
    with app.test_request_context():
        tenant_account_join = (
            db.session.query(Tenant, TenantAccountJoin)
            .filter(Tenant.id == workspace_id)
            .filter(TenantAccountJoin.tenant_id == Tenant.id)
            .filter(TenantAccountJoin.role == RoleTypes.OWNER)
            .one_or_none()
        )
        tenant, ta = tenant_account_join
        account = Account.query.filter_by(id=ta.account_id).first()
        # Login admin
        if account:
            account.current_tenant = tenant
            current_app.login_manager._update_request_context_with_user(account)

        # 图形数据未准备，请先调用prepare_graph_data
        manager = EngineManager(app_id)
        workflow = WorkflowService().get_draft_workflow(app_id)
        manager.prepare_graph_data(workflow)
        manager.start_engine()
        print(manager.gid)
        account = AccountService.load_user(user_id)

        out = manager.run_sync(user_account=account, task_inputs=task_inputs)
        print(out)
        manager.stop_engine()


if __name__ == "__main__":
    init_all()
    test_engine(
        "e90b2597-357b-4792-8f22-0ad9a4d8d2c2",
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000001",
        ["2024年天气"],
    )
