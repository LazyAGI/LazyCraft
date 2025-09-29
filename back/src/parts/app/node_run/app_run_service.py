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

import logging
import threading
import time
import traceback
from collections.abc import Generator
from enum import Enum
from typing import Any, Optional, Union

from libs.filetools import FileTools
from models.model_account import Account
from parts.app.model import AppMixin
from parts.logs import Action, LogService, Module
from utils.util_redis import redis_client

from .engine_manager import EngineManager
from .event_serializer import EventSerializer
from .run_context import RunContext


class EventType(Enum):
    """工作流执行事件类型枚举。

    定义工作流执行过程中可能发生的各种事件类型。

    Attributes:
        START (str): 工作流开始事件。
        FINISH (str): 工作流完成事件。
        STOP (str): 工作流停止事件。
        CHUNK (str): 数据块事件。
        RESULT (str): 结果事件。
    """

    START = "start"
    FINISH = "finish"
    STOP = "stop"

    CHUNK = "chunk"
    RESULT = "result"


class FlowType(Enum):
    """流程类型枚举。

    用于区分不同的执行上下文和流程类型。

    Attributes:
        APP_START (str): 应用启动流程。
        APP_STOP (str): 应用停止流程。
        APP_RUN (str): 应用运行流程。
    """

    APP_START = "app_start"
    APP_STOP = "app_stop"
    APP_RUN = "app_run"


class ExecutionStatus(Enum):
    """执行状态枚举。

    定义工作流执行的状态值。

    Attributes:
        SUCCEEDED (str): 执行成功状态。
        FAILED (str): 执行失败状态。
    """

    SUCCEEDED = "succeeded"
    FAILED = "failed"


class SimpleEvent:
    """简单事件数据结构。

    用于封装工作流执行过程中的事件信息。

    Attributes:
        flow_type (FlowType): 流程类型。
        event_type (EventType): 事件类型。
        data (Any): 事件数据。
        kwargs: 额外的关键字参数。
    """

    def __init__(
        self, flow_type: FlowType, event_type: EventType, data: Any = None, **kwargs
    ):
        """初始化简单事件实例。

        Args:
            flow_type (FlowType): 流程类型。
            event_type (EventType): 事件类型。
            data (Any, optional): 事件数据，默认为None。
            **kwargs: 额外的元数据参数。

        Returns:
            None

        Raises:
            None
        """
        self.event_type = event_type
        self.data = data
        self.flow_type = flow_type
        self.timestamp = time.time()
        self.metadata = kwargs

    def to_dict(self) -> dict[str, Any]:
        """转换为字典格式。

        将事件对象转换为包含所有属性的字典格式。

        Args:
            None

        Returns:
            dict[str, Any]: 包含事件信息的字典，包含flow_type、event、
                            timestamp、data等字段。

        Raises:
            None
        """
        result = {
            "flow_type": self.flow_type.value,
            "event": self.event_type.value,
            "timestamp": self.timestamp,
            "data": self.data,
            **self.metadata,
        }
        return result


class EventHandler:
    """Event handler for generating SSE format events

    Usage:
        handler = EventHandler(
            flow_type=FlowType.CANVAS_DEBUG,
            app_id="app_123"
        )
        yield handler.start_event({"status": "running"})
        yield handler.chunk_event("streaming data")
        yield handler.finish_event({"status": "completed"})
    """

    def __init__(self, flow_type: FlowType, event_kwargs: dict = {}, **kwargs):
        self._flow_type = flow_type
        self._event_kwargs = event_kwargs
        self._data_kwargs = kwargs
        self._init_data()

    # ==================== Internal Methods ====================

    def _init_data(self) -> None:
        """Initialize data"""
        self._is_success = True
        self._stream_result = ""
        self._run_result = None
        self._error = None

    def _create_event(
        self, event_type: EventType, data: Union[Any, dict[str, Any]]
    ) -> str:
        """Create SSE format event string"""
        if isinstance(data, dict):
            data.update(self._data_kwargs)

        event = SimpleEvent(
            self._flow_type, event_type, data=data, **self._event_kwargs
        )
        return EventSerializer.sse_message(event.to_dict())

    # ==================== Public Methods ====================

    def start_event(self, data: Any = None) -> str:
        """生成开始事件。

        Args:
            data (Any, optional): 事件数据

        Returns:
            str: SSE格式的开始事件字符串
        """
        self._init_data()
        return self._create_event(EventType.START, data)

    def success_event(self, data: dict[str, Any] = {}) -> str:
        """生成成功事件。

        Args:
            data (dict, optional): 事件数据

        Returns:
            str: SSE格式的成功事件字符串
        """
        data.update({"status": ExecutionStatus.SUCCEEDED.value})
        return self._create_event(EventType.FINISH, data)

    def fail_event(self, error_exception: Exception, data: dict[str, Any] = {}) -> str:
        """生成失败事件。

        Args:
            error_exception (Exception): 错误异常
            data (dict, optional): 事件数据

        Returns:
            str: SSE格式的失败事件字符串
        """
        error_msg = {
            "simple_error": str(error_exception),
            "detail_error": "".join(traceback.format_exception(error_exception)),
        }
        data.update({"status": ExecutionStatus.FAILED.value, "error": error_msg})
        self._is_success = False
        self._error = data
        return self._create_event(EventType.FINISH, data)

    def result_event(self, data: Any) -> str:
        """生成结果事件。

        Args:
            data (Any): 结果数据

        Returns:
            str: SSE格式的结果事件字符串
        """
        self._run_result = data
        return self._create_event(EventType.RESULT, data)

    def data_event(self, data: Any) -> str:
        """生成数据事件。

        Args:
            data (Any): 数据内容

        Returns:
            str: SSE格式的数据事件字符串
        """
        return self._create_event(EventType.DATA, data)

    def chunk_event(self, chunk: str) -> str:
        """生成流式块事件。

        Args:
            chunk (str): 数据块内容

        Returns:
            str: SSE格式的流式块事件字符串
        """
        self._stream_result = self._stream_result + chunk
        return self._create_event(EventType.CHUNK, chunk)

    def debug_event(self, message: str) -> str:
        """生成调试事件。

        Args:
            message (str): 调试消息

        Returns:
            str: SSE格式的调试事件字符串
        """
        return self._create_event(EventType.DEBUG, message)

    def stop_event(self, data: Any = None) -> str:
        """生成停止事件。

        Args:
            data (Any, optional): 事件数据

        Returns:
            str: SSE格式的停止事件字符串
        """
        return self._create_event(EventType.STOP, data)

    def get_stream_result(self) -> str:
        """获取流式结果。

        Returns:
            str: 流式结果字符串
        """
        return self._stream_result

    def get_run_result(self) -> Any:
        """获取运行结果。

        Returns:
            Any: 运行结果数据
        """
        return self._run_result or self._stream_result

    def get_error(self) -> Any:
        """获取错误信息。

        Returns:
            Any: 错误信息数据
        """
        return self._error

    def is_success(self) -> bool:
        """检查执行是否成功。

        Returns:
            bool: 是否成功
        """
        return self._is_success


class AppRunService:
    """Unified node execution service

    Usage:
        service = AppRunService(run_context)
        for event in service.run_stream("Hello", input_files=[]):
            yield event
    """

    def __init__(self, run_context: RunContext):
        """Initialize the app run service"""
        self._run_context = run_context
        assert self._run_context.app_id is not None, "app_id is required"

        # Initialize engine manager
        self._init_engine_manager()

        # Setup logging
        self._logger = logging.getLogger(f"AppRunService.{self.gid}")
        self._begin_at = time.time()

    # ==================== Internal Methods ====================

    def _init_engine_manager(self) -> None:
        """Initialize engine manager and set compatible properties"""
        self._engine_manager = EngineManager(self._run_context)
        self.gid = self._engine_manager.gid
        self.redis = self._engine_manager.redis_manager

    def _get_user_info(self, account: Optional[Account]) -> dict[str, str]:
        """Extract user information from account"""
        if account:
            return {"id": str(account.id), "name": account.name, "email": account.email}
        return {"id": "", "name": "", "email": ""}

    def _generate_event_data(
        self,
        inputs: list,
        input_files: list[Any],
        account: Optional[Account] = None,
        **kwargs,
    ) -> dict[str, Any]:
        finished_at = time.time()
        elapsed_time = finished_at - self._begin_at

        front_files = []
        for item in input_files or []:
            if isinstance(item, str):
                url = FileTools.parse_lazyllm_path_to_url(item)
                front_files.append({"url": url})
            elif isinstance(item, dict) and item.get("value"):
                url = FileTools.parse_lazyllm_path_to_url(item["value"])
                front_files.append({"url": url})

        """Generate base metadata"""
        base_data = {
            "app_id": self._run_context.app_id,
            "node_id": self.redis.get_extras().get("end_id", ""),
            "inputs": inputs,
            "input_files": front_files,
            "extras": self.redis.get_extras(),
            "created_at": self._begin_at,
            "elapsed_time": elapsed_time,
            "finished_at": finished_at,
            "total_tokens": self.redis.get_detail_total_tokens(),
            "total_steps": 1,
            "created_by": self._get_user_info(account),
        }
        base_data.update(kwargs)
        return base_data

    def _log_execution_result(self, is_success: bool) -> None:
        """Log execution result"""
        app_name = getattr(self._run_context, "app_name", None)
        is_node = self._run_context.mode == "node"

        if not app_name:
            return

        try:
            if is_success:
                if is_node:
                    LogService().add(
                        Module.APP_STORE,
                        Action.DEBUG_NODE_OK,
                        name=app_name,
                        node_name=self.redis.get_extras().get("node_title", ""),
                    )
                else:
                    LogService().add(
                        Module.APP_STORE, Action.DEBUG_APP_OK, name=app_name
                    )
            else:
                if is_node:
                    LogService().add(
                        Module.APP_STORE,
                        Action.DEBUG_NODE_FAIL,
                        name=app_name,
                        node_name=self.redis.get_extras().get("node_title", ""),
                    )
                else:
                    LogService().add(
                        Module.APP_STORE, Action.DEBUG_APP_FAIL, name=app_name
                    )
        except Exception as e:
            self._logger.warning(f"Failed to log execution result: {e}")

    # ==================== Public Methods ====================

    @property
    def run_context(self) -> RunContext:
        """Get run context"""
        return self._run_context

    def redis_client(self):
        """Get redis client"""
        return self._engine_manager.redis_manager

    def start(self, workflow: dict) -> str:
        """启动引擎。

        Args:
            workflow (dict): 工作流配置

        Returns:
            str: 引擎ID

        Raises:
            Exception: 当启动失败时抛出
        """
        if self._run_context.mode == "node":
            assert self._run_context.run_node_id is not None, "node_id is required"

        try:
            self._engine_manager.prepare_graph_data(workflow)
            gid = self._engine_manager.start_engine()
        except:
            import traceback

            print(traceback.format_exc())
            raise

        # self._engine_manager.prepare_graph_data(workflow)
        # self._engine_manager.prepare_graph_data(workflow)

        return gid

    def start_stream(self, workflow: dict):
        """流式启动引擎。

        Args:
            workflow (dict): 工作流配置

        Yields:
            str: SSE格式的启动事件

        Raises:
            Exception: 当启动失败时抛出
        """
        event_handler = EventHandler(
            flow_type=FlowType.APP_START,
            app_id=self._run_context.app_id,
            node_id=self._run_context.run_node_id,
        )

        try:
            yield event_handler.start_event()
            self.start(workflow)
            yield event_handler.success_event()
        except Exception as e:
            logging.exception(e)
            e_str = str(e)
            if e_str.startswith("LightEngine startup failed"):
                yield event_handler.fail_event(
                    ValueError("引擎启动失败，请检查画布配置")
                )
            else:
                yield event_handler.fail_event(e)

        finally:
            yield event_handler.stop_event()
            return event_handler

    def stop_stream(self):
        """流式停止引擎。

        Yields:
            str: SSE格式的停止事件

        Raises:
            Exception: 当停止失败时抛出
        """
        event_handler = EventHandler(
            flow_type=FlowType.APP_STOP,
            app_id=self._run_context.app_id,
            node_id=self._run_context.run_node_id,
        )

        try:
            yield event_handler.start_event()
            self.stop()
            yield event_handler.success_event()
        except Exception as e:
            logging.exception(e)
            yield event_handler.fail_event(e)

        finally:
            yield event_handler.stop_event()
            return event_handler

    def stop(self) -> None:
        """停止引擎。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当停止失败时抛出
        """
        self.cleanup()  # 里面会调用stop_engine
        # self._engine_manager.stop_engine()

    def parse_media(self, outputs) -> Any:
        """解析媒体文件。

        Args:
            outputs: 输出内容

        Returns:
            Any: 解析后的媒体数据

        Raises:
            Exception: 当解析失败时抛出
        """
        return self._engine_manager._parse_media(outputs)

    def run_stream(
        self,
        inputs: list,
        input_files: Optional[list] = None,
        chat_history: Optional[list] = None,
        account: Optional[Account] = None,
        track_id: Optional[str] = None,
        turn_number: Optional[int] = None,
        stop_engine: bool = False,
    ) -> Generator[str, None, None]:
        """Run streaming execution

        Args:
            inputs: Input list
            input_files: Optional input files
            chat_history: Optional chat history
            user_account: Optional user account
            track_id: Optional tracking ID
            turn_number: Optional turn number

        Yields:
            SSE format event strings
        """

        event_handler = EventHandler(flow_type=FlowType.APP_RUN)

        start_data = self._generate_event_data(inputs, input_files, account=account)
        yield event_handler.start_event(start_data)

        try:
            stream_result = ""

            # for text in ["Hello", "World", "LazyApp"]:
            #     yield event_handler.chunk_event(text)

            generator_stream = self._engine_manager.run_stream(
                inputs=inputs,
                input_files=input_files,
                chat_history=chat_history,
                account=account,
                track_id=track_id,
                turn_number=turn_number,
            )

            try:
                while True:
                    part_result = next(generator_stream)
                    stream_result += part_result
                    yield event_handler.chunk_event(part_result)
            except StopIteration as e:
                final_result = e.value
                yield event_handler.result_event(final_result)

            finish_data = self._generate_event_data(
                inputs, input_files, outputs=final_result, account=account
            )
            yield event_handler.success_event(finish_data)
            self._logger.info(f"AppRunService run_stream success: {finish_data}")
            self._log_execution_result(True)

        except Exception as e:
            fail_data = self._generate_event_data(inputs, input_files, account=account)
            yield event_handler.fail_event(e, fail_data)
            self._log_execution_result(False)
            self._logger.info(f"AppRunService run_stream failed: {str(e)}")

        finally:
            yield event_handler.stop_event()
            if stop_engine:
                self._engine_manager.stop_engine()
            return event_handler

    def cleanup(self) -> None:
        """Clean up resources"""
        try:
            self._engine_manager.cleanup_all()
            self._logger.info("AppRunService cleanup completed")
        except Exception as e:
            self._logger.exception(f"Cleanup failed: {e}")

    @classmethod
    def create(
        cls, app_model: AppMixin, mode: str = "draft", node_id: str = None
    ) -> "AppRunService":
        """创建应用运行服务。

        Args:
            app_model (AppMixin): 应用模型
            mode (str, optional): 运行模式，默认为draft
            node_id (str, optional): 节点ID

        Returns:
            AppRunService: 应用运行服务实例

        Raises:
            Exception: 当创建失败时抛出
        """

        run_context = RunContext(
            app_id=str(app_model.id),
            app_name=app_model.name,
            enable_backflow=app_model.enable_backflow,
            mode=mode,
            run_node_id=node_id,
        )

        return cls(run_context)

    @classmethod
    def create_by_app_id(
        cls, app_id: str = None, mode: str = "draft", node_id: str = None
    ) -> "AppRunService":
        """通过应用ID创建应用运行服务。

        Args:
            app_id (str, optional): 应用ID
            mode (str, optional): 运行模式，默认为draft
            node_id (str, optional): 节点ID

        Returns:
            AppRunService: 应用运行服务实例

        Raises:
            Exception: 当创建失败时抛出
        """
        run_context = RunContext(
            app_id=str(app_id),
            app_name="",
            enable_backflow=False,
            mode=mode,
            run_node_id=node_id,
        )

        return cls(run_context)

    def run_single_rsource(self, app_id, workflow, doc_id, path):
        """运行单个资源。

        Args:
            app_id (str): 应用ID
            workflow (dict): 工作流配置
            doc_id (str): 文档ID
            path (list): 路径列表

        Returns:
            None: 无返回值

        Raises:
            Exception: 当运行失败时抛出
        """
        self._engine_manager.prepare_single_node_graph_data(workflow, doc_id)

        def parsed():
            try:
                self._engine_manager.start_engine()
                # 解析文档结束之后关闭Engine
                self._engine_manager.stop_engine()
            except Exception as e:
                self._engine_manager.stop_engine()
                set_app_except(app_id, doc_id, path[0], f"{e}")

        worker_thread = threading.Thread(target=parsed)
        worker_thread.start()


def get_app_except(app_id, node_id="", path=""):
    """获取应用异常信息。

    Args:
        app_id (str): 应用ID
        node_id (str, optional): 节点ID，默认为空字符串
        path (str or list, optional): 路径，默认为空字符串

    Returns:
        str: 异常信息字符串

    Raises:
        Exception: 当获取失败时抛出
    """
    try:
        if isinstance(path, list):
            path = path[0]
        except_key = f"{app_id}_{node_id}_{path}"
        except_str = redis_client.get(except_key)
        if except_str is None:
            return ""
        return except_str
    except Exception as e:
        logging.error(f"Failed to get except: {e}")
        return f"{e}"


def set_app_except(app_id, node_id="", path="", except_str="") -> None:
    """设置应用异常信息。

    Args:
        app_id (str): 应用ID
        node_id (str, optional): 节点ID，默认为空字符串
        path (str or list, optional): 路径，默认为空字符串
        except_str (str, optional): 异常信息，默认为空字符串

    Returns:
        None: 无返回值

    Raises:
        Exception: 当设置失败时抛出
    """
    try:
        if isinstance(path, list):
            path = path[0]
        except_key = f"{app_id}_{node_id}_{path}"
        redis_client.setex(except_key, 3600, except_str)
        logging.info(f"set except: {except_str}")
    except Exception as e:
        logging.error(f"Failed to set status: {e}")
