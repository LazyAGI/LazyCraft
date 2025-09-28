from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.app.app_api import (AppConvertToTemplate, AppDetailApi,
                               AppEnableApi, AppEnableBackflow, AppExportApi,
                               AppImportFromFile, AppListApi, AppReportApi,
                               DraftImportFromFile, TemplateConvertToApp,
                               TemplateDetailApi, TemplateListApi)

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试AppConvertToTemplate的post方法
@patch("parts.app.app_api.AppService")
@patch("parts.app.app_api.TemplateService")
def test_convert_to_template(mock_template_service, mock_app_service, client):
    mock_app_service.return_value.get_app.return_value = MagicMock()
    mock_template_service.return_value.convert_to_template.return_value = MagicMock()
    response = client.post(
        "/apps/to/apptemplate", json={"id": "1", "name": "template_name"}
    )
    assert response.status_code == 201


# 测试AppExportApi的get方法
@patch("parts.app.app_api.AppService")
@patch("parts.app.app_api.Workflow")
def test_export_app(mock_workflow, mock_app_service, client):
    mock_app_service.return_value.get_app.return_value = MagicMock()
    mock_workflow.default_getone.return_value = MagicMock()
    response = client.get("/apps/1/export")
    assert response.status_code == 200


# 测试AppImportFromFile的post方法
@patch("parts.app.app_api.AppService")
@patch("parts.app.app_api.Workflow")
def test_import_app_from_file(mock_workflow, mock_app_service, client):
    mock_app_service.return_value.create_app.return_value = MagicMock()
    mock_workflow.new_empty.return_value = MagicMock()
    data = {"file": (MagicMock(), "test.json")}
    response = client.post(
        "/apps/import", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 201


# 测试DraftImportFromFile的post方法
@patch("parts.app.app_api.Workflow")
def test_import_draft_from_file(mock_workflow, client):
    mock_workflow.default_getone.return_value = MagicMock()
    data = {"file": (MagicMock(), "test.json")}
    response = client.post(
        "/apps/1/workflows/draft/import", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200


# 测试TemplateListApi的get方法
@patch("parts.app.app_api.TemplateService")
def test_get_template_list(mock_template_service, client):
    mock_template_service.return_value.get_paginate_apps.return_value = {
        "data": [],
        "total": 0,
    }
    response = client.get("/apptemplate")
    assert response.status_code == 200


# 测试TemplateDetailApi的get方法
@patch("parts.app.app_api.TemplateService")
def test_get_template_detail(mock_template_service, client):
    mock_template_service.return_value.get_app.return_value = MagicMock()
    response = client.get("/apptemplate/1")
    assert response.status_code == 200


# 测试TemplateConvertToApp的post方法
@patch("parts.app.app_api.TemplateService")
@patch("parts.app.app_api.AppService")
def test_convert_template_to_app(mock_app_service, mock_template_service, client):
    mock_template_service.return_value.get_app.return_value = MagicMock()
    mock_app_service.return_value.validate_name.return_value = None
    response = client.post("/apptemplate/to/apps", json={"id": "1", "name": "app_name"})
    assert response.status_code == 201


# 测试AppReportApi的post方法
@patch("parts.app.app_api.CostService")
@patch("parts.app.app_api.RunRedis")
def test_app_report(mock_run_redis, mock_cost_service, client):
    mock_run_redis.return_value.get_graph_nodes_map.return_value = {}
    response = client.post(
        "/app/report",
        json={
            "id": "node_id",
            "sessionid": "sessionid",
            "timecost": 0.00016760826110839844,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "input": "3",
            "output": "6",
        },
    )
    assert response.status_code == 200
