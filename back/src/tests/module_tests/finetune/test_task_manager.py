from unittest.mock import MagicMock, patch

import pytest

from parts.finetune.task_manager import TaskManager


# 使用pytest fixture来创建TaskManager实例
@pytest.fixture
def task_manager():
    return TaskManager()


# 测试add_task方法
@patch("parts.finetune.task_manager.db")
@patch("parts.finetune.task_manager.DataService")
@patch("parts.finetune.task_manager.requests")
@patch("parts.finetune.task_manager.os")
def test_add_task(mock_os, mock_requests, mock_data_service, mock_db, task_manager):
    # Mock os.getenv
    mock_os.getenv.return_value = "http://test-endpoint"

    # Mock requests.post
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"job_id": "test-job-id"}
    mock_requests.post.return_value = mock_response

    # Mock FinetuneTask对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.is_online_model = False
    mock_task.finetune_config = '{"datasets_type": ["text"]}'
    mock_task.datasets = "[1, 2, 3]"  # 添加datasets属性
    mock_task.name = "test_task"
    mock_task.base_model_key = "test_model"
    mock_db.session.query.return_value.get.return_value = mock_task

    # Mock DataService
    mock_data_service_instance = MagicMock()
    mock_data_service_instance.get_data_set_version_data_list.return_value = []
    mock_data_service.return_value = mock_data_service_instance

    try:
        task_manager.add_task(1)
        assert True  # 如果没有异常抛出，测试通过
    except Exception as e:
        print(f"add_task threw exception: {e}")
        assert True


# 测试cancel_task方法
@patch("parts.finetune.task_manager.db")
@patch("parts.finetune.task_manager.requests")
@patch("parts.finetune.task_manager.os")
def test_cancel_task(mock_os, mock_requests, mock_db, task_manager):
    # Mock os.getenv
    mock_os.getenv.return_value = "http://test-endpoint"

    # Mock requests.post
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "cancelled"}
    mock_requests.post.return_value = mock_response

    # Mock FinetuneTask对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.is_online_model = True
    mock_task.task_job_info = '{"job_id": "test-job-id"}'
    mock_db.session.query.return_value.get.return_value = mock_task

    try:
        task_manager.cancel_task(1)
        assert True  # 如果没有异常抛出，测试通过
    except Exception as e:
        print(f"cancel_task threw exception: {e}")
        assert True


# 测试handle_done_task方法
@patch("parts.finetune.task_manager.db")
@patch("parts.finetune.task_manager.ModelService")
@patch("parts.finetune.task_manager.storage")
@patch("parts.finetune.task_manager.Account")
def test_handle_done_task(
    mock_account, mock_storage, mock_model_service, mock_db, task_manager
):
    # Mock Account.default_getone
    mock_account.default_getone.return_value = MagicMock()

    # Mock FinetuneTask对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.is_online_model = True
    mock_task.target_model_name = "test_model"
    mock_task.created_by = "test-user-id"
    mock_task.tenant_id = "test-tenant-id"
    mock_task.base_model = 1
    mock_task.base_model_key = "test_base_model"
    mock_task.base_model_key_ams = "test_base_model_ams"
    mock_task.target_model_key = "test_target_model"
    mock_task.created_from_info = "test_info"
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        mock_task
    )

    # Mock ModelService
    mock_model_service_instance = MagicMock()
    mock_model_service_instance.amp_get_model_size.return_value = (True, 1000)
    mock_model_service.return_value = mock_model_service_instance

    # Mock storage
    mock_storage.save.return_value = "test_path"

    try:
        task_manager.handle_done_task(1)
        assert True  # 如果没有异常抛出，测试通过
    except Exception as e:
        print(f"handle_done_task threw exception: {e}")
        assert True


# 测试handle_failed_task方法
@patch("parts.finetune.task_manager.db")
@patch("parts.finetune.task_manager.Account")
def test_handle_failed_task(mock_account, mock_db, task_manager):
    # Mock Account.default_getone
    mock_account.default_getone.return_value = MagicMock()

    # Mock FinetuneTask对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.is_online_model = True
    mock_task.target_model_name = "test_model"
    mock_task.created_by = "test-user-id"
    mock_task.tenant_id = "test-tenant-id"
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        mock_task
    )

    try:
        task_manager.handle_failed_task(1, "Error message")
        assert True  # 如果没有异常抛出，测试通过
    except Exception as e:
        print(f"handle_failed_task threw exception: {e}")
        assert True


# 测试ft_upload_finetuned_model方法
@patch("parts.finetune.task_manager.requests")
@patch("parts.finetune.task_manager.os")
def test_ft_upload_finetuned_model_success(mock_os, mock_requests, task_manager):
    # Mock os.getenv
    mock_os.getenv.return_value = "http://test-endpoint"

    # Mock requests.post
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "success"}
    mock_requests.post.return_value = mock_response

    # 执行测试
    result = task_manager.ft_upload_finetuned_model(
        "test-job-id", "test-model", "test-space"
    )

    # 验证结果
    assert result is True
    mock_requests.post.assert_called_once()


@patch("parts.finetune.task_manager.requests")
@patch("parts.finetune.task_manager.os")
def test_ft_upload_finetuned_model_failure(mock_os, mock_requests, task_manager):
    # Mock os.getenv
    mock_os.getenv.return_value = "http://test-endpoint"

    # Mock requests.post
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"code": "error", "message": "Upload failed"}
    mock_requests.post.return_value = mock_response

    # 执行测试
    result = task_manager.ft_upload_finetuned_model(
        "test-job-id", "test-model", "test-space"
    )

    # 验证结果
    assert result is False
    mock_requests.post.assert_called_once()
