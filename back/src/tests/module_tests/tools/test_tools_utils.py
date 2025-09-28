import pytest

from parts.tools.utils import call_tool_with_user_input, object_to_json


# 测试call_tool_with_user_input函数
def test_call_tool_with_user_input():
    def mock_tool(param1: str, param2: int):
        return f"{param1} {param2}"

    user_input = {"param1": "hello", "param2": 123}
    param_definitions = [
        {"name": "param1", "format": "string"},
        {"name": "param2", "format": "int"},
    ]
    result = call_tool_with_user_input(mock_tool, user_input, param_definitions)
    assert result == "hello 123"


# 测试object_to_json函数
def test_object_to_json():
    obj = {"key": "value", "number": 123}
    result = object_to_json(obj)
    assert result == '{"key": "value", "number": 123}'
