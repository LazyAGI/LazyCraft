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


from sqlalchemy import and_, or_

from models.model_account import Account
from parts.models_hub.model import Lazymodel, LazymodelOnlineModels
from utils.util_database import db


class Task(db.Model):
    """评估任务模型，用于管理模型评估任务。

    该模型包含评估任务的基本信息，如任务名称、模型信息、评估方法、数据集等。
    支持AI测评和人工测评两种评估方式。

    Attributes:
        id (int): 任务ID，主键。
        name (str): 任务名称。
        model_type (str): 模型类型。
        model_name (str): 模型名称。
        evaluation_type (str): 评估类型。
        dataset_id (int): 数据集ID。
        evaluation_method (str): 评估方法。
        dimensions (list): 评估维度列表。
        failed_reason (str): 失败原因。
        status (str): 任务状态。
        prompt (str): AI测评器prompt。
        ai_evaluator_type (str): AI测评器类型。
        ai_evaluator_name (str): AI测评器名称。
        scene (str): AI测评场景描述。
        scene_descrp (str): AI测评场景说明。
        user_id (str): 用户ID。
        tenant_id (str): 租户ID。
        created_at (datetime): 创建时间。
    """

    __tablename__ = "evaluation_tasks"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), nullable=False)
    model_type = db.Column(db.String(30))  # 模型类型
    model_name = db.Column(db.String(255))
    evaluation_type = db.Column(db.String(20), nullable=False)
    dataset_id = db.Column(db.Integer, nullable=False)
    evaluation_method = db.Column(db.String(20), nullable=False)
    dimensions = db.relationship(
        "Dimension", back_populates="task", cascade="all, delete-orphan"
    )
    failed_reason = db.Column(db.Text)
    status = db.Column(db.String(40))
    prompt = db.Column(db.Text)  # AI测评器prompt，仅AI测评有值
    ai_evaluator_type = db.Column(db.String(30))  # AI测评器类型
    ai_evaluator_name = db.Column(db.String(255))
    scene = db.Column(db.String(40))  # AI测评场景描述，仅AI测评有值
    scene_descrp = db.Column(db.Text)  # AI测评场景说明，仅AI测评有值
    user_id = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=db.func.now())

    # @property
    # def model_name(self):
    #     return self.model.model_name if self.model else ""

    def _get_model(self, model_type, model_name):
        """根据模型类型和名称获取模型对象。

        Args:
            model_type (str): 模型类型，支持"online"和本地模型。
            model_name (str): 模型名称。

        Returns:
            object: 模型对象，如果未找到则返回None。
        """

        if model_type == "online":
            model_key_deleted_filters = and_(
                LazymodelOnlineModels.model_key == model_name,
                LazymodelOnlineModels.deleted_flag == 0,
            )
            tenant_user_filters = or_(
                LazymodelOnlineModels.tenant_id == self.tenant_id,
                LazymodelOnlineModels.user_id == Account.get_administrator_id(),
            )
            final_filters = and_(model_key_deleted_filters, tenant_user_filters)
            model = LazymodelOnlineModels.query.filter(final_filters).first()
            if model:
                parent = (
                    db.session.query(Lazymodel)
                    .filter(Lazymodel.id == model.model_id)
                    .first()
                )

                model.model_type = model_type
                model.model_name = model_name

                model.model_brand = parent.model_brand

        else:
            if ":" in model_name:
                name_and_service_id = model_name.split(":")
                model_name = name_and_service_id[0]
                # service_id = name_and_service_id[1]
            model_key_deleted_filters = and_(
                Lazymodel.model_name == model_name, Lazymodel.deleted_flag == 0
            )
            tenant_user_filters = or_(
                Lazymodel.tenant_id == self.tenant_id,
                Lazymodel.user_id == Account.get_administrator_id(),
            )
            final_filters = and_(model_key_deleted_filters, tenant_user_filters)

            model = db.session.query(Lazymodel).filter(final_filters).first()
        return model

    @property
    def model(self):
        """获取任务关联的模型对象。

        Returns:
            object: 模型对象，如果未找到则返回None。
        """
        return self._get_model(self.model_type, self.model_name)

    @property
    def evaluator_model(self):
        """获取AI评估器模型对象。

        Returns:
            object: AI评估器模型对象，如果未找到则返回None。
        """
        return self._get_model(self.ai_evaluator_type, self.ai_evaluator_name)

    @property
    def username(self):
        """获取任务创建者的用户名。

        Returns:
            str: 用户名，如果用户不存在则可能抛出异常。
        """
        from models.model_account import Account

        return Account.query.filter_by(id=self.user_id).first().name

    @property
    def status_zh(self):
        """获取任务状态的中文描述。

        Returns:
            str: 状态的中文描述，如果状态未知则返回空字符串。
        """
        status = {
            "dataset_processing": "数据集处理中",
            "ai_evaluating": "AI测评中",
            "manual_evaluating": "人工测评中",
            "dataset_inference_failed": "数据集处理失败",
            "ai_evalute_failed": "AI测评失败",
            "ai_evaluated": "AI测评结束",
            "done": "测评完成",
        }
        return status.get(self.status, "")

    @property
    def total(self):
        """获取评估数据集的总数据量。

        Returns:
            int: 数据集中的总数据条数。
        """
        return (
            db.session.query(EvaluationDatasetData)
            .filter_by(dataset_id=self.dataset_id)
            .count()
        )

    @property
    def completed(self):
        """获取已完成评估的数据量。

        Returns:
            int: 已完成评估的数据条数。
        """
        return (
            db.session.query(EvaluationDatasetData)
            .filter_by(dataset_id=self.dataset_id)
            .filter_by(is_evaluated=True)
            .count()
        )

    @property
    def process(self):
        """获取评估处理进度。

        Returns:
            str: 处理进度字符串，格式为"已完成/总数"。
        """
        # 获取已评测的数据量/所有数据量
        if self.total == self.completed:
            self.status = "done"

        return f"{self.completed}/{self.total}"

    @property
    def ai_eva_fail(self):
        """获取AI评估失败的数据量。

        Returns:
            int: AI评估失败的数据条数，如果不是AI评估方法则返回0。
        """
        if self.evaluation_method == "ai":
            return self.total - self.completed
        return 0

    @property
    def evaluation_method_name(self):
        """获取评估方法的中文名称。

        Returns:
            str: 评估方法的中文名称，"AI测评"或"人工测评"。
        """
        return "AI测评" if self.evaluation_method == "ai" else "人工测评"

    @property
    def ai_eva_success(self):
        """获取AI评估成功的数据量。

        Returns:
            int: AI评估成功的数据条数，如果不是AI评估方法则返回0。
        """
        if self.evaluation_method == "ai":
            return self.completed
        return 0

    @property
    def created_time(self):
        """获取任务创建时间的格式化字符串。

        Returns:
            str: 创建时间字符串，格式为"YYYY-MM-DD HH:MM:SS"。
        """
        return self.created_at.strftime("%Y-%m-%d %H:%M:%S")


class Dimension(db.Model):
    """评估维度模型，用于定义评估任务的评估维度。

    该模型定义了评估任务的具体评估维度，如准确性、相关性、流畅性等。
    每个维度可以包含多个选项，用于人工评估时的打分。

    Attributes:
        id (int): 维度ID，主键。
        dimension_name (str): 维度名称。
        dimension_description (str): 维度描述。
        task_id (int): 关联的任务ID。
        task (Task): 关联的任务对象。
        ai_base_score (int): AI基础评分。
        options (list): 维度选项列表。
    """

    __tablename__ = "evaluation_dimensions"
    id = db.Column(db.Integer, primary_key=True)
    dimension_name = db.Column(db.String(30), nullable=False)
    dimension_description = db.Column(db.String(100))
    task_id = db.Column(
        db.Integer, db.ForeignKey("evaluation_tasks.id"), nullable=False
    )
    task = db.relationship("Task", back_populates="dimensions")
    ai_base_score = db.Column(db.Integer)
    options = db.relationship(
        "DimensionOption", back_populates="dimension", cascade="all, delete-orphan"
    )


class DimensionOption(db.Model):
    """维度选项模型，用于定义评估维度的具体选项。

    该模型定义了每个评估维度的具体选项，如1分、2分、3分等，
    用于人工评估时选择具体的评分。

    Attributes:
        id (int): 选项ID，主键。
        option_description (str): 选项描述。
        value (int): 选项对应的数值。
        dimension_id (int): 关联的维度ID。
        dimension (Dimension): 关联的维度对象。
    """

    __tablename__ = "dimension_options"
    id = db.Column(db.Integer, primary_key=True)
    option_description = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Integer, nullable=False)
    dimension_id = db.Column(
        db.Integer, db.ForeignKey("evaluation_dimensions.id"), nullable=False
    )
    dimension = db.relationship("Dimension", back_populates="options")


class EvaluationDatasetFile(db.Model):
    """评估数据集文件模型，用于管理评估数据集的文件信息。

    该模型存储评估数据集的文件信息，包括文件路径、大小、类型等。

    Attributes:
        id (int): 文件ID，主键。
        name (str): 文件名称。
        file_path (str): 文件路径。
        has_response (bool): 是否包含响应数据。
        description (str): 文件描述。
        size (int): 文件大小。
        uploaded_at (datetime): 上传时间。
        file_type (str): 文件类型。
    """

    __tablename__ = "evaluation_datasets_file"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    file_path = db.Column(db.String(256), nullable=False)
    has_response = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text)
    size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=db.func.now())
    file_type = db.Column(db.String(50), nullable=True)


class EvaluationDatasetData(db.Model):
    """评估数据集数据模型，用于存储评估数据集的具体数据。

    该模型存储评估数据集中的具体数据条目，包括指令、输出、响应等。

    Attributes:
        id (int): 数据ID，主键。
        dataset_id (int): 数据集ID。
        instruction (str): 指令内容。
        output (str): 输出内容。
        response (str): 响应内容。
        is_evaluated (bool): 是否已评估。
        option_select_id (int): 选择的选项ID。
    """

    __tablename__ = "evaluation_datasets_data"
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    output = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=True)
    is_evaluated = db.Column(db.Boolean, default=False)
    option_select_id = db.Column(db.Integer, nullable=True)


class EvaluationScore(db.Model):
    """评估分数模型，用于存储评估结果的具体分数。

    该模型存储评估任务的具体评分结果，包括任务ID、维度ID、数据ID、分数等。

    Attributes:
        id (int): 分数记录ID，主键。
        task_id (int): 任务ID。
        dimension_id (int): 维度ID。
        option_select_id (int): 选择的选项ID。
        data_id (int): 数据ID。
        score (int): 评估分数。
        remark (str): 备注信息。
        evaluated_at (datetime): 评估时间。
    """

    __tablename__ = "evaluation_score"
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer)
    dimension_id = db.Column(db.Integer)
    option_select_id = db.Column(db.Integer)
    data_id = db.Column(db.Integer)
    score = db.Column(db.Integer)
    remark = db.Column(db.Text)
    evaluated_at = db.Column(db.DateTime, default=db.func.now())
