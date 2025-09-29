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

from flask_login import current_user
from flask_restful import Resource as OriginResource

from libs.http_exception import BaseHTTPError
from models.model_account import Account, Cooperation, RoleTypes

# from parts.app.model import App
# from parts.data.model import DataSet
# from parts.knowledge_base.model import KnowledgeBase


class ForbiddenError(BaseHTTPError):
    error_code = "no_perm"
    description = "没有权限"
    code = 403


class Resource(OriginResource):

    def _base_raise_error(self, raise_error):
        """处理权限错误的基础方法。

        Args:
            raise_error: 是否抛出异常，如果为 False 则返回 False。

        Returns:
            bool: 当 raise_error 为 False 时返回 False。

        Raises:
            ForbiddenError: 当 raise_error 为 True 时抛出权限禁止异常。
        """
        if raise_error:
            raise ForbiddenError()
        else:
            return False

    def check_is_super(self, raise_error=True):
        """检查当前用户是否是超级管理员。

        Args:
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果是超级管理员返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户不是超级管理员且 raise_error 为 True 时抛出。
        """
        if current_user.is_super:
            return True
        return self._base_raise_error(raise_error)

    def check_can_admin(self, raise_error=True):
        """检查当前用户在当前租户下是否具有管理员权限。

        Args:
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有管理员权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有管理员权限且 raise_error 为 True 时抛出。
        """
        if current_user.is_super:
            return True

        role = current_user.current_role
        if role in (RoleTypes.OWNER, RoleTypes.ADMIN):
            return True
        return self._base_raise_error(raise_error)

    def check_can_write(self, raise_error=True):
        """检查当前用户在当前租户下是否具有读写权限。

        Args:
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有读写权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有读写权限且 raise_error 为 True 时抛出。
        """
        if current_user.is_super:
            return True

        role = current_user.current_role
        if role in (RoleTypes.OWNER, RoleTypes.ADMIN, RoleTypes.NORMAL):
            return True
        return self._base_raise_error(raise_error)

    def check_can_read(self, raise_error=True):
        """检查当前用户在当前租户下是否具有读权限。

        Args:
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有读权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有读权限且 raise_error 为 True 时抛出。
        """
        if current_user.is_super:
            return True

        role = current_user.current_role
        if role in (
            RoleTypes.OWNER,
            RoleTypes.ADMIN,
            RoleTypes.NORMAL,
            RoleTypes.READONLY,
        ):
            return True
        return self._base_raise_error(raise_error)

    def check_can_read_object(self, instance, raise_error=True):
        """检查当前用户是否有读取特定对象的权限。

        至少需要是组内的成员才能读取对象。

        Args:
            instance: 要检查权限的对象实例。
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有读权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有读权限且 raise_error 为 True 时抛出。
        """
        perms = self._check_object_perms(instance)
        if perms in ("admin", "write", "read"):
            return True
        return self._base_raise_error(raise_error)

    def check_can_write_object(self, instance, raise_error=True):
        """检查当前用户是否有写入特定对象的权限。

        至少需要组内可读写的权限或者是对象的创建者。

        Args:
            instance: 要检查权限的对象实例。
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有写权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有写权限且 raise_error 为 True 时抛出。
        """
        perms = self._check_object_perms(instance)
        if perms in ("admin", "write"):
            return True
        return self._base_raise_error(raise_error)

    def check_can_admin_object(self, instance, raise_error=True):
        """检查当前用户是否有管理特定对象的权限。

        至少需要是组内管理员或对象的创建者。

        Args:
            instance: 要检查权限的对象实例。
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有管理权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有管理权限且 raise_error 为 True 时抛出。
        """
        perms = self._check_object_perms(instance)
        if perms in ("admin",):
            return True
        return self._base_raise_error(raise_error)

    def _check_object_perms(self, instance):
        """检查当前用户对特定对象的权限级别。

        根据用户角色、对象所属租户、创建者等信息判断权限级别。
        支持的对象类型包括应用、数据集、知识库等。

        Args:
            instance: 要检查权限的对象实例，需要有 tenant_id 和创建者相关属性。

        Returns:
            str or None: 权限级别，可能的值包括 "admin"、"write"、"read" 或 None。
                        - "admin": 管理权限（超级管理员、对象创建者或租户管理员）
                        - "write": 读写权限（租户普通成员或协作成员）
                        - "read": 只读权限（租户只读成员或内置对象）
                        - None: 无权限
        """
        if current_user.is_super:
            return "admin"

        # ###############
        # 其他模块的代码，在下面获取对象实例的数据: 租户ID + 创建者ID
        # 其他模块包括: 知识库/prompt/模型/数据集/工具
        # ###############
        object_tenant_id = object_create_id = None

        # instance is app/template
        if hasattr(instance, "tenant_id") and hasattr(instance, "created_by"):
            object_tenant_id = instance.tenant_id
            object_create_id = instance.created_by
        elif hasattr(instance, "tenant_id") and hasattr(instance, "user_id"):
            object_tenant_id = instance.tenant_id
            object_create_id = instance.user_id
        elif hasattr(instance, "tenant_id") and hasattr(instance, "account_id"):
            object_tenant_id = instance.tenant_id
            object_create_id = instance.account_id

        # ###############
        # 其他模块的代码，在上面部分修改
        # ###############
        if not object_tenant_id or not object_create_id:
            return None

        if object_tenant_id == current_user.current_tenant_id:  # 是同租户的人
            if object_create_id == current_user.id:  # 是创建者
                return "admin"

            role = current_user.current_role
            if role in (RoleTypes.OWNER, RoleTypes.ADMIN):
                return "admin"

            if role == RoleTypes.NORMAL:  # 成员本就是可读写权限
                return "write"

            # 有设置了协作成员
            target_type = instance.__class__.__name__.lower()
            if target_type in ("app", "dataset", "knowledgebase"):
                rel = Cooperation.query.filter_by(
                    target_type=target_type, target_id=instance.id
                ).first()
                if rel and rel.enable and current_user.id in rel.accounts_as_list:
                    return "write"

            if role == RoleTypes.READONLY:
                return "read"  # 同租户下至少有可读的权限

        # 最后判断是否是内置的,内置的，所有人都有可读权限
        if object_create_id == Account.get_administrator_id():
            return "read"

    def check_user_del_perm(self, owner_id, raise_error=True):
        """检查当前用户是否有删除资源的权限。

        只有超级管理员或资源的创建者才能删除资源。

        Args:
            owner_id: 资源创建者的 ID。
            raise_error: 是否在权限不足时抛出异常，默认为 True。

        Returns:
            bool: 如果有删除权限返回 True，否则根据 raise_error 参数返回 False 或抛出异常。

        Raises:
            ForbiddenError: 当用户没有删除权限且 raise_error 为 True 时抛出。
        """
        if current_user.is_super or owner_id == current_user.id:
            return True
        return self._base_raise_error(raise_error)
