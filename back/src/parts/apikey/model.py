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

import secrets
from datetime import date

from sqlalchemy.sql import func

from libs.timetools import TimeTools
from utils.util_database import db


class ApiKeyStatus:
    """ApiKey状态更改流程：
    正常--->禁用
    正常--->已删除
    正常--->过期（自动）

    禁用--->正常
    禁用--->已删除
    禁用--->过期（自动）

    已过期--->已删除
    """

    ACTIVE = "active"  # 正常状态
    DISABLED = "disabled"  # 禁用状态
    DELETED = "deleted"  # 已删除
    EXPIRED = "expired"  # 已过期


class ApiKey(db.Model):
    """用于对apikey的管理"""

    __tablename__ = "api_key"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(50), nullable=False)
    user_name = db.Column(db.String(50), nullable=True)  # 用户名
    tenant_id = db.Column(db.Text, nullable=True)  # 空间ID，各个空间ID之间使用逗号分隔
    api_key = db.Column(db.String(40), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True, default="")
    status = db.Column(
        db.String(10), nullable=False, server_default=db.text("'active'")
    )
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    expire_date = db.Column(db.Date, nullable=False)  # 过期时间
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(db.DateTime, nullable=False, default=func.now())

    @classmethod
    def create_new(
        cls,
        user_id: str,
        user_name: str,
        tenant_id: str,
        description: str,
        expire_date: date,
    ):
        """创建新的API Key实例。

        Args:
            user_id (str): 用户ID
            user_name (str): 用户名
            tenant_id (str): 空间ID，多个空间ID用逗号分隔
            description (str): API Key的描述信息
            expire_date (date): 过期时间

        Returns:
            ApiKey: 新创建的API Key实例

        Raises:
            Exception: 当数据库操作失败时抛出
        """
        instance = cls()
        instance.user_id = user_id
        instance.user_name = user_name
        instance.tenant_id = tenant_id
        instance.api_key = secrets.token_hex(16)
        instance.description = description
        instance.status = ApiKeyStatus.ACTIVE
        instance.expire_date = expire_date
        instance.created_at = TimeTools.get_china_now()
        instance.updated_at = TimeTools.get_china_now()

        db.session.add(instance)
        db.session.flush()
        db.session.commit()
        return instance
