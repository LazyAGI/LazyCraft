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

import os
import uuid

from sqlalchemy import BigInteger
from sqlalchemy.sql import func

from libs.timetools import TimeTools
from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


class KnowledgeBase(db.Model):
    """知识库数据模型类。

    定义了知识库在数据库中的表结构和相关属性
    """

    __tablename__ = "knowledge_base"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="knowledge_base_pkey"),
        db.Index("knowledge_base_user_idx", "user_id"),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(255), nullable=False)
    user_name = db.Column(db.String(255), nullable=True)
    tenant_id = db.Column(db.String(50), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    path = db.Column(db.String(255), nullable=True, default="")

    @property
    def tags(self):
        """获取知识库的标签列表。

        Returns:
            list: 知识库关联的标签名称列表
        """
        return Tag.get_names_by_target_id(Tag.Types.KNOWLEDGE, self.id)


class FileRecord(db.Model):
    """文件记录数据模型类。

    定义了文件记录在数据库中的表结构和相关属性
    """

    __tablename__ = "file_record"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="file_pkey"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    size = db.Column(BigInteger, nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_md5 = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    user_id = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(db.String(50), nullable=True)
    storage_type = db.Column(db.String(50), nullable=False)  # local or minio
    knowledge_base_id = db.Column(db.String(50), nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)

    file_use_model = db.Column(
        db.String(50), nullable=False, default=""
    )  # model or dataset
    model_id = db.Column(db.String(50), nullable=False, default="")  # model id
    file_dir = db.Column(db.String(50), nullable=False, default="")  # 仅用于model场景

    @classmethod
    def init_as_knowledge(cls, user_id, name, file_path, file_md5):
        """初始化知识库文件记录。

        Args:
            user_id (str): 用户ID
            name (str): 文件名
            file_path (str): 文件路径
            file_md5 (str): 文件MD5值

        Returns:
            FileRecord: 初始化的文件记录实例
        """
        now_str = TimeTools.get_china_now()
        instance = cls(
            name=name,
            size=os.path.getsize(file_path),
            file_path=file_path,
            file_type=os.path.splitext(name)[1],
            file_md5=file_md5,
            created_at=now_str,
            updated_at=now_str,
            user_id=user_id,
            knowledge_base_id="",
            storage_type="local",
            file_use_model="knowledge_base",
            model_id="",
            used=False,
            file_dir="",
        )
        return instance

    @classmethod
    def init_as_models_hub(cls, user_id, name, file_path):
        """初始化模型中心文件记录。

        Args:
            user_id (str): 用户ID
            name (str): 文件名
            file_path (str): 文件路径

        Returns:
            FileRecord: 初始化的文件记录实例
        """
        file_md5 = ""  # 模型文件那么大,干嘛还要计算md5,又不用到!!!
        instance = cls.init_as_knowledge(user_id, name, file_path, file_md5)
        instance.file_use_model = "models_hub"
        instance.file_dir = file_path.split("/")[-2]
        return instance

    @classmethod
    def init_as_other(cls, user_id, name, file_path):
        """初始化其他类型文件记录。

        Args:
            user_id (str): 用户ID
            name (str): 文件名
            file_path (str): 文件路径

        Returns:
            FileRecord: 初始化的文件记录实例
        """
        file_md5 = ""
        instance = cls.init_as_knowledge(user_id, name, file_path, file_md5)
        instance.file_use_model = "other"
        return instance
