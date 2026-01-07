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
import shutil
import tarfile
import zipfile

import requests
from flask_restful import marshal
from scoamp.globals import set_auth_info, set_endpoint, set_path_prefix
from scoamp.toolkit import create_and_upload_model, snapshot_download
from sqlalchemy import and_, asc, desc, exists, or_
from flask_login import current_user
from core.account_manager import AccountService
from lazyllm.components import ModelManager
from lazyllm.engine import LightEngine
import lazyllm
from core.account_manager import CommonError
from libs.filetools import FileTools
from libs.timetools import TimeTools
from models.model_account import Account, Tenant
from parts.knowledge_base.model import FileRecord
from parts.logs import Action, LogService, Module
from parts.tag.model import ChoiceTag, Tag
from parts.tag.tag_service import TagService
from utils.util_database import db

from . import fields
from .model import (Lazymodel, LazyModelConfigInfo, LazymodelOnlineModels,
                    ModelStatus)
from .model_list import model_card_kinds, model_kinds
from .websocket_handle import send_ms


def extract_archive(file_path, target_dir):
    """自动识别压缩包格式并解压。

    支持zip、tar、tar.gz格式的压缩包解压。

    Args:
        file_path (str): 压缩包文件路径。
        target_dir (str): 解压目标目录。

    Returns:
        None: 无返回值。

    Raises:
        ValueError: 当压缩包格式不支持时。
        RuntimeError: 当rar文件未安装rarfile库时。
    """
    if file_path.lower().endswith(".zip"):
        with zipfile.ZipFile(file_path, "r") as zip_ref:
            zip_ref.extractall(target_dir)
    elif file_path.lower().endswith((".tar.gz", ".tgz")):
        with tarfile.open(file_path, "r:gz") as tar_ref:
            tar_ref.extractall(target_dir)
    elif file_path.lower().endswith(".tar"):
        with tarfile.open(file_path, "r:") as tar_ref:
            tar_ref.extractall(target_dir)
    # elif file_path.lower().endswith('.rar'):
    #     if not _has_rarfile:
    #         raise RuntimeError('未安装rarfile库，无法解压rar文件')
    #     with rarfile.RarFile(file_path) as rar_ref:
    #         rar_ref.extractall(target_dir)
    else:
        raise ValueError(f"不支持的压缩包格式: {file_path}")


class ModelService:
    """模型服务类。

    提供模型管理相关的业务逻辑操作。
    """

    def __init__(self, account):
        """初始化模型服务。

        传入account的好处是后续如果业务改为需要租户ID，不需要再修改大量函数入参。

        Args:
            account: 用户账户对象。

        Returns:
            None: 无返回值。
        """
        # 传入account的好处, 是后续如果业务改为需要租户ID, 不需要再修改大量函数入参
        self.user_id = account.id
        self.account = account

    def amp_upload(self, model_name, model_dir, model_sapce):
        """上传模型到AMP平台。

        将本地模型上传到AI模型平台。

        Args:
            model_name (str): 模型名称。
            model_dir (str): 模型目录路径。
            model_sapce (str): 模型空间。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当上传失败时。
        """
        set_auth_info(os.getenv("AMP_ACCESS_KEY"), os.getenv("AMP_SECRET_KEY"))
        set_endpoint(os.getenv("AMP_ENDPOINT", "NOT_SET_AMP_ENDPOINT!!"))
        set_path_prefix(False)
        try:
            need_delete_file = model_dir + "/" + ".gitattributes"
            os.remove(need_delete_file)
        except Exception as e:
            logging.error(f"amp_upload error: {e}")
        logging.info(
            f"start amp upload model: {model_name}, {model_dir}, {model_sapce}"
        )
        create_and_upload_model(model_name, model_dir, model_sapce, allow_exist=False)
        logging.info(
            f"finish amp upload model: {model_name}, {model_dir}, {model_sapce}"
        )

    def amp_download(self, model_name, model_dir, model_sapce):
        """从AMP平台下载模型。

        从AI模型平台下载模型到本地。

        Args:
            model_name (str): 模型名称。
            model_dir (str): 下载目标目录。
            model_sapce (str): 模型空间。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当下载失败时。
        """
        set_auth_info(os.getenv("AMP_ACCESS_KEY"), os.getenv("AMP_SECRET_KEY"))
        set_endpoint(os.getenv("AMP_ENDPOINT", "NOT_SET_AMP_ENDPOINT!!"))
        set_path_prefix(False)
        logging.info(
            f"start amp_download model: {model_name}, {model_dir}, {model_sapce}"
        )
        snapshot_download(model_name, model_dir)
        logging.info(
            f"finish amp_download model: {model_name}, {model_dir}, {model_sapce}"
        )

    def amp_delete(self, model_name):
        """从AMP平台删除模型。

        从AI模型平台删除指定的模型。

        Args:
            model_name (str): 要删除的模型名称。

        Returns:
            bool: 删除成功返回True，失败返回False。

        Raises:
            requests.RequestException: 当HTTP请求失败时。
        """
        amp_delete_url = (
            os.getenv("AMP_ENDPOINT", "NOT_SET_AMP_ENDPOINT!!")
            + "/v1/subscriptions/"
            + os.getenv("AMP_SUBSCROPTION_NAME")
            + "/resourceGroups/"
            + os.getenv("AMP_RESOURCE_GROUP_NAME")
            + "/zones/"
            + os.getenv("AMP_ZONE")
            + "/modelSpaces/"
            + os.getenv("AMP_DEFAULT_MODEL_SPACE")
            + "/models/"
            + model_name
        )
        logging.info(f"amp_delete_url: {amp_delete_url}")
        response = requests.delete(amp_delete_url, timeout=5)
        response_data = response.json()
        logging.info(f"amp delete response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"amp delete failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False
        return True

    def amp_get_model_size(self, model_name):
        """获取AMP平台模型大小。

        从AI模型平台获取指定模型的大小信息。

        Args:
            model_name (str): 模型名称。

        Returns:
            tuple: (bool, int) 第一个元素表示是否成功，第二个元素是模型大小（字节）。

        Raises:
            requests.RequestException: 当HTTP请求失败时。
        """
        amp_get_url = os.getenv("AMP_ENDPOINT", "NOT_SET_AMP_ENDPOINT!!") + "/v1/models/" + model_name
        logging.info(f"amp_get_url: {amp_get_url}")
        response = requests.get(amp_get_url, timeout=5)
        response_data = response.json()
        logging.info(
            f"amp get response: {response.status_code}, {response_data.get('repository_size_bytes')}"
        )
        if response.status_code != 200:
            logging.info(
                f"amp get model size failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False, 0
        return True, response_data.get("repository_size_bytes")

    def get_pagination(self, data):
        """获取模型分页列表。

        根据查询条件获取模型的分页列表，支持多种过滤条件。

        Args:
            data (dict): 包含查询条件的字典。

        Returns:
            dict: 包含分页信息的字典。

        Raises:
            Exception: 当查询失败时。
        """
        search_online_llm = False
        filters = []
        target_tenant_id = self.account.current_tenant_id
        if data.get('tenant'):
            target_tenant_id = data['tenant']
        query = Lazymodel.query.outerjoin(
            LazyModelConfigInfo,
            (Lazymodel.id == LazyModelConfigInfo.model_id)
            & (LazyModelConfigInfo.tenant_id == target_tenant_id),
        ).filter(Lazymodel.deleted_flag == 0)

        if data.get("search_tags"):
            target_ids = Tag.get_target_ids_by_names(
                Tag.Types.MODEL, data["search_tags"]
            )
            target_ids = [int(k) for k in target_ids]
            query = query.filter(Lazymodel.id.in_(target_ids))

        if data.get("search_name"):
            search_name = data["search_name"]
            query = query.filter(
                or_(
                    Lazymodel.model_name.ilike(f"%{search_name}%"),
                    Lazymodel.description.ilike(f"%{search_name}%"),
                )
            )

        if data.get("model_type"):
            query = query.filter(Lazymodel.model_type == data["model_type"])
            if data.get("model_type") == "online":
                search_online_llm = True
                if data.get("model_brand"):
                    query = query.filter(Lazymodel.model_brand == data["model_brand"])

        if data.get("model_kind"):
            query = query.filter(Lazymodel.model_kind == data["model_kind"])

        if data.get("status"):
            query = query.filter(
                and_(
                    Lazymodel.model_status == data["status"],
                    Lazymodel.model_type == "local",
                )
            )

        if data.get("qtype") == "mine":  # 我的
            # exists_query = exists().where(LazymodelOnlineModels.user_id == self.account.id,
            #                               LazymodelOnlineModels.tenant_id == target_tenant_id,
            #                               Lazymodel.id == LazymodelOnlineModels.model_id,
            #                               LazymodelOnlineModels.deleted_flag == 0)
            exists_query = exists().where(
                Lazymodel.id == LazymodelOnlineModels.model_id,
                LazymodelOnlineModels.deleted_flag == 0,
            )
            filters.append(
                or_(
                    and_(
                        Lazymodel.model_type == "local",
                        Lazymodel.tenant_id == target_tenant_id,
                        Lazymodel.user_id == self.account.id,
                    ),
                    and_(Lazymodel.model_type == "online", exists_query),
                )
            )
        elif data.get("qtype") == "group":  # 同组
            # exists_query = exists().where(LazymodelOnlineModels.user_id != self.account.id,
            #                               LazymodelOnlineModels.tenant_id == target_tenant_id,
            #                               Lazymodel.id == LazymodelOnlineModels.model_id,
            #                               LazymodelOnlineModels.deleted_flag == 0)
            exists_query = exists().where(
                Lazymodel.id == LazymodelOnlineModels.model_id,
                LazymodelOnlineModels.deleted_flag == 0,
            )
            filters.append(
                or_(
                    and_(
                        Lazymodel.model_type == "local",
                        Lazymodel.tenant_id == target_tenant_id,
                        Lazymodel.user_id != self.account.id,
                    ),
                    and_(Lazymodel.model_type == "online", exists_query),
                )
            )
        elif data.get("qtype") == "builtin":  # 内置
            filters.append(Lazymodel.builtin_flag.is_(True))
        elif data.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    Lazymodel.tenant_id == target_tenant_id,
                    Lazymodel.user_id == Account.get_administrator_id(),
                )
            )
        else:
            filters.append(Lazymodel.user_id == self.account.id)

        if data.get("available") is not None:
            if data["available"] == 1:
                # 查询可用模型
                filters.append(
                    or_(
                        Lazymodel.model_status == ModelStatus.SUCCESS.value,
                        and_(
                            Lazymodel.model_type == "online",
                            LazyModelConfigInfo.api_key.isnot(None),
                        ),
                    )
                )
            elif data["available"] == 0:
                # 查询不可用模型
                filters.append(
                    and_(
                        Lazymodel.model_status != ModelStatus.SUCCESS.value,
                        or_(
                            Lazymodel.model_type == "online",
                            LazyModelConfigInfo.api_key.is_(None),
                        ),
                    )
                )
        query = query.filter(*filters)
        query = query.order_by(
            desc(
                or_(
                    Lazymodel.model_status == ModelStatus.SUCCESS.value,
                    LazyModelConfigInfo.api_key.isnot(None),
                )
            ),
            desc(Lazymodel.id),
        )
        pagination = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )
        if search_online_llm:
            # 获取支持的品牌列表
            queryset = ChoiceTag.query.filter_by(type="llm").all()
            supported_brands = [m.name for m in queryset]

        for i in pagination.items:
            if i.user_id and i.user_id == Account.get_administrator_id():
                i.user_name = "Lazy LLM官方"
            else:
                i.user_name = getattr(db.session.get(Account, i.user_id), "name", "")
            if search_online_llm:
                if i.api_key is None or i.api_key == "":
                    i.model_status = ModelStatus.START.value
                # 判断 i.model_brand 是否在 queryset 中，忽略大小写,此处主要处理历史数据
                lower_model_brand = (
                    i.model_brand.lower() if hasattr(i, "model_brand") else None
                )
                for brand in supported_brands:
                    if brand.lower() == lower_model_brand:
                        i.model_brand = brand
                        break
            i.model_kind_display = model_card_kinds.get(i.model_kind, i.model_kind)
            if data.get("model_type") == "online":
                i.model_kind_display = model_kinds.get(i.model_kind, i.model_kind)

        return pagination

    def validate_local_model(self, model):
        """校验本地模型的数据。

        验证本地模型的必要字段和业务规则。

        Args:
            model (Lazymodel): 要验证的模型对象。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当模型数据不符合要求时。
        """
        # 模型类别改为从model_kinds中获取
        if not model.model_kind and model.model_kind not in model_kinds.keys():
            raise ValueError("请输入正确模型类别")
        if not model.model_from:
            raise ValueError("请输入正确模型来源")
        if model.model_from in ["huggingface", "modelscope"] and not model.model_key:
            raise ValueError("请输入正确模型key")
        if self.exist_model_by_name(model.model_name):
            raise ValueError("模型名称已存在")
        if model.model_from in [
            "huggingface",
            "modelscope",
        ] and self.exist_model_by_key(model.model_from, model.model_key):
            raise ValueError("该模型已添加")

    def update_or_create_api_key(
        self, model_brand, api_key, proxy_url=None, proxy_auth_info=None
    ):
        """更新或创建API密钥。

        根据模型品牌和API密钥新增或更新LazyModelConfigInfo中的配置信息。

        Args:
            model_brand (str): 模型品牌。
            api_key (str): API密钥。
            proxy_url (str, optional): 代理URL。
            proxy_auth_info (dict, optional): 代理认证信息。

        Returns:
            str: 操作结果消息。

        Raises:
            CommonError: 当API密钥无效或认证异常时。
        """

        # 验证 api_key 和 proxy_url 至少有一个存在
        if not (api_key or proxy_url):
            raise CommonError("api_key 和 proxy_url 不能同时为空，至少需要提供一个")
        
        # 只有当 api_key 存在且非空时，才进行验证
        if api_key and api_key.strip():
            res = False
            try:
                split_keys = api_key.split(":")
                secret_key = None
                origin_key = api_key
                if model_brand == "SenseNova" and len(split_keys) < 2:
                    raise CommonError("key 无效！")
                if len(split_keys) >= 2:
                    origin_key = split_keys[0]
                    secret_key = split_keys[1]

                # OpenAI 跳过验证 api_key
                if model_brand != "OpenAI":
                    m = lazyllm.OnlineChatModule(source=model_brand.lower(),api_key=origin_key, secret_key=secret_key)
                    res = m._validate_api_key()
                
                    if not res:
                        raise CommonError("key 无效！")
            except Exception as e:
                logging.error(f"update_or_create_api_key error: {e}")
                raise CommonError("api_key 认证异常")

        # 查找对应 model_brand 的模型
        models = Lazymodel.query.filter(
            Lazymodel.model_brand == model_brand, Lazymodel.model_type == "online"
        ).all()
        api_key = api_key if api_key else ""
        for model in models:
            # 检查 LazyModelConfigInfo 中是否已有该模型的配置
            config = LazyModelConfigInfo.query.filter(
                LazyModelConfigInfo.model_id == model.id,
                LazyModelConfigInfo.tenant_id == self.account.current_tenant_id,
            ).first()

            if config:
                # 更新 api_key
                config.api_key = api_key
            else:
                # 新增配置
                config = LazyModelConfigInfo(
                    user_id=self.account.id,
                    model_id=model.id,
                    tenant_id=self.account.current_tenant_id,
                    api_key=api_key,
                )
                db.session.add(config)

            if proxy_url is None or proxy_url == "":
                config.proxy_url = ""
            else:
                config.proxy_url = str(proxy_url)
            if proxy_auth_info is not None:
                config.proxy_auth_info = json.dumps(proxy_auth_info)

            model.model_status = ModelStatus.SUCCESS.value

        # 提交数据库更改
        db.session.commit()
        return "API key 已更新或新增"

    def clear_api_key(self, model_brand):
        """清除API密钥。

        清除指定模型品牌的所有API密钥配置。

        Args:
            model_brand (str): 模型品牌。

        Returns:
            str: 操作结果消息。
        """
        models = Lazymodel.query.filter(
            Lazymodel.model_brand == model_brand, Lazymodel.model_type == "online"
        ).all()
        for model in models:
            db.session.query(LazyModelConfigInfo).filter(
                LazyModelConfigInfo.user_id == self.account.id,
                LazyModelConfigInfo.model_id == model.id,
                LazyModelConfigInfo.tenant_id == self.account.current_tenant_id,
            ).delete()
        db.session.commit()
        return "API key 已清除"

    def create_model(self, data):
        """创建模型。

        根据提供的数据创建新的模型记录。

        Args:
            data (dict): 包含模型信息的字典。

        Returns:
            Lazymodel: 创建的模型对象。

        Raises:
            CommonError: 当模型名称已存在时。
        """
        # now_str = TimeTools.get_china_now()
        exists = (
            db.session.query(Lazymodel)
            .filter(
                Lazymodel.model_name == data.get("model_name"),
                Lazymodel.tenant_id == self.account.current_tenant_id,
                Lazymodel.deleted_flag == 0,
            )
            .count()
        )
        if exists > 0:
            raise CommonError("已经存在相同名称的模型")

        model_brand = data.get("model_brand")
        model = Lazymodel(
            user_id=self.account.id,
            tenant_id=self.account.current_tenant_id,
            model_icon=data.get("model_icon") or "/app/upload/online.jpg",
            model_type=data.get("model_type") or "",
            model_name=data.get("model_name") or "",
            description=data.get("description") or "",
            model_path=data.get("model_path") or "",
            model_from=data.get("model_from") or "",
            # created_at=now_str,
            # updated_at=now_str,
            source_info=data.get("source_info") or "user create",
            model_kind=data.get("model_kind") or "",
            model_key=data.get("model_key") or "",
            access_tokens=data.get("access_tokens") or "",
            model_status=ModelStatus.START.value,
            prompt_keys=data.get("prompt_keys") or "",
            model_brand=model_brand if model_brand else "mine",
            model_url=data.get("model_url") or "",
            model_dir=data.get("model_dir") or "",
            builtin_flag=(self.account.id == Account.get_administrator_id()),
        )
        if data["model_type"] == "online":
            # if self.account.id != Account.get_administrator_id():
            #     raise CommonError(f'没有权限创建在线模型，请前往{data.get("model_brand")}这个模型添加清单')
            model_s = (
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.model_type == "online",
                    Lazymodel.model_kind == data["model_kind"],
                    Lazymodel.model_brand == data["model_brand"],
                    Lazymodel.deleted_flag == 0,
                )
                .first()
            )
            if model_s is not None:
                model = model_s
            # model.builtin_flag = True

        # 在添加到数据库前进行校验
        if model.model_type == "local":
            self.validate_local_model(model)

            # 如果model.model_dir不为空且值中没有/，则将model.model_dir值进行地址增强
            if model.model_dir and "/" not in model.model_dir:
                base_path = os.getenv("APP_MODEL_PATH", "/app/upload")
                target_dir = FileTools.create_model_storage(
                    self.account.id, model.model_dir, base_path=base_path
                )
                model.model_dir = target_dir

            manage = ModelManager(
                model_source=model.model_from, token=model.access_tokens
            )
            if model.model_from == "localModel":
                if not model.model_dir:
                    raise CommonError("模型目录不能为空")

                if not ModelManager.validate_model_path(model.model_dir):
                    raise CommonError("模型不可用,不存在有效的权重文件!")
                new_model_path = os.getenv("LAZYLLM_MODEL_PATH") + "/" + model.model_name
                if not os.path.exists(new_model_path):
                    shutil.copytree(model.model_dir, new_model_path)
                # 删除model.model_dir目录
                shutil.rmtree(model.model_dir)

                model.model_status = ModelStatus.SUCCESS.value
                model.download_message = "localModel successful"

                model.model_path = new_model_path
                model.model_dir = new_model_path
            if model.access_tokens is not None and model.access_tokens != "":
                token_validate = manage.validate_token()
                if not token_validate:
                    raise CommonError("access token 无效")

        if model.id is None:
            db.session.add(model)
            db.session.flush()
        if model.model_type == "online":
            if data.get("model_list"):
                m = json.loads(data.get("model_list"))
                if len(m) > 0:
                    for i in m:
                        lm = LazymodelOnlineModels(
                            user_id=self.account.id,
                            tenant_id=self.account.current_tenant_id,
                            model_id=model.id,
                            parent_id=0,
                            is_finetune_model=False,
                            deleted_flag=0,
                            source_info="user create",
                            model_name="",
                            model_key=i["model_key"],
                            can_finetune=i["can_finetune"],
                            builtin_flag=(
                                self.account.id == Account.get_administrator_id()
                            ),
                        )
                        db.session.add(lm)
        db.session.commit()
        # 保存模型使用空间
        if data.get("model_path") is not None and data.get("model_path") != "":
            Tenant.save_used_storage(
                self.account.current_tenant_id,
                FileTools.get_dir_path_size(data.get("model_path")),
            )

            # delete local model
            if model.model_from == "localModel":
                # shutil.rmtree(data.get('model_path'))
                print("不删除本地模型")

        # 新增：绑定标签
        if data.get("tag_names"):
            TagService(self.account).update_tag_binding(
                Tag.Types.MODEL, model.id, data["tag_names"]
            )

        return model

    def save_online_model_list(self, model_id, model_list):
        """
        保存在线模型列表到 LazymodelOnlineModels 表。

        Args:
            model_id (int): Lazymodel 主表ID。
            model_list (list): 在线模型信息列表，每项为 dict，包含 model_key、can_finetune 等字段。

        Returns:
            dict: 保存结果，包含 message 和 success 字段。

        Raises:
            CommonError: 如果模型不存在或 model_key 已存在。
        """
        # 1. 校验model_id是否存在
        model = Lazymodel.query.filter_by(id=model_id, deleted_flag=0).first()
        if not model:
            raise CommonError("模型不存在，无法保存在线模型列表")

        is_administrator = self.account.id == Account.get_administrator_id()

        # 2. 检查model_list每条数据是否已存在（区分管理员和普通用户）
        existed_keys = []
        conflict_user_records = []  # 记录需要禁用的普通用户记录

        for item in model_list:
            model_key = item.get("model_key")
            if not model_key:
                continue

            if is_administrator:
                # 管理员：检查内置模型是否已存在
                builtin_exists = LazymodelOnlineModels.query.filter_by(
                    model_id=model_id, model_key=model_key,
                    builtin_flag=True, deleted_flag=0
                ).first()
                if builtin_exists:
                    existed_keys.append(model_key)
                else:
                    # 检查普通用户是否有同名模型，如果有则需要禁用
                    user_records = LazymodelOnlineModels.query.filter(
                        LazymodelOnlineModels.model_id == model_id,
                        LazymodelOnlineModels.model_key == model_key,
                        LazymodelOnlineModels.builtin_flag == False,
                        LazymodelOnlineModels.deleted_flag == 0
                    ).all()
                    conflict_user_records.extend(user_records)
            else:
                # 普通用户：先检查内置模型是否存在
                builtin_exists = LazymodelOnlineModels.query.filter_by(
                    model_id=model_id, model_key=model_key,
                    builtin_flag=True, deleted_flag=0
                ).first()
                if builtin_exists:
                    existed_keys.append(f"{model_key}(内置模型已存在)")
                    continue

                # 再检查当前用户+租户是否已添加
                user_exists = LazymodelOnlineModels.query.filter_by(
                    model_id=model_id, model_key=model_key,
                    user_id=self.account.id,
                    tenant_id=self.account.current_tenant_id,
                    deleted_flag=0
                ).first()
                if user_exists:
                    existed_keys.append(model_key)

        if existed_keys:
            raise CommonError(f"以下model_key已存在: {', '.join(existed_keys)}")

        # 3. 如果是管理员添加，禁用冲突的普通用户记录
        if is_administrator and conflict_user_records:
            for record in conflict_user_records:
                record.deleted_flag = 1

        # 4. 批量保存（设置 builtin_flag）
        now = TimeTools.get_china_now()
        new_models = []
        for item in model_list:
            model_key = item.get("model_key")
            can_finetune = item.get("can_finetune", 0)
            if not model_key:
                continue
            new_model = LazymodelOnlineModels(
                user_id=self.account.id,
                tenant_id=self.account.current_tenant_id,
                model_id=model_id,
                parent_id=0,
                is_finetune_model=False,
                deleted_flag=0,
                source_info="user create",
                model_name="",
                model_key=model_key,
                can_finetune=can_finetune,
                created_at=now,
                updated_at=now,
                finetune_task_id=0,
                builtin_flag=is_administrator,
            )
            new_models.append(new_model)
        if new_models:
            db.session.add_all(new_models)
            db.session.commit()
            return {"message": "保存成功", "success": True}
        else:
            return {"message": "没有可保存的数据", "success": False}

    def delete_online_model_list(self, model_id, model_keys):
        """
        删除 LazymodelOnlineModels 表中指定 model_id 和 model_key 的记录（逻辑删除）。

        普通用户不能删除内置模型（builtin_flag=True）。

        Args:
            model_id (int): Lazymodel 主表ID。
            model_keys (list): 需要删除的 model_key 列表。

        Returns:
            dict: 删除结果，包含 message 和 success 字段。

        Raises:
            CommonError: 如果参数为空、模型不存在或无权限删除内置模型。
        """
        if not model_id or not model_keys:
            raise CommonError("model_id和model_keys不能为空")
        # 1. 校验model_id是否存在
        model = Lazymodel.query.filter_by(id=model_id, deleted_flag=0).first()
        if not model:
            raise CommonError("模型不存在，无法删除在线模型列表")

        is_administrator = self.account.id == Account.get_administrator_id()

        # 2. 查询并逻辑删除（普通用户不能删除内置模型）
        deleted_count = 0
        for key in model_keys:
            record = LazymodelOnlineModels.query.filter_by(
                model_id=model_id, model_key=key, deleted_flag=0
            ).first()
            if record:
                # 普通用户不能删除内置模型
                if record.builtin_flag and not is_administrator:
                    raise CommonError(f"内置模型 {key} 无权限删除")
                record.deleted_flag = 1
                deleted_count += 1
        if deleted_count > 0:
            db.session.commit()
            return {"message": f"成功删除{deleted_count}条记录", "success": True}
        else:
            return {"message": "未找到可删除的数据", "success": False}

    def create_finetune_model(
        self, base_model, data, status=ModelStatus.SUCCESS.value, create_from=""
    ):
        """
        创建微调模型。

        Args:
            base_model (int): 父模型ID。
            data (dict): 微调模型相关参数。
            status (int, optional): 模型状态，默认 ModelStatus.SUCCESS.value。
            create_from (str, optional): 创建来源。

        Returns:
            Lazymodel or LazymodelOnlineModels: 创建的微调模型对象。

        Raises:
            CommonError: 如果模型名已存在、token无效等。
        """
        parent_model = (
            db.session.query(Lazymodel).filter(Lazymodel.id == base_model).first()
        )
        if parent_model.model_type == "online":
            p_m = (
                db.session.query(LazymodelOnlineModels)
                .filter(
                    LazymodelOnlineModels.model_id == parent_model.id,
                    LazymodelOnlineModels.model_key == data.get("base_model_key"),
                )
                .first()
            )
            lm = LazymodelOnlineModels(
                user_id=data.get("user_id"),
                tenant_id=data.get("current_tenant_id"),
                model_id=parent_model.id,
                parent_id=p_m.id,
                is_finetune_model=True,
                deleted_flag=0,
                source_info=data.get("source_info") or "",
                model_name=data.get("target_model_name", parent_model.model_name),
                model_key=data.get("target_model_key"),
                can_finetune=0,
                created_at=TimeTools.get_china_now(),
                updated_at=TimeTools.get_china_now(),
                finetune_task_id=data.get("finetune_task_id"),
            )
            db.session.add(lm)
            db.session.commit()
            return lm
        if "target_model_name" in data and create_from != "finetune":
            name_exists = (
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.deleted_flag == 0,
                    Lazymodel.tenant_id == data.get("current_tenant_id"),
                    Lazymodel.model_name == data["target_model_name"],
                )
                .count()
            )
            if name_exists > 0:
                raise CommonError("模型名称已存在")

        model = Lazymodel(
            user_id=data.get("user_id"),
            tenant_id=data.get("current_tenant_id"),
            model_icon=parent_model.model_icon,
            model_type=parent_model.model_type,
            model_name=data.get("target_model_name") or "",
            description=data.get("description") or "",
            model_path=data.get("model_path") or data.get("model_key"),
            model_from=data.get("model_from") or parent_model.model_from,
            model_kind=parent_model.model_kind,
            model_key=data.get("target_model_key") or "",
            access_tokens=data.get("access_tokens") or "",
            model_status=status,
            prompt_keys=parent_model.prompt_keys,
            model_brand=parent_model.model_brand,
            model_url=parent_model.model_url,
            model_dir=data.get("model_dir") or "",
            is_finetune_model=True,
            parent_model_id=base_model,
            source_info=data.get("source_info") or "",  # 来源信息
            finetune_task_id=data.get("finetune_task_id"),
            created_at=TimeTools.get_china_now(),
            updated_at=TimeTools.get_china_now(),
        )
        if model.access_tokens is not None and model.access_tokens != "":
            manage = ModelManager(
                model_source=model.model_from, token=model.access_tokens
            )
            token_validate = manage.validate_token()
            if not token_validate:
                raise CommonError("access token 无效")
        LogService().add(
            Module.MODEL_MANAGEMENT,
            Action.IMPORT_FINETUNE_MODEL,
            model_name=parent_model.model_name,
            finetune_model_name=data.get("target_model_name")
            or data.get("target_model_key"),
            source_info=data.get("model_from") or data.get("source_info", "local"),
            user_id=data.get("user_id"),
        )
        db.session.add(model)
        db.session.commit()
        return model

    def create_ft_finetune_model(
        self, base_model, data, status=ModelStatus.SUCCESS.value, create_from=""
    ):
        """
        创建本地微调模型（FT）。

        Args:
            base_model (int): 父模型ID。
            data (dict): 微调模型相关参数。
            status (int, optional): 模型状态，默认 ModelStatus.SUCCESS.value。
            create_from (str, optional): 创建来源。

        Returns:
            Lazymodel: 创建的本地微调模型对象。
        """
        model = Lazymodel(
            user_id=data.get("user_id"),
            tenant_id=data.get("current_tenant_id"),
            model_icon=data.get("model_icon") or "/app/upload/online.jpg",
            model_type="local",
            model_name=data.get("target_model_name") or "",
            description=data.get("description") or "",
            model_path=data.get("model_path")
            or data.get("model_key"),  # ft target model name
            model_from=data.get("model_from"),
            model_kind="localLLM",
            model_key=data.get("base_model_key"),
            model_key_ams=data.get("base_model_key_ams"),  # base model name in ft
            # model_key=data.get('target_model_key') or '',
            access_tokens=data.get("access_tokens") or "",
            model_status=status,
            prompt_keys="",
            model_brand="",
            model_url="",
            model_dir=data.get("model_dir") or "",
            is_finetune_model=True,
            parent_model_id=base_model,  # 0 in ft
            source_info=data.get("source_info") or "",  # 来源信息
            finetune_task_id=data.get("finetune_task_id"),
            created_at=TimeTools.get_china_now(),
            updated_at=TimeTools.get_china_now(),
        )
        LogService().add(
            Module.MODEL_MANAGEMENT,
            Action.IMPORT_FINETUNE_MODEL,
            model_name=data.get("base_model_key"),
            finetune_model_name=data.get("target_model_name")
            or data.get("target_model_key"),
            source_info=data.get("model_from") or data.get("source_info", "local"),
            user_id=data.get("user_id"),
        )
        db.session.add(model)
        db.session.commit()
        return model

    def get_model_by_id(self, model_id):
        """根据ID获取模型。

        根据模型ID获取模型对象。

        Args:
            model_id (int): 模型ID。

        Returns:
            Lazymodel: 模型对象，如果不存在则返回None。
        """
        return Lazymodel.query.get(model_id)

    def delete_model(self, model_id, qtype="mine"):
        """删除模型。

        根据模型ID和查询类型删除模型。

        Args:
            model_id (int): 模型ID。
            qtype (str, optional): 查询类型，默认为"mine"。

        Returns:
            bool: 删除成功返回True，失败返回False。
        """
        model = Lazymodel.query.get(model_id)
        if model.model_type == "online":
            filters = [
                LazymodelOnlineModels.model_id == model.id,
                LazymodelOnlineModels.deleted_flag == 0,
            ]
            if qtype == "mine":  # 我的
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "group":  # 同组
                filters.append(LazymodelOnlineModels.user_id != self.account.id)
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "builtin":  # 内置
                filters.append(
                    LazymodelOnlineModels.user_id == Account.get_administrator_id()
                )
            else:
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
            db.session.query(LazymodelOnlineModels).filter(*filters).update(
                {"deleted_flag": 1}, synchronize_session=False
            )
            count = (
                db.session.query(LazymodelOnlineModels)
                .filter(
                    LazymodelOnlineModels.model_id == model.id,
                    LazymodelOnlineModels.deleted_flag == 0,
                )
                .count()
            )
            if count == 0:
                Tag.delete_bindings(Tag.Types.MODEL, model_id)
        else:
            try:
                # get mpdel size
                amp_get_result, amp_get_size = self.amp_get_model_size(model.model_name)
                if amp_get_result:
                    # delete from amp
                    self.amp_delete(model.model_name)
                    # if not amp_delete_result:
                    # return False
            except Exception as e:
                logging.info(f"amp delete failed: {str(e)}")
                # return False
            model.deleted_flag = 1
            Tag.delete_bindings(Tag.Types.MODEL, model_id)
            db.session.query(Lazymodel).filter(Lazymodel.id == model.id).update(
                {"deleted_flag": 1}, synchronize_session=False
            )
            db.session.commit()
            logging.info(f"module delete success: {model.model_name}")
        # 删除对应模型路径下的资源占用
        # Tenant.restore_used_storage(model.tenant_id, FileTools.get_dir_path_size(model.model_path))
        Tenant.restore_used_storage(
            model.tenant_id, FileTools.get_dir_path_size(model.model_path)
        )

        # # 删除对应模型子模型路径下的资源占用
        child_model = db.session.query(Lazymodel).filter(
            Lazymodel.parent_model_id == model.id
        )
        # 获取child_model的model_path，
        for child in child_model:
            try:
                # get mpdel size
                amp_get_result, amp_get_size = self.amp_get_model_size(model.model_name)
                if not amp_get_result:
                    return False
                # delete from amp
                self.amp_delete(child.model_name)
                # if not amp_delete_result:
                # return False
            except Exception as e:
                logging.info(f"amp delete failed: {str(e)}")
                # return False
            child.deleted_flag = 1
            db.session.query(Lazymodel).filter(Lazymodel.id == child.id).update(
                {"deleted_flag": 1}, synchronize_session=False
            )
            db.session.commit()
            logging.info(f"module delete success: {child.model_name}")
            Tenant.restore_used_storage(
                model.tenant_id, FileTools.get_dir_path_size(child.model_path)
            )
        return True

    def delete_finetune_model(self, model_id, finetune_model_id):
        """
        删除微调模型。

        Args:
            model_id (int): 父模型ID。
            finetune_model_id (int): 微调模型ID。

        Returns:
            bool: 删除成功返回 True。

        Raises:
            CommonError: 删除失败时抛出。
        """
        model = Lazymodel.query.get(model_id)
        if model.model_type == "local":
            fine_model = Lazymodel.query.get(finetune_model_id)
            LogService().add(
                Module.MODEL_MANAGEMENT,
                Action.DELETE_FINETUNE_MODEL,
                model_name=model.model_name,
                finetune_model_name=(
                    fine_model.model_name
                    if fine_model.model_name is not None and fine_model.model_name != ""
                    else fine_model.model_key
                ),
                source_info=fine_model.source_info,
            )
            self.delete_model(finetune_model_id)
        else:
            online_model = LazymodelOnlineModels.query.get(finetune_model_id)
            online_model.deleted_flag = 1
            db.session.commit()
            LogService().add(
                Module.MODEL_MANAGEMENT,
                Action.DELETE_FINETUNE_MODEL,
                model_name=model.model_name,
                finetune_model_name=(
                    online_model.model_name
                    if online_model.model_name is not None
                    and online_model.model_name != ""
                    else online_model.model_key
                ),
                source_info=online_model.source_info,
            )
        return True

    def exist_model_by_name(self, model_name):
        """
        判断指定名称的模型是否存在。

        Args:
            model_name (str): 模型名称。

        Returns:
            bool: 存在返回 True，否则返回 False。
        """
        model = Lazymodel.query.filter_by(
            model_name=model_name,
            tenant_id=self.account.current_tenant_id,
            deleted_flag=0,
        ).first()
        return True if model else False

    def exist_model_by_key(self, model_from, model_key):
        """
        判断指定来源和 key 的模型是否存在。

        Args:
            model_from (str): 模型来源。
            model_key (str): 模型 key。

        Returns:
            bool: 存在返回 True，否则返回 False。
        """
        model = Lazymodel.query.filter_by(
            model_key=model_key,
            tenant_id=self.account.current_tenant_id,
            model_from=model_from,
            deleted_flag=0,
        ).first()
        return True if model else False

    def update_model(self, model_id, api_key, proxy_url="", proxy_auth_info=None):
        model = Lazymodel.query.get(model_id)
        if not model:
            raise CommonError("模型不存在")
        if model.model_type != "online":
            raise CommonError("只有在线模型支持配置 api_key")
        engine = LightEngine()
        res = False
        try:
            split_keys = api_key.split(":")
            secret_key = None
            origin_key = api_key
            if model.model_brand == "SenseNova" and len(split_keys) < 2:
                raise CommonError("key 无效！")
            if len(split_keys) >= 2:
                origin_key = split_keys[0]
                secret_key = split_keys[1]
            m = lazyllm.OnlineChatModule(source=model.model_brand.lower(),api_key=origin_key, secret_key=secret_key)
            res = m._validate_api_key()
        except Exception as e:
            logging.error(f"update_model error: {e}")
            raise CommonError("api_key 认证异常")
        if res:
            if model.model_type == "online":
                model_config_s = (
                    db.session.query(LazyModelConfigInfo)
                    .where(
                        LazyModelConfigInfo.model_id == model_id,
                        LazyModelConfigInfo.tenant_id == self.account.current_tenant_id,
                    )
                    .first()
                )
                if model_config_s is None:
                    model_config = LazyModelConfigInfo(
                        model_id=model_id,
                        user_id=self.account.id,
                        tenant_id=self.account.current_tenant_id,
                        created_at=TimeTools.get_china_now(),
                        updated_at=TimeTools.get_china_now(),
                    )
                else:
                    model_config = model_config_s
                model_config.updated_at = TimeTools.get_china_now()
                model_config.api_key = api_key
                if proxy_url is None or proxy_url == "":
                    model_config.proxy_url = ""
                else:
                    model_config.proxy_url = str(proxy_url)
                model_config.proxy_auth_info = json.dumps(proxy_auth_info)
                if model_config.id is None:
                    db.session.add(model_config)
                db.session.commit()
        else:
            raise CommonError("这是一个无效的 api_key")
        if api_key:
            model.model_status = ModelStatus.SUCCESS.value
        else:
            model.model_status = ModelStatus.START.value
        db.session.commit()
        return model

    def download_model(self, id, model_key, model_from, access_tokens):
        """
        调用 lazyllm 组件下载模型。

        Args:
            id (int): 模型ID。
            model_key (str): 模型 key。
            model_from (str): 模型来源。
            access_tokens (str): 访问令牌。

        Returns:
            None

        Raises:
            CommonError: 下载失败或 token 无效时抛出。
            ValueError: 来源无效时抛出。
        """
        model = Lazymodel.query.get(id)

        # 由于下载后模型是提供给lazyllm使用, 因此这里调用lazyllm的下载方法, 保持统一
        model.model_path = model_key
        model.model_status = ModelStatus.DOWNLOAD.value
        db.session.commit()
        is_end_flag = False

        def call_back(n, total, status=ModelStatus.DOWNLOAD.value):
            nonlocal is_end_flag
            if is_end_flag:
                return
            is_end_flag = n == total
            print(f"model_key download process {n}/{total}")
            send_ms(
                task_id=str(id),
                msg={
                    "current": n,
                    "total": total,
                    "is_end": n == total,
                    "percent": int(n / total * 100),
                    "status": status,
                },
            )

        try:
            if model_from in ["huggingface", "modelscope"]:
                manage = ModelManager(model_source=model_from, token=access_tokens)
                if access_tokens:
                    token_validate = manage.validate_token()
                    if not token_validate:
                        raise CommonError("access token 无效")

                logging.info(f"开始下载模型: {model_key} from {model_from}")
                res = manage.download(model_key, call_back)
                logging.info(
                    f"模型下载完成: {model_key} from {model_from}, 结果: {res}"
                )
                # model_path记录为model_key即可
                db.session.remove()
                model = Lazymodel.query.get(id)
                if res:
                    base_model_path = os.getenv("LAZYLLM_MODEL_PATH")
                    final_model_path = res
                    if base_model_path:
                        target_model_path = os.path.join(base_model_path, model.model_name)
                        if os.path.exists(target_model_path):
                            # 如果是软链接，需要删除后重新复制
                            if os.path.islink(target_model_path):
                                os.unlink(target_model_path)
                                logging.info(
                                    "删除旧的软链接: %s", target_model_path
                                )
                            else:
                                # 如果目标路径已存在且是实际目录，直接使用
                                final_model_path = target_model_path
                                logging.info(
                                    "模型目录已存在: %s", target_model_path
                                )
                        
                        # 如果目标路径不存在或已被删除，则复制模型文件
                        if not os.path.exists(target_model_path):
                            os.makedirs(base_model_path, exist_ok=True)
                            # 如果 res 是软链接，获取实际路径
                            source_path = res
                            if os.path.islink(res):
                                source_path = os.path.realpath(res)
                                logging.info(
                                    "源路径是软链接，使用实际路径: %s -> %s",
                                    res,
                                    source_path,
                                )
                            
                            # 验证源路径是否存在且是有效目录
                            if not os.path.exists(source_path) or not os.path.isdir(source_path):
                                error_msg = f"源模型路径无效: {source_path}"
                                logging.error(error_msg)
                                raise CommonError(error_msg)
                            
                            logging.info(
                                "开始复制模型 %s 从 %s 到 %s",
                                model.model_name,
                                source_path,
                                target_model_path,
                            )
                            # 复制模型文件到目标路径
                            shutil.copytree(source_path, target_model_path)
                            logging.info(
                                "模型复制完成: %s -> %s",
                                model.model_name,
                                target_model_path,
                            )
                            final_model_path = target_model_path
                    model.model_path = final_model_path
                    model.model_status = ModelStatus.SUCCESS.value
                    model.download_message = "Download successful"
                    db.session.commit()
                    call_back(100, 100, status=ModelStatus.SUCCESS.value)
                    Tenant.save_used_storage(
                        model.tenant_id, FileTools.get_dir_path_size(model.model_path)
                    )

                    # delete local model
                    if os.path.exists(res):
                        # shutil.rmtree(res)
                        print("不删除本地模型")
                        logging.info(
                            f"模型下载成功,不删除本地模型.{model_key} from {model_from}, 目录: {res}"
                        )
                else:
                    model.model_status = ModelStatus.FAILED.value
                    model.download_message = "Fail"
                    db.session.commit()
                    logging.info(f"模型下载失败.{model_key} from {model_from}")
                    call_back(1, 1, status=ModelStatus.FAILED.value)
            else:
                raise ValueError(f"Invalid source: {model_from}")

        except Exception as e:
            logging.exception(e)
            model.model_status = ModelStatus.FAILED.value
            model.download_message = str(e)
            db.session.commit()
            logging.info(f"模型下载失败.{model_key} from {model_from}, 异常: {e}")

            call_back(1, 1, status=ModelStatus.FAILED.value)

    def upload_file_chunk(self, file, filename, file_dir, chunk_number, total_chunks):
        """
        保存上传的文件分片。

        Args:
            file (FileStorage): 上传的文件分片。
            filename (str): 文件名。
            file_dir (str): 文件目录。
            chunk_number (int): 当前分片编号。
            total_chunks (int): 总分片数。

        Returns:
            str: 分片文件保存路径。
        """
        user_id = self.user_id
        base_path = os.getenv("APP_MODEL_PATH", "/app/upload")
        chunk_dir = FileTools.create_temp_storage(
            user_id, file_dir, filename + "_chunks", base_path=base_path
        )
        # 保存分片
        chunk_path = os.path.join(chunk_dir, f"chunk_{int(chunk_number)}")
        file.save(chunk_path)
        return chunk_path

    def merge_file_chunks(self, filename, file_dir):
        """
        合并文件分片并解压。

        Args:
            filename (str): 文件名。
            file_dir (str): 文件目录。

        Returns:
            FileRecord: 合并后的文件记录对象。

        Raises:
            Exception: 合并或解压失败时抛出。
        """
        user_id = self.user_id
        base_path = os.getenv("APP_MODEL_PATH", "/app/upload")
        chunk_dir = FileTools.create_temp_storage(
            user_id, file_dir, filename + "_chunks", base_path=base_path
        )
        chunks = sorted(
            os.listdir(chunk_dir), key=lambda x: int(x.split("_")[1])
        )  # 获取所有分片并排序

        target_dir = FileTools.create_model_storage(
            user_id, file_dir, base_path=base_path
        )
        new_file_path = os.path.join(target_dir, filename)
        # 合并分片
        with open(new_file_path, "wb") as outfile:
            for chunk in chunks:
                with open(os.path.join(chunk_dir, chunk), "rb") as infile:
                    outfile.write(infile.read())
        # 删除分片文件夹
        for chunk in chunks:
            os.remove(os.path.join(chunk_dir, chunk))
        os.rmdir(chunk_dir)

        # 将new_file_path这个压缩包解压到target_dir
        extract_archive(new_file_path, target_dir)

        # 删除new_file_path
        os.remove(new_file_path)

        # 处理解压后的文件夹结构
        # 如果target_dir下只有一个文件夹，则将其内容移动到target_dir
        extracted_items = os.listdir(target_dir)
        if len(extracted_items) == 1:
            single_item = os.path.join(target_dir, extracted_items[0])
            if os.path.isdir(single_item):
                # 如果只有一个文件夹，将其内容移动到target_dir
                self._move_folder_contents(single_item, target_dir)
                # 删除空的文件夹
                os.rmdir(single_item)

        file_record = FileRecord.init_as_models_hub(user_id, filename, target_dir)
        db.session.add(file_record)
        db.session.commit()
        return file_record

    def _move_folder_contents(self, src_dir, dst_dir):
        """
        将源目录下的所有内容移动到目标目录。

        Args:
            src_dir (str): 源目录路径。
            dst_dir (str): 目标目录路径。

        Returns:
            None
        """
        import shutil

        for item in os.listdir(src_dir):
            src_item = os.path.join(src_dir, item)
            dst_item = os.path.join(dst_dir, item)

            if os.path.exists(dst_item):
                # 如果目标路径已存在，先删除
                if os.path.isdir(dst_item):
                    shutil.rmtree(dst_item)
                else:
                    os.remove(dst_item)

            # 移动文件或文件夹
            shutil.move(src_item, dst_item)

    def delete_uploaded_file(self, filename, file_dir):
        """
        删除上传的文件及分片。

        Args:
            filename (str): 文件名。
            file_dir (str): 文件目录。

        Returns:
            dict: 删除结果，包含 message 和 success 字段。
        """
        # 1. 判断是否有分片临时目录, 有则删除
        user_id = self.user_id
        base_path = os.getenv("APP_MODEL_PATH", "/app/upload")
        chunk_dir = FileTools.create_temp_storage(
            user_id, file_dir, filename + "_chunks", base_path=base_path
        )
        if os.path.isdir(chunk_dir):
            # 直接删除分片目录
            shutil.rmtree(chunk_dir, ignore_errors=True)
            logging.info(f"分片临时目录已删除: {chunk_dir}")

        # 2. 判断是否被 Lazymodel 表引用
        target_dir = FileTools.create_model_storage(
            user_id, file_dir, base_path=base_path
        )
        # new_file_path = os.path.join(target_dir, filename)
        model_in_use = (
            db.session.query(Lazymodel)
            .filter(Lazymodel.model_path == target_dir, Lazymodel.deleted_flag == 0)
            .first()
        )
        if model_in_use:
            return {"message": "文件已被模型引用，无法删除", "success": False}

        # 3. 删除 FileRecord 记录
        file_record = (
            db.session.query(FileRecord).filter_by(file_path=target_dir).first()
        )
        if file_record:
            db.session.delete(file_record)
            db.session.commit()

        # 4. 删除物理文件/目录
        if os.path.exists(target_dir):
            if os.path.isfile(target_dir):
                os.remove(target_dir)
            elif os.path.isdir(target_dir):
                shutil.rmtree(target_dir, ignore_errors=True)
        return {"message": "文件已删除", "success": True}

    def get_model_path_by_file_dir(self, file_dir):
        """
        从已上传的文件中，查询到模型的路径。

        Args:
            file_dir (str): 文件目录。

        Returns:
            str: 模型路径，未找到返回空字符串。
        """
        user_id = self.user_id
        file_record = (
            db.session.query(FileRecord)
            .filter_by(user_id=user_id, file_dir=file_dir)
            .first()
        )
        if file_record:
            return os.path.dirname(file_record.file_path)
        else:
            return ""

    def get_model_path_by_exist_model(self, model_name):
        """
        根据模型名获取已存在模型的路径。

        Args:
            model_name (str): 模型名称。

        Returns:
            str: 模型路径，未找到返回空字符串。
        """
        if model_name:
            return os.getenv("CONFIG_EXIST_MODEL_PATH") + os.sep + model_name
        else:
            return ""

    @staticmethod
    def get_model_path_by_id(local_id):
        """
        通过id，查询到本地模型的路径。

        Args:
            local_id (int): 本地模型ID。

        Returns:
            str: 模型路径，未找到返回空字符串。
        """
        try:
            local_id = int(local_id)
            model = Lazymodel.query.filter_by(id=local_id).first()
            return model.model_path if model else ""
        except Exception as e:
            logging.exception(e)
            return str(local_id)

    @staticmethod
    def get_model_id_by_name(model_name):
        """
        通过model_name，查询到online模型的model_id。

        Args:
            model_name (int): 在线模型名称。

        Returns:
            int: 模型ID。
        """

        online_model_instance = LazymodelOnlineModels.query.filter(
            LazymodelOnlineModels.model_key == model_name
        ).first()
        if online_model_instance:
            return online_model_instance.model_id
        return ""

    @staticmethod
    def get_model_apikey_by_id(online_id):
        """
        通过id，查询到online模型的api_key。

        Args:
            online_id (int): 在线模型ID。

        Returns:
            dict: 包含api_key、secret_key（如有）、source等信息。

        Raises:
            CommonError: 没有可用的api_key时抛出。
        """

        if isinstance(online_id, str) and online_id.isdigit():
            online_id = int(online_id)
        if not isinstance(online_id, int):
            return {}

        # 只有sensenova平台需要api_key + secret_key, 其余平台只需要api_key
        # 如果model_brand = sensenova, 则model.api_key = api_key:secret_key
        admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
        tenant_id = current_user.current_tenant_id if current_user else admin_account.current_tenant_id
        model_instance = Lazymodel.query.filter(Lazymodel.id == online_id).first()
        model_brand = model_instance.model_brand if model_instance else None
        model_config = LazyModelConfigInfo.query.filter(
            LazyModelConfigInfo.model_id == online_id,
            LazyModelConfigInfo.tenant_id == tenant_id,
            or_(
                LazyModelConfigInfo.api_key != "",
                LazyModelConfigInfo.proxy_url != "",
            ),
        ).first()
        if model_config is not None:
            split_keys = model_config.api_key.split(":")
            proxy_url = model_config.proxy_url
            if len(split_keys) >= 2:
                result = {"api_key": split_keys[0], "secret_key": split_keys[1]}
            else:
                result = {"api_key": model_config.api_key}

            if proxy_url:
                result["proxy_url"] = proxy_url
            if model_brand:
                result["source"] = model_brand
            return result
        else:
            raise CommonError("没有可用的 api_key")

    def _get_finetune_model_names(self):
        """获取微调模型名称列表（缓存版本）。

        Returns:
            set: 微调模型名称集合。
        """
        from parts.models_hub.model import get_finetune_model_list
        success, ft_model_list = get_finetune_model_list(only_model_key=True)
        return set(ft_model_list) if success else set()

    def _filter_by_can_finetune(self, model_records, finetune_model_names, can_finetune):
        """根据微调能力过滤模型列表。

        Args:
            model_records (list): 模型记录列表。
            finetune_model_names (set): 微调模型名称集合。
            can_finetune (bool): 微调能力过滤条件。

        Returns:
            list: 过滤后的模型记录列表。
        """
        filtered_records = []
        for model in model_records:
            if model.model_type == "local":
                # 本地模型：检查是否在微调模型列表中
                can_finetune_model = False
                if model.is_finetune_model:
                    can_finetune_model = True
                elif model.model_kind == "localLLM" and not model.is_finetune_model:
                    can_finetune_model = model.model_key in finetune_model_names
                
                # 根据 can_finetune 参数进行过滤
                if can_finetune is True and can_finetune_model:
                    filtered_records.append(model)
                elif can_finetune is False and not can_finetune_model:
                    filtered_records.append(model)
            elif model.model_type == "online" and model.model_kind == "OnlineLLM":
                # 在线模型：检查是否有符合条件的子模型
                online_models = model._get_online_model_list(can_finetune=can_finetune)
                if online_models:  # 如果有符合条件的子模型，则添加父模型
                    filtered_records.append(model)
        return filtered_records

    def get_models(
        self,
        account,
        model_type,
        model_kind,
        model_kinds=[],
        can_finetune=None,
        args=None,
    ):
        """
        获取模型列表。

        Args:
            account: 用户账户对象。
            model_type (str): 模型类型。
            model_kind (str): 模型类别。
            model_kinds (list, optional): 模型类别列表。
            can_finetune (bool, optional): 是否可微调过滤。
            args (dict, optional): 其他过滤参数。

        Returns:
            list: 模型信息列表。
        """

        filters = [
            Lazymodel.model_status == ModelStatus.SUCCESS.value,
            Lazymodel.deleted_flag == 0,
        ]
        if args["qtype"] == "mine":  # 我的
            filters.append(
                or_(
                    and_(
                        Lazymodel.user_id == self.account.id,
                        Lazymodel.tenant_id == self.account.current_tenant_id,
                    ),
                    Lazymodel.user_id == Account.get_administrator_id(),
                )
            )
            filters.append(
                or_(
                    Lazymodel.model_type == "local",
                    and_(
                        Lazymodel.model_type == "online",
                        exists().where(
                            LazyModelConfigInfo.model_id == Lazymodel.id,
                            LazyModelConfigInfo.user_id == self.account.id,
                            LazyModelConfigInfo.tenant_id
                            == self.account.current_tenant_id,
                            LazyModelConfigInfo.api_key != "",
                        ),
                    ),
                )
            )
        elif args["qtype"] == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    Lazymodel.tenant_id == self.account.current_tenant_id,
                    Lazymodel.user_id == Account.get_administrator_id(),
                )
            )
            filters.append(
                or_(
                    Lazymodel.model_type == "local",
                    and_(
                        Lazymodel.model_type == "online",
                        exists().where(
                            LazyModelConfigInfo.model_id == Lazymodel.id,
                            LazyModelConfigInfo.tenant_id
                            == self.account.current_tenant_id,
                             or_(
                                LazyModelConfigInfo.api_key != "",
                                LazyModelConfigInfo.proxy_url != "",
                            ),
                        ),
                    ),
                )
            )

        query = db.session.query(Lazymodel).filter(*filters)
        if model_type:
            query = query.filter(Lazymodel.model_type == model_type)
        if model_kind:
            query = query.filter(Lazymodel.model_kind == model_kind)
        if len(model_kinds) > 0:
            query = query.filter(Lazymodel.model_kind.in_(model_kinds))
        model_records = query.all()
        
        # 使用优化的过滤逻辑
        if can_finetune is not None:
            finetune_model_names = set()
            finetune_model_names = self._get_finetune_model_names()
            model_records = self._filter_by_can_finetune(model_records, finetune_model_names, can_finetune)
        
        records = []
        p_list = [i for i in model_records if not i.is_finetune_model]
        f_list = [i for i in model_records if i.is_finetune_model]
        for m in p_list:
            if m.model_type == "local":
                m_dict = marshal(m, fields.model_select_fields)
                m_dict["can_select"] = True
                child = [i for i in f_list if i.parent_model_id == m.id]
                if len(child) > 0:
                    m_dict["child"] = marshal(child, fields.model_select_fields)
                    m_dict["child"].append(marshal(m, fields.model_select_fields))
                    m_dict["can_select"] = False
                    # 这里val_key 会和子类重复,除去$后面的数据(含$)
                    m_dict["val_key"] = m_dict["val_key"].split("$")[0]
                    del m_dict["id"]
                records.append(m_dict)
            else:
                m_dict = marshal(m, fields.model_select_fields)
                m_dict["can_select"] = True
                if m.model_type == "online":
                    m_dict["can_select"] = False
                    # 使用新的方法进行微调能力过滤
                    # can_finetune=None: 返回全部模型
                    # can_finetune=True: 只返回能微调的模型
                    # can_finetune=False: 只返回不能微调的模型
                    models = m._get_online_model_list(can_finetune=can_finetune)
                    o_p_list = [i for i in models if not i.is_finetune_model]
                    o_f_list = [i for i in models if i.is_finetune_model]
                    m_dict["child"] = []
                    for op in o_p_list:
                        o_dict = marshal(op, fields.model_select_fields)
                        o_dict["can_select"] = True
                        child = [i for i in o_f_list if i.parent_id == op.id]
                        if len(child) > 0:
                            m_dict["can_select"] = False
                            o_dict["can_select"] = False
                            o_dict["can_finetune"] = False
                            o_dict["model_name"] = m.model_name
                            o_dict["child"] = marshal(child, fields.model_select_fields)
                            o_dict["child"].append(
                                marshal(op, fields.model_select_fields)
                            )
                            del o_dict["id"]
                            for x in o_dict["child"]:
                                x["id"] = m.id
                            m_dict["child"].append(o_dict)
                        else:
                            m_dict["child"].append(o_dict)
                        for x in m_dict["child"]:
                            x["id"] = m.id
                records.append(m_dict)
        return records

    def get_model_info(self, model_id, qtype="mine"):
        """
        获取模型详细信息。

        Args:
            model_id (int): 模型ID。
            qtype (str, optional): 查询类型。

        Returns:
            dict: 模型详细信息。
        """
        model = db.session.query(Lazymodel).filter(Lazymodel.id == model_id).first()
        if model is None:
            raise CommonError("基础模型不存在")
        base = marshal(model, fields.model_fields)
        if model.user_id and model.user_id == Account.get_administrator_id():
            base["user_name"] = "Lazy LLM官方"
        else:
            base["user_name"] = getattr(
                db.session.get(Account, model.user_id), "name", ""
            )
        base["model_kind_display"] = model_kinds.get(model.model_kind, model.model_kind)
        if model.model_type == "local":
            finetune_models = (
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.parent_model_id == model.id,
                    Lazymodel.is_finetune_model == "True",
                )
                .all()
            )
            base["finetune_models"] = marshal(
                finetune_models, fields.finetune_model_fields
            )

        else:
            filters = [
                LazymodelOnlineModels.model_id == model.id,
                LazymodelOnlineModels.deleted_flag == 0,
            ]
            if qtype == "mine":  # 我的
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "group":  # 同组
                filters.append(LazymodelOnlineModels.user_id != self.account.id)
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "builtin":  # 内置
                filters.append(
                    LazymodelOnlineModels.user_id == Account.get_administrator_id()
                )
            elif qtype == "already":  # 混合了前3者的数据
                filters.append(
                    or_(
                        LazymodelOnlineModels.tenant_id
                        == self.account.current_tenant_id,
                        LazymodelOnlineModels.user_id == Account.get_administrator_id(),
                    )
                )
            else:
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
            model_list = db.session.query(LazymodelOnlineModels).filter(*filters).all()
            if model_list is None:
                return base
            or_list = marshal(
                [i for i in model_list if not i.is_finetune_model],
                fields.online_model_fields,
            )
            p_list = [
                i for i in model_list if not i.is_finetune_model and i.can_finetune == 1
            ]
            f_list = [i for i in model_list if i.is_finetune_model]
            p_list = marshal(p_list, fields.online_model_fields)
            f_list = marshal(f_list, fields.online_model_fields)
            base["model_list"] = or_list
            for p in p_list:
                p["finetune_models"] = [i for i in f_list if i["parent_id"] == p["id"]]
            base["models"] = p_list
        return base

    def get_finetune_pagination(self, data, qtype="mine"):
        """
        获取微调模型的分页列表。

        Args:
            data (dict): 查询参数，包含模型ID等。
            qtype (str, optional): 查询类型。

        Returns:
            Pagination: 微调模型分页对象。
        """
        base_model_id = data["model_id"]
        online_model_id = data["online_model_id"]

        model = Lazymodel.query.filter(
            Lazymodel.id == base_model_id, Lazymodel.deleted_flag == 0
        ).first()
        query = None
        cls = None
        filters = []
        if model.model_type == "local":
            filters.append(Lazymodel.tenant_id == self.account.current_tenant_id)
            query = Lazymodel.query.filter(
                Lazymodel.parent_model_id == base_model_id, Lazymodel.deleted_flag == 0
            )
            cls = Lazymodel
        else:
            if online_model_id is None or online_model_id == "":
                return []
            filters.append(LazymodelOnlineModels.model_id == base_model_id)
            if qtype == "mine":  # 我的
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "group":  # 同组
                filters.append(
                    LazymodelOnlineModels.user_id != self.account.current_user.id
                )
                filters.append(
                    LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
                )
            elif qtype == "builtin":  # 内置
                filters.append(
                    LazymodelOnlineModels.user_id == Account.get_administrator_id()
                )
            else:
                filters.append(LazymodelOnlineModels.user_id == self.account.id)
            query = LazymodelOnlineModels.query.filter(
                LazymodelOnlineModels.parent_id == online_model_id,
                LazymodelOnlineModels.deleted_flag == 0,
                LazymodelOnlineModels.is_finetune_model == "True",
            )
            cls = LazymodelOnlineModels
        query = query.filter(*filters)
        query = query.order_by(cls.created_at.desc())
        return query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

    def update_online_model_list(self, data, qtype):
        """
        批量更新在线模型列表。

        Args:
            data (dict): 包含 base_model_id、model_list 等信息。
            qtype (str): 查询类型。

        Returns:
            bool: 更新成功返回 True。

        Raises:
            CommonError: 数据校验失败时抛出。
        """
        model_id = data.get("base_model_id")
        model_list = data.get("model_list")
        for item in model_list:
            if "id" in item:
                item["id"] = int(item["id"])
        model_keys = [item["model_key"] for item in model_list]
        if len(model_keys) != len(set(model_keys)):
            raise CommonError("模型Id 不能重复")
        model_list_id = {int(item["id"]) for item in model_list if "id" in item}
        filters = [
            LazymodelOnlineModels.model_id == model_id,
            LazymodelOnlineModels.deleted_flag == 0,
            LazymodelOnlineModels.is_finetune_model == "False",
        ]
        if qtype == "mine":  # 我的
            filters.append(LazymodelOnlineModels.user_id == self.account.id)
            filters.append(
                LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
            )
        elif qtype == "group":  # 同组
            filters.append(
                LazymodelOnlineModels.user_id != self.account.current_user.id
            )
            filters.append(
                LazymodelOnlineModels.tenant_id == self.account.current_tenant_id
            )
        elif qtype == "builtin":  # 内置
            filters.append(
                LazymodelOnlineModels.user_id == Account.get_administrator_id()
            )
        else:
            filters.append(LazymodelOnlineModels.user_id == self.account.id)
        online_model_list = LazymodelOnlineModels.query.filter(*filters).all()
        online_model_list = marshal(online_model_list, fields.online_model_fields)
        online_model_list_id = {int(item["id"]) for item in online_model_list}

        del_list = [
            item for item in online_model_list if int(item["id"]) not in model_list_id
        ]
        add_list = [
            LazymodelOnlineModels(
                user_id=self.user_id,
                tenant_id=self.account.current_tenant_id,
                model_id=model_id,
                parent_id=0,
                is_finetune_model=False,
                deleted_flag=0,
                source_info="user create",
                model_name="",
                model_key=item["model_key"],
                can_finetune=item["can_finetune"],
                created_at=TimeTools.get_china_now(),
                updated_at=TimeTools.get_china_now(),
                finetune_task_id=0,
            )
            for item in model_list
            if "id" not in item
        ]

        def get_model_key(id, list):
            result = next((item for item in list if int(item["id"]) == int(id)), None)
            if result is None:
                return ""
            return result["model_key"]

        update_list = [
            item
            for item in model_list
            if (
                "id" in item
                and item["model_key"]
                != get_model_key(
                    item["id"] and int(item["id"]) in online_model_list_id,
                    online_model_list,
                )
            )
        ]

        if len(del_list) > 0:
            # 校验微调模型
            for item in del_list:
                exists_query = db.session.query(
                    exists().where(
                        LazymodelOnlineModels.parent_id == item["id"],
                        LazymodelOnlineModels.deleted_flag == 0,
                    )
                ).scalar()
                if exists_query:
                    raise CommonError(f'{item["model_key"]}存在微调模型关联无法删除')
                online_model = LazymodelOnlineModels.query.get(item["id"])
                if (
                    online_model.builtin_flag
                    and self.account.id != Account.get_administrator_id()
                ):
                    raise CommonError(f'内置{item["model_key"]}模型无权限删除')

            LazymodelOnlineModels.query.filter(
                LazymodelOnlineModels.id.in_([item["id"] for item in del_list]),
                LazymodelOnlineModels.model_id == model_id,
            ).update(
                {"deleted_flag": 1, "updated_at": TimeTools.get_china_now()},
                synchronize_session=False,
            )
        if len(update_list) > 0:
            for item in update_list:
                online_model = LazymodelOnlineModels.query.get(item["id"])
                if (
                    online_model.builtin_flag
                    and self.account.id != Account.get_administrator_id()
                ):
                    if (
                        online_model.model_key != item["model_key"]
                        or online_model.can_finetune != item["can_finetune"]
                    ):
                        raise CommonError(f'内置{item["model_key"]}模型无权限修改')
            update_data = [
                {
                    "id": int(item["id"]),
                    "model_key": item["model_key"],
                    "updated_at": TimeTools.get_china_now(),
                    "can_finetune": 1 if item["can_finetune"] else 0,
                }
                for item in update_list
            ]
            db.session.bulk_update_mappings(LazymodelOnlineModels, update_data)

        if len(add_list) > 0:
            db.session.add_all(add_list)

        db.session.commit()
        return True

    def exist_model_list(self):
        """
        获取已存在模型的文件列表。

        Returns:
            list: 文件信息列表，每项为 dict，包含 name 和 path。
        """
        config_exist_model_list = os.getenv("CONFIG_EXIST_MODEL_PATH")

        if config_exist_model_list:
            # 如果文件不存在，则创建
            if not os.path.exists(config_exist_model_list):
                os.makedirs(config_exist_model_list)
            # 获取文件列表名称
            dir = os.listdir(config_exist_model_list)
            # 返回文件路径及文件名，格式[{"name": "aaa","path":"bbb"}]
            return [
                {"name": item, "path": os.path.join(config_exist_model_list, item)}
                for item in dir
            ]
        else:
            return []

    def copy_model(self, id, model_path, model_name):
        """
        复制模型文件到指定目录。

        Args:
            id (int): 模型ID。
            model_path (str): 源模型路径。
            model_name (str): 目标模型名称。

        Returns:
            None

        Raises:
            Exception: 复制失败时抛出。
        """
        model = Lazymodel.query.get(id)
        model.model_status = ModelStatus.DOWNLOAD.value
        db.session.commit()
        is_end_flag = False

        def call_back(n, total, status=ModelStatus.DOWNLOAD.value):
            nonlocal is_end_flag
            if is_end_flag:
                return
            is_end_flag = n == total
            print(f"model_key download process {n}/{total}")
            send_ms(
                task_id=str(id),
                msg={
                    "current": n,
                    "total": total,
                    "is_end": n == total,
                    "percent": int(n / total * 100),
                    "status": status,
                },
            )

        def custom_copy(src, dst):
            nonlocal copied_files
            shutil.copy2(src, dst)
            copied_files += 1
            call_back(copied_files, total_files)

        try:
            exist_model_path = os.getenv("EXIST_MODEL_PATH")
            if exist_model_path is None:
                raise ValueError("Environment variable 'EXIST_MODEL_PATH' is not set.")

            new_model_path = os.path.join(exist_model_path, model_name)
            if not os.path.exists(new_model_path):
                # 删除对应文件
                # shutil.rmtree(new_model_path)

                # 计算总文件数
                total_files = sum(len(files) for _, _, files in os.walk(model_path))
                copied_files = 0
                is_end_flag = False

                # 使用自定义的文件复制函数
                shutil.copytree(model_path, new_model_path, copy_function=custom_copy)
            model.model_path = new_model_path
            model.model_status = ModelStatus.SUCCESS.value
            model.download_message = "Copy successful"
            db.session.commit()
            call_back(total_files, total_files, status=ModelStatus.SUCCESS.value)
            # 模型文件大小同步至用户组空间下
            Tenant.save_used_storage(
                model.tenant_id, FileTools.get_dir_path_size(model.model_path)
            )

            # delete local model
            if os.path.exists(new_model_path):
                # shutil.rmtree(new_model_path)
                print("不删除本地模型")
        except Exception as e:
            logging.exception(e)
            model.model_status = ModelStatus.FAILED.value
            model.download_message = str(e)
            db.session.commit()
            call_back(1, 1, status=ModelStatus.FAILED.value)

    def default_icon_list(self):
        """
        获取默认模型图标列表。

        Returns:
            list: 默认图标文件名列表。
        """
        default_icon_path = os.getenv("DEFAULT_ICON_PATH")
        if default_icon_path:
            # 获取默认图片列表路径
            try:
                # 确保路径存在
                if not os.path.exists(default_icon_path):
                    raise CommonError(f"路径 {default_icon_path} 不存在")

                # 获取路径下的所有文件
                files = os.listdir(default_icon_path)
                # 返回文件的完整路径
                file_paths = [os.path.join(default_icon_path, file) for file in files]
                return file_paths
            except Exception as e:
                logging.exception(e)
                return []
        else:
            return []
