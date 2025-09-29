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

import logging
import os

from sqlalchemy import and_, desc, or_

from libs.filetools import FileTools
from libs.timetools import TimeTools
from models.model_account import Account
from parts.knowledge_base.model import FileRecord
from parts.tag.model import Tag
from utils.util_database import db

from .script_model import Script, ScriptUploadStatus


class ScriptService:
    """脚本服务类，提供脚本的增删改查功能。

    Attributes:
        user_id (str): 用户ID。
        user_name (str): 用户名。
        tenant_id (str): 租户ID。
    """

    def __init__(self, account):
        """初始化脚本服务。

        Args:
            account (Account): 用户账户对象，包含用户ID、用户名和租户ID信息。
        """
        # 传入account的好处, 是后续如果业务改为需要租户ID, 不需要再修改大量函数入参
        self.user_id = account.id
        self.user_name = account.name
        self.tenant_id = account.current_tenant_id

    def create_script(self, data):
        """创建新的脚本。

        Args:
            data (dict): 脚本数据，包含以下字段：
                - name (str): 脚本名称。
                - description (str, optional): 脚本描述。
                - icon (str, optional): 脚本图标。
                - script_url (str, optional): 脚本URL。
                - script_type (str, optional): 脚本类型。
                - data_type (str, optional): 数据类型。

        Returns:
            Script: 创建的脚本实例。

        Raises:
            ValueError: 当工作空间中已存在同名脚本时抛出异常。
        """
        if Script.query.filter_by(name=data["name"], tenant_id=self.tenant_id).first():
            raise ValueError(f"工作空间已经存在名称为：{data['name']}的脚本")
        now_str = TimeTools.get_china_now()

        script_instance = Script(
            name=data["name"],
            description=data.get("description"),
            user_id=self.user_id,
            tenant_id=self.tenant_id,
            created_at=now_str,
            updated_at=now_str,
            icon=data.get("icon"),
            user_name=self.user_name,
            script_url=data.get("script_url"),
            script_type=data.get("script_type"),
            data_type=data.get("data_type"),
            upload_status=ScriptUploadStatus.upload_success.value,
        )
        db.session.add(script_instance)
        db.session.commit()
        return script_instance

    def get_script_by_account(self, data):
        """根据账户信息获取脚本列表，支持分页和多种过滤条件。

        Args:
            data (dict): 查询参数，包含以下字段：
                - script_type (list, optional): 脚本类型列表。
                - search_tags (list, optional): 搜索标签列表。
                - name (str, optional): 脚本名称。
                - search_name (str, optional): 搜索名称。
                - user_id (list, optional): 用户ID列表。
                - qtype (str, optional): 查询类型，支持 "mine"、"group"、"builtin"、"already"。
                - page (int): 页码。
                - page_size (int): 每页大小。

        Returns:
            Pagination: 分页结果对象，包含脚本列表和分页信息。
        """
        query = Script.query
        filters = []

        if data.get("script_type"):
            filters.append(Script.script_type.in_(data.get("script_type")))

        if data.get("search_tags"):  # 需求上暂时没有要求, 不过不影响先加上这个搜索逻辑
            target_ids = Tag.get_target_ids_by_names(
                Tag.Types.SCRIPT, data["search_tags"]
            )
            filters.append(Script.id.in_(target_ids))

        if data.get("name") or data.get("search_name"):
            search_name = data.get("name") or data.get("search_name")
            filters.append(
                or_(
                    Script.name.ilike(f"%{search_name}%"),
                    Script.description.ilike(f"%{search_name}%"),
                )
            )
        if data.get("user_id"):
            filters.append(Script.user_id.in_(data.get("user_id")))

        if data.get("qtype") == "mine":  # 我的应用(包含草稿)
            filters.append(Script.tenant_id == self.tenant_id)
            filters.append(Script.user_id == self.user_id)
        elif data.get("qtype") == "group":  # 同组应用(包含草稿)
            filters.append(
                and_(Script.tenant_id == self.tenant_id, Script.user_id != self.user_id)
            )
        elif data.get("qtype") == "builtin":  # 内置的应用
            filters.append(Script.user_id == Account.get_administrator_id())
        elif data.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    Script.tenant_id == self.tenant_id,
                    Script.user_id == Account.get_administrator_id(),
                )
            )
        if filters:
            query = query.filter(*filters)
        query = query.order_by(desc(Script.created_at))
        pagination = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )
        for i in pagination.items:
            if i.user_id and i.user_id == Account.get_administrator_id():
                i.user_name = "Lazy LLM官方"
        return pagination

    @staticmethod
    def delete_script(script_id):
        """删除指定ID的脚本。

        Args:
            script_id (int): 脚本ID。

        Returns:
            bool: 删除成功返回True。

        Raises:
            ValueError: 当找不到指定ID的脚本时抛出异常。
            Exception: 当数据库操作失败时抛出异常。
        """
        script_instance = Script.query.filter_by(id=script_id).first()
        if script_instance is None:
            raise ValueError(f"没有找到id：{script_id}的脚本")
        try:
            Tag.delete_bindings(Tag.Types.SCRIPT, script_id)
            db.session.delete(script_instance)
            db.session.commit()
            return True
        except Exception as e:
            logging.exception(e)
            db.session.rollback()

    def update_script(self, script_id, data):
        """更新指定ID的脚本信息。

        Args:
            script_id (int): 脚本ID。
            data (dict): 更新数据，包含以下字段：
                - name (str, optional): 脚本名称。
                - description (str, optional): 脚本描述。
                - icon (str, optional): 脚本图标。
                - script_url (str, optional): 脚本URL。
                - script_type (str, optional): 脚本类型。
                - data_type (str, optional): 数据类型。

        Returns:
            Script: 更新后的脚本实例。

        Raises:
            ValueError: 当找不到指定ID的脚本或用户已存在同名脚本时抛出异常。
            Exception: 当数据库操作失败时抛出异常。
        """
        script_instance = Script.query.filter_by(id=script_id).first()
        if script_instance is None:
            raise ValueError(f"没有找到id：{script_id}的脚本")

        if Script.query.filter(
            Script.name == data.get("name"),
            Script.user_id == script_instance.user_id,
            Script.id != script_instance.id,
        ).first():
            raise ValueError(f"该用户已经存在同名脚本：{data.get('name')}")

        now_str = TimeTools.get_china_now()
        script_instance.name = data.get("name")
        script_instance.description = data.get("description")
        script_instance.icon = data.get("icon")
        script_instance.script_url = data.get("script_url")
        script_instance.script_type = data.get("script_type")
        script_instance.data_type = data.get("data_type")
        script_instance.update_at = now_str

        try:
            db.session.commit()
        except Exception as e:
            logging.exception(e)
            db.session.rollback()

        return script_instance

    @staticmethod
    def get_script_by_id(script_id):
        """根据ID获取脚本实例。

        Args:
            script_id (int): 脚本ID。

        Returns:
            Script or None: 脚本实例，如果不存在则返回None。
        """
        return Script.query.filter_by(id=script_id).first()

    @staticmethod
    def get_list_by_type(script_type):
        """根据脚本类型获取脚本列表。

        Args:
            script_type (str): 脚本类型，支持 "all"、"clean"、"augment" 或具体的脚本类型名称。

        Returns:
            list: 脚本列表。

        Raises:
            ValueError: 当script_type为空时抛出异常。
        """
        if script_type is None:
            raise ValueError("script_type 不能为空")
        if script_type == "all":
            return Script.query.all()
        if script_type == "clean":
            script_type = "数据过滤"
        if script_type == "augment":
            script_type = "数据增强"
        return Script.query.filter_by(script_type=script_type).all()

    def upload_file_by_path(self, storage_dir, file):
        """上传文件到指定路径并创建文件记录。

        Args:
            storage_dir (str): 存储目录路径。
            file: 文件对象。

        Returns:
            str: 文件路径。

        Raises:
            Exception: 当文件保存或数据库操作失败时抛出异常。
        """
        filename = FileTools.get_filename(file)
        file_path = os.path.join(storage_dir, filename)
        file.save(file_path)

        file_record = FileRecord.init_as_other(self.user_id, filename, file_path)
        db.session.add(file_record)
        db.session.commit()
        return file_record.file_path
