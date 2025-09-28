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

import copy
import json
import logging
import uuid
from collections.abc import Generator
from typing import Any, Optional, Union

from flask_login import current_user

import lazyllm
from lazyllm.engine import LightEngine

from configs import lazy_config
from libs.filetools import FileTools
from parts.db_manage.service import DBManageService
from parts.tools.model import ToolAuth

from .lazy_converter import LazyConverter


class EngineExecutor:
    """引擎执行器。

    负责底层引擎执行和数据处理。
    """

    def __init__(
        self, engine_id: str = None, node_id: str = None, report_url: str = None
    ):
        """初始化引擎执行器。

        Args:
            engine_id (str, optional): 引擎ID
            node_id (str, optional): 节点ID
            report_url (str, optional): 报告URL

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        self._engine_id = engine_id or str(uuid.uuid4())
        self._engine = LightEngine()
        self._logger = logging.getLogger(f"EngineExecutor.{self._engine_id}")
        self._engine.set_report_url(report_url)
        self._node_id = node_id

    # ==================== Internal Methods ====================

    def _validate_graph_data(self, graph_data: dict[str, Any]) -> None:
        """验证图数据完整性。

        Args:
            graph_data (dict): 图数据

        Returns:
            None: 无返回值

        Raises:
            ValueError: 当图数据格式不正确时抛出
        """
        if not isinstance(graph_data, dict):
            raise ValueError("Graph data must be a dictionary")

        required_keys = ["nodes", "edges", "resources"]
        for key in required_keys:
            if key not in graph_data:
                graph_data[key] = []

        if not graph_data["nodes"]:
            raise ValueError("Graph data must contain at least one node")

    def _setup_database_connection(self) -> None:
        """设置数据库连接信息。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当设置失败时抛出
        """
        try:
            db_service = DBManageService(current_user)
            db_connect_config = lazy_config.SQLALCHEMY_DATABASE_DICT.copy()

            tool_auth_table_info = {
                "name": "tool_auth",
                "comment": "Tool authentication table",
                "columns": db_service.get_model_columns_info(ToolAuth),
            }
            db_connect_config["tables_info_dict"] = {"tables": [tool_auth_table_info]}

            self._engine.set_db_connect_message(db_connect_config)

        except Exception as e:
            self._logger.warning(f"Database connection setup failed: {e}")

    def _parse_input_files(
        self, inputs, files: list
    ) -> tuple[list[str], dict[str, str]]:
        """解析输入文件参数。

        Args:
            inputs: 输入数据
            files (list): 文件列表

        Returns:
            tuple: 包含lazyllm文件和上传文件的元组

        Raises:
            Exception: 当解析失败时抛出
        """

        lazyllm_files = []
        upload_files = []
        if files and len(files) > 0:
            is_preview = False
            for item in files:
                if isinstance(item, int):
                    tempFile = inputs[item]
                    if isinstance(tempFile, dict) and tempFile.get("value"):
                        upload_files.append(tempFile["value"])

                elif isinstance(item, dict) and item.get("value"):
                    if item.get("id") and item["id"] == "START_DEFAULT_FILE":
                        lazyllm_files.append(item["value"])
                        is_preview = True

            if not is_preview:
                inputs_copy = copy.deepcopy(inputs)
                inputs.clear()
                new_item = lazyllm.formatter.file(formatter="encode")(
                    {
                        "query": inputs_copy[0] if inputs_copy else "",
                        "files": upload_files,
                    }
                )
                inputs.append(new_item)

        return lazyllm_files

    def _process_task_outputs(self, task_outputs: Any) -> Any:
        """处理任务输出结果。

        Args:
            task_outputs (Any): 任务输出结果

        Returns:
            Any: 处理后的输出结果

        Raises:
            Exception: 当处理失败时抛出
        """
        if isinstance(task_outputs, str):
            return self._parse_media_content(task_outputs)
        elif isinstance(task_outputs, (list, tuple, lazyllm.package)):
            original_type = type(task_outputs)
            processed_outputs = list(task_outputs)
            for index in range(len(processed_outputs)):
                if isinstance(processed_outputs[index], str):
                    processed_outputs[index] = self._parse_media_content(
                        processed_outputs[index]
                    )
            return original_type(processed_outputs)

        # Ensure return list format
        if not isinstance(task_outputs, lazyllm.package):
            return [task_outputs]

        return task_outputs

    def _parse_media_content(self, content: str) -> Union[str, dict[str, Any]]:
        """解析媒体文件内容。

        Args:
            content (str): 媒体文件内容

        Returns:
            Union[str, dict]: 解析后的内容或原始内容

        Raises:
            Exception: 当解析失败时抛出
        """
        if not isinstance(content, str):
            return content

        media_mark_prefix = "<lazyllm-query>"
        left_brace_index = content.find(media_mark_prefix + "{")
        if left_brace_index < 0:
            return content

        try:
            right_brace_index = content.index("}", left_brace_index + 1)
            json_string = content[left_brace_index : right_brace_index + 1][
                len(media_mark_prefix) :
            ]
            media_data = json.loads(json_string)
            media_data["__mark__"] = media_mark_prefix
            media_data["raw"] = (
                content[:left_brace_index] + content[right_brace_index + 1 :]
            )
            media_data["file_urls"] = [
                FileTools.parse_lazyllm_path_to_url(file_path)
                for file_path in media_data["files"]
            ]
            return media_data
        except Exception as e:
            self._logger.exception(f"Media file parsing failed: {e}")
            return content

    # ==================== Public Methods ====================

    @property
    def engine_id(self) -> str:
        """Get engine global ID"""
        return self._engine_id

    def process_workflow(self, workflow) -> dict[str, Any]:
        """Process workflow data

        Args:
            workflow: Workflow object

        Returns:
            Converted graph data
        """
        try:
            if self._node_id:
                graph_data = LazyConverter.convert_workflow_single_node_to_lazy(
                    workflow, self._node_id, app_id=self._engine_id
                )
            else:
                graph_data = LazyConverter.convert_workflow_to_lazy(
                    workflow, app_id=self._engine_id
                )

            check_res = LazyConverter.is_graph_can_run(graph_data)
            if not check_res:
                raise ValueError(
                    "Graph data processing failed: There are nodes that have failed to build"
                )

            self._validate_graph_data(graph_data)
            self._logger.info(
                f"Graph data processing completed: nodes={len(graph_data.get('nodes', []))}, "
                f"edges={len(graph_data.get('edges', []))}"
            )

            return graph_data
        except Exception as e:
            self._logger.error(f"Graph data processing failed: {e}")
            raise ValueError(f"Graph data processing failed: {e}")

    def add_server_resource_if_needed(
        self, resources: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Add server resource if not exists"""
        has_server = any(resource.get("kind") == "server" for resource in resources)
        if not has_server:
            server_id = str(uuid.uuid4())
            server_resource = {
                "id": server_id,
                "kind": "server",
                "name": server_id,
                "args": {},
            }
            resources.append(server_resource)
        return resources

    def start_engine(self, graph_data: dict[str, Any]) -> str:
        """Start LightEngine

        Args:
            graph_data: Graph data

        Returns:
            Engine global ID

        Raises:
            ValueError: Raised when startup fails
        """
        try:
            # Stop existing instance first
            self.stop_engine()

            # Configure database connection
            self._setup_database_connection()

            # Extract graph data components
            nodes = graph_data.get("nodes", [])
            edges = graph_data.get("edges", [])
            resources = graph_data.get("resources", [])
            history_ids = LazyConverter.find_history_list(graph_data) or []

            # Start engine
            self._logger.info(
                f"Starting LightEngine: gid={self._engine_id}, "
                f"nodes={len(nodes)}, edges={len(edges)}, resources={len(resources)}"
            )

            self._engine.start(
                nodes=nodes,
                edges=edges,
                resources=resources,
                gid=self._engine_id,
                _history_ids=history_ids,
            )

            self._logger.info(f"LightEngine started successfully: {self._engine_id}")
            return self._engine_id
        except Exception as e:
            self._logger.error(f"LightEngine startup failed: {e}",stack_info=True)
            raise ValueError(f"运行失败，请检查画布配置是否正确")

    def stop_engine(self) -> None:
        """Stop LightEngine"""
        try:
            if self.is_engine_running():
                self._logger.info(f"Stopping LightEngine: {self._engine_id}")
                self._engine.release_node(self._engine_id)
        except Exception as e:
            self._logger.exception(f"Error occurred while stopping LightEngine: {e}")

    def is_engine_running(self) -> bool:
        """Check if engine is running"""
        try:
            graph_node = self._engine.build_node(self._engine_id)
            return graph_node is not None
        except Exception:
            return False

    def get_engine_urls(self) -> tuple[str, str]:
        """Get engine URL information"""
        web_url = api_url = ""

        try:
            graph_node = self._engine.build_node(self._engine_id).func
            web_url = getattr(graph_node, "_web", {}).get("url", "") or ""
        except Exception:
            pass

        try:
            graph_node = self._engine.build_node(self._engine_id).func
            api_url = getattr(graph_node, "api_url", "") or ""
        except Exception:
            pass

        return web_url, api_url

    def execute_sync_task(
        self,
        inputs: list,
        input_files: Optional[list] = None,
        chat_history: Optional[list] = None,
        session_id: Optional[str] = None,
    ) -> Any:
        """Execute synchronous task

        Args:
            inputs: Input list
            input_files: File list
            chat_history: Chat history
            session_id: Session ID

        Returns:
            Task execution results
        """
        self._logger.info(f"Starting sync execution: inputs={inputs}")
        try:
            lazyllm.globals._init_sid(session_id or str(uuid.uuid4()))

            # Parse file parameters
            lazyllm_files = self._parse_input_files(inputs, input_files or [])

            # Execute task
            task_outputs = self._engine.run(
                self._engine_id,
                *inputs,
                _lazyllm_history=chat_history,
                _lazyllm_files=lazyllm_files,
                _file_resources={},
            )

            # Process outputs
            processed_outputs = self._process_task_outputs(task_outputs)

            self._logger.info("Sync execution completed")
            return processed_outputs

        except Exception as e:
            self._logger.error(f"Sync execution failed: {e}")
            raise

    def execute_stream_task(
        self,
        inputs: list,
        input_files: Optional[list] = None,
        chat_history: Optional[list] = None,
        session_id: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """Execute streaming task

        Args:
            inputs: Input list
            input_files: File list
            chat_history: Chat history
            session_id: Session ID

        Yields:
            Streaming output results
        """
        self._logger.info(f"Starting stream execution: inputs={inputs}")

        try:
            lazyllm.globals._init_sid(session_id or str(uuid.uuid4()))

            lazyllm_files = self._parse_input_files(inputs, input_files or [])

            with lazyllm.ThreadPoolExecutor(1) as executor:
                future = executor.submit(
                    self._engine.run,
                    self._engine_id,
                    *inputs,
                    _lazyllm_history=chat_history,
                    _lazyllm_files=lazyllm_files,
                    _file_resources={},
                )

                # Process streaming output
                stream_result = ""
                while True:
                    tid = lazyllm.FileSystemQueue().sid
                    if value := lazyllm.FileSystemQueue()._dequeue(tid):
                        part_result = "".join(value)
                        stream_result += part_result
                        yield part_result
                    elif future.done():
                        break

                # Get final result
                final_result = future.result()
                final_result = self._process_task_outputs(final_result)
                return final_result

        except Exception as e:
            self._logger.error(f"Stream execution failed: {e}")
            raise

    def process_single_node_graph(self, workflow, node_id) -> dict[str, Any]:
        converter = LazyConverter(workflow)
        graph_data = converter.single_virtual_node_graph(node_id)
        check_res = LazyConverter.is_graph_can_run(graph_data)
        if not check_res:
            raise ValueError(
                "Graph data processing failed: There are nodes that have failed to build"
            )

        self._validate_graph_data(graph_data)
        self._logger.info(
            f"Graph data processing completed: nodes={len(graph_data.get('nodes', []))}, "
            f"edges={len(graph_data.get('edges', []))}"
        )

        return graph_data
