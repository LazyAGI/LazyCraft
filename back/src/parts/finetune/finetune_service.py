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
import os
import threading

import requests
from flask import copy_current_request_context, current_app
from flask_restful import marshal

from core.account_manager import CommonError
from libs.helper import generate_random_string
from libs.timetools import TimeTools
from models.model_account import Account, Tenant
from parts.data.model import DataSetVersion
from parts.finetune.model import FinetuneCustomParam, FinetuneTask, TaskStatus
from parts.logs import Action, LogService, Module
from parts.models_hub.model import Lazymodel, ModelStatus, get_finetune_model_list
from utils.util_database import db
from utils.util_storage import storage

from . import fields


class FinetuneService:
    """微调服务类，负责管理模型微调任务。

    该服务提供微调任务的创建、启动、暂停、恢复、删除等操作，
    以及任务状态查询、日志获取等功能。

    Attributes:
        model_cls: 微调任务模型类。
        account (Account): 当前账户对象。
    """

    model_cls = FinetuneTask

    def __init__(self, account):
        """初始化微调服务。

        Args:
            account (Account): 账户对象。

        Returns:
            None: 无返回值。
        """
        self.account = account

    def get_paginate_tasks(self, account, args):
        """获取分页的微调任务列表。

        Args:
            account (Account): 账户对象。
            args (dict): 查询参数，包含：
                - search_name (str, optional): 搜索名称。
                - status (list, optional): 状态列表。
                - user_id (list, optional): 用户ID列表。
                - qtype (str, optional): 查询类型，支持"mine"、"group"、"builtin"、"already"。
                - page (int): 页码。
                - limit (int): 每页数量。

        Returns:
            Pagination: 分页结果对象。

        Raises:
            Exception: 计算训练时间时可能抛出异常。
        """
        model_cls = self.model_cls
        filters = [model_cls.deleted_flag == 0]
        if args.get("search_name"):
            search_name = args["search_name"][:30]
            filters.append(model_cls.name.ilike(f"%{search_name}%"))
        if args.get("status"):
            filters.append(model_cls.status.in_(args["status"]))
        if args.get("user_id"):
            filters.append(model_cls.created_by.in_(args["user_id"]))

        if args.get("qtype") == "mine":  # 我的应用(包含草稿)
            filters.append(model_cls.tenant_id == account.current_tenant_id)
            filters.append(model_cls.created_by == account.id)
        elif args.get("qtype") == "group":  # 同组应用(包含草稿)
            filters.append(model_cls.tenant_id == account.current_tenant_id)
            filters.append(model_cls.created_by != account.id)
        elif args.get("qtype") == "builtin":  # 内置的应用
            filters.append(model_cls.created_by == Account.get_administrator_id())
        elif args.get("qtype") == "already":  # 混合了前3者的数据
            from sqlalchemy import or_

            filters.append(
                or_(
                    model_cls.tenant_id == account.current_tenant_id,
                    model_cls.created_by == Account.get_administrator_id(),
                )
            )
        pagination = db.paginate(
            db.select(model_cls).where(*filters).order_by(model_cls.created_at.desc()),
            page=args["page"],
            per_page=args["limit"],
            error_out=False,
        )
        for i in pagination.items:
            if i.created_by and i.created_by == Account.get_administrator_id():
                i.user_name = "Lazy LLM官方"
                if i.created_by_account:
                    i.created_by_account.name = "Lazy LLM官方"
            else:
                i.user_name = getattr(db.session.get(Account, i.created_by), "name", "")
            # 如果i中的train_runtime为空，则使用i.created_at值与当前系统时间计算差值，并转换为秒，取整，放入i.train_runtime
            if i.train_runtime is None or i.train_runtime < 1:
                try:
                    # 将带时区的当前时间转换为naive datetime进行比较
                    current_time_naive = TimeTools.get_china_now(output="dt").replace(
                        tzinfo=None
                    )
                    i.train_runtime = int(
                        (current_time_naive - i.created_at).total_seconds()
                    )
                except Exception as e:
                    logging.info(f"get_paginate_tasks error: {e}")
                    i.train_runtime = 0
        return pagination

    def delete_task(self, task_id):
        """删除微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            CommonError: 当任务不存在时抛出异常。
        """
        task = (
            db.session.query(self.model_cls)
            .filter(
                self.model_cls.id == task_id,
            )
            .first()
        )
        if task is None:
            raise CommonError("不存在这条记录")
        task.deleted_flag = 1
        db.session.commit()
        LogService().add(
            Module.MODEL_FINETUNE, Action.DELETE_FINETUNE_TASK, task_name=task.name
        )
        self._del_task_process(task_id=task.id)
        return True

    def cancel_task(self, task_id):
        """取消微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            tuple: (bool, str) 取消结果元组，包含：
                - bool: 是否成功取消
                - str: 成功时为空字符串，失败时为错误信息

        Raises:
            None: 无异常抛出。
        """
        task = (
            db.session.query(self.model_cls)
            .filter(
                self.model_cls.id == task_id,
            )
            .first()
        )
        if task.status in [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value]:
            task.status = TaskStatus.CANCEL.value
            # 非超级管理员才需要释放GPU资源
            account = Account.default_getone(task.created_by)
            if not account.is_super:
                tenant = db.session.query(Tenant).filter_by(id=task.tenant_id).first()
                if tenant and tenant.gpu_used > 0:
                    tenant.gpu_used -= 1
            db.session.commit()
            self._del_task_process(task_id=task_id)
        else:
            return False, "current task status does not support cancel operation"

        return True, ""

    def _del_task_process(self, task_id):
        """删除任务进程，释放GPU资源并取消异步任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。
        """
        from tasks.finetune_task import cancel_task

        # 获取任务和租户信息
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task:
            # 非超级管理员才需要释放GPU资源
            account = Account.default_getone(task.created_by)
            if not account.is_super:
                tenant = db.session.query(Tenant).filter_by(id=task.tenant_id).first()
                if tenant and tenant.gpu_used > 0:
                    tenant.gpu_used -= 1
                    db.session.commit()
        # 执行原有的取消任务逻辑
        cancel_task.apply_async(kwargs={"task_id": task_id})

    def get_ft_models(self):
        """获取微调模型列表的包装方法。

        Returns:
            tuple: (bool, list) 获取结果元组，包含：
                - bool: 是否成功获取
                - list: 微调模型列表，失败时返回空列表（只包含已下载的模型）
        """
        get_ft_model_list_result, get_ft_model_list_return = get_finetune_model_list(only_model_key=False)
        if get_ft_model_list_result:
            model_names = [item.get("model") for item in get_ft_model_list_return if item.get("model")]
            builtin_map = {}
            downloaded_model_names = set()  # 已下载的模型名称集合
            if model_names:
                rows = (
                    db.session.query(Lazymodel.model_name, Lazymodel.builtin_flag, Lazymodel.model_status)
                    .filter(Lazymodel.model_name.in_(model_names))
                    .all()
                )
                # 构建 builtin_map 并记录已下载的模型
                for name, builtin, status in rows:
                    builtin_map[name] = builtin
                    if status == ModelStatus.SUCCESS.value:  # 只保留已下载的模型（model_status == 3）
                        downloaded_model_names.add(name)

            used_keys = {
                row[0]
                for row in db.session.query(FinetuneTask.base_model_key)
                .filter(
                    FinetuneTask.base_model_key.isnot(None),
                    FinetuneTask.deleted_flag == 0,
                )
                .distinct()
                .all()
                if row[0]
            }

            # 过滤掉未下载的模型
            filtered_ft_model_list = []
            for item in get_ft_model_list_return:
                name = item.get("model")
                if not name:
                    continue
                # 只保留已下载的模型
                if name in downloaded_model_names:
                    builtin_flag = builtin_map.get(name, False)
                    item["need_confirm"] = False if builtin_flag else (name not in used_keys)
                    filtered_ft_model_list.append(item)
            
            return get_ft_model_list_result, filtered_ft_model_list
        return get_ft_model_list_result, get_ft_model_list_return

    def create_task(self, config):
        """创建微调任务。

        Args:
            config (dict): 任务配置，包含：
                - finetune_config (dict): 微调配置。
                - base (dict): 基础配置，包含name、base_model_key、datasets_type、target_model_name等。

        Returns:
            FinetuneTask: 创建的微调任务对象。

        Raises:
            CommonError: 当GPU配额不足、任务名称冲突、模型名称冲突或基础模型不支持时抛出异常。
        """
        finetune_config = config["finetune_config"]

        # 获取当前用户
        account = Account.default_getone(self.account.id)

        # 非超级管理员才需要检查GPU配额
        if not account.is_super:
            # 添加 GPU 配额校验逻辑
            tenant = (
                db.session.query(Tenant)
                .filter_by(id=self.account.current_tenant_id)
                .first()
            )
            if not tenant.gpu_quota or tenant.gpu_quota <= 0:
                raise CommonError(
                    f"当前组内/个人空间已消耗{tenant.gpu_used}张显卡，当前再无余额。请联系超级管理员开放更多资源。"
                )

            if tenant.gpu_used >= tenant.gpu_quota:  # 直接判断是否还有可用配额
                raise CommonError(
                    f"当前组内/个人空间已消耗{tenant.gpu_used}张显卡，GPU配额已用完。请联系超级管理员开放更多资源。"
                )

        if config["base"]["created_from"] == 2:
            pass
        base = config["base"]
        s = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.tenant_id == self.account.current_tenant_id,
                FinetuneTask.name == base["name"],
                FinetuneTask.deleted_flag == 0,
            )
            .count()
        )
        if s > 0:
            raise CommonError("任务名称冲突")

        get_ft_model_list_result, get_ft_model_list_return = get_finetune_model_list(only_model_key=False)
        if not get_ft_model_list_result:
            raise CommonError("调用微调模型列表接口失败")
        if base["base_model_key"] not in [item["model"] for item in get_ft_model_list_return]:
            raise CommonError("微调模型列表不支持该基础模型")

        finetune_config["datasets_type"] = base["datasets_type"]
        name_exists = 0
        name_exists = (
            db.session.query(Lazymodel)
            .filter(
                Lazymodel.deleted_flag == 0,
                Lazymodel.tenant_id == self.account.current_tenant_id,
                Lazymodel.model_name == base["target_model_name"],
            )
            .count()
        )
        if name_exists > 0:
            raise CommonError("模型名称冲突")
        finetune_task = FinetuneTask()
        finetune_task.name = base["name"]
        finetune_task.base_model = base["base_model"]  # 0 in ft api
        finetune_task.base_model_key = base["base_model_key"]  # model name in ft api
        finetune_task.base_model_key_ams = base[
            "base_model_key_ams"
        ]  # model name in ft api
        finetune_task.target_model_name = base["target_model_name"]
        finetune_task.created_from_info = base["created_from_info"]
        finetune_task.datasets = json.dumps(base["datasets"])
        finetune_task.finetune_config = json.dumps(
            finetune_config
        )  # including datasets_type
        finetune_task.created_by = self.account.id
        finetune_task.tenant_id = self.account.current_tenant_id
        finetune_task.finetuning_type = base["finetuning_type"]
        finetune_task.created_at = TimeTools.get_china_now()
        finetune_task.updated_at = TimeTools.get_china_now()
        time_stamp = generate_random_string(8)

        finetune_task.is_online_model = False
        finetune_task.target_model_key = base["base_model_key"] + "-" + time_stamp
        db.session.add(finetune_task)
        db.session.commit()

        # 非超级管理员才需要增加GPU使用量
        if not account.is_super:
            tenant = (
                db.session.query(Tenant)
                .filter_by(id=self.account.current_tenant_id)
                .first()
            )
            tenant.gpu_used += 1  # 增加已使用的显卡数量
            db.session.commit()  # 提交更改

        @copy_current_request_context
        def async_start_task(task_id):
            app = current_app._get_current_object()
            with app.app_context():
                self.start_task(task_id=task_id)

        thread = threading.Thread(target=async_start_task, args=(finetune_task.id,))
        thread.start()
        return finetune_task

    def start_task(self, task_id):
        """启动微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        task.status = TaskStatus.IN_PROGRESS.value
        db.session.commit()
        from tasks.finetune_task import add_task

        add_task.apply_async(kwargs={"task_id": task_id})

    def detail_finetune(self, task_id):
        """获取微调任务详情。

        Args:
            task_id (int): 任务ID。

        Returns:
            dict: 微调任务详情字典。

        Raises:
            ValueError: 当任务不存在时抛出异常。
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task is None:
            raise ValueError("任务不存在")
        t = marshal(task, fields.finetune_detail_fields)
        t["base_model_name"] = task.base_model_key
        t.pop("log_path")
        if task.datasets:
            dIds = json.loads(task.datasets)
            datasets = db.session.query(DataSetVersion).filter(
                DataSetVersion.id.in_(dIds)
            )
            t["dataset_list"] = [
                {"id": i.id, "name": i.name, "version": i.version} for i in datasets
            ]
        return t

    def get_custom_param(self):
        """获取自定义微调参数列表（包含默认参数和用户自定义参数）。

        Returns:
            list: 自定义参数配置列表。
        """
        result = []
        LoRADefault = {
            "id": "l0",
            "name": "LoRA默认参数",
            "is_default": True,
            "finetune_config": {
                "training_type": "SFT",
                "val_size": 0.1,
                "num_epochs": 100,
                "learning_rate": 0.01,
                "lr_scheduler_type": "linear",
                "batch_size": 4,
                "cutoff_len": 1024,
                "lora_r": 8,
                "lora_rate": 10,
                "lora_alpha": 8,
                "num_gpus": 1,
            },
        }
        QLoRADefault = {
            "id": "l1",
            "is_default": True,
            "name": "QLoRA默认参数",
            "finetune_config": {
                "training_type": "SFT",
                "val_size": 0.1,
                "num_epochs": 100,
                "learning_rate": 0.01,
                "lr_scheduler_type": "linear",
                "batch_size": 10,
                "cutoff_len": 1024,
                "lora_r": 8,
                "lora_rate": 10,
                "lora_alpha": 8,
                "num_gpus": 1,
            },
        }
        customParamRecords = (
            db.session.query(FinetuneCustomParam)
            .filter(
                FinetuneCustomParam.deleted_flag == 0,
                FinetuneCustomParam.tenant_id == self.account.current_tenant_id,
                FinetuneCustomParam.created_by == self.account.id,
            )
            .all()
        )
        result.append(LoRADefault)
        result.append(QLoRADefault)
        for customParamRecord in customParamRecords:
            config_dict = customParamRecord.finetune_config_dict
            if "num_gpus" not in config_dict:
                config_dict["num_gpus"] = 1
            result.append(
                {
                    "id": customParamRecord.id,
                    "name": customParamRecord.name,
                    "is_default": False,
                    "finetune_config": {**config_dict},
                }
            )
        return result

    def del_custom_param(self, record_id):
        """删除自定义微调参数。

        Args:
            record_id (int): 参数记录ID。

        Returns:
            bool: 删除成功返回True。

        Raises:
            CommonError: 当记录不存在时抛出异常。
        """
        p = (
            db.session.query(FinetuneCustomParam)
            .filter(
                FinetuneCustomParam.created_by == self.account.id,
                FinetuneCustomParam.id == record_id,
                FinetuneCustomParam.deleted_flag == 0,
            )
            .first()
        )
        if p is None:
            raise CommonError("record not found")
        p.deleted_flag = 1
        db.session.commit()
        return True

    def save_custom_param(self, config):
        """保存自定义微调参数。

        Args:
            config (dict): 参数配置，包含name和finetune_config。

        Returns:
            FinetuneCustomParam: 新建的自定义参数记录。

        Raises:
            CommonError: 名称冲突或批处理大小与显卡数不整除时抛出异常。
        """
        e = (
            db.session.query(FinetuneCustomParam)
            .filter(
                FinetuneCustomParam.created_by == self.account.id,
                FinetuneCustomParam.deleted_flag == 0,
                FinetuneCustomParam.name == config["name"],
            )
            .first()
        )
        if e is not None:
            raise CommonError(f'{config["name"]}已被占用，请输入其他名称。')
        finetune_config = config["finetune_config"]
        num_gpus = finetune_config.get("num_gpus", 1)
        batch_size = finetune_config.get("batch_size", 1)
        if num_gpus > 0:
            if batch_size % num_gpus != 0:
                raise CommonError("批处理大小需要能被显卡数整除 ")
        record = FinetuneCustomParam()
        record.name = config["name"]
        record.deleted_flag = 0
        record.created_by = self.account.id
        record.tenant_id = self.account.current_tenant_id
        record.finetune_config = json.dumps(config["finetune_config"])
        db.session.add(record)
        db.session.commit()
        return record

    def task_logs(self, task_id):
        """获取微调任务日志流。

        Args:
            task_id (int): 任务ID。

        Returns:
            generator/stream: 日志内容生成器或流。
        """
        task = db.session.query(FinetuneTask).get(task_id)

        def reader(message):
            yield message

        if task is not None:
            if task.status == TaskStatus.IN_PROGRESS.value:
                if task.task_job_info_dict:
                    status = task.task_job_info_dict["status"]
                    if status == "Pending":
                        return reader("任务正在排队中..")
            if task.log_path is not None and task.log_path != "":
                return storage.load_stream(task.log_path)
            else:
                return reader("没有收集到日志")

    def ft_pause_task(self, job_id, task_name):
        """调用微调后端接口暂停任务。

        Args:
            job_id (str): 任务后端ID。
            task_name (str): 任务名称。

        Returns:
            bool: 暂停成功返回True，否则返回False。
        """
        ft_pause_task_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + ":pause"
        )
        logging.info(f"ft_pause_task_url: {ft_pause_task_url}")
        json_data = {"name": task_name}
        response = requests.post(ft_pause_task_url, json=json_data)
        logging.info(f"ft_pause_task response: {response.status_code}")
        logging.info(f"ft_pause_task response: {response.text}")
        response_data = response.json()
        if response.status_code != 200:
            logging.info(
                f"ft_pause_task failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            # 如果任务不存在，则返回True code=3表示 task id invalid或者已经删除
            if (response.status_code == 500 and response_data.get("code") == 13) or (
                response.status_code == 400 and response_data.get("code") == 3
            ):
                return True
            return False
        return True

    def pause_task(self, task_id):
        """暂停微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            bool: 暂停成功返回True，否则返回False。

        Raises:
            CommonError: 任务不存在或状态不支持暂停时抛出异常。
        """
        logging.info(f"pause_task task_id: {task_id}")
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task is None:
            logging.info("pause_task task not exists")
            raise CommonError("任务不存在")

        logging.info(f"pause_task task_job_info_dict: {task.task_job_info_dict}")
        if task.task_job_info_dict:
            job_id = task.task_job_info_dict["job_id"]
            task_name = task.name
            job_status = task.task_job_info_dict["status"]
            task_status = task.status
        else:
            logging.info("pause_task there is no job_id")
            # raise CommonError("FT任务不存在")
            task.status = "Suspended"
            db.session.commit()
            return True

        logging.info(
            f"pause_task job_status, task_name, task_status: {job_status}, {task_name}, {task_status}"
        )
        if task_status not in ["InProgress", "Pending"]:
            logging.info("pause_task task_status should in InProgress or Pending")
            raise CommonError("当前任务状态不支持暂停操作")

        ft_pause_task_result = self.ft_pause_task(job_id, task_name)
        if ft_pause_task_result:
            job_info = task.task_job_info_dict
            job_info["status"] = "Suspended"
            task.task_job_info = json.dumps(job_info)
            task.status = "Suspended"
            db.session.commit()
            return True
        return False

    def ft_resume_task(self, job_id, task_name):
        """调用微调后端接口恢复任务。

        Args:
            job_id (str): 任务后端ID。
            task_name (str): 任务名称。

        Returns:
            bool: 恢复成功返回True，否则返回False。
        """
        ft_resume_task_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + ":resume"
        )
        logging.info(f"ft_resume_task_url: {ft_resume_task_url}")
        json_data = {"name": task_name}
        response = requests.post(ft_resume_task_url, json=json_data)
        logging.info(f"ft_resume_task response: {response.status_code}")
        logging.info(f"ft_resume_task response: {response.text}")
        response_data = response.json()
        if response.status_code != 200:
            logging.info(
                f"ft_resume_task failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False
        return True

    def resume_task(self, task_id):
        """恢复微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            bool: 恢复成功返回True，否则返回False。
        """
        logging.info(f"resume_task task_id: {task_id}")
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task is None:
            logging.info("resume_task task not exists")
            return False

        logging.info(f"resume_task task_job_info_dict: {task.task_job_info_dict}")
        if task.task_job_info_dict:
            job_id = task.task_job_info_dict["job_id"]
            task_name = task.name
            job_status = task.task_job_info_dict["status"]
            task_status = task.status
        else:
            return False

        logging.info(
            f"resume_task job_status, task_name, task_status: {job_status}, {task_name}, {task_status}"
        )
        if task_status not in ["Suspended"]:
            logging.info("resume_task task_status should be Suspended")
            return False

        ft_resume_task_result = self.ft_resume_task(job_id, task_name)
        if ft_resume_task_result:
            job_info = task.task_job_info_dict
            job_info["status"] = "InProgress"
            task.task_job_info = json.dumps(job_info)
            task.status = "InProgress"
            db.session.commit()
            return True
        return False

    def ft_get_running_metrics(self, job_id, task_name):
        """获取后端微调任务运行时指标。

        Args:
            job_id (str): 任务后端ID。
            task_name (str): 任务名称。

        Returns:
            tuple: (bool, list) 获取结果元组，包含：
                - bool: 是否成功获取
                - list: 指标数据列表
        """
        ft_get_running_metrics_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + "/runningMetrics"
        )
        logging.info(f"ft_get_running_metrics_url: {ft_get_running_metrics_url}")
        response = requests.get(ft_get_running_metrics_url)
        logging.info(f"ft_get_running_metrics response: {response.status_code}")
        logging.info(f"ft_get_running_metrics response: {response.text}")
        response_data = response.json()
        if response.status_code != 200:
            logging.info(
                f"ft_get_running_metrics failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False, []
        return True, response_data.get("data")

    def get_running_metrics(self, task_id):
        """获取微调任务运行时指标。

        Args:
            task_id (int): 任务ID。

        Returns:
            tuple: (bool, dict) 获取结果元组，包含：
                - bool: 是否成功获取
                - dict: 指标数据字典
        """
        logging.info(f"get_running_metrics task_id: {task_id}")
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        res = {}
        if task is None:
            logging.info("get_running_metrics task not exists")
            return False, res

        logging.info(
            f"get_running_metrics task_job_info_dict: {task.task_job_info_dict}"
        )
        if task.task_job_info_dict:
            job_id = task.task_job_info_dict["job_id"]
            task_name = task.name
            # status = task.task_job_info_dict["status"]
        else:
            return False, res

        logging.info(f"get_running_metrics name: {task.name}")

        ft_get_running_metrics_result, ft_get_running_metrics_return = (
            self.ft_get_running_metrics(job_id, task_name)
        )
        if ft_get_running_metrics_result:
            res["message"] = "success"
            res["code"] = 200
            res["data"] = ft_get_running_metrics_return
            return True, res
        return False, res
