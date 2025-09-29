import json
from unittest.mock import mock_open, patch

import pytest

from parts.data.transform_json_tool import TransformJsonTool


# 使用pytest fixture来创建TransformJsonTool实例
@pytest.fixture
def transform_tool():
    return TransformJsonTool()


# 测试transform_to_json方法
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data='{"instruction": "test", "input": "input", "output": "output"}',
)
def test_transform_to_json(mock_file, transform_tool):
    result, path = transform_tool.transform_to_json("test.csv", "Alpaca_fine_tuning")
    assert result is True


# 测试transform_alpaca_pre_train_by_txt方法
@patch("builtins.open", new_callable=mock_open, read_data="test line")
def test_transform_alpaca_pre_train_by_txt(mock_file, transform_tool):
    result, path = transform_tool.transform_alpaca_pre_train_by_txt(
        "test.txt", "output.json"
    )
    assert result is True


# 测试transform_alpaca_pre_train_by_csv方法
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data="instruction,input,output\ninstr1,input1,output1",
)
def test_transform_alpaca_pre_train_by_csv(mock_file, transform_tool):
    result, path = transform_tool.transform_alpaca_pre_train_by_csv(
        "test.csv", "output.json"
    )
    assert result is True


# 测试transform_alpaca_fine_tuning_by_csv方法
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data="instruction,input,output\ninstr1,input1,output1",
)
def test_transform_alpaca_fine_tuning_by_csv(mock_file, transform_tool):
    result, path = transform_tool.transform_alpaca_fine_tuning_by_csv(
        "test.csv", "output.json"
    )
    assert result is True


# 测试transform_sharegpt_fine_tuning_by_csv方法
@patch(
    "builtins.open",
    new_callable=mock_open,
    read_data="instruction,input,output\ninstr1,input1,output1",
)
def test_transform_sharegpt_fine_tuning_by_csv(mock_file, transform_tool):
    result, path = transform_tool.transform_sharegpt_fine_tuning_by_csv(
        "test.csv", "output.json"
    )
    assert result is True
