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
from utils.util_database import db

from .model import UserNotification


class NotificationService:
    """通知服务类。

    提供通知的创建、查询、更新等业务逻辑操作。
    """

    def __init__(self, account):
        """初始化通知服务。

        Args:
            account: 当前用户账户对象。

        Returns:
            None: 无返回值。
        """
        self.current_user = account

    @staticmethod
    def create_notification(
        module: str,
        source_id: str,
        user_id: str,
        user_body: str = None,
        user_read: bool = None,
        user_read_time: datetime = None,
        notify_user1_id: str = None,
        notify_user1_body: str = None,
        notify_user1_read: bool = None,
        notify_user1_read_time: datetime = None,
        notify_user2_id: str = None,
        notify_user2_body: str = None,
        notify_user2_read: bool = None,
        notify_user2_read_time: datetime = None,
        **extra_fields
    ):
        """创建新的通知。

        创建包含用户通知和审批人通知的完整通知记录。

        Args:
            module (str): 模块名称，如"quota_request"。
            source_id (str): 源对象ID。
            user_id (str): 用户ID。
            user_body (str, optional): 用户通知内容。
            user_read (bool, optional): 用户是否已读。
            user_read_time (datetime, optional): 用户阅读时间。
            notify_user1_id (str, optional): 通知用户1的ID。
            notify_user1_body (str, optional): 通知用户1的内容。
            notify_user1_read (bool, optional): 通知用户1是否已读。
            notify_user1_read_time (datetime, optional): 通知用户1的阅读时间。
            notify_user2_id (str, optional): 通知用户2的ID。
            notify_user2_body (str, optional): 通知用户2的内容。
            notify_user2_read (bool, optional): 通知用户2是否已读。
            notify_user2_read_time (datetime, optional): 通知用户2的阅读时间。
            **extra_fields: 额外的字段参数。

        Returns:
            UserNotification: 创建的通知对象。

        Raises:
            CommonError: 当source_id或user_id为空时，或当相同用户和来源ID的通知已存在时。
        """
        # 检查必填字段
        if not source_id or not user_id:
            raise CommonError("source_id和user_id不能为空")

        if UserNotification.query.filter(
            and_(
                UserNotification.source_id == source_id,
                UserNotification.user_id == user_id,
            )
        ).first():  # 检查是否已存在相同source_id的通知
            raise CommonError("相同用户和来源ID的通知已存在")

        notification = UserNotification(
            module=module,
            source_id=source_id,
            user_id=user_id,
            user_body=user_body,
            user_read=user_read,
            user_read_time=user_read_time,
            notify_user1_id=notify_user1_id,
            notify_user1_body=notify_user1_body,
            notify_user1_read=notify_user1_read,
            notify_user1_read_time=notify_user1_read_time,
            notify_user2_id=notify_user2_id,
            notify_user2_body=notify_user2_body,
            notify_user2_read=notify_user2_read,
            notify_user2_read_time=notify_user2_read_time,
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def update_user_notification(user_id, source_id, source_type, user_body):
        """更新用户通知内容。

        根据用户ID、来源ID和来源类型更新用户通知的消息体内容。

        Args:
            user_id (str): 用户ID。
            source_id (str): 来源ID。
            source_type (str): 来源类型。
            user_body (str): 新的用户通知内容。

        Returns:
            UserNotification: 更新后的通知对象。

        Raises:
            CommonError: 当未找到对应的通知记录时。
        """
        notification = UserNotification.query.filter_by(
            user_id=user_id, source_id=source_id, module=source_type
        ).first()
        if not notification:
            raise CommonError("未找到对应的通知记录")
        notification.user_body = user_body
        notification.notify_user1_read = True
        notification.notify_user1_read_time = TimeTools.now_datetime_china()
        db.session.commit()
        return notification

    def get_notifications(
        self,
        page=1,
        page_size=100,
        user_id=None,
        user_read=None,
        notify_user1_id=None,
        notify_user1_read=None,
        created_at_start=None,
        created_at_end=None,
        **filters
    ):
        """获取通知列表。

        支持分页、过滤和时间区间查询的通知列表。

        Args:
            page (int, optional): 页码，默认为1。
            page_size (int, optional): 每页数量，默认为100。
            user_id (str, optional): 用户ID过滤。
            user_read (bool, optional): 用户是否已读过滤。
            notify_user1_id (str, optional): 通知用户1的ID过滤。
            notify_user1_read (bool, optional): 通知用户1是否已读过滤。
            created_at_start (str, optional): 创建时间开始过滤。
            created_at_end (str, optional): 创建时间结束过滤。
            **filters: 其他字段的等值过滤条件。

        Returns:
            dict: 包含通知列表和分页信息的字典。

        Raises:
            ValueError: 当时间区间过滤参数格式错误时。
        """

        query = UserNotification.query
        if user_id is not None:
            query = query.filter(UserNotification.user_id == user_id)
        if user_read is not None:
            query = query.filter(UserNotification.user_read == user_read)
        if notify_user1_id is not None:
            query = query.filter(UserNotification.notify_user1_id == notify_user1_id)
        if notify_user1_read is not None:
            query = query.filter(
                UserNotification.notify_user1_read == notify_user1_read
            )

        # 字段等值过滤
        for field, value in filters.items():
            if value is not None and hasattr(UserNotification, field):
                query = query.filter(getattr(UserNotification, field) == value)

        # 时间区间过滤
        if created_at_start:
            try:
                dt_start = datetime.strptime(created_at_start, "%Y-%m-%d %H:%M:%S")
                query = query.filter(UserNotification.created_at >= dt_start)
            except Exception:
                raise ValueError("时间区间开始时间过滤参数错误")

        if created_at_end:
            try:
                dt_end = datetime.strptime(created_at_end, "%Y-%m-%d %H:%M:%S")
                query = query.filter(UserNotification.created_at <= dt_end)
            except Exception:
                raise ValueError("时间区间开始时间过滤参数错误")

        # if self.current_user.is_admin:
        #     query = query.filter(UserNotification.notify_user1_body != '')
        # else:
        #     query = query.filter(UserNotification.user_body != '')

        total = query.count()
        items = (
            query.order_by(UserNotification.created_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
            .all()
        )
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }

    def inter_mark_as_read(self, source_id, user_id, module):
        """内部标记通知为已读。

        根据来源ID、用户ID和模块标记通知为已读状态。

        Args:
            source_id (str): 来源ID。
            user_id (str): 用户ID。
            module (str): 模块名称。

        Returns:
            None: 无返回值。

        Raises:
            CommonError: 当无权限更新其他用户通知信息时。
            ValueError: 当消息不存在时。
        """
        if not self.current_user or self.current_user.id != user_id:
            raise CommonError("无权限更新其它人通知信息状态")
        notification = UserNotification.query.filter(
            and_(
                UserNotification.source_id == source_id,
                UserNotification.user_id == user_id,
                UserNotification.module == module,
            )
        ).first()
        if not notification:
            raise ValueError("消息不存在")
        if user_id and notification.user_read is False:
            notification.user_read = True
            notification.user_read_time = TimeTools.now_datetime_china()
            db.session.commit()

    def mark_as_read(
        self, notification_id, user_id=None, notify_user1_id=None, notify_user2_id=None
    ):
        """标记通知为已读。

        根据通知ID和用户ID将通知标记为已读状态。

        Args:
            notification_id (str): 通知ID。
            user_id (str, optional): 用户ID。
            notify_user1_id (str, optional): 通知用户1的ID。
            notify_user2_id (str, optional): 通知用户2的ID。

        Returns:
            UserNotification: 更新后的通知对象。

        Raises:
            ValueError: 当消息不存在时。
            CommonError: 当无权限更新其他用户通知信息时。
        """
        notification = UserNotification.query.get(notification_id)
        if not notification:
            raise ValueError("消息不存在")
        now = TimeTools.now_datetime_china()
        updated = False

        if user_id and notification.user_read is False:
            if not self.current_user or self.current_user.id != user_id:
                raise CommonError("无权限更新其它人通知信息状态")
            notification.user_read = True
            notification.user_read_time = now
            updated = True
        if notify_user1_id and notification.notify_user1_read is False:
            if not self.current_user or self.current_user.id != notify_user1_id:
                raise CommonError("无权限更新其它人通知信息状态")
            notification.notify_user1_read = True
            notification.notify_user1_read_time = now
            updated = True
        if notify_user2_id and notification.notify_user2_read is False:
            if not self.current_user or self.current_user.id != notify_user2_id:
                raise CommonError("无权限更新其它人通知信息状态")
            notification.notify_user2_read = True
            notification.notify_user2_read_time = now
            updated = True

        if updated:
            db.session.commit()
        return notification

    def get_notification_detail(self, notification_id):
        """获取通知详情。

        根据通知ID获取通知的详细信息。

        Args:
            notification_id (str): 通知ID。

        Returns:
            UserNotification: 通知对象。

        Raises:
            ValueError: 当消息不存在时。
        """
        notification = UserNotification.query.get(notification_id)
        if not notification:
            raise ValueError("消息不存在")
        return notification
