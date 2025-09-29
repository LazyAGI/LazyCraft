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
from flask_restful import reqparse

from core.restful import Resource
from libs.login import login_required
from parts.urls import api
from utils.util_database import db

from .model import ChoiceTag, Tag
from .tag_service import TagService


class TagListApi(Resource):

    @login_required
    def get(self):
        """查询标签列表。

        根据指定的标签类型和可选的关键词查询标签列表。

        Args:
            type (str): 标签类型，必填，必须是预定义的标签类型之一。
            keyword (str, optional): 搜索关键词，默认为空字符串。

        Returns:
            list: 包含标签信息的列表。

        Raises:
            ValueError: 当标签类型不在允许的选项中时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "type", type=str, required=True, location="args", choices=Tag.TAG_TYPE_LIST
        )
        parser.add_argument(
            "keyword", type=str, required=False, location="args", default=""
        )
        args = parser.parse_args()

        tags = TagService(current_user).get_tags(args["type"], args.get("keyword"))
        return tags


class TagCreateApi(Resource):

    @login_required
    def post(self):
        """创建内置标签。

        创建一个新的内置标签，只有超级用户可以执行此操作。

        Args:
            name (str): 标签名称，必填。
            type (str): 标签类型，必填，必须是预定义的标签类型之一。

        Returns:
            dict: 包含新创建标签的id、name、type信息的字典。

        Raises:
            ValueError: 当参数错误或标签类型不合法时抛出。
            PermissionError: 当用户不是超级用户时抛出。
        """
        self.check_is_super()

        parser = reqparse.RequestParser()
        parser.add_argument("name", required=True, type=str, location="json")
        parser.add_argument(
            "type", required=True, type=str, location="json", choices=Tag.TAG_TYPE_LIST
        )
        args = parser.parse_args()

        if not args["name"]:
            raise ValueError("参数错误")

        tag = TagService(current_user).create_builtin_tag(args["type"], args["name"])
        return {
            "id": tag.id,
            "name": tag.name,
            "type": tag.type,
        }


class TagDeleteApi(Resource):

    @login_required
    def post(self):
        """删除标签"""
        parser = reqparse.RequestParser()
        parser.add_argument("name", required=True, type=str, location="json")
        parser.add_argument(
            "type", required=True, type=str, location="json", choices=Tag.TAG_TYPE_LIST
        )
        args = parser.parse_args()

        TagService(current_user).delete_tag(args["type"], args["name"])
        return {}


class TagBindingUpdateApi(Resource):

    @login_required
    def post(self):
        """更新关系"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "type", type=str, required=True, location="json", choices=Tag.TAG_TYPE_LIST
        )
        parser.add_argument("target_id", type=str, required=True, location="json")
        parser.add_argument("tag_names", type=list, required=True, location="json")
        args = parser.parse_args()

        if not all(args["tag_names"]):
            raise ValueError("参数错误")

        TagService(current_user).update_tag_binding(
            args["type"], args["target_id"], args["tag_names"]
        )
        return {}


class BrandListApi(Resource):
    @login_required
    def get(self):
        """查询产商"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "type",
            type=str,
            required=True,
            location="args",
            choices=ChoiceTag.TAG_TYPE_LIST,
        )
        args = parser.parse_args()

        data_list = []
        queryset = ChoiceTag.query.filter_by(type=args["type"]).order_by(
            ChoiceTag.created_at
        )
        for m in queryset:
            data_list.append(
                {
                    "id": m.id,
                    "name": m.name,
                    "type": m.type,
                }
            )
        return data_list


class BrandCreateApi(Resource):

    @login_required
    def post(self):
        """创建产商标签"""
        parser = reqparse.RequestParser()
        parser.add_argument("name", required=True, type=str, location="json")
        parser.add_argument(
            "type",
            required=True,
            type=str,
            location="json",
            choices=ChoiceTag.TAG_TYPE_LIST,
        )
        args = parser.parse_args()

        self.check_is_super()
        if not args["name"]:
            raise ValueError("参数错误")
        if ChoiceTag.query.filter_by(type=args["type"], name=args["name"]).first():
            raise ValueError("不可重复创建同名产商")

        tag = ChoiceTag(
            tenant_id=current_user.current_tenant_id,
            type=args["type"],
            name=args["name"],
        )
        db.session.add(tag)
        db.session.commit()

        return {
            "id": tag.id,
            "name": tag.name,
            "type": tag.type,
        }


class BrandDeleteApi(Resource):

    @login_required
    def post(self):
        """删除产商"""
        parser = reqparse.RequestParser()
        parser.add_argument("name", required=True, type=str, location="json")
        parser.add_argument(
            "type",
            required=True,
            type=str,
            location="json",
            choices=ChoiceTag.TAG_TYPE_LIST,
        )
        args = parser.parse_args()

        tag = ChoiceTag.query.filter_by(type=args["type"], name=args["name"]).first()
        if not tag:
            raise ValueError("产商不存在")

        db.session.delete(tag)
        db.session.commit()
        return {}


api.add_resource(TagListApi, "/tags")
api.add_resource(TagCreateApi, "/tags/create")
api.add_resource(TagDeleteApi, "/tags/delete")
api.add_resource(TagBindingUpdateApi, "/tags/bindings/update")
api.add_resource(BrandListApi, "/brands")
api.add_resource(BrandCreateApi, "/brands/create")
api.add_resource(BrandDeleteApi, "/brands/delete")
