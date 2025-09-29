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
import uuid
from typing import Any

from flask_sock import Sock
from simple_websocket import ConnectionClosed

task_connections: dict[str, Any] = {}
websocket_handler = None


def send_ms(task_id: str, msg: dict[str, Any]):
    """发送消息到指定任务的WebSocket连接。

    向指定任务ID的所有WebSocket连接发送消息。

    Args:
        task_id (str): 任务ID。
        msg (dict[str, Any]): 要发送的消息内容。

    Returns:
        None: 无返回值。

    Raises:
        Exception: 当发送消息失败时抛出异常。
    """
    if task_id in task_connections:
        websockets = task_connections[task_id]
        for websocket in websockets:
            try:
                websockets[websocket].send(json.dumps(msg))
            except Exception as e:
                print(f"Error sending message to task: {task_id}: {str(e)}")


def setup_websocket(app):
    """设置WebSocket处理器。

    配置WebSocket路由和处理逻辑。

    Args:
        app: Flask应用实例。

    Returns:
        None: 无返回值。
    """
    global websocket_handler
    sock = Sock(app)

    @sock.route("/model_hub/ws/<task_id>")
    def handle_model_hub_websocket(ws, task_id):
        uuid_str = str(uuid.uuid4())
        task_connections.setdefault(task_id, {})[uuid_str] = ws
        try:
            while True:
                try:
                    message = ws.receive(timeout=30)  # 30秒超时
                    if message is None:
                        logging.debug(f"Sent heartbeat to task_id {task_id}")
                        continue
                    # 处理接收到的消息
                    logging.info(f"Received message from task {task_id}: {message}")
                    # 这里可以添加消息处理逻辑
                except ConnectionClosed:
                    logging.info(f"WebSocket connection for task {task_id} closed.")
                    break
        except Exception as e:
            logging.error(f"Error in WebSocket connection for task {task_id}: {str(e)}")
        finally:
            if uuid_str in task_connections[task_id]:
                del task_connections[task_id][uuid_str]
            if not task_connections[task_id]:
                del task_connections[task_id]
            logging.info(
                f"WebSocket connection for task {task_id} ended and cleaned up."
            )

    websocket_handler = sock


def init_websocket(app):
    """初始化WebSocket。

    初始化WebSocket处理器。

    Args:
        app: Flask应用实例。

    Returns:
        None: 无返回值。
    """
    setup_websocket(app)
