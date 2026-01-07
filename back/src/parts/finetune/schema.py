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

from marshmallow import Schema, ValidationError, fields, validate, validates

from libs.http_exception import CommonError
from parts.finetune.model import FinetuningType, LrSchedulerType, TrainingType


class FinetuneBaseSchema(Schema):
    """微调基础配置模式类。

    定义微调任务基础配置的数据验证模式。
    """

    name = fields.Str(required=True, validate=validate.Length(max=50))
    base_model = fields.Int(required=True)  # 0 for ft
    base_model_key = fields.Str(required=True)  # model name from ft
    target_model_name = fields.Str(required=True, validate=validate.Length(max=100))
    created_from_info = fields.Str(required=True, validate=validate.Length(max=100))
    created_from = fields.Int(required=True, validate=validate.OneOf([1, 2]))  # ?
    datasets = fields.List(fields.Int(), required=True, validate=validate.Length(min=1))
    datasets_type = fields.List(
        fields.Str(), required=True, validate=validate.Length(min=1)
    )
    finetuning_type = fields.Str(
        required=True, validate=validate.OneOf([t.value for t in FinetuningType])
    )


class FinetuneConfigSchema(Schema):
    """微调配置模式类。

    定义微调任务配置参数的数据验证模式。
    """

    num_gpus = fields.Int(required=False)
    training_type = fields.Str(
        validate=validate.OneOf([type.value for type in TrainingType]), required=True
    )
    val_size = fields.Float(
        required=True, validate=validate.Range(min=0, max=1)
    )  # 0.0 - 1.0
    num_epochs = fields.Int(required=True, validate=validate.Range(min=1))  # 至少1次
    learning_rate = fields.Float(
        required=True, validate=validate.Range(min=0.0)
    )  # 大于0
    lr_scheduler_type = fields.Str(
        required=True,
        validate=validate.OneOf([scheduler.value for scheduler in LrSchedulerType]),
    )
    batch_size = fields.Int(required=True, validate=validate.Range(min=1))  # 至少1
    cutoff_len = fields.Int(
        required=True, validate=validate.Range(min=32, max=2147483647)
    )  # 范围 [32, 2147483647]
    lora_r = fields.Int(
        required=False, validate=validate.OneOf([2, 4, 8, 16, 32, 64])
    )  # 可选值
    lora_rate = fields.Float(
        required=False, validate=validate.Range(min=0, max=100)
    )  # 范围 [0, 100]
    lora_alpha = fields.Int(required=False, validate=validate.OneOf([8, 16, 32, 64]))
    save_steps = fields.Int(required=False, validate=validate.Range(min=1))

    @validates("num_gpus")
    def validate_num_gpus(self, num_gpus, **kwargs):
        """验证GPU数量。

        验证GPU数量与批处理大小的兼容性。

        Args:
            num_gpus (int): GPU数量
            **kwargs: 其他参数

        Raises:
            CommonError: 当批处理大小不能被GPU数量整除时
        """
        batch_size = self.context["data"]["finetune_config"].get("batch_size")
        if num_gpus is not None and num_gpus > 0:
            if batch_size % num_gpus != 0:
                raise CommonError("批处理大小需要能被显卡数整除 ")


class FinetuneCreateSchema(Schema):
    """微调创建模式类。

    定义创建微调任务的完整数据验证模式。
    """

    base = fields.Nested(FinetuneBaseSchema, required=True)
    finetune_config = fields.Nested(FinetuneConfigSchema, required=False)

    @validates("finetune_config")
    def validate_lora_fields(self, config, **kwargs):
        """验证LoRA相关字段。

        验证LoRA微调类型下的必需字段。

        Args:
            config (dict): 微调配置
            **kwargs: 其他参数

        Raises:
            ValidationError: 当LoRA类型缺少必需字段时
        """
        finetuning_type = self.context["data"]["base"].get("finetuning_type")
        if (
            finetuning_type == FinetuningType.LORA.value
            or finetuning_type == FinetuningType.QLORA.value
        ):
            if config.get("lora_r") is None:
                raise ValidationError(
                    "lora_r is required when finetuning_type is (Q)LoRa."
                )
            # if config.get('lora_rate', None) is None:
            #     raise ValidationError("lora_rate is required when finetuning_type is (Q)LoRa.")
