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

import os
import urllib.parse
import zipfile
from io import BytesIO

from flask import request, send_file
from flask_login import current_user
from flask_restful import marshal, reqparse

from core.file_service import FileService
from core.restful import Resource
from libs.filetools import FileTools
from libs.login import login_required
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_file_validation import validate_file_type_and_raise

from . import fields
from .service import KnowledgeBaseService


class KnowledgeBaseListApi(Resource):
    """知识库列表 API 资源类。

    提供获取知识库列表的 RESTful 接口
    """

    @login_required
    def post(self):
        """获取知识库列表。

        Returns:
            dict: 包含分页知识库列表的响应数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="already"
        )
        parser.add_argument(
            "search_tags", type=list, location="json", required=False, default=[]
        )
        parser.add_argument(
            "search_name", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "user_id", type=list, location="json", required=False, default=[]
        )
        args = parser.parse_args()

        self.check_can_read()

        pagination = KnowledgeBaseService(current_user).get_pagination(args)
        return marshal(pagination, fields.knowledge_pagination_fields)


class KnowledgeBaseCreateApi(Resource):
    """知识库创建 API 资源类。

    提供创建知识库的 RESTful 接口
    """

    @login_required
    def post(self):
        """创建空的知识库。

        Returns:
            dict: 创建的知识库信息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("description", type=str, required=True, location="json")
        args = parser.parse_args()
        self.check_can_write()

        if not args["name"]:
            raise ValueError("参数错误")

        knowledge_base = KnowledgeBaseService(current_user).create(args)
        LogService().add(
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.CREATE_KNOWLEDGE_BASE,
            name=knowledge_base.name,
            describe=knowledge_base.description,
        )
        return marshal(knowledge_base, fields.knowledge_base_fields)


class KnowledgeBaseUpdateApi(Resource):
    """知识库更新 API 资源类。

    提供更新知识库的 RESTful 接口
    """

    @login_required
    def post(self):
        """修改知识库。

        Returns:
            dict: 更新后的知识库信息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("description", type=str, required=True, location="json")
        parser.add_argument("id", type=str, required=True, location="json")
        args = parser.parse_args()

        if not args["name"]:
            raise ValueError("参数错误")

        service = KnowledgeBaseService(current_user)
        knowledge = service.get_by_id(args.get("id"))

        self.check_can_write_object(knowledge)

        knowledge_base = service.update(args)
        LogService().add(
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.EDIT_KNOWLEDGE_BASE,
            name=knowledge_base.name,
            describe=knowledge_base.description,
        )
        return marshal(knowledge_base, fields.knowledge_base_fields)


class KnowledgeBaseDeleteApi(Resource):
    """知识库删除 API 资源类。

    提供删除知识库的 RESTful 接口
    """

    @login_required
    def post(self):
        """删除知识库。

        Returns:
            dict: 删除成功的响应消息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, required=True, location="json")
        args = parser.parse_args()
        service = KnowledgeBaseService(current_user)
        knowledge_base = service.get_by_id(args.get("id"))
        self.check_can_admin_object(knowledge_base)
        # if ReferManager.is_knowledge_refered(knowledge_base.id):
        #     raise ValueError("该知识库已被引用，无法删除")

        name = service.delete(args["id"])
        file_size = FileService(current_user).get_file_size_by_knowledge_base_id(
            args["id"]
        )
        LogService().add(
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.DELETE_KNOWLEDGE_BASE,
            name=name,
            file_size=file_size,
        )

        return {"message": "success"}


class FileGetApi(Resource):
    """文件获取 API 资源类。

    提供获取单个文件详情的 RESTful 接口
    """

    @login_required
    def post(self):
        """获取单个文件详情。

        Returns:
            dict: 文件详细信息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file_id", type=str, required=True, location="json")
        args = parser.parse_args()
        file_model = FileService(current_user).get_file_by_id(args["file_id"])
        # if file_model:
        #     self.check_can_read_object(file_model)

        result = FileService(current_user).get_file_by_id(args["file_id"])
        return marshal(result, fields.file_fields)


class FileUploadApi(Resource):
    """文件上传 API 资源类。

    提供上传单个文件的 RESTful 接口
    """

    @login_required
    def post(self):
        """上传单个文件。

        Returns:
            dict: 上传成功的文件信息
        """
        self.check_can_write()

        support_file_types = (
            ".xls",
            ".xlsx",
            ".doc",
            ".docx",
            ".zip",
            ".csv",
            ".json",
            ".txt",
            ".pdf",
            ".html",
            ".tex",
            ".md",
            ".ppt",
            ".pptx",
            ".xml",
        )
        file_obj = request.files["file"]

        if "file" not in request.files:
            raise ValueError("请上传文件")

        if not file_obj.filename.endswith(support_file_types):
            raise ValueError("文件类型不支持")

        if len(request.files) > 1:
            raise ValueError("请上传单个文件")

        # 判断文件大小，如果是0就报错; 大于50MB也报错，如果是zip类型则大于500MB报错
        file_size = FileTools.get_file_size(file_obj)
        if file_size == 0:
            raise ValueError("文件为空, 请重新上传")
        if file_obj.filename.lower().endswith(".zip"):
            if file_size > 500 * 1024 * 1024:
                raise ValueError("文件大小超过限制, zip文件大小不能超过500MB")
        else:
            if file_size > 50 * 1024 * 1024:
                raise ValueError("文件大小超过限制, 文件大小不能超过50MB")

        if not file_obj.filename.lower().endswith(".zip"):
            text_based_extensions = {'.txt', '.csv', '.json', '.html', '.xml', '.md', '.tex'}
            is_strict = not any(file_obj.filename.lower().endswith(ext) for ext in text_based_extensions)
            validate_file_type_and_raise(
                file_obj,
                [ext.lstrip('.') for ext in support_file_types if ext != '.zip'],
                strict=is_strict
            )

        upload_file = FileService(current_user).upload_file(file_obj)
        response = {"files": upload_file}
        return marshal(response, fields.file_list_fields)


class KnowledgeBaseAddFileApi(Resource):
    """知识库添加文件 API 资源类。

    提供往知识库添加文件的 RESTful 接口
    """

    @login_required
    def post(self):
        """往知识库添加文件。

        Returns:
            dict: 添加成功的响应消息
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "knowledge_base_id", type=str, required=True, location="json"
        )
        parser.add_argument("file_ids", type=list, required=True, location="json")
        args = parser.parse_args()
        knowledge_base = KnowledgeBaseService(current_user).get_by_id(
            args["knowledge_base_id"]
        )
        self.check_can_write_object(knowledge_base)
        file_name_list = FileService(current_user).add_knowledge_files(
            args["knowledge_base_id"], args["file_ids"]
        )
        LogService().add(
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.UPLOAD_FILE,
            name=knowledge_base.name,
            file_name_list=str(file_name_list),
            file_size=len(file_name_list),
        )
        return {"message": "success"}


class KnowledgeBaseFileListApi(Resource):
    """知识库文件列表 API 资源类。

    提供获取知识库详情与文件列表的 RESTful 接口
    """

    @login_required
    def get(self):
        """获取知识库详情与文件列表。

        Returns:
            dict: 知识库信息和分页文件列表
        """
        parser = reqparse.RequestParser()
        parser.add_argument("knowledge_base_id", type=str, location="args")
        parser.add_argument("page", default=1, type=int, location="args")
        parser.add_argument("page_size", default=20, type=int, location="args")
        parser.add_argument("file_name", type=str, location="args")
        args = parser.parse_args()
        knowledge = KnowledgeBaseService(current_user).get_by_id(
            args["knowledge_base_id"]
        )
        #  检查是否有读权限
        self.check_can_read_object(knowledge)

        pagination = FileService(current_user).get_pagination_files(args)
        response = marshal(pagination, fields.file_pagination_fields)

        response["knowledge_base_info"] = marshal(
            knowledge, fields.knowledge_base_fields
        )
        return response


class KnowledgeBaseFileDeleteApi(Resource):
    """知识库文件删除 API 资源类。

    提供批量删除文件的 RESTful 接口
    """

    @login_required
    def post(self):
        """批量删除文件。

        Returns:
            dict: 删除成功的响应消息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file_ids", type=list, required=True, location="json")
        data = parser.parse_args()
        file_name = ""
        knowledge_base_name = ""
        if data["file_ids"][0]:
            file_record = FileService(current_user).get_file_by_id(data["file_ids"][0])
            file_name = file_record.name
            knowledge_base_id = file_record.knowledge_base_id
            knowledge_base = KnowledgeBaseService(current_user).get_by_id(
                knowledge_base_id
            )
            # 判断是否有当前知识库删除权限
            self.check_can_admin_object(knowledge_base)
            knowledge_base_name = knowledge_base.name

        deleted_count = FileService(current_user).batch_delete_files(data["file_ids"])
        LogService().add(
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.DELETE_FILE,
            name=knowledge_base_name,
            file_name=file_name,
            file_size=deleted_count,
        )
        return {"message": "success"}


class FileDownloadApi(Resource):
    """文件下载 API 资源类。

    提供下载单个或多个文件的 RESTful 接口
    """

    def post(self):
        """下载单个或多个文件。

        Returns:
            Response: 文件下载响应，单个文件直接下载，多个文件打包为zip下载
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file_ids", type=int, action="append", required=True)
        args = parser.parse_args()
        file_ids = args["file_ids"]
        if not file_ids:
            raise ValueError("请选择文件")
        file_records = FileService(current_user).get_file_by_ids(file_ids)
        if len(file_records) > 1:
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for file_record in file_records:
                    file_path = file_record.file_path
                    file_name = os.path.basename(file_path)
                    zip_file.write(file_path, file_name)
            zip_buffer.seek(0)
            return send_file(
                zip_buffer,
                mimetype="application/zip",
                as_attachment=True,
                download_name="files.zip",
            )
        else:
            encoded_filename = urllib.parse.quote(file_records[0].file_path)
            return send_file(
                file_records[0].file_path,
                as_attachment=True,
                download_name=encoded_filename,
            )


class KnowledgeBaseReferenceResult(Resource):
    @login_required
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, location="args")
        data = parser.parse_args()
        kb_id = data["id"]

        service = KnowledgeBaseService(current_user)
        kb = service.get_by_id(kb_id)
        if not kb:
            return []
        
        # 检查用户是否有权限查看该知识库的引用结果（需要能读取该知识库）
        self.check_can_read_object(kb)

        # 2. 查询数据
        refs = service.get_ref_apps(kb_id)
        return marshal(refs, fields.app_ref_fields)


api.add_resource(KnowledgeBaseListApi, "/kb/list")
api.add_resource(KnowledgeBaseCreateApi, "/kb/create")
api.add_resource(KnowledgeBaseUpdateApi, "/kb/update")
api.add_resource(KnowledgeBaseDeleteApi, "/kb/delete")
api.add_resource(FileUploadApi, "/kb/upload")
api.add_resource(FileDownloadApi, "/kb/download")
api.add_resource(FileGetApi, "/kb/file/get")
api.add_resource(KnowledgeBaseAddFileApi, "/kb/file/add")
api.add_resource(KnowledgeBaseFileListApi, "/kb/file/list")
api.add_resource(KnowledgeBaseFileDeleteApi, "/kb/file/delete")
api.add_resource(KnowledgeBaseReferenceResult, "/kb/reference-result")
