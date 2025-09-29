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

import json

from flask_restful import fields

from libs.fields import CustomDateTime

# 标签字段定义
tag_fields = {"id": fields.String, "name": fields.String, "type": fields.String}

# 账户字段定义
account_fields = {"id": fields.String, "name": fields.String, "avatar": fields.String}


def json_to_dict(value):
    """将JSON字符串转换为字典。

    如果输入是字符串，则解析为字典；如果已经是字典，则直接返回。

    Args:
        value (str or dict): 要转换的值

    Returns:
        dict: 转换后的字典

    Raises:
        json.JSONDecodeError: 当JSON格式错误时
    """
    return json.loads(value) if isinstance(value, str) else value


# 微调任务详情字段定义
finetune_detail_fields = {
    "id": fields.Integer,
    "name": fields.String,
    "description": fields.String,
    "base_model": fields.String,  # 0 in ft
    "base_model_key": fields.String,  # from ft
    "target_model_name": fields.String,
    "target_model": fields.String,
    "status": fields.String,
    "status_label": fields.String,  # status in chinese
    "created_from_info": fields.String,
    "train_runtime": fields.Integer,
    "created_by": fields.String,
    "created_by_account": fields.Nested(account_fields, attribute="created_by_account"),
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "log_path": fields.String,
    "finetuning_type": fields.String,
    "finetune_config": fields.Raw(attribute="finetune_config_dict"),
    "train_end_time": CustomDateTime,
    "user_name": fields.String,
}

# 微调任务分页字段定义
finetune_pagination_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(finetune_detail_fields), attribute="items"),
}

# 自定义参数项字段定义
custom_param_item = {
    "training_type": fields.String,  # 训练模式 (PT, SFT, RM, PPO, DPO)
    "val_size": fields.Float,  # 验证集占比
    "num_epochs": fields.Integer,  # 重复次数
    "learning_rate": fields.Float,  # 学习率
    "lr_scheduler_type": fields.String,  # 学习率调整策略
    "batch_size": fields.Integer,  # 批次大小
    "cutoff_len": fields.Integer,  # 序列最大长度
    "lora_r": fields.Integer,  # LoRa秩
    "lora_rate": fields.Integer,  # 微调占比
    "lora_alpha": fields.Integer,
    "num_gpus": fields.Integer,
}

# 微调参数字段定义
finetune_param_fields = {
    "id": fields.String,
    "name": fields.String,
    "is_default": fields.Boolean,
    "finetune_config": fields.Nested(custom_param_item, attribute="finetune_config"),
}
