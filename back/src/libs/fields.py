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

import datetime

from flask_restful import fields


class CustomDateTime(fields.Raw):
    """自定义日期时间字段。

    用于 Flask-RESTful 序列化，将 datetime 对象格式化为标准字符串格式。
    """

    def format(self, value):
        """格式化日期时间值。

        将 datetime 对象转换为 "YYYY-MM-DD HH:MM:SS" 格式的字符串。

        Args:
            value: 要格式化的值。

        Returns:
            Union[str, Any]: 如果是 datetime 对象，返回格式化字符串；否则返回原值。
        """
        if isinstance(value, datetime.datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class IntegerArray(fields.Raw):
    """整数数组字段。

    用于 Flask-RESTful 序列化，将列表中的元素转换为整数数组。
    过滤掉空值并确保所有元素都是整数类型。
    """

    def format(self, value):
        """格式化整数数组。

        将列表中的非空元素转换为整数数组。

        Args:
            value: 要格式化的值。

        Returns:
            list[int]: 整数列表。如果输入不是列表，返回空列表。
        """
        if isinstance(value, list):
            return [int(item) for item in value if item]
        return []
