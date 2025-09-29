from unittest.mock import MagicMock, patch

import pytest

from parts.auth.forgot_password import (ForgotPasswordCheckApi,
                                        ForgotPasswordResetApi,
                                        ForgotPasswordSendEmailApi)


# 测试ForgotPasswordSendEmailApi的post方法
@patch("parts.auth.forgot_password.AccountService")
@patch("parts.auth.forgot_password.email_validate")
def test_send_email(mock_email_validate, mock_account_service):
    mock_email_validate.return_value = True
    mock_account_service.send_reset_password_email.return_value = "mock_token"
    api = ForgotPasswordSendEmailApi()
    with patch("parts.auth.forgot_password.Account.query.filter_by") as mock_query:
        mock_query.return_value.first.return_value = MagicMock(email="test@example.com")
        response = api.post()
        assert response["result"] == "success"


# 测试ForgotPasswordCheckApi的post方法
@patch("parts.auth.forgot_password.AccountService")
def test_check_token(mock_account_service):
    mock_account_service.get_reset_password_data.return_value = {
        "email": "test@example.com"
    }
    api = ForgotPasswordCheckApi()
    response = api.post()
    assert response["is_valid"] is True


# 测试ForgotPasswordResetApi的post方法
@patch("parts.auth.forgot_password.AccountService")
@patch("parts.auth.forgot_password.db.session")
def test_reset_password(mock_db_session, mock_account_service):
    mock_account_service.get_reset_password_data.return_value = {
        "email": "test@example.com"
    }
    api = ForgotPasswordResetApi()
    response = api.post()
    assert response["result"] == "success"
