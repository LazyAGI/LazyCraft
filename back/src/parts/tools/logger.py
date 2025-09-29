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
from datetime import datetime
from typing import Any

import websockets

from .service import ToolService


# 假设这个函数从数据库中获取 userId
def get_user_id_by_id(id: str) -> str:
    user_id = ToolService.get_user_id_by_tool(id)
    return user_id


class RealtimeMyLogger(logging.Logger):
    def __init__(self, name: str, level: int = logging.NOTSET):
        super().__init__(name, level)
        self.log_history = []

    async def _log(
        self,
        level: int,
        msg: Any,
        args,
        exc_info=None,
        extra=None,
        stack_info=False,
        stacklevel=1,
    ):
        super()._log(level, msg, args, exc_info, extra, stack_info, stacklevel)

        log_entry = {
            "level": logging.getLevelName(level),
            "msg": msg % args if args else msg,
            "timestamp": datetime.now().isoformat(),
        }

        self.log_history.append(log_entry)

        id = self.name.split("_")[-1]  # 假设 logger 名称格式为 "logger_{id}"
        user_id = get_user_id_by_id(id)
        send_log(user_id, log_entry)

    def get_log_history(self):
        return self.log_history


# 全局变量，存储用户的 WebSocket 连接
user_connections: dict[str, websockets.WebSocketServerProtocol] = {}


async def register(websocket: websockets.WebSocketServerProtocol, user_id: str):
    user_connections[user_id] = websocket


async def unregister(user_id: str):
    if user_id in user_connections:
        del user_connections[user_id]


def send_log(user_id: str, log_entry: dict[str, Any]):
    if user_id in user_connections:
        websocket = user_connections[user_id]
        websocket.send(json.dumps(log_entry))


def get_tool_logger(id: str) -> RealtimeMyLogger:
    logger_name = f"logger_{id}"
    logger = logging.getLogger(logger_name)
    if not isinstance(logger, RealtimeMyLogger):
        raise TypeError("Expected RealtimeMyLogger instance")
    return logger


async def handle_client(websocket: websockets.WebSocketServerProtocol, path: str):
    id = path.split("/")[-1]  # 假设路径格式为 "/ws/{id}"
    user_id = await get_user_id_by_id(id)
    await register(websocket, user_id)

    get_tool_logger(id)

    try:
        async for message in websocket:
            # 这里可以处理来自客户端的消息（如果需要）
            pass
    finally:
        await unregister(user_id)


def setup_logging():
    logging.setLoggerClass(RealtimeMyLogger)
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


async def start_websocket_server():
    setup_logging()
    server = await websockets.serve(handle_client, "localhost", 8082)
    print("WebSocket server started on ws://localhost:8082")
    return server


#
#
#     # 模拟日志记录
#     async def simulate_logging():
#         logger = await get_tool_logger("1")  # 使用 ID "1"
#         while True:
#             await logger.info("This is an info message")
#             await logger.warning("This is a warning message")
#             await logger.error("This is an error message")
#             await asyncio.sleep(5)
#
#
#     asyncio.create_task(simulate_logging())
