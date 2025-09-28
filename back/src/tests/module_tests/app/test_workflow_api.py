from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.app.workflow_api import DraftWorkflowApi, DraftWorkflowStartApi

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试DraftWorkflowApi的get方法
@patch("parts.app.workflow_api.WorkflowService")
def test_get_draft_workflow(mock_service, client):
    mock_service.return_value.get_draft_workflow.return_value = MagicMock()
    with app.test_request_context("/apps/1/workflows/draft"):
        api = DraftWorkflowApi()
        response = api.get("1")
        assert response.status_code == 200


# 测试DraftWorkflowApi的post方法
@patch("parts.app.workflow_api.WorkflowService")
def test_sync_draft_workflow(mock_service, client):
    mock_service.return_value.get_draft_workflow.return_value = MagicMock()
    with app.test_request_context(
        "/apps/1/workflows/draft", method="POST", json={"graph": {}}
    ):
        api = DraftWorkflowApi()
        response = api.post("1")
        assert response.status_code == 200


# 测试DraftWorkflowStartApi的post方法
@patch("parts.app.workflow_api.WorkflowService")
@patch("parts.app.workflow_api.RunManager")
def test_start_draft_workflow(mock_run_manager, mock_service, client):
    mock_service.return_value.get_draft_workflow.return_value = MagicMock()
    mock_run_manager.return_value.start_with_stream.return_value = MagicMock()
    with app.test_request_context("/apps/1/workflows/draft/start", method="POST"):
        api = DraftWorkflowStartApi()
        response = api.post("1")
        assert response.status_code == 200
