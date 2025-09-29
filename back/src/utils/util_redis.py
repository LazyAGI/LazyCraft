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

import redis
from redis.connection import Connection, SSLConnection

redis_client = redis.Redis()


def init_app(app):
    """初始化 Redis 客户端。

    根据 Flask 应用的配置初始化 Redis 连接池，支持 SSL 连接。
    连接池配置包括主机、端口、用户名、密码、数据库等参数。

    Args:
        app: Flask 应用实例，包含 Redis 连接的配置信息。
             需要包含以下配置项:
             - REDIS_USE_SSL: 是否使用 SSL 连接
             - REDIS_HOST: Redis 服务器主机地址
             - REDIS_PORT: Redis 服务器端口
             - REDIS_USERNAME: Redis 用户名
             - REDIS_PASSWORD: Redis 密码
             - REDIS_DB: Redis 数据库编号
    """
    connection_class = SSLConnection if app.config.get("REDIS_USE_SSL") else Connection

    # 通过映射批量收集参数，避免重复赋值
    config_to_pool_key = {
        "REDIS_HOST": "host",
        "REDIS_PORT": "port",
        "REDIS_USERNAME": "username",
        "REDIS_PASSWORD": "password",
        "REDIS_DB": "db",
    }

    pool_kwargs = {
        "encoding": "utf-8",
        "encoding_errors": "strict",
        "decode_responses": False,
    }
    for cfg_key, pool_key in config_to_pool_key.items():
        value = app.config.get(cfg_key)
        if value is not None:
            pool_kwargs[pool_key] = value

    redis_client.connection_pool = redis.ConnectionPool(
        **pool_kwargs,
        connection_class=connection_class,
    )

    app.extensions["redis"] = redis_client
