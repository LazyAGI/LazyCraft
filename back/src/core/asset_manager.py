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
from collections import OrderedDict

import sqlalchemy

from libs.http_exception import BaseHTTPError, CommonError
from models.model_account import Tenant  # noqa
from models.model_account import (Account, Cooperation, RoleTypes,
                                  TenantAccountJoin)
from parts.app.model import App, AppTemplate
from parts.data.model import DataSet
from parts.data.script_model import Script
from parts.evalution.model import Task
from parts.finetune.model import FinetuneCustomParam, FinetuneTask
from parts.inferservice.model import InferModelService, InferModelServiceGroup
from parts.knowledge_base.model import KnowledgeBase
from parts.models_hub.model import Lazymodel, LazymodelOnlineModels, AITools
from parts.prompt.model import Prompt
from parts.tools.model import Tool
from utils.util_database import db


class LeftAssetError(BaseHTTPError):
    error_code = "left_asset"
    description = "账号下存在资产未转移"
    code = 400


CREATED_MODELS = []  # 包含 created_by, tenant_id 的类
USERNAME_MODELS = []  # 包含 user_id, user_name, tenant_id 的类
USERID_MODELS = []  # 包含 user_id, tenant_id 的类
TENANT_ONLY_MODELS = []  # 只包含 tenant_id 的类


def sort_asset_models():
    """按类型划分资产模型类。

    将所有资产模型类按照其字段属性分类到不同的列表中：
    - CREATED_MODELS: 包含 created_by 和 tenant_id 字段的类
    - USERNAME_MODELS: 包含 user_id、user_name 和 tenant_id 字段的类
    - USERID_MODELS: 包含 user_id 和 tenant_id 字段的类
    """
    asset_models = [
        App,
        AppTemplate,
        FinetuneTask,
        FinetuneCustomParam,
        Cooperation,
        DataSet,
        Script,
        KnowledgeBase,
        Tool,
        Lazymodel,
        LazymodelOnlineModels,
        AITools,
        Prompt,
        Task,
        InferModelService,
        InferModelServiceGroup,
    ]

    for modelcls in asset_models:
        if hasattr(modelcls, "tenant_id"):
            if hasattr(modelcls, "created_by"):
                CREATED_MODELS.append(modelcls)
            elif hasattr(modelcls, "user_id") and hasattr(modelcls, "user_name"):
                USERNAME_MODELS.append(modelcls)
            elif hasattr(modelcls, "user_id"):
                USERID_MODELS.append(modelcls)
            else:
                # 只有 tenant_id 字段的模型
                TENANT_ONLY_MODELS.append(modelcls)

    print("CREATED_MODELS:", CREATED_MODELS)
    print("USERNAME_MODELS:", USERNAME_MODELS)
    print("USERID_MODELS:", USERID_MODELS)
    print("TENANT_ONLY_MODELS:", TENANT_ONLY_MODELS)


sort_asset_models()


class AssetManager:
    """资产管理器。

    用于管理和操作用户在不同租户下的各种资产，包括资产检查、
    资产迁移等功能。
    """

    def __init__(self, operator):
        """初始化资产管理器。

        Args:
            operator: 操作员对象，执行资产操作的用户。
        """
        self.operator = operator

    def _has_no_assets(self, tenant_id, account_id):
        """检查指定租户和账户是否没有任何资产。

        Args:
            tenant_id: 租户 ID，如果为 None 则不按租户过滤。
            account_id: 账户 ID，如果为 None 则不按账户过滤。

        Returns:
            bool: 如果没有任何资产返回 True，否则返回 False。
        """
        odict = OrderedDict()
        if tenant_id:
            odict["tenant_id"] = str(tenant_id)
        if account_id:
            odict["created_by"] = str(account_id)
        for modelcls in CREATED_MODELS:
            if modelcls.query.filter_by(**odict).first():
                logging.info(f"have assets: {modelcls.__name__}, query={odict}")
                return False

        odict = OrderedDict()
        if tenant_id:
            odict["tenant_id"] = str(tenant_id)
        if account_id:
            odict["user_id"] = str(account_id)
        for modelcls in USERNAME_MODELS + USERID_MODELS:
            if modelcls.query.filter_by(**odict).first():
                logging.info(f"have assets: {modelcls.__name__}, query={odict}")
                return False

        # 检查只有 tenant_id 的模型
        if tenant_id and not account_id:
            odict = OrderedDict()
            odict["tenant_id"] = str(tenant_id)
            for modelcls in TENANT_ONLY_MODELS:
                if modelcls.query.filter_by(**odict).first():
                    logging.info(f"have assets: {modelcls.__name__}, query={odict}")
                    return False

        return True

    def _move_assets_in_tenant(self, tenant_id, source_account, target_account):
        """在同一租户内转移资产。

        将源账户在指定租户下的所有资产转移给目标账户。

        Args:
            tenant_id: 租户 ID。
            source_account: 源账户对象。
            target_account: 目标账户对象。
        """
        tenant_id = str(tenant_id)
        source_account_id = str(source_account.id)
        target_account_id = str(target_account.id)

        for modelcls in CREATED_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, created_by=source_account_id
            ).update(
                {
                    modelcls.created_by: target_account_id,
                }
            )

        for modelcls in USERID_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, user_id=source_account_id
            ).update(
                {
                    modelcls.user_id: target_account_id,
                }
            )

        for modelcls in USERNAME_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, user_id=source_account_id
            ).update(
                {
                    modelcls.user_id: target_account_id,
                    modelcls.user_name: target_account.name,
                }
            )

        db.session.commit()
        self.set_has_assets(tenant_id, source_account.id, "no")

    def _move_assets_over_tenant(self, tenant_id, source_account, target_account):
        """将租户内的资产转移到目标账户的个人空间。

        将源账户在指定租户下的资产转移到目标账户的私人租户空间中。

        Args:
            tenant_id: 源租户 ID。
            source_account: 源账户对象。
            target_account: 目标账户对象，必须有私人租户空间。

        Returns:
            None: 如果目标账户没有私人租户空间，直接返回不执行转移。
        """
        tenant_id = str(tenant_id)
        source_account_id = str(source_account.id)
        target_account_id = str(target_account.id)

        private = target_account.private_tenant
        if not private:
            return

        private_id = str(private.id)

        for modelcls in CREATED_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, created_by=source_account_id
            ).update(
                {
                    modelcls.tenant_id: private_id,
                    modelcls.created_by: target_account_id,
                }
            )

        for modelcls in USERID_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, user_id=source_account_id
            ).update(
                {
                    modelcls.tenant_id: private_id,
                    modelcls.user_id: target_account_id,
                }
            )

        for modelcls in USERNAME_MODELS:
            modelcls.query.filter_by(
                tenant_id=tenant_id, user_id=source_account_id
            ).update(
                {
                    modelcls.tenant_id: private_id,
                    modelcls.user_id: target_account_id,
                    modelcls.user_name: target_account.name,
                }
            )

        # 对于只有 tenant_id 的模型，删除相关数据
        for modelcls in TENANT_ONLY_MODELS:
            modelcls.query.filter_by(tenant_id=tenant_id).delete()

        db.session.commit()
        self.set_has_assets(tenant_id, source_account.id, "no")

    def check_tenant_account_assets(self, tenant, account):
        """检查租户账户的资产状态。

        检查指定账户在租户下是否有资产，如果有资产则抛出异常阻止操作。

        Args:
            tenant: 租户对象。
            account: 账户对象。

        Raises:
            LeftAssetError: 当账户在租户下有资产时抛出，提示需要先转移资产。
        """
        if not self._has_no_assets(tenant.id, account.id):
            self.set_has_assets(tenant.id, account.id, "yes")
            if self.operator.id == account.id:
                raise LeftAssetError(
                    "您在本工作空间内存在资产，无法退出，请先进行资产转移后再操作"
                )
            else:
                raise LeftAssetError(
                    f"用户：{account.name}，在工作空间内存在资产，无法删除，请先进行资产转移后再操作"
                )
        else:
            self.set_has_assets(tenant.id, account.id, "no")

    def check_tenant_assets(self, tenant):
        """检查租户的资产状态。

        检查租户内是否还有其他成员（除超级管理员和所有者外），
        如果有则不允许删除租户。

        Args:
            tenant: 租户对象。

        Raises:
            LeftAssetError: 当租户内存在成员时抛出。
        """
        queryset = db.session.query(TenantAccountJoin).filter_by(tenant_id=tenant.id)
        for item in queryset:
            if (
                item.account_id in Account.get_super_ids()
                or item.role == RoleTypes.OWNER
            ):
                continue
            else:
                raise LeftAssetError("工作空间内存在成员，无法删除")

    def check_account_assets(self, account):
        """检查账户的所有资产。

        检查账户在所有租户下是否有资产，如果有则不允许删除账户。

        Args:
            account: 账户对象。

        Raises:
            LeftAssetError: 当账户存在资产时抛出。
        """
        if not self._has_no_assets(None, account.id):
            raise LeftAssetError(
                f"用户：{account.name}，在工作空间内存在资产，无法删除，请先进行资产转移后再操作"
            )

    def move_account_tenant_assets(self, tenant, source_account, target_account):
        """移动租户下账户间的资产。

        将源账户在指定租户下的资产转移给目标账户。
        如果目标账户在同一租户内，则在租户内转移；
        否则转移到目标账户的个人空间。

        Args:
            tenant: 租户对象。
            source_account: 源账户对象。
            target_account: 目标账户对象。

        Raises:
            CommonError: 当源账户和目标账户相同，或源账户不在租户内时抛出。
        """
        if source_account.id == target_account.id:
            raise CommonError("不能在同一人之间移动资产")

        source_ta = (
            db.session.query(TenantAccountJoin)
            .filter_by(account_id=source_account.id, tenant_id=tenant.id)
            .first()
        )
        target_ta = (
            db.session.query(TenantAccountJoin)
            .filter_by(account_id=target_account.id, tenant_id=tenant.id)
            .first()
        )

        if source_ta is None:
            raise CommonError(
                f"用户: {source_account.name} 不在用户组内: {tenant.name}"
            )

        if target_ta is not None:
            self._move_assets_in_tenant(tenant.id, source_account, target_account)
        else:
            self._move_assets_over_tenant(
                tenant.id, source_account, target_account
            )  # 转到target的个人空间

    def move_tenant_assets(self, tenant):
        """移动租户的所有资产。

        将租户内所有账户的资产转移到各自的个人空间。

        Args:
            tenant: 要处理的租户对象。
        """
        queryset = db.session.query(TenantAccountJoin).filter_by(tenant_id=tenant.id)
        for item in queryset:
            account = Account.default_getone(item.account_id)
            if account:
                self._move_assets_over_tenant(
                    tenant.id, account, account
                )  # 转到这个人的个人空间

    @staticmethod
    def set_has_assets(tenant_id, account_id, v):
        """设置账户资产状态标记。

        Args:
            tenant_id: 租户 ID。
            account_id: 账户 ID。
            v: 资产状态值。

        Note:
            此方法已废弃，逻辑改为从数据库实时读取而不是从 Redis。
        """
        return  # 后续不需要执行了, 逻辑废弃: 从数据库实时读取而不是从redis

    @staticmethod
    def get_tenant_list_account_assets(tenant_id_list, account_id):
        """获取账户在多个租户中的资产统计。

        统计指定账户在给定租户列表中每个租户下的资产数量。

        Args:
            tenant_id_list: 租户 ID 列表。
            account_id: 账户 ID。

        Returns:
            dict: 租户 ID 到资产数量的映射字典。
        """
        account_id = str(account_id)
        result = {str(_id): 0 for _id in tenant_id_list}

        def build_result(queryset):
            """构建结果统计。

            Args:
                queryset: 数据库查询结果集。
            """
            for tenant_id, count in queryset:
                tenant_id = str(tenant_id)
                if tenant_id in result:
                    result[tenant_id] += count

        odict = {"created_by": account_id}
        for modelcls in CREATED_MODELS:
            queryset = (
                db.session.query(
                    modelcls.tenant_id, sqlalchemy.func.count(modelcls.tenant_id)
                )
                .filter_by(**odict)
                .group_by(modelcls.tenant_id)
            )
            build_result(queryset)

        odict = {"user_id": account_id}
        for modelcls in USERNAME_MODELS + USERID_MODELS:
            queryset = (
                db.session.query(
                    modelcls.tenant_id, sqlalchemy.func.count(modelcls.tenant_id)
                )
                .filter_by(**odict)
                .group_by(modelcls.tenant_id)
            )
            build_result(queryset)

        return result

    @staticmethod
    def get_account_list_tenant_assets(account_id_list, tenant_id):
        """获取租户内多个账户的资产统计。

        统计指定租户内给定账户列表中每个账户的资产数量。

        Args:
            account_id_list: 账户 ID 列表。
            tenant_id: 租户 ID。

        Returns:
            dict: 账户 ID 到资产数量的映射字典。
        """
        tenant_id = str(tenant_id)
        result = {str(_id): 0 for _id in account_id_list}

        def build_result(queryset):
            """构建结果统计。

            Args:
                queryset: 数据库查询结果集。
            """
            for account_id, count in queryset:
                account_id = str(account_id)
                if account_id in result:
                    result[account_id] += count

        odict = {"tenant_id": tenant_id}
        for modelcls in CREATED_MODELS:
            queryset = (
                db.session.query(
                    modelcls.created_by, sqlalchemy.func.count(modelcls.created_by)
                )
                .filter_by(**odict)
                .group_by(modelcls.created_by)
            )
            build_result(queryset)

        odict = {"tenant_id": tenant_id}
        for modelcls in USERNAME_MODELS + USERID_MODELS:
            queryset = (
                db.session.query(
                    modelcls.user_id, sqlalchemy.func.count(modelcls.user_id)
                )
                .filter_by(**odict)
                .group_by(modelcls.user_id)
            )
            build_result(queryset)

        return result
