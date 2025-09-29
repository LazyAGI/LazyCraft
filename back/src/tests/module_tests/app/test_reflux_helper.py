from unittest.mock import MagicMock, patch

import pytest

from parts.app.reflux_helper import RefluxHelper


# 使用pytest fixture来模拟RefluxHelper
@pytest.fixture
def reflux_helper():
    user = MagicMock()
    return RefluxHelper(user)


# 测试create_backflow方法
@patch("parts.app.reflux_helper.db")
@patch("parts.app.reflux_helper.DataRefluxService")
def test_create_backflow(mock_reflux_service, mock_db, reflux_helper):
    app_model = MagicMock(enable_backflow=True)
    reflux_helper.create_backflow(app_model)
    mock_reflux_service.return_value.app_publish.assert_called_once()


# 测试create_backflow方法异常处理
@patch("parts.app.reflux_helper.db")
@patch("parts.app.reflux_helper.DataRefluxService")
def test_create_backflow_exception(mock_reflux_service, mock_db, reflux_helper):
    app_model = MagicMock(enable_backflow=True)
    mock_reflux_service.return_value.app_publish.side_effect = Exception(
        "Database error"
    )
    with pytest.raises(Exception):
        reflux_helper.create_backflow(app_model)


# 测试get_backflow_data方法
@patch("parts.app.reflux_helper.DataRefluxService")
def test_get_backflow_data(mock_reflux_service, reflux_helper):
    mock_reflux_service.return_value.get_backflow_data.return_value = [MagicMock()]
    result = reflux_helper.get_backflow_data("app_id")
    assert len(result) > 0


# 测试get_backflow_data方法异常处理
@patch("parts.app.reflux_helper.DataRefluxService")
def test_get_backflow_data_exception(mock_reflux_service, reflux_helper):
    mock_reflux_service.return_value.get_backflow_data.side_effect = Exception(
        "Database error"
    )
    with pytest.raises(Exception):
        reflux_helper.get_backflow_data("app_id")
