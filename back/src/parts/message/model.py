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

import uuid

from sqlalchemy.sql import func

from models import StringUUID
from utils.util_database import db


class NotificationModule:
    """通知模块常量类。

    定义系统中各种通知模块的常量标识。
    """

    QUOTA_REQUEST = "quota_request"


class UserNotification(db.Model):
    """用户通知模型。

    对应数据库中的user_notifications表，用于存储用户通知信息。

    Attributes:
        id (str): 通知ID，主键。
        module (str): 消息所属模块。
        source_id (str): 来源ID。
        user_id (str): 用户ID。
        user_body (str): 用户回执消息体。
        user_read (bool): 用户是否已读回执消息。
        user_read_time (datetime): 用户已读回执时间。
        notify_user1_id (str): 通知人1的ID。
        notify_user1_body (str): 通知人1消息体。
        notify_user1_read (bool): 通知人1是否已读。
        notify_user1_read_time (datetime): 通知人1已读时间。
        notify_user2_id (str): 通知人2的ID。
        notify_user2_body (str): 通知人2消息体。
        notify_user2_read (bool): 通知人2是否已读。
        notify_user2_read_time (datetime): 通知人2已读时间。
        created_at (datetime): 创建时间。
    """

    __tablename__ = "user_notifications"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="user_notifications_pkey"),)

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    module = db.Column(db.String(64), nullable=False, comment="消息所属模块")
    source_id = db.Column(db.String(64), nullable=True, comment="来源id")
    user_id = db.Column(db.String(36), nullable=True, comment="用户id")
    user_body = db.Column(db.Text, nullable=True, comment="用户回执消息体")
    user_read = db.Column(db.Boolean, default=False, comment="用户是否已读回执消息")
    user_read_time = db.Column(db.DateTime, nullable=True, comment="用户已读回执时间")
    notify_user1_id = db.Column(db.String(36), nullable=True, comment="通知人1id")
    notify_user1_body = db.Column(db.Text, nullable=True, comment="通知人1消息体")
    notify_user1_read = db.Column(db.Boolean, default=False, comment="通知人1是否已读")
    notify_user1_read_time = db.Column(
        db.DateTime, nullable=True, comment="通知人1已读时间"
    )
    notify_user2_id = db.Column(db.String(36), nullable=True, comment="通知人2id")
    notify_user2_body = db.Column(db.Text, nullable=True, comment="通知人2消息体")
    notify_user2_read = db.Column(db.Boolean, default=False, comment="通知人2是否已读")
    notify_user2_read_time = db.Column(
        db.DateTime, nullable=True, comment="通知人2已读时间"
    )
    created_at = db.Column(db.DateTime, default=func.now(), comment="创建时间")
