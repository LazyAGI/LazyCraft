# Copyright (c) 2025 SenseTime. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Additional Notice:
# When modifying, redistributing, or creating derivative works of this software,
# you must retain the original LazyCraft logo and the GitHub link icon that directs
# to the official repository: https://github.com/LazyAGI/LazyLLM

import inspect
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any


def call_tool_with_user_input(
    tool: Any, user_input: dict[str, Any], param_definitions: list[dict[str, Any]]
) -> Any:
    """
    使用用户输入和参数定义调用工具函数。

    :param tool: 工具函数（HttpTool 实例或类似的可调用对象）
    :param user_input: 包含用户输入参数的字典（来自 JSON）
    :param param_definitions: 参数定义列表，每个参数包含 name, format, 和 default_value
    :return: 工具函数的返回值
    """
    sig = inspect.signature(tool)

    # 类型映射
    type_mapping = {
        "string": str,
        "int": int,
        "object": dict,
        "array": list,
        "integer": int,
        "number": float,
        "boolean": bool,
        "file": str,  # 假设文件参数作为路径字符串处理
    }

    # Python 类型到字符串的映射
    type_str_mapping = {
        str: "str",
        int: "int",
        dict: "Dict",
        list: "List",
        float: "float",
        bool: "bool",
    }

    # 准备调用参数
    call_args = {}
    for param_def in param_definitions:
        param_name = param_def["name"]
        param_format = param_def["format"]
        default_value = param_def.get("default_value")

        if param_name in user_input:
            # 用户提供了值
            value = user_input[param_name]
            try:
                # 尝试转换类型
                value = type_mapping[param_format](value)
            except (ValueError, KeyError):
                raise ValueError(f"无法将 '{value}' 转换为 {param_format} 类型")
        elif default_value is not None:
            # 使用默认值
            value = type_mapping[param_format](default_value)
        elif (
            param_name in sig.parameters
            and sig.parameters[param_name].default != inspect.Parameter.empty
        ):
            # 使用函数定义中的默认值
            value = sig.parameters[param_name].default
        else:
            # 没有值也没有默认值
            raise ValueError(f"缺少必需的参数 '{param_name}'")

        # 获取参数类型的字符串表示
        type_str = type_str_mapping.get(type(value), str(type(value).__name__))

        # 对于列表类型，我们假设它是同质的，并使用第一个元素的类型
        if isinstance(value, list) and value:
            element_type = type_str_mapping.get(
                type(value[0]), str(type(value[0]).__name__)
            )
            type_str = f"List[{element_type}]"

        # 构建参数字符串
        call_args[f"{param_name}: {type_str}"] = value

    # 调用工具函数并返回结果
    return tool(**call_args)


def object_to_json(obj):
    def convert(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        elif isinstance(o, Decimal):
            return float(o)
        elif isinstance(o, set):
            return list(o)
        elif hasattr(o, "__dict__"):
            return {k: convert(v) for k, v in o.__dict__.items()}
        elif isinstance(o, (list, tuple)):
            return [convert(i) for i in o]
        elif isinstance(o, dict):
            return {k: convert(v) for k, v in o.items()}
        else:
            return o

    return json.dumps(convert(obj), ensure_ascii=False, indent=2)
