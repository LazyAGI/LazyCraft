from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from utils.util_database import db


# 创建测试用的Flask应用
@pytest.fixture(scope="session")
def app():
    """创建测试用的Flask应用实例"""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["LAZY_PLATFORM_KEY"] = "test-secret-key"

    # 将全局db实例与测试应用关联
    db.init_app(app)

    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """创建测试客户端"""
    return app.test_client()


@pytest.fixture
def app_context(app):
    """提供Flask应用上下文"""
    with app.app_context():
        yield app


# 为所有测试提供应用上下文
@pytest.fixture(autouse=True)
def auto_app_context(app):
    """自动为所有测试提供应用上下文"""
    with app.app_context():
        yield
