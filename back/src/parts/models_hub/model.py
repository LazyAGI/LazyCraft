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
import os
from enum import Enum

import requests
# from .model_list import local_finetune_model_list
from flask import g
from sqlalchemy import and_, or_

from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


def check_in_list(input_string, model_list):
    """检查输入字符串是否在模型列表中。

    去除字符串中 / 前的部分，并转为小写后与模型列表进行比较。

    Args:
        input_string (str): 要检查的输入字符串。
        model_list (list): 模型列表。

    Returns:
        bool: 如果输入字符串在模型列表中返回True，否则返回False。
    """
    # 去除字符串中 / 前的部分，并转为小写
    clean_string = (
        input_string.split("/")[1].lower()
        if "/" in input_string
        else input_string.lower()
    )
    # 判断是否在模型列表中（也将模型列表的元素转为小写）
    return clean_string in [model.lower() for model in model_list]


def get_finetune_model_list(only_model_key=False):
    """获取微调模型列表。

    从微调服务端点获取所有可用的微调模型列表。

    Args:
        only_model_key (bool): 是否只返回模型名称列表，默认为False。

    Returns:
        tuple: (bool, list) 第一个元素表示是否成功，第二个元素是模型列表。

    Raises:
        requests.RequestException: 当HTTP请求失败时。
    """
    if os.getenv("CLOUD_SUPPLIER", "lazyllm") == "maas":
        # maas 环境：调用 API 接口
        ft_model_list = []
        get_ft_model_list_url = os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/models:all"
        logging.info(f"get_ft_model_list_url: {get_ft_model_list_url}")
        response = requests.get(get_ft_model_list_url)
        response_data = response.json()
        logging.info(f"get_ft_model_list response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"get_ft_model_list failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False, ft_model_list
        if only_model_key:
            for item in response_data.get("models"):
                ft_model_list.append(item["model"])
        else:
            ft_model_list = response_data.get("models")
        logging.info(f"get_ft_model_list response: {ft_model_list}")
        return True, ft_model_list
    else:
        # 非 maas 环境：从数据库查询本地微调模型
        try:
            local_finetune_models = (
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.model_type == "local",
                    Lazymodel.can_finetune_model == True,
                    Lazymodel.deleted_flag == 0,
                    Lazymodel.model_status == ModelStatus.SUCCESS.value  # 只返回已下载的模型
                )
                .all()
            )
            
            if only_model_key:
                # 只返回模型名称列表
                ft_model_list = [model.model_name for model in local_finetune_models]
            else:
                # 返回完整的模型信息
                ft_model_list = []
                for model in local_finetune_models:
                    model_info = {
                        "author": model.model_brand or "unknown",
                        "model": model.model_name,
                        "category": model.model_kind,
                        "available": True,
                        "source": (model.model_brand or "unknown") + "/" + model.model_key,
                        "template": model.prompt_keys,
                        "display_name": model.model_name,
                        "token_estimation": None,
                        "model_unit_price": None
                    }
                    ft_model_list.append(model_info)
            
            logging.info(f"Found {len(ft_model_list)} local finetune models")
            return True, ft_model_list
            
        except Exception as e:
            logging.error(f"Error retrieving local finetune models: {str(e)}")
            return False, []


class ModelStatus(Enum):
    """模型状态枚举。

    定义模型的各种状态。
    """

    START = 1
    DOWNLOAD = 2
    SUCCESS = 3
    FAILED = 4


class Lazymodel(db.Model):
    """懒加载模型类。

    对应数据库中的models_hub表，用于存储模型的基本信息。

    Attributes:
        id (int): 模型ID，主键。
        model_icon (str): 模型图标。
        model_type (str): 模型类型，如local/online。
        model_name (str): 模型名称。
        description (str): 模型描述。
        model_path (str): 模型路径。
        model_from (str): 模型来源，如huggingface/modelscope/existModel。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        user_id (str): 用户ID。
        tenant_id (str): 租户ID。
        model_kind (str): 模型类别，如Embedding/VQA/SD/STT/TTS/rerank。
        model_key (str): 模型键值。
        model_key_ams (str): 微调模型名称。
        access_tokens (str): 访问令牌。
        model_status (int): 模型状态。
        prompt_keys (str): 提示键。
        model_brand (str): 模型品牌。
        model_url (str): 模型URL。
        model_dir (str): 模型目录。
        download_message (str): 下载消息。
        is_finetune_model (bool): 是否为微调模型。
        parent_model_id (int): 父模型ID。
        source_info (str): 来源信息。
        finetune_task_id (int): 微调任务ID。
        deleted_flag (int): 删除标志。
        builtin_flag (bool): 内置标志。
    """

    __tablename__ = "models_hub"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="models_pkey"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model_icon = db.Column(db.String(255), nullable=False)  # 图标
    model_type = db.Column(db.String(255), nullable=False)  # 模型类型: local/online
    model_name = db.Column(db.String(255), nullable=False)  # 模型名称
    description = db.Column(db.Text, nullable=True)  # 模型描述
    model_path = db.Column(db.String(255), nullable=False)  # 模型路径
    model_from = db.Column(
        db.String(255), nullable=False
    )  # 模型来源: huggingface/modelscope/existModel
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )
    user_id = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(StringUUID, nullable=True)
    model_kind = db.Column(
        db.String(50), nullable=False
    )  # 模型类别: Embedding/VQA/SD/STT/TTS/rerank
    model_key = db.Column(
        db.String(255), nullable=False
    )  # 跟 api_key 需要区分, from huggingface/modelscope 时才有意义
    model_key_ams = db.Column(db.String(255), nullable=True)  # 微调模型名称
    access_tokens = db.Column(db.String(255), nullable=True)
    model_status = db.Column(db.Integer, nullable=False)  # 模型状态
    prompt_keys = db.Column(db.String(255), nullable=False)
    model_brand = db.Column(db.String(255), nullable=False)  # 在线模型
    model_url = db.Column(db.String(255), nullable=False)
    model_dir = db.Column(
        db.String(255), nullable=False, default=""
    )  # 上传文件的唯一位置
    # api_key = db.Column(db.String(255), nullable=False, default='')
    download_message = db.Column(db.Text)  # 下载模型文件错误信息
    is_finetune_model = db.Column(db.Boolean, nullable=True, default=False)
    can_finetune_model = db.Column(db.Boolean, nullable=True, default=False)
    parent_model_id = db.Column(db.Integer, nullable=True, default=0)
    source_info = db.Column(db.String(255), nullable=True, default="")  # 来源信息
    finetune_task_id = db.Column(db.Integer, nullable=True, default=0)
    deleted_flag = db.Column(db.Integer, nullable=False, default=0)
    builtin_flag = db.Column(db.Boolean, nullable=False, default=False)

    @property
    def can_download(self):
        """检查模型是否可以下载。

        判断本地模型且来源为huggingface或modelscope的模型是否可以下载。

        Returns:
            bool: 如果可以下载返回True，否则返回False。
        """
        if self.model_type == "local" and self.model_from in [
            "huggingface",
            "modelscope",
        ]:
            return True
        return False

    @property
    def api_key(self):
        """获取模型的API密钥。

        对于在线模型，从配置信息中获取API密钥。

        Returns:
            str: API密钥，如果不存在则返回空字符串。
        """
        if self.model_type == "online":
            if g.current_user:
                config_info = (
                    db.session.query(LazyModelConfigInfo)
                    .filter(
                        LazyModelConfigInfo.model_id == self.id,
                        LazyModelConfigInfo.tenant_id
                        == g.current_user.current_tenant_id,
                    )
                    .first()
                )
                if config_info:
                    return config_info.api_key

        return ""

    @property
    def proxy_url(self):
        """获取模型的代理URL。

        对于在线模型，从配置信息中获取代理URL。

        Returns:
            str: 代理URL，如果不存在则返回空字符串。
        """
        if self.model_type == "online":
            if g.current_user:
                config_info = (
                    db.session.query(LazyModelConfigInfo)
                    .filter(
                        LazyModelConfigInfo.model_id == self.id,
                        LazyModelConfigInfo.tenant_id
                        == g.current_user.current_tenant_id,
                    )
                    .first()
                )
                if config_info:
                    return config_info.proxy_url or ""

        return ""

    @property
    def proxy_info(self):
        """获取模型的代理信息。

        对于在线模型，从配置信息中获取代理URL和认证信息。

        Returns:
            dict: 包含proxy_url和proxy_auth_info的字典，如果不存在则返回None。
        """
        if self.model_type == "online":
            if g.current_user:
                config_info = (
                    db.session.query(LazyModelConfigInfo)
                    .filter(
                        LazyModelConfigInfo.model_id == self.id,
                        LazyModelConfigInfo.tenant_id == g.current_user.current_tenant_id,
                    )
                    .first()
                )
                if config_info:
                    return {
                        "proxy_url": config_info.proxy_url,
                        "proxy_auth_info": config_info.proxy_auth_info,
                    }
        return None

    @property
    def online_model_list(self):
        """获取在线模型列表。

        根据查询类型获取在线模型列表，支持不同的过滤条件。

        Returns:
            list: 在线模型列表，如果不是在线模型则返回None。
        """
        return self._get_online_model_list()

    def _get_online_model_list(self, can_finetune=None):
        """获取在线模型列表。

        根据查询类型获取在线模型列表，支持不同的过滤条件。

        Args:
            can_finetune (bool, optional): 是否可微调过滤。

        Returns:
            list: 在线模型列表，如果不是在线模型则返回None。
        """
        if self.model_type == "online":
            filters = [
                LazymodelOnlineModels.model_id == self.id,
                LazymodelOnlineModels.deleted_flag == 0,
            ]

            # 添加微调能力过滤
            if can_finetune is not None:
                filters.append(LazymodelOnlineModels.can_finetune == (1 if can_finetune else 0))

            if "qtype" in g and g.qtype and "current_user" in g and g.current_user:
                if g.qtype == "mine":  # 我的
                    filters.append(LazymodelOnlineModels.user_id == g.current_user.id)
                    filters.append(
                        LazymodelOnlineModels.tenant_id
                        == g.current_user.current_tenant_id
                    )
                if g.qtype == "mine_builtin":  # 我的
                    filters.append(
                        or_(
                            LazymodelOnlineModels.tenant_id
                            == g.current_user.current_tenant_id,
                            LazymodelOnlineModels.builtin_flag.is_(True),
                        )
                    )
                elif g.qtype == "group":  # 同组
                    filters.append(LazymodelOnlineModels.user_id != g.current_user.id)
                    filters.append(
                        LazymodelOnlineModels.tenant_id
                        == g.current_user.current_tenant_id
                    )
                elif g.qtype == "already":  # 所有
                    filters.append(
                        or_(
                            LazymodelOnlineModels.tenant_id
                            == g.current_user.current_tenant_id,
                            LazymodelOnlineModels.builtin_flag.is_(True),
                        )
                    )
            models = db.session.query(LazymodelOnlineModels).filter(*filters).all()
            return models
        else:
            return None

    @property
    def model_list(self):
        """获取模型列表。

        根据模型类型获取相应的模型列表，支持在线和本地模型。

        Returns:
            list: 模型列表。
        """
        if self.model_type == "online":
            filters = [
                LazymodelOnlineModels.model_id == self.id,
                LazymodelOnlineModels.deleted_flag == 0,
            ]
            if "qtype" in g and g.qtype and "current_user" in g and g.current_user:
                if g.qtype == "mine":  # 我的
                    filters.append(LazymodelOnlineModels.user_id == g.current_user.id)
                    filters.append(
                        LazymodelOnlineModels.tenant_id
                        == g.current_user.current_tenant_id
                    )
                if g.qtype == "mine_builtin":  # 我的+内置
                    filters.append(
                        or_(
                            and_(
                                LazymodelOnlineModels.user_id == g.current_user.id,
                                LazymodelOnlineModels.tenant_id
                                == g.current_user.current_tenant_id,
                            ),
                            LazymodelOnlineModels.builtin_flag.is_(True),
                        )
                    )
                elif g.qtype == "group":  # 同组
                    filters.append(LazymodelOnlineModels.user_id != g.current_user.id)
                    filters.append(
                        LazymodelOnlineModels.tenant_id
                        == g.current_user.current_tenant_id
                    )
                elif g.qtype == "builtin":  # 内置
                    filters.append(LazymodelOnlineModels.builtin_flag.is_(True))
                elif g.qtype == "already":  # 混合了前3者的数据
                    filters.append(
                        or_(
                            LazymodelOnlineModels.tenant_id
                            == self.account.current_tenant_id,
                            LazymodelOnlineModels.builtin_flag.is_(True),
                        )
                    )

            models = db.session.query(LazymodelOnlineModels).filter(*filters).all()
            return models
        else:
            models = (
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.parent_model_id == self.id, Lazymodel.deleted_flag == 0
                )
                .all()
            )
            return models

    @property
    def can_finetune(self):
        """检查模型是否可以微调。

        判断模型是否支持微调功能。

        Returns:
            bool: 如果可以微调返回True，否则返回False。
        """
        if self.model_type == "local":
            # 新增逻辑，微调过的也可以微调
            if self.is_finetune_model:
                return True
            if self.model_kind == "localLLM" and not self.is_finetune_model:
                success, ft_model_list = get_finetune_model_list(only_model_key=True)
                if success:
                    return check_in_list(self.model_key, ft_model_list)
                return False

        if self.model_type == "online" and self.model_kind == "OnlineLLM":
            online_model_count = (
                db.session.query(LazymodelOnlineModels)
                .filter(
                    LazymodelOnlineModels.deleted_flag == 0,
                    LazymodelOnlineModels.can_finetune == 1,
                    LazymodelOnlineModels.model_id == self.id,
                )
                .count()
            )
            return online_model_count > 0
        return False

    @property
    def val_key(self):
        """获取模型的值键。

        组合模型ID和模型键值生成唯一标识。

        Returns:
            str: 格式为"id$model_key"的值键。
        """
        return str(self.id) + "$" + self.model_key

    @property
    def tags(self):
        """获取模型的标签列表。

        根据模型ID获取关联的标签名称列表。

        Returns:
            list: 标签名称列表。
        """
        return Tag.get_names_by_target_id(Tag.Types.MODEL, self.id)


class LazymodelOnlineModels(db.Model):
    """懒加载在线模型类。

    对应数据库中的lazymodel_online_models表，用于存储在线模型信息。

    Attributes:
        id (int): 模型ID，主键。
        model_id (int): 关联的模型ID。
        model_name (str): 模型名称。
        model_key (str): 模型键值。
        can_finetune (int): 是否可以微调。
        tenant_id (str): 租户ID。
        user_id (str): 用户ID。
        parent_id (int): 父模型ID。
        source_info (str): 来源信息。
        is_finetune_model (bool): 是否为微调模型。
        finetune_task_id (int): 微调任务ID。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
        deleted_flag (int): 删除标志。
        builtin_flag (bool): 内置标志。
    """

    __tablename__ = "lazymodel_online_models"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model_id = db.Column(db.Integer, nullable=False)
    model_name = db.Column(db.String(255), nullable=False)
    model_key = db.Column(db.String(255), nullable=False)
    can_finetune = db.Column(db.Integer, nullable=False, default=0)
    tenant_id = db.Column(StringUUID, nullable=False)
    user_id = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.Integer, nullable=False, default=0)  # 微调任务的父模型Id
    source_info = db.Column(db.String(255), nullable=True, default="")  # 来源信息
    is_finetune_model = db.Column(db.Boolean, nullable=True, default=False)
    finetune_task_id = db.Column(db.Integer, nullable=True, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )
    deleted_flag = db.Column(db.Integer, nullable=False, default=0)
    builtin_flag = db.Column(db.Boolean, nullable=False, default=False)

    @property
    def val_key(self):
        """获取在线模型的值键。

        组合模型ID和模型键值生成唯一标识。

        Returns:
            str: 格式为"model_id$model_key"的值键。
        """
        return str(self.model_id) + "$" + self.model_key


class LazyModelConfigInfo(db.Model):
    """懒加载模型配置信息类。

    对应数据库中的lazymodel_config_info表，用于存储模型的配置信息。

    Attributes:
        id (int): 配置ID，主键。
        model_icon (str): 模型图标。
        model_id (int): 模型ID。
        tenant_id (str): 租户ID。
        user_id (str): 用户ID。
        api_key (str): API密钥。
        proxy_url (str): 代理URL。
        proxy_auth_info (str): 代理认证信息。
        created_at (datetime): 创建时间。
        updated_at (datetime): 更新时间。
    """

    __tablename__ = "lazymodel_config_info"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model_icon = db.Column(db.String(255), nullable=True)  # 图标
    model_id = db.Column(db.Integer, nullable=False)
    tenant_id = db.Column(StringUUID, nullable=False)
    user_id = db.Column(db.String(255), nullable=False)
    api_key = db.Column(db.String(255), nullable=False, default="")
    proxy_url = db.Column(db.String(255), nullable=False, default="")
    proxy_auth_info = db.Column(db.String(255), nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )


class AITools(db.Model):
    """AI工具类。

    对应数据库中的ai_tools表，用于存储AI工具信息。

    Attributes:
        id (int): 工具ID。
        name (str): AI能力名称。
        content (str): 内容。
        inferservice (str): 推理服务。
        model_name (str): 模型名称。
        tenant_id (str): 所属工作空间ID。
    """

    __tablename__ = "ai_tools"
    __table_args__ = (db.PrimaryKeyConstraint("id", "tenant_id", name="ai_tools_pkey"),)
    id = db.Column(db.Integer, nullable=False)
    # AI能力
    name = db.Column(db.String(50), nullable=False)
    # 内容
    content = db.Column(db.String(255), nullable=True)
    # 推理服务
    inferservice = db.Column(db.String(50), nullable=True)
    # 模型
    model_name = db.Column(db.String(50), nullable=False)
    # 所属工作空间
    tenant_id = db.Column(StringUUID, db.ForeignKey("tenants.id"), nullable=False)

    @classmethod
    def from_json(cls, j: dict, tenant_id: str):
        """从JSON字典创建AITools实例。

        根据JSON字典和租户ID创建AITools对象。

        Args:
            j (dict): 包含AI工具信息的字典。
            tenant_id (str): 租户ID。

        Returns:
            AITools: 创建的AITools实例。

        Raises:
            KeyError: 当必需字段缺失时。
        """
        id = j.get("id")
        name = j["name"]
        content = j.get("content")
        inferservice = j.get("inferservice")
        model_name = j["model_name"]
        return AITools(
            id=id,
            name=name,
            content=content,
            inferservice=inferservice,
            model_name=model_name,
            tenant_id=tenant_id,
        )

    def to_dict(self, j: dict):
        """将AITools对象转换为字典。

        将AITools实例的所有属性转换为字典格式。

        Args:
            j (dict): 额外的参数字典（未使用）。

        Returns:
            dict: 包含AITools所有属性的字典。
        """
        return {
            "id": self.id,
            "name": self.name,
            "content": self.content,
            "inferservice": self.inferservice,
            "model_name": self.model_name,
            "tenant_id": self.tenant_id,
        }
