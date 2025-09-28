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


class Tag(db.Model):
    """用于标签名管理"""

    __tablename__ = "tags"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="tag_pkey"),
        db.Index("tag_type_idx", "type"),
        db.Index("tag_name_idx", "name"),
    )

    TAG_TYPE_LIST = [
        "knowledgebase",
        "app",
        "model",
        "tool",
        "prompt",
        "dataset",
        "script",
        "mcp",
    ]

    class Types:
        KNOWLEDGE = "knowledgebase"
        APP = "app"
        MODEL = "model"
        TOOL = "tool"
        PROMPT = "prompt"
        DATASET = "dataset"
        SCRIPT = "script"
        MCP = "mcp"

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    type = db.Column(db.String(16), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    @classmethod
    def get_names_by_target_id(cls, tag_type, target_id):
        queryset = (
            db.session.query(TagBinding)
            .filter(
                TagBinding.type == tag_type,
                TagBinding.target_id == str(target_id),
            )
            .all()
        )
        return [k.name for k in queryset]

    @classmethod
    def get_target_ids_by_name(cls, tag_type, name):
        queryset = (
            db.session.query(TagBinding)
            .filter(
                TagBinding.type == tag_type,
                TagBinding.name == name,
            )
            .all()
        )
        return [k.target_id for k in queryset]

    @classmethod
    def get_target_ids_by_names(cls, tag_type, names):
        queryset = (
            db.session.query(TagBinding)
            .filter(
                TagBinding.type == tag_type,
                TagBinding.name.in_(names),
            )
            .all()
        )
        return [k.target_id for k in queryset]

    @classmethod
    def delete_bindings(cls, tag_type, target_id):
        db.session.query(TagBinding).filter(
            TagBinding.type == tag_type,
            TagBinding.target_id == str(target_id),
        ).delete()  # 不提交,交给调用方提交


class TagBinding(db.Model):
    """用于标签关系"""

    __tablename__ = "tag_bindings"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="tag_binding_pkey"),
        db.Index("tag_bind_target_id_idx", "target_id"),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    target_id = db.Column(db.String(40), nullable=False)
    type = db.Column(db.String(16), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class ChoiceTag(db.Model):
    """用于产商标签管理"""

    __tablename__ = "choice_tags"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="choice_tag_pkey"),
        db.Index("choice_tag_type_idx", "type"),
        db.Index("choice_tag_name_idx", "name"),
    )

    TAG_TYPE_LIST = [
        "llm",
        "embedding",
        "reranker",
    ]

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    type = db.Column(db.String(16), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
