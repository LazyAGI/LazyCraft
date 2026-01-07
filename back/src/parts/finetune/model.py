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
from enum import Enum

from models import StringUUID
from models.model_account import Account, Tenant
from parts.data.model import DataSetVersion
from parts.models_hub.model import Lazymodel
from utils.util_database import db


class TaskStatus(Enum):
    """任务状态枚举类。

    定义微调任务的各种状态。
    """

    PENDING = "Pending"  # 等待
    SUBMITTING = "Submitting"  # 提交中（正在提交到LazyLLM服务）
    IN_PROGRESS = "InProgress"  # 进行中
    COMPLETED = "Completed"  # 已完成
    FAILED = "Failed"  # 失败
    CANCEL = "Cancel"  # 取消
    UNKNOWN = "Unknown"  # 未知
    TERMINATED = "Terminated"  # 终止
    SUSPENDED = "Suspended"  # 暂停
    DOWNLOAD = "Download"  # 导出

    @property
    def display(self):
        """获取状态的中文显示名称。

        Returns:
            str: 状态的中文显示名称
        """
        translations = {
            TaskStatus.UNKNOWN: "未知",
            TaskStatus.DOWNLOAD: "导出",
            TaskStatus.TERMINATED: "终止",
            TaskStatus.SUSPENDED: "暂停",
            TaskStatus.PENDING: "等待",
            TaskStatus.SUBMITTING: "提交中",
            TaskStatus.IN_PROGRESS: "进行中",
            TaskStatus.COMPLETED: "已完成",
            TaskStatus.FAILED: "失败",
            TaskStatus.CANCEL: "取消",
        }
        return translations[self]


class FinetuningType(Enum):
    """微调类型枚举类。

    定义微调的各种类型。
    """

    LORA = "LoRA"
    QLORA = "QLoRA"
    FULL = "Full"


class TrainingType(Enum):
    """训练类型枚举类。

    定义训练的各种类型。
    """

    PT = "PT"
    SFT = "SFT"
    RM = "RM"
    PPO = "PPO"
    DPO = "DPO"


class LrSchedulerType(Enum):
    """学习率调度器类型枚举类。

    定义学习率调度器的各种类型。
    """

    LINEAR = "linear"
    COSINE = "cosine"
    COSINE_WITH_RESTARTS = "cosine_with_restarts"
    POLYNOMIAL = "polynomial"
    CONSTANT = "constant"
    CONSTANT_WITH_WARMUP = "constant_with_warmup"
    INVERSE_SQRT = "inverse_sqrt"
    REDUCE_LR_ON_PLATEAU = "reduce_lr_on_plateau"
    COSINE_WITH_MIN_LR = "cosine_with_min_lr"
    WARMUP_STABLE_DECAY = "warmup_stable_decay"


class FinetuneTask(db.Model):
    """微调任务模型类。

    微调任务的数据库模型，包含任务的所有相关信息。
    """

    __tablename__ = "finetune_task"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    base_model = db.Column(db.Integer, nullable=False)  # 0 for ft
    base_model_key = db.Column(db.String(255), nullable=False)  # from ft
    base_model_key_ams = db.Column(
        db.String(255), nullable=True
    )  # ams model name in ft
    target_model_name = db.Column(db.String(255), nullable=False)
    target_model_key = db.Column(db.String(255), nullable=False)
    target_model = db.Column(db.Integer, nullable=True)  # id in models_hub
    created_from_info = db.Column(db.Text, nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")
    status = db.Column(db.String(20), nullable=False, default="Pending")
    train_runtime = db.Column(db.Numeric(20, 10), nullable=False, default=0.00)
    datasets = db.Column(db.Text, nullable=False, default="[]")
    deleted_flag = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(StringUUID, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP(0)")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )
    is_online_model = db.Column(db.Boolean, nullable=False, default=False)
    log_path = db.Column(db.String(255), nullable=False, default="")  # 日志路径
    finetune_config = db.Column(db.Text, nullable=False, default="{}")
    finetune_job_id = db.Column(db.String(100), nullable=False, default="")
    finetuning_type = db.Column(db.String(20), nullable=False, default="")
    train_end_time = db.Column(db.DateTime, nullable=True)
    task_job_info = db.Column(db.String(500), nullable=True, default="{}")
    num_gpus = db.Column(db.Integer, nullable=False, default=1, comment="任务使用的GPU数量")
    checkpoint_path = db.Column(db.String(500), nullable=True, default=None, comment="checkpoint保存路径（目录），用于恢复训练")
    suspended_at = db.Column(db.DateTime, nullable=True, default=None, comment="任务暂停时间")
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="finetune_pkey"),
        db.Index("finetune_task_tenant_id_idx", "tenant_id"),
        db.Index("finetune_task_deleted_flag_idx", "deleted_flag"),
    )

    @property
    def tenant(self):
        """获取租户信息。

        Returns:
            Tenant: 租户对象，如果不存在则返回None
        """
        tenant = db.session.query(Tenant).filter(Tenant.id == self.tenant_id).first()
        return tenant

    @property
    def status_label(self):
        """获取状态的中文标签。

        Returns:
            str: 状态的中文显示名称
        """
        return TaskStatus(self.status).display

    @property
    def base_model_obj(self):
        """获取基础模型对象。

        Returns:
            Lazymodel: 基础模型对象，如果不存在则返回None
        """
        b = db.session.query(Lazymodel).filter(Lazymodel.id == self.base_model).first()
        return b

    @property
    def base_model_name(self):
        """获取基础模型名称。

        Returns:
            str: 基础模型名称，如果不存在则返回空字符串
        """
        b = db.session.query(Lazymodel).filter(Lazymodel.id == self.base_model).first()
        if b is None:
            return ""
        return b.model_name

    @property
    def base_model_info(self):
        """获取基础模型信息。

        Returns:
            dict: 包含基础模型ID和模型键的字典
        """
        return {"id": self.base_model, "model_key": self.base_model_key}

    @property
    def finetune_config_dict(self):
        """获取微调配置字典。

        Returns:
            dict: 微调配置字典

        Raises:
            json.JSONDecodeError: 当配置JSON格式错误时
        """
        return json.loads(self.finetune_config)

    @property
    def created_by_account(self):
        """获取创建者账户信息。

        Returns:
            Account: 创建者账户对象
        """
        return db.session.get(Account, self.created_by)

    @property
    def target_model_obj(self):
        """获取目标模型对象。

        Returns:
            Lazymodel: 目标模型对象，如果不存在则返回None
        """
        if self.target_model:
            return db.session.get(Lazymodel, self.target_model)
        return None

    @property
    def dataset_list(self):
        """获取数据集列表。

        Returns:
            list: 数据集版本对象列表

        Raises:
            json.JSONDecodeError: 当数据集JSON格式错误时
        """
        b = (
            db.session.query(DataSetVersion)
            .filter(DataSetVersion.id.in_(json.loads(self.datasets)))
            .all()
        )
        return b

    @property
    def task_job_info_dict(self):
        """获取任务作业信息字典。

        Returns:
            dict: 任务作业信息字典，如果不存在则返回None

        Raises:
            json.JSONDecodeError: 当作业信息JSON格式错误时
        """
        if self.task_job_info is not None and (
            self.task_job_info != "{}" and self.task_job_info != ""
        ):
            return json.loads(self.task_job_info)
        else:
            return None


class FinetuneCustomParam(db.Model):
    """微调自定义参数模型类。

    微调自定义参数的数据库模型，用于存储用户自定义的微调参数配置。
    """

    __tablename__ = "finetune_custom_param"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    deleted_flag = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(StringUUID, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    finetune_config = db.Column(db.Text, nullable=False, default="{}")

    @property
    def finetune_config_dict(self):
        """获取微调配置字典。

        Returns:
            dict: 微调配置字典

        Raises:
            json.JSONDecodeError: 当配置JSON格式错误时
        """
        return json.loads(self.finetune_config)
