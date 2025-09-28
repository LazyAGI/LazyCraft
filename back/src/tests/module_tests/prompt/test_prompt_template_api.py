import random
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask

from app import app as flask_app
from libs.passport import PassportService

token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiZXhwIjoxNzU3NTcxMzE2LCJpc3MiOiJTRUxGX0hPU1RFRCIsInN1YiI6IkNvbnNvbGUgQVBJIFBhc3Nwb3J0In0.8_mYYg_bCk7BcXu91cTl4GqvWAZ160aUwEl12t7n3pE"


@pytest.fixture
def app():
    # 设置测试配置
    flask_app.config.update(
        {
            "TESTING": True,
            "LOGIN_DISABLED": True,  # 禁用登录要求
        }
    )

    yield flask_app

@pytest.fixture
def test_client(app):
    client = app.test_client()
    return client


def test_create_prompt_template(test_client):
    random_number = random.randint(1000, 99990)
    response = test_client.post(
        "/console/api/prompt-template",
        json={
            "name": f"示例模板+{random_number}",
            "describe": f"此处是模板介绍+{random_number}",
            "content": f"此处是模板内容+{random_number}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json["message"] == "Success"
    assert "result" in response.json


def test_get_prompt_template(test_client):
    # First, create a new prompt template
    random_number = random.randint(1000, 99990)
    response = test_client.post(
        "/console/api/prompt-template",
        json={
            "name": f"示例模板+{random_number}",
            "describe": f"此处是模板介绍+{random_number}",
            "content": f"此处是模板内容+{random_number}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    # 如果 response.json 是列表，打印第一个元素
    if isinstance(response.json, list) and len(response.json) > 0:
        print("First element of response.json:", response.json[0])
        print("Type of first element:", type(response.json[0]))
    template_id = response.json["result"]["id"]

    # Now, get the prompt template
    response = test_client.get(
        f"/console/api/prompt-template/{template_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json["result"]["name"] == f"示例模板+{random_number}"


def test_update_prompt_template(test_client):
    random_number = random.randint(1000, 99990)
    response = test_client.post(
        "/console/api/prompt-template",
        json={
            "name": f"示例模板+{random_number}",
            "describe": f"此处是模板介绍+{random_number}",
            "content": f"此处是模板内容+{random_number}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    template_id = response.json["result"]["id"]

    # Now, update the prompt template
    response = test_client.post(
        f"/console/api/prompt-template/{template_id}",
        json={
            "name": "更新后的模板",
            "describe": "更新后的模板介绍",
            "content": "更新后的模板内容",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json["message"] == "修改成功"

    # Get the updated prompt template
    response = test_client.get(f"/console/api/prompt-template/{template_id}")
    assert response.status_code == 200
    # assert response.json['name'] == "更新后的模板"


def test_delete_prompt_template(test_client):
    # First, create a new prompt template
    random_number = random.randint(1000, 99990)
    response = test_client.post(
        "/console/api/prompt-template",
        json={
            "name": f"示例模板+{random_number}",
            "describe": f"此处是模板介绍+{random_number}",
            "content": f"此处是模板内容+{random_number}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    template_id = response.json["result"]["id"]

    # Now, delete the prompt template
    response = test_client.post(
        f"/console/api/prompt-template/delete/{template_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    # assert response.json['message'] == 'Success'

    # Verify the prompt template has been deleted
    response = test_client.get(
        f"/console/api/prompt-template/{template_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_list_prompt_templates(test_client):
    # Create multiple prompt templates
    for i in range(3):
        random_number = random.randint(1000, 99990)
        response = test_client.post(
            "/console/api/prompt-template",
            json={
                "name": f"示例模板+{random_number}",
                "describe": f"此处是模板介绍+{random_number}",
                "content": f"此处是模板内容+{random_number}",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    # Get the list of prompt templates
    response = test_client.get(
        "/console/api/prompt-template/list?page=1&per_page=2",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    # assert len(response.json['templates']) == 2  # Check pagination
    # assert response.json['total'] == 3
    # assert response.json['pages'] == 2
