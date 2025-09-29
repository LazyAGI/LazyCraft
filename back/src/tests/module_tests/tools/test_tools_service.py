from unittest.mock import MagicMock, patch

import pytest

from parts.tools.service import ToolService


# 使用pytest fixture来模拟ToolService
@pytest.fixture
def tool_service():
    account = MagicMock()
    return ToolService(account)


# 测试createTool方法
@patch("parts.tools.service.db")
def test_create_tool(mock_db, tool_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    result = tool_service.createTool({"name": "test_tool"})
    assert result is not None


# 测试updateTool方法
@patch("parts.tools.service.db")
def test_update_tool(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = tool_service.updateTool(1, {"name": "updated_tool"})
    assert result is not None


# 测试deleteTool方法
@patch("parts.tools.service.db")
def test_delete_tool(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result, name = tool_service.deleteTool(1)
    assert result is True


# 测试pulishTool方法
@patch("parts.tools.service.db")
def test_pulish_tool(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = tool_service.pulishTool(1)
    assert result is not None


# 测试enableTool方法
@patch("parts.tools.service.db")
def test_enable_tool(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = tool_service.enableTool(1, True)
    assert result is not None


# 测试upsertToolApi方法
@patch("parts.tools.service.db")
def test_upsert_tool_api(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = tool_service.upsertToolApi({"url": "http://example.com"}, 1)
    assert result is not None


# 测试checkToolCanTest方法
@patch("parts.tools.service.db")
def test_check_tool_can_test(mock_db, tool_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = tool_service.checkToolCanTest(1)
    assert result is True


# 测试existToolByName方法
@patch("parts.tools.service.Tool")
def test_exist_tool_by_name(mock_tool, tool_service):
    mock_tool.query.filter_by.return_value.first.return_value = None
    result = tool_service.existToolByName("test_tool")
    assert result is False


# 测试testTool方法
@patch("parts.tools.service.ToolService.call_api_tool")
@patch("parts.tools.service.ToolService.call_ide_tool")
def test_test_tool(mock_call_ide_tool, mock_call_api_tool, tool_service):
    mock_call_api_tool.return_value = MagicMock()
    mock_call_ide_tool.return_value = MagicMock()
    result = tool_service.testTool(1, {}, {})
    assert result is not None


# 测试createToolFields方法
@patch("parts.tools.service.db")
def test_create_tool_fields(mock_db, tool_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    result, errors = tool_service.createToolFields([{"name": "field1"}])
    assert result is not None
