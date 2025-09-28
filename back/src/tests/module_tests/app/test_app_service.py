from unittest.mock import MagicMock, patch

import pytest

from parts.app.app_service import AppService, TemplateService, WorkflowService


# 使用pytest fixture来模拟AppService
@pytest.fixture
def app_service():
    return AppService()


# 测试get_paginate_apps方法
@patch("parts.app.app_service.db")
def test_get_paginate_apps(mock_db, app_service):
    mock_db.paginate.return_value = MagicMock()
    result = app_service.get_paginate_apps(MagicMock(), {"page": 1, "limit": 10})
    assert result is not None


# 测试create_app方法
@patch("parts.app.app_service.db")
def test_create_app(mock_db, app_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    result = app_service.create_app(MagicMock(), {"name": "test_app"})
    assert result is not None


# 测试get_app方法
@patch("parts.app.app_service.App")
def test_get_app(mock_app, app_service):
    mock_app.query.get.return_value = MagicMock()
    result = app_service.get_app("1")
    assert result is not None


# 测试update_app方法
@patch("parts.app.app_service.db")
def test_update_app(mock_db, app_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = app_service.update_app(MagicMock(), {"name": "updated_app"})
    assert result is not None


# 测试delete_app方法
@patch("parts.app.app_service.db")
def test_delete_app(mock_db, app_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    result = app_service.delete_app(MagicMock())
    assert result is None


# 测试validate_name方法
@patch("parts.app.app_service.App")
def test_validate_name(mock_app, app_service):
    mock_app.query.filter_by.return_value.first.return_value = None
    result = app_service.validate_name("unique_name")
    assert result is None


# 测试validate_name方法异常处理
@patch("parts.app.app_service.App")
def test_validate_name_duplicate(mock_app, app_service):
    mock_app.query.filter_by.return_value.first.return_value = MagicMock()
    with pytest.raises(ValueError):
        app_service.validate_name("duplicate_name")


# 测试auto_rename_app方法
@patch("parts.app.app_service.App")
def test_auto_rename_app(mock_app, app_service):
    mock_app.query.filter_by.return_value.first.return_value = None
    result = app_service.auto_rename_app("test_app")
    assert result == "test_app"


# 测试auto_rename_app方法重命名
@patch("parts.app.app_service.App")
def test_auto_rename_app_duplicate(mock_app, app_service):
    mock_app.query.filter_by.return_value.first.side_effect = [MagicMock(), None]
    result = app_service.auto_rename_app("test_app")
    assert result == "test_app_1"


# 使用pytest fixture来模拟TemplateService
@pytest.fixture
def template_service():
    return TemplateService()


# 测试convert_to_app方法
@patch("parts.app.app_service.db")
def test_convert_to_app(mock_db, template_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    source = MagicMock()
    result = template_service.convert_to_app(MagicMock(), source, {"name": "new_app"})
    assert result is not None


# 使用pytest fixture来模拟WorkflowService
@pytest.fixture
def workflow_service():
    return WorkflowService()


# 测试publish_workflow方法
@patch("parts.app.app_service.db")
def test_publish_workflow(mock_db, workflow_service):
    mock_db.session.query.return_value.get.return_value = MagicMock()
    app_model = MagicMock()
    result = workflow_service.publish_workflow(app_model, MagicMock())
    assert result is not None


# 测试clone_new_workflow方法
@patch("parts.app.app_service.db")
def test_clone_new_workflow(mock_db, workflow_service):
    mock_db.session.add.return_value = None
    mock_db.session.commit.return_value = None
    source_workflow = MagicMock()
    new_workflow = MagicMock()
    result = workflow_service.clone_new_workflow(
        MagicMock(), source_workflow, new_workflow
    )
    assert result is not None
