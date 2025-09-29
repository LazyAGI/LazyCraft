import pytest
from flask import Flask

from parts.workspace.other import FeatureApi, RetrievalSetting

# 创建一个Flask应用程序用于测试
app = Flask(__name__)


# 使用pytest fixture来创建测试客户端
@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# 测试FeatureApi的get方法
def test_feature_api_get(client):
    response = client.get("/workspaces/feature")
    assert response.status_code == 200
    assert "billing" in response.json


# 测试RetrievalSetting的get方法
def test_retrieval_setting_get(client):
    response = client.get("/workspaces/retrieval-setting")
    assert response.status_code == 200
    assert "retrieval_method" in response.json
