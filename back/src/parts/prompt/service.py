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


from flask_login import current_user
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from libs.timetools import TimeTools
from models.model_account import Account
from parts.logs.enums import Action, Module
from parts.logs.service import LogService
from parts.tag.model import Tag
from utils.util_database import db

from .model import Prompt  # 移除PromptTemplate导入


def check_prompt(name):
    """检查提示信息名称是否已存在。

    在当前用户的租户中检查指定名称的提示信息是否已经存在。

    Args:
        name (str): 要检查的提示信息名称。

    Returns:
        None

    Raises:
        ValueError: 当名称已存在时抛出。
    """
    # 检查是否存在相同的 name
    existing_template = (
        Prompt.query.filter_by(name=name)
        .filter_by(tenant_id=current_user.current_tenant_id)
        .first()
    )
    if existing_template:
        raise ValueError(f"名称：'{name}'已存在")


class PromptService:
    @staticmethod
    def create_prompt(args):
        """创建新的提示信息。

        根据传入的参数创建一个新的提示信息实例并保存到数据库，
        同时记录操作日志。

        Args:
            args (dict): 包含提示信息参数的字典，包含以下字段：
                - name (str): 提示信息名称
                - describe (str, optional): 提示信息描述
                - content (str): 提示信息内容
                - category (str, optional): 提示信息分类

        Returns:
            int: 新创建的提示信息的ID。

        Raises:
            ValueError: 当名称已存在时抛出。
            IntegrityError: 当数据库操作失败时抛出。
        """
        check_prompt(args["name"])
        new = Prompt(
            name=args["name"],
            describe=args.get("describe", ""),
            content=args["content"],
            category=args["category"],
            tenant_id=current_user.current_tenant_id,
            user_id=current_user.id,
        )
        db.session.add(new)
        db.session.commit()
        # 记录操作日志
        LogService().add(
            Module.PROMPT_MANAGEMENT,
            Action.CREATE_PROMPT,
            prompt_name=args["name"],
            prompt_describe=args["describe"],
        )
        return new.id

    @staticmethod
    def get_prompt(id):
        prompt = Prompt.query.get_or_404(id)
        if prompt:
            prompt.is_builtin = prompt.user_id == Account.get_administrator_id()
        return prompt

    @staticmethod
    def update_prompt(p, data):
        # p = Prompt.query.get(id)
        if p:
            oldcontent = p.content
            olddescribe = p.describe
            p.name = data.get("name", p.name)
            p.describe = data.get("describe", p.describe)
            p.content = data.get("content", p.content)
            p.category = data.get("category", p.category)
            p.updated_at = TimeTools.get_china_now()
            try:
                db.session.commit()
                # 记录操作日志
                if oldcontent != p.content:
                    LogService().add(
                        Module.PROMPT_MANAGEMENT,
                        Action.EDIT_PROMPT_CONTENT,
                        name=p.name,
                        content=p.content,
                    )
                if olddescribe != p.describe:
                    # 记录操作日志
                    LogService().add(
                        Module.PROMPT_MANAGEMENT,
                        Action.EDIT_PROMPT_DESCRIBE,
                        name=p.name,
                        describe=p.describe,
                    )
            except IntegrityError:
                db.session.rollback()
                raise ValueError(f"名称：'{data.get('name', p.name)}' 已存在")
            return True
        return False

    @staticmethod
    def delete_prompt(p):
        if p:
            Tag.delete_bindings(Tag.Types.PROMPT, p.id)
            db.session.delete(p)
            db.session.commit()
            LogService().add(
                Module.PROMPT_MANAGEMENT, Action.DELETE_PROMPT, pname=p.name
            )
            return True
        return False

    @staticmethod
    def list_prompt(page, per_page, qtype, search_tags, search_name, user_id):
        filters = []
        get_creator = False
        if search_tags:
            target_ids = Tag.get_target_ids_by_names(Tag.Types.PROMPT, search_tags)
            target_ids = [int(k) for k in target_ids]
            filters.append(Prompt.id.in_(target_ids))

        if user_id:
            filters.append(Prompt.user_id.in_(user_id))

        if search_name:
            filters.append(
                or_(
                    Prompt.name.ilike(f"%{search_name}%"),
                    Prompt.describe.ilike(f"%{search_name}%"),
                )
            )

        if qtype == "mine":  # 我的prompt
            filters.append(Prompt.tenant_id == current_user.current_tenant_id)
            filters.append(Prompt.user_id == current_user.id)
        elif qtype == "group":  # 同组prompt
            get_creator = True
            filters.append(Prompt.tenant_id == current_user.current_tenant_id)
            filters.append(Prompt.user_id != current_user.id)
        elif qtype == "builtin":  # 内置的prompt
            filters.append(Prompt.user_id == Account.get_administrator_id())
        elif qtype == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    Prompt.tenant_id == current_user.current_tenant_id,
                    Prompt.user_id == Account.get_administrator_id(),
                )
            )
        query = Prompt.query.filter(*filters).order_by(Prompt.created_at.desc())
        if page is None or per_page is None:
            # 如果没有分页参数，返回所有数据
            prompts = query.all()
            pagination_info = {
                "total": len(prompts),
                "pages": 1,
                "current_page": 1,
                "next_page": None,
                "prev_page": None,
            }
        else:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            prompts = pagination.items
            pagination_info = {
                "total": pagination.total,
                "pages": pagination.pages,
                "current_page": pagination.page,
                "next_page": pagination.next_num,
                "prev_page": pagination.prev_num,
            }
        result = []
        for prompt in prompts:
            creator = None
            if get_creator == True:
                creator = prompt.creator

            user_name = ""
            if prompt.user_id and prompt.user_id == Account.get_administrator_id():
                user_name = "Lazy LLM官方"
            else:
                user_name = getattr(db.session.get(Account, prompt.user_id), "name", "")

            result.append(
                {
                    "id": prompt.id,
                    "name": prompt.name,
                    "describe": prompt.describe,
                    "content": prompt.content,
                    "category": prompt.category,
                    "creator": creator,
                    "tags": prompt.tags,
                    "created_at": prompt.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "updated_at": prompt.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "user_id": prompt.user_id,
                    "user_name": user_name,
                }
            )
        return result, pagination_info
