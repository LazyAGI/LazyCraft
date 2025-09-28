import datetime
import os
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from app import app as flask_app
from parts.urls import api
from parts.workspace.members import (AccountTenantListApi, AddTenantApi,
                                     AllTenantListApi, AllUserListApi,
                                     CoopCloseApi, CoopOpenApi, CoopStatusApi,
                                     CurrentTenantListApi, DeleteAccountApi,
                                     DeleteRoleApi, DeleteTenantApi,
                                     DetailTenantApi, ExitTenantApi,
                                     MoveAssetsApi, QuotaRequestActionApi,
                                     QuotaRequestApi, QuotaRequestDetailApi,
                                     QuotaRequestListApi, SelectUserListApi,
                                     SwitchTenantApi)

# 创建一个Flask应用程序用于测试
# app = Flask(__name__)

# # 使用pytest fixture来创建测试客户端
# @pytest.fixture
# def client():
#     with app.test_client() as client:
#         yield client


@pytest.fixture
def app():
    # 设置测试配置
    os.environ["LOGIN_DISABLED"] = "True"
    flask_app.config.update(
        {
            "TESTING": True,
            "LOGIN_DISABLED": True,  # 禁用登录要求
        }
    )

    # 其他测试设置可以在这里添加

    yield flask_app


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client(app):
    client = app.test_client()
    return client


# 测试AllUserListApi的get方法
@patch("parts.workspace.members.TenantService")
def test_all_user_list_api_get(mock_service, client):
    mock_service.get_all_members.return_value = MagicMock()
    response = client.get("/workspaces/all/members")
    assert response.status_code == 200


# 测试SelectUserListApi的get方法
@patch("parts.workspace.members.TenantService")
def test_select_user_list_api_get(mock_service, client):
    mock_service.get_all_members.return_value = MagicMock()
    response = client.get("/workspaces/select/members")
    assert response.status_code == 200


# 测试AllTenantListApi的get方法
@patch("parts.workspace.members.TenantService")
def test_all_tenant_list_api_get(mock_service, client):
    mock_service.get_all_tenants.return_value = MagicMock()
    response = client.get("/workspaces/all/tenants")
    assert response.status_code == 200


# 测试AccountTenantListApi的get方法
@patch("parts.workspace.members.TenantService")
def test_account_tenant_list_api_get(mock_service, client):
    mock_service.get_account_tenants.return_value = MagicMock()
    response = client.get(
        "/workspaces/account/tenants", query_string={"account_id": "1"}
    )
    assert response.status_code == 200


# 测试CurrentTenantListApi的get方法
@patch("parts.workspace.members.TenantService")
def test_current_tenant_list_api_get(mock_service, client):
    mock_service.get_account_tenants.return_value = MagicMock()
    response = client.get("/workspaces/current/list")
    assert response.status_code == 200


# 测试SwitchTenantApi的post方法
@patch("parts.workspace.members.TenantService")
def test_switch_tenant_api_post(mock_service, client):
    mock_service.switch_tenant.return_value = None
    response = client.post("/workspaces/switch", json={"tenant_id": "1"})
    assert response.status_code == 200


# 测试AddTenantApi的post方法
@patch("parts.workspace.members.TenantService")
@patch("parts.workspace.members.LogService")
def test_add_tenant_api_post(mock_log_service, mock_service, client):
    mock_service.create_tenant.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post("/workspaces/add", json={"name": "test_tenant"})
    assert response.status_code == 200


# 测试DetailTenantApi的get方法
@patch("parts.workspace.members.TenantService")
def test_detail_tenant_api_get(mock_service, client):
    mock_service.get_tenant_by_id.return_value = MagicMock()
    response = client.get("/workspaces/detail", query_string={"tenant_id": "1"})
    assert response.status_code == 200


# 测试MoveAssetsApi的post方法
@patch("parts.workspace.members.AssetManager")
def test_move_assets_api_post(mock_asset_manager, client):
    mock_asset_manager.return_value.move_account_tenant_assets.return_value = None
    response = client.post(
        "/workspaces/move-assets",
        json={"tenant_id": "1", "source_account_id": "1", "target_account_id": "2"},
    )
    assert response.status_code == 200


# 测试DeleteTenantApi的post方法
@patch("parts.workspace.members.TenantService")
@patch("parts.workspace.members.AssetManager")
@patch("parts.workspace.members.LogService")
def test_delete_tenant_api_post(
    mock_log_service, mock_asset_manager, mock_service, client
):
    mock_service.get_tenant_by_id.return_value = MagicMock()
    mock_asset_manager.return_value.check_tenant_assets.return_value = None
    mock_asset_manager.return_value.move_tenant_assets.return_value = None
    mock_log_service.return_value.add.return_value = None
    response = client.post("/workspaces/delete", json={"tenant_id": "1"})
    assert response.status_code == 200


# 测试ExitTenantApi的post方法
@patch("parts.workspace.members.TenantService")
@patch("parts.workspace.members.AssetManager")
def test_exit_tenant_api_post(mock_asset_manager, mock_service, client):
    mock_service.get_tenant_by_id.return_value = MagicMock()
    mock_asset_manager.return_value.check_tenant_account_assets.return_value = None
    response = client.post("/workspaces/exit", json={"tenant_id": "1"})
    assert response.status_code == 200


# 测试DeleteRoleApi的post方法
@patch("parts.workspace.members.TenantService")
@patch("parts.workspace.members.AssetManager")
@patch("parts.workspace.members.LogService")
def test_delete_role_api_post(
    mock_log_service, mock_asset_manager, mock_service, client
):
    mock_service.get_tenant_by_id.return_value = MagicMock()
    mock_service.get_tenant_accounts.return_value = [{"id": "1"}]
    mock_asset_manager.return_value.check_tenant_account_assets.return_value = None
    mock_log_service.return_value.add.return_value = None
    response = client.post(
        "/workspaces/delete-role", json={"tenant_id": "1", "account_id": "1"}
    )
    assert response.status_code == 200


# 测试DeleteAccountApi的post方法
@patch("parts.workspace.members.AssetManager")
@patch("parts.workspace.members.LogService")
def test_delete_account_api_post(mock_log_service, mock_asset_manager, client):
    mock_asset_manager.return_value.check_account_assets.return_value = None
    mock_log_service.return_value.add.return_value = None
    response = client.post("/workspaces/delete-account", json={"account_id": "1"})
    assert response.status_code == 200


# 测试CoopStatusApi的get方法
@patch("parts.workspace.members.CooperationService")
def test_coop_status_api_get(mock_service, client):
    mock_service.return_value.get_object.return_value = MagicMock()
    response = client.get(
        "/workspaces/coop/status",
        query_string={"target_type": "type", "target_id": "1"},
    )
    assert response.status_code == 200


# 测试CoopOpenApi的post方法
@patch("parts.workspace.members.CooperationService")
def test_coop_open_api_post(mock_service, client):
    mock_service.return_value.set_object_accounts.return_value = MagicMock()
    response = client.post(
        "/workspaces/coop/open",
        json={"target_type": "type", "target_id": "1", "accounts": ["1"]},
    )
    assert response.status_code == 200


# 测试CoopCloseApi的post方法
@patch("parts.workspace.members.CooperationService")
def test_coop_close_api_post(mock_service, client):
    data = {"target_type": "type", "target_id": "1"}
    mock_service.return_value.close_object.return_value = data
    response = client.post(
        "/console/api/workspaces/coop/close",
        json={"target_type": "type", "target_id": "1"},
    )
    assert response.status_code == 200


@pytest.fixture
def quota_data():
    return {
        "items": [
            {
                "id": 1,
                "request_type": "storage",
                "requested_amount": 100,
                "approved_amount": 80,
                "reason": "扩容存储空间",
                "status": "approved",
                "created_at": datetime.datetime(2025, 5, 27, 10, 0, 0),
                "updated_at": datetime.datetime(2025, 5, 27, 11, 0, 0),
                "tenant_name": "租户A",
                "account_name": "用户A",
                "tenant_id": 101,
                "account_id": 201,
                "processed_at": datetime.datetime(2025, 5, 27, 11, 5, 0),
                "reject_reason": "",
            }
        ],
        "total": 1,
        "pages": 1,
        "current_page": 1,
        "per_page": 10,
        "has_next": False,
        "has_prev": False,
        "page": 1,
    }


@patch("parts.workspace.members.QuotaService")
def test_quota_requests_list(mock_service, client):
    data = {
        "items": [
            {
                "id": 1,
                "request_type": "storage",
                "requested_amount": 100,
                "approved_amount": 80,
                "reason": "扩容存储空间",
                "status": "approved",
                "created_at": datetime.datetime(2025, 5, 27, 10, 0, 0),
                "updated_at": datetime.datetime(2025, 5, 27, 11, 0, 0),
                "tenant_name": "租户A",
                "account_name": "用户A",
                "tenant_id": 101,
                "account_id": 201,
                "processed_at": datetime.datetime(2025, 5, 27, 11, 5, 0),
                "reject_reason": "",
            }
        ],
        "total": 1,
        "pages": 1,
        "current_page": 1,
        "per_page": 10,
        "has_next": False,
        "has_prev": False,
        "page": 1,
    }

    mock_service.return_value.get_quota_requests.return_value = data
    # print([rule.rule for rule in client.application.url_map.iter_rules()])
    response = client.post(
        "/console/api/workspaces/quota-requests/list",
        json={"tenant_name": "test_data_set"},
    )
    res = response.get_json()
    assert res["total"] == 1
    assert res["data"][0]["request_type"] == "storage"
    assert res["data"][0]["tenant_name"] == "租户A"
    assert res["data"][0]["account_name"] == "用户A"


@patch("parts.workspace.members.QuotaService")
def test_quota_requests_check(mock_service, client):
    mock_service.return_value.check_quota_request.return_value = 1
    response = client.post(
        "/console/api/workspaces/quota-requests/requests",
        json={"type": "storage", "amount": 1, "reason": "测试", "tenant_id": "租户A"},
    )
    assert response.status_code == 400


@patch("parts.workspace.members.QuotaService")
@patch("parts.workspace.members.current_user")
def test_quota_requests(mock_current_user, mock_service, client):
    mock_current_user.id = 1
    mock_current_user.is_authenticated = True
    mock_service.return_value.check_quota_request.return_value = 0
    mock_service.return_value.create_quota_request.return_value = {"id": "123"}
    response = client.post(
        "/console/api/workspaces/quota-requests/requests",
        json={"type": "storage", "amount": 1, "reason": "测试", "tenant_id": "租户A"},
    )
    assert response.status_code == 200


@patch("parts.workspace.members.QuotaService")
def test_quota_requests_detail(mock_service, client):
    sample_result = {
        "id": 1,
        "request_type": "storage",
        "requested_amount": 100,
        "approved_amount": 80,
        "reason": "扩容存储空间",
        "status": "approved",
        "created_at": "2025-05-27 10:00:00",
        "updated_at": "2025-05-27 11:00:00",
        "tenant_name": "租户A",
        "account_name": "用户A",
        "tenant_id": 101,
        "account_id": 201,
        "processed_at": "2025-05-27 11:05:00",
        "reject_reason": "",
    }
    mock_service.return_value.get_quota_request_detail.return_value = sample_result
    response = client.get(
        "/console/api/workspaces/quota-requests/details?request_id=123"
    )
    res = response.get_json()

    assert response.status_code == 200
    assert res["status"] == "approved"


@patch("parts.workspace.members.QuotaService")
@patch("parts.workspace.members.current_user")
def test_quota_requests_process_approve(mock_current_user, mock_service, client):
    mock_current_user.id = 1
    mock_current_user.is_authenticated = True
    mock_current_user.is_admin = True
    quota_detail = {
        "id": 1,
        "request_type": "storage",
        "requested_amount": 100,
        "approved_amount": 80,
        "reason": "扩容存储空间",
        "status": "pending",
        "created_at": "2025-05-27 10:00:00",
        "updated_at": "2025-05-27 11:00:00",
        "tenant_name": "租户A",
        "account_name": "用户A",
        "tenant_id": 101,
        "account_id": 201,
        "processed_at": "2025-05-27 11:05:00",
        "reject_reason": "",
    }
    mock_service.return_value.get_quota_request_detail.return_value = quota_detail
    mock_service.return_value.approve_quota_request.return_value = {"id": "123"}
    response = client.post(
        "/console/api/workspaces/quota-requests/process",
        json={"action": "approved", "request_id": "123", "amount": 100},
    )
    assert response.status_code == 200


@patch("parts.workspace.members.QuotaService")
@patch("parts.workspace.members.current_user")
def test_quota_requests_process_reject(mock_current_user, mock_service, client):
    mock_current_user.id = 1
    mock_current_user.is_authenticated = True
    mock_current_user.is_admin = True
    quota_detail = {
        "id": 1,
        "request_type": "storage",
        "requested_amount": 100,
        "approved_amount": 80,
        "reason": "扩容存储空间",
        "status": "pending",
        "created_at": "2025-05-27 10:00:00",
        "updated_at": "2025-05-27 11:00:00",
        "tenant_name": "租户A",
        "account_name": "用户A",
        "tenant_id": 101,
        "account_id": 201,
        "processed_at": "2025-05-27 11:05:00",
        "reject_reason": "",
    }
    mock_service.return_value.get_quota_request_detail.return_value = quota_detail
    mock_service.return_value.reject_quota_request.return_value = {"id": "123"}
    response = client.post(
        "/console/api/workspaces/quota-requests/process",
        json={"action": "rejected", "request_id": "123", "reason": "test"},
    )
    assert response.status_code == 200
