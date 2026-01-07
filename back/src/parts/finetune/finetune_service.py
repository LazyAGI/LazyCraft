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
            # 训练时长计算逻辑：始终优先使用 LazyLLM 的 cost 值（如果存在且有效）
            # 如果 cost 不存在或为 0，则使用时间差计算作为后备方案
            cost_value = None
            if i.task_job_info_dict:
                cost_value = i.task_job_info_dict.get('cost')
            
            if cost_value is not None and cost_value > 0:
                # 优先使用 LazyLLM 返回的 cost 值（最准确）
                i.train_runtime = int(cost_value)
            elif i.train_runtime is None or i.train_runtime < 1:
                # 如果没有有效的 cost 值，使用时间差计算（向后兼容）
                try:
                    # 对于终态任务（Cancel、Completed、Failed），使用 updated_at 或 train_end_time 计算，避免每次刷新都增加
                    # 对于运行中的任务，使用当前时间计算
                    if i.status in [TaskStatus.CANCEL.value, TaskStatus.COMPLETED.value, TaskStatus.FAILED.value]:
                        # 终态任务：使用 updated_at 或 train_end_time（如果有）计算，而不是当前时间
                        end_time = i.train_end_time if i.train_end_time else i.updated_at
                        if end_time:
                            end_time_naive = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
                            i.train_runtime = int(
                                (end_time_naive - i.created_at).total_seconds()
                            )
                        else:
                            # 如果没有结束时间，保持为0（避免使用当前时间导致不断增长）
                            i.train_runtime = 0
                    else:
                        # 运行中的任务：使用当前时间计算
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
        if task.status in [TaskStatus.PENDING.value, TaskStatus.SUBMITTING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.SUSPENDED.value]:
            old_status = task.status
            task.status = TaskStatus.CANCEL.value
            # 释放GPU资源（如果任务正在运行、提交中或已暂停，向后兼容：如果没有num_gpus字段，默认使用1）
            if old_status in [TaskStatus.SUBMITTING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.SUSPENDED.value]:
                num_gpus = getattr(task, 'num_gpus', 1)
                self._release_gpu_resources(task_id, num_gpus)
            db.session.commit()
            self._del_task_process(task_id=task_id)
        else:
            return False, "current task status does not support cancel operation"

        return True, ""

    def _check_model_exists(self, model_name):
        """检查模型是否存在于模型目录中。

        Args:
            model_name (str): 模型名称（如 'internlm2_5-7b-chat'）
            
        Returns:
            bool: 模型存在返回 True，否则返回 False
        """
        import os
        
        model_path = os.getenv("LAZYLLM_MODEL_PATH", "/mnt/lustre/share_data/models")
        if not model_path:
            logging.warning("LAZYLLM_MODEL_PATH not set, cannot check model existence")
            return False
        
        model_dir = os.path.join(model_path, model_name)
        
        if not os.path.isdir(model_dir):
            logging.info(f"Model directory not found: {model_dir}")
            return False
        
        try:
            with os.scandir(model_dir) as entries:
                if any(entry for entry in entries):
                    logging.info(f"Model found at: {model_dir}")
                    return True
                else:
                    logging.warning(f"Model directory is empty: {model_dir}")
                    return False
        except Exception as e:
            logging.error(f"Error checking model directory {model_dir}: {e}")
            return False
    
    def _allocate_gpu_resources(self, task_id, num_gpus):
        """分配GPU资源。
        
        Args:
            task_id (int): 任务ID
            num_gpus (int): 需要的GPU数量
        
        Returns:
            bool: 是否成功分配
        
        Raises:
            CommonError: 当GPU配额不足时
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if not task:
            raise CommonError("任务不存在")
        
        account = Account.default_getone(task.created_by)
        if account.is_super:
            return True  # 超级管理员不需要配额检查
        
        try:
            Tenant.increment_gpu_usage(task.tenant_id, num_gpus)
            logging.info(f"Allocated {num_gpus} GPUs for task {task_id}")
            return True
        except ValueError as e:
            raise CommonError(str(e))

    def _release_gpu_resources(self, task_id, num_gpus):
        """释放GPU资源。
        
        Args:
            task_id (int): 任务ID
            num_gpus (int): 要释放的GPU数量
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if not task:
            return
        
        account = Account.default_getone(task.created_by)
        if account.is_super:
            return  # 超级管理员不需要释放
        
        Tenant.decrement_gpu_usage(task.tenant_id, num_gpus)
        logging.info(f"Released {num_gpus} GPUs for task {task_id}")

    def _del_task_process(self, task_id):
        """删除任务进程，取消异步任务。
        Args:
            task_id (int): 任务ID
        
        Returns:
            None
        
        Raises:
            Exception: 当删除任务进程失败时抛出异常
            CommonError: 当任务不存在时抛出异常
        """
        import time
        import threading
        from tasks.finetune_task import cancel_task
        
        # 检查任务是否已经提交到 LazyLLM
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task and task.task_job_info_dict:
            # 任务已经提交到 LazyLLM，需要调用 LazyLLM 的取消接口
            job_id = task.task_job_info_dict.get("job_id")
            if job_id:
                from parts.finetune.task_manager import manage
                try:
                    manage.ft_delete_service(job_id)
                    logging.info(f"Cancelled LazyLLM job {job_id} for task {task_id}")
                except Exception as e:
                    logging.error(f"Failed to cancel LazyLLM job {job_id}: {e}")
        elif task and task.status == TaskStatus.SUBMITTING.value:
            logging.info(f"Task {task_id} is in Submitting status, will retry cancellation after delay")
            
            def delayed_cancel_with_retry():
                """延迟取消：等待 LazyLLM 任务创建完成后再取消，支持重试"""
                max_retries = 3
                retry_delays = [10, 20, 30]  # 指数退避：10秒、20秒、30秒
                
                for attempt in range(max_retries):
                    time.sleep(retry_delays[attempt])
                    # 重新查询任务状态
                    task_retry = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
                    if not task_retry or task_retry.status != TaskStatus.CANCEL.value:
                        # 任务状态已改变，不需要继续取消
                        logging.info(f"Task {task_id} status changed, stopping delayed cancellation")
                        return
                    
                    # 任务仍然处于取消状态，检查是否有 job_id
                    if task_retry.task_job_info_dict:
                        job_id = task_retry.task_job_info_dict.get("job_id")
                        if job_id:
                            from parts.finetune.task_manager import manage
                            try:
                                success = manage.ft_delete_service(job_id)
                                if success:
                                    logging.info(f"Delayed cancellation (attempt {attempt + 1}): Cancelled LazyLLM job {job_id} for task {task_id}")
                                    return  # 成功取消，退出重试循环
                                else:
                                    logging.warning(f"Delayed cancellation (attempt {attempt + 1}) failed for job {job_id}, will retry")
                            except Exception as e:
                                logging.error(f"Delayed cancellation (attempt {attempt + 1}) exception for job {job_id}: {e}")
                    
                    # 如果还有重试机会，继续下一次
                    if attempt < max_retries - 1:
                        logging.info(f"Will retry delayed cancellation for task {task_id} in {retry_delays[attempt + 1]} seconds")
                
                # 所有重试都失败
                logging.error(f"Failed to cancel LazyLLM job for task {task_id} after {max_retries} attempts")
            
            # 在后台线程中执行延迟取消（支持重试）
            thread = threading.Thread(target=delayed_cancel_with_retry, daemon=True)
            thread.start()
        
        # 执行原有的取消任务逻辑（处理 Celery 任务）
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
        num_gpus = finetune_config.get("num_gpus", 1)  # 获取GPU数量，默认1

        # 获取当前用户
        account = Account.default_getone(self.account.id)

        # 非超级管理员才需要检查GPU配额（创建时只检查，不分配）
        if not account.is_super:
            tenant = (
                db.session.query(Tenant)
                .filter_by(id=self.account.current_tenant_id)
                .first()
            )
            if tenant:
                # 检查配额是否足够（但不分配，分配在start_task时进行）
                if tenant.gpu_quota and tenant.gpu_quota > 0:
                    if tenant.gpu_used + num_gpus > tenant.gpu_quota:
                        raise CommonError(
                            f"当前组内/个人空间已消耗{tenant.gpu_used}张显卡，需要{num_gpus}张，"
                            f"但配额只有{tenant.gpu_quota}张。请联系超级管理员开放更多资源。"
                        )
                elif tenant.gpu_quota == 0:
                    raise CommonError(
                        f"当前组内/个人空间已消耗{tenant.gpu_used}张显卡，当前再无余额。请联系超级管理员开放更多资源。"
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
        finetune_task.num_gpus = num_gpus  # 记录GPU数量
        db.session.add(finetune_task)
        db.session.commit()

        # 注意：创建时不分配GPU，启动时才分配（在start_task中）

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
            
        Raises:
            CommonError: 当模型不存在或GPU配额不足时抛出异常。
        """
        import os
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        
        # 检查模型是否存在（在提交到 LazyLLM 之前）
        # 这样可以避免 LazyLLM 开始下载模型，导致无法取消的问题
        if not task.is_online_model:
            model_exists = self._check_model_exists(task.base_model_key)
            if not model_exists:
                error_msg = (
                    f"模型 '{task.base_model_key}' 在模型目录中不存在。"
                    f"请核查模型是否已损坏或未下载。"
                )
                logging.error(f"Task {task_id}: {error_msg}")
                raise CommonError(error_msg)
        
        # 分配GPU资源（向后兼容：如果没有num_gpus字段，默认使用1）
        num_gpus = getattr(task, 'num_gpus', 1)
        try:
            self._allocate_gpu_resources(task_id, num_gpus)
        except CommonError as e:
            # GPU配额不足，保持Pending状态
            logging.error(f"Failed to allocate GPU for task {task_id}: {e}")
            raise
        
        # 设置为 Submitting 状态，表示正在提交到 LazyLLM 服务
        # 等待 add_task 成功提交后再更新为 InProgress
        task.status = TaskStatus.SUBMITTING.value
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
        
        # 训练时长计算逻辑：始终优先使用 LazyLLM 的 cost 值（如果存在且有效）
        # 如果 cost 不存在或为 0，则使用时间差计算作为后备方案
        # 与 get_paginate_tasks 方法保持一致的逻辑
        cost_value = None
        if task.task_job_info_dict:
            cost_value = task.task_job_info_dict.get('cost')
        
        if cost_value is not None and cost_value > 0:
            # 优先使用 LazyLLM 返回的 cost 值（最准确）
            task.train_runtime = int(cost_value)
        elif task.train_runtime is None or task.train_runtime < 1:
            # 如果没有有效的 cost 值，使用时间差计算（向后兼容）
            try:
                # 对于终态任务（Cancel、Completed、Failed），使用 updated_at 或 train_end_time 计算，避免每次刷新都增加
                # 对于运行中的任务，使用当前时间计算
                if task.status in [TaskStatus.CANCEL.value, TaskStatus.COMPLETED.value, TaskStatus.FAILED.value]:
                    # 终态任务：使用 updated_at 或 train_end_time（如果有）计算，而不是当前时间
                    end_time = task.train_end_time if task.train_end_time else task.updated_at
                    if end_time:
                        end_time_naive = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
                        task.train_runtime = int(
                            (end_time_naive - task.created_at).total_seconds()
                        )
                    else:
                        # 如果没有结束时间，保持为0（避免使用当前时间导致不断增长）
                        task.train_runtime = 0
                else:
                    # 运行中的任务：使用当前时间计算
                    current_time_naive = TimeTools.get_china_now(output="dt").replace(
                        tzinfo=None
                    )
                    task.train_runtime = int(
                        (current_time_naive - task.created_at).total_seconds()
                    )
            except Exception as e:
                logging.info(f"detail_finetune error calculating train_runtime: {e}")
                task.train_runtime = 0
        
        t = marshal(task, fields.finetune_detail_fields)
        t["base_model_name"] = task.base_model_key
        t.pop("log_path")
        # Format train_runtime with progress percent if available
        if task.task_job_info_dict and task.task_job_info_dict.get('progress_percent') is not None:
            progress_percent = task.task_job_info_dict['progress_percent']
            train_runtime = t.get('train_runtime', 0)
            t['train_runtime'] = f"{train_runtime}s(进度约{progress_percent}%)"
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
            tuple: (bool, str, str, float) 暂停结果元组，包含：
                - bool: 是否成功
                - str: 返回的状态值（成功时）或错误信息（失败时）
                - str: checkpoint路径（成功时）
                - float: cost训练时长（成功时，秒）
        """
        ft_pause_task_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + ":pause"
        )
        logging.info(f"ft_pause_task_url: {ft_pause_task_url}")
        json_data = {"name": task_name}
        
        try:
            response = requests.post(ft_pause_task_url, json=json_data, timeout=15)
            logging.info(f"ft_pause_task response: {response.status_code}")
            logging.info(f"ft_pause_task response: {response.text}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    returned_status = response_data.get('status', 'Unknown')
                    checkpoint_path = response_data.get('checkpoint_path', '')
                    cost = response_data.get('cost')  # 获取 cost 值
                    logging.info(f"ft_pause_task returned status: {returned_status}, checkpoint_path: {checkpoint_path}, cost: {cost}")
                    return True, returned_status, checkpoint_path, cost
                except (ValueError, KeyError) as e:
                    logging.error(f"ft_pause_task failed to parse response: {e}")
                    return False, f"Invalid response format: {str(e)}", "", None
            else:
                try:
                    response_data = response.json()
                    error_code = response_data.get('code')
                    error_message = response_data.get('message', response_data.get('detail', 'Unknown error'))
                    logging.info(
                        f"ft_pause_task failed: {error_code}, {error_message}"
                    )
                    
                    # 如果返回404，说明任务已结束
                    if response.status_code == 404:
                        return False, "任务状态已结束", "", None
                    
                    # 如果任务不存在（其他错误码），则返回True（认为已经暂停）
                    if (response.status_code == 500 and error_code == 13) or (
                        response.status_code == 400 and error_code == 3
                    ):
                        return True, "Suspended", "", None  # 任务不存在，认为已暂停
                    
                    return False, error_message, "", None
                except (ValueError, KeyError):
                    return False, f"HTTP {response.status_code}: {response.text[:100]}", "", None
        
        except requests.exceptions.Timeout:
            logging.error(f"ft_pause_task timeout for job_id: {job_id}")
            return False, "Request timeout", "", None
        except requests.exceptions.RequestException as e:
            logging.error(f"ft_pause_task request exception: {e}")
            return False, f"Request failed: {str(e)}", "", None

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
        
        # 统一处理没有 task_job_info_dict 的情况（任务还未提交到底层服务）
        if not task.task_job_info_dict:
            if task.status in ["Pending", "Submitting", "InQueue"]:
                # 任务还未提交到底层服务，直接设置为Suspended（相当于取消提交）
                # 如果是 Submitting 状态，需要释放GPU资源
                if task.status == "Submitting":
                    num_gpus = getattr(task, 'num_gpus', 1)
                    self._release_gpu_resources(task_id, num_gpus)
                task.status = "Suspended"
                task.suspended_at = TimeTools.get_china_now()
                db.session.commit()
                return True
            else:
                raise CommonError("任务尚未提交到底层服务，无法暂停")

        # 先刷新任务状态（调用更新任务状态接口）
        job_id = task.task_job_info_dict.get("job_id")
        lazyllm_status = None
        if job_id:
            from parts.finetune.task_manager import manage
            get_status_result, status, _ = manage.get_ft_status(job_id)
            lazyllm_status = status
            if not get_status_result:
                # 获取状态失败，可能是404，说明任务已结束
                if status and "404" in str(status):
                    raise CommonError("任务状态已结束，无法暂停")
                raise CommonError("无法获取任务状态，请稍候再试")
            
            # 如果状态为 NotReady，说明任务还未准备好
            if status == "NotReady":
                raise CommonError("任务正在初始化中，请稍候再试")
            
            # 如果状态为终态（Completed/Failed/Terminated），说明任务已结束
            if status in ["Completed", "Failed", "Terminated"]:
                raise CommonError("任务状态已结束，无法暂停")
            
            # 更新任务状态（如果状态已同步）
            if status not in ["NotReady", "Failed", "Terminated", "Completed"]:
                task.status = TaskStatus.IN_PROGRESS.value if status == "InProgress" else task.status
                db.session.commit()

        job_id = task.task_job_info_dict["job_id"]
        task_name = task.name
        task_status = task.status

        logging.info(
            f"pause_task job_id, task_name, task_status: {job_id}, {task_name}, task_status: {task_status}, lazyllm_status: {lazyllm_status}"
        )
        
        if task_status == "Suspended":
            logging.info(f"pause_task: Task {task_id} is already Suspended, treating as success (idempotency)")
            return True
        
        if task_status not in ["InProgress", "Pending", "Running"]:
            logging.info(f"pause_task task_status {task_status} does not support pause")
            raise CommonError("当前任务状态不支持暂停操作")

        ft_pause_task_result, returned_status, checkpoint_path, cost = self.ft_pause_task(job_id, task_name)
        
        if not ft_pause_task_result and returned_status and ("404" in str(returned_status) or "任务状态已结束" in str(returned_status)):
            raise CommonError("任务状态已结束，无法暂停")
        
        if ft_pause_task_result:
            job_info = task.task_job_info_dict
            
            if returned_status == "Cancelled":
                logging.info(
                    f"pause_task: LazyLLM returned Cancelled for task {task_id}, "
                    f"converting to Suspended (pause operation)"
                )
            
            final_status = "Suspended"
            
            if checkpoint_path:
                task.checkpoint_path = checkpoint_path
                job_info["checkpoint_path"] = checkpoint_path
            elif job_info.get("checkpoint_path"):
                task.checkpoint_path = job_info.get("checkpoint_path")
            
            # 更新 cost 和 train_runtime（优先使用 LazyLLM 返回的 cost）
            if cost is not None:
                job_info["cost"] = cost
                task.train_runtime = int(cost)
                logging.info(f"pause_task: Updated cost and train_runtime for task {task_id} from LazyLLM: {cost}s")
            elif job_info.get("cost") is not None:
                # 如果 LazyLLM 没有返回 cost，但 job_info 中有，使用 job_info 中的值
                task.train_runtime = int(job_info["cost"])
                logging.info(f"pause_task: Updated train_runtime for task {task_id} from job_info: {job_info['cost']}s")
            
            # 释放GPU资源（向后兼容：如果没有num_gpus字段，默认使用1）
            num_gpus = getattr(task, 'num_gpus', 1)
            self._release_gpu_resources(task_id, num_gpus)
            
            job_info["status"] = final_status
            task.task_job_info = json.dumps(job_info)
            task.status = final_status
            task.suspended_at = TimeTools.get_china_now()
            db.session.commit()
            logging.info(f"pause_task: Task {task_id} paused successfully, status: {final_status}, checkpoint: {task.checkpoint_path}, train_runtime: {task.train_runtime}s")
            return True
        else:
            logging.error(f"pause_task: Failed to pause task {task_id}, error: {returned_status}")
            raise CommonError(f"停止训练失败：{returned_status}")

    def ft_resume_task(self, job_id, task_name, checkpoint_path=None):
        """调用微调后端接口恢复任务。

        Args:
            job_id (str): 任务后端ID。
            task_name (str): 任务名称。
            checkpoint_path (str, optional): checkpoint路径。

        Returns:
            tuple: (bool, str) 恢复结果元组，包含：
                - bool: 恢复成功返回True，否则返回False
                - str: 错误信息（失败时）
        """
        ft_resume_task_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + ":resume"
        )
        logging.info(f"ft_resume_task_url: {ft_resume_task_url}")
        json_data = {"name": task_name}
        if checkpoint_path:
            json_data["checkpoint_path"] = checkpoint_path
        try:
            response = requests.post(ft_resume_task_url, json=json_data, timeout=15)
            logging.info(f"ft_resume_task response: {response.status_code}")
            logging.info(f"ft_resume_task response: {response.text}")
            if response.status_code == 200:
                return True, ""
            else:
                response_data = response.json()
                error_code = response_data.get('code')
                error_message = response_data.get('message', response_data.get('detail', 'Unknown error'))
                logging.info(
                    f"ft_resume_task failed: {error_code}, {error_message}"
                )
                # 处理404和400错误
                if response.status_code == 404:
                    return False, "任务状态已结束，无法开始训练"
                elif response.status_code == 400:
                    return False, "任务开始失败，请联系后台管理员核查"
                return False, error_message
        except requests.exceptions.Timeout:
            logging.error(f"ft_resume_task timeout for job_id: {job_id}")
            return False, "请求超时"
        except requests.exceptions.RequestException as e:
            logging.error(f"ft_resume_task request exception: {e}")
            return False, f"请求失败: {str(e)}"

    def resume_task(self, task_id):
        """恢复微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            bool: 恢复成功返回True，否则返回False。
        
        Raises:
            CommonError: 任务不存在或状态不支持恢复时抛出异常。
        """
        logging.info(f"resume_task task_id: {task_id}")
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if task is None:
            logging.info("resume_task task not exists")
            raise CommonError("任务不存在")

        if task.status != "Suspended":
            logging.info(f"resume_task task_status {task.status} should be Suspended")
            raise CommonError("只有暂停状态的任务才能恢复")

        # 如果没有 task_job_info（任务在提交前就被暂停了），则重新开始任务
        if not task.task_job_info_dict:
            logging.info(f"resume_task: Task {task_id} has no task_job_info, restarting task instead of resuming")
            # 清空 checkpoint_path（因为任务还没有真正开始训练）
            task.checkpoint_path = None
            task.suspended_at = None
            db.session.commit()
            # 重新开始任务（相当于重新提交到 LazyLLM）
            self.start_task(task_id)
            return True

        # 检查任务是否已准备好（如果任务在 Submitting 状态，需要等待）
        job_id = task.task_job_info_dict["job_id"]
        if job_id:
            from parts.finetune.task_manager import manage
            get_status_result, status, _ = manage.get_ft_status(job_id)
            if not get_status_result:
                if status and ("404" in str(status) or "任务状态已结束" in str(status)):
                    raise CommonError("任务状态已结束，无法开始训练")
                raise CommonError("无法获取任务状态，请稍候再试")
            if status == "NotReady":
                raise CommonError("任务正在初始化中，请稍候再试")
            if status in ["Completed", "Failed", "Terminated"]:
                raise CommonError("任务状态已结束，无法开始训练")

        num_gpus = getattr(task, 'num_gpus', 1)
        try:
            self._allocate_gpu_resources(task_id, num_gpus)
        except CommonError as e:
            logging.error(f"resume_task failed to allocate GPU: {e}")
            raise CommonError(f"无法恢复任务：{str(e)}")

        task_name = task.name
        checkpoint_path = task.checkpoint_path

        ft_resume_task_result, error_message = self.ft_resume_task(job_id, task_name, checkpoint_path)
        
        if ft_resume_task_result:
            job_info = task.task_job_info_dict
            job_info["status"] = "InProgress"
            task.task_job_info = json.dumps(job_info)
            task.status = "InProgress"
            task.checkpoint_path = None
            task.suspended_at = None
            db.session.commit()
            logging.info(f"resume_task: Task {task_id} resumed successfully from checkpoint: {checkpoint_path}")
            return True
        else:
            num_gpus = getattr(task, 'num_gpus', 1)
            self._release_gpu_resources(task_id, num_gpus)
            logging.error(f"resume_task: Failed to resume task {task_id}, error: {error_message}")
            raise CommonError(error_message or "恢复任务失败")

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
