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

import os.path
from datetime import datetime

from flask import Response, request, send_from_directory
from flask_login import current_user
from flask_restful import inputs, marshal, reqparse
from jinja2 import Environment, FileSystemLoader

from core.restful import Resource
from libs.login import login_required
from parts.urls import api
from utils.util_storage import storage

from . import fields
from .doc_service import DocService
from .utils import get_content_type


class DocListApi(Resource):
    """文档列表 API 资源类。

    提供获取文档列表的 RESTful 接口
    """

    def get(self):
        """获取文档列表。

        Returns:
            dict: 包含分页文档列表的响应数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=inputs.int_range(1, 99999),
            required=False,
            default=1,
            location="args",
        )
        parser.add_argument(
            "limit",
            type=inputs.int_range(1, 100),
            required=False,
            default=20,
            location="args",
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        args = parser.parse_args()
        client = DocService(current_user)
        pagination = client.get_paginate_docs(args)
        return marshal(pagination, fields.doc_page_fields)


class DocApi(Resource):
    """文档管理 API 资源类。

    提供文档的增删改查操作
    """

    @login_required
    def get(self):
        """获取单个文档详情。

        Returns:
            dict: 文档详细信息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, required=True, default=0, location="args")
        args = parser.parse_args()
        service = DocService(current_user)
        doc = service.get_doc(args.get("id"))
        return marshal(doc, fields.doc_detail_fields)

    @login_required
    def post(self):
        """创建新文档。

        Returns:
            dict: 创建的文档信息
        """
        data = request.get_json()
        self.check_can_admin()
        service = DocService(current_user)
        doc = service.create_doc(data)
        return marshal(doc, fields.doc_detail_fields)

    @login_required
    def delete(self):
        """删除文档。

        Returns:
            bool: 删除成功返回 True
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, required=True, default=0, location="args")
        args = parser.parse_args()
        self.check_can_admin()
        service = DocService(current_user)
        return service.delete_doc(args.get("id"))

    @login_required
    def put(self):
        """更新文档。

        Returns:
            dict: 更新后的文档信息
        """
        data = request.get_json()
        self.check_can_admin()
        service = DocService(current_user)
        doc = service.update_doc(data)
        return marshal(doc, fields.doc_detail_fields)


class DocOperationPublishApi(Resource):
    """文档发布操作 API 资源类。

    提供文档发布功能
    """

    @login_required
    def get(self):
        """发布文档。

        Returns:
            bool: 发布成功返回 True
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, required=True, default=0, location="args")
        args = parser.parse_args()
        service = DocService(current_user)
        return service.publish_doc(args.get("id"))


class DocOperatioUnPublishApi(Resource):
    """文档下架操作 API 资源类。

    提供文档下架功能
    """

    @login_required
    def get(self):
        """下架文档。

        Returns:
            bool: 下架成功返回 True
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, required=True, default=0, location="args")
        args = parser.parse_args()
        service = DocService(current_user)
        return service.unpublish_doc(args.get("id"))


class DocUploadImage(Resource):
    """文档图片上传 API 资源类。

    提供文档图片上传功能
    """

    @login_required
    def post(self):
        """上传文档图片。

        Returns:
            tuple: (响应数据, 状态码) 包含图片URL的响应
        """
        if "file" not in request.files:
            raise ValueError("请上传文件")
        file = request.files["file"]
        file_name = request.form.get("file_name")
        _, file_extension = os.path.splitext(file_name)
        time_stamp = datetime.now().strftime("%y%m%d")
        time_stamp_name = datetime.now().strftime("%y%m%d%H%M%S%f")[:12]
        target_path = os.path.join(
            "doc_image", time_stamp, time_stamp_name + file_extension
        )
        storage.save(target_path, file.read())
        return {"url": "/console/api/doc/image/" + target_path}, 200


class DocImage(Resource):
    """文档图片访问 API 资源类。

    提供文档图片的访问和下载功能
    """

    def get(self, subpath):
        """获取文档图片。

        Args:
            subpath (str): 图片文件路径

        Returns:
            Response: 包含图片内容的响应对象
        """
        file_path = subpath
        file_name = os.path.basename(file_path)
        gen = storage.load_stream(file_path)
        return Response(
            gen,
            content_type=get_content_type(file_name),
            headers={"Content-Disposition": f"attachment; {file_name}"},
        )


def get_params(uri):
    """从 URI 获取参数。

    Args:
        uri (str): URI 路径

    Returns:
        list: 路径参数列表
    """
    return uri.strip("/").split("/")


class DocView(Resource):
    """文档视图 API 资源类。

    提供文档的 Web 视图访问功能，支持 Markdown 文档渲染
    """

    template_load = Environment(
        loader=FileSystemLoader(
            os.path.dirname(os.path.abspath(__file__)) + "/template", "utf-8"
        )
    )

    def get(self, subpath=None):
        """获取文档视图。

        Args:
            subpath (str, optional): 子路径，用于访问具体的文档或资源

        Returns:
            Response: HTML 页面或文档内容的响应对象
        """
        if subpath is None:
            template = self.template_load.get_template("index.ft")
            content = template.render({})
            return Response(content, content_type="text/html;charset=UTF-8")

        try:
            params = get_params(subpath)
            doc_service = DocService(current_user)
            if len(params) >= 1:
                last = params[-1]
                if last.endswith(".md"):
                    if last.startswith("_sidebar"):
                        # 一级菜单
                        try:
                            template = self.template_load.get_template("_sidebar.ft")
                            data = {
                                "menus": doc_service.doc_menu()
                            }  # doc_menu 需要自定义实现
                            rendered_content = template.render(data)
                            return Response(
                                rendered_content,
                                content_type="text/markdown; charset=utf-8",
                            )
                        except Exception as e:
                            print(e)

                    if last.startswith("doc_"):
                        # 文档详情
                        doc_id = last.split("_")[1].split(".")[0]
                        content = doc_service.get_doc(int(doc_id))
                        content_txt = content.doc_content
                        return Response(
                            content_txt, content_type="text/markdown; charset=utf-8"
                        )

                    if last.startswith("README"):
                        # 主页内容
                        home_page_content = doc_service.home_page()
                        if home_page_content is not None:
                            return Response(
                                home_page_content.doc_content,
                                content_type="text/markdown; charset=utf-8",
                            )

                        # 从本地文件读取 README.md
                        file_path = os.path.join(
                            os.path.dirname(os.path.abspath(__file__)), "template", last
                        )
                        if os.path.exists(file_path):
                            with open(file_path, encoding="utf-8") as f:
                                file_content = f.read()
                            return Response(
                                file_content,
                                content_type="text/markdown; charset=utf-8",
                            )
                        else:
                            return Response("File not found", status=404)
                
                if last.endswith(("css", "js", "woff2", ".png")):
                    return send_from_directory(
                        directory=os.path.dirname(os.path.abspath(__file__)),
                        path=os.path.join("template", subpath),
                        mimetype=get_content_type(last),
                    )
                else:
                    return Response("File not found", status=404)
            return Response("Invalid request", status=400)
        except Exception as e:
            print(e)
            return Response("Internal server error", status=500)


api.add_resource(DocListApi, "/doc/manage/list")
api.add_resource(DocApi, "/doc/manage")
api.add_resource(DocOperationPublishApi, "/doc/manage/publish")
api.add_resource(DocOperatioUnPublishApi, "/doc/manage/unpublish")
api.add_resource(DocUploadImage, "/doc/manage/upload_image")
api.add_resource(DocImage, "/doc/image/<path:subpath>")
api.add_resource(DocView, "/doc/view", "/doc/view/<path:subpath>")
