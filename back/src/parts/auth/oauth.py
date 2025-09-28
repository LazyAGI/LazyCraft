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

import json
import logging
import os
from urllib.parse import urljoin

import requests
from flask import current_app, redirect, request
from flask_restful import Resource, reqparse

from core.account_manager import AccountService, RegisterService, TenantService
from libs.helper import get_remote_ip
from libs.oauth import GitHubOAuth
from models.model_account import Account
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db
from utils.util_redis import redis_client

from .sms import SmsChecker

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
CONSOLE_WEB_URL = os.getenv("WEB_CONSOLE_ENDPOINT", "")

def get_oauth_providers():
    """获取OAuth提供商配置。

    根据环境变量配置初始化OAuth提供商（如GitHub）。
    如果缺少必要的客户端ID或密钥，则对应提供商将为None。

    Returns:
        dict: OAuth提供商字典，键为提供商名称，值为OAuth实例或None
    """
    with current_app.app_context():
        if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
            github_oauth = None
        else:
            redirect_uri=urljoin(
                    CONSOLE_WEB_URL, "/console/api/oauth/authorize/github"
                )
            logging.info("GitHub OAuth is enabled.redirect_uri: %s" % redirect_uri)
            github_oauth = GitHubOAuth(
                client_id=GITHUB_CLIENT_ID,
                client_secret=GITHUB_CLIENT_SECRET,
                redirect_uri=redirect_uri,
            )

        OAUTH_PROVIDERS = {
            "github": github_oauth,
        }
        return OAUTH_PROVIDERS


class OAuthLogin(Resource):
    def get(self, provider: str):
        """启动OAuth登录流程。

        生成OAuth授权URL并重定向用户到OAuth提供商的授权页面。

        Args:
            provider (str): OAuth提供商名称（如'github'）

        Returns:
            Response: 重定向响应，跳转到OAuth授权页面

        Raises:
            ValueError: 当提供商不存在或配置无效时抛出
        """
        OAUTH_PROVIDERS = get_oauth_providers()
        with current_app.app_context():
            oauth_provider = OAUTH_PROVIDERS.get(provider)
        if not oauth_provider:
            raise ValueError("Invalid provider")

        auth_url = oauth_provider.get_authorization_url()
        return redirect(auth_url)


class OAuthPostHandle(Resource):

    github_oauth_template = "github_oauth:{}"

    def get(self, provider: str):
        """处理OAuth回调请求。

        处理OAuth授权完成后的回调，获取用户信息并进行登录或绑定流程。
        如果用户账号不存在或未绑定手机号，将跳转到手机绑定页面。
        如果账号已存在，则直接登录并返回访问令牌。

        Args:
            provider (str): OAuth提供商名称（如'github'）

        Returns:
            Response: 重定向响应，跳转到绑定页面或登录成功页面

        Raises:
            ValueError: 当提供商不存在时抛出
            HTTPError: 当OAuth授权失败时抛出
        """
        OAUTH_PROVIDERS = get_oauth_providers()
        with current_app.app_context():
            oauth_provider = OAUTH_PROVIDERS.get(provider)
        if not oauth_provider:
            raise ValueError("Invalid provider")

        code = request.args.get("code")
        try:
            token = oauth_provider.get_access_token(code)
            user_info = oauth_provider.get_user_info(token)
        except requests.exceptions.HTTPError as e:
            logging.exception(
                f"An error occurred during the OAuth process with {provider}: {e.response.text}"
            )
            return {"message": "Github OAuth failed"}, 400

        # Get account by openid or email.
        openid = user_info.id
        account = Account.get_by_openid(provider, openid)
        if not account:
            account = Account.query.filter_by(email=user_info.email).first()

        # 账号不存在, 跳转绑定页面
        if not account or not account.phone:
            save_user = {}
            save_user["name"] = user_info.name if user_info.name else "AutoCreate"
            save_user["email"] = user_info.email
            oauth_redis_key = self.github_oauth_template.format(openid)
            redis_client.setex(oauth_redis_key, 3600 * 12, json.dumps(save_user))
            # 跳转绑定手机的页面
            return redirect(
                f"{CONSOLE_WEB_URL}/bind_phone?openid={openid}&provider={provider}"
            )
        else:
            # Link account
            AccountService.link_account_integrate(provider, user_info.id, account)
            token = AccountService.login(account, ip_address=get_remote_ip(request))
            # 自动登录
            return redirect(f"{CONSOLE_WEB_URL}?console_token={token}")

    def post(self, provider: str):
        """完成OAuth账号与手机号绑定。

        处理OAuth账号绑定手机号的请求，验证短信验证码后创建或关联账号。
        支持以下场景：
        1. 手机号已存在账号：直接关联
        2. 邮箱已存在账号：更新手机号
        3. 全新用户：创建新账号

        Args:
            provider (str): OAuth提供商名称（如'github'）

        Returns:
            dict: 包含登录成功结果和访问令牌的字典

        Raises:
            ValueError: 当提供商不存在、信息过期或验证码错误时抛出
        """
        OAUTH_PROVIDERS = get_oauth_providers()
        with current_app.app_context():
            oauth_provider = OAUTH_PROVIDERS.get(provider)
        if not oauth_provider:
            raise ValueError("Invalid provider")

        parser = reqparse.RequestParser()
        parser.add_argument("openid", required=True, type=str, location="json")
        parser.add_argument("phone", required=True, type=str, location="json")
        parser.add_argument("verify_code", required=True, type=str, location="json")
        body = parser.parse_args()

        # 检验redis
        oauth_redis_key = self.github_oauth_template.format(body.openid)
        bytesdata = redis_client.get(oauth_redis_key)
        if not bytesdata:
            raise ValueError("信息已经过期,请重新授权")

        # 校验验证码
        SmsChecker("relate").check(body.phone, body.verify_code)

        save_user = json.loads(bytesdata)
        account = Account.query.filter_by(phone=body.phone).first()
        if account:  # 手机账号已经存在
            pass  # 不需要多余操作
        else:
            account = Account.query.filter_by(email=save_user["email"]).first()
            if account:  # 邮箱账号存在
                account.phone = body.phone
                db.session.commit()
            else:  # 创建账号
                account = RegisterService.register(
                    save_user["email"], body.phone, save_user["name"], password=None
                )
                TenantService.create_private_tenant(account)
                # 记录日志
                LogService().add(
                    Module.USER_MANAGEMENT,
                    Action.REGISTER_USER,
                    name=account.name,
                    current_user=account,
                )

        # Link account
        AccountService.link_account_integrate(provider, body.openid, account)
        token = AccountService.login(account, ip_address=get_remote_ip(request))
        # 登录
        return {"result": "success", "data": token}


api.add_resource(OAuthLogin, "/oauth/login/<provider>")
api.add_resource(OAuthPostHandle, "/oauth/authorize/<provider>")
