import random
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from parts.prompt.model import Prompt
from parts.prompt.service import PromptService


@pytest.fixture
def prompt_service():
    return PromptService()


# 测试create_prompt_template方法
@patch("parts.prompt.service.db.session")
@patch("parts.prompt.service.LogService")
@patch("parts.prompt.service.current_user")
def test_create_prompt_template(
    mock_current_user, mock_log_service, mock_session, prompt_service
):
    random_number = random.randint(1000, 99990)
    mock_current_user.current_tenant_id = 1
    mock_current_user.id = 1
    mock_session.add.return_value = None
    mock_session.commit.return_value = None

    result = prompt_service.create_prompt_template(
        {
            "name": f"test_template_+{random_number}",
            "describe": "test description",
            "content": "test content",
        }
    )

    assert result is not None
    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_log_service.return_value.add.assert_called_once()


# 测试get_prompt_template方法
@patch("parts.prompt.service.PromptTemplate")
def test_get_prompt_template(mock_prompt_template, prompt_service):
    mock_template = MagicMock()
    mock_template.id = 1
    mock_template.name = "test"
    mock_template.describe = "test description"
    mock_template.content = "test content"
    mock_template.created_at = datetime.utcnow()
    mock_template.updated_at = datetime.utcnow()

    mock_prompt_template.query.get_or_404.return_value = mock_template

    result = prompt_service.get_prompt_template(1)
    assert result["id"] == 1
    assert result["name"] == "test"


# 测试update_prompt_template方法
@patch("parts.prompt.service.PromptTemplate")
@patch("parts.prompt.service.db.session")
@patch("parts.prompt.service.LogService")
def test_update_prompt_template(
    mock_log_service, mock_session, mock_prompt_template, prompt_service
):
    mock_template = MagicMock()
    mock_prompt_template.query.get.return_value = mock_template

    result = prompt_service.update_prompt_template(1, {"name": "updated"})
    assert result is True
    mock_session.commit.assert_called_once()


# 测试delete_prompt_template方法
@patch("parts.prompt.service.PromptTemplate")
@patch("parts.prompt.service.db.session")
@patch("parts.prompt.service.LogService")
def test_delete_prompt_template(
    mock_log_service, mock_session, mock_prompt_template, prompt_service
):
    mock_template = MagicMock()
    mock_template.name = "test"
    mock_prompt_template.query.get.return_value = mock_template

    result, name = prompt_service.delete_prompt_template(1)
    assert result is True
    assert name == "test"
    mock_session.delete.assert_called_once_with(mock_template)
    mock_session.commit.assert_called_once()


# 测试list_prompt_templates方法
@patch("parts.prompt.service.PromptTemplate")
def test_list_prompt_templates(mock_prompt_template, prompt_service):
    mock_query = MagicMock()
    mock_prompt_template.query.order_by.return_value = mock_query
    mock_query.all.return_value = [
        MagicMock(
            id=1,
            name="test",
            describe="desc",
            content="content",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    ]

    result, pagination_info = prompt_service.list_prompt_templates(None, None)
    assert len(result) == 1
    assert result[0]["id"] == 1
