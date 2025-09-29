import pytest

from parts.finetune.adapter import ParameterAdapter


# 使用pytest fixture来创建ParameterAdapter实例
@pytest.fixture
def adapter():
    return ParameterAdapter()


# 测试adapt方法
def test_adapt_openai(adapter):
    config = {"num_epochs": 10, "batch_size": 32}
    result = adapter.adapt(config, "openai")
    assert result == {"hyperparameters": {"n_epochs": 10, "batch_size": 32}}


def test_adapt_qwen(adapter):
    config = {
        "training_type": "PT",
        "num_epochs": 5,
        "batch_size": 16,
        "learning_rate": 0.001,
    }
    result = adapter.adapt(config, "qwen")
    assert result == {
        "training_type": "PT",
        "hyper_parameters": {"n_epochs": 5, "batch_size": 16, "learning_rate": 0.001},
    }


def test_adapt_default(adapter):
    config = {"num_epochs": 3}
    result = adapter.adapt(config, "unknown")
    # 当平台不存在时，使用default_params作为映射
    # num_epochs在default_params中的值是100，所以映射后应该是{100: 3}
    assert result == {100: 3}


def test_adapt_with_unknown_param(adapter):
    """测试包含未知参数的配置"""
    config = {"num_epochs": 5, "unknown_param": "value"}
    result = adapter.adapt(config, "qwen")
    # 只有已知参数会被映射，未知参数会被忽略
    assert result == {"hyper_parameters": {"n_epochs": 5}}


def test_adapt_empty_config(adapter):
    """测试空配置"""
    config = {}
    result = adapter.adapt(config, "qwen")
    assert result == {}


def test_adapt_nested_mapping(adapter):
    """测试嵌套映射（如openai的hyperparameters.n_epochs）"""
    config = {"num_epochs": 10, "batch_size": 32}
    result = adapter.adapt(config, "openai")
    assert result == {"hyperparameters": {"n_epochs": 10, "batch_size": 32}}
    assert "hyperparameters" in result
    assert result["hyperparameters"]["n_epochs"] == 10
    assert result["hyperparameters"]["batch_size"] == 32
