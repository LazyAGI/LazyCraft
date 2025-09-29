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

from enum import Enum

from sqlalchemy.sql import func

from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


class ScriptUploadStatus(Enum):
    upload_start = 1
    upload_ing = 2
    upload_success = 3
    upload_failed = 4


class ScriptType(Enum):
    data_cleaning = "clean"  # 数据过滤
    data_enhancement = "augment"  # 数据增强
    data_denoising = "denoise"  # 数据去噪
    data_annotation = "annotate"  # 数据标注
    other = "other"  # 其他类型脚本


class Script(db.Model):
    """脚本模型，用于存储数据处理脚本的信息。

    Attributes:
        id (int): 脚本的唯一标识符。
        name (str): 脚本名称。
        description (str, optional): 脚本描述。
        icon (str): 脚本图标。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        user_id (str): 用户ID。
        tenant_id (str, optional): 租户ID。
        user_name (str): 用户名。
        script_url (str): 脚本URL地址。
        script_type (str): 脚本类型，如数据清洗、数据增强等。
        data_type (str): 数据类型，如文本类。
        upload_status (str): 上传状态。
    """

    __tablename__ = "script_model"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="script_model_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    user_id = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(StringUUID, nullable=True)
    user_name = db.Column(db.String(50), nullable=False)  # 用户名
    script_url = db.Column(db.String(255), nullable=False)
    script_type = db.Column(db.String(50), nullable=False)  # 清洗数据 数据增强
    data_type = db.Column(db.String(50), nullable=False)  # 文本类
    upload_status = db.Column(db.String(50), nullable=False)  # 上传状态

    @property
    def tags(self):
        """获取脚本的标签列表。

        Returns:
            list: 脚本关联的标签名称列表。
        """
        return Tag.get_names_by_target_id(Tag.Types.SCRIPT, self.id)
