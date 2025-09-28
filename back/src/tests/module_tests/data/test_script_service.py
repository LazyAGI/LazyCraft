from unittest.mock import MagicMock, patch

import pytest

from parts.data.script_service import ScriptService


# 使用pytest fixture来模拟ScriptService
@pytest.fixture
def script_service():
    account = MagicMock()
    return ScriptService(account)


# 测试create_script方法
@patch("parts.data.script_service.Script")
@patch("parts.data.script_service.db")
def test_create_script(mock_db, mock_script, script_service):
    mock_script.query.filter_by.return_value.first.return_value = None
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None

    result = script_service.create_script(
        {
            "name": "test_script",
            "description": "A test script",
            "icon": "/path/to/icon",
            "script_url": "/path/to/script",
            "script_type": "数据过滤",
            "data_type": "文本类",
        }
    )
    assert result is not None


# 测试get_script_by_account方法
@patch("parts.data.script_service.Script")
def test_get_script_by_account(mock_script, script_service):
    # 创建一个模拟的Column对象
    from sqlalchemy import Column

    mock_column = MagicMock(spec=Column)
    mock_column.__clause_element__ = lambda: mock_column

    # 设置Script.created_at为模拟的Column
    mock_script.created_at = mock_column

    mock_script.query.filter.return_value.paginate.return_value = MagicMock()
    result = script_service.get_script_by_account({"page": 1, "page_size": 10})
    assert result is not None


# 测试delete_script方法
@patch("parts.data.script_service.Script")
@patch("parts.data.script_service.db")
@patch("parts.data.script_service.Tag")
def test_delete_script(mock_tag, mock_db, mock_script):
    mock_script.query.filter_by.return_value.first.return_value = MagicMock()
    mock_db.session.delete.return_value = None
    mock_db.session.commit.return_value = None
    mock_db.session.rollback.return_value = None
    mock_tag.delete_bindings.return_value = None

    result = ScriptService.delete_script(1)
    assert result is True


# 测试update_script方法
@patch("parts.data.script_service.Script")
@patch("parts.data.script_service.db")
def test_update_script(mock_db, mock_script, script_service):
    # 创建一个模拟的脚本实例
    mock_script_instance = MagicMock()
    mock_script_instance.user_id = 1
    mock_script_instance.id = 1

    mock_script.query.filter_by.return_value.first.return_value = mock_script_instance
    mock_script.query.filter.return_value.first.return_value = None  # 没有同名脚本
    mock_db.session.commit.return_value = None

    result = script_service.update_script(
        1,
        {
            "name": "updated_script",
            "description": "Updated description",
            "icon": "/new/path/to/icon",
            "script_url": "/new/path/to/script",
            "script_type": "数据增强",
            "data_type": "文本类",
        },
    )
    assert result is not None


# 测试get_script_by_id方法
@patch("parts.data.script_service.Script")
def test_get_script_by_id(mock_script):
    mock_script.query.filter_by.return_value.first.return_value = MagicMock()
    result = ScriptService.get_script_by_id(1)
    assert result is not None
