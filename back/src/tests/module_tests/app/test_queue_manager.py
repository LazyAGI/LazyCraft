from unittest.mock import MagicMock, patch

import pytest


# 测试add_to_queue方法
@patch("parts.app.queue_manager.redis_client")
def test_add_to_queue(mock_redis, queue_manager):
    task = {"task_id": "1", "data": "test"}
    queue_manager.add_to_queue(task)
    mock_redis.lpush.assert_called_once()


# 测试get_from_queue方法
@patch("parts.app.queue_manager.redis_client")
def test_get_from_queue(mock_redis, queue_manager):
    mock_redis.rpop.return_value = '{"task_id": "1", "data": "test"}'
    result = queue_manager.get_from_queue()
    assert result["task_id"] == "1"


# 测试get_from_queue方法异常处理
@patch("parts.app.queue_manager.redis_client")
def test_get_from_queue_exception(mock_redis, queue_manager):
    mock_redis.rpop.side_effect = Exception("Redis error")
    with pytest.raises(Exception):
        queue_manager.get_from_queue()


# 测试clear_queue方法
@patch("parts.app.queue_manager.redis_client")
def test_clear_queue(mock_redis, queue_manager):
    queue_manager.clear_queue()
    mock_redis.delete.assert_called_once()
