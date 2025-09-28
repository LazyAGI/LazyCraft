from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from parts.knowledge_base.controller import (FileGetApi, FileUploadApi,
                                             KnowledgeBaseAddFileApi,
                                             KnowledgeBaseCreateApi,
                                             KnowledgeBaseDeleteApi,
                                             KnowledgeBaseFileDeleteApi,
                                             KnowledgeBaseFileListApi,
                                             KnowledgeBaseListApi,
                                             KnowledgeBaseUpdateApi)

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试KnowledgeBaseListApi的get方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
def test_knowledge_base_list_api_get(mock_service, client):
    mock_service.return_value.get_pagination.return_value = MagicMock()
    response = client.get("/kb/list")
    assert response.status_code == 200


# 测试KnowledgeBaseCreateApi的post方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.LogService")
def test_knowledge_base_create_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.create.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post(
        "/kb/create", json={"name": "test_kb", "description": "desc"}
    )
    assert response.status_code == 200


# 测试KnowledgeBaseUpdateApi的post方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.LogService")
def test_knowledge_base_update_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.update.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post(
        "/kb/update", json={"id": "1", "name": "updated_kb", "description": "desc"}
    )
    assert response.status_code == 200


# 测试KnowledgeBaseDeleteApi的post方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.LogService")
def test_knowledge_base_delete_api_post(mock_log_service, mock_service, client):
    mock_service.return_value.delete.return_value = "test_kb"
    mock_log_service.return_value.add.return_value = None
    response = client.post("/kb/delete", json={"id": "1"})
    assert response.status_code == 200


# 测试FileGetApi的post方法
@patch("parts.knowledge_base.controller.FileService")
def test_file_get_api_post(mock_service, client):
    mock_service.return_value.get_file_by_id.return_value = MagicMock()
    response = client.post("/kb/file/get", json={"file_id": "1"})
    assert response.status_code == 200


# 测试FileUploadApi的post方法
@patch("parts.knowledge_base.controller.FileService")
def test_file_upload_api_post(mock_service, client):
    mock_service.return_value.upload_file.return_value = MagicMock()
    data = {"file": (MagicMock(), "test.txt")}
    response = client.post("/kb/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 200


# 测试KnowledgeBaseAddFileApi的post方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.FileService")
@patch("parts.knowledge_base.controller.LogService")
def test_knowledge_base_add_file_api_post(
    mock_log_service, mock_file_service, mock_kb_service, client
):
    mock_kb_service.return_value.get_by_id.return_value = MagicMock()
    mock_file_service.return_value.add_knowledge_files.return_value = ["file1"]
    mock_log_service.return_value.add.return_value = None
    response = client.post(
        "/kb/file/add", json={"knowledge_base_id": "1", "file_ids": ["1"]}
    )
    assert response.status_code == 200


# 测试KnowledgeBaseFileListApi的get方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.FileService")
def test_knowledge_base_file_list_api_get(mock_file_service, mock_kb_service, client):
    mock_kb_service.return_value.get_by_id.return_value = MagicMock()
    mock_file_service.return_value.get_pagination_files.return_value = MagicMock()
    response = client.get("/kb/file/list?knowledge_base_id=1")
    assert response.status_code == 200


# 测试KnowledgeBaseFileDeleteApi的post方法
@patch("parts.knowledge_base.controller.KnowledgeBaseService")
@patch("parts.knowledge_base.controller.FileService")
@patch("parts.knowledge_base.controller.LogService")
def test_knowledge_base_file_delete_api_post(
    mock_log_service, mock_file_service, mock_kb_service, client
):
    mock_file_service.return_value.get_file_by_id.return_value = MagicMock()
    mock_file_service.return_value.batch_delete_files.return_value = 1
    mock_kb_service.return_value.get_by_id.return_value = MagicMock()
    mock_log_service.return_value.add.return_value = None
    response = client.post("/kb/file/delete", json={"file_ids": ["1"]})
    assert response.status_code == 200
