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

from flask import request
from flask_login import current_user
from flask_restful import Resource, reqparse

from libs.login import login_required
from parts.urls import api

from .fields import notification_to_dict
from .service import NotificationService


class NotificationCreateApi(Resource):
    """通知创建API。

    创建新的通知，支持多用户通知场景。
    """

    @login_required
    def post(self):
        """创建新的通知。

        创建包含用户通知和审批人通知的完整通知记录。

        Args:
            module (str): 模块名称，如"quota_request"。
            source_id (str): 源对象ID。
            user_id (str): 用户ID。
            user_body (str): 用户通知内容。
            user_read (bool): 用户是否已读。
            user_read_time (str): 用户阅读时间。
            notify_user1_id (str): 通知用户1的ID。
            notify_user1_body (str): 通知用户1的内容。
            notify_user1_read (bool): 通知用户1是否已读。
            notify_user1_read_time (str): 通知用户1的阅读时间。
            notify_user2_id (str, optional): 通知用户2的ID。
            notify_user2_body (str, optional): 通知用户2的内容。
            notify_user2_read (bool, optional): 通知用户2是否已读。
            notify_user2_read_time (str, optional): 通知用户2的阅读时间。
            created_at (str): 创建时间。

        Returns:
            dict: 创建的通知信息字典。

        Raises:
            ValueError: 当必需参数缺失时。
            Exception: 当创建通知失败时。
        """
        data = request.get_json()
        notification = NotificationService.create_notification(**data)
        return notification_to_dict(notification)


class NotificationListApi(Resource):
    """通知列表API。

    支持分页、过滤和时间区间查询的通知列表。
    """

    @login_required
    def post(self):
        """获取通知列表。

        支持分页、所有字段过滤、时间区间过滤的消息列表查询。

        Args:
            page (int, optional): 页码，默认为1。
            page_size (int, optional): 每页数量，默认为100。
            created_at_start (str, optional): 创建时间开始。
            created_at_end (str, optional): 创建时间结束。
            user_read (bool, optional): 用户是否已读过滤。
            **filters: 其他过滤条件。

        Returns:
            dict: 包含通知列表和分页信息的字典。

        Raises:
            Exception: 当查询失败时。
        """
        data = request.get_json() or {}
        user_id = None
        user_read = False
        notify_user1_id = None
        notify_user1_read = False

        user_id = current_user.id
        user_read = data.get("user_read", False)

        page = data.get("page", 1)
        page_size = data.get("page_size", 100)
        filters = {
            k: v
            for k, v in data.items()
            if k
            not in [
                "page",
                "page_size",
                "created_at_start",
                "created_at_end",
                "user_id",
                "user_read",
                "notify_user1_id",
                "notify_user1_read",
            ]
        }
        created_at_start = data.get("created_at_start")
        created_at_end = data.get("created_at_end")
        result = NotificationService(current_user).get_notifications(
            page=page,
            page_size=page_size,
            user_id=user_id,
            user_read=user_read,
            notify_user1_id=notify_user1_id,
            notify_user1_read=notify_user1_read,
            created_at_start=created_at_start,
            created_at_end=created_at_end,
            **filters
        )
        result["items"] = [notification_to_dict(item) for item in result["items"]]
        return result


class NotificationReadApi(Resource):
    """通知已读API。

    将指定通知标记为已读。
    """

    @login_required
    def post(self):
        """标记通知为已读。

        通过通知ID和用户ID将通知标记为已读。

        Args:
            notification_id (str): 通知ID。

        Returns:
            dict: 更新后的通知信息字典。

        Raises:
            ValueError: 当通知ID为空时。
            Exception: 当标记已读失败时。
        """
        data = request.get_json()
        notification_id = data.get("notification_id")
        if not notification_id:
            raise ValueError("通知ID不能为空")
        user_id = None
        notify_user1_id = None
        notify_user2_id = None

        user_id = current_user.id
        notification = NotificationService(current_user).mark_as_read(
            notification_id, user_id, notify_user1_id, notify_user2_id
        )
        return notification_to_dict(notification)


class NotificationDetailApi(Resource):
    """通知详情API。

    获取单条通知的详细信息。
    """

    @login_required
    def get(self):
        """获取通知详情。

        获取指定通知的详细信息。

        Args:
            notification_id (str): 通知ID，通过查询参数传递。

        Returns:
            dict: 通知详细信息字典。

        Raises:
            ValueError: 当通知ID缺失或无权限查看时。
            Exception: 当获取通知详情失败时。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("notification_id", type=str, required=True, location="args")
        args = parser.parse_args()
        notification = NotificationService(current_user).get_notification_detail(
            args["notification_id"]
        )
        if not current_user.is_admin and notification.user_id != current_user.id:
            raise ValueError("无权限查看其它人通知信息")

        return notification_to_dict(notification)


# 路由注册示例（需在api对象中注册）
api.add_resource(NotificationCreateApi, "/notifications/create")
api.add_resource(NotificationListApi, "/notifications/list")
api.add_resource(NotificationReadApi, "/notifications/read")
api.add_resource(NotificationDetailApi, "/notifications/detail")
