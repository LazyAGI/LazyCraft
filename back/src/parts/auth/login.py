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

import re
from typing import cast

import flask_login
from flask import request
from flask_login import current_user
from flask_restful import fields, marshal, reqparse

from core.account_manager import AccountService, RegisterService, TenantService
from core.restful import Resource
from libs.helper import TimestampField
from libs.helper import email as EmailType
from libs.helper import get_remote_ip
from libs.login import login_required
from models.model_account import Account, TenantAccountJoin
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db

from .sms import SmsChecker


class RegisterApi(Resource):
    def post(self):
        """注册新用户账号。

        处理用户注册请求，验证用户输入信息并创建新账号。
        包括验证短信验证码、检查密码一致性、创建账号和租户等。

        Returns:
            dict: 登录成功后的令牌信息

        Raises:
            ValueError: 当输入信息无效或密码不一致时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("email", type=EmailType, required=True, location="json")
        parser.add_argument("phone", type=str, required=True, location="json")
        parser.add_argument("password", type=str, required=True, location="json")
        parser.add_argument(
            "confirm_password", type=str, required=True, location="json"
        )
        parser.add_argument("verify_code", type=str, required=True, location="json")
        body = parser.parse_args()

        AccountService.validate_name_email_phone(body.name, body.email, body.phone)
        if body.password != body.confirm_password:
            raise ValueError("两次输入的密码不相同")

        # 校验验证码
        SmsChecker("register").check(body.phone, body.verify_code)

        account = RegisterService.register(
            body.email, body.phone, body.name, password=body.password
        )
        TenantService.create_private_tenant(account)

        # 记录日志
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.REGISTER_USER,
            name=account.name,
            current_user=account,
        )
        # return {'result': 'success', 'id': account.id}
        return common_login(account)


class AddUserApi(Resource):
    def post(self):
        """管理员添加用户。

        允许管理员创建新用户账号，不需要短信验证码。
        只有具有管理员权限的用户才能调用此接口。

        Returns:
            dict: 包含创建成功结果和用户ID的字典

        Raises:
            ValueError: 当非管理员调用或输入信息无效时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("email", type=str, required=False, location="json")
        parser.add_argument("phone", type=str, required=False, location="json")
        parser.add_argument("password", type=str, required=True, location="json")
        parser.add_argument(
            "confirm_password", type=str, required=True, location="json"
        )
        body = parser.parse_args()

        if not current_user.is_admin:
            raise ValueError("只有管理员才能添加用户")
        if body.email:
            pattern = r"^[\w\.!#$%&'*+\-/=?^_`{|}~]+@([\w-]+\.)+[\w-]{2,}$"
            # Check if the email matches the pattern
            if re.match(pattern, body.email) is None:
                raise ValueError("邮箱地址格式错误")

        if body.password != body.confirm_password:
            raise ValueError("两次输入的密码不相同")

        account = RegisterService.register(
            body.email, body.phone, body.name, password=body.password
        )
        TenantService.create_private_tenant(account)

        # 记录日志
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.REGISTER_USER,
            name=account.name,
            current_user=account,
        )
        return {"result": "success", "id": account.id}


class SendsmsApi(Resource):

    def post(self):
        """发送短信验证码。

        根据指定的操作类型向手机号发送短信验证码。
        支持的操作类型包括：login、register、reset、relate。

        Returns:
            dict: 发送成功的结果字典

        Raises:
            ValueError: 当发送频率过快或其他验证失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("phone", type=str, required=True, location="json")
        parser.add_argument("operation", type=str, required=True, location="json")
        body = parser.parse_args()

        SmsChecker(body.operation).send(body.phone)
        return {"result": "success"}


class ValidateExistApi(Resource):
    def post(self):
        """校验用户信息唯一性。

        验证用户名、手机号或邮箱是否已被其他用户使用。
        用于注册前的重复性检查。

        Returns:
            dict: 包含验证结果的字典，success表示可用，failed表示已存在

        Note:
            即使验证失败也不会抛出异常，而是返回包含错误信息的字典
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=False, location="json")
        parser.add_argument("email", type=str, required=False, location="json")
        parser.add_argument("phone", type=str, required=False, location="json")
        body = parser.parse_args()

        try:
            AccountService.validate_name_email_phone(body.name, body.email, body.phone)
            return {"result": "success"}
        except ValueError as e:
            return {"result": "failed", "message": str(e)}


def common_login(account):
    """通用登录处理函数。

    为用户生成登录令牌并返回统一格式的登录成功响应。

    Args:
        account (Account): 要登录的用户账号对象

    Returns:
        dict: 包含登录成功结果和访问令牌的字典
    """
    token = AccountService.login(account, ip_address=get_remote_ip(request))
    return {"result": "success", "data": token}


class LoginApi(Resource):
    def post(self):
        """用户密码登录。

        使用用户名/邮箱和密码进行身份验证并登录系统。
        验证成功后记录登录日志并返回访问令牌。

        Returns:
            dict: 包含登录成功结果和访问令牌的字典

        Raises:
            ValueError: 当身份验证失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=False, location="json")
        parser.add_argument("email", type=str, required=False, location="json")
        parser.add_argument("password", type=str, required=True, location="json")
        parser.add_argument(
            "remember_me", type=bool, required=False, default=False, location="json"
        )
        body = parser.parse_args()

        account = AccountService.authenticate_by_password(
            body.name, body.email, "", body.password
        )
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.LOGIN_USER,
            name=account.name,
            current_user=account,
        )
        return common_login(account)


class LoginSmsApi(Resource):
    def post(self):
        """短信验证码登录。

        使用手机号和短信验证码进行身份验证并登录系统。
        如果用户账号不存在，会缓存验证码用于后续注册流程。

        Returns:
            dict: 包含登录成功结果和访问令牌的字典

        Raises:
            ValueError: 当验证码验证失败或用户认证失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("phone", type=str, required=True, location="json")
        parser.add_argument("verify_code", type=str, required=True, location="json")
        body = parser.parse_args()

        # 校验登录验证码
        SmsChecker("login").check(body.phone, body.verify_code)

        account = Account.query.filter_by(phone=body.phone).first()
        if not account:
            SmsChecker("register").cached_phone_code_for_registration(
                body.phone, body.verify_code
            )

        account = AccountService.authenticate_by_sms(body.phone, body.verify_code)

        LogService().add(
            Module.USER_MANAGEMENT,
            Action.LOGIN_USER,
            name=account.name,
            current_user=account,
        )
        return common_login(account)


class LogoutApi(Resource):
    def get(self):
        """用户退出登录。

        注销当前用户会话，删除访问令牌并记录退出日志。

        Returns:
            dict: 退出成功的结果字典
        """
        account = cast(Account, flask_login.current_user)
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.LOGOUT_USER,
            name=account.name,
            current_user=account,
        )

        token = request.headers.get("Authorization", "").split(" ")[1]
        AccountService.logout(account=account, token=token)
        flask_login.logout_user()
        return {"result": "success"}


account_fields = {
    "id": fields.String,
    "name": fields.String,
    "avatar": fields.String,
    "email": fields.String,
    "interface_language": fields.String,
    "interface_theme": fields.String,
    "timezone": fields.String,
    "last_login_at": TimestampField,
    "last_login_ip": fields.String,
    "created_at": TimestampField,
}


class AccountProfileApi(Resource):
    @login_required
    def get(self):
        """获取当前用户资料信息。

        返回当前登录用户的详细信息以及当前租户信息和权限角色。
        包括用户基本信息、租户状态、用户在租户中的角色等。

        Returns:
            dict: 包含用户信息和租户信息的字典
        """
        result = marshal(current_user, account_fields)

        tenant = current_user.current_tenant
        tenant_info = {
            "id": tenant.id,
            "name": tenant.name,
            "status": tenant.status,
            "role": None,
        }
        result["tenant"] = tenant_info

        if current_user.is_super:
            if current_user.is_administrator:
                tenant_info["role"] = "administrator"  # 只能创建内置资源
            else:
                tenant_info["role"] = "super"
        else:
            ta = (
                db.session.query(TenantAccountJoin)
                .filter(
                    TenantAccountJoin.tenant_id == tenant.id,
                    TenantAccountJoin.account_id == current_user.id,
                )
                .first()
            )
            tenant_info["role"] = ta.role if ta else None
        return result


class AccountPasswordApi(Resource):
    @login_required
    def post(self):
        """修改用户密码。

        允许用户修改自己的登录密码，需要提供当前密码进行验证。
        修改成功后记录密码变更日志。

        Returns:
            dict: 密码修改成功的结果字典

        Raises:
            ValueError: 当新密码确认不一致或当前密码验证失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("password", type=str, required=False, location="json")
        parser.add_argument("new_password", type=str, required=True, location="json")
        parser.add_argument(
            "repeat_new_password", type=str, required=True, location="json"
        )
        args = parser.parse_args()

        if args["new_password"] != args["repeat_new_password"]:
            raise ValueError("两次新密码的输入不相同")
        AccountService.update_account_password(
            current_user, args["password"], args["new_password"]
        )
        LogService().add(
            Module.USER_MANAGEMENT, Action.CHANGE_PASSWORD, name=current_user.name
        )
        return {"result": "success"}


class AccountUpdateApi(Resource):
    @login_required
    def post(self):
        """更新用户基本信息。

        允许用户修改姓名、邮箱、手机号等基本信息。
        会验证信息格式和唯一性约束，修改成功后记录更新日志。

        Returns:
            dict: 用户信息更新成功的结果字典

        Raises:
            ValueError: 当输入格式无效或违反唯一性约束时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=False, location="json")
        parser.add_argument("email", type=str, required=False, location="json")
        parser.add_argument("phone", type=str, required=False, location="json")
        args = parser.parse_args()

        # 检查是否有要更新的字段
        update_fields = {}
        if args["name"] is not None:
            update_fields["name"] = args["name"]
        if args["email"] is not None:
            # 验证邮箱格式
            pattern = r"^[\w\.!#$%&'*+\-/=?^_`{|}~]+@([\w-]+\.)+[\w-]{2,}$"
            if re.match(pattern, args["email"]) is None:
                raise ValueError("邮箱地址格式错误")
            update_fields["email"] = args["email"]
        if args["phone"] is not None:
            update_fields["phone"] = args["phone"]

        if not update_fields:
            raise ValueError("没有提供要更新的字段")

        # 如果更新了name、email或phone，需要验证唯一性
        if (
            "name" in update_fields
            or "email" in update_fields
            or "phone" in update_fields
        ):
            try:
                AccountService.validate_name_email_phone(
                    update_fields.get("name"),
                    update_fields.get("email"),
                    update_fields.get("phone"),
                )
            except ValueError as e:
                raise ValueError(f"用户信息验证失败: {str(e)}")

        # 更新用户信息
        for field, value in update_fields.items():
            setattr(current_user, field, value)

        db.session.commit()

        # 记录日志
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.UPDATE_USER,
            name=current_user.name,
            updated_fields=list(update_fields.keys()),
        )

        return {"result": "success", "message": "用户信息更新成功"}


api.add_resource(LoginApi, "/login")
api.add_resource(LoginSmsApi, "/login_sms")
api.add_resource(LogoutApi, "/logout")
api.add_resource(RegisterApi, "/register")
api.add_resource(AddUserApi, "/account/add_user")
api.add_resource(SendsmsApi, "/sendsms")
api.add_resource(ValidateExistApi, "/account/validate_exist")
api.add_resource(AccountProfileApi, "/account/profile")
api.add_resource(AccountPasswordApi, "/account/password")
api.add_resource(AccountUpdateApi, "/account/update")
