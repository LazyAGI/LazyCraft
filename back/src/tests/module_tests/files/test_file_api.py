from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.files.file_api import AppFileUploadApi

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试AppFileUploadApi的post方法
@patch("parts.files.file_api.FileTools")
@patch("parts.files.file_api.current_user")
def test_app_file_upload_api_post(mock_current_user, mock_file_tools, client):
    mock_current_user.id = "test_user_id"
    mock_file_tools.create_temp_storage.return_value = "/tmp"
    mock_file_tools.random_filename.return_value = "random_filename.txt"

    data = {"file": (MagicMock(), "test.txt")}
    response = client.post(
        "/files/upload", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["file_path"] == "/tmp/random_filename.txt"
