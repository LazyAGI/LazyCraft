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

from flask_restful import fields

notification_fields = {
    "id": fields.String,
    "module": fields.String,
    "source_id": fields.String,
    "user_id": fields.String,
    "user_body": fields.String,
    "user_read": fields.Boolean,
    "user_read_time": fields.String,
    "notify_user1_id": fields.String,
    "notify_user1_body": fields.String,
    "notify_user1_read": fields.Boolean,
    "notify_user1_read_time": fields.String,
    "notify_user2_id": fields.String,
    "notify_user2_body": fields.String,
    "notify_user2_read": fields.Boolean,
    "notify_user2_read_time": fields.String,
    "created_at": fields.String,
}


def format_datetime(dt):
    """格式化日期时间。

    将datetime对象格式化为字符串格式。

    Args:
        dt (datetime): 日期时间对象。

    Returns:
        str: 格式化后的日期时间字符串，如果输入为None则返回None。
    """
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None


def notification_to_dict(notification):
    """将通知对象转换为字典格式。

    将UserNotification对象转换为包含所有字段的字典，并格式化日期时间字段。

    Args:
        notification (UserNotification): 通知对象。

    Returns:
        dict: 包含通知所有字段的字典。

    Raises:
        AttributeError: 当通知对象缺少必要属性时抛出异常。
    """
    return {
        "id": notification.id,
        "module": notification.module,
        "source_id": notification.source_id,
        "user_id": notification.user_id,
        "user_body": notification.user_body,
        "user_read": notification.user_read,
        "user_read_time": format_datetime(notification.user_read_time),
        "notify_user1_id": notification.notify_user1_id,
        "notify_user1_body": notification.notify_user1_body,
        "notify_user1_read": notification.notify_user1_read,
        "notify_user1_read_time": format_datetime(notification.notify_user1_read_time),
        "notify_user2_id": notification.notify_user2_id,
        "notify_user2_body": notification.notify_user2_body,
        "notify_user2_read": notification.notify_user2_read,
        "notify_user2_read_time": format_datetime(notification.notify_user2_read_time),
        "created_at": format_datetime(notification.created_at),
    }
