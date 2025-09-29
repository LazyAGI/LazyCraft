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

from typing import Any
from urllib.parse import quote_plus

from pydantic import Field, NonNegativeInt, PositiveInt, computed_field


class DatabaseConfig:
    DB_HOST: str = Field(
        description="db host",
        default="localhost",  # TiDB host
    )

    DB_PORT: PositiveInt = Field(
        description="db port",
        default=4000,  # TiDB port
    )

    DB_USERNAME: str = Field(
        description="db username",
        default="root",  # TiDB username
    )

    DB_PASSWORD: str = Field(
        description="db password",
        default="",  # TiDB password
    )

    DB_DATABASE: str = Field(
        description="db database",
        default="test",  # TiDB database
    )

    DB_CHARSET: str = Field(
        description="db charset",
        default="utf8mb4",  # TiDB charset
    )

    DB_EXTRAS: str = Field(
        description="db extras options.",
        default="",
    )

    SQLALCHEMY_DATABASE_URI_SCHEME: str = Field(
        description="db uri scheme",
        default="mysql+pymysql",  # TiDB scheme
    )

    # PostgreSQL配置（保留但注释）
    # DB_HOST: str = Field(
    #     description='db host',
    #     default='localhost',
    # )
    # DB_PORT: PositiveInt = Field(
    #     description='db port',
    #     default=5432,
    # )
    # DB_USERNAME: str = Field(
    #     description='db username',
    #     default='postgres',
    # )
    # DB_PASSWORD: str = Field(
    #     description='db password',
    #     default='',
    # )
    # DB_DATABASE: str = Field(
    #     description='db database',
    #     default='lazyplatform',
    # )
    # DB_CHARSET: str = Field(
    #     description='db charset',
    #     default='',
    # )
    # SQLALCHEMY_DATABASE_URI_SCHEME: str = Field(
    #     description='db uri scheme',
    #     default='postgresql',
    # )

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_DICT(self) -> dict:
        return {
            "db_type": self.SQLALCHEMY_DATABASE_URI_SCHEME,
            "user": self.DB_USERNAME,
            "password": self.DB_PASSWORD,
            "host": self.DB_HOST,
            "port": self.DB_PORT,
            "db_name": self.DB_DATABASE,
            "options_str": None,
        }

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        db_extras = (
            f"{self.DB_EXTRAS}&charset={self.DB_CHARSET}"
            if self.DB_CHARSET
            else self.DB_EXTRAS
        ).strip("&")
        db_extras = f"?{db_extras}" if db_extras else ""
        return (
            f"{self.SQLALCHEMY_DATABASE_URI_SCHEME}://"
            f"{quote_plus(self.DB_USERNAME)}:{quote_plus(self.DB_PASSWORD)}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
            f"{db_extras}"
        )

    SQLALCHEMY_POOL_SIZE: NonNegativeInt = Field(
        description="pool size of SqlAlchemy",
        default=30,
    )

    SQLALCHEMY_MAX_OVERFLOW: NonNegativeInt = Field(
        description="max overflows for SqlAlchemy",
        default=10,
    )

    SQLALCHEMY_POOL_RECYCLE: NonNegativeInt = Field(
        description="SqlAlchemy pool recycle",
        default=3600,
    )

    SQLALCHEMY_POOL_PRE_PING: bool = Field(
        description="whether to enable pool pre-ping in SqlAlchemy",
        default=False,  # 建议在TiDB中启用
    )

    SQLALCHEMY_ECHO: bool | str = Field(
        description="whether to enable SqlAlchemy echo",
        default=False,
    )

    @computed_field
    @property
    def SQLALCHEMY_ENGINE_OPTIONS(self) -> dict[str, Any]:
        return {
            "pool_size": self.SQLALCHEMY_POOL_SIZE,
            "max_overflow": self.SQLALCHEMY_MAX_OVERFLOW,
            "pool_recycle": self.SQLALCHEMY_POOL_RECYCLE,
            "pool_pre_ping": self.SQLALCHEMY_POOL_PRE_PING,
            "connect_args": {
                "charset": "utf8mb4",  # TiDB推荐配置
                "init_command": "SET time_zone = '+08:00'",
            },
        }
