from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.logs.controller import LogsController

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试LogsController的get方法
@patch("parts.logs.controller.LogService")
def test_logs_controller_get(mock_service, client):
    mock_service.return_value.get.return_value = MagicMock(
        items=[], total=0, page=1, per_page=10
    )
    response = client.get("/logs")
    assert response.status_code == 200
    assert response.json["result"]["total"] == 0
