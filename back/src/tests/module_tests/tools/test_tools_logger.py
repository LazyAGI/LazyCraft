import logging
from unittest.mock import MagicMock, patch

import pytest

from parts.tools.logger import RealtimeMyLogger, send_log


# 测试RealtimeMyLogger的日志记录功能
def test_realtime_my_logger():
    logger = RealtimeMyLogger("test_logger")
    with patch("parts.tools.logger.send_log") as mock_send_log:
        logger.info("Test message")
        assert len(logger.log_history) == 1
        assert logger.log_history[0]["msg"] == "Test message"
        mock_send_log.assert_called_once()


# 测试send_log函数
@patch("parts.tools.logger.user_connections", {"user_id": MagicMock()})
def test_send_log():
    log_entry = {
        "level": "INFO",
        "msg": "Test message",
        "timestamp": "2023-01-01T00:00:00",
    }
    with patch('parts.tools.logger.user_connections["user_id"].send') as mock_send:
        send_log("user_id", log_entry)
        mock_send.assert_called_once_with(json.dumps(log_entry))
