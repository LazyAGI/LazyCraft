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


def ensure_list_from_json(json_value):
    """
    确保从JSON字段获取的值是列表类型
    Args:
        json_value: 从数据库JSON字段获取的值
    Returns:
        list: 确保是列表类型的值
    """
    if json_value is None:
        return []
    elif isinstance(json_value, list):
        return json_value
    elif isinstance(json_value, (str, int, float)):
        # 如果是单个值，转换为列表
        return [json_value]
    else:
        # 其他类型（如dict等）返回空列表
        return []
