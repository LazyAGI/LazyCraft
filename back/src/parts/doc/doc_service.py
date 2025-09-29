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


from core.account_manager import CommonError
from libs.timetools import TimeTools
from utils.util_database import db

from .model import DocStatus, Documents


class DocService:
    """文档服务类。

    提供文档的增删改查、发布/下架、索引刷新等业务逻辑处理
    """

    model_cls = Documents

    def __init__(self, account):
        """初始化文档服务。

        Args:
            account: 当前用户账户对象
        """
        self.account = account

    def get_paginate_docs(self, args):
        """获取分页文档列表。

        Args:
            args (dict): 查询参数，包含 page、limit、search_name 等

        Returns:
            Pagination: 分页对象，包含文档列表和分页信息
        """
        model_cls = self.model_cls
        filters = [model_cls.deleted_flag == 0]
        if args.get("search_name"):
            search_name = args["search_name"][:30]
            filters.append(model_cls.title.ilike(f"%{search_name}%"))
        pagination = db.paginate(
            db.select(model_cls).where(*filters).order_by(model_cls.index.asc()),
            page=args["page"],
            per_page=args["limit"],
            error_out=False,
        )
        return pagination

    def create_doc(self, data):
        """创建新文档。

        Args:
            data (dict): 文档数据，包含 title、doc_content、index、publish 等字段

        Returns:
            Documents: 创建的文档对象
        """
        model_cls = self.model_cls
        item = model_cls()
        item.created_at = TimeTools.get_china_now()
        item.updated_at = TimeTools.get_china_now()
        item.created_by = self.account.id
        item.tenant_id = self.account.current_tenant_id
        item.index = data.get("index", 0)
        item.doc_content = data.get("doc_content", "")
        item.title = data.get("title")
        if "publish" in data and data.get("publish") >= 1:
            item.status = DocStatus.PUBLISH.value
        else:
            item.status = DocStatus.UNPUBLISH.value
        db.session.add(item)
        db.session.commit()
        self.referesh_index()
        return item

    def delete_doc(self, id):
        """删除文档（软删除）。

        Args:
            id (int): 文档ID

        Returns:
            bool: 删除成功返回 True

        Raises:
            CommonError: 当文档不存在时抛出异常
        """
        item = Documents.query.get(id)
        if item is None:
            raise CommonError("doc not exists")
        item.deleted_flag = 1
        db.session.commit()
        self.referesh_index()
        return True

    def update_doc(self, data):
        """更新文档信息。

        Args:
            data (dict): 更新的文档数据，包含 id、title、doc_content、index、publish 等字段

        Returns:
            Documents: 更新后的文档对象

        Raises:
            CommonError: 当文档不存在时抛出异常
        """
        item = Documents.query.get(data.get("id"))
        if item is None:
            raise CommonError("doc not exists")
        item.updated_at = TimeTools.get_china_now()
        index = item.index
        item.index = data.get("index", 0)
        item.doc_content = data.get("doc_content", "")
        item.title = data.get("title")
        if "publish" in data and data.get("publish") >= 1:
            item.status = DocStatus.PUBLISH.value
        else:
            item.status = DocStatus.UNPUBLISH.value
        db.session.commit()
        if index > item.index:
            order = "desc"
        else:
            order = "asc"
        self.referesh_index(order=order)
        return item

    def get_doc(self, id):
        """根据ID获取文档。

        Args:
            id (int): 文档ID

        Returns:
            Documents: 文档对象，如果不存在返回 None
        """
        item = Documents.query.get(id)
        return item

    def publish_doc(self, id):
        """发布文档。

        Args:
            id (int): 文档ID

        Returns:
            bool: 发布成功返回 True
        """
        item = Documents.query.get(id)
        item.status = DocStatus.PUBLISH.value
        db.session.commit()
        return True

    def unpublish_doc(self, id):
        """下架文档。

        Args:
            id (int): 文档ID

        Returns:
            bool: 下架成功返回 True
        """
        item = Documents.query.get(id)
        item.status = DocStatus.UNPUBLISH.value
        db.session.commit()
        return True

    def referesh_index(self, order="desc"):
        """刷新文档索引顺序。

        Args:
            order (str): 排序方式，"asc" 为升序，"desc" 为降序，默认为 "desc"
        """
        filters = [
            Documents.deleted_flag == 0,
        ]
        query = (
            db.session.query(Documents).filter(*filters).order_by(Documents.index.asc())
        )

        if order == "asc":
            query = query.order_by(Documents.updated_at.asc())

        if order == "desc":
            query = query.order_by(Documents.updated_at.desc())

        items = query.all()
        index = 1
        for item in items:
            item.index = index
            index = index + 1
        db.session.commit()

    def doc_menu(self):
        """获取文档菜单列表。

        Returns:
            list: 已发布文档的菜单列表，每个元素包含 title 和 id
        """
        filters = [
            Documents.deleted_flag == 0,
            Documents.status == DocStatus.PUBLISH.value,
        ]
        items = (
            db.session.query(Documents)
            .filter(*filters)
            .order_by(Documents.index.asc(), Documents.updated_at.desc())
            .all()
        )
        return [{"title": item.title, "id": f"doc_{item.id}"} for item in items]

    def home_page(self):
        """获取首页文档。

        Returns:
            Documents: 首页显示的文档对象，如果没有则返回 None
        """
        filters = [
            Documents.deleted_flag == 0,
            Documents.status == DocStatus.PUBLISH.value,
        ]
        item = (
            db.session.query(Documents)
            .filter(*filters)
            .order_by(Documents.index.asc(), Documents.updated_at.desc())
            .first()
        )
        return item
