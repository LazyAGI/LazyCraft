from unittest.mock import MagicMock, patch

import pytest

from parts.app.noderun_service import RunManager, RunRedis


# 使用pytest fixture来模拟RunManager
@pytest.fixture
def run_manager():
    app_model = MagicMock()
    return RunManager(app_model, mode="publish")


# 测试RunManager的start方法
@patch("parts.app.noderun_service.LightEngine")
def test_run_manager_start(mock_light_engine, run_manager):
    mock_light_engine.return_value.build_node.return_value.func.api_url = (
        "http://api.url"
    )
    workflow = MagicMock()
    gid = run_manager.start(workflow, auto_server=True)
    assert gid is not None


# 测试RunManager的stop方法
@patch("parts.app.noderun_service.LightEngine")
def test_run_manager_stop(mock_light_engine, run_manager):
    run_manager.stop()
    mock_light_engine.return_value.stop.assert_called_once()


# 测试RunManager的start方法异常处理
@patch("parts.app.noderun_service.LightEngine")
def test_run_manager_start_exception(mock_light_engine, run_manager):
    mock_light_engine.return_value.build_node.side_effect = Exception("Engine error")
    workflow = MagicMock()
    with pytest.raises(Exception):
        run_manager.start(workflow, auto_server=True)


# 使用pytest fixture来模拟RunRedis
@pytest.fixture
def run_redis():
    return RunRedis("app_id", "publish")


# 测试RunRedis的get_graph_nodes_map方法
@patch("parts.app.noderun_service.redis")
def test_run_redis_get_graph_nodes_map(mock_redis, run_redis):
    mock_redis.get.return_value = '{"node_id": {"extras-enable_backflow": true}}'
    result = run_redis.get_graph_nodes_map()
    assert result is not None


# 测试RunRedis的set_detail方法
@patch("parts.app.noderun_service.redis")
def test_run_redis_set_detail(mock_redis, run_redis):
    node_finished = {
        "node_id": "node_id",
        "node_type": "",
        "title": "",
        "inputs": "input",
        "outputs": "output",
        "status": "succeeded",
        "elapsed_time": 0.1,
        "prompt_tokens": 10,
        "completion_tokens": 5,
    }
    run_redis.set_detail(node_finished)
    mock_redis.set.assert_called_once()


# 测试RunRedis的get_detail方法
@patch("parts.app.noderun_service.redis")
def test_run_redis_get_detail(mock_redis, run_redis):
    mock_redis.get.return_value = '{"node_id": "node_id"}'
    result = run_redis.get_detail()
    assert result is not None


# 测试RunRedis的get_graph_nodes_map方法异常处理
@patch("parts.app.noderun_service.redis")
def test_run_redis_get_graph_nodes_map_exception(mock_redis, run_redis):
    mock_redis.get.side_effect = Exception("Redis error")
    with pytest.raises(Exception):
        run_redis.get_graph_nodes_map()
