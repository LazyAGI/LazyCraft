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

from sqlalchemy import and_, or_

from libs.filetools import FileTools
from libs.timetools import TimeTools
from models.model_account import Account
from parts.app.model import App, WorkflowRefer
from parts.tag.model import Tag
from utils.util_database import db

from .model import KnowledgeBase as kb


class KnowledgeBaseService:
    """知识库服务类。

    提供知识库的增删改查、分页查询等业务逻辑处理
    """

    def __init__(self, account):
        """初始化知识库服务。

        Args:
            account: 当前用户账户对象
        """
        # 传入account的好处, 是后续如果业务改为需要租户ID, 不需要再修改大量函数入参
        self.user_id = account.id
        self.tenant_id = account.current_tenant_id
        self.user_name = account.name

    def get_pagination(self, data):
        """获取知识库分页列表。

        Args:
            data (dict): 查询参数，包含 page、page_size、search_tags、user_id、search_name、qtype 等

        Returns:
            Pagination: 分页对象，包含知识库列表和分页信息
        """
        filters = []
        if data.get("search_tags"):
            target_ids = Tag.get_target_ids_by_names(
                Tag.Types.KNOWLEDGE, data["search_tags"]
            )
            filters.append(kb.id.in_(target_ids))

        if data.get("user_id"):
            filters.append(kb.user_id.in_(data["user_id"]))

        if data.get("search_name"):
            search_name = data["search_name"]
            filters.append(
                or_(
                    kb.name.ilike(f"%{search_name}%"),
                    kb.description.ilike(f"%{search_name}%"),
                )
            )

        if data.get("qtype") == "mine":  # 我的知识库
            filters.append(kb.tenant_id == self.tenant_id)
            filters.append(kb.user_id == self.user_id)
        elif data.get("qtype") == "group":  # 同组知识库
            filters.append(
                and_(kb.tenant_id == self.tenant_id, kb.user_id != self.user_id)
            )
        elif data.get("qtype") == "builtin":  # 内置知识库
            filters.append(kb.user_id == Account.get_administrator_id())
        elif data.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    kb.tenant_id == self.tenant_id,
                    kb.user_id == Account.get_administrator_id(),
                )
            )
        pagination = db.paginate(
            db.select(kb).where(*filters).order_by(kb.created_at.desc()),
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

        kb_ids = [str(tool.id) for tool in pagination.items]
        ref_res = self.get_apps_references(kb_ids)
        for i in pagination.items:
            if i.user_id and i.user_id == Account.get_administrator_id():
                i.user_name = "Lazy LLM官方"

            kb_id = i.id
            ref_list = ref_res.get(str(kb_id), [])
            i.ref_status = True if ref_list else False

        return pagination

    def get_by_id(self, id):
        """根据ID获取知识库。

        Args:
            id (str): 知识库ID

        Returns:
            KnowledgeBase: 知识库对象

        Raises:
            ValueError: 当知识库不存在时抛出异常
        """
        knowledge = kb.query.filter_by(id=id).first()
        if not knowledge:
            raise ValueError(f"当前知识库: {id} 不存在")
        return knowledge

    def create(self, data):
        """创建新知识库。

        Args:
            data (dict): 知识库数据，包含 name、description 等字段

        Returns:
            KnowledgeBase: 创建的知识库对象

        Raises:
            ValueError: 当知识库名称已存在时抛出异常
        """
        user_id = self.user_id
        kb_name = data["name"]

        if kb.query.filter_by(name=kb_name, tenant_id=self.tenant_id).first():
            raise ValueError(f"当前知识库: {kb_name} 已经存在")

        kb_path = FileTools.create_knowledge_storage(user_id, kb_name)
        now_str = TimeTools.get_china_now()

        knowledge = kb(
            **data, user_id=user_id, tenant_id=self.tenant_id, user_name=self.user_name
        )
        knowledge.created_at = now_str
        knowledge.updated_at = now_str
        knowledge.path = kb_path
        db.session.add(knowledge)
        db.session.flush()
        db.session.commit()
        return knowledge

    def update(self, data):
        """更新知识库信息。

        Args:
            data (dict): 更新的知识库数据，包含 id、name、description 等字段

        Returns:
            KnowledgeBase: 更新后的知识库对象

        Raises:
            ValueError: 当知识库名称已存在时抛出异常
        """
        knowledge = self.get_by_id(data["id"])

        if data.get("name"):
            kb_name = data["name"]
            knowledge.name = kb_name
            if kb.query.filter(
                kb.name == kb_name, kb.id != data["id"], kb.tenant_id == self.tenant_id
            ).first():
                raise ValueError(f"当前知识库名称: {kb_name} 已经存在")

        knowledge.description = data.get("description") or ""
        knowledge.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return knowledge

    def delete(self, id):
        """删除知识库。

        Args:
            id (str): 知识库ID

        Returns:
            str: 被删除的知识库名称
        """
        knowledge = self.get_by_id(id)
        name = knowledge.name
        Tag.delete_bindings(Tag.Types.KNOWLEDGE, id)
        db.session.delete(knowledge)
        db.session.commit()
        return name

    def get_apps_references(self, kb_ids):
        ref_apps = (
            db.session.query(App.id, App.name, App.is_public, WorkflowRefer.target_id)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id.in_(kb_ids),
                WorkflowRefer.target_type == "document",
            )
            .all()
        )

        ref_res = {}
        for item in ref_apps:
            if item.target_id not in ref_res:
                ref_res[item.target_id] = [item]
            else:
                ref_res[item.target_id].append(item)

        return ref_res

    def get_ref_apps(self, kb_id):
        using_apps = (
            db.session.query(App.id, App.name, App.is_public)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id == str(kb_id),
                WorkflowRefer.target_type == "document",
            )
            .all()
        )

        return using_apps
