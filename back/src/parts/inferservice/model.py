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


from models.model_account import Account
from utils.util_database import db


class InferModelServiceGroup(db.Model):
    """推理模型服务组模型。

    对应数据库中的infer_model_service_groups表，用于管理推理服务组。

    Attributes:
        id (int): 服务组ID，主键。
        tenant_id (str): 租户ID。
        model_name (str): 模型名称，不能为空。
        model_type (str): 模型类型，不能为空。
        model_id (int): 关联的模型ID，外键。
        created_by (str): 创建者ID，不能为空。
        created_time (datetime): 创建时间。
        updated_by (str): 更新者ID，不能为空。
        updated_time (datetime): 更新时间。
        services (list): 关联的服务列表。
    """

    # 定义表名
    __tablename__ = "infer_model_service_groups"

    # 定义服务组ID字段，为主键
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(36))
    # 模型名称字段，不能为空
    model_name = db.Column(db.String(100), nullable=False)
    # 模型类型字段，不能为空
    model_type = db.Column(db.String(255), nullable=False)
    # 定义关联的模型ID字段，作为外键关联Model表的id字段
    model_id = db.Column(db.Integer, db.ForeignKey("models_hub.id"), nullable=False)
    # 定义创建者字段，不能为空
    created_by = db.Column(db.String(36), nullable=False)
    # 定义创建时间字段，默认值为当前UTC时间
    created_time = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    # 定义更新者字段，不能为空
    updated_by = db.Column(db.String(36), nullable=False)
    # 定义更新时间字段，默认值为当前UTC时间，并在每次更新时自动更新
    updated_time = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )

    # 添加与InferModelService的一对多关系
    services = db.relationship("InferModelService", backref="group", lazy=True)


class InferModelService(db.Model):
    """推理模型服务模型。

    对应数据库中的infer_model_services表，用于管理推理服务。

    Attributes:
        id (int): 服务ID，主键。
        tenant_id (str): 租户ID。
        group_id (int): 服务组ID，外键。
        job_id (str): 任务ID。
        gid (str): 组ID。
        logs (str): 日志信息。
        model_id (int): 关联的模型ID，外键。
        name (str): 服务名称，不能为空。
        created_by (str): 创建者ID，不能为空。
        created_time (datetime): 创建时间。
        updated_by (str): 更新者ID，不能为空。
        updated_time (datetime): 更新时间。
    """

    # 定义表名
    __tablename__ = "infer_model_services"

    # 定义服务ID字段，为主键
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(36))
    group_id = db.Column(
        db.Integer, db.ForeignKey("infer_model_service_groups.id"), nullable=False
    )
    job_id = db.Column(db.String(36))
    gid = db.Column(db.String(36))
    logs = db.Column(db.Text)
    # 定义关联的模型ID字段，作为外键关联Model表的id字段
    model_id = db.Column(db.Integer, db.ForeignKey("models_hub.id"), nullable=False)
    # 定义服务名称字段，不能为空
    name = db.Column(db.String(100), nullable=False)
    # 定义创建者字段，不能为空
    created_by = db.Column(db.String(36), nullable=False)
    # 定义创建时间字段，默认值为当前UTC时间
    created_time = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    # 定义更新者字段，不能为空
    updated_by = db.Column(db.String(36), nullable=False)
    # 定义更新时间字段，默认值为当前UTC时间，并在每次更新时自动更新
    updated_time = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    @property
    def creator(self):
        """获取服务创建者名称。

        Returns:
            str: 创建者的名称。

        Raises:
            AttributeError: 当user_id字段不存在时抛出异常。
        """
        return Account.query.filter_by(id=self.user_id).first().name
