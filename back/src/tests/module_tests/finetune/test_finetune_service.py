from unittest.mock import MagicMock, patch

import pytest

from parts.finetune.finetune_service import FinetuneService


# 使用pytest fixture来模拟FinetuneService
@pytest.fixture
def finetune_service():
    account = MagicMock()
    account.id = "test-user-id"
    account.current_tenant_id = "test-tenant-id"
    return FinetuneService(account)


# 测试get_paginate_tasks方法
@patch("parts.finetune.finetune_service.db")
def test_get_paginate_tasks(mock_db, finetune_service):
    mock_db.paginate.return_value = MagicMock()
    result = finetune_service.get_paginate_tasks(MagicMock(), {"page": 1, "limit": 10})
    assert result is not None


# 测试delete_task方法
@patch("parts.finetune.finetune_service.db")
@patch("parts.finetune.finetune_service.Account")
def test_delete_task(mock_account, mock_db, finetune_service):
    # Mock task对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.created_by = "test-user-id"
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        mock_task
    )

    # Mock Account.default_getone
    mock_account.default_getone.return_value = MagicMock()

    result = finetune_service.delete_task(1)
    assert result is True


# 测试cancel_task方法
@patch("parts.finetune.finetune_service.db")
@patch("parts.finetune.finetune_service.Account")
@patch("parts.finetune.finetune_service.Tenant")
def test_cancel_task(mock_tenant, mock_account, mock_db, finetune_service):
    # Mock task对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.status = "Pending"  # 设置为可取消的状态
    mock_task.created_by = "test-user-id"
    mock_task.tenant_id = "test-tenant-id"
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        mock_task
    )

    # Mock Account.default_getone
    mock_account.default_getone.return_value = MagicMock(is_super=False)

    # Mock Tenant查询
    mock_tenant_obj = MagicMock()
    mock_tenant_obj.gpu_used = 1
    mock_db.session.query.return_value.filter_by.return_value.first.return_value = (
        mock_tenant_obj
    )

    result, _ = finetune_service.cancel_task(1)
    assert result is True


# 测试create_task方法
@patch("parts.finetune.finetune_service.db")
@patch("parts.finetune.finetune_service.Account")
@patch("parts.finetune.finetune_service.Tenant")
@patch("parts.finetune.finetune_service.FinetuneTask")
@patch("parts.finetune.finetune_service.Lazymodel")
@patch("parts.finetune.finetune_service.copy_current_request_context")
def test_create_task(
    mock_copy_context,
    mock_lazymodel,
    mock_finetune_task,
    mock_tenant,
    mock_account,
    mock_db,
    finetune_service,
):
    # Mock copy_current_request_context
    mock_copy_context.return_value = lambda f: f

    # Mock Account.default_getone
    mock_account.default_getone.return_value = MagicMock(is_super=False)

    # Mock Tenant查询
    mock_tenant_obj = MagicMock()
    mock_tenant_obj.gpu_used = 0
    mock_tenant_obj.gpu_quota = 10  # 添加gpu_quota属性
    mock_db.session.query.return_value.filter_by.return_value.first.return_value = (
        mock_tenant_obj
    )

    # Mock FinetuneTask查询 - 返回0表示没有同名任务
    mock_db.session.query.return_value.filter.return_value.count.return_value = 0

    # Mock Lazymodel查询 - 返回0表示没有同名模型
    mock_db.session.query.return_value.filter.return_value.count.return_value = 0

    # Mock FinetuneTask对象
    mock_task_obj = MagicMock()
    mock_task_obj.id = 1
    mock_finetune_task.return_value = mock_task_obj

    # Mock get_ft_model_list方法
    with patch.object(
        finetune_service, "get_ft_model_list", return_value=(True, ["base_key"])
    ), patch.object(
        finetune_service, "start_task", return_value=None
    ):  # Mock start_task方法
        result = finetune_service.create_task(
            {
                "base": {
                    "name": "test_task",
                    "base_model": 1,
                    "base_model_key": "base_key",
                    "base_model_key_ams": "base_key_ams",
                    "target_model_name": "target_name",
                    "created_from_info": "info",
                    "created_from": 1,
                    "datasets": [1],
                    "datasets_type": ["text"],
                    "finetuning_type": "LoRA",
                },
                "finetune_config": {},
            }
        )
        assert result is not None


# 测试start_task方法
@patch("parts.finetune.finetune_service.db")
def test_start_task(mock_db, finetune_service):
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        MagicMock()
    )
    result = finetune_service.start_task(1)
    assert result is None


# 测试detail_finetune方法
@patch("parts.finetune.finetune_service.db")
def test_detail_finetune(mock_db, finetune_service):
    # Mock task对象
    mock_task = MagicMock()
    mock_task.id = 1
    mock_task.datasets = "[1, 2, 3]"  # JSON字符串
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        mock_task
    )

    result = finetune_service.detail_finetune(1)
    assert result is not None


# 测试get_custom_param方法
@patch("parts.finetune.finetune_service.db")
def test_get_custom_param(mock_db, finetune_service):
    mock_db.session.query.return_value.filter.return_value.all.return_value = []
    result = finetune_service.get_custom_param()
    assert result is not None


# 测试del_custom_param方法
@patch("parts.finetune.finetune_service.db")
def test_del_custom_param(mock_db, finetune_service):
    mock_db.session.query.return_value.filter.return_value.first.return_value = (
        MagicMock()
    )
    result = finetune_service.del_custom_param(1)
    assert result is True


# 测试save_custom_param方法
@patch("parts.finetune.finetune_service.db")
def test_save_custom_param(mock_db, finetune_service):
    mock_db.session.query.return_value.filter.return_value.first.return_value = None
    result = finetune_service.save_custom_param(
        {"name": "custom_param", "finetune_config": {}}
    )
    assert result is not None
