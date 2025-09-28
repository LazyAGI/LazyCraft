from unittest.mock import MagicMock, patch

import pytest
from flask import Flask
from test_prompt_template_api import token

from app import app as flask_app
from parts.prompt.manage import (CreatePrompt, DeletePrompt, GetPrompt,
                                 ListPrompts, UpdatePrompt)


# 创建一个Flask应用程序用于测试
@pytest.fixture
def app():
    # 设置测试配置
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


# 测试CreatePrompt的post方法
@patch("parts.prompt.manage.PromptService")
def test_create_prompt_post(mock_service, client):
    mock_service.return_value.create_prompt.return_value = 1
    response = client.post(
        "/console/api/prompt",
        json={"name": "test", "describe": "desc", "content": "content"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


# 测试GetPrompt的get方法
@patch("parts.prompt.manage.PromptService")
def test_get_prompt_get(mock_service, client):
    mock_service.return_value.get_prompt.return_value = {"id": 1, "name": "test"}
    response = client.get(
        "/console/api/prompt/1", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 500


# 测试UpdatePrompt的post方法
@patch("parts.prompt.manage.PromptService")
def test_update_prompt_post(mock_service, client):
    mock_service.return_value.update_prompt.return_value = True
    response = client.post(
        "/console/api/prompt/1",
        json={"name": "updated"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


# 测试DeletePrompt的post方法
@patch("parts.prompt.manage.PromptService")
def test_delete_prompt_post(mock_service, client):
    mock_service.return_value.delete_prompt.return_value = True
    response = client.post(
        "/console/api/prompt/delete/1", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


# 测试ListPrompts的get方法
@patch("parts.prompt.manage.PromptService")
def test_list_prompts_get(mock_service, client):
    mock_service.return_value.list_prompt.return_value = (
        [],
        {"total": 0, "pages": 1, "current_page": 1},
    )
    response = client.get(
        "/console/api/prompt/list", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 500
