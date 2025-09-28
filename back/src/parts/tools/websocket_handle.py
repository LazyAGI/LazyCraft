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
from datetime import datetime
from typing import Any

from flask_sock import Sock
from simple_websocket import ConnectionClosed

user_connections: dict[str, Any] = {}
websocket_handler = None


class RealtimeMyLogger(logging.Logger):
    def __init__(self, name: str, level: int = logging.NOTSET):
        super().__init__(name, level)
        self.log_history = []

    def _log(
        self,
        level: int,
        msg: Any,
        args,
        exc_info=None,
        extra=None,
        stack_info=False,
        stacklevel=1,
    ):
        if args and isinstance(args, dict):
            formatted_msg = msg % args
        else:
            formatted_msg = msg

        super()._log(level, formatted_msg, (), exc_info, extra, stack_info, stacklevel)

        log_entry = {
            "level": logging.getLevelName(level),
            "msg": formatted_msg,
            "timestamp": datetime.now().isoformat(),
        }

        self.log_history.append(log_entry)

        id = self.name.split("_")[-1]
        send_log(id, log_entry)

    def get_log_history(self):
        return self.log_history


def send_log(user_id: str, log_entry: dict[str, Any]):
    if user_id in user_connections:
        websocket = user_connections[user_id]
        try:
            websocket.send(json.dumps(log_entry))
        except Exception as e:
            print(f"Error sending log to user {user_id}: {str(e)}")


def get_tool_logger(id: str) -> RealtimeMyLogger:
    logger_name = f"logger_{id}"
    tool_logger = logging.getLogger(logger_name)
    if not isinstance(tool_logger, RealtimeMyLogger):
        raise TypeError("Expected RealtimeMyLogger instance")
    return tool_logger


def clean_connections():
    for id, ws in list(user_connections.items()):
        if ws.closed:
            del user_connections[id]
            logger = get_tool_logger(id)
            logger.info(f"Cleaned up closed connection for user {id}")


def connection_cleaner():
    while True:
        clean_connections()
        time.sleep(300)  # 每5分钟清理一次


def setup_websocket(app):
    global websocket_handler
    sock = Sock(app)

    @sock.route("/ws/<id>")
    def handle_websocket(ws, id):
        user_connections[id] = ws

        try:
            while True:
                try:
                    message = ws.receive(timeout=30)  # 30秒超时
                    if message is None:
                        # 超时但连接仍然打开，发送心跳
                        # ws.send(json.dumps({"type": "heartbeat"}))
                        logging.debug(f"Sent heartbeat to user {id}")
                        continue
                    # 处理接收到的消息
                    logging.info(f"Received message from user {id}: {message}")
                    # 这里可以添加消息处理逻辑
                except ConnectionClosed:
                    logging.info(f"WebSocket connection for user {id} closed.")
                    break
        except Exception as e:
            logging.error(f"Error in WebSocket connection for user {id}: {str(e)}")
        finally:
            if id in user_connections:
                del user_connections[id]
            logging.info(f"WebSocket connection for user {id} ended and cleaned up.")

    websocket_handler = sock

    # 启动连接清理线程
    cleaner_thread = threading.Thread(target=connection_cleaner)
    cleaner_thread.daemon = True
    cleaner_thread.start()


def setup_logging():
    logging.setLoggerClass(RealtimeMyLogger)
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def init_websocket(app):
    setup_logging()
    setup_websocket(app)
