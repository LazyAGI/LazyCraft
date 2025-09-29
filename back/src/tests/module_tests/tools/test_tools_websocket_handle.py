from unittest.mock import MagicMock, patch

import pytest

from parts.tools.websocket_handle import (RealtimeMyLogger, get_tool_logger,
                                          send_log)


# 测试send_log函数
@patch("parts.tools.websocket_handle.user_connections", {"user_id": MagicMock()})
def test_send_log():
    log_entry = {
        "level": "INFO",
        "msg": "Test message",
        "timestamp": "2023-01-01T00:00:00",
    }
    with patch(
        'parts.tools.websocket_handle.user_connections["user_id"].send'
    ) as mock_send:
        send_log("user_id", log_entry)
        mock_send.assert_called_once_with(json.dumps(log_entry))


# 测试get_tool_logger函数
def test_get_tool_logger():
    logger = get_tool_logger("1")
    assert isinstance(logger, RealtimeMyLogger)
