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

from datetime import datetime

from sqlalchemy import and_

from libs.http_exception import CommonError
from libs.timetools import TimeTools
from parts.apikey.model import ApiKey, ApiKeyStatus
from utils.util_database import db


class ApikeyService:
    @staticmethod
    def create_new(
        user_id: str, user_name: str, tenant_id: str, description: str, expire_date: str
    ):
        """创建新的API Key。

        Args:
            user_id (str): 用户ID
            user_name (str): 用户名
            tenant_id (str): 空间ID，多个空间ID用逗号分隔
            description (str): API Key的描述信息
            expire_date (str): 过期时间，格式为YYYY-MM-DD

        Returns:
            ApiKey: 新创建的API Key实例

        Raises:
            CommonError: 当用户已有10个API Key、过期时间格式错误或过期时间早于今天时抛出
        """
        apikey_list = ApiKey.query.filter_by(
            user_id=user_id, status=ApiKeyStatus.ACTIVE
        ).all()
        if apikey_list and len(apikey_list) >= 10:
            raise CommonError("每个用户最多只能创建10个有效的API Key")
        if expire_date is None:
            raise CommonError("参数过期时间不能为空")
        try:
            date_obj = datetime.strptime(expire_date, "%Y-%m-%d").date()
        except ValueError:
            raise CommonError("过期时间格式错误，应为YYYY-MM-DD格式")
        if date_obj < datetime.now().date():
            raise CommonError("过期时间不能早于今天")
        instance = ApiKey.create_new(
            user_id, user_name, tenant_id, description, date_obj
        )
        return instance

    @staticmethod
    def check_api_key(api_key: str):
        """验证API Key的有效性。

        Args:
            api_key (str): 要验证的API Key

        Returns:
            ApiKey: 有效的API Key实例

        Raises:
            CommonError: 当API Key不存在或已过期时抛出
        """
        item = ApiKey.query.filter_by(
            api_key=api_key, status=ApiKeyStatus.ACTIVE
        ).first()
        if item is None:
            raise CommonError("API Key不存在")
        if item.expire_date < datetime.now().date():
            raise CommonError("API Key已过期")
        return item

    @staticmethod
    def query(user_id: str):
        """查询用户的所有API Key。

        Args:
            user_id (str): 用户ID

        Returns:
            list: 用户的API Key列表，按更新时间倒序排列

        Raises:
            CommonError: 当查询失败时抛出
        """
        apikey_list = (
            ApiKey.query.filter(
                and_(ApiKey.user_id == user_id, ApiKey.status != ApiKeyStatus.DELETED)
            )
            .order_by(ApiKey.updated_at.desc())
            .all()
        )
        if apikey_list is None:
            apikey_list = []
        for item in apikey_list:
            if (
                item.expire_date < datetime.now().date()
                and item.status == ApiKeyStatus.ACTIVE
            ):
                item.status = ApiKeyStatus.EXPIRED
                item.updated_at = TimeTools.get_china_now()
                db.session.commit()

        return apikey_list

    @staticmethod
    def delete_api_key(id: int, user_id: str):
        """删除指定的API Key。

        Args:
            id (int): 要删除的API Key的ID
            user_id (str): 用户ID，用于验证权限

        Returns:
            ApiKey: 被删除的API Key实例

        Raises:
            CommonError: 当API Key不存在、不属于当前用户或已被删除时抛出
        """
        item = ApiKey.query.get(id)
        if item is None:
            raise CommonError("API Key不存在")
        if item.user_id != user_id:
            raise CommonError("API Key不属于当前用户")
        if item.status == ApiKeyStatus.DELETED:
            raise CommonError("API Key已被删除")
        item.status = ApiKeyStatus.DELETED
        item.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return item

    @staticmethod
    def update_status(id: int, user_id: str, new_status: str):
        """更新API Key的状态。

        Args:
            id (int): 要更新的API Key的ID
            user_id (str): 用户ID，用于验证权限
            new_status (str): 新的状态

        Returns:
            ApiKey: 更新后的API Key实例

        Raises:
            CommonError: 当API Key不存在、不属于当前用户或状态转换不允许时抛出
        """
        item = ApiKey.query.get(id)
        if item is None:
            raise CommonError("API Key不存在")
        if item.user_id != user_id:
            raise CommonError("API Key不属于当前用户")
        # 判断apikey的有效期是否过期
        if item.expire_date < datetime.now().date():
            raise CommonError("API Key已过期，不允许启用")
        current_status = item.status
        allowed_transitions = {
            ApiKeyStatus.ACTIVE: [ApiKeyStatus.DISABLED, ApiKeyStatus.DELETED],
            ApiKeyStatus.DISABLED: [ApiKeyStatus.ACTIVE, ApiKeyStatus.DELETED],
            ApiKeyStatus.EXPIRED: [ApiKeyStatus.DELETED],
        }
        if (
            current_status not in allowed_transitions
            or new_status not in allowed_transitions[current_status]
        ):
            raise CommonError(f"不允许从{current_status}更改为{new_status}")
        if new_status == ApiKeyStatus.ACTIVE:
            apikey_list = ApiKey.query.filter_by(
                user_id=user_id, status=ApiKeyStatus.ACTIVE
            ).all()
            if apikey_list and len(apikey_list) >= 10:
                raise CommonError("每个用户最多只能拥有10个有效的API Key")
        item.status = new_status
        item.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return item
