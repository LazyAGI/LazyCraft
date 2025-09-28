from unittest.mock import MagicMock, patch

import pytest

from parts.conversation.speak_api import (SpeakHistoryApi, SpeakInitApi,
                                          SpeakSessionsApi, SpeakToAppApi)


# Mock PassportService
@pytest.fixture
def mock_passport_service():
    with patch("parts.conversation.speak_api.PassportService") as MockService:
        instance = MockService.return_value
        instance.verify.return_value = {"user_id": "test_user"}
        instance.issue.return_value = "mock_auth_token"
        yield instance


# Mock AppService
@pytest.fixture
def mock_app_service():
    with patch("parts.conversation.speak_api.AppService") as MockService:
        instance = MockService.return_value
        instance.get_app.return_value = MagicMock(enable_api=True)
        yield instance


# Mock database session
@pytest.fixture
def mock_db_session():
    with patch("parts.conversation.speak_api.db.session") as mock_session:
        yield mock_session


def test_speak_init_api_get(mock_passport_service):
    api = SpeakInitApi()
    with patch("flask.request.headers.get", return_value="mock_token"):
        response = api.get("123")
        assert response == "mock_auth_token"


def test_speak_sessions_api_get(mock_passport_service, mock_db_session):
    mock_db_session.query.return_value.filter.return_value.filter.return_value.group_by.return_value.all.return_value = [
        ("session1", 1)
    ]
    api = SpeakSessionsApi()
    response = api.get("123")
    assert response == {"data": ["session1"]}


def test_speak_history_api_get(mock_passport_service, mock_db_session):
    mock_db_session.query.return_value.filter_by.return_value.order_by.return_value.limit.return_value = (
        []
    )
    api = SpeakHistoryApi()
    with patch("flask.request.args.get", return_value="session1"):
        response = api.get("123")
        assert response == {"data": []}


def test_speak_to_app_api_post(
    mock_passport_service, mock_app_service, mock_db_session
):
    api = SpeakToAppApi()
    with patch(
        "flask.request.json",
        return_value={"sessionid": "session1", "content": "Hello", "files": []},
    ):
        response = api.post("123")
        assert response is not None  # 检查返回值是否为None
