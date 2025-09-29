import json
import os

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


def _get_test_file_path(filename):
    """获取测试文件的完整路径"""
    dirname = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(dirname, filename)


def _load_workflow_from_file(filename):
    """从文件加载工作流配置"""
    json_filepath = _get_test_file_path(filename)
    with open(json_filepath) as f_read:
        return json.loads(f_read.read())
