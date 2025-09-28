from unittest.mock import MagicMock, patch

import pytest

from parts.knowledge_base.service import KnowledgeBaseService


# 使用pytest fixture来模拟KnowledgeBaseService
@pytest.fixture
def kb_service():
    account = MagicMock()
    return KnowledgeBaseService(account)


# 测试get_pagination方法
@patch("parts.knowledge_base.service.db")
def test_get_pagination(mock_db, kb_service):
    mock_db.paginate.return_value = MagicMock()
    result = kb_service.get_pagination({"page": 1, "page_size": 10})
    assert result is not None


# 测试get_by_id方法
@patch("parts.knowledge_base.service.kb")
def test_get_by_id(mock_kb, kb_service):
    mock_kb.query.filter_by.return_value.first.return_value = MagicMock()
    result = kb_service.get_by_id("1")
    assert result is not None


# 测试create方法
@patch("parts.knowledge_base.service.kb")
@patch("parts.knowledge_base.service.FileTools")
def test_create(mock_file_tools, mock_kb, kb_service):
    mock_kb.query.filter_by.return_value.first.return_value = None
    mock_file_tools.create_knowledge_storage.return_value = "/path/to/storage"
    result = kb_service.create({"name": "test_kb", "description": "desc"})
    assert result is not None


# 测试update方法
@patch("parts.knowledge_base.service.kb")
def test_update(mock_kb, kb_service):
    mock_kb.query.filter.return_value.first.return_value = None
    mock_kb.query.filter_by.return_value.first.return_value = MagicMock()
    result = kb_service.update({"id": "1", "name": "updated_kb", "description": "desc"})
    assert result is not None


# 测试delete方法
@patch("parts.knowledge_base.service.kb")
def test_delete(mock_kb, kb_service):
    mock_kb.query.filter_by.return_value.first.return_value = MagicMock()
    result = kb_service.delete("1")
    assert result is not None
