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
import logging
import time
from collections import defaultdict, deque
from collections.abc import Generator
from typing import Any, Optional, Union

import parts.data.data_reflux_service as reflux
from libs.timetools import TimeTools
from models.model_account import Account
from parts.app.node_run.debug_session_manager import DebugSessionManager
from parts.app.node_run.event_serializer import EasyEncoder
from utils.util_redis import redis_client

from .engine_executor import EngineExecutor
from .node_base import BaseNode
from .run_context import RunContext


class EngineStatus:
    """引擎状态枚举。

    定义引擎的各种运行状态。

    Attributes:
        STOP (str): 停止状态。
        STARTING (str): 启动中状态。
        START (str): 启动状态。
        ERROR (str): 错误状态。
    """

    STOP = "stop"
    STARTING = "starting"
    START = "start"
    ERROR = "error"


class RedisStateManager:
    """Redis状态管理器。

    负责所有Redis相关的操作，包括引擎状态管理、数据存储和检索等。
    为应用执行提供持久化的状态管理服务。
    """

    def __init__(self, app_id: str, mode: str):
        self._app_id = str(app_id)
        self._mode = mode
        self._logger = logging.getLogger(
            f"RedisStateManager.{self._mode}-{self._app_id}"
        )
        self._setup_redis_keys()
        self.sorted_nodes = []

    # ==================== Internal Methods ====================

    def _setup_redis_keys(self) -> None:
        """Setup Redis key names"""
        key_prefix = f"{self._mode}-{self._app_id}"
        self._graph_key = f"run_graph:{key_prefix}"
        self._original_graph_key = f"run_original_graph:{key_prefix}"
        self._status_key = f"run_status:{key_prefix}"
        self._extras_key = f"run_extras:{key_prefix}"
        self._detail_key = f"run_detail:{key_prefix}"
        self._detail_total_token_key = f"run_detail_total_token:{key_prefix}"
        self._detail_history_key = f"run_detail_history:{key_prefix}"

    def _get_detail_key_with_turn(self, turn_number: int = -1) -> str:
        """获取包含turn_number的detail key

        Args:
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话

        Returns:
            str: 包含turn_number的Redis key
        """
        key_prefix = f"{self._mode}-{self._app_id}"
        if turn_number == -1:
            # 单轮对话使用原始key
            return f"run_detail:{key_prefix}"
        else:
            # 多轮对话在key中加入turn_number
            return f"run_detail:{key_prefix}:turn_{turn_number}"

    def _get_detail_total_token_key_with_turn(self, turn_number: int = -1) -> str:
        """获取包含turn_number的detail total token key

        Args:
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话

        Returns:
            str: 包含turn_number的Redis key
        """
        key_prefix = f"{self._mode}-{self._app_id}"
        if turn_number == -1:
            # 单轮对话使用原始key
            return f"run_detail_total_token:{key_prefix}"
        else:
            # 多轮对话在key中加入turn_number
            return f"run_detail_total_token:{key_prefix}:turn_{turn_number}"

    # ==================== Public Methods ====================

    def get_status(self) -> dict[str, Any]:
        """获取引擎状态。

        Returns:
            dict: 引擎状态信息

        Raises:
            Exception: 当获取状态失败时抛出
        """
        try:
            bytes_data = redis_client.get(self._status_key)
            if bytes_data is None:
                return {"status": EngineStatus.STOP}
            return json.loads(bytes_data)
        except Exception as e:
            self._logger.error(f"Failed to get status: {e}")
            return {"status": EngineStatus.ERROR}

    def set_status(self, status: str, **kwargs) -> None:
        """设置引擎状态。

        Args:
            status (str): 状态值
            **kwargs: 额外的状态参数

        Returns:
            None: 无返回值

        Raises:
            Exception: 当设置状态失败时抛出
        """
        try:
            status_data = {"status": status, "timestamp": time.time()}
            status_data.update(kwargs)

            if status == EngineStatus.STOP:
                redis_client.delete(self._status_key)
            else:
                redis_client.setex(self._status_key, 3600, json.dumps(status_data))

            self._logger.info(f"Status updated: {status}")
        except Exception as e:
            self._logger.error(f"Failed to set status: {e}")

    def save_graph_data(
        self, graph_data: dict[str, Any], original_graph_data: dict[str, Any] = None
    ) -> None:
        """保存图数据。

        Args:
            graph_data (dict): 图数据

        Returns:
            None: 无返回值

        Raises:
            Exception: 当保存失败时抛出
        """
        try:
            redis_client.set(self._graph_key, json.dumps(graph_data))
            if original_graph_data:
                redis_client.set(
                    self._original_graph_key, json.dumps(original_graph_data)
                )
        except Exception as e:
            self._logger.error(f"Failed to save graph data: {e}")

    def get_graph_data(self) -> dict[str, Any]:
        """获取图数据。

        Returns:
            dict: 图数据

        Raises:
            Exception: 当获取失败时抛出
        """
        try:
            bytes_data = redis_client.get(self._graph_key)
            return json.loads(bytes_data) if bytes_data else {}
        except Exception as e:
            self._logger.error(f"Failed to get graph data: {e}")
            return {}

    def topological_sort(self, edges):
        # 构建图和入度表
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        nodes = set()

        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            graph[source].append(target)
            in_degree[target] += 1
            nodes.add(source)
            nodes.add(target)

        # 找到所有入度为0的节点，并确保从 __start__ 开始
        start_node = "__start__"
        end_node = "__end__"

        zero_in_degree = deque([start_node])
        sorted_nodes = []

        while zero_in_degree:
            node = zero_in_degree.popleft()
            if node not in sorted_nodes:
                sorted_nodes.append(node)

            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    zero_in_degree.append(neighbor)

        # 确保所有节点都出现在排序结果中
        all_nodes = nodes.union({start_node, end_node})
        unsorted_nodes = all_nodes - set(sorted_nodes)

        # 将未排序的节点添加到结果中
        sorted_nodes.extend(unsorted_nodes)

        if end_node not in sorted_nodes:
            sorted_nodes.append(end_node)
        self.sorted_nodes = sorted_nodes
        return sorted_nodes

    def get_extras(self) -> dict[str, Any]:
        """获取额外信息。

        Returns:
            dict: 额外信息数据

        Raises:
            Exception: 当获取失败时抛出
        """
        try:
            bytes_data = redis_client.get(self._extras_key)
            return json.loads(bytes_data) if bytes_data else {}
        except Exception as e:
            self._logger.error(f"Failed to get extras: {e}")
            return {}

    def set_extras(self, extras_data: dict[str, Any]) -> None:
        """设置额外信息。

        Args:
            extras_data (dict): 额外信息数据

        Returns:
            None: 无返回值

        Raises:
            Exception: 当设置失败时抛出
        """
        try:
            redis_client.set(self._extras_key, json.dumps(extras_data))
        except Exception as e:
            self._logger.error(f"Failed to set extras: {e}")

    def get_detail_total_tokens(self) -> int:
        """获取总token数量。

        Returns:
            int: 总token数量

        Raises:
            Exception: 当获取失败时抛出
        """
        try:
            bytes_data = redis_client.get(self._detail_total_token_key)
            if bytes_data is not None:
                # 如果 bytes_data 是字节序列，需要先解码
                if isinstance(bytes_data, bytes):
                    return int(bytes_data.decode("utf-8"))
                else:
                    return int(str(bytes_data))
            else:
                return 0
        except (ValueError, TypeError, Exception) as e:
            self._logger.error(f"Failed to get total tokens: {e}")
            return 0

    def _sort_details_by_node_order(self, details):
        """根据节点顺序对详情数据进行排序

        Args:
            details (list): 详情数据列表

        Returns:
            list: 按节点顺序排序后的数据列表
        """
        if not self.sorted_nodes:
            return details

        def get_sort_key(item):
            node_id = item.get("node_id")
            if node_id in self.sorted_nodes:
                return self.sorted_nodes.index(node_id)
            else:
                # 不在排序列表中的节点放在最后
                return len(self.sorted_nodes)

        return sorted(details, key=get_sort_key)

    def set_detail(self, new_data, turn_number: int = -1):
        """设置调试详情数据

        Args:
            new_data: 调试数据
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话
        """
        detail_key = self._get_detail_key_with_turn(turn_number)
        total_token_key = self._get_detail_total_token_key_with_turn(turn_number)

        if new_data is None:
            redis_client.delete(detail_key)
            redis_client.delete(total_token_key)
        else:
            redis_client.rpush(detail_key, json.dumps(new_data))

            # 根据节点顺序对数据进行排序
            try:
                # 如果存在原始图数据，则进行拓扑排序
                if not self.sorted_nodes and redis_client.exists(
                    self._original_graph_key
                ):
                    bytes_data = redis_client.get(self._original_graph_key)
                    original_graph_data = json.loads(bytes_data) if bytes_data else {}
                    self.sorted_nodes = self.topological_sort(
                        original_graph_data.get("edges", [])
                    )
                    logging.info(f"sorted_nodes: {self.sorted_nodes}")

                if self.sorted_nodes:
                    # 获取所有数据
                    all_details = self.get_detail(turn_number)
                    if all_details:
                        # 按节点顺序排序
                        sorted_details = self._sort_details_by_node_order(all_details)

                        # 清空原列表并重新插入排序后的数据
                        redis_client.delete(detail_key)
                        for detail in sorted_details:
                            redis_client.rpush(detail_key, json.dumps(detail))
            except Exception as e:
                self._logger.error(f"Failed to sort details by node order: {e}")

            try:
                current_total = redis_client.get(total_token_key)
                if current_total is not None:
                    # 如果 current_total 是字节序列，需要先解码
                    if isinstance(current_total, bytes):
                        current_total = int(current_total.decode("utf-8"))
                    else:
                        current_total = int(str(current_total))
                else:
                    current_total = 0
            except (ValueError, TypeError):
                current_total = 0

            new_total = (
                current_total
                + new_data.get("prompt_tokens", 0)
                + new_data.get("completion_tokens", 0)
            )
            redis_client.set(total_token_key, new_total)

    def save_current_detail_to_history(self, turn_number: int = -1):
        """将当前交互的调试信息保存到历史记录中

        Args:
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话

        注意：get_detail()返回的数据按时间顺序排列（最早到最新），
        这里按相同顺序保存到历史记录中，确保数据顺序的一致性。
        """
        try:
            # 获取当前交互的所有调试信息（按时间顺序：最早到最新）
            current_details = self.get_detail(turn_number)
            if not current_details:
                return

            # 按turn_number分组保存到历史记录，保持时间顺序
            for detail in current_details:
                self._save_detail_history(detail)

        except Exception as e:
            self._logger.error(f"Failed to save current detail to history: {e}")

    def _save_detail_history(self, new_data):
        """保存调试数据到历史记录，按turn_number分组"""
        try:
            # 忽略停止数据，不保存到历史记录
            if isinstance(new_data, dict) and new_data.get("type") == "session_end":
                return

            # 获取turn_number，如果不存在则使用默认值
            turn_number = str(new_data.get("turn_number", "1"))
            # 忽略单轮对话数据（turn_number为-1），不保存到历史记录
            if turn_number == "-1":
                return

            # 获取现有的历史数据
            history_data = self._get_detail_history_dict()

            # 如果该turn_number不存在，创建新的列表
            if turn_number not in history_data:
                history_data[turn_number] = []

            # 添加新数据到对应turn_number的列表中
            history_data[turn_number].append(new_data)

            # 限制每个turn_number组的数据量（最多100条）
            if len(history_data[turn_number]) > 100:
                history_data[turn_number] = history_data[turn_number][-100:]

            # 限制总的turn_number组数量（最多100个组）
            if len(history_data) > 100:
                # 删除最早的turn_number组
                oldest_turn = min(
                    history_data.keys(), key=lambda x: int(x) if x.isdigit() else 0
                )
                del history_data[oldest_turn]

            # 保存回Redis，设置1天过期时间
            redis_client.setex(
                self._detail_history_key, 1 * 24 * 3600, json.dumps(history_data)
            )

        except Exception as e:
            self._logger.error(f"Failed to save detail history: {e}")

    def _get_detail_history_dict(self):
        """获取历史数据的字典格式"""
        try:
            bytes_data = redis_client.get(self._detail_history_key)
            if bytes_data is None:
                return {}

            data = json.loads(bytes_data)
            return data if isinstance(data, dict) else {}

        except Exception as e:
            self._logger.error(f"Failed to get detail history dict: {e}")
            return {}

    def get_detail(self, turn_number: int = -1, conversation_type: str = "single"):
        """获取调试详情数据

        Args:
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话
            conversation_type (str): 对话类型，"single"表示单轮对话，"multi"表示多轮对话

        Returns:
            list: 调试数据列表
        """
        if conversation_type == "multi":
            # 多轮对话：获取最新的turn_number
            latest_turn = self.get_latest_turn_number()
            if latest_turn == -1:
                return []  # 没有多轮对话数据
            turn_number = latest_turn

        detail_key = self._get_detail_key_with_turn(turn_number)
        bytesdata_list = redis_client.lrange(detail_key, 0, 1000)
        return [json.loads(bytesdata) for bytesdata in bytesdata_list]

    def get_detail_history(self, limit=None):
        """获取历史调试数据，按turn_number分组

        Args:
            limit: 限制返回的turn_number组数量，None表示返回全部数据
        """
        history_data = self._get_detail_history_dict()

        if limit is None:
            return history_data

        # 如果指定了limit，则限制返回的turn_number组数量
        # 按turn_number排序，返回最后limit个组
        sorted_turns = sorted(
            history_data.keys(), key=lambda x: int(x) if x.isdigit() else 0
        )
        limited_turns = (
            sorted_turns[-limit:] if len(sorted_turns) > limit else sorted_turns
        )

        limited_data = {}
        for turn_number in limited_turns:
            limited_data[turn_number] = history_data[turn_number]

        return limited_data

    # 删除 detail_history_key 和 重置调试会话
    def delete_detail_history(self, user_id: str):
        redis_client.delete(self._detail_history_key)

        # 清理所有turn_number相关的detail key
        key_prefix = f"{self._mode}-{self._app_id}"
        pattern = f"run_detail:{key_prefix}*"
        try:
            keys_to_delete = redis_client.keys(pattern)
            for key in keys_to_delete:
                redis_client.delete(key)
        except Exception:
            pass

        # 清理所有turn_number相关的total token key
        pattern = f"run_detail_total_token:{key_prefix}*"
        try:
            keys_to_delete = redis_client.keys(pattern)
            for key in keys_to_delete:
                redis_client.delete(key)
        except Exception:
            pass

        draft_session_manager = DebugSessionManager(
            self._app_id, user_id, mode=self._mode
        )
        draft_session_manager.reset_session()

    def get_detail_length(
        self, turn_number: int = -1, conversation_type: str = "single"
    ):
        """获取调试数据长度

        Args:
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话
            conversation_type (str): 对话类型，"single"表示单轮对话，"multi"表示多轮对话

        Returns:
            int: 数据长度
        """
        if conversation_type == "multi":
            # 多轮对话：获取最新的turn_number
            latest_turn = self.get_latest_turn_number()
            if latest_turn == -1:
                return 0  # 没有多轮对话数据
            turn_number = latest_turn

        detail_key = self._get_detail_key_with_turn(turn_number)
        return redis_client.llen(detail_key)

    def get_detail_since(
        self, last_index: int, turn_number: int = -1, conversation_type: str = "single"
    ):
        """
        获取从 last_index+1 到最新的所有调试数据

        Args:
            last_index (int): 最后索引
            turn_number (int): 对话轮次，-1表示单轮对话，>=1表示多轮对话
            conversation_type (str): 对话类型，"single"表示单轮对话，"multi"表示多轮对话

        Returns:
            list: 调试数据列表
        """
        if conversation_type == "multi":
            # 多轮对话：获取最新的turn_number
            latest_turn = self.get_latest_turn_number()
            if latest_turn == -1:
                return []  # 没有多轮对话数据
            turn_number = latest_turn

        detail_key = self._get_detail_key_with_turn(turn_number)
        # redis lrange 是闭区间，所以下标要+1
        bytesdata_list = redis_client.lrange(detail_key, last_index + 1, -1)
        return [json.loads(bytesdata) for bytesdata in bytesdata_list]

    def cleanup(self) -> None:
        """Clean up all Redis data"""
        # 基础key
        redis_keys = [
            self._graph_key,
            self._original_graph_key,
            self._status_key,
            self._extras_key,
            self._detail_history_key,
        ]

        # 清理所有turn_number相关的detail key
        key_prefix = f"{self._mode}-{self._app_id}"
        pattern = f"run_detail:{key_prefix}*"
        try:
            keys_to_delete = redis_client.keys(pattern)
            for key in keys_to_delete:
                redis_client.delete(key)
        except Exception:
            pass

        # 清理所有turn_number相关的total token key
        pattern = f"run_detail_total_token:{key_prefix}*"
        try:
            keys_to_delete = redis_client.keys(pattern)
            for key in keys_to_delete:
                redis_client.delete(key)
        except Exception:
            pass

        # 清理基础key
        for key in redis_keys:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        self._logger.info("Redis data cleanup completed")

    @staticmethod
    def _get_graph_nodes_map(graph_dict):
        """获取整个画布中所有节点的map
        param graph_dict: 转换过后的画布"""
        result = {}

        def build_map(graph_or_nodelist, prefix=""):
            if isinstance(graph_or_nodelist, dict):
                node_list = graph_or_nodelist.get("nodes", [])
            elif isinstance(graph_or_nodelist, (tuple, list)):
                node_list = graph_or_nodelist
            else:
                node_list = [
                    graph_or_nodelist,
                ]

            for nodedata in node_list:
                node_id = nodedata.get("id")
                node_kind = nodedata.get("kind", "").lower()
                node_title = nodedata.get("extras-title", "")
                if prefix:
                    node_title = f"{prefix}>{node_title}"

                nodedata["extras-title"] = node_title
                result[node_id] = nodedata

                if node_kind == "ifs":
                    build_map(nodedata["args"]["true"], prefix=prefix)
                    build_map(nodedata["args"]["false"], prefix=prefix)
                elif node_kind in ["switch", "intention"]:
                    for key in nodedata["args"]["nodes"].keys():
                        build_map(nodedata["args"]["nodes"][key], prefix=prefix)
                elif BaseNode.check_type_is_subgraph_type(node_kind):
                    build_map(nodedata["args"], prefix=node_title)

        build_map(graph_dict.get("nodes", []))
        return result

    def get_graph_nodes_map(self):
        print(f"get_graph_nodes_map: {self.get_graph_data()}")
        return RedisStateManager._get_graph_nodes_map(self.get_graph_data())

    def get_latest_turn_number(self) -> int:
        """获取最大的turn_number（多轮对话的最新轮次）

        Returns:
            int: 最大的turn_number，如果没有多轮对话数据则返回-1
        """
        try:
            key_prefix = f"{self._mode}-{self._app_id}"
            pattern = f"run_detail:{key_prefix}:turn_*"
            keys = redis_client.keys(pattern)

            if not keys:
                return -1

            # 从key中提取turn_number
            turn_numbers = []
            for key in keys:
                # 确保key是字符串类型
                if isinstance(key, bytes):
                    key = key.decode("utf-8")

                if ":turn_" in key:
                    try:
                        turn_str = key.split(":turn_")[-1]
                        turn_num = int(turn_str)
                        turn_numbers.append(turn_num)
                    except (ValueError, IndexError):
                        continue

            return max(turn_numbers) if turn_numbers else -1

        except Exception as e:
            self._logger.error(f"Failed to get latest turn number: {e}")
            return -1


class EngineManager:
    """LightEngine Manager - Facade class

    Provides unified interface responsible for:
    - Lifecycle management
    - Engine execution coordination
    - State management coordination
    - Data reflux processing
    """

    def __init__(self, run_context: RunContext):
        """Initialize LightEngine manager

        Args:
            params: RunContext instance
        """
        self._run_context = run_context

        # Initialize layer components
        self._executor = EngineExecutor(
            engine_id=self._generate_global_id(),
            node_id=self.node_id,
            report_url=run_context.report_url,
        )
        self._redis_state = RedisStateManager(run_context.app_id, run_context.mode)

        # Cache graph data
        self._graph_data: Optional[dict[str, Any]] = None

        # Logger configuration
        self._logger = logging.getLogger(f"EngineManager.{self._executor.engine_id}")

    # ==================== Internal Methods ====================

    @property
    def node_id(self) -> str:
        """Get node ID"""
        return self._run_context.run_node_id

    def _generate_global_id(self) -> str:
        """Generate engine global ID"""
        if self.node_id:
            return f"node-{self._run_context.app_id}-{self.node_id}"
        else:
            return f"{self._run_context.mode}-{self._run_context.app_id}"

    def _set_extras(self, graph_data: dict[str, Any]) -> None:
        """Set extra information"""

        def _extract_node_title(graph_data: dict[str, Any]) -> str:
            """Extract node title"""
            nodes = graph_data.get("nodes", [])
            if nodes:
                return nodes[0].get("extras-title", "")
            return ""

        def _find_end_node_id(graph_data: dict[str, Any]) -> str:
            """Find end node ID"""
            nodes = graph_data.get("nodes", [])
            edges = graph_data.get("edges", [])

            if not nodes:
                return ""

            # Get all nodes with outgoing edges
            source_node_ids = {edge.get("source") for edge in edges}

            # Find nodes without outgoing edges as end nodes
            end_node_ids = [
                node.get("id")
                for node in nodes
                if node.get("id") not in source_node_ids
            ]

            return end_node_ids[0] if end_node_ids else nodes[-1].get("id", "")

        if self.node_id:
            extras_info = {
                "node_title": _extract_node_title(graph_data),
                "end_id": self.node_id,
                "mode": "node",
            }
        else:
            extras_info = {
                "node_title": "",
                "end_id": _find_end_node_id(graph_data),
                "mode": self._run_context.mode,
            }
        graph_data["_extras"] = extras_info
        self._redis_state.set_extras(extras_info)

    def _create_session_id(
        self,
        account: Optional[Account],
        track_id: Optional[str],
        turn_number: Optional[int],
    ) -> str:
        """Create session ID"""
        track_id = track_id or ""
        turn_number = turn_number or 1
        user_id = account.id if account else ""
        tenant_id = account.current_tenant_id if account else ""

        session_id = f"{self._run_context.app_id}:{self._run_context.mode}:{user_id}:{tenant_id}:{track_id}:{turn_number}"
        return session_id

    def _handle_data_reflux(
        self,
        module_type: str,
        module_input: str,
        module_output: str,
        track_id: Optional[str] = None,
        turn_number: Optional[int] = None,
    ) -> None:
        """Handle data reflux

        Args:
            module_type: Module type (app/node)
            module_input: Module input
            module_output: Module output
            track_id: Track ID
            turn_number: Turn number
        """
        try:
            # Determine module ID and name
            if module_type == "node" and self.node_id:
                module_id = self.node_id
                # Get node name, use title from extras if available
                extras = self.get_extras()
                module_name = extras.get("node_title", "") or f"Node-{self.node_id}"
            else:
                module_id = self._run_context.app_id
                module_name = self._run_context.app_name

            data = {
                "app_id": self._run_context.app_id,
                "app_name": self._run_context.app_name,
                "module_id": module_id,
                "module_name": module_name,
                "module_type": module_type,
                "output_time": TimeTools.get_china_now(),
                "module_input": module_input,
                "module_output": module_output,
                "conversation_id": track_id or "",
                "turn_number": str(turn_number or 1),
                "is_satisfied": True,
                "user_feedback": "",
            }

            self._logger.info(f"Executed {module_type} data reflux: {data}")
            reflux.create_reflux_data(data)

        except Exception as e:
            self._logger.exception(f"Data reflux failed: {e}")

    # ==================== Public Methods ====================

    @property
    def gid(self) -> str:
        """Get engine global ID"""
        return self._executor.engine_id

    @property
    def redis_manager(self):
        """Compatibility property: Redis manager"""
        return self._redis_state

    @property
    def run_context(self) -> RunContext:
        """Get engine configuration"""
        return self._run_context

    @property
    def graph_data(self) -> Optional[dict[str, Any]]:
        """Get cached graph data"""
        return self._graph_data

    def set_status(self, status: str, **kwargs) -> None:
        """Set engine status"""
        self._redis_state.set_status(status, **kwargs)

    @property
    def is_release_mode(self) -> bool:
        """Check if release mode"""
        return self._run_context.mode == "publish"

    @property
    def is_debug_mode(self) -> bool:
        """Check if debug mode"""
        return self._run_context.mode == "draft"

    @property
    def is_node_mode(self) -> bool:
        """Check if node mode"""
        return self._run_context.mode == "node"

    # ==================== 数据处理 - 公共接口 ====================

    def prepare_graph_data(self, workflow) -> dict[str, Any]:
        """Prepare graph data

        Args:
            workflow: Workflow object
            node_id: Optional node ID for single node processing

        Returns:
            Converted graph data
        """
        graph_data = self._executor.process_workflow(workflow)

        # Preprocess resources based on configuration
        if "resources" in graph_data and self._run_context.auto_server:
            graph_data["resources"] = self._executor.add_server_resource_if_needed(
                graph_data["resources"]
            )

        # Save graph data and extra information
        self._graph_data = graph_data
        self.redis_manager.save_graph_data(graph_data, workflow)
        self._set_extras(graph_data)

        self._logger.info("Graph data preparation completed")
        return graph_data

    # ==================== 生命周期管理 - 公共接口 ====================

    def start_engine(self) -> str:
        """Start LightEngine"""
        if not self._graph_data:
            raise ValueError(
                "Graph data not prepared, please call prepare_graph_data first"
            )

        try:
            # Set starting status
            self.set_status(EngineStatus.STARTING)

            # Start engine
            engine_gid = self._executor.start_engine(self._graph_data)

            # Set running status and URLs
            web_url, api_url = self._executor.get_engine_urls()
            self.set_status(EngineStatus.START, web_url=web_url, api_url=api_url)
            return engine_gid

        except Exception as e:
            self.set_status(EngineStatus.ERROR, error=str(e))
            raise

    def stop_engine(self) -> None:
        """Stop LightEngine"""
        try:
            self._executor.stop_engine()
        finally:
            self.set_status(EngineStatus.STOP)

    def is_engine_running(self) -> bool:
        """Check if engine is running"""
        return self._executor.is_engine_running()

    # ==================== 状态管理 - 公共接口 ====================

    def get_engine_status(self) -> dict[str, Any]:
        """获取引擎状态（包含实时校验）"""
        redis_status = self._redis_state.get_status()
        is_engine_running = self._executor.is_engine_running()

        # 校正状态不一致的情况
        if redis_status.get("status") == EngineStatus.RUNNING and not is_engine_running:
            self._redis_state.set_status(EngineStatus.STOP)
            return {"status": EngineStatus.STOP}

        return redis_status

    # ==================== 任务执行 - 公共接口 ====================

    def run_sync(
        self,
        inputs: list,
        input_files: Optional[list] = None,
        chat_history: Optional[list] = None,
        account: Optional[Account] = None,
        track_id: Optional[str] = None,
        turn_number: Optional[int] = None,
    ) -> Any:

        session_id = self._create_session_id(account, track_id, turn_number)

        """同步执行任务"""
        if not self.is_engine_running():
            raise ValueError("引擎未启动，请先调用start_engine")

        # 在调试或节点模式下清空调试信息
        if self.is_debug_mode or self.is_node_mode:
            self.redis_manager.set_detail(None, turn_number)

        try:
            outputs = self._executor.execute_sync_task(
                inputs, input_files, chat_history, session_id
            )

            self._logger.info(
                f"EngineManager end: outputs={json.dumps(outputs, cls=EasyEncoder)}"
            )

            # 数据回流
            if self.is_release_mode and self._run_context.enable_backflow:
                module_type = "node" if self.is_node_mode else "app"
                self._handle_data_reflux(
                    module_type=module_type,
                    module_input=str(inputs),
                    module_output=str(outputs),
                    track_id=track_id,
                    turn_number=turn_number,
                )

            # 在会话结束时添加停止数据
            if self.is_debug_mode or self.is_node_mode:
                stop_data = {
                    "type": "session_end",
                    "message": "会话执行完成",
                    "timestamp": TimeTools.get_china_now(),
                    "turn_number": turn_number or -1,
                }
                self._redis_state.set_detail(stop_data, turn_number)

                # 保存当前交互的调试信息到历史记录
                self._redis_state.save_current_detail_to_history(turn_number)

            return outputs

        except Exception as e:
            self._logger.error(f"同步执行失败: {e}")
            raise

    def run_stream(
        self,
        inputs: list,
        input_files: Optional[list] = None,
        chat_history: Optional[list] = None,
        account: Optional[Account] = None,
        track_id: Optional[str] = None,
        turn_number: Optional[int] = None,
    ) -> Generator[str, None, None]:
        """流式执行任务"""
        if not self.is_engine_running():
            raise ValueError("引擎未启动，请先调用start_engine")

        self._logger.info(
            f"EngineManager stream_run: inputs={inputs}, files={input_files}"
        )

        try:
            self._redis_state.set_detail(None, turn_number)  # 清空调试信息
            # 使用生成器收集流式输出
            stream_result = ""
            session_id = self._create_session_id(account, track_id, turn_number)

            gen = self._executor.execute_stream_task(
                inputs, input_files, chat_history, session_id
            )

            try:
                while True:
                    part_result = next(gen)
                    stream_result += part_result
                    yield part_result
            except StopIteration as e:
                final_result = e.value

            if self.is_release_mode and self._run_context.enable_backflow:
                module_type = "node" if self.is_node_mode else "app"
                self._handle_data_reflux(
                    module_type=module_type,
                    module_input=(
                        "\n".join(str(item) for item in inputs)
                        if isinstance(inputs, list)
                        else str(inputs)
                    ),
                    module_output=str(stream_result) + str(final_result),
                    track_id=track_id,
                    turn_number=turn_number,
                )

            # 在会话结束时添加停止数据
            if self.is_debug_mode or self.is_node_mode:
                stop_data = {
                    "type": "session_end",
                    "message": "会话执行完成",
                    "timestamp": TimeTools.get_china_now(),
                    "turn_number": turn_number or -1,
                }
                self._redis_state.set_detail(stop_data, turn_number)

                # 保存当前交互的调试信息到历史记录
                self._redis_state.save_current_detail_to_history(turn_number)

            return final_result

        except Exception:
            import traceback

            self._logger.error(f"流式执行失败: {traceback.format_exc()}")
            raise

    # ==================== 资源管理 - 公共接口 ====================

    def cleanup(self) -> None:
        """清理Redis数据"""
        self._redis_state.cleanup()

    def cleanup_all(self) -> None:
        """清理所有资源"""
        try:
            self.stop_engine()
            self.cleanup()
            self._graph_data = None
            self._logger.info("所有资源清理完成")
        except Exception as e:
            self._logger.exception(f"资源清理失败: {e}")

    # ==================== 兼容性方法 - 公共接口 ====================

    def _parse_media(self, content: str) -> Union[str, dict[str, Any]]:
        """处理媒体文件输出（兼容性方法）"""
        return self._executor._parse_media_content(content)

    def prepare_single_node_graph_data(self, workflow, node_id) -> dict[str, Any]:
        graph_data = self._executor.process_single_node_graph(workflow, node_id)

        self._graph_data = graph_data
        self.redis_manager.save_graph_data(graph_data)
        self._set_extras(graph_data)

        self._logger.info("Graph data preparation completed")
        return graph_data
