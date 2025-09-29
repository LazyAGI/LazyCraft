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
import threading
import time
import uuid
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from utils.util_redis import redis_client


class TaskStatus(Enum):
    """任务状态枚举"""

    PENDING = "pending"  # 等待中
    RUNNING = "running"  # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"  # 失败
    CANCELLED = "cancelled"  # 已取消


@dataclass
class TaskProgress:
    """任务进度信息"""

    task_id: str
    total_items: int
    processed_items: int
    success_items: int
    failed_items: int
    status: TaskStatus
    start_time: float
    end_time: Optional[float] = None
    error_message: Optional[str] = None
    current_item: Optional[str] = None
    current_file_processed: int = 0
    current_file_total: int = 0

    @property
    def progress_percentage(self) -> float:
        """计算进度百分比。

        Returns:
            float: 进度百分比，范围0.0到100.0。
        """
        if self.total_items == 0:
            return 0.0
        return (self.processed_items / self.total_items) * 100

    @property
    def current_file_progress_percentage(self) -> float:
        """计算当前文件进度百分比。

        Returns:
            float: 当前文件进度百分比，范围0.0到100.0。
        """
        if self.current_file_total == 0:
            return 0.0
        return (self.current_file_processed / self.current_file_total) * 100

    @property
    def elapsed_time(self) -> float:
        """计算已用时间。

        Returns:
            float: 任务已用时间（秒）。
        """
        end_time = self.end_time or time.time()
        return end_time - self.start_time

    def to_dict(self) -> dict[str, Any]:
        """转换为字典格式。

        Returns:
            dict: 包含任务进度信息的字典。
        """
        return {
            "task_id": self.task_id,
            "total_items": self.total_items,
            "processed_items": self.processed_items,
            "success_items": self.success_items,
            "failed_items": self.failed_items,
            "status": self.status.value,
            "progress_percentage": round(self.progress_percentage, 2),
            "current_file_processed": self.current_file_processed,
            "current_file_total": self.current_file_total,
            "current_file_progress_percentage": round(
                self.current_file_progress_percentage, 2
            ),
            "elapsed_time": round(self.elapsed_time, 2),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_message": self.error_message,
            "current_item": self.current_item,
        }


class DataProcessingTaskManager:
    """数据处理任务管理器"""

    def __init__(self):
        self._tasks: dict[str, TaskProgress] = {}
        self._task_futures: dict[str, Future] = {}
        self._task_callbacks: dict[str, Callable] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=5)  # 限制并发任务数
        self._logger = logging.getLogger(__name__)

    def create_task(self, total_items: int, callback: Callable) -> str:
        """创建新任务。

        Args:
            total_items (int): 任务总数据量。
            callback (Callable): 任务执行回调函数。

        Returns:
            str: 任务ID。
        """
        task_id = str(uuid.uuid4())

        with self._lock:
            progress = TaskProgress(
                task_id=task_id,
                total_items=total_items,
                processed_items=0,
                success_items=0,
                failed_items=0,
                status=TaskStatus.PENDING,
                start_time=time.time(),
            )

            self._tasks[task_id] = progress
            self._task_callbacks[task_id] = callback

            # 存储到Redis以便跨进程访问
            self._save_task_to_redis(progress)

        self._logger.info(f"创建任务: {task_id}, 总数据量: {total_items}")
        return task_id

    def start_task(self, task_id: str, *args, **kwargs) -> bool:
        """启动任务。

        Args:
            task_id (str): 任务ID。
            *args: 传递给任务回调函数的参数。
            **kwargs: 传递给任务回调函数的关键字参数。

        Returns:
            bool: 启动成功返回True，否则返回False。
        """
        with self._lock:
            if task_id not in self._tasks:
                return False

            progress = self._tasks[task_id]
            if progress.status != TaskStatus.PENDING:
                return False

            progress.status = TaskStatus.RUNNING
            self._save_task_to_redis(progress)

            # 提交任务到线程池
            future = self._executor.submit(self._execute_task, task_id, *args, **kwargs)
            self._task_futures[task_id] = future

        self._logger.info(f"启动任务: {task_id}")
        return True

    def _execute_task(self, task_id: str, *args, **kwargs):
        """执行任务。

        Args:
            task_id (str): 任务ID。
            *args: 传递给任务回调函数的参数。
            **kwargs: 传递给任务回调函数的关键字参数。

        Raises:
            Exception: 当任务执行失败时抛出异常。
        """
        try:
            callback = self._task_callbacks.get(task_id)
            if callback:
                callback(task_id, *args, **kwargs)

            with self._lock:
                if task_id in self._tasks:
                    progress = self._tasks[task_id]
                    progress.status = TaskStatus.COMPLETED
                    progress.end_time = time.time()
                    self._save_task_to_redis(progress)

            self._logger.info(f"任务完成: {task_id}")

        except Exception as e:
            with self._lock:
                if task_id in self._tasks:
                    progress = self._tasks[task_id]
                    progress.status = TaskStatus.FAILED
                    progress.end_time = time.time()
                    progress.error_message = str(e)
                    self._save_task_to_redis(progress)

            self._logger.error(f"任务失败: {task_id}, 错误: {e}")

    def cancel_task(self, task_id: str) -> bool:
        """取消任务。

        Args:
            task_id (str): 任务ID。

        Returns:
            bool: 取消成功返回True，否则返回False。
        """
        with self._lock:
            if task_id not in self._tasks:
                return False

            progress = self._tasks[task_id]
            if progress.status in [
                TaskStatus.COMPLETED,
                TaskStatus.FAILED,
                TaskStatus.CANCELLED,
            ]:
                return False

            # 取消Future
            if task_id in self._task_futures:
                future = self._task_futures[task_id]
                future.cancel()

            progress.status = TaskStatus.CANCELLED
            progress.end_time = time.time()
            self._save_task_to_redis(progress)

        self._logger.info(f"任务已取消: {task_id}")
        return True

    def update_progress(
        self,
        task_id: str,
        processed: int = None,
        success: int = None,
        failed: int = None,
        current_item: str = None,
        current_file_processed: int = None,
        current_file_total: int = None,
    ):
        """更新任务进度。

        Args:
            task_id (str): 任务ID。
            processed (int, optional): 已处理项目数。
            success (int, optional): 成功项目数。
            failed (int, optional): 失败项目数。
            current_item (str, optional): 当前处理的项目。
            current_file_processed (int, optional): 当前文件已处理数量。
            current_file_total (int, optional): 当前文件总数量。
        """
        with self._lock:
            if task_id not in self._tasks:
                return

            progress = self._tasks[task_id]
            if processed is not None:
                progress.processed_items = processed
            if success is not None:
                progress.success_items = success
            if failed is not None:
                progress.failed_items = failed
            if current_item is not None:
                progress.current_item = current_item
            if current_file_processed is not None:
                progress.current_file_processed = current_file_processed
            if current_file_total is not None:
                progress.current_file_total = current_file_total

            self._save_task_to_redis(progress)

    def get_task_progress(self, task_id: str) -> Optional[TaskProgress]:
        """获取任务进度。

        Args:
            task_id (str): 任务ID。

        Returns:
            TaskProgress or None: 任务进度对象，如果任务不存在则返回None。
        """
        with self._lock:
            return self._tasks.get(task_id)

    def get_all_tasks(self) -> dict[str, TaskProgress]:
        """获取所有任务。

        Returns:
            dict: 任务ID到任务进度对象的映射字典。
        """
        with self._lock:
            return self._tasks.copy()

    def cleanup_task(self, task_id: str):
        """清理任务。

        Args:
            task_id (str): 任务ID。
        """
        with self._lock:
            self._tasks.pop(task_id, None)
            self._task_futures.pop(task_id, None)
            self._task_callbacks.pop(task_id, None)

            # 从Redis中删除
            redis_key = f"data_processing_task:{task_id}"
            redis_client.delete(redis_key)

    def _save_task_to_redis(self, progress: TaskProgress):
        """保存任务到Redis。

        Args:
            progress (TaskProgress): 任务进度对象。
        """
        redis_key = f"data_processing_task:{progress.task_id}"
        redis_client.setex(redis_key, 3600, json.dumps(progress.to_dict()))  # 1小时过期

    def _load_task_from_redis(self, task_id: str) -> Optional[TaskProgress]:
        """从Redis加载任务。

        Args:
            task_id (str): 任务ID。

        Returns:
            TaskProgress or None: 任务进度对象，如果加载失败则返回None。

        Raises:
            Exception: 当从Redis加载数据失败时抛出异常。
        """
        redis_key = f"data_processing_task:{task_id}"
        data = redis_client.get(redis_key)
        if data:
            try:
                task_dict = json.loads(data)
                # 确保status是TaskStatus枚举类型
                if "status" in task_dict:
                    task_dict["status"] = TaskStatus(task_dict["status"])
                return TaskProgress(**task_dict)
            except Exception as e:
                self._logger.error(f"从Redis加载任务失败: {e}")
                return None
        return None


# 全局任务管理器实例
task_manager = DataProcessingTaskManager()
