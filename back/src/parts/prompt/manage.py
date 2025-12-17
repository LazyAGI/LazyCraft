# Copyright (c) 2025 SenseTime. All Rights Reserved.
# Author: LazyLLM Team,  https://github.com/LazyAGI/LazyLLM
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

from flask import request
from flask_restful import reqparse

from core.restful import Resource
from libs.helper import build_response
from libs.login import login_required
from parts.urls import api

from .service import PromptService


class CreatePrompt(Resource):
    """创建提示信息的资源类。

    该类提供了一个RESTful接口，用于根据用户提交的数据创建新的提示信息。
    支持通过POST请求创建包含名称、描述、内容和分类的提示信息。
    """

    def __init__(self):
        # 初始化PromptService实例，用于处理提示信息的相关操作
        self.prompt_service = PromptService()

    @login_required
    def post(self):
        """创建新的提示信息。

        解析请求中的JSON数据，包括提示信息的名称、描述、内容和分类信息，
        调用PromptService创建新的提示信息并返回创建成功后的ID。

        Args:
            name (str): 提示信息的名称，必填。
            describe (str, optional): 提示信息的描述，默认为空字符串。
            content (str): 提示信息的内容，必填。
            category (str, optional): 提示信息的分类，默认为None。

        Returns:
            dict: 包含创建成功的提示信息ID的响应字典。

        Raises:
            ValueError: 当参数错误或名称为空时抛出。
        """
        try:
            # 初始化请求解析器，并添加对请求中JSON数据的解析规则
            parser = reqparse.RequestParser()
            parser.add_argument("name", type=str, required=True, location="json")
            parser.add_argument(
                "describe", type=str, required=False, location="json", default=""
            )
            parser.add_argument("content", type=str, required=True, location="json")
            parser.add_argument("category", type=str, default=None, location="json")
            args = parser.parse_args()
            self.check_can_write()
            if not args["name"]:
                raise ValueError("参数错误")
            _id = self.prompt_service.create_prompt(args)
            return build_response(result={"id": _id})
        except ValueError as e:
            return build_response(message=str(e), status=400)


class GetPrompt(Resource):
    """获取提示信息的资源类。

    该类提供了一个RESTful接口，用于根据提示信息的ID获取其详细信息，
    包括名称、描述、内容、分类和时间戳等。
    """

    def __init__(self):
        self.prompt_service = PromptService()

    @login_required
    def get(self, id):
        """获取指定ID的提示信息。

        调用PromptService获取提示信息的详细内容，包括权限检查。
        如果提示信息不存在则返回错误消息。

        Args:
            id (int): 提示信息的唯一标识符。

        Returns:
            dict: 包含提示信息详细内容的响应字典，包括id、name、describe、
                  content、category、created_at、updated_at字段。

        Raises:
            ValueError: 当提示信息不存在时返回400状态码。
        """
        prompt = self.prompt_service.get_prompt(id)
        if prompt is None:
            return build_response(status=400, message="提示不存在")
        if not prompt.is_builtin:
            self.check_can_read_object(prompt)
        result = {
            "id": prompt.id,
            "name": prompt.name,
            "describe": prompt.describe,
            "content": prompt.content,
            "category": prompt.category,
            "created_at": prompt.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": prompt.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        return build_response(result=result)


class UpdatePrompt(Resource):
    """
    更新提示信息的类。

    该类提供了一个接口，用于根据提示信息的ID和用户提交的数据更新提示信息。
    """

    def __init__(self):
        self.prompt_service = PromptService()

    @login_required
    def post(self, id):
        """
        处理POST请求，更新指定ID的提示信息。

        - 解析请求中的JSON数据，包括提示信息的名称、描述、内容和模板ID。
        - 调用PromptService的update_prompt方法更新提示信息。
        - 如果更新成功，返回成功消息。
        - 如果提示信息不存在，返回错误消息。
        """
        try:
            parser = reqparse.RequestParser()
            parser.add_argument("name", type=str, location="json")
            parser.add_argument("describe", type=str, location="json")
            parser.add_argument("content", type=str, location="json")
            parser.add_argument("template_id", type=int, location="json")
            parser.add_argument("category", type=str, location="json")
            args = parser.parse_args()
            self.check_can_write()
            if not args["name"]:
                raise ValueError("参数错误")
            prompt = self.prompt_service.get_prompt(id)
            if prompt is None:
                return build_response(status=400, message="提示不存在")
            if prompt.is_builtin:
                self.check_is_super()
            self.check_can_write_object(prompt)
            updated = self.prompt_service.update_prompt(prompt, args)
            if updated:
                return build_response(message="修改成功")
            return build_response(status=1, message="修改失败")
        except ValueError as e:
            return build_response(message=str(e), status=1)


import logging


class DeletePrompt(Resource):
    """
    删除提示信息的类。

    该类提供了一个接口，用于根据提示信息的ID删除提示信息。
    """

    def __init__(self):
        self.prompt_service = PromptService()

    @login_required
    def post(self, id):
        """
        处理POST请求，删除指定ID的提示信息。

        - 调用PromptService的delete_prompt方法删除提示信息。
        - 如果删除成功，记录日志并返回成功消息。
        - 如果提示信息不存在，记录错误日志并返回错误消息。
        """
        prompt = self.prompt_service.get_prompt(id)
        if prompt is None:
            return build_response(status=400, message="提示不存在")
        if prompt.is_builtin:
            self.check_is_super()
        self.check_can_admin_object(prompt)
        deleted = self.prompt_service.delete_prompt(prompt)
        if deleted:
            logging.info(f"Prompt {id} successfully deleted.")
            return build_response(message="删除成功")
        logging.error(f"Failed to delete prompt {id}.")
        return build_response(status=400, message="删除失败")


class ListPrompts(Resource):
    """
    列出提示信息的类。

    该类提供了一个接口，用于分页获取所有提示信息的列表。
    """

    def __init__(self):
        self.prompt_service = PromptService()

    @login_required
    def post(self):
        """
        处理GET请求，分页获取所有提示信息。

        - 解析请求中的分页参数，包括当前页码和每页数量。
        - 调用PromptService的list_prompt方法获取提示信息列表和分页信息。
        - 返回提示信息列表和分页信息。
        """

        data = request.get_json() or {}  # 处理请求体为空的情况

        page = data.get("page", 1)
        per_page = data.get("per_page", 10)
        qtype = data.get("qtype", "already")
        search_tags = data.get("search_tags", [])  # 默认空字符串
        search_name = data.get("search_name", "")  # 默认空字符串
        user_id = data.get("user_id", [])

        self.check_can_read()

        prompts, pagination_info = self.prompt_service.list_prompt(
            page, per_page, qtype, search_tags, search_name, user_id
        )

        return build_response(
            result={
                "total": pagination_info["total"],
                "pages": pagination_info["pages"],
                "current_page": pagination_info["current_page"],
                "next_page": pagination_info["next_page"],
                "prev_page": pagination_info["prev_page"],
                "prompts": prompts,
            }
        )


# Register routes to the ExternalApi instance
api.add_resource(CreatePrompt, "/prompt")
api.add_resource(GetPrompt, "/prompt/<int:id>")
api.add_resource(UpdatePrompt, "/prompt/<int:id>")
api.add_resource(DeletePrompt, "/prompt/delete/<int:id>")
api.add_resource(ListPrompts, "/prompt/list")
