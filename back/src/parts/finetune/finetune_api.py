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

import threading

from flask import Response, current_app, g, request
from flask_login import current_user
from flask_restful import inputs, marshal, reqparse

from core.restful import Resource
from libs.feature_gate import require_internet_feature
from libs.login import login_required
from parts.finetune.finetune_service import FinetuneService
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db

from ..data.data_service import DataService
from ..models_hub.service import ModelService
from . import fields
from .model import FinetuneTask
from .schema import FinetuneCreateSchema


class FinetuneListApi(Resource):
    @login_required
    @require_internet_feature("发布模型微调")
    def post(self):
        """创建微调任务。

        接收微调任务配置信息，创建新的微调任务。

        Args:
            base (dict): 基础配置信息
                name (str): 任务名称
                base_model (str): 基础模型uuid，调用ft接口后固定传0
                base_model_key (str): 调用ft接口获取的模型名字
                target_model_name (str): 微调后的模型名称
                created_from_info (str): 创建来源
                datasets (list): 数据集uuids
                datasets_type (list): 数据集类型
                finetuning_type (str): 微调类型 LoRA, QLoRA, Full
            finetune_config (dict): 微调配置信息
                num_gpus (int): GPU数量
                training_type (str): 训练模式 PT, SFT, RM, PPO, DPO
                val_size (float): 验证集占比
                num_epochs (int): 重复次数
                learning_rate (float): 学习率
                lr_scheduler_type (str): 学习率调整策略
                batch_size (int): 批次大小
                cutoff_len (str): 序列最大长度
                lora_r (int): LoRa秩
                lora_rate (int): 微调占比

        Returns:
            dict: 创建的微调任务详细信息

        Raises:
            ValidationError: 当输入数据验证失败时
            CommonError: 当创建任务失败时
        """
        self.check_can_write()       
        data = request.get_json()
        schema = FinetuneCreateSchema(context={"data": data})
        data = schema.load(data)
        data["base"]["base_model_key"], data["base"]["base_model_key_ams"] = data[
            "base"
        ]["base_model_key"].split(":")
        service = FinetuneService(current_user)
        result = marshal(service.create_task(data), fields.finetune_detail_fields)
        result["base_model_name"] = data["base"]["base_model_key"]
        LogService().add(
            Module.MODEL_FINETUNE, Action.CREATE_FINETUNE_TASK, task_name=result["name"]
        )

        return result


class FinetuneListPageApi(Resource):
    @login_required
    def post(self):
        """获取微调任务分页列表。

        根据查询条件获取微调任务的分页列表。

        Args:
            page (int): 页码，默认为1
            limit (int): 每页数量，默认为20
            qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
            search_name (str): 搜索名称
            status (list): 状态过滤列表
            user_id (list): 用户ID过滤列表

        Returns:
            dict: 分页的微调任务列表

        Raises:
            ValueError: 当分页参数无效时
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=inputs.int_range(1, 99999),
            required=False,
            default=1,
            location="json",
        )
        parser.add_argument(
            "limit",
            type=inputs.int_range(1, 100),
            required=False,
            default=20,
            location="json",
        )
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="already"
        )  # mine/group/builtin/already
        parser.add_argument("search_name", type=str, location="json", required=False)
        parser.add_argument(
            "status", type=list, location="json", required=False, default=[]
        )
        parser.add_argument(
            "user_id", type=list, location="json", required=False, default=[]
        )
        args = parser.parse_args()
        
        self.check_can_read()
        
        client = FinetuneService(current_user)
        pagination = client.get_paginate_tasks(current_user, args)
        return marshal(pagination, fields.finetune_pagination_fields)


class FinetuneDeleteApi(Resource):

    @login_required
    def delete(self, task_id):
        """删除微调任务。

        删除指定的微调任务。

        Args:
            task_id (int): 微调任务ID

        Returns:
            tuple: (响应消息, HTTP状态码)
                成功: ({"message": "success", "code": 200}, 200)
                失败: ({"message": "delete fail", "code": 400}, 400)

        Raises:
            PermissionError: 当用户没有删除权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_admin_object(task)
        client = FinetuneService(current_user)
        res = client.delete_task(task_id)
        if res:
            return {"message": "success", "code": 200}, 200
        else:
            return {"message": "delete fail", "code": 400}, 400


class FinetuneCancelApi(Resource):
    @login_required
    def delete(self, task_id):
        """取消微调任务。

        取消正在进行的微调任务。

        Args:
            task_id (int): 微调任务ID

        Returns:
            tuple: (响应消息, HTTP状态码)
                成功: ({"message": "success", "code": 200}, 200)
                失败: ({"message": "cancel fail", "code": 400}, 400)

        Raises:
            PermissionError: 当用户没有取消权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_write_object(task)
        client = FinetuneService(current_user)
        res = client.cancel_task(task_id)
        if res:
            return {"message": "success", "code": 200}, 200
        else:
            return {"message": "cancel fail", "code": 400}, 400


class FinetuneDetailApi(Resource):
    @login_required
    def get(self, task_id):
        """获取微调任务详细信息。

        获取指定微调任务的详细信息。

        Args:
            task_id (int): 微调任务ID

        Returns:
            dict: 微调任务的详细信息

        Raises:
            PermissionError: 当用户没有读取权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_read_object(task)
        service = FinetuneService(current_user)
        return service.detail_finetune(task_id)


class FinetuneCustomParamApi(Resource):
    @login_required
    def get(self):
        """获取自定义参数列表。

        获取当前用户的自定义参数列表。

        Returns:
            list: 自定义参数列表

        Raises:
            Exception: 当获取参数列表失败时
        """
        self.check_can_read()
        service = FinetuneService(current_user)
        list = service.get_custom_param()
        return marshal(list, fields.finetune_param_fields)

    @login_required
    def post(self):
        """保存自定义参数。

        保存用户的自定义参数配置。

        Args:
            data (dict): 自定义参数配置数据

        Returns:
            dict: 保存的自定义参数信息

        Raises:
            ValidationError: 当参数数据验证失败时
            Exception: 当保存参数失败时
        """
        self.check_can_write()
        data = request.get_json()
        service = FinetuneService(current_user)
        config = service.save_custom_param(data)
        return marshal(config, fields.finetune_param_fields)

    @login_required
    def delete(self):
        """删除自定义参数。

        删除指定的自定义参数记录。

        Args:
            record_id (int): 记录ID，默认为0

        Returns:
            tuple: (响应消息, HTTP状态码)
                成功: ({"message": "success", "code": 200}, 200)
                失败: ({"message": "delete fail", "code": 400}, 400)

        Raises:
            ValueError: 当记录ID无效时
            Exception: 当删除失败时
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "record_id", type=int, required=False, default=0, location="args"
        )
        args = parser.parse_args()
        
        self.check_can_write()
        
        service = FinetuneService(current_user)
        res = service.del_custom_param(args["record_id"])
        if res:
            return {"message": "success", "code": 200}, 200
        else:
            return {"message": "delete fail", "code": 400}, 400


class FinetuneModelApi(Resource):
    @login_required
    def get(self):
        """获取可用于微调的模型列表。

        根据查询类型获取可用于微调的模型列表。

        Args:
            qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already

        Returns:
            list: 模型列表

        Raises:
            ValueError: 当查询类型无效时
            Exception: 当获取模型列表失败时
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "qtype", type=str, location="args", required=True, default="already"
        )  # mine/group/builtin/already
        args = parser.parse_args()
        
        self.check_can_read()
        
        g.qtype = args["qtype"]
        if g.qtype == "mine":
            g.qtype = "mine_builtin"
        g.current_user = current_user
        modelService = ModelService(current_user)
        return modelService.get_models(
            account=current_user,
            model_type=None,
            model_kind=None,
            model_kinds=[],
            can_finetune=True,
            args=args,
        )


class FinetuneDatasetApi(Resource):
    @login_required
    def get(self):
        """获取可用于微调的数据集列表。

        根据查询类型获取可用于微调的数据集列表。

        Args:
            qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already

        Returns:
            dict: 数据集树形结构

        Raises:
            ValueError: 当查询类型无效时
            Exception: 当获取数据集列表失败时
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "qtype", type=str, location="args", required=True, default="already"
        )  # mine/group/builtin/already
        args = parser.parse_args()
        
        self.check_can_read()
        
        dataService = DataService(current_user)
        return dataService.get_data_tree(qtype=args["qtype"])


class FinetuneLogApi(Resource):
    @login_required
    def get(self, task_id):
        """获取微调任务日志。

        获取指定微调任务的日志内容。

        Args:
            task_id (int): 微调任务ID

        Returns:
            Response: 日志文件响应，包含日志内容

        Raises:
            PermissionError: 当用户没有读取权限时
            FileNotFoundError: 当日志文件不存在时
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id,).first()
        self.check_can_read_object(task)
        service = FinetuneService(current_user)
        headers = {
            "Content-Disposition": "attachment; filename=finetune.log",
            "Content-Type": "text/plain; charset=utf-8",
        }
        return Response(service.task_logs(task_id), headers=headers)


class FinetuneStartApi(Resource):
    @login_required
    def get(self, task_id):
        """启动微调任务。

        异步启动指定的微调任务。

        Args:
            task_id (int): 微调任务ID

        Returns:
            bool: 启动操作是否成功

        Raises:
            ValueError: 当任务不存在时
            Exception: 当启动任务失败时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        if task:
            self.check_can_write_object(task)

        def async_task(app):
            with app.app_context():
                service = FinetuneService(current_user)
                service.start_task(task_id)

        thread = threading.Thread(
            target=async_task, args=(current_app._get_current_object(),)
        )
        thread.start()
        return True

        # return service.start_task(task_id)


class FinetunePauseApi(Resource):
    @login_required
    def get(self, task_id):
        """暂停微调任务。

        暂停正在进行的微调任务。

        Args:
            task_id (int): 微调任务ID

        Returns:
            tuple: (响应消息, HTTP状态码)
                成功: ({"message": "操作成功", "code": 200}, 200)
                失败: ({"message": "停止失败，请重试。", "code": 400}, 400)

        Raises:
            PermissionError: 当用户没有暂停权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_write_object(task)
        service = FinetuneService(current_user)
        res = service.pause_task(task_id)
        if res:
            return {"message": "操作成功", "code": 200}, 200
        else:
            return {"message": "停止失败，请重试。", "code": 400}, 400


class FinetuneResumeApi(Resource):
    @login_required
    def get(self, task_id):
        """恢复微调任务。

        恢复已暂停的微调任务。

        Args:
            task_id (int): 微调任务ID

        Returns:
            tuple: (响应消息, HTTP状态码)
                成功: ({"message": "操作成功", "code": 200}, 200)
                失败: ({"message": "启动失败，请重试。", "code": 400}, 400)

        Raises:
            PermissionError: 当用户没有恢复权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_write_object(task)
        service = FinetuneService(current_user)
        res = service.resume_task(task_id)
        if res:
            return {"message": "操作成功", "code": 200}, 200
        else:
            return {"message": "启动失败，请重试。", "code": 400}, 400


class FinetuneRunningMetricsApi(Resource):
    @login_required
    def get(self, task_id):
        """获取微调任务运行指标。

        获取指定微调任务的实时运行指标。

        Args:
            task_id (int): 微调任务ID

        Returns:
            tuple: (响应数据, HTTP状态码)
                成功: (指标数据, 200)
                失败: ({"message": "get_running_metrics fail", "code": 400}, 400)

        Raises:
            PermissionError: 当用户没有读取权限时
            ValueError: 当任务不存在时
        """
        task = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.id == task_id,
            )
            .first()
        )
        self.check_can_read_object(task)
        service = FinetuneService(current_user)
        resume_task_result, resume_task_return = service.get_running_metrics(task_id)
        if resume_task_result:
            return resume_task_return, 200
        else:
            return {"message": "get_running_metrics fail", "code": 400}, 400


class FinetuneFTModelApi(Resource):
    @login_required
    def get(self):
        """获取FT模型列表。

        获取可用的FT模型列表。

        Returns:
            tuple: (响应数据, HTTP状态码)
                成功: ({"message": "success", "code": 200, "data": 模型列表}, 200)
                失败: ({"message": "failed", "code": 400, "data": 错误信息}, 400)

        Raises:
            Exception: 当获取模型列表失败时
        """
        self.check_can_read()
        service = FinetuneService(current_user)
        get_ft_model_list_result, get_ft_model_list_return = service.get_ft_models()
        if get_ft_model_list_result:
            return {
                "message": "success",
                "code": 200,
                "data": get_ft_model_list_return,
            }, 200
        return {"message": "failed", "code": 400, "data": get_ft_model_list_return}, 400


api.add_resource(FinetuneListApi, "/finetune")
api.add_resource(FinetuneListPageApi, "/finetune/list/page")
api.add_resource(FinetuneDeleteApi, "/finetune/delete/<int:task_id>")
api.add_resource(FinetuneCancelApi, "/finetune/cancel/<int:task_id>")
api.add_resource(FinetuneDetailApi, "/finetune/detail/<int:task_id>")
api.add_resource(FinetuneStartApi, "/finetune/start/<int:task_id>")
api.add_resource(FinetuneModelApi, "/finetune/models")
api.add_resource(FinetuneDatasetApi, "/finetune/datasets")
api.add_resource(FinetuneCustomParamApi, "/finetune_param")
api.add_resource(FinetuneLogApi, "/finetune/log/<int:task_id>")

api.add_resource(FinetunePauseApi, "/finetune/pause/<int:task_id>")
api.add_resource(FinetuneResumeApi, "/finetune/resume/<int:task_id>")
api.add_resource(FinetuneRunningMetricsApi, "/finetune/running_metrics/<int:task_id>")
api.add_resource(FinetuneFTModelApi, "/finetune/ft/models")
