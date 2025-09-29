from unittest.mock import MagicMock, patch

import pytest

from parts.auth.login import LoginApi, LogoutApi, RegisterApi


# 测试LoginApi的post方法
@patch("parts.auth.login.AccountService")
def test_login(mock_account_service):
    mock_account_service.authenticate_by_password.return_value = MagicMock(
        name="Test User"
    )
    api = LoginApi()
    response = api.post()
    assert response["result"] == "success"


# 测试RegisterApi的post方法
@patch("parts.auth.login.RegisterService")
@patch("parts.auth.login.TenantService")
def test_register(mock_tenant_service, mock_register_service):
    mock_register_service.register.return_value = MagicMock(id="test_id")
    api = RegisterApi()
    response = api.post()
    assert response["result"] == "success"


# 测试LogoutApi的get方法
@patch("parts.auth.login.AccountService")
@patch("parts.auth.login.flask_login")
def test_logout(mock_flask_login, mock_account_service):
    api = LogoutApi()
    response = api.get()
    assert response["result"] == "success"
