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

import time

from utils.util_redis import redis_client


class DebugSessionManager:
    """调试会话管理器。

    使用Redis管理调试会话中的turn_number，为调试模式下的应用
    执行提供会话状态管理功能。
    """

    def __init__(self, app_id: str, user_id: str, mode: str = "draft"):
        """初始化调试会话管理器。

        设置Redis键名并初始化会话管理器实例。

        Args:
            app_id (str): 应用ID。
            user_id (str): 用户ID。
            mode (str, optional): 调试模式，默认为draft。

        Returns:
            None

        Raises:
            Exception: 当初始化失败时抛出。
        """
        self.app_id = str(app_id)
        self.user_id = str(user_id)
        self.mode = mode
        self._session_key = f"debug_session:{self.mode}:{self.app_id}:{self.user_id}"
        self._turn_key = f"debug_turn:{self.mode}:{self.app_id}:{self.user_id}"

    def get_next_turn_number(self) -> int:
        """获取调试会话的下一个轮次号。

        从Redis获取当前轮次号并递增返回下一个轮次号。

        Args:
            None

        Returns:
            int: 下一个轮次号。

        Raises:
            Exception: 当Redis操作失败时抛出。
        """
        try:
            # Get current turn number from Redis
            current_turn = redis_client.get(self._turn_key)
            if current_turn is None:
                # First time, start with 1
                next_turn = 1
            else:
                # Increment current turn number
                next_turn = int(current_turn) + 1

            # Store the new turn number with expiration (1 hour)
            redis_client.setex(self._turn_key, 3600, str(next_turn))

            # Update session timestamp
            redis_client.setex(self._session_key, 3600, str(time.time()))

            return next_turn

        except Exception:
            # Fallback to timestamp-based turn number if Redis fails
            return int(time.time() * 1000) % 10000 + 1

    def get_current_turn_number(self) -> int:
        """获取当前轮次号（不递增）。

        Returns:
            int: 当前轮次号

        Raises:
            Exception: 当获取失败时抛出
        """
        try:
            current_turn = redis_client.get(self._turn_key)
            if current_turn is None:
                return 1
            return int(current_turn)
        except Exception:
            return 1

    def reset_session(self) -> None:
        """重置调试会话（清除轮次号）。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当重置失败时抛出
        """
        try:
            redis_client.delete(self._turn_key)
            redis_client.delete(self._session_key)
        except Exception:
            pass

    def is_session_active(self) -> bool:
        """检查调试会话是否仍然活跃。

        Returns:
            bool: 如果会话活跃则返回True

        Raises:
            Exception: 当检查失败时抛出
        """
        try:
            return redis_client.exists(self._session_key) > 0
        except Exception:
            return False
