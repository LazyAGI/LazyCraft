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

import json
from typing import Any

from lazyllm.tools.rag import DocNode


class EasyEncoder(json.JSONEncoder):
    """自定义JSON编码器。

    用于处理特殊数据类型的JSON编码。
    """

    def default(self, obj):
        """处理不可序列化对象的编码。

        Args:
            obj: 要编码的对象

        Returns:
            Any: 编码后的对象

        Raises:
            Exception: 当编码失败时抛出
        """
        if isinstance(obj, bytes):
            if obj:
                return "[...]"  # Non-empty bytes represented as placeholder
            else:
                return str(obj, encoding="utf-8")

        if isinstance(obj, DocNode):
            if obj:
                return obj.to_dict()
            else:
                return {}
        return json.JSONEncoder.default(self, obj)


class EventSerializer:
    """事件序列化工具。

    用于处理事件数据的序列化和反序列化。

    Example:
        event = {"type": "message", "data": "hello"}
        json_str = EventSerializer.serialize_event(event)
        sse_msg = EventSerializer.sse_message(event)
        parsed = EventSerializer.deserialize_event(json_str)
    """

    @staticmethod
    def serialize_event(event: dict[str, Any]) -> str:
        """序列化事件为JSON字符串。

        Args:
            event (dict): 要序列化的事件字典

        Returns:
            str: JSON字符串表示

        Raises:
            Exception: 当序列化失败时抛出
        """
        return json.dumps(
            event, cls=EasyEncoder, ensure_ascii=False, separators=(",", ":")
        )

    @staticmethod
    def deserialize_event(event_str: str) -> dict[str, Any]:
        """从JSON字符串反序列化事件。

        Args:
            event_str (str): 要反序列化的JSON字符串

        Returns:
            dict: 事件字典

        Raises:
            Exception: 当反序列化失败时抛出
        """
        return json.loads(event_str)

    @staticmethod
    def sse_message(event: dict[str, Any]) -> str:
        """构建SSE格式消息。

        Args:
            event (dict): 要格式化的事件字典

        Returns:
            str: SSE格式的字符串，包含data前缀和换行符

        Raises:
            Exception: 当格式化失败时抛出

        Example:
            event = {"type": "update", "id": 123}
            sse_msg = EventSerializer.sse_message(event)
            # Returns: "data: {"type":"update","id":123}\n\n"
        """
        return f"data: {EventSerializer.serialize_event(event)}\n\n"
