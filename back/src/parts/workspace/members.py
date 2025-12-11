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

from flask import request
from flask_login import current_user
from flask_restful import marshal, reqparse

from core.account_manager import QuotaService, TenantService
from core.asset_manager import AssetManager
from core.cooperation_service import CooperationService
from core.restful import ForbiddenError, Resource
from libs.login import login_required
from models.model_account import (Account, QuotaStatus, RoleTypes, Tenant,
                                  TenantAccountJoin)
from parts.logs import Action, LogService, Module
from parts.models_hub.model import AITools
from parts.urls import api
from utils.util_database import db

from . import fields


class AllUserListApi(Resource):
    """所有用户列表 API 资源类。

    提供查看所有用户的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看所有的用户。

        Returns:
            dict: 包含分页用户列表的响应数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page", type=int, required=False, default=1, location="args"
        )
        parser.add_argument(
            "limit", type=int, required=False, default=20, location="args"
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        parser.add_argument("search_phone", type=str, location="args", required=False)
        parser.add_argument("search_email", type=str, location="args", required=False)
        args = parser.parse_args()

        self.check_can_read()
        # pagination = TenantService.get_all_members(args, None)  # 改为所有人都可见所有用户
        account = current_user
        if account.is_super:
            pagination = TenantService.get_all_members(args, None)
        else:
            if account.can_admin_in_tenant(account.current_tenant_id):
                pagination = TenantService.get_all_members(
                    args, account.current_tenant_id
                )  # 改为自己租户
            else:
                pagination = TenantService.get_all_members(
                    args, account.current_tenant_id, only_self=account.id
                )  # 只看自己
        return marshal(pagination, fields.account_pagination_fields)


class SelectUserListApi(Resource):
    """选择用户列表 API 资源类。

    提供查看所有用户的 RESTful 接口（仅在选择用户列表中使用）
    """

    @login_required
    def get(self):
        """查看所有的用户(仅在选择用户列表中使用)。

        Returns:
            dict: 包含分页用户列表的响应数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page", type=int, required=False, default=1, location="args"
        )
        parser.add_argument(
            "limit", type=int, required=False, default=20, location="args"
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        parser.add_argument("search_phone", type=str, location="args", required=False)
        parser.add_argument("search_email", type=str, location="args", required=False)
        parser.add_argument("tenant_id", type=str, location="args", required=False)
        args = parser.parse_args()

        if args.get("tenant_id"):
            if not current_user.can_admin_in_tenant(args["tenant_id"]):
                raise ValueError("没有权限")
        else:
            if not self.check_can_admin(raise_error=False):
                raise ValueError("没有权限")

        pagination = TenantService.get_all_members(args, None)
        return marshal(pagination, fields.account_pagination_fields)


class AllTenantListApi(Resource):
    """所有租户列表 API 资源类。

    提供查看所有租户的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看所有的租户。

        Returns:
            dict: 包含分页租户列表的响应数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page", type=int, required=False, default=1, location="args"
        )
        parser.add_argument(
            "limit", type=int, required=False, default=20, location="args"
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        parser.add_argument("search_user", type=str, location="args", required=False)
        args = parser.parse_args()

        self.check_can_read()
        search_user = None
        if args.get("search_user"):
            search_user = Account.query.filter_by(name=args["search_user"]).first()
            if not search_user:
                return {
                    "page": args.page,
                    "limit": args.limit,
                    "total": 0,
                    "has_more": False,
                    "data": [],
                }

        pagination = TenantService.get_all_tenants(args, current_user, search_user)

        result = marshal(pagination, fields.tenant_pagination_fields)
        for i, rawdata in enumerate(result["data"]):
            result["data"][i].update(
                TenantService.get_tenant_accounts_summary(rawdata["id"])
            )
        result["user_id"] = current_user.id
        # print(result)
        return result


class AccountTenantListApi(Resource):
    """账户租户列表 API 资源类。

    提供查看用户加入的租户的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看用户加入的租户。

        Returns:
            dict: 用户加入的租户列表
        """
        parser = reqparse.RequestParser()
        parser.add_argument("account_id", type=str, required=True, location="args")
        args = parser.parse_args()

        self.check_can_read()

        # 普通成员只能查看自己的租户列表，只有超级管理员可以查看其他账号的租户列表。
        target_account_id = args["account_id"]
        if not current_user.is_super and target_account_id != current_user.id:
            raise ForbiddenError()

        account = Account.default_getone(target_account_id)
        tenants = TenantService.get_account_tenants(account)
        tenants = [marshal(m, fields.tenant_fields) for m in tenants]

        tenant_id_list = [item["id"] for item in tenants]
        t_map_a = AssetManager.get_tenant_list_account_assets(
            tenant_id_list, account.id
        )  # 是否有资产
        for item in tenants:
            item["has_assets"] = t_map_a.get(item["id"], 0) > 0  # 是否有资产
        return {"tenants": tenants}


class CurrentTenantListApi(Resource):
    """当前租户列表 API 资源类。

    提供查看当前用户加入的租户的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看当前用户加入的租户。

        Returns:
            dict: 当前用户加入的租户列表
        """
        self.check_can_read()
        tenants = TenantService.get_account_tenants(current_user)
        for item in tenants:
            item.current = item.id == current_user.current_tenant_id
        tenants = [marshal(m, fields.tenant_fields) for m in tenants]
        return {"tenants": tenants}


class CurrentTenantIdApi(Resource):
    """当前租户ID API 资源类。

    提供查看当前租户ID的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看当前租户。

        Returns:
            dict: 当前租户ID
        """
        self.check_can_read()
        return {"tenant_id": current_user.current_tenant_id}


class SwitchTenantApi(Resource):
    """切换租户 API 资源类。

    提供切换租户的 RESTful 接口
    """

    @login_required
    def post(self):
        """切换租户。

        Returns:
            dict: 切换成功的响应消息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()

        self.check_can_read()
        TenantService.switch_tenant(current_user, args["tenant_id"])
        return {"result": "success"}


class AddTenantApi(Resource):
    """添加租户 API 资源类。

    提供添加租户的 RESTful 接口
    """

    @login_required
    def post(self):
        """添加租户。

        Returns:
            dict: 创建的租户信息
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=True, location="json")
        args = parser.parse_args()

        self.check_can_write()
        # 不允许重名
        # if db.session.query(Tenant).filter_by(name=args["name"]).first():
        #     raise ValueError("用户组已存在")

        tenant = TenantService.create_tenant(args["name"], current_user)
        # 普通用户也可以添加租户;
        # 如果不是超管,把当前用户设置为创建者;
        if not current_user.is_super:
            TenantService.update_tenant_member(
                tenant.id, current_user.id, RoleTypes.OWNER
            )

        LogService().add(
            Module.USER_MANAGEMENT, Action.CREATE_GROUP, tenant=tenant.name
        )  # 记录日志
        result = marshal(tenant, fields.tenant_fields)
        result.update(TenantService.get_tenant_accounts_summary(tenant.id))
        return result


class DetailTenantApi(Resource):
    """租户详情 API 资源类。

    提供查看租户用户详细的 RESTful 接口
    """

    @login_required
    def get(self):
        """查看租户用户详细。

        Returns:
            dict: 租户详细信息和用户列表
        """
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="args")
        args = parser.parse_args()

        # self.check_can_admin()  # 错误用法,应该改为下面的调用
        if not current_user.can_write_in_tenant(args["tenant_id"]):
            raise ForbiddenError()

        tenant = TenantService.get_tenant_by_id(args["tenant_id"])

        result = marshal(tenant, fields.tenant_fields)
        accounts = TenantService.get_tenant_accounts(tenant.id)

        account_id_list = [item["id"] for item in accounts]
        a_map_t = AssetManager.get_account_list_tenant_assets(
            account_id_list, tenant.id
        )  # 是否有资产
        for item in accounts:
            item["has_assets"] = a_map_t.get(item["id"], 0) > 0  # 是否有资产

        result["accounts"] = accounts
        return result


class UpdateRolesApi(Resource):
    """更新角色 API 资源类。

    提供更新用户角色的 RESTful 接口
    """

    @login_required
    def post(self):
        """修改租户内的用户身份
        "data_list": [
            {
                "account_id": "87079ad4-5bce-4f28-972c-644084d939e7",
                "name": "名字",
                "role": "owner"
            },
        ]
        """
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        parser.add_argument("tenant_name", type=str, required=False, location="json")
        parser.add_argument("data_list", type=list, required=False, location="json")
        parser.add_argument(
            "storage_quota", type=int, required=True, location="json", default=0
        )
        parser.add_argument(
            "gpu_quota", type=int, required=False, location="json"
        )  # 新增gpu配额
        args = parser.parse_args()

        tenant = TenantService.get_tenant_by_id(args["tenant_id"])
        if (args["storage_quota"] * 1024 * 1024 * 1024) < tenant.storage_used:
            raise ValueError("输入的配额必须大于等于当前已消耗的配额")

        # 验证GPU配额
        if (
            args.get("gpu_quota") is not None
            and args.get("gpu_quota") != tenant.gpu_quota
        ):
            if not current_user.is_super:
                raise ValueError("只有超级管理员可以修改GPU配额")
            if args["gpu_quota"] < tenant.gpu_used:
                raise ValueError("输入的GPU配额必须大于等于当前已使用的GPU数量")

        if not (current_user.is_super or current_user.can_admin_in_tenant(tenant.id)):
            raise ValueError("无权编辑分组内用户")

        _existing_admins = TenantService.get_tenant_accounts(
            tenant.id, filters=[RoleTypes.OWNER, RoleTypes.ADMIN]
        )
        owner_ids = [d["id"] for d in _existing_admins if d["role"] == RoleTypes.OWNER]
        existing_admins = [d["id"] for d in _existing_admins]

        update_list = []
        if args.get("data_list"):
            for data in args["data_list"]:
                account_id = data.get("account_id", None)
                if not account_id:
                    continue

                if account_id in Account.get_super_ids():
                    continue  # 直接忽略非法数据
                if not RoleTypes.can_be_set(data["role"]):
                    continue  # 忽略非法的role(包括owner)
                if account_id in owner_ids:
                    continue  # 忽略原owner用户的任何改动

                if data["role"] == RoleTypes.ADMIN:
                    if not current_user.is_super:
                        if account_id in existing_admins:
                            continue
                        else:
                            raise ValueError("只有超管可以设置管理员")

                if data["role"] != RoleTypes.ADMIN:
                    if not current_user.is_super:
                        if account_id in existing_admins:
                            raise ValueError("只有超管可以取消管理员")

                # 设置为允许修改的数据
                update_list.append(data)

        print("update-roles:", update_list)

        updated = False
        if tenant_name := args.get("tenant_name"):
            if tenant.name != tenant_name:
                tenant.name = tenant_name
                updated = True

        if tenant.storage_quota != args["storage_quota"]:
            tenant.storage_quota = args["storage_quota"]
            updated = True

        if tenant.gpu_quota != args["gpu_quota"]:
            tenant.gpu_quota = args["gpu_quota"]
            updated = True

        # 添加GPU配额更新逻辑
        if args.get("gpu_quota") is not None and tenant.gpu_quota != args["gpu_quota"]:
            tenant.gpu_quota = args["gpu_quota"]
            updated = True

        if updated:
            db.session.commit()

        update_count = 0
        update_names = []
        for data in update_list:
            account_id = data["account_id"]
            updated = TenantService.update_tenant_member(
                tenant.id, account_id, data["role"]
            )
            if updated:
                update_count += 1
                update_names.append(data.get("name", ""))

        if update_count > 0:
            names = ",".join(update_names[:3])
            LogService().add(
                Module.USER_MANAGEMENT,
                Action.ADD_GROUP_USER,
                tenant=tenant.name,
                count=update_count,
                names=names,
            )
        return {"result": "success"}


class TenantUserListApi(Resource):
    @login_required
    def get(self):
        """查询当前租户下全部用户列表"""
        self.check_can_read()
        accounts = TenantService.get_tenant_accounts(current_user.current_tenant_id)
        # 新造一个Account的官方账号，将官方账添加到accounts的第一个
        llm_account = {"id": Account.get_administrator_id(), "name": "Lazy LLM官方"}
        accounts.insert(0, llm_account)
        return accounts


class MoveAssetsApi(Resource):
    @login_required
    def post(self):
        """迁移资产"""
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        parser.add_argument(
            "source_account_id", type=str, required=True, location="json"
        )
        parser.add_argument(
            "target_account_id", type=str, required=True, location="json"
        )
        args = parser.parse_args()

        # 只有管理员可以迁移资产
        self.check_is_super()
        tenant = TenantService.get_tenant_by_id(args["tenant_id"])
        if not tenant:
            raise ValueError("租户不存在")
        if not current_user.can_admin_in_tenant(tenant.id):
            raise ForbiddenError()
        source_account = Account.query.get(args["source_account_id"])
        target_account = Account.query.get(args["target_account_id"])
        AssetManager(current_user).move_account_tenant_assets(
            tenant, source_account, target_account
        )
        return {"result": "success"}


class DeleteTenantApi(Resource):
    @login_required
    def post(self):
        """删除租户"""
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()

        tenant = TenantService.get_tenant_by_id(args["tenant_id"])
        if not (
            current_user.is_super
            or current_user.get_role_in_tenant(tenant.id) == RoleTypes.OWNER
        ):
            raise ValueError("只有超管或创建者才可以删除用户组")

        # 检查租户资产
        AssetManager(current_user).check_tenant_assets(tenant)
        # 移动资产
        AssetManager(current_user).move_tenant_assets(tenant)

        # 删除数据
        try:
            db.session.query(TenantAccountJoin).filter_by(tenant_id=tenant.id).delete()
            db.session.query(AITools).filter_by(tenant_id=tenant.id).delete()
            
            db.session.delete(tenant)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"删除租户失败: {str(e)}")

        LogService().add(
            Module.USER_MANAGEMENT, Action.DELETE_GROUP, tenant=tenant.name
        )  # 记录日志
        return {"result": "success"}


class ExitTenantApi(Resource):
    @login_required
    def post(self):
        """退出租户"""
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()

        tenant = TenantService.get_tenant_by_id(args["tenant_id"])
        if current_user.is_super:
            raise ValueError("超管不能退出用户组")
        if current_user.get_role_in_tenant(tenant.id) == RoleTypes.OWNER:
            raise ValueError("创建者不能退出用户组")
        if current_user.tenant_id != args["tenant_id"]:
            raise ValueError("您不属于该用户组，无法退出")

        # 检查租户下该用户的资产
        AssetManager(current_user).check_tenant_account_assets(tenant, current_user)

        # 移除关系
        db.session.query(TenantAccountJoin).filter_by(
            tenant_id=tenant.id, account_id=current_user.id
        ).delete()
        db.session.commit()
        return {"result": "success"}


class DeleteRoleApi(Resource):
    @login_required
    def post(self):
        """从租户中删除用户"""
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        parser.add_argument("account_id", type=str, required=True, location="json")
        args = parser.parse_args()

        tenant = TenantService.get_tenant_by_id(args["tenant_id"])
        if not (current_user.is_super or current_user.can_admin_in_tenant(tenant.id)):
            raise ValueError("无权编辑分组内用户")

        account_id = args["account_id"]
        existing_admins = TenantService.get_tenant_accounts(
            tenant.id, filters=[RoleTypes.OWNER, RoleTypes.ADMIN]
        )
        existing_admins = [d["id"] for d in existing_admins]

        if account_id in existing_admins:
            if not current_user.is_super:
                raise ValueError("只有超管可以取消管理员")

        if account_id == current_user.id:
            raise ValueError("不允许移除自己，请选择退出操作")

        account = Account.default_getone(account_id)

        # 检查租户下该用户的资产
        AssetManager(current_user).check_tenant_account_assets(tenant, account)

        # 移除关系
        db.session.query(TenantAccountJoin).filter_by(
            tenant_id=tenant.id, account_id=account_id
        ).delete()
        db.session.commit()

        LogService().add(
            Module.USER_MANAGEMENT,
            Action.REMOVE_GROUP_USER,
            tenant=tenant.name,
            count=1,
            names=account.name,
        )
        return {"result": "success"}


class DeleteAccountApi(Resource):
    @login_required
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("account_id", type=str, required=True, location="json")
        args = parser.parse_args()

        if not current_user.is_super:
            raise ValueError("只有超管可以删除用户")

        account_id = args["account_id"]
        if account_id in Account.get_super_ids():
            raise ValueError("不可以删除超管账号")

        account = Account.default_getone(account_id)

        # 检查账号所有租户的资产
        AssetManager(current_user).check_account_assets(account)

        # 删除用户
        db.session.query(Account).filter_by(id=account_id).delete()

        # 将用户关联的租户转给租户内的管理员，设置为owner
        tenant_ids = [
            tid[0]
            for tid in db.session.query(TenantAccountJoin.tenant_id)
            .filter_by(account_id=account_id, role=RoleTypes.OWNER)
            .all()
        ]
        for tenant_id in tenant_ids:
            # 查询租户中的成员并按修改时间排序，最早修改的在最前
            members = (
                db.session.query(TenantAccountJoin)
                .filter_by(tenant_id=tenant_id, role=RoleTypes.ADMIN)
                .filter(TenantAccountJoin.account_id != Account.get_admin_id())
                .order_by(TenantAccountJoin.updated_at.asc())
                .all()
            )
            if members and len(members) > 0:
                # 将第一个成员（最早修改的）设为所有者
                TenantService.update_tenant_member(
                    tenant_id, members[0].account_id, RoleTypes.OWNER
                )

        db.session.query(TenantAccountJoin).filter_by(account_id=account_id).delete()
        db.session.commit()

        LogService().add(
            Module.USER_MANAGEMENT, Action.DELETE_USER, name=account.name
        )  # 记录日志
        return {"result": "success"}


class CoopStatusApi(Resource):
    @login_required
    def get(self):
        """查询协作的设置详情"""
        parser = reqparse.RequestParser()
        parser.add_argument("target_type", type=str, required=True, location="args")
        parser.add_argument("target_id", type=str, required=True, location="args")
        args = parser.parse_args()

        target_type = args["target_type"]
        target_id = args["target_id"]

        self.check_can_read()
        client = CooperationService(current_user)
        client.check_target(target_type, target_id)  # 检查类型与ID

        instance = client.get_object(target_type, target_id)
        return marshal(instance, fields.cooperation_fields)


class CoopOpenApi(Resource):
    @login_required
    def post(self):
        """打开协作"""
        parser = reqparse.RequestParser()
        parser.add_argument("target_type", type=str, required=True, location="json")
        parser.add_argument("target_id", type=str, required=True, location="json")
        parser.add_argument("accounts", type=list, required=True, location="json")
        args = parser.parse_args()

        target_type = args["target_type"]
        target_id = args["target_id"]

        self.check_can_write()
        client = CooperationService(current_user)
        client.check_target(target_type, target_id)  # 检查类型与ID

        instance = client.get_object(target_type, target_id)
        instance = client.set_object_accounts(target_type, target_id, args["accounts"])
        return marshal(instance, fields.cooperation_fields)


class CoopCloseApi(Resource):
    @login_required
    def post(self):
        """关闭协作"""
        parser = reqparse.RequestParser()
        parser.add_argument("target_type", type=str, required=True, location="json")
        parser.add_argument("target_id", type=str, required=True, location="json")
        args = parser.parse_args()

        target_type = args["target_type"]
        target_id = args["target_id"]

        self.check_can_write()
        client = CooperationService(current_user)
        client.check_target(target_type, target_id)  # 检查类型与ID

        instance = client.get_object(target_type, target_id)
        instance = client.close_object(target_type, target_id)
        return marshal(instance, fields.cooperation_fields)


class CoopJoinListApi(Resource):
    @login_required
    def get(self):
        """查看自己被加入协作的列表"""
        parser = reqparse.RequestParser()
        parser.add_argument("target_type", type=str, required=True, location="args")
        args = parser.parse_args()

        self.check_can_read()
        client = CooperationService(current_user)
        id_list = client.get_join_list(args["target_type"])
        return {"data": id_list}


class WorkspacesStorageCheckApi(Resource):
    @login_required
    def get(self):
        """查看当前工作组的存储空间使用情况"""
        self.check_can_read()
        is_space_available = TenantService.check_tenant_storage(current_user)
        return {"data": is_space_available}


class PersonalSpaceResourceApi(Resource):
    @login_required
    def get(self):
        """获取个人空间资源配置信息"""
        parser = reqparse.RequestParser()
        parser.add_argument("account_id", type=str, required=True, location="args")
        args = parser.parse_args()

        self.check_can_read()
        return TenantService.get_personal_space_resources(args.get("account_id"))

    @login_required
    def post(self):
        """修改个人空间GPU配额"""
        parser = reqparse.RequestParser()
        parser.add_argument("gpu_quota", type=int, required=True, location="json")
        parser.add_argument("storage_quota", type=int, required=True, location="json")
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()

        self.check_is_super()
        TenantService.update_personal_space_gpu_quota(
            gpu_quota=args["gpu_quota"],
            storage_quota=args["storage_quota"],
            operator=current_user,
            tenant_id=args.get("tenant_id"),
        )
        return {"result": "success"}


class QuotaRequestListApi(Resource):
    @login_required
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument("request_type", type=str, default="", location="json")
        parser.add_argument("tenant_name", type=str, default="", location="json")
        parser.add_argument("account_name", type=str, location="json", required=False)
        parser.add_argument("status", type=str, location="json", required=False)
        args = parser.parse_args()
        self.check_is_super()
        # 获取工作空间配额申请列表
        pagination = QuotaService(current_user).get_quota_requests(args)

        return marshal(pagination, fields.quota_pagination)


class QuotaRequestApi(Resource):
    @login_required
    def post(self):

        # 提交配额申请
        data = request.get_json()
        request_type = data.get("type")  # 'storage' or 'gpu'
        amount = data.get("amount")
        reason = data.get("reason")
        tenant_id = data.get("tenant_id")

        if not all([request_type, amount, reason, tenant_id]):
            raise ValueError("输入的参数有误")

        # 仅允许对当前租户发起配额申请，防止为无关租户提交请求
        if tenant_id != current_user.current_tenant_id:
            raise ForbiddenError()

        if not current_user.can_admin_in_tenant(tenant_id):
            raise ForbiddenError()

        self.check_can_write()
        check_filter = {}
        check_filter["tenant_id"] = tenant_id
        check_filter["request_type"] = request_type
        check_filter["status"] = QuotaStatus.PENDING
        cnt = QuotaService(current_user).check_quota_request(check_filter)
        if cnt > 0:
            raise ValueError("存在未审批的配额请求, 请等待审批完成后再提交新的申请")

        QuotaService(current_user).create_quota_request(
            request_type, amount, reason, tenant_id, current_user.id
        )

        return {"code": 200, "message": "success"}, 200


class QuotaRequestDetailApi(Resource):
    @login_required
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("request_id", type=str, required=True, location="args")
        args = parser.parse_args()
        request_id = args["request_id"]
        if not all([request_id]):
            raise ValueError("输入的参数不能为空")

        self.check_is_super()
        # 获取申请详情
        quota_request = QuotaService(current_user).get_quota_request_detail(args)
        if not quota_request:
            return {"message": "无此申请记录", "request_id": request_id}, 404

        return quota_request


class QuotaRequestActionApi(Resource):
    @login_required
    def post(self):
        # 管理员处理申请
        data = request.get_json()
        action = data.get("action")  # 'approve' or 'reject'
        self.check_is_super()
        request_id = data.get("request_id")
        if not all([request_id, action]):
            raise ValueError("输入的参数有误")

        quota_req = QuotaService(current_user).get_quota_request_detail(data)
        if not quota_req:
            raise ValueError("无法找到指定的配额申请")
        if quota_req.get("status") != QuotaStatus.PENDING:
            raise ValueError("该配额申请已被审批，不能重复审批")

        if action == QuotaStatus.APPROVED:
            amount = data.get("amount")
            if not amount:
                raise ValueError("批准的配额不能为空")

            QuotaService(current_user).approve_quota_request(request_id, amount)
            return {"message": "success", "code": 200}, 200

        elif action == QuotaStatus.REJECTED:
            reason = data.get("reason")
            if not reason:
                raise ValueError("驳回原因不能为空")

            QuotaService(current_user).reject_quota_request(request_id, reason)
            return {"message": "success", "code": 200}, 200

        else:
            raise ValueError("操作类型有误")


class AIToolSetApi(Resource):
    @login_required
    def post(self):
        """设置租户的AI能力配置。

        该函数用于批量更新指定租户的AI工具配置信息。首先删除该租户现有的所有AI工具配置，
        然后根据提供的数据创建新的AI工具配置记录。

        Args:
            无直接参数。请求体中应包含以下JSON字段：
                data (list): AI工具配置数据列表，必填。
                tenant_id (str): 租户ID，必填。

        Returns:
            - 若成功，返回({"message": "success", "code": 200}, 200)
            - 若失败，返回({"message": 错误信息, "code": 400}, 400)

        Raises:
            无直接抛出异常，所有异常均被捕获并返回错误信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("data", type=list, required=True, location="json")
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()
        tenant_id = args["tenant_id"]
        data = args["data"]
        self.check_is_super()
        if isinstance(data, list) and len(data) > 0:
            new_users = [AITools.from_json(j, tenant_id) for j in data]
            try:
                AITools.query.filter_by(tenant_id=tenant_id).delete()
                db.session.add_all(new_users)
                db.session.commit()
                return {"message": "success", "code": 200}, 200
            except Exception as e:
                db.session.rollback()
                msg = f"发生错误：{e}"
                print(msg)
                return {"message": msg, "code": 400}, 400


class AIToolListApi(Resource):
    @login_required
    def get(self):
        """获取租户的AI能力配置。

        该函数用于获取租户的AI工具配置信息。

        Args:
            无直接参数。请求体中应包含以下JSON字段：
                tenant_id (str): 租户ID，选填，为空就代表设定当前租户。

        Returns:
            - 若成功，返回({"message": "success", "code": 200, "data": 数据}, 200)

        """
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=False, location="args")
        args = parser.parse_args()

        # 非超级管理员仅能查询自己当前租户的 AI 能力配置；
        # 超级管理员可以通过 tenant_id 指定任意租户，未指定时默认当前租户。
        requested_tenant_id = args.get("tenant_id")
        if current_user.is_super:
            tenant_id = requested_tenant_id or current_user.current_tenant_id
        else:
            tenant_id = current_user.current_tenant_id
            if requested_tenant_id is not None and requested_tenant_id != tenant_id:
                raise ForbiddenError()

        all_AITools = AITools.query.filter_by(tenant_id=tenant_id).all()
        ret = "[]"
        if all_AITools:
            ret = [entry.to_dict() for entry in all_AITools]
            ret = json.dumps(ret)
        return {"message": "success", "code": 200, "data": ret}, 200


class TenantSetEnableAIApi(Resource):
    @login_required
    def post(self):
        """设置是否开启租户的AI能力。

        Args:
            无直接参数。请求体中应包含以下JSON字段：
                enable (bool): 是否开启，必填。
                tenant_id (str): 租户ID，必填。

        Returns:
            - 若成功，返回({"message": "success", "code": 200, "data": 数据}, 200)

        """
        parser = reqparse.RequestParser()
        parser.add_argument("enable", type=bool, required=True, location="json")
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        args = parser.parse_args()
        enable = args["enable"]
        tenant_id = args["tenant_id"]
        self.check_is_super()
        tenant = Tenant.query.filter_by(id=tenant_id).first()
        if tenant is None:
            return {
                "message": f"error,not found tenant_id:{tenant_id}",
                "code": 400,
            }, 400
        tenant.enable_ai = enable
        db.session.commit()
        return {"message": "success", "code": 200}, 200


api.add_resource(AllUserListApi, "/workspaces/all/members")
api.add_resource(SelectUserListApi, "/workspaces/select/members")
api.add_resource(AllTenantListApi, "/workspaces/all/tenants")
api.add_resource(AccountTenantListApi, "/workspaces/account/tenants")
api.add_resource(CurrentTenantListApi, "/workspaces/current/list")
api.add_resource(CurrentTenantIdApi, "/workspaces/current/tenant")

api.add_resource(SwitchTenantApi, "/workspaces/switch")
api.add_resource(AddTenantApi, "/workspaces/add")
api.add_resource(DetailTenantApi, "/workspaces/detail")
api.add_resource(UpdateRolesApi, "/workspaces/update-roles")
api.add_resource(TenantUserListApi, "/workspaces/tenant/user_list")

api.add_resource(MoveAssetsApi, "/workspaces/move-assets")
api.add_resource(DeleteTenantApi, "/workspaces/delete")
api.add_resource(ExitTenantApi, "/workspaces/exit")
api.add_resource(DeleteRoleApi, "/workspaces/delete-role")
api.add_resource(DeleteAccountApi, "/workspaces/delete-account")

api.add_resource(CoopStatusApi, "/workspaces/coop/status")
api.add_resource(CoopOpenApi, "/workspaces/coop/open")
api.add_resource(CoopCloseApi, "/workspaces/coop/close")
api.add_resource(CoopJoinListApi, "/workspaces/coop/joins")

api.add_resource(WorkspacesStorageCheckApi, "/workspaces/storage/check")

api.add_resource(PersonalSpaceResourceApi, "/workspaces/personal-space/resources")

api.add_resource(QuotaRequestListApi, "/workspaces/quota-requests/list")
api.add_resource(QuotaRequestApi, "/workspaces/quota-requests/requests")
api.add_resource(QuotaRequestDetailApi, "/workspaces/quota-requests/details")
api.add_resource(QuotaRequestActionApi, "/workspaces/quota-requests/process")

api.add_resource(AIToolSetApi, "/workspaces/ai-tool/set")
api.add_resource(AIToolListApi, "/workspaces/ai-tool/list")
api.add_resource(TenantSetEnableAIApi, "/workspaces/tenant/enable_ai")
