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

from models.model_account import Cooperation
from utils.util_database import db


class CooperationService:
    """协作服务类。

    提供管理不同对象（如应用、数据集、知识库）的协作功能，
    包括设置协作用户、开启/关闭协作等。
    """

    def __init__(self, account):
        """初始化协作服务。

        Args:
            account: 账户对象，包含用户 ID 和租户信息。
        """
        self.account_id = account.id
        self.tenant_id = account.current_tenant_id

    def get_object(self, target_type, target_id):
        """获取协作对象数据。

        根据目标类型和 ID 获取协作配置，如果不存在则返回一个未启用的新实例。

        Args:
            target_type: 目标类型，如 "app"、"dataset"、"knowledgebase"。
            target_id: 目标对象的 ID。

        Returns:
            Cooperation: 协作对象实例，如果数据库中不存在则返回未保存的新实例。
        """
        instance = Cooperation.query.filter_by(
            target_id=target_id, target_type=target_type
        ).first()
        if not instance:
            # 不需要在数据库创建数据
            instance = Cooperation(target_id=target_id, target_type=target_type)
            instance.enable = False
        return instance

    def set_object_accounts(self, target_type, target_id, user_ids):
        """开启协作并设置协作用户。

        为指定的目标对象开启协作功能，并设置参与协作的用户列表。

        Args:
            target_type: 目标类型，如 "app"、"dataset"、"knowledgebase"。
            target_id: 目标对象的 ID。
            user_ids: 参与协作的用户 ID 列表。

        Returns:
            Cooperation: 更新后的协作对象实例。
        """
        instance = Cooperation.query.filter_by(
            target_id=target_id, target_type=target_type
        ).first()
        if instance:
            instance.enable = True
            instance.set_accounts(user_ids)
            db.session.commit()
        else:
            instance = Cooperation(
                target_id=target_id,
                target_type=target_type,
                tenant_id=self.tenant_id,
                created_by=self.account_id,
            )
            instance.enable = True
            instance.set_accounts(user_ids)
            db.session.add(instance)
            db.session.flush()
            db.session.commit()
        return instance

    def close_object(self, target_type, target_id):
        """关闭协作功能。

        关闭指定目标对象的协作功能，保留协作记录但标记为未启用。

        Args:
            target_type: 目标类型，如 "app"、"dataset"、"knowledgebase"。
            target_id: 目标对象的 ID。

        Returns:
            Cooperation: 更新后的协作对象实例。
        """
        instance = Cooperation.query.filter_by(
            target_id=target_id, target_type=target_type
        ).first()
        if instance:
            instance.enable = False
            db.session.commit()
        else:
            instance = Cooperation(
                target_id=target_id,
                target_type=target_type,
                tenant_id=self.tenant_id,
                created_by=self.account_id,
            )
            instance.enable = False
            db.session.add(instance)
            db.session.flush()
            db.session.commit()
        return instance

    def check_target(self, target_type, target_id):
        """检查目标类型是否有效。

        验证给定的目标类型是否在支持的类型列表中。

        Args:
            target_type: 要检查的目标类型。
            target_id: 目标对象的 ID（此参数未使用，可能用于未来扩展）。

        Raises:
            ValueError: 当目标类型不在支持的类型列表中时抛出。
        """
        if target_type not in tuple(x.value for x in Cooperation.Types):
            raise ValueError(f"类型`{target_type}`未定义")

    def get_join_list(self, target_type):
        """获取用户参与的协作对象列表。

        获取当前用户创建或参与协作的所有指定类型对象的 ID 列表。

        Args:
            target_type: 目标类型，如 "app"、"dataset"、"knowledgebase"。

        Returns:
            list: 用户有权访问的目标对象 ID 列表。
        """
        queryset = (
            Cooperation.query.filter_by(tenant_id=self.tenant_id)
            .filter_by(target_type=target_type)
            .filter(Cooperation.enable == True)
        )
        id_list = []
        for item in queryset:
            if item.created_by == self.account_id:
                id_list.append(item.target_id)
            elif self.account_id in item.accounts_as_list:
                id_list.append(item.target_id)
        return id_list
