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

from flask import jsonify, request
from flask_login import current_user

from core.restful import Resource
from libs.feature_gate import require_internet_feature
from libs.helper import build_response
from libs.login import login_required
from models.model_account import Account
from parts.urls import api

from ..models_hub.model import Lazymodel
from ..models_hub.model_list import ams_model_list
from .model import InferModelService, InferModelServiceGroup
from .service import InferService


def generate_ams_local_model_list():
    """从ams_model_list生成ams_local_model_list。

    将ams_model_list中的模型按model_kind分组，生成本地模型列表。

    Returns:
        dict: 按model_kind分组的模型列表字典。

    Raises:
        Exception: 当处理模型列表时出现错误时抛出异常。
    """
    ams_local_model_list = {}

    for model in ams_model_list:
        model_kind = model.get("model_kind")
        model_name = model.get("name")

        if model_kind not in ams_local_model_list:
            ams_local_model_list[model_kind] = []

        ams_local_model_list[model_kind].append({"model_name": model_name, "id": 0})

    return ams_local_model_list


# 从ams_model_list生成ams_local_model_list
ams_local_model_list = generate_ams_local_model_list()


class ListService(Resource):
    """推理服务列表控制器。

    提供推理服务的查询和分页功能。
    """

    def __init__(self):
        """初始化推理服务列表控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def post(self):
        """处理POST请求，分页获取推理服务列表。

        解析请求中的分页参数，调用InferService获取服务列表和分页信息。

        Returns:
            dict: 包含服务列表和分页信息的响应字典。

        Raises:
            Exception: 当获取服务列表失败时抛出异常。
        """
        data = request.get_json() or {}  # 处理请求体为空的情况

        self.check_can_read()

        page = data.get("page", 1)
        per_page = data.get("per_page", 10)
        qtype = data.get("qtype", "already")
        search_name = data.get("search_name", "")  # 默认空字符串
        status = data.get("status", [])
        user_id = data.get("user_id", [])
        tenant = data.get("tenant", "")
        # 调用InferService获取服务列表和分页信息
        result, pagination_info = self.infer_service.list_infer_model_service(
            page=page, per_page=per_page, qtype=qtype, search_name=search_name, status=status, user_id=user_id, tenant=tenant
        )

        return build_response(
            result={
                "total": pagination_info["total"],
                "pages": pagination_info["pages"],
                "current_page": pagination_info["current_page"],
                "next_page": pagination_info["next_page"],
                "prev_page": pagination_info["prev_page"],
                "result": result,
            }
        )


class CloudServiceStatusApi(Resource):
    """cloud-service 状态查询接口。"""

    @login_required
    def get(self):
        self.check_can_read()
        
        infer_service = InferService()
        enabled, message = infer_service.is_cloud_service_available()
        return {"enabled": enabled, "message": message}


class CreateServiceGroup(Resource):
    """创建服务组控制器。

    提供推理服务组的创建功能。
    """

    def __init__(self):
        """初始化创建服务组控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    @require_internet_feature("推理服务")
    def post(self):
        """处理POST请求，创建推理服务组。

        验证模型信息，检查AMS支持，创建服务组。

        Returns:
            dict: 创建结果的响应字典。

        Raises:
            ValueError: 当模型不存在或AMS不支持时抛出异常。
        """
        try:
            self.check_can_write()          
            # 获取请求中的JSON数据
            data = request.get_json()
            # 从JSON数据中获取模型名称
            model_id = data.get("model_id")
            
            # 根据模型名称查询对应的模型记录
            model_info = Lazymodel.query.get(model_id)
            # 如果模型不存在，返回404错误
            if not model_info:
                return build_response(status=400, message="model not found")
            logging.info(f"CreateServiceGroup model_name: {model_info.model_name}")

            # 将新建的服务信息以JSON格式返回
            self.infer_service.create_infer_model_service_group(
                data.get("model_type"),
                data.get("model_id"),
                model_info.model_name,
                data.get("services"),
            )
            return build_response(message="Group created successfully")
        except ValueError as e:
            return build_response(message=str(e), status=400)


class CreateService(Resource):
    """创建服务控制器。

    提供推理服务的创建功能。
    """

    def __init__(self):
        """初始化创建服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    @require_internet_feature("推理服务")
    def post(self):
        """处理POST请求，创建推理服务。

        验证权限，创建推理服务。

        Returns:
            dict: 创建结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务组不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 从JSON数据中获取模型名称
        group_id = data.get("group_id")
        
        # 根据模型名称查询对应的模型记录
        group_info = InferModelServiceGroup.query.get(group_id)
        # 如果模型不存在，返回404错误
        if not group_info:
            return build_response(status=400, message="Group not found")
        # 检查权限
        self.check_can_write_object(group_info)
        if group_info.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            group_info.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        # 将新建的服务信息以JSON格式返回
        self.infer_service.create_infer_model_service(
            data.get("group_id"), group_info.model_id, data.get("services")
        )
        return build_response(message="Service created successfully")


class StartServiceGroup(Resource):
    """启动服务组控制器。

    提供推理服务组的启动功能。
    """

    def __init__(self):
        """初始化启动服务组控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    @require_internet_feature("推理服务")
    def post(self):
        """处理POST请求，启动推理服务组。

        验证权限，启动服务组中的所有服务。

        Returns:
            dict: 启动结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务组不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 根据服务ID查询对应的服务记录
        group_info = InferModelServiceGroup.query.get(data.get("group_id"))
        # 如果服务不存在，返回404错误
        if not group_info:
            return build_response(status=400, message="Group not found")
        # 检查权限
        self.check_can_write_object(group_info)
        if group_info.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            group_info.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        start_service_group_result = self.infer_service.start_service_group(
            data.get("group_id")
        )
        if start_service_group_result:
            # # 返回操作成功的消息
            return build_response(message="Service started successfully")
        return build_response(message="Service started failed")


class StartService(Resource):
    """启动服务控制器。

    提供推理服务的启动功能。
    """

    def __init__(self):
        """初始化启动服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    @require_internet_feature("推理服务")
    def post(self):
        """处理POST请求，启动推理服务。

        验证权限，启动指定的推理服务。

        Returns:
            dict: 启动结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 根据服务ID查询对应的服务记录
        service = InferModelService.query.get(data.get("service_id"))
        # 如果服务不存在，返回404错误
        if not service:
            return build_response(status=400, message="Service not found")
        # 检查权限
        self.check_can_write_object(service)
        if service.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            service.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        # 启动推理服务
        start_service_result = self.infer_service.start_service(data.get("service_id"))
        if start_service_result:
            # # 返回操作成功的消息
            return build_response(message="Service started successfully")
        return build_response(message="Service started failed")


class StopService(Resource):
    """停止服务控制器。

    提供推理服务的停止功能。
    """

    def __init__(self):
        """初始化停止服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def post(self):
        """处理POST请求，停止推理服务。

        验证权限，停止指定的推理服务。

        Returns:
            dict: 停止结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 根据服务ID查询对应的服务记录
        service = InferModelService.query.get(data.get("service_id"))
        # 如果服务不存在，返回404错误
        if not service:
            return build_response(status=400, message="Service not found")
        # 检查权限
        self.check_can_write_object(service)
        if service.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            service.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        stop_service_result = self.infer_service.stop_service(data.get("service_id"))
        if stop_service_result:
            # # 返回操作成功的消息
            return build_response(message="Service stopped successfully")
        return build_response(message="Service stopped failed")


class DeleteService(Resource):
    """删除服务控制器。

    提供推理服务的删除功能。
    """

    def __init__(self):
        """初始化删除服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def post(self):
        """处理POST请求，删除推理服务。

        验证权限，删除指定的推理服务。

        Returns:
            dict: 删除结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 根据服务ID查询对应的服务记录
        service = InferModelService.query.get(data.get("service_id"))
        # 如果服务不存在，返回404错误
        if not service:
            return build_response(status=400, message="Service not found")
        # 检查权限
        self.check_can_write_object(service)
        if service.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            service.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        # 如果服务不存在，返回404错误
        if not service:
            return build_response(status=400, message="Service not found")
        delete_infer_model_service_result = (
            self.infer_service.delete_infer_model_service(data.get("service_id"))
        )
        if delete_infer_model_service_result:
            # 返回操作成功的消息
            return build_response(message="Service deleted successfully")
        return build_response(message="Service deleted failed")


class CloseServiceGroup(Resource):
    """关闭服务组控制器。

    提供推理服务组的关闭功能。
    """

    def __init__(self):
        """初始化关闭服务组控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def post(self):
        """处理POST请求，关闭推理服务组。

        验证权限，关闭服务组中的所有服务。

        Returns:
            dict: 关闭结果的响应字典。

        Raises:
            ValueError: 当权限不足或服务组不存在时抛出异常。
        """
        # 获取请求中的JSON数据
        data = request.get_json()
        # 根据服务ID查询对应的服务记录
        group_info = InferModelServiceGroup.query.get(data.get("group_id"))
        if group_info.tenant_id != current_user.current_tenant_id:
            return build_response(status=400, message="当前用户无权限操作")
        if (
            group_info.created_by == Account.get_administrator_id()
            and current_user.id != Account.get_administrator_id()
        ):
            return build_response(status=400, message="当前用户无权限操作")
        # 如果服务不存在，返回404错误
        if not group_info:
            return build_response(status=400, message="Group not found")
        
        # 检查用户是否有权限关闭该服务组（需要对该服务组有写权限）
        self.check_can_write_object(group_info)
        close_service_group_result = self.infer_service.close_service_group(
            data.get("group_id")
        )
        if close_service_group_result:
            # 返回操作成功的消息
            return build_response(message="Service deleted successfully")
        return build_response(message="Service deleted failed")


class ModelListService(Resource):
    """模型列表服务控制器。

    提供模型列表的查询功能。
    """

    def __init__(self):
        """初始化模型列表服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def get(self):
        """处理GET请求，获取模型列表。

        根据查询参数获取本地模型列表，包括微调模型。

        Returns:
            list: 模型列表。

        Raises:
            Exception: 当获取模型列表失败时抛出异常。
        """
        model_type = request.args.get("model_type", "local", type=str)
        model_kind = request.args.get("model_kind", "", type=str)
        qtype = request.args.get("qtype", "", type=str)
        
        self.check_can_read()
 
        res = self.infer_service.list_local_model(qtype, model_kind, model_type)
        ams_local_model_list_original = ams_local_model_list.get(model_type, [])
        used_model_ids = self.infer_service._get_used_infer_model_ids()

        filters = []
        filters.append(Lazymodel.model_from == "finetune")
        models = (
            Lazymodel.query.filter(*filters)
            .with_entities(
                Lazymodel.id,
                Lazymodel.model_name,
                Lazymodel.model_key,
                Lazymodel.builtin_flag,
            )
            .all()
        )
        for model_id, model_name, model_key, builtin_flag in models:
            logging.info(
                f"ModelListService model_id: {model_id}, model_name: {model_name}, model_key: {model_key}"
            )
            for ams_model in ams_local_model_list_original:
                if ams_model["model_name"] == model_key:
                    ams_support_model_name = model_key + ":" + model_name
                    ams_support_model_id = model_id
                    ams_support_model_map = {}
                    ams_support_model_map["model_name"] = ams_support_model_name
                    ams_support_model_map["id"] = ams_support_model_id
                    ams_support_model_map["need_confirm"] = (not builtin_flag) and (
                        model_id not in used_model_ids
                    )
                    res.append(ams_support_model_map)

        logging.info(f"ModelListService res: {res}")
        return res


class ListForDrawService(Resource):
    """绘图服务列表控制器。

    提供绘图相关的在线模型查询功能。
    """

    def __init__(self):
        """初始化绘图服务列表控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def get(self):
        """处理GET请求，获取在线模型列表。

        获取可用于绘图的在线推理服务列表。

        Returns:
            dict: 包含在线模型列表的响应字典。

        Raises:
            Exception: 当获取在线模型列表失败时抛出异常。
        """
        model_kind = request.args.get("model_kind", "", type=str)
        
        self.check_can_read()

        result, pagination_info = self.infer_service.list_infer_model_service(
            page=None,
            per_page=None,
            qtype="already",
            search_name=None,
            status=["Ready"],
            model_kind=model_kind,
            is_draw=True,
        )

        return build_response(result={"result": result})


class AMSModelListService(Resource):
    """AMS模型列表服务控制器。

    提供AMS支持的本地模型列表查询功能。
    """

    def __init__(self):
        """初始化AMS模型列表服务控制器。

        Returns:
            None: 无返回值。
        """
        self.infer_service = InferService()

    @login_required
    def get(self):
        """处理GET请求，获取AMS支持的本地模型列表。

        根据模型类型获取AMS支持的本地模型列表，包括微调模型。

        Returns:
            list: AMS支持的模型列表。

        Raises:
            Exception: 当获取AMS模型列表失败时抛出异常。
        """
        model_type = request.args.get("model_type", "", type=str)
        
        self.check_can_read()

        if model_type == "localLLM":
            used_model_ids = self.infer_service._get_used_infer_model_ids()

            base_list = [
                {**item, "need_confirm": False}
                for item in ams_local_model_list.get(model_type, [])
            ]
            ams_local_model_list_original = ams_local_model_list.get(model_type, [])

            filters = []
            filters.append(Lazymodel.model_from == "finetune")
            models = (
                Lazymodel.query.filter(*filters)
                .with_entities(
                    Lazymodel.id,
                    Lazymodel.model_name,
                    Lazymodel.model_key,
                    Lazymodel.builtin_flag,
                )
                .all()
            )
            for model_id, model_name, model_key, builtin_flag in models:
                logging.info(
                    f"AMSModelListService model_id: {model_id}, model_name: {model_name}, model_key: {model_key}"
                )
                for ams_model in ams_local_model_list_original:
                    if ams_model["model_name"] == model_key:
                        ams_support_model_name = model_key + ":" + model_name
                        ams_support_model_map = {
                            "model_name": ams_support_model_name,
                            "id": model_id,
                            "need_confirm": (not builtin_flag)
                            and (model_id not in used_model_ids),
                        }
                        base_list.append(ams_support_model_map)

            logging.info(f"AMSModelListService res_list: {base_list}")
            return base_list
        else:
            return [
                {**item, "need_confirm": False}
                for item in ams_local_model_list.get(model_type, [])
            ]


api.add_resource(ListService, "/infer-service/list")
api.add_resource(ModelListService, "/infer-service/model/list")
api.add_resource(CreateServiceGroup, "/infer-service/group/create")
api.add_resource(CreateService, "/infer-service/service/create")
api.add_resource(StartServiceGroup, "/infer-service/group/start")
api.add_resource(CloseServiceGroup, "/infer-service/group/close")
api.add_resource(StartService, "/infer-service/service/start")
api.add_resource(StopService, "/infer-service/service/stop")
api.add_resource(DeleteService, "/infer-service/service/delete")
api.add_resource(ListForDrawService, "/infer-service/list/draw")
api.add_resource(AMSModelListService, "/infer-service/model/list/ams")
api.add_resource(CloudServiceStatusApi, "/infer-service/cloud/status")
