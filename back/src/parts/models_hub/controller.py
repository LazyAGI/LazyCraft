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

import logging
import os
from threading import Thread

from flask import copy_current_request_context, current_app, g, request
from flask_login import current_user
from flask_restful import marshal, reqparse

from core.restful import Resource
from libs.filetools import FileTools
from libs.http_exception import CommonError
from libs.login import login_required
from parts.app.refer_service import ReferManager
from parts.knowledge_base.fields import file_fields
from parts.logs import Action, LogService, Module
from parts.tag.model import ChoiceTag
from parts.urls import api

from . import fields
from .model import Lazymodel, LazymodelOnlineModels, ModelStatus
from .model_list import online_model_list
from .service import ModelService


class modelHubListApi(Resource):
    @login_required
    def post(self):
        """查询模型翻页列表。
        
        Args:
            model_type (str, optional): 模型类型筛选条件。默认为空字符串。
            page (int, optional): 页码。默认为1。
            page_size (int, optional): 每页大小。默认为20。
            qtype (str, optional): 查询类型。默认为"already"。
            search_tags (list, optional): 标签搜索条件。默认为空列表。
            search_name (str, optional): 模型名称搜索条件。默认为空字符串。
            available (int, optional): 可用性筛选条件。
            status (str, optional): 状态筛选条件。默认为空字符串。
            model_kind (str, optional): 模型种类筛选条件。默认为空字符串。
            model_brand (str, optional): 模型品牌筛选条件。默认为空字符串。
            tenant (str, optional): 租户筛选条件。默认为空字符串。
            
        Returns:
            dict: 包含模型列表的分页数据，使用 model_pagination_fields 格式。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_type", type=str, default="", location="json")
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
        parser.add_argument("available", type=int, location="json", required=False)
        parser.add_argument(
            "status", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "model_kind", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "model_brand", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "tenant", type=str, location="json", required=False, default=""
        )        
        args = parser.parse_args()
        
        self.check_can_read()
        
        g.qtype = args["qtype"]
        g.current_user = current_user
        pagination = ModelService(current_user).get_pagination(args)
        return marshal(pagination, fields.model_pagination_fields)


class modelCreateApi(Resource):
    @login_required
    def post(self):
        """创建新模型。
        
        Args:
            model_type (str): 模型类型（必需）。
            model_icon (str, optional): 模型图标路径。
            model_name (str, optional): 模型名称。
            description (str, optional): 模型描述。
            model_from (str, optional): 模型来源。
            model_kind (str, optional): 模型种类。
            model_key (str, optional): 模型密钥。
            access_tokens (str, optional): 访问令牌。
            prompt_keys (str, optional): 提示词密钥。
            model_brand (str, optional): 模型品牌。
            model_url (str, optional): 模型URL。
            proxy_url (str, optional): 代理URL。
            model_list (str, optional): 模型列表。
            model_dir (str, optional): 模型目录。
            tag_names (list, optional): 标签名称列表。
            
        Returns:
            dict: 创建的模型信息，使用 model_fields 格式。
            
        Raises:
            CommonError: 当不支持的模型品牌时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_type", type=str, location="json", required=True)
        parser.add_argument("model_icon", type=str, location="json", required=False)
        parser.add_argument("model_name", type=str, location="json", required=False)
        parser.add_argument("description", type=str, location="json", required=False)
        parser.add_argument("model_from", type=str, location="json", required=False)
        parser.add_argument("model_kind", type=str, location="json", required=False)
        parser.add_argument("model_key", type=str, location="json", required=False)
        parser.add_argument("access_tokens", type=str, location="json", required=False)
        parser.add_argument("prompt_keys", type=str, location="json", required=False)
        parser.add_argument("model_brand", type=str, location="json", required=False)
        parser.add_argument("model_url", type=str, location="json", required=False)
        parser.add_argument("proxy_url", type=str, location="json", required=False)
        parser.add_argument("model_list", type=str, location="json", required=False)
        parser.add_argument("model_dir", type=str, location="json", required=False)
        parser.add_argument("tag_names", type=list, location="json", required=False)
        data = parser.parse_args()
        self.check_can_write()

        if data["model_type"] == "local" and data["model_from"] == "localModel":
            data["model_path"] = ModelService(current_user).get_model_path_by_file_dir(
                data["model_dir"]
            )

        # 获取已存在的模型路径
        if data["model_type"] == "local" and data["model_from"] == "existModel":
            data["model_path"] = ModelService(
                current_user
            ).get_model_path_by_exist_model(data["model_name"])

        if data["model_type"] == "online":
            queryset = ChoiceTag.query.filter_by(type=data["type"]).all()
            supported_brands = [m.name for m in queryset]
            if data["model_brand"] not in supported_brands:
                raise CommonError(f"暂不支持{data['model_brand']}厂商的模型")
        model = ModelService(current_user).create_model(data)

        if model.can_download:

            @copy_current_request_context
            def async_download_model(model_id, model_key, model_from, access_tokens):
                logging.info(f"start download model: {model_from}, {model_key}")
                app = current_app._get_current_object()
                with app.app_context():
                    ModelService(current_user).download_model(
                        model_id, model_key, model_from, access_tokens
                    )

            thread = Thread(
                target=async_download_model,
                args=(model.id, model.model_key, model.model_from, model.access_tokens),
            )
            thread.start()

        if data["model_from"] == "existModel":

            @copy_current_request_context
            def async_copy_model(m):
                logging.info(f"start copy model: {m.model_path}, {m.model_name}")
                app = current_app._get_current_object()
                with app.app_context():
                    ModelService(current_user).copy_model(
                        m.id, m.model_path, m.model_name
                    )

            thread = Thread(target=async_copy_model, args=(model,))
            thread.start()

        model_from = ""
        if "model_from" in data:
            model_from = data.get("model_from")
        model_from = model_from if model_from != "" else "user create"
        LogService().add(
            Module.MODEL_MANAGEMENT,
            Action.CREATE_MODEL,
            name=model.model_name,
            model_from=model_from,
            model_kind=model.model_kind,
        )

        return marshal(model, fields.model_fields)


class ModelOnlineListApi(Resource):
    @login_required
    def post(self):
        """保存在线模型列表。
        
        Args:
            model_id (int): 基础模型ID。
            model_list (list): 在线模型列表，每个元素包含 model_key 和 can_finetune 字段。
            
        Returns:
            dict: 保存操作的结果。
            
        Raises:
            ValueError: 当 model_id 或 model_list 为空时抛出。
        """
        data = request.get_json() or {}
        model_id = data.get("model_id")
        model_list = data.get("model_list")
        self.check_can_write()
        if not model_id or not model_list:
            return {"message": "model_id和model_list不能为空"}, 400
        # try:
        service = ModelService(current_user)
        result = service.save_online_model_list(model_id, model_list)
        return result

class ModelOnlineListDeleteApi(Resource):
    @login_required
    def post(self):
        """删除在线模型列表中的指定模型。
        
        Args:
            model_id (int): 基础模型ID。
            model_keys (list): 要删除的模型密钥列表。
            
        Returns:
            dict: 删除操作的结果。
            
        Raises:
            ValueError: 当 model_id 或 model_keys 为空时抛出。
            CommonError: 当删除操作失败时抛出。
        """
        self.check_can_admin()

        data = request.get_json() or {}
        model_id = data.get("model_id")
        model_keys = data.get("model_keys")
        if not model_id or not model_keys:
            return {"message": "model_id和model_keys不能为空"}, 400
        try:
            service = ModelService(current_user)
            result = service.delete_online_model_list(model_id, model_keys)
            return result
        except CommonError as e:
            return {"message": str(e)}, 400
        except Exception as e:
            return {"message": f"删除失败: {str(e)}"}, 500


class modelRetryDownloadApi(Resource):
    @login_required
    def get(self, model_id):
        """重试下载模型。
        
        Args:
            model_id (int): 模型ID。
            
        Returns:
            bool: 操作成功返回True。
            
        Raises:
            CommonError: 当模型不支持重试下载时抛出。
        """
        service = ModelService(current_user)
        model = service.get_model_by_id(model_id)
        if not model.builtin_flag:
            self.check_can_write_object(model)
        if model and model.can_download:

            @copy_current_request_context
            def async_download_model(m):
                logging.info(f"start download model: {m.model_from}, {m.model_key}")
                app = current_app._get_current_object()
                with app.app_context():
                    ModelService(current_user).download_model(
                        m.id, m.model_key, m.model_from, m.access_tokens
                    )

            thread = Thread(target=async_download_model, args=(model,))
            thread.start()
        else:
            raise CommonError("只支持从hf,ms 导入的本地模型重试下载")
        return True


class modelFinetuneRetryDownloadApi(Resource):
    @login_required
    def get(self, model_id, finetune_model_id):
        """重试下载微调模型。
        
        Args:
            model_id (int): 基础模型ID。
            finetune_model_id (int): 微调模型ID。
            
        Returns:
            bool: 操作成功返回True。
            
        Raises:
            CommonError: 当模型不支持重试下载或不是本地模型时抛出。
        """
        service = ModelService(current_user)
        model = service.get_model_by_id(model_id)
        self.check_can_write_object(model)
        if model:
            if model.model_type == "local":
                fine_model = Lazymodel.query.get(finetune_model_id)
                if fine_model and fine_model.can_download:

                    @copy_current_request_context
                    def async_download_model(m):
                        logging.info(
                            f"start download finetune model: {m.model_from}, {m.model_key}"
                        )
                        app = current_app._get_current_object()
                        with app.app_context():
                            ModelService(current_user).download_model(
                                m.id, m.model_key, m.model_from, m.access_tokens
                            )

                    thread = Thread(target=async_download_model, args=(fine_model,))
                    thread.start()
                    return True
                else:
                    raise CommonError("只支持从hf,ms 导入的本地模型重试下载")

            else:
                raise CommonError("只支持本地模型下载")
        return False


class modelHubUpdateApi(Resource):
    @login_required
    def post(self):
        """更新模型配置。
        
        Args:
            model_id (str): 模型ID（必需）。
            api_key (str): API密钥（必需）。
            
        Returns:
            dict: 更新后的模型信息，使用 model_fields 格式。
            
        Raises:
            CommonError: 当不支持的模型品牌时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_id", type=str, required=True, location="json")
        parser.add_argument("api_key", type=str, required=True, location="json")
        data = parser.parse_args()
        service = ModelService(current_user)
        model = service.get_model_by_id(data["model_id"])
        if not model.builtin_flag:
            self.check_can_write_object(model)

        if model.model_type == "online":
            queryset = ChoiceTag.query.filter_by(type=data["type"]).all()
            supported_brands = [m.name for m in queryset]
            if data["model_brand"] not in supported_brands:
                raise CommonError(f"暂不支持{model.model_brand}厂商的api_key配置")

        model = service.update_model(
            model_id=data["model_id"],
            api_key=data["api_key"],
            proxy_url="",
            proxy_auth_info={},
        )
        return marshal(model, fields.model_fields)


class ModelHubUpdateApiKeyApi(Resource):
    @login_required
    def post(self):
        """根据 model_brand 和 api_key 新增或更新 LazyModelConfigInfo 中的 api_key。
        
        Args:
            model_brand (str): 模型品牌（必需）。
            api_key (str): API密钥（必需）。
            proxy_url (str, optional): 代理URL。
            proxy_auth_info (dict, optional): 代理认证信息。
            
        Returns:
            dict: 包含操作状态和结果的字典。
        """
        self.check_can_write()       
        parser = reqparse.RequestParser()
        parser.add_argument("model_brand", type=str, required=True, location="json")
        parser.add_argument("api_key", type=str, required=False, location="json")
        parser.add_argument("proxy_url", type=str, location="json", required=False)
        parser.add_argument(
            "proxy_auth_info", type=dict, location="json", required=False
        )
        data = parser.parse_args()
        service = ModelService(current_user)
        result = service.update_or_create_api_key(
            data["model_brand"],
            data["api_key"],
            data["proxy_url"],
            data["proxy_auth_info"],
        )
        return {"status": "success", "result": result}

    @login_required
    def delete(self):
        """清除数据库中的 api_key。
        
        Args:
            model_brand (str): 模型品牌（必需）。
            
        Returns:
            dict: 包含操作状态和结果的字典。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_brand", type=str, required=True, location="json")
        data = parser.parse_args()
        
        self.check_can_write()
        
        service = ModelService(current_user)
        result = service.clear_api_key(data["model_brand"])
        return {"status": "success", "result": result}


class modelHubDeleteApi(Resource):
    @login_required
    def post(self):
        """删除模型。
        
        Args:
            model_id (str): 模型ID（必需）。
            qtype (str, optional): 查询类型。默认为"mine"。
            
        Returns:
            dict: 包含操作结果的字典。
            
        Raises:
            ValueError: 当模型被引用时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_id", type=str, required=True, location="json")
        parser.add_argument(
            "qtype", type=str, location="args", required=False, default="mine"
        )
        data = parser.parse_args()

        model = ModelService(current_user).get_model_by_id(data["model_id"])
        model_name = model.model_name
        model_from = model.model_from if model.model_from != "" else model.source_info
        model_kind = model.model_kind
        self.check_can_admin_object(model)
        if ReferManager.is_model_refered(model.id):
            raise ValueError("该模型已被引用，无法删除")
        model_delete_result = ModelService(current_user).delete_model(
            data["model_id"], qtype=data["qtype"]
        )
        if model_delete_result:
            LogService().add(
                Module.MODEL_MANAGEMENT,
                Action.DELETE_MODEL,
                name=model_name,
                model_from=model_from,
                model_kind=model_kind,
            )
            return {"message": "success"}
        else:
            return {"message": "failed"}


class modelIconUploadApi(Resource):
    @login_required
    def post(self):
        """上传模型图标文件。
        
        Args:
            file (FileStorage): 上传的文件对象。
            
        Returns:
            dict: 包含文件路径的字典。
            
        Raises:
            ValueError: 当文件格式不支持或未上传文件时抛出。
        """
        self.check_can_write()
        
        file = request.files["file"]

        if "file" not in request.files:
            raise ValueError("请上传文件")
        if len(request.files) > 1:
            raise ValueError("请上传单个文件")
        if file.filename.split(".")[-1] not in ["jpg", "jpeg", "png", "gif", "bmp"]:
            raise ValueError("请上传图片文件")

        filename = FileTools.get_filename(file)
        storage_path = FileTools.create_icons_storage(current_user.id)
        file_path = os.path.join(storage_path, filename)
        file.save(file_path)
        return {"file_path": file_path}


class modelHubUploadFileChunkApi(Resource):
    @login_required
    def post(self):
        """上传本地模型文件分片。
        
        Args:
            file (FileStorage): 上传的文件分片。
            chunk_number (int): 分片编号。
            total_chunks (int): 总分片数。
            filename (str): 文件名。
            file_dir (str): 文件目录。
            
        Returns:
            dict: 包含上传结果的字典。
            
        Raises:
            ValueError: 当未上传文件或上传多个文件时抛出。
        """
        file = request.files["file"]
        chunk_number = int(request.form["chunk_number"])
        total_chunks = int(request.form["total_chunks"])
        filename = request.form["file_name"]
        file_dir = request.form["file_dir"]
        self.check_can_write()

        if "file" not in request.files:
            raise ValueError("请上传文件")
        if len(request.files) > 1:
            raise ValueError("请上传单个文件")

        ModelService(current_user).upload_file_chunk(
            file, filename, file_dir, chunk_number, total_chunks
        )
        return {"message": f"当前分片 {chunk_number + 1}/{total_chunks} 上传成功"}


class modelHubUploadFileMergeApi(Resource):
    @login_required
    def post(self):
        """合并本地模型文件分片。
        
        Args:
            filename (str): 文件名（必需）。
            file_dir (str): 文件目录（必需）。
            
        Returns:
            dict: 合并后的文件信息，使用 file_fields 格式。
            
        Raises:
            ValueError: 当文件名为空时抛出。
        """
        filename = request.json["filename"]
        file_dir = request.json["file_dir"]
        self.check_can_write()
        if not filename:
            raise ValueError("请上传文件名字")
        result = ModelService(current_user).merge_file_chunks(filename, file_dir)
        return marshal(result, file_fields)


class ModelHubDeleteUploadedFileApi(Resource):
    @login_required
    def post(self):
        """删除上传但未被引用的模型文件或分片临时目录。
        
        Args:
            filename (str): 文件名（必需）。
            file_dir (str): 文件目录（必需）。
            
        Returns:
            dict: 删除操作的结果。
            
        Raises:
            ValueError: 当 filename 或 file_dir 为空时抛出。
            Exception: 当删除操作失败时抛出。
        """
        data = request.get_json() or {}
        filename = data.get("filename")
        file_dir = data.get("file_dir")
        if not filename or not file_dir:
            return {"message": "filename&file_dir不能为空"}, 400
        
        self.check_can_write()
        
        service = ModelService(current_user)
        try:
            result = service.delete_uploaded_file(filename, file_dir)
            return result
        except Exception as e:
            return {"message": str(e)}, 500


class modelHubCheckModelNameApi(Resource):
    @login_required
    def post(self):
        """检查模型名称是否合法。
        
        Args:
            model_name (str): 模型名称（必需）。
            model_from (str, optional): 模型来源。
            
        Returns:
            dict: 包含检查结果的字典。
            
        Raises:
            ValueError: 当模型名称已存在或模型已添加时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_name", type=str, required=True, location="json")
        parser.add_argument("model_from", type=str, required=False, location="json")
        data = parser.parse_args()

        self.check_can_read()

        if ModelService(current_user).exist_model_by_name(data["model_name"]):
            # 如果model_from为existModel则报错:该模型下已添加
            if data["model_from"] == "existModel":
                raise ValueError("该模型下已添加")
            else:
                raise ValueError("模型名称已经存在，请更换")

        return {"message": "success", "code": 200}  # 前端使用了code=200做判断


class ModelHubModelsTreeApi(Resource):
    @login_required
    def get(self):
        """获取模型树结构。
        
        Args:
            qtype (str, optional): 查询类型。默认为"already"。
            model_type (str, optional): 模型类型筛选条件。默认为空字符串。
            model_kind (str, optional): 模型种类筛选条件。默认为空字符串。
            
        Returns:
            dict: 模型树结构数据。
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "qtype", type=str, default="already", location="args", required=True
        )
        parser.add_argument("model_type", type=str, default="", location="args")
        parser.add_argument("model_kind", type=str, default="", location="args")
        args = parser.parse_args()
        
        self.check_can_read()
        
        g.qtype = args["qtype"]
        if g.qtype == "mine":
            g.qtype = "mine_builtin"
        g.current_user = current_user
        service = ModelService(current_user)
        return service.get_models(
            account=current_user,
            model_type=args.get("model_type") or None,
            model_kind=args.get("model_kind") or None,
            args=args,
        )


class ModelHubModelInfoApi(Resource):
    @login_required
    def get(self, model_id):
        """获取模型详细信息。
        
        Args:
            model_id (int): 模型ID。
            qtype (str, optional): 查询类型。默认为"mine"。
            namespace (str, optional): 命名空间。默认为"already"。
            
        Returns:
            dict: 模型详细信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "qtype", type=str, default="mine", location="args", required=False
        )
        parser.add_argument(
            "namespace", type=str, default="already", location="args", required=False
        )
        args = parser.parse_args()
        g.qtype = args["qtype"]
        g.current_user = current_user
        service = ModelService(current_user)
        model = service.get_model_by_id(model_id)
        if model:
            self.check_can_read_object(model)
            
        return service.get_model_info(model_id, qtype=args["qtype"])


class ModelCreateFinetuneApi(Resource):
    @login_required
    def post(self):
        """创建微调模型。
        
        Args:
            base_model_id (int): 基础模型ID（必需）。
            model_from (str): 模型来源（必需）。
            model_key (str, optional): 模型密钥。
            access_tokens (str, optional): 访问令牌。
            prompt_keys (str, optional): 提示词密钥。
            model_type (str, optional): 模型类型。
            model_dir (str, optional): 模型目录。
            model_name (str, optional): 模型名称。
            
        Returns:
            dict: 创建的微调模型信息，使用 model_fields 格式。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("base_model_id", type=int, location="json", required=True)
        parser.add_argument("model_from", type=str, location="json", required=True)
        parser.add_argument("model_key", type=str, location="json", required=False)
        parser.add_argument("access_tokens", type=str, location="json", required=False)
        parser.add_argument("prompt_keys", type=str, location="json", required=False)
        parser.add_argument("model_type", type=str, location="json", required=False)
        parser.add_argument("model_dir", type=str, location="json", required=False)
        parser.add_argument("model_name", type=str, location="json", required=False)
        data = parser.parse_args()
        
        service = ModelService(current_user)
        base_model = service.get_model_by_id(data["base_model_id"])
        if base_model:
            self.check_can_write_object(base_model)
        
        if (data.get("model_type") or "") == "local" and data[
            "model_from"
        ] == "localModel":
            data["model_path"] = ModelService(current_user).get_model_path_by_file_dir(
                data["model_dir"]
            )

        # 获取已存在的模型路径
        if data["model_type"] == "local" and data["model_from"] == "existModel":
            data["model_path"] = ModelService(
                current_user
            ).get_model_path_by_exist_model(data["model_name"])

        data["user_id"] = current_user.id
        data["current_tenant_id"] = current_user.current_tenant_id
        data["target_model_key"] = data["model_key"]
        data["source_info"] = data["model_from"]
        data["target_model_name"] = data["model_name"]
        model = ModelService(current_user).create_finetune_model(
            data["base_model_id"], data, ModelStatus.START.value
        )
        if model.can_download:

            @copy_current_request_context
            def async_download_model(m):
                logging.info(f"start download model: {m.model_from}, {m.model_key}")
                app = current_app._get_current_object()
                with app.app_context():
                    ModelService(current_user).download_model(
                        m.model_from, m.model_key, m.model_name, m.access_tokens
                    )

            thread = Thread(target=async_download_model, args=(model,))
            thread.start()

        if data["model_from"] == "existModel":

            @copy_current_request_context
            def async_copy_model(m):
                logging.info(f"start copy model: {m.model_path}, {m.model_name}")
                app = current_app._get_current_object()
                with app.app_context():
                    ModelService(current_user).copy_model(
                        m.id, m.model_path, m.model_name
                    )

            thread = Thread(target=async_copy_model, args=(model,))
            thread.start()

        return marshal(model, fields.model_fields)


class ModelHubModelFinetuneDeleteApi(Resource):
    @login_required
    def delete(self, model_id, finetune_model_id):
        """删除微调模型。
        
        Args:
            model_id (int): 基础模型ID。
            finetune_model_id (int): 微调模型ID。
            
        Returns:
            dict: 删除操作的结果。
        """
        self.check_can_admin()
        model = Lazymodel.query.get(model_id)
        # self.check_can_admin_object(model)
        if model.model_type == "local":
            fine_model = Lazymodel.query.get(finetune_model_id)
            self.check_can_admin_object(fine_model)
        else:
            online_model = LazymodelOnlineModels.query.get(finetune_model_id)
            self.check_can_admin_object(online_model)
        service = ModelService(current_user)
        return service.delete_finetune_model(model_id, finetune_model_id)


class ModelHubModelFinetuneListApi(Resource):
    @login_required
    def post(self):
        """获取微调模型分页列表。
        
        Args:
            model_id (str, optional): 模型ID筛选条件。默认为0。
            online_model_id (str, optional): 在线模型ID筛选条件。默认为0。
            page (int, optional): 页码。默认为1。
            page_size (int, optional): 每页大小。默认为20。
            qtype (str, optional): 查询类型。默认为"already"。
            
        Returns:
            dict: 包含微调模型列表的分页数据，使用 finetune_pagination_fields 格式。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("model_id", type=str, default=0, location="json")
        parser.add_argument("online_model_id", type=str, default=0, location="json")
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument(
            "qtype", type=str, default="already", location="json", required=False
        )
        args = parser.parse_args()
        
        service = ModelService(current_user)
        
        # 如果提供了 model_id，检查用户是否有权限读取该基础模型
        if args.get("model_id") and args["model_id"] != 0:
            model = service.get_model_by_id(args["model_id"])
            if model:
                self.check_can_read_object(model)
        else:
            self.check_can_read()
        
        g.qtype = args["qtype"]
        g.current_user = current_user
        pagination = service.get_finetune_pagination(args, qtype=args["qtype"])
        return marshal(pagination, fields.finetune_pagination_fields)


class ModelHubOnlineModelSupportListApi(Resource):
    @login_required
    def get(self):
        """获取支持的在线模型列表。
        
        Returns:
            list: 支持的在线模型列表。
        """
        self.check_can_read()
        return online_model_list


class ModelUpdateOnlineModelListApi(Resource):
    @login_required
    def post(self):
        """更新在线模型列表。
        
        Args:
            base_model_id (int): 基础模型ID。
            qtype (str, optional): 查询类型。默认为"already"。
            
        Returns:
            dict: 更新操作的结果。
            
        Raises:
            CommonError: 当模型不存在时抛出。
        """
        self.check_can_write()
        parser = reqparse.RequestParser()
        parser.add_argument(
            "qtype", type=str, default="already", location="args", required=False
        )
        data = request.json
        model_id = data.get("base_model_id")
        service = ModelService(current_user)
        model = Lazymodel.query.get(model_id)
        if model is None:
            raise CommonError("模型不存在")
        if model.builtin_flag:
            model = Lazymodel(
                **{
                    key: value
                    for key, value in model.__dict__.items()
                    if not key.startswith("_")
                }
            )
            self.check_can_write_object(model)
        else:
            self.check_can_write_object(model)
        args = parser.parse_args()
        g.qtype = args["qtype"]
        g.current_user = current_user
        return service.update_online_model_list(data, qtype=args["qtype"])


class ModelHubExistModelListApi(Resource):
    @login_required
    def get(self):
        """获取已存在的第三方模型列表。
        
        Returns:
            list: 已存在的第三方模型列表。
        """
        self.check_can_read()
        # 读取第三方模型列表（从配置路径读取）
        service = ModelService(current_user)
        return service.exist_model_list()


class ModelHubDefaultIconListApi(Resource):
    @login_required
    def get(self):
        """获取默认图标列表。
        
        Returns:
            list: 默认图标列表。
        """
        self.check_can_read()
        # 读取默认图片路径）
        service = ModelService(current_user)
        return service.default_icon_list()


api.add_resource(modelHubListApi, "/mh/list")
api.add_resource(modelCreateApi, "/mh/create")
api.add_resource(ModelOnlineListApi, "/mh/create_online_model_list")
api.add_resource(ModelOnlineListDeleteApi, "/mh/delete_online_model_list")
api.add_resource(ModelHubUpdateApiKeyApi, "/mh/update_apikey")
api.add_resource(modelRetryDownloadApi, "/mh/retry_download/<int:model_id>")
api.add_resource(
    modelFinetuneRetryDownloadApi,
    "/mh/finetune_retry_download/<int:model_id>/<int:finetune_model_id>",
)
api.add_resource(ModelHubModelsTreeApi, "/mh/models_tree")
api.add_resource(modelHubUpdateApi, "/mh/update")
api.add_resource(modelHubDeleteApi, "/mh/delete")
api.add_resource(modelIconUploadApi, "/mh/upload/icon")
api.add_resource(modelHubUploadFileChunkApi, "/mh/upload/chunk")
api.add_resource(modelHubUploadFileMergeApi, "/mh/upload/merge")
api.add_resource(ModelHubDeleteUploadedFileApi, "/mh/delete_uploaded_file")
api.add_resource(modelHubCheckModelNameApi, "/mh/check/model_name")
api.add_resource(ModelHubModelInfoApi, "/mh/model_info/<int:model_id>")
api.add_resource(ModelCreateFinetuneApi, "/mh/create_finetune")
api.add_resource(
    ModelHubModelFinetuneDeleteApi,
    "/mh/delete_finetune_model/<int:model_id>/<int:finetune_model_id>",
)
api.add_resource(ModelHubModelFinetuneListApi, "/mh/finetune_model_page")
api.add_resource(ModelHubOnlineModelSupportListApi, "/mh/online_model_support_list")
api.add_resource(ModelUpdateOnlineModelListApi, "/mh/update_online_model_list")
api.add_resource(ModelHubExistModelListApi, "/mh/exist_model_list")
api.add_resource(ModelHubDefaultIconListApi, "/mh/default_icon_list")
