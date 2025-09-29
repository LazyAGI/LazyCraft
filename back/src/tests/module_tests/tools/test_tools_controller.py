from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.tools.controller import (TestApi, ToolApiCreateAndUpdateApi,
                                    ToolApiDetailApi, ToolCheckName,
                                    ToolCreateAndUpdateApi, ToolDeleteApi,
                                    ToolDetailApi, ToolEnableApi,
                                    ToolFieldCreateAndUpdateApi,
                                    ToolFieldsDetailApi, ToolListApi,
                                    ToolPublishApi, ToolTestApi)

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试ToolListApi的get方法
@patch("parts.tools.controller.ToolService")
def test_tool_list_api_get(mock_service, client):
    mock_service.return_value.get_pagination.return_value = MagicMock()
    response = client.get("/tool/list")
    assert response.status_code == 200


# 测试ToolDetailApi的get方法
@patch("parts.tools.controller.ToolService")
def test_tool_api_get(mock_service, client):
    mock_service.return_value.get_by_id.return_value = MagicMock()
    response = client.get("/tool/tool_api")
    assert response.status_code == 200


# 测试ToolCheckName的post方法
@patch("parts.tools.controller.ToolService")
def test_tool_check_name_post(mock_service, client):
    mock_service.return_value.existToolByName.return_value = False
    response = client.post("/tool/check_name", json={"name": "test_tool"})
    assert response.status_code == 200


# 测试ToolCreateAndUpdateApi的post方法
@patch("parts.tools.controller.ToolService")
@patch("parts.tools.controller.LogService")
def test_tool_create_and_update_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.createTool.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post("/tool/create_update_tool", json={"name": "test_tool"})
    assert response.status_code == 200


# 测试ToolDeleteApi的post方法
@patch("parts.tools.controller.ToolService")
@patch("parts.tools.controller.LogService")
def test_tool_delete_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.deleteTool.return_value = (True, "test_tool")
    mock_log_service.return_value.add.return_value = None
    response = client.post("/tool/delete_tool", json={"id": "1"})
    assert response.status_code == 200


# 测试ToolFieldCreateAndUpdateApi的post方法
@patch("parts.tools.controller.ToolService")
def test_tool_field_create_and_update_api_post(mock_service, client):
    mock_service.return_value.createToolFields.return_value = ([], "")
    mock_service.return_value.updateToolFields.return_value = ([], "")
    response = client.post("/tool/create_update_field", json=[{"name": "field1"}])
    assert response.status_code == 200


# 测试ToolApiCreateAndUpdateApi的post方法
@patch("parts.tools.controller.ToolService")
def test_tool_api_create_and_update_api_post(mock_service, client):
    mock_service.return_value.upsertToolApi.return_value = MagicMock()
    response = client.post("/tool/upsert_tool_api", json={"url": "http://example.com"})
    assert response.status_code == 200


# 测试ToolApiDetailApi的get方法
@patch("parts.tools.controller.ToolService")
def test_tool_api_api_get(mock_service, client):
    mock_service.return_value.get_toolapi_by_id.return_value = MagicMock()
    response = client.get("/tool/tool_api_info")
    assert response.status_code == 200


# 测试ToolFieldsDetailApi的post方法
@patch("parts.tools.controller.ToolService")
def test_tool_fields_api_post(mock_service, client):
    mock_service.return_value.getToolFields.return_value = MagicMock()
    response = client.post("/tool/tool_fields", json={"fields": []})
    assert response.status_code == 200


# 测试ToolPublishApi的post方法
@patch("parts.tools.controller.ToolService")
@patch("parts.tools.controller.LogService")
def test_tool_publish_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.pulishTool.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post("/tool/publish_tool", json={"id": "1"})
    assert response.status_code == 200


# 测试ToolEnableApi的post方法
@patch("parts.tools.controller.ToolService")
@patch("parts.tools.controller.LogService")
def test_tool_enable_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.enableTool.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post("/tool/enable_tool", json={"id": "1", "enable": True})
    assert response.status_code == 200


# 测试ToolTestApi的post方法
@patch("parts.tools.controller.ToolService")
def test_tool_test_api_post(mock_service, client):
    mock_service.return_value.checkToolCanTest.return_value = True
    mock_service.return_value.testTool.return_value = MagicMock()
    response = client.post("/tool/test_tool", json={"id": "1"})
    assert response.status_code == 200


# 测试TestApi的post方法
@patch("parts.tools.controller.get_tool_logger")
def test_test_api_post(mock_get_tool_logger, client):
    mock_get_tool_logger.return_value.info.return_value = None
    response = client.post("/tool/test", json={"id": "1"})
    assert response.status_code == 200
