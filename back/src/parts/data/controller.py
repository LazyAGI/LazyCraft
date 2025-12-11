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

import json
import logging
import mimetypes
import os
import tarfile
import time
import urllib.parse
import zipfile
from io import BytesIO
from threading import Thread

from flask import (Response, copy_current_request_context, current_app,
                   jsonify, make_response, request, send_file, stream_with_context)
from flask_login import current_user
from flask_restful import marshal, marshal_with, reqparse

from core.restful import Resource
from libs.feature_gate import require_internet_feature
from libs.filetools import FileTools
from libs.json_utils import ensure_list_from_json
from libs.login import login_required
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db
from utils.util_file_validation import (
    validate_file_type_and_raise,
    validate_python_file_and_raise,
)

from . import fields
from .data_service import DataService
from .model import DataSetVersionStatus, DataSetFile, DataSetVersion, DataSet
from .script_service import ScriptService


class ScriptListApi(Resource):
    """脚本列表API，用于获取脚本分页列表。

    Args:
        page (int): 页码，默认为1。
        page_size (int): 每页大小，默认为20。
        script_type (list): 脚本类型列表。
        name (str): 脚本名称。
        qtype (str): 查询类型，默认为"already"。
        search_tags (list): 搜索标签列表。
        search_name (str): 搜索名称。
        user_id (list): 用户ID列表。

    Returns:
        dict: 分页结果，包含脚本列表和分页信息。
    """

    @login_required
    def post(self):
        """获取脚本分页列表。

        Args:
            通过JSON请求体传递参数：
                page (int, optional): 页码，默认为1。
                page_size (int, optional): 每页大小，默认为20。
                script_type (list, optional): 脚本类型列表。
                name (str, optional): 脚本名称。
                qtype (str, optional): 查询类型，默认为"already"。
                search_tags (list, optional): 搜索标签列表。
                search_name (str, optional): 搜索名称。
                user_id (list, optional): 用户ID列表。

        Returns:
            dict: 分页结果，包含脚本列表和分页信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument("script_type", type=list, default=[], location="json")
        parser.add_argument("name", type=str, default="", location="json")
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="already"
        )
        parser.add_argument(
            "search_tags", type=list, location="json", required=False, default=""
        )
        parser.add_argument(
            "search_name", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "user_id", type=list, location="json", required=False, default=[]
        )
        args = parser.parse_args()

        self.check_can_read()

        pagination = ScriptService(current_user).get_script_by_account(args)
        return marshal(pagination, fields.script_pagination)


class ScriptCreateApi(Resource):
    """脚本创建API，用于创建新的脚本。

    Args:
        name (str): 脚本名称。
        description (str, optional): 脚本描述。
        icon (str, optional): 脚本图标。
        script_url (str, optional): 脚本URL。
        script_type (str, optional): 脚本类型。
        data_type (str, optional): 数据类型。

    Returns:
        dict: 创建的脚本信息。
    """

    @login_required
    def post(self):
        """创建新脚本。

        Args:
            通过JSON请求体传递参数：
                name (str): 脚本名称。
                description (str, optional): 脚本描述。
                icon (str, optional): 脚本图标，默认为"/app/upload/script.jpg"。
                script_url (str, optional): 脚本URL。
                script_type (str, optional): 脚本类型。
                data_type (str, optional): 数据类型。

        Returns:
            dict: 创建的脚本信息。

        Raises:
            ValueError: 当缺少必要参数时抛出异常。
        """
        data = request.get_json()
        data["icon"] = data.get("icon") or "/app/upload/script.jpg"
        self.check_can_write()
        script = ScriptService(current_user).create_script(data)
        LogService().add(
            Module.DATA_SCRIPT_MANAGEMENT,
            Action.ADD_SCRIPT,
            name=script.name,
            script_type=script.script_type,
        )
        return marshal(script, fields.script_field)


class ScriptDeleteApi(Resource):
    """脚本删除API，用于删除指定的脚本。

    Args:
        script_id (int): 脚本ID。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    @login_required
    def post(self):
        """删除指定脚本。

        Args:
            通过JSON请求体传递参数：
                script_id (int): 脚本ID。

        Returns:
            tuple: (响应数据, HTTP状态码)

        Raises:
            ValueError: 当脚本ID为空时抛出异常。
        """
        data = request.get_json()
        if data["script_id"] is None or data["script_id"] == "":
            raise ValueError("输入的参数格式有误")
        script = ScriptService(current_user).get_script_by_id(data["script_id"])
        self.check_can_admin_object(script)
        ScriptService(current_user).delete_script(data["script_id"])
        LogService().add(
            Module.DATA_SCRIPT_MANAGEMENT,
            Action.DELETE_SCRIPT,
            name=script.name,
            script_type=script.script_type,
        )
        return {"code": 200, "message": "success"}, 200


class ScriptUploadApi(Resource):
    """脚本上传API，用于上传脚本文件。

    Args:
        file: 上传的脚本文件。

    Returns:
        dict: 上传结果信息。
    """

    @login_required
    def post(self):
        """上传脚本文件。

        Args:
            通过multipart/form-data传递参数：
                file: 上传的脚本文件，必须是.py格式。

        Returns:
            dict: 上传结果信息。

        Raises:
            ValueError: 当没有上传文件、文件类型不支持或上传多个文件时抛出异常。
        """
        if "file" not in request.files:
            raise ValueError("请上传文件")

        file = request.files["file"]

        if not file.filename.endswith(".py"):
            raise ValueError("文件类型不支持")

        if len(request.files) > 1:
            raise ValueError("请上传单个文件")
        file_size = FileTools.get_file_size(file)
        if file_size > 1 * 1024 * 1024:
            raise ValueError("文件大小不能超过1MB")

        # 验证文件是否是真正的Python文件
        validate_python_file_and_raise(file)

        self.check_can_write()

        storage_dir = FileTools.create_script_storage(current_user.id)
        file_path = ScriptService(current_user).upload_file_by_path(storage_dir, file)
        return {"file_path": file_path, "message": "success", "code": 200}, 200


class ScriptUpdateApi(Resource):
    """脚本更新API，用于更新指定脚本的信息。

    Args:
        script_id (int): 脚本ID。
        name (str, optional): 脚本名称。
        description (str, optional): 脚本描述。
        icon (str, optional): 脚本图标。
        script_url (str, optional): 脚本URL。
        script_type (str, optional): 脚本类型。
        data_type (str, optional): 数据类型。

    Returns:
        dict: 更新后的脚本信息。

    Raises:
        ValueError: 当脚本ID为空时抛出异常。
    """

    @login_required
    @marshal_with(fields.script_field)
    def post(self):
        """更新指定脚本信息。

        Args:
            通过JSON请求体传递参数：
                script_id (int): 脚本ID。
                name (str, optional): 脚本名称。
                description (str, optional): 脚本描述。
                icon (str, optional): 脚本图标。
                script_url (str, optional): 脚本URL。
                script_type (str, optional): 脚本类型。
                data_type (str, optional): 数据类型。

        Returns:
            dict: 更新后的脚本信息。

        Raises:
            ValueError: 当脚本ID为空时抛出异常。
        """
        data = request.get_json()
        self.check_can_write()
        if data["script_id"] is None or data["script_id"] == "":
            raise ValueError("输入的参数格式有误")
        service = ScriptService(current_user)
        script = service.get_script_by_id(data["script_id"])
        self.check_can_write_object(script)
        script = ScriptService(current_user).update_script(data["script_id"], data)
        return script


class ScriptListByTypeApi(Resource):
    """根据类型获取脚本列表API。

    Args:
        script_type (str): 脚本类型。

    Returns:
        list: 指定类型的脚本列表。
    """

    @login_required
    def get(self):
        """根据脚本类型获取脚本列表。

        Args:
            通过URL参数传递：
                script_type (str): 脚本类型。

        Returns:
            list: 指定类型的脚本列表。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("script_type", type=str, default="", location="args")
        args = parser.parse_args()
        
        self.check_can_read()
        
        script_list = ScriptService(current_user).get_list_by_type(args["script_type"])
        return marshal(script_list, fields.script_field)


class DataSetListApi(Resource):
    """数据集列表API，用于获取数据集分页列表。

    Args:
        page (int): 页码，默认为1。
        page_size (int): 每页大小，默认为20。
        name (str, optional): 数据集名称。
        data_type (list, optional): 数据类型列表。
        qtype (str, optional): 查询类型，默认为"already"。
        search_tags (list, optional): 搜索标签列表。
        search_name (str, optional): 搜索名称。
        user_id (list, optional): 用户ID列表。

    Returns:
        dict: 分页结果，包含数据集列表和分页信息。
    """

    @login_required
    def post(self):
        """获取数据集分页列表。

        Args:
            通过JSON请求体传递参数：
                page (int, optional): 页码，默认为1。
                page_size (int, optional): 每页大小，默认为20。
                name (str, optional): 数据集名称。
                data_type (list, optional): 数据类型列表。
                qtype (str, optional): 查询类型，默认为"already"。
                search_tags (list, optional): 搜索标签列表。
                search_name (str, optional): 搜索名称。
                user_id (list, optional): 用户ID列表。

        Returns:
            dict: 分页结果，包含数据集列表和分页信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument("name", type=str, default="", location="json")
        parser.add_argument("data_type", type=list, default=[], location="json")
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
        pagination = DataService(current_user).get_data_set_list(data=args)
        return marshal(pagination, fields.data_set_pagination)


class DataSetCreateApi(Resource):
    """数据集创建API，用于创建新的数据集。

    Args:
        name (str): 数据集名称。
        description (str, optional): 数据集描述。
        data_type (str): 数据类型（doc或pic）。
        upload_type (str): 上传类型（local或url）。
        file_paths (list, optional): 本地文件路径列表。
        file_urls (list, optional): 文件URL列表。
        data_format (str, optional): 数据格式。
        from_type (str, optional): 来源类型。

    Returns:
        dict: 创建的数据集信息。

    Raises:
        ValueError: 当必要参数缺失或文件上传失败时抛出异常。
    """

    @login_required
    def post(self):
        """创建新数据集。

        Args:
            通过JSON请求体传递参数：
                name (str): 数据集名称。
                description (str, optional): 数据集描述。
                data_type (str): 数据类型（doc或pic）。
                upload_type (str): 上传类型（local或url）。
                file_paths (list, optional): 本地文件路径列表。
                file_urls (list, optional): 文件URL列表。
                data_format (str, optional): 数据格式。
                from_type (str, optional): 来源类型。

        Returns:
            dict: 创建的数据集信息。

        Raises:
            ValueError: 当必要参数缺失或文件上传失败时抛出异常。
        """
        self.check_can_write()
        data = request.get_json()
        if data["name"] is None or data["name"] == "":
            raise ValueError("输入的参数格式有误")

        if data["data_type"] is None or data["data_type"] == "":
            raise ValueError("输入的参数格式有误")

        if data["upload_type"] is None or data["upload_type"] == "":
            raise ValueError("输入的参数格式有误")

        if data["upload_type"] == "local":
            if data["file_paths"] is None or data["file_paths"] == []:
                raise ValueError("请上传文件")
        if data["upload_type"] == "url":
            if data["file_urls"] is None or data["file_urls"] == []:
                raise ValueError("请填写url")

        data_set = DataService(current_user).create_data(data=data)
        if data_set.from_type == "return":
            from_type = "数据回流"
        else:
            from_type = "本地上传"
        if data_set.data_type == "doc":
            data_type = "文本数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.CREATE_TEXT_DATA,
                name=data_set.name,
                data_type=data_type,
                from_type=from_type,
            )
        else:
            data_type = "图片数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.CREATE_IMAGE_DATA,
                name=data_set.name,
                data_type=data_type,
                from_type=from_type,
            )

        return marshal(data_set, fields.data_set_field)


class UploadDataSetFileApi(Resource):
    """数据集文件上传API，用于上传数据集文件。

    Args:
        file: 上传的文件。
        file_type (str): 文件类型（pic或doc）。

    Returns:
        dict: 上传结果信息。

    Raises:
        ValueError: 当文件类型不支持、文件大小超限或压缩包内容不符合要求时抛出异常。
    """

    @login_required
    def post(self):
        """上传数据集文件。

        Args:
            通过multipart/form-data传递参数：
                file: 上传的文件。
                file_type (str): 文件类型（pic或doc）。

        Returns:
            dict: 上传结果信息，包含文件路径。

        Raises:
            ValueError: 当文件类型不支持、文件大小超限或压缩包内容不符合要求时抛出异常。
        """
        file = request.files["file"]
        type = request.form.get("file_type")
        if file.filename == "":
            raise ValueError("没有选择文件")
        if type is None or type == "":
            raise ValueError("没有选择文件类型")
        if type == "pic":
            pic_extensions = [
                ".jpg",
                ".png",
                ".jpeg",
                ".gif",
                ".svg",
                ".webp",
                ".bmp",
                ".tiff",
                ".ico",
                ".tar.gz",
                ".zip",
            ]
            if not file.filename.endswith(tuple(pic_extensions)):
                raise ValueError("文件类型错误")
            if file.content_length > 2 * 1024 * 1024 * 1024:
                raise ValueError("文件大小不能超过2GB")
            
            if not (file.filename.endswith(".zip") or file.filename.endswith(".tar.gz")):
                is_strict = not file.filename.lower().endswith(".svg")
                validate_file_type_and_raise(
                    file,
                    [ext.lstrip('.') for ext in pic_extensions if ext not in ['.tar.gz', '.zip']],
                    strict=is_strict
                )
            
            # 检查压缩包内文件类型
            allowed_ext = (
                ".jpg",
                ".png",
                ".jpeg",
                ".gif",
                ".svg",
                ".webp",
                ".bmp",
                ".tiff",
                ".ico",
            )
            self.check_compres_package(file, allowed_ext)

        if type == "doc":
            doc_extensions = [
                ".json",
                ".csv",
                ".jsonl",
                ".txt",
                ".parquet",
                ".tar.gz",
                ".zip",
            ]
            if not file.filename.endswith(tuple(doc_extensions)):
                raise ValueError("文件类型错误")
            if file.content_length > 1024 * 1024 * 1024:
                raise ValueError("文件大小不能超过1GB")

            if not (file.filename.endswith(".zip") or file.filename.endswith(".tar.gz")):
                # 对于文档文件，大部分是文本文件，使用非严格模式
                # parquet 是二进制格式，需要特殊处理
                is_strict = file.filename.lower().endswith(".parquet")
                validate_file_type_and_raise(
                    file,
                    [ext.lstrip('.') for ext in doc_extensions if ext not in ['.tar.gz', '.zip']],
                    strict=is_strict
                )

            # 检查压缩包内文件类型
            allowed_ext = (".json", ".csv", ".jsonl", ".txt", ".parquet")
            self.check_compres_package(file, allowed_ext)

        self.check_can_write()

        storage_dir = FileTools.create_temp_storage(current_user.id)
        file_path = ScriptService(current_user).upload_file_by_path(storage_dir, file)
        return {"file_path": file_path, "message": "success", "code": 200}, 200

    def check_compres_package(self, file, allowed_ext):
        """检查压缩包内的文件类型是否符合要求。

        Args:
            file: 压缩文件对象。
            allowed_ext (tuple): 允许的文件扩展名列表。

        Raises:
            ValueError: 当压缩包内包含不支持的文件类型时抛出异常。
        """
        if file.filename.endswith(".zip"):
            with zipfile.ZipFile(file) as zf:
                for name in zf.namelist():
                    if not name.endswith(allowed_ext) and not name.endswith("/"):
                        raise ValueError(f"压缩包内有不支持的文件: {name}")
        elif file.filename.endswith(".tar.gz"):
            file.seek(0)
            with tarfile.open(fileobj=file, mode="r:gz") as tf:
                for member in tf.getmembers():
                    if member.isfile():
                        if not member.name.endswith(allowed_ext):
                            raise ValueError(f"压缩包内有不支持的文件: {member.name}")


class DataSetVersionListApi(Resource):
    """数据集版本列表API，用于获取数据集版本分页列表。

    Args:
        page (int): 页码，默认为1。
        page_size (int): 每页大小，默认为20。
        version_type (str, optional): 版本类型。
        data_set_id (str): 数据集ID。

    Returns:
        dict: 分页结果，包含数据集版本列表和分页信息。
    """

    @login_required
    def get(self):
        """获取数据集版本分页列表。

        Args:
            通过URL参数传递：
                page (int, optional): 页码，默认为1。
                page_size (int, optional): 每页大小，默认为20。
                version_type (str, optional): 版本类型。
                data_set_id (str): 数据集ID。

        Returns:
            dict: 分页结果，包含数据集版本列表和分页信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="args")
        parser.add_argument("page_size", type=int, default=20, location="args")
        parser.add_argument("version_type", type=str, default="", location="args")
        parser.add_argument("data_set_id", type=str, default="", location="args")
        args = parser.parse_args()

        # 检查用户是否有权限访问该数据集
        if args.get("data_set_id"):
            data_set = DataService(current_user).get_data_set_by_id(args["data_set_id"])
            if data_set:
                self.check_can_read_object(data_set)

        pagination = DataService(current_user).get_data_set_version_list_by_id(args)
        return marshal(pagination, fields.data_set_version_pagination)


class DataSetFileListApi(Resource):
    """数据集文件列表API，用于获取数据集版本下的文件分页列表。

    Args:
        page (int): 页码，默认为1。
        page_size (int): 每页大小，默认为20。
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 分页结果，包含数据集文件列表和分页信息。
    """

    @login_required
    def get(self):
        """获取数据集版本下的文件分页列表。

        Args:
            通过URL参数传递：
                page (int, optional): 页码，默认为1。
                page_size (int, optional): 每页大小，默认为20。
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 分页结果，包含数据集文件列表和分页信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="args")
        parser.add_argument("page_size", type=int, default=20, location="args")
        parser.add_argument(
            "data_set_version_id", type=str, default="", location="args"
        )
        args = parser.parse_args()

        if args.get("data_set_version_id"):
            data_set_version = DataService(current_user).get_data_set_version_by_id(
                args["data_set_version_id"]
            )
            if data_set_version:
                data_set = DataService(current_user).get_data_set_by_id(
                    data_set_version.data_set_id
                )
                if data_set:
                    self.check_can_read_object(data_set)
            
        pagination = DataService(current_user).get_data_set_file_by_id(args)
        return marshal(pagination, fields.data_set_file_pagination)


class DataSetTagListApi(Resource):
    """数据集标签列表API，用于获取数据集的标签版本列表。

    Args:
        data_set_id (str): 数据集ID。

    Returns:
        dict: 包含数据集标签列表的响应。
    """

    @login_required
    def get(self):
        """获取数据集的标签版本列表。

        Args:
            通过URL参数传递：
                data_set_id (str): 数据集ID。

        Returns:
            dict: 包含数据集标签列表的响应。
        """
        data_set_id = request.args.get("data_set_id", default="", type=str)

        # 如果有 data_set_id，检查对该数据集的读权限
        if data_set_id:
            data_set = DataService(current_user).get_data_set_by_id(data_set_id)
            if data_set:
                self.check_can_read_object(data_set)
        else:
            self.check_can_read()

        datasets = DataService(current_user).get_data_set_tag_list(data_set_id)

        return marshal({"data": datasets}, fields.data_set_tag_list_fields)


class CreateDataSetVersionByTagApi(Resource):
    """根据标签创建数据集版本API，用于基于标签版本创建新的分支版本。

    Args:
        data_set_version_id (str): 数据集版本ID。
        name (str, optional): 新版本名称。

    Returns:
        dict: 创建的数据集版本信息。

    Raises:
        ValueError: 当数据集版本ID为空时抛出异常。
    """

    @login_required
    def post(self):
        """根据标签创建数据集版本。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。
                name (str, optional): 新版本名称。

        Returns:
            dict: 创建的数据集版本信息。

        Raises:
            ValueError: 当数据集版本ID为空时抛出异常。
        """
        data = request.get_json()
        if data["data_set_version_id"] is None or data["data_set_version_id"] == "":
            raise ValueError("输入的参数格式有误")
        
        service = DataService(current_user)
        data_set_version = service.get_data_set_version_by_id(data["data_set_version_id"])
        if not data_set_version:
            raise ValueError("数据集版本不存在")
        
        data_set = service.get_data_set_by_id(data_set_version.data_set_id)
        if not data_set:
            raise ValueError("数据集不存在")
        
        self.check_can_write_object(data_set)
        data_set_version_instance = service.create_data_set_version_by_tag(data["data_set_version_id"], data["name"])
        if data_set.data_type == "doc":
            data_type = "文本数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.IMPORT_TEXT_DATA_VERSION,
                name=data_set.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                file_size=len(data_set_version_instance.data_set_file_ids),
            )
        else:
            data_type = "图片数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.IMPORT_IMAGE_DATA_VERSION,
                name=data_set.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                file_size=len(data_set_version_instance.data_set_file_ids),
            )

        return marshal(data_set_version_instance, fields.data_set_version_field)


class DataSetVersionPublishApi(Resource):
    """数据集版本发布API，用于发布数据集版本为标签版本。

    Args:
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 发布后的数据集版本信息。

    Raises:
        ValueError: 当数据集版本ID为空时抛出异常。
    """

    @login_required
    def post(self):
        """发布数据集版本为标签版本。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 发布后的数据集版本信息。

        Raises:
            ValueError: 当数据集版本ID为空时抛出异常。
        """
        data = request.get_json()
        if data["data_set_version_id"] is None or data["data_set_version_id"] == "":
            raise ValueError("输入的参数格式有误")
        service = DataService(current_user)
        old_data_set_version_instance = service.get_data_set_version_by_id(
            data["data_set_version_id"]
        )
        if not old_data_set_version_instance:
            raise ValueError("数据集版本不存在")
        
        data_set = service.get_data_set_by_id(old_data_set_version_instance.data_set_id)
        if not data_set:
            raise ValueError("数据集不存在")
        
        # 检查权限：发布操作需要写权限
        self.check_can_write_object(data_set)
        
        data_set_version_instance = service.publish_data_set_version(
            data["data_set_version_id"]
        )
        if data_set.data_type == "doc":
            data_type = "文本数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.PUBLISH_TEXT_DATA,
                name=data_set.name,
                data_type=data_type,
                old_version=old_data_set_version_instance.version,
                version=data_set_version_instance.version,
                file_size=len(data_set_version_instance.data_set_file_ids),
            )
        else:
            data_type = "图片数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.PUBLISH_IMAGE_DATA,
                name=data_set.name,
                data_type=data_type,
                old_version=old_data_set_version_instance.version,
                version=data_set_version_instance.version,
                file_size=len(data_set_version_instance.data_set_file_ids),
            )

        return marshal(data_set_version_instance, fields.data_set_version_field)


class DataSetFileApi(Resource):
    """数据集文件内容获取API，用于获取JSON文件内容并返回给前端。

    Args:
        data_set_file_id (str): 数据集文件ID。
        start (int, optional): 起始行号。
        end (int, optional): 结束行号。

    Returns:
        dict: 包含文件内容的响应。

    Raises:
        ValueError: 当数据集文件ID为空时抛出异常。
    """

    @login_required
    def post(self):
        """获取JSON文件内容并返回给前端。

        Args:
            通过JSON请求体传递参数：
                data_set_file_id (str): 数据集文件ID。
                start (int, optional): 起始行号。
                end (int, optional): 结束行号。

        Returns:
            dict: 包含文件内容的响应。

        Raises:
            ValueError: 当数据集文件ID为空时抛出异常。
        """
        data = request.get_json()
        if data["data_set_file_id"] is None or data["data_set_file_id"] == "":
            raise ValueError("输入的参数格式有误")

        data_set_file_model = DataSetFile.query.get(data["data_set_file_id"])
        if data_set_file_model:
            data_set_version = DataService(current_user).get_data_set_version_by_id(
                data_set_file_model.data_set_version_id
            )
            if data_set_version:
                data_set = DataService(current_user).get_data_set_by_id(
                    data_set_version.data_set_id
                )
                if data_set:
                    self.check_can_write_object(data_set)

        return DataService(current_user).get_data_set_file_by_file_id(
            data["data_set_file_id"], data.get("start"), data.get("end")
        )


class DataSetFileUpdateApi(Resource):
    """数据集文件更新API，用于修改数据集文件内容。

    Args:
        data_set_file_id (str): 数据集文件ID。
        content (str): 新的文件内容。
        data_set_file_name (str, optional): 新的文件名。
        start (int, optional): 起始行号。
        end (int, optional): 结束行号。

    Returns:
        dict: 更新结果信息。

    Raises:
        ValueError: 当必要参数缺失时抛出异常。
    """

    @login_required
    def post(self):
        """修改数据集文件内容。

        Args:
            通过JSON请求体传递参数：
                data_set_file_id (str): 数据集文件ID。
                content (str): 新的文件内容。
                data_set_file_name (str, optional): 新的文件名。
                start (int, optional): 起始行号。
                end (int, optional): 结束行号。

        Returns:
            dict: 更新结果信息，包含新的总行数。

        Raises:
            ValueError: 当必要参数缺失时抛出异常。
        """
        data = request.get_json()
        if data["data_set_file_id"] is None or data["data_set_file_id"] == "":
            raise ValueError("输入的参数格式有误")
        if data["content"] is None or data["content"] == "":
            raise ValueError("输入的参数格式有误")
        
        data_set_file_model = DataSetFile.query.get(data["data_set_file_id"])
        if data_set_file_model:
            data_set_version = DataService(current_user).get_data_set_version_by_id(
                data_set_file_model.data_set_version_id
            )
            if data_set_version:
                data_set = DataService(current_user).get_data_set_by_id(
                    data_set_version.data_set_id
                )
                if data_set:
                    self.check_can_write_object(data_set)
        
        new_total = DataService.update_data_set_file(
            data.get("data_set_file_id"),
            data.get("content"),
            data.get("data_set_file_name"),
            data.get("start"),
            data.get("end"),
        )
        return {"message": "success", "code": 200, "data": {"total": new_total}}, 200


class DataSetDeleteApi(Resource):
    """数据集删除API，用于删除指定的数据集。

    Args:
        data_set_id (str): 数据集ID。

    Returns:
        dict: 删除结果信息。

    Raises:
        ValueError: 当数据集ID为空或数据集正在被使用时抛出异常。
    """

    @login_required
    def post(self):
        """删除指定的数据集。

        Args:
            通过JSON请求体传递参数：
                data_set_id (str): 数据集ID。

        Returns:
            dict: 删除结果信息。

        Raises:
            ValueError: 当数据集ID为空或数据集正在被使用时抛出异常。
        """
        data = request.get_json()
        if data["data_set_id"] is None or data["data_set_id"] == "":
            raise ValueError("输入的参数格式有误")
        service = DataService(current_user)
        data_set = service.get_data_set_by_id(data["data_set_id"])
        self.check_can_admin_object(data_set)
        service.delete_data_set(data["data_set_id"])

        if data_set.from_type == "return":
            from_type = "数据回流"
        else:
            from_type = "本地上传"
        if data_set.data_type == "doc":
            data_type = "文本数据集"
        else:
            data_type = "图片数据集"
        LogService().add(
            Module.DATA_MANAGEMENT,
            Action.DELETE_SET_DATA,
            name=data_set.name,
            data_type=data_type,
            from_type=from_type,
        )

        return {"message": "success", "code": 200}, 200


class DataSetVersionDeleteApi(Resource):
    """数据集版本删除API，用于删除指定的数据集版本。

    Args:
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 删除结果信息，包含剩余版本数量。

    Raises:
        ValueError: 当数据集版本ID为空或版本正在被使用时抛出异常。
    """

    @login_required
    def post(self):
        """删除指定的数据集版本。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 删除结果信息，包含剩余版本数量。

        Raises:
            ValueError: 当数据集版本ID为空或版本正在被使用时抛出异常。
        """
        data = request.get_json()
        if data["data_set_version_id"] is None or data["data_set_version_id"] == "":
            raise ValueError("输入的参数格式有误")
        service = DataService(current_user)
        data_set_version_instance = service.get_data_set_version_by_id(
            data["data_set_version_id"]
        )
        if not data_set_version_instance:
            raise ValueError("数据集版本不存在")
        
        data_set = service.get_data_set_by_id(data_set_version_instance.data_set_id)
        if not data_set:
            raise ValueError("数据集不存在")
        
        # 检查用户是否有权限删除该数据集版本（需要对该数据集有管理员权限）
        self.check_can_admin_object(data_set)
        
        delete_num = service.delete_data_set_version(
            data["data_set_version_id"], True, data_set.from_type
        )
        if data_set.data_type == "doc":
            data_type = "文本数据集"
        else:
            data_type = "图片数据集"
        LogService().add(
            Module.DATA_MANAGEMENT,
            Action.DELETE_VERSION_DATA,
            name=data_set.name,
            data_type=data_type,
            version_type=data_set_version_instance.version_type,
            version=data_set_version_instance.version,
            file_size=delete_num,
        )
        version_count = service.get_data_set_version_count_by_data_set_id(
            data_set_version_instance.data_set_id
        )
        return {"message": "success", "code": 200, "count": version_count}, 200


class DataSetFileDeleteApi(Resource):
    """数据集文件删除API，用于删除指定的数据集文件。

    Args:
        data_set_file_ids (list): 数据集文件ID列表。

    Returns:
        dict: 删除结果信息。

    Raises:
        ValueError: 当文件ID列表为空或数据集版本正在被使用时抛出异常。
    """

    @login_required
    def post(self):
        """删除指定的数据集文件。

        Args:
            通过JSON请求体传递参数：
                data_set_file_ids (list): 数据集文件ID列表。

        Returns:
            dict: 删除结果信息。

        Raises:
            ValueError: 当文件ID列表为空或数据集版本正在被使用时抛出异常。
        """
        data = request.get_json()
        data_set_file_ids = data.get("data_set_file_ids", [])
        if not data_set_file_ids or len(data_set_file_ids) == 0:
            raise ValueError("输入的参数格式有误")
        service = DataService(current_user)
        data_set_file_instance = service.get_data_set_file_by_data_set_file_id(
            data_set_file_ids[0]
        )
        if not data_set_file_instance:
            raise ValueError("数据集文件不存在")
        data_set_version_instance = service.get_data_set_version_by_id(
            data_set_file_instance.data_set_version_id
        )
        if not data_set_version_instance:
            raise ValueError("数据集版本不存在")
        data_set = service.get_data_set_by_id(data_set_file_instance.data_set_id)
        if not data_set:
            raise ValueError("数据集不存在")
        # 检查用户是否有权限删除该数据集文件
        self.check_can_admin_object(data_set)
        if service.check_data_set_version_by_fine_tune(data_set_version_instance.id):
            raise ValueError("该数据集版本正在被使用，无法删除数据集或内部数据")

        for data_set_file_id in data_set_file_ids:
            service.delete_data_set_file(data_set_file_id, True, True)

        if data_set.data_type == "doc":
            data_type = "文本数据集"
        else:
            data_type = "图片数据集"
        LogService().add(
            Module.DATA_MANAGEMENT,
            Action.DELETE_FILE_DATA,
            name=data_set.name,
            data_type=data_type,
            version_type=data_set_version_instance.version_type,
            version=data_set_version_instance.version,
            file_size=len(data_set_file_ids),
        )

        return {"message": "success", "code": 200}, 200


class DataSetApi(Resource):
    """数据集详情API，用于获取指定数据集的详细信息。

    Args:
        data_set_id (str): 数据集ID。

    Returns:
        dict: 数据集的详细信息。

    Raises:
        ValueError: 当数据集不存在时抛出异常。
    """

    @login_required
    def get(self):
        """获取指定数据集的详细信息。

        Args:
            通过URL参数传递：
                data_set_id (str): 数据集ID。

        Returns:
            dict: 数据集的详细信息。

        Raises:
            ValueError: 当数据集不存在时抛出异常。
        """
        data_set_id = request.args.get("data_set_id", default="", type=str)
        data_set = DataService(current_user).get_data_set_by_id(data_set_id)
        if data_set:
            self.check_can_read_object(data_set)
        return marshal(data_set, fields.data_set_field)


class DataSetVersionApi(Resource):
    """数据集版本详情API，用于获取指定数据集版本的详细信息。

    Args:
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 数据集版本的详细信息。

    Raises:
        ValueError: 当数据集版本不存在时抛出异常。
    """

    @login_required
    def get(self):
        """获取指定数据集版本的详细信息。

        Args:
            通过URL参数传递：
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 数据集版本的详细信息。

        Raises:
            ValueError: 当数据集版本不存在时抛出异常。
        """
        data_set_version_id = request.args.get(
            "data_set_version_id", default="", type=str
        )
        data_set_version = DataService(current_user).get_data_set_version_by_id(
            data_set_version_id
        )
        if not data_set_version:
            raise ValueError("数据集版本不存在")
        
        data_set = DataService(current_user).get_data_set_by_id(
            data_set_version.data_set_id
        )
        if data_set:
            self.check_can_read_object(data_set)
        
        data_set_version.description = data_set.description
        data_set_version.label = data_set.label
        data_set_version.tags = data_set.tags
        data_set_version.user_name = data_set.user_name
        data_set_version.data_type = data_set.data_type
        data_set_version.data_format = data_set.data_format
        data_set_version.from_type = data_set.from_type
        data_set_version.reflux_type = data_set.reflux_type
        return marshal(data_set_version, fields.data_set_version_field)


class DataSetVersionAddFile(Resource):
    """数据集版本添加文件API，用于向数据集版本添加新文件。

    Args:
        data_set_version_id (str): 数据集版本ID。
        name (str, optional): 版本名称。
        version (str, optional): 版本号。
        file_paths (list, optional): 本地文件路径列表。
        file_urls (list, optional): 文件URL列表。

    Returns:
        dict: 添加结果信息。

    Raises:
        ValueError: 当数据集版本ID为空时抛出异常。
    """

    @login_required
    def post(self):
        """向数据集版本添加新文件。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。
                name (str, optional): 版本名称。
                version (str, optional): 版本号。
                file_paths (list, optional): 本地文件路径列表。
                file_urls (list, optional): 文件URL列表。

        Returns:
            dict: 添加结果信息。

        Raises:
            ValueError: 当数据集版本ID为空时抛出异常。
        """
        data = request.get_json()
        if data["data_set_version_id"] is None or data["data_set_version_id"] == "":
            raise ValueError("输入的参数格式有误")
        service = DataService(current_user)
        data_set_version_instance = service.get_data_set_version_by_id(
            data["data_set_version_id"]
        )
        if not data_set_version_instance:
            raise ValueError("数据集版本不存在")
        data_set = service.get_data_set_by_id(data_set_version_instance.data_set_id)
        if not data_set:
            raise ValueError("数据集不存在")
        self.check_can_write_object(data_set)
        
        data_set_version_obj = service.add_data_set_version_file(data)
        # file_size = len(data["file_paths"])+len(data["file_urls"])
        old_file_size = len(
            ensure_list_from_json(data_set_version_instance.data_set_file_ids)
        )
        new_file_size = len(
            ensure_list_from_json(data_set_version_obj.data_set_file_ids)
        )
        if data_set.data_type == "doc":
            data_type = "文本数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.EDIT_TEXT_DATA,
                name=data_set.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                old_file_size=old_file_size,
                new_file_size=new_file_size,
            )
        else:
            data_type = "图片数据集"
            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.EDIT_IMAGE_DATA,
                name=data_set.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                old_file_size=old_file_size,
                new_file_size=new_file_size,
            )

        return {"message": "success", "code": 200}, 200


class DataSetVersionExportFT(Resource):
    """数据集版本导出API（微调专用），用于导出数据集版本文件。

    Args:
        filename (str): 文件路径。
        filefrom (str): 文件来源（upload或return）。

    Returns:
        Response: 文件下载响应。

    Raises:
        ValueError: 当参数有误或文件不存在时抛出异常。
    """

    def get(self):
        """导出数据集版本文件（微调专用）。

        Args:
            通过URL参数传递：
                filename (str): 文件路径。
                filefrom (str): 文件来源（upload或return）。

        Returns:
            Response: 文件下载响应。

        Raises:
            ValueError: 当参数有误或文件不存在时抛出异常。
        """
        dataset_filename = request.args.get("filename", default="", type=str)
        dataset_filefrom = request.args.get(
            "filefrom", default="", type=str
        )  # upload or return
        if not dataset_filename:
            raise ValueError("输入的参数有误")

        if not dataset_filefrom:
            raise ValueError("输入的参数有误")

        if not os.path.exists(dataset_filename):
            raise ValueError(f"文件 {dataset_filename} 不存在")

        try:
            mime_type, _ = mimetypes.guess_type(dataset_filename)
            if mime_type is None:
                mime_type = "application/octet-stream"  # 默认二进制流

            download_name = os.path.basename(dataset_filename)

            response = send_file(
                dataset_filename,
                as_attachment=True,
                download_name=download_name,
                mimetype=mime_type,
            )

            if dataset_filefrom == "return":
                os.remove(dataset_filename)
            return response
        except Exception as e:
            if os.path.exists(dataset_filename):
                if dataset_filefrom == "return":
                    os.remove(dataset_filename)
            return jsonify({"error": str(e)}), 500


class DataSetVersionExport(Resource):
    """数据集版本导出API，用于导出一个或多个数据集版本。

    Args:
        data_set_version_ids (list): 数据集版本ID列表。

    Returns:
        Response: 压缩文件下载响应。

    Raises:
        ValueError: 当数据集版本ID列表为空时抛出异常。
    """

    @login_required
    def post(self):
        """导出一个或多个数据集版本。

        Args:
            通过JSON请求体传递参数：
                data_set_version_ids (list): 数据集版本ID列表。

        Returns:
            Response: 压缩文件下载响应。

        Raises:
            ValueError: 当数据集版本ID列表为空时抛出异常。
        """
        data = request.get_json()
        data_set_version_ids = data.get("data_set_version_ids", [])

        if not data_set_version_ids:
            raise ValueError("输入的参数有误")

        service = DataService(current_user)
     
        checked_data_set_ids = set()
        for version_id in data_set_version_ids:
            data_set_version = service.get_data_set_version_by_id(version_id)
            if not data_set_version:
                raise ValueError(f"数据集版本不存在: {version_id}")
            data_set_id = data_set_version.data_set_id
            if data_set_id not in checked_data_set_ids:
                data_set = service.get_data_set_by_id(data_set_id)
                if not data_set:
                    raise ValueError(f"数据集不存在: {data_set_id}")
                self.check_can_read_object(data_set)
                checked_data_set_ids.add(data_set_id)
        
        try:
            if len(data_set_version_ids) == 1:
                # 如果只有一个数据集 ID，直接返回该数据集的压缩包
                zip_filename = service.create_individual_zip(data_set_version_ids[0])
                try:
                    with open(zip_filename, 'rb') as f:
                        zip_buffer = BytesIO(f.read())
                    zip_buffer.seek(0)
                    download_filename = os.path.basename(zip_filename)
                    encoded_filename = urllib.parse.quote(download_filename)
                    
                    response = send_file(
                        zip_buffer,
                        mimetype="application/zip",
                        as_attachment=True,
                        download_name=encoded_filename,
                    )
                finally:
                    try:
                        if os.path.exists(zip_filename):
                            os.remove(zip_filename)
                    except Exception as e:
                        logging.warning(f"删除临时压缩包文件失败: {zip_filename}, 错误: {str(e)}")
            else:
                # 如果有多个数据集 ID，创建一个总的压缩包
                combined_zip_filename = service.create_combined_zip(
                    data_set_version_ids
                )
                try:
                    with open(combined_zip_filename, 'rb') as f:
                        zip_buffer = BytesIO(f.read())
                    zip_buffer.seek(0)
                    download_filename = os.path.basename(combined_zip_filename)
                    encoded_filename = urllib.parse.quote(download_filename)
                    
                    response = send_file(
                        zip_buffer,
                        mimetype="application/zip",
                        as_attachment=True,
                        download_name=encoded_filename,
                    )
                finally:
                    try:
                        if os.path.exists(combined_zip_filename):
                            os.remove(combined_zip_filename)
                    except Exception as e:
                        logging.warning(f"删除临时压缩包文件失败: {combined_zip_filename}, 错误: {str(e)}")
            data_set_instance, version_type, version_list = (
                service.get_data_set_info_by_version_ids(data_set_version_ids)
            )
            if data_set_instance.data_type == "doc":
                data_type = "文本数据集"
                LogService().add(
                    Module.DATA_MANAGEMENT,
                    Action.EXPORT_TEXT_DATA,
                    name=data_set_instance.name,
                    version_type=version_type,
                    version_list=str(version_list),
                    data_type=data_type,
                )
            else:
                data_type = "图像数据集"
                LogService().add(
                    Module.DATA_MANAGEMENT,
                    Action.EXPORT_IMAGE_DATA,
                    name=data_set_instance.name,
                    version_type=version_type,
                    version_list=str(version_list),
                    data_type=data_type,
                )
            return response
        except Exception as e:
            return jsonify({"error": str(e)}), 500


class TestDataSetVersionStatus(Resource):
    """测试数据集版本状态API，用于测试数据集版本状态变更功能。

    Args:
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 状态变更后的数据集版本信息。

    Raises:
        Exception: 当状态变更失败时抛出异常。
    """

    @login_required
    def post(self):
        """测试数据集版本状态变更功能。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 状态变更后的数据集版本信息。

        Raises:
            Exception: 当状态变更失败时抛出异常。
        """
        data = request.get_json()
        data_set_version_id = data.get("data_set_version_id")
        service = DataService(current_user)
        
        # 检查权限：需要能写入数据集
        data_set_version = service.get_data_set_version_by_id(data_set_version_id)
        if data_set_version:
            data_set = service.get_data_set_by_id(data_set_version.data_set_id)
            if data_set:
                self.check_can_write_object(data_set)
        
        try:
            data_set_version_instance = service.change_data_set_version_status(
                data_set_version_id
            )
            return marshal(data_set_version_instance, fields.data_set_version_field)
        except Exception as e:
            return jsonify({"error": str(e)}), 500


class CleanOrAugmentDataSetVersion(Resource):
    """数据集版本清洗或增强API，用于对数据集版本进行数据清洗或增强处理。

    Args:
        data_set_version_id (str): 数据集版本ID。
        data_set_script_id (str): 数据集脚本ID。
        script_agent (str, optional): 脚本代理类型，默认为"script"。
        script_type (str, optional): 脚本类型。
        data_set_version_name (str, optional): 数据集版本名称。

    Returns:
        dict: 处理后的数据集版本信息。

    Raises:
        ValueError: 当必要参数缺失或数据集版本不存在时抛出异常。
        Exception: 当处理过程中发生错误时抛出异常。
    """

    @login_required
    @require_internet_feature("数据处理")
    def post(self):
        """对数据集版本进行数据清洗或增强处理。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。
                data_set_script_id (str): 数据集脚本ID。
                script_agent (str, optional): 脚本代理类型，默认为"script"。
                script_type (str, optional): 脚本类型。
                data_set_version_name (str, optional): 数据集版本名称。

        Returns:
            dict: 处理后的数据集版本信息。

        Raises:
            ValueError: 当必要参数缺失或数据集版本不存在时抛出异常。
            Exception: 当处理过程中发生错误时抛出异常。
        """
        data = request.get_json()
        data_set_version_id = data.get("data_set_version_id")
        data_set_script_id = data.get("data_set_script_id")
        script_agent = data.get("script_agent", "script")
        script_type = data.get("script_type", "")
        data_set_version_name = data.get("data_set_version_name")

        service = DataService(current_user)
        data_set_version_instance = service.get_data_set_version_by_id(
            data_set_version_id
        )
        if data_set_version_instance is None:
            raise ValueError(f"数据集版本不存在: {data_set_version_id}")

        if data_set_version_name:
            data_set_version_instance.name = data_set_version_name
            service.update_data_set_version(data_set_version_instance)
        data_set_instance = service.get_data_set_by_id(
            data_set_version_instance.data_set_id
        )
        if data_set_instance is None:
            raise ValueError(f"数据集不存在: {data_set_version_instance.data_set_id}")
        
        self.check_can_write_object(data_set_instance)
        try:
            data_set_version_instance.status = DataSetVersionStatus.version_doing.value
            db.session.commit()

            # 启动后台线程处理耗时的数据清洗/增强操作
            @copy_current_request_context
            def process_clean_or_enhance_async(
                data_set_version_id,
                script_agent,
                script_id,
                script_type,
                data_set_instance_name,
                data_set_instance_data_type,
                data_set_version_instance_version_type,
                data_set_version_instance_version,
            ):
                logging.info(
                    f"start process_clean_or_enhance_async: {data_set_version_id}"
                )
                app = current_app._get_current_object()
                with app.app_context():
                    try:
                        # 在后台线程中重新创建脚本实例
                        from utils.util_database import db

                        from .data_service import DataService
                        from .model import DataSetVersion, DataSetVersionStatus
                        from .script_model import Script
                        from .script_service import ScriptService

                        # 重新创建脚本实例
                        if script_agent == "script":
                            script_instance = ScriptService.get_script_by_id(script_id)
                        elif script_agent == "agent":
                            script_instance = Script(
                                script_type=script_type, script_url=script_id
                            )
                        else:
                            raise Exception("不支持的脚本代理类型")

                        if not script_instance:
                            raise Exception("脚本不存在")

                        # 创建新的 DataService 实例
                        background_service = DataService(current_user)

                        success_list, fail_list = (
                            background_service._execute_clean_or_enhance_core(
                                data_set_version_id, script_instance, script_agent
                            )
                        )

                        # 重新查询并更新状态
                        data_set_version_instance = DataSetVersion.query.get(
                            data_set_version_id
                        )
                        if data_set_version_instance:
                            data_set_version_instance.status = (
                                DataSetVersionStatus.version_done.value
                            )
                            db.session.commit()

                        if data_set_instance_data_type == "doc":
                            data_type = "文本数据集"
                        else:
                            data_type = "图像数据集"

                        LogService().add(
                            Module.DATA_MANAGEMENT,
                            Action.OPERATE_DATA,
                            name=data_set_instance_name,
                            data_type=data_type,
                            version_type=data_set_version_instance_version_type,
                            version=data_set_version_instance_version,
                            operate=script_instance.script_type[-2:],
                            success_size=len(success_list),
                            file_size=len(fail_list) + len(success_list),
                        )

                        logging.info(
                            f"process_clean_or_enhance_async completed: {data_set_version_id}"
                        )
                    except Exception as e:
                        logging.error(
                            f"process_clean_or_enhance_async failed: {data_set_version_id}, error: {e}"
                        )
                        # 重新查询并更新失败状态
                        from utils.util_database import db

                        from .data_service import DataService
                        from .model import DataSetVersion, DataSetVersionStatus

                        data_set_version_instance = DataSetVersion.query.get(
                            data_set_version_id
                        )
                        if data_set_version_instance:
                            data_set_version_instance.status = (
                                DataSetVersionStatus.version_fail.value
                            )
                            try:
                                db.session.commit()
                            except Exception:
                                db.session.rollback()
                                db.session.commit()

            thread = Thread(
                target=process_clean_or_enhance_async,
                args=(
                    data_set_version_id,
                    script_agent,
                    data_set_script_id,
                    script_type,
                    data_set_instance.name,
                    data_set_instance.data_type,
                    data_set_version_instance.version_type,
                    data_set_version_instance.version,
                ),
            )
            thread.start()

            # 立即返回结果，不等待后台处理完成
            return marshal(data_set_version_instance, fields.data_set_version_field)

        except Exception as e:
            # 如果发生异常，确保数据集版本状态被重置为失败
            try:
                data_set_version_instance = service.get_data_set_version_by_id(
                    data_set_version_id
                )
                if data_set_version_instance:
                    data_set_version_instance.status = (
                        DataSetVersionStatus.version_fail.value
                    )
                    db.session.commit()
            except Exception:
                db.session.rollback()
                db.session.commit()

            return jsonify({"error": str(e)}), 500


class CleanOrAugmentDataSetVersionAsync(Resource):
    """异步数据集版本清洗或增强API，用于异步处理大数据集的数据清洗或增强。

    Args:
        data_set_version_id (str): 数据集版本ID。
        data_set_script_id (str): 数据集脚本ID。
        script_agent (str, optional): 脚本代理类型，默认为"script"。
        script_type (str, optional): 脚本类型。
        data_set_version_name (str, optional): 数据集版本名称。

    Returns:
        dict: 包含任务ID的响应信息。

    Raises:
        ValueError: 当必要参数缺失时抛出异常。
        Exception: 当任务启动失败时抛出异常。
    """

    @login_required
    @require_internet_feature("数据处理")
    def post(self):
        """异步启动数据集版本的数据清洗或增强处理。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。
                data_set_script_id (str): 数据集脚本ID。
                script_agent (str, optional): 脚本代理类型，默认为"script"。
                script_type (str, optional): 脚本类型。
                data_set_version_name (str, optional): 数据集版本名称。

        Returns:
            dict: 包含任务ID的响应信息。

        Raises:
            ValueError: 当必要参数缺失时抛出异常。
            Exception: 当任务启动失败时抛出异常。
        """
        data = request.get_json()
        data_set_version_id = data.get("data_set_version_id")
        data_set_script_id = data.get("data_set_script_id")
        script_agent = data.get("script_agent", "script")
        script_type = data.get("script_type", "")
        data_set_version_name = data.get("data_set_version_name")

        if not data_set_version_id:
            raise ValueError("数据集版本ID不能为空")
        if not data_set_script_id:
            raise ValueError("脚本ID不能为空")

        service = DataService(current_user)
        
        # 检查权限：需要能写入数据集
        data_set_version = service.get_data_set_version_by_id(data_set_version_id)
        if data_set_version:
            data_set = service.get_data_set_by_id(data_set_version.data_set_id)
            if data_set:
                self.check_can_write_object(data_set)

        try:
            # 启动异步任务
            task_id = service.data_clean_or_enhance_async(
                data_set_version_id=data_set_version_id,
                script_id=data_set_script_id,
                script_type=script_type,
                script_agent=script_agent,
                data_set_version_name=data_set_version_name,
            )

            return {
                "result": "success",
                "task_id": task_id,
                "message": "数据处理任务已启动，请使用task_id查询进度",
            }

        except Exception as e:
            return jsonify({"error": str(e)}), 500


class CleanOrAugmentDataSetVersionAsyncWithItemCount(Resource):
    """异步数据集版本清洗或增强API（基于数据条数），用于异步处理大数据集并统计数据条数。

    Args:
        data_set_version_id (str): 数据集版本ID。
        data_set_script_id (str): 数据集脚本ID。
        script_agent (str, optional): 脚本代理类型，默认为"script"。
        script_type (str, optional): 脚本类型。
        data_set_version_name (str, optional): 数据集版本名称。

    Returns:
        dict: 包含任务ID的响应信息。

    Raises:
        ValueError: 当必要参数缺失时抛出异常。
        Exception: 当任务启动失败时抛出异常。
    """

    @login_required
    @require_internet_feature("数据处理")
    def post(self):
        """异步启动数据集版本的数据清洗或增强处理（基于数据条数统计）。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。
                data_set_script_id (str): 数据集脚本ID。
                script_agent (str, optional): 脚本代理类型，默认为"script"。
                script_type (str, optional): 脚本类型。
                data_set_version_name (str, optional): 数据集版本名称。

        Returns:
            dict: 包含任务ID的响应信息。

        Raises:
            ValueError: 当必要参数缺失时抛出异常。
            Exception: 当任务启动失败时抛出异常。
        """
        data = request.get_json()
        data_set_version_id = data.get("data_set_version_id")
        data_set_script_id = data.get("data_set_script_id")
        script_agent = data.get("script_agent", "script")
        script_type = data.get("script_type", "")
        data_set_version_name = data.get("data_set_version_name")

        if not data_set_version_id:
            raise ValueError("数据集版本ID不能为空")
        if not data_set_script_id:
            raise ValueError("脚本ID不能为空")

        service = DataService(current_user)
        
        # 检查权限：需要能写入数据集
        data_set_version = service.get_data_set_version_by_id(data_set_version_id)
        if data_set_version:
            data_set = service.get_data_set_by_id(data_set_version.data_set_id)
            if data_set:
                self.check_can_write_object(data_set)

        try:
            # 启动异步任务（基于数据条数）
            task_id = service.data_clean_or_enhance_async_with_item_count(
                data_set_version_id=data_set_version_id,
                script_id=data_set_script_id,
                script_type=script_type,
                script_agent=script_agent,
                data_set_version_name=data_set_version_name,
            )

            return {
                "result": "success",
                "task_id": task_id,
                "message": "数据处理任务已启动（基于数据条数统计），请使用task_id查询进度",
            }

        except Exception as e:
            return jsonify({"error": str(e)}), 500


class DataProcessingTaskProgress(Resource):
    """数据处理任务进度查询API，用于获取指定任务的进度信息。

    Args:
        task_id (str): 任务ID。

    Returns:
        dict: 任务进度信息。

    Raises:
        Exception: 当任务不存在时抛出异常。
    """

    @login_required
    def get(self, task_id):
        """获取指定数据处理任务的进度信息。

        Args:
            task_id (str): 任务ID。

        Returns:
            dict: 任务进度信息。

        Raises:
            Exception: 当任务不存在时抛出异常。
        """
        self.check_can_read()
        
        service = DataService(current_user)
        progress = service.get_processing_task_progress(task_id)

        if progress is None:
            return jsonify({"error": "任务不存在"}), 404

        return progress


class DataProcessingTaskCancel(Resource):
    """数据处理任务取消API，用于取消指定的数据处理任务。

    Args:
        task_id (str): 任务ID。

    Returns:
        dict: 取消结果信息。

    Raises:
        Exception: 当任务不存在或无法取消时抛出异常。
    """

    @login_required
    def post(self, task_id):
        """取消指定的数据处理任务。

        Args:
            task_id (str): 任务ID。

        Returns:
            dict: 取消结果信息。

        Raises:
            Exception: 当任务不存在或无法取消时抛出异常。
        """
        self.check_can_write()
        
        service = DataService(current_user)
        success = service.cancel_processing_task(task_id)

        if success:
            return {"result": "success", "message": "任务已取消"}
        else:
            return jsonify({"error": "任务不存在或无法取消"}), 404


class DataProcessingTaskList(Resource):
    """数据处理任务列表API，用于获取所有数据处理任务的列表。

    Returns:
        dict: 包含所有任务列表的响应信息。
    """

    @login_required
    def get(self):
        """获取所有数据处理任务列表。

        Returns:
            dict: 包含所有任务列表的响应信息。
        """
        self.check_can_read()
        
        service = DataService(current_user)
        tasks = service.list_processing_tasks()

        return {"result": "success", "tasks": tasks, "total": len(tasks)}


class DataProcessingTaskStream(Resource):
    """数据处理任务流式进度API，用于通过SSE实时推送任务进度。

    Args:
        task_id (str): 任务ID。

    Returns:
        Response: SSE流式响应，实时推送任务进度。

    Raises:
        Exception: 当任务不存在时抛出异常。
    """

    @login_required
    def get(self, task_id):
        """通过SSE实时推送任务进度。

        Args:
            task_id (str): 任务ID。

        Returns:
            Response: SSE流式响应，实时推送任务进度。

        Raises:
            Exception: 当任务不存在时抛出异常。
        """
        self.check_can_read()

        def generate():
            service = DataService(current_user)
            last_progress = None

            while True:
                progress = service.get_processing_task_progress(task_id)

                if progress is None:
                    yield f"data: {json.dumps({'error': '任务不存在'}, ensure_ascii=False)}\n\n"
                    break

                # 只在进度有变化时推送
                if last_progress != progress:
                    yield f"data: {json.dumps(progress, ensure_ascii=False)}\n\n"
                    last_progress = progress

                # 如果任务已完成、失败或取消，停止推送
                if progress["status"] in ["completed", "failed", "cancelled"]:
                    break

                time.sleep(1)  # 每秒检查一次进度

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            },
        )


api.add_resource(TestDataSetVersionStatus, "/data/version/test_status")
# ---------script controller begin------------------------
api.add_resource(ScriptListApi, "/script/list")
api.add_resource(ScriptCreateApi, "/script/create")
api.add_resource(ScriptDeleteApi, "/script/delete")
api.add_resource(ScriptUploadApi, "/script/upload")
api.add_resource(ScriptUpdateApi, "/script/update")
api.add_resource(ScriptListByTypeApi, "/script/list_by_type")
# ---------data controller begin--------------------------
api.add_resource(DataSetCreateApi, "/data/create_date_set")
api.add_resource(UploadDataSetFileApi, "/data/upload")
api.add_resource(DataSetListApi, "/data/list")
api.add_resource(DataSetVersionListApi, "/data/version/list")
api.add_resource(DataSetFileListApi, "/data/file/list")
api.add_resource(DataSetTagListApi, "/data/tag/list")
api.add_resource(CreateDataSetVersionByTagApi, "/data/version/create_by_tag")
api.add_resource(DataSetVersionPublishApi, "/data/version/publish")
api.add_resource(DataSetFileApi, "/data/file")
api.add_resource(DataSetFileUpdateApi, "/data/file/update")
api.add_resource(DataSetApi, "/data")
api.add_resource(DataSetVersionApi, "/data/version")
api.add_resource(DataSetDeleteApi, "/data/delete")
api.add_resource(DataSetVersionDeleteApi, "/data/version/delete")
api.add_resource(DataSetFileDeleteApi, "/data/file/delete")
api.add_resource(DataSetVersionAddFile, "/data/version/add/file")
api.add_resource(DataSetVersionExport, "/data/version/export")
api.add_resource(DataSetVersionExportFT, "/data/version/export/ft")
api.add_resource(CleanOrAugmentDataSetVersion, "/data/version/clean_or_augment")
# ---------异步数据处理API begin--------------------------
api.add_resource(
    CleanOrAugmentDataSetVersionAsync, "/data/version/clean_or_augment_async"
)
api.add_resource(
    CleanOrAugmentDataSetVersionAsyncWithItemCount,
    "/data/version/clean_or_augment_async_with_item_count",
)
api.add_resource(
    DataProcessingTaskProgress, "/data/processing/task/<string:task_id>/progress"
)
api.add_resource(
    DataProcessingTaskCancel, "/data/processing/task/<string:task_id>/cancel"
)
api.add_resource(DataProcessingTaskList, "/data/processing/tasks")
api.add_resource(
    DataProcessingTaskStream, "/data/processing/task/<string:task_id>/stream"
)
