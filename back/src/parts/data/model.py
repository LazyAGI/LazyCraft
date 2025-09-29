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

from enum import Enum

from sqlalchemy.sql import func

from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


class DataSetVersionStatus(Enum):
    # 正在处理
    version_doing = "1"
    # 处理完成
    version_done = "2"
    # 处理失败
    version_fail = "3"


class DataSetFileStatus(Enum):
    # 等待中
    file_waiting = "1"
    # 解析中
    file_doing = "2"
    # 上传中
    file_uploading = "3"
    # 清洗中
    file_cleaning = "4"
    # 增强中
    file_enhancing = "5"
    # 上传失败
    file_upload_fail = "6"
    # 解析失败
    file_parse_fail = "7"
    # 清洗失败
    file_clean_fail = "8"
    # 增强失败
    file_enhance_fail = "9"
    # 处理完成
    file_done = "10"

    # 去噪中
    file_denoising = "11"
    # 标注中
    file_annotating = "12"
    # 去噪失败
    file_denoise_fail = "13"
    # 标注失败
    file_annotate_fail = "14"
    # 智能处理中
    file_agent_processing = "15"
    # 智能处理失败
    file_agent_processing_fail = "16"

    @staticmethod
    def get_script_type_processing_status(script_type):
        """根据脚本类型获取对应的处理中状态。

        Args:
            script_type (str): 脚本类型，支持 "数据过滤"、"数据增强"、"数据去噪"、"数据标注"。

        Returns:
            str: 对应的处理中状态值，如果脚本类型无效则返回默认处理中状态。
        """
        script_type_to_processing_status = {
            "数据过滤": DataSetFileStatus.file_cleaning.value,
            "数据增强": DataSetFileStatus.file_enhancing.value,
            "数据去噪": DataSetFileStatus.file_denoising.value,
            "数据标注": DataSetFileStatus.file_annotating.value,
            "智能处理": DataSetFileStatus.file_agent_processing.value,
        }
        return script_type_to_processing_status.get(
            script_type, DataSetFileStatus.file_doing.value
        )

    @staticmethod
    def get_script_type_failed_status(script_type):
        """根据脚本类型获取对应的失败状态。

        Args:
            script_type (str): 脚本类型，支持 "数据过滤"、"数据增强"、"数据去噪"、"数据标注"。

        Returns:
            str: 对应的失败状态值，如果脚本类型无效则返回默认失败状态。
        """
        script_type_to_failed_status = {
            "数据过滤": DataSetFileStatus.file_clean_fail.value,
            "数据增强": DataSetFileStatus.file_enhance_fail.value,
            "数据去噪": DataSetFileStatus.file_denoise_fail.value,
            "数据标注": DataSetFileStatus.file_annotate_fail.value,
            "智能处理": DataSetFileStatus.file_agent_processing_fail.value,
        }
        return script_type_to_failed_status.get(
            script_type, DataSetFileStatus.file_parse_fail.value
        )


class DataSet(db.Model):
    """数据集模型，用于存储数据集的基本信息。

    Attributes:
        id (int): 数据集的唯一标识符。
        name (str): 数据集名称。
        description (str, optional): 数据集描述。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        last_sync_at (datetime): 最后同步时间。
        data_type (str): 数据类型，支持 "doc" 或 "pic"。
        upload_type (str): 导入方式，支持 "local"、"url" 或 "return"。
        data_format (str, optional): 数据格式，默认为 "Alpaca_pre_train"。
        from_type (str): 来源类型，支持 "upload" 或 "return"。
        file_urls (list, optional): 文件地址URL列表。
        file_paths (list, optional): 本地文件路径列表。
        user_id (str): 用户ID。
        tenant_id (str, optional): 租户ID。
        user_name (str): 用户名。
        tags_num (int): 标签数量，默认为0。
        branches_num (int): 分支数量，默认为0。
        default_branches_num (int): 默认分支数量，默认为0。
        default_tags_num (int): 默认标签数量，默认为0。
        app_id (str, optional): 应用节点ID，用于数据回流。
        node_id (str, optional): 节点ID，用于数据回流。
        reflux_type (str, optional): 回流类型，支持 "app" 或 "node"。
    """

    __tablename__ = "data_set"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="data_set_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    last_sync_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    data_type = db.Column(db.String(255), nullable=False)  # 数据类型 doc or pic
    upload_type = db.Column(
        db.String(255), nullable=False
    )  # 导入方式 local or url or return
    data_format = db.Column(db.String(255), nullable=True, default="Alpaca_pre_train")
    # 数据格式 Alpaca_pre_train Alpaca预训练 ,Alpaca_fine_tuning Alpaca指令微调 ,Sharegpt_fine_tuning Sharegpt指令微调
    from_type = db.Column(db.String(255), nullable=False)  # 来源 upload or return
    file_urls = db.Column(db.JSON, nullable=True)  # 文件地址 url 存储这里
    file_paths = db.Column(db.JSON, nullable=True)  # 文件路径 local文件 存储这里
    user_id = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(StringUUID, nullable=True)
    user_name = db.Column(db.String(50), nullable=False)  # 用户名
    tags_num = db.Column(db.Integer, nullable=False, server_default="0")
    branches_num = db.Column(db.Integer, nullable=False, server_default="0")
    default_branches_num = db.Column(db.Integer, nullable=False, server_default="0")
    default_tags_num = db.Column(db.Integer, nullable=False, server_default="0")

    # 增加数据回流专用字段
    app_id = db.Column(db.String(255), nullable=True)  # 应用节点id
    node_id = db.Column(db.String(255), nullable=True)  # 节点id
    reflux_type = db.Column(db.String(255), nullable=True)  # 回流类型 app or node

    @property
    def tags(self):
        """获取数据集的标签列表。

        Returns:
            list: 数据集关联的标签名称列表。
        """
        if not hasattr(self, "_tags"):
            self._tags = Tag.get_names_by_target_id(Tag.Types.DATASET, self.id)
        return self._tags

    @property
    def label(self):  # 兼容历史
        """获取数据集的标签列表（兼容历史版本）。

        Returns:
            list: 数据集关联的标签名称列表。
        """
        return self.tags


class DataSetFile(db.Model):
    """数据集文件模型，用于存储数据集中的文件信息。

    Attributes:
        id (int): 数据集文件的唯一标识符。
        name (str): 文件名称。
        path (str): 文件路径或图片路径。
        download_url (str, optional): 文件下载地址。
        status (str): 文件处理状态，如清洗中、解析失败等。
        operation (str, optional): 操作类型，如数据过滤、新增数据等。
        data_set_id (int): 所属数据集ID。
        data_set_version_id (int): 所属数据集版本ID。
        user_id (str): 用户ID。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        finished_at (datetime, optional): 完成时间。
        file_type (str): 文件类型，支持 "doc" 或 "pic"。
        error_msg (str, optional): 错误信息。
    """

    __tablename__ = "data_set_file"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="data_set_file_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.Text, nullable=False)
    path = db.Column(db.Text, nullable=False)  # 文件路径或者图片路径
    download_url = db.Column(db.Text, nullable=True)  # 下载地址
    status = db.Column(db.String(255), nullable=False)  # 清洗中 解析失败等等状态
    operation = db.Column(db.String(255), nullable=True)  # 操作 数据过滤 新增数据等
    data_set_id = db.Column(db.Integer, nullable=False)  # 数据集id
    data_set_version_id = db.Column(db.Integer, nullable=False)  # 数据集版本id
    user_id = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    finished_at = db.Column(db.DateTime, nullable=True)
    file_type = db.Column(db.String(255), nullable=False)  # 文件类型 doc or pic
    error_msg = db.Column(db.Text, nullable=True)  # 错误信息


class DataSetVersion(db.Model):
    """数据集版本模型，用于存储数据集的不同版本信息。

    Attributes:
        id (int): 数据集版本的唯一标识符。
        name (str): 版本名称。
        version (str): 版本号。
        data_set_id (int): 所属数据集ID。
        user_id (str): 用户ID。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        status (str): 数据集版本状态。
        is_original (bool): 是否为原始数据集。
        data_set_file_ids (list, optional): 数据集文件ID列表。
        version_type (str): 数据集版本类型，支持 "branch" 或 "tag"。
        previous_version_id (int, optional): 上一个版本ID。
        version_path (str, optional): 数据集版本所有文件路径。
    """

    __tablename__ = "data_set_version"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="data_set_version_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    version = db.Column(db.String(255), nullable=False)
    data_set_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    status = db.Column(db.String(255), nullable=False)  # 数据集状态
    is_original = db.Column(db.Boolean, nullable=False)  # 是否为原始数据集
    data_set_file_ids = db.Column(db.JSON, nullable=True)  # 数据集文件id列表
    version_type = db.Column(
        db.String(255), nullable=False
    )  # 数据集版本类型 branch or tag
    # is_published = db.Column(db.Boolean, nullable=False)  # 是否已发布 True or False
    previous_version_id = db.Column(db.Integer, nullable=True)
    version_path = db.Column(db.String(255), nullable=True)  # 数据集版本所有文件路径

    @property
    def data_set_files(self):
        """获取数据集版本关联的所有文件。

        Returns:
            list: 数据集版本关联的DataSetFile对象列表。
        """
        return (
            db.session.query(DataSetFile)
            .filter(DataSetFile.data_set_version_id == self.id)
            .all()
        )


class DataSetRefluxData(db.Model):
    """数据集回流数据模型，用于存储从应用回流的数据信息。

    Attributes:
        id (int): 回流数据的唯一标识符。
        data_set_id (int): 数据集ID。
        data_set_version_id (int): 数据集版本ID。
        app_id (str): 应用ID。
        app_name (str, optional): 应用名称。
        module_id (str, optional): 模块ID。
        module_name (str, optional): 模块名称。
        module_type (str, optional): 模块类型。
        output_time (datetime, optional): 输出时间。
        module_input (str, optional): 模块输入信息。
        module_output (str, optional): 模块输出信息。
        conversation_id (str, optional): 对话ID。
        turn_number (int, optional): 问答轮次。
        is_satisfied (bool, optional): 用户是否满意。
        user_feedback (str, optional): 用户反馈信息。
        status (str, optional): 处理状态，如清洗中、解析失败等。
        operation (str, optional): 操作类型，如数据过滤、新增数据等。
        finished_at (datetime, optional): 完成时间。
        error_msg (str, optional): 错误信息。
        user_id (str, optional): 用户ID。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        json_data (dict, optional): JSON格式的额外数据。
    """

    __tablename__ = "data_set_reflux_data"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="data_set_reflux_data_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    data_set_id = db.Column(db.Integer, nullable=False)  # 数据集id
    data_set_version_id = db.Column(db.Integer, nullable=False)  # 数据集版本id

    app_id = db.Column(db.String(255), nullable=False)
    app_name = db.Column(db.String(255), nullable=True)

    module_id = db.Column(db.String(255), nullable=True)
    module_name = db.Column(db.String(255), nullable=True)
    module_type = db.Column(db.String(255), nullable=True)
    output_time = db.Column(db.DateTime, nullable=True)
    module_input = db.Column(db.Text, nullable=True)  # 输入信息
    module_output = db.Column(db.Text, nullable=True)  # 输出信息

    conversation_id = db.Column(db.String(255), nullable=True)  # 对话id
    turn_number = db.Column(db.Integer, nullable=True)  # 问答轮次

    is_satisfied = db.Column(db.Boolean, nullable=True)  # 是否满意，用户操作后回调
    user_feedback = db.Column(db.Text, nullable=True)  # 用户反馈

    status = db.Column(db.String(255), nullable=True)  # 清洗中 解析失败等等状态
    operation = db.Column(db.String(255), nullable=True)  # 操作 数据过滤 新增数据等
    finished_at = db.Column(db.DateTime, nullable=True)
    error_msg = db.Column(db.Text, nullable=True)  # 错误信息

    user_id = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
    json_data = db.Column(db.JSON)
