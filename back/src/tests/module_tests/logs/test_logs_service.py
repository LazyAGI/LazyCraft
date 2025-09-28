from unittest.mock import MagicMock, patch

import pytest

from parts.logs.enums import Action, Module
from parts.logs.service import LogService


# 使用pytest fixture来模拟LogService
@pytest.fixture
def log_service():
    return LogService()


# 测试add方法
@patch("parts.logs.service.db")
@patch("parts.logs.service.OperationLog")
def test_add(mock_operation_log, mock_db, log_service):
    log_service.add(Module.TOOL, Action.CREATE_TOOL, name="test_tool", describe="desc")
    mock_operation_log.assert_called_once()
    mock_db.session.add.assert_called_once()
    mock_db.session.commit.assert_called_once()


# 测试get方法
@patch("parts.logs.service.db")
def test_get(mock_db, log_service):
    mock_db.session.query.return_value.outerjoin.return_value.filter.return_value.order_by.return_value.paginate.return_value = (
        MagicMock()
    )
    result = log_service.get(None, None, None, 1, 10)
    assert result is not None
