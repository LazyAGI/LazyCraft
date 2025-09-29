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

from sqlalchemy import and_, func, or_

from models.model_account import Account
from parts.app.model import App
from parts.data.model import DataSet
from parts.data.script_model import Script
from parts.knowledge_base.model import KnowledgeBase
from parts.mcp.model import McpServer
from parts.models_hub.model import Lazymodel
from parts.prompt.model import Prompt
from parts.tools.model import Tool
from utils.util_database import db

from .model import Tag, TagBinding


class TagService:
    def __init__(self, account):
        self.user_id = account.id
        self.tenant_id = account.current_tenant_id

    def get_tags(self, tag_type, keyword=None):
        """获取标签列表。

        根据标签类型和可选的关键词获取标签列表，包括绑定数量统计。
        返回当前租户和超级管理员的标签。

        Args:
            tag_type (str): 标签类型。
            keyword (str, optional): 搜索关键词，支持模糊匹配。

        Returns:
            list: 包含标签信息的字典列表，每个字典包含id、name、type、
                  binding_count、is_builtin字段。

        Raises:
            Exception: 当数据库查询失败时抛出。
        """
        super_id = Account.get_administrator_id()
        query = (
            db.session.query(
                Tag.id,
                Tag.type,
                Tag.name,
                Tag.tenant_id,
                func.count(TagBinding.id).label("binding_count"),
            )
            .outerjoin(
                TagBinding,
                and_(Tag.name == TagBinding.name, Tag.type == TagBinding.type),
            )
            .filter(Tag.type == tag_type)
            .filter(or_(Tag.tenant_id == self.tenant_id, Tag.tenant_id == super_id))
        )
        if keyword:
            query = query.filter(db.and_(Tag.name.ilike(f"%{keyword}%")))
        query = query.group_by(Tag.id)
        queryset = query.order_by(Tag.tenant_id, Tag.created_at, Tag.id).all()

        data_list = []
        for m in queryset:
            item = {
                "id": m.id,
                "name": m.name,
                "type": m.type,
                "binding_count": m.binding_count,
                "tenant_id": m.tenant_id,  # 添加租户ID用于排序
            }
            data_list.append(item)

            item["can_delete"] = True
            if m.binding_count > 0:
                item["can_delete"] = False
            else:
                # 不是超管不能删除超管创建的标签 (个人空间的ID 与用户ID 是相同的)
                if self.user_id != super_id and m.tenant_id == super_id:
                    item["can_delete"] = False

        # 确保返回结果顺序稳定：按租户ID、标签ID排序
        data_list.sort(key=lambda x: (x["tenant_id"], x["id"]))

        return data_list

    def create_builtin_tag(self, tag_type, tag_name) -> Tag:
        """创建內建标签"""
        tag_name = tag_name.strip()

        super_id = Account.get_administrator_id()
        maybe_tag = (
            db.session.query(Tag)
            .filter(Tag.type == tag_type)
            .filter(Tag.name == tag_name)
            .first()
        )
        if maybe_tag:
            if maybe_tag.tenant_id == super_id:
                raise ValueError("不可重复创建同名标签")
            else:
                maybe_tag.tenant_id = super_id
                db.session.commit()
                return maybe_tag

        tag = Tag(
            id=str(uuid.uuid4()),
            type=tag_type,
            name=tag_name,
            tenant_id=super_id,
        )
        db.session.add(tag)
        db.session.commit()
        return tag

    def delete_tag(self, tag_type, tag_name):
        """删除內建标签或者普通标签"""

        tag_name = tag_name.strip()

        if (
            db.session.query(TagBinding).filter_by(type=tag_type, name=tag_name).count()
            > 0
        ):
            raise ValueError("该标签已被关联，不可删除")

        db.session.query(Tag).filter_by(
            tenant_id=self.tenant_id, type=tag_type, name=tag_name
        ).delete()
        db.session.commit()

    def update_tag_binding(self, tag_type, target_id, current_tag_names):
        origin_type = tag_type
        target_id = str(target_id)
        current_tag_names = [k.strip() for k in current_tag_names if k.strip()]

        # check if target exists
        self._check_target_exists(origin_type, target_id)

        super_id = Account.get_administrator_id()
        tag_query = (
            db.session.query(Tag)
            .filter(Tag.type == tag_type)
            .filter(or_(Tag.tenant_id == self.tenant_id, Tag.tenant_id == super_id))
        )
        # 可选的tag列表
        choice_tag_names = [k.name for k in tag_query]
        # 已经有的tag列表
        has_tag_names = [
            r.name
            for r in db.session.query(TagBinding).filter_by(
                target_id=target_id, type=origin_type
            )
        ]

        has_updated = False
        del_tag_names = has_tag_names[:]  # 先假设所有的关系都要删除
        new_tag_names = []  # 需要创建的新标签

        for tag_name in current_tag_names:
            # 新的名字需要等待创建
            if tag_name not in choice_tag_names:
                new_tag_names.append(tag_name)
            # 更新待删除的列表
            del_tag_names = [r for r in del_tag_names if r != tag_name]
            # 不存在的关系，需要创建
            if tag_name not in has_tag_names:
                has_updated = True
                new_tag_binding = TagBinding(
                    target_id=target_id,
                    type=origin_type,
                    name=tag_name,
                    tenant_id=self.tenant_id,
                )
                db.session.add(new_tag_binding)

        if new_tag_names:
            has_updated = True
            for tag_name in new_tag_names:
                new_tag = Tag(
                    id=str(uuid.uuid4()),
                    type=tag_type,
                    name=tag_name,
                    tenant_id=self.tenant_id,
                )
                db.session.add(new_tag)

        if del_tag_names:
            has_updated = True
            db.session.query(TagBinding).filter(
                TagBinding.target_id == target_id
            ).filter(TagBinding.type == origin_type).filter(
                TagBinding.name.in_(del_tag_names)
            ).delete()

        if has_updated:
            db.session.commit()

    def _check_target_exists(self, type: str, target_id: str):
        if type == "app":
            name = "应用"
            instance = (
                db.session.query(App)
                .filter_by(id=target_id, tenant_id=self.tenant_id)
                .first()
            )
        elif type == "knowledgebase":
            name = "知识库"
            instance = (
                db.session.query(KnowledgeBase)
                .filter_by(id=target_id, tenant_id=self.tenant_id)
                .first()
            )
        elif type == "tool":
            name = "工具"
            instance = (
                db.session.query(Tool)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        elif type == "model":
            name = "模型"
            instance = (
                db.session.query(Lazymodel)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        elif type == "prompt":
            name = "prompt"
            instance = (
                db.session.query(Prompt)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        elif type == "dataset":
            name = "数据集"
            instance = (
                db.session.query(DataSet)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        elif type == "script":
            name = "脚本"
            instance = (
                db.session.query(Script)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        elif type == "mcp":
            name = "MCP服务"
            instance = (
                db.session.query(McpServer)
                .filter_by(id=int(target_id), tenant_id=self.tenant_id)
                .first()
            )
        else:
            raise ValueError("类型参数错误")

        if not instance:
            raise ValueError(f"{name}不存在")
