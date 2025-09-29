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

import logging
import os
from functools import wraps
from typing import Any, Callable, Optional, Union

from flask import current_app, g, has_request_context, request
from flask_login import AnonymousUserMixin, user_logged_in
from flask_login.config import EXEMPT_METHODS
from werkzeug.exceptions import Unauthorized
from werkzeug.local import LocalProxy

from models.model_account import Account, RoleTypes, Tenant, TenantAccountJoin
from utils.util_database import db

logger = logging.getLogger(__name__)

#: A proxy for the current user. If no user is logged in, this will be an
#: anonymous user
current_user = LocalProxy(lambda: get_user())


class LoginError(Exception):
    """登录相关异常的基类。"""

    pass


class AuthenticationError(LoginError):
    """认证失败异常。"""

    pass


class AuthorizationError(LoginError):
    """授权失败异常。"""

    pass


def _validate_bearer_token_format(auth_header: str) -> str:
    """验证Bearer Token格式并提取令牌。

    Args:
        auth_header (str): Authorization 头的值。

    Returns:
        str: 提取的API密钥令牌。

    Raises:
        AuthenticationError: 当Authorization头格式不正确时抛出。
    """
    if not auth_header:
        raise AuthenticationError("Authorization header is missing")

    if " " not in auth_header:
        raise AuthenticationError(
            "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
        )

    try:
        auth_scheme, auth_token = auth_header.split(None, 1)
    except ValueError:
        raise AuthenticationError(
            "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
        )

    if auth_scheme.lower() != "bearer":
        raise AuthenticationError(
            "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
        )

    if not auth_token.strip():
        raise AuthenticationError("API key token cannot be empty")

    return auth_token.strip()


def _authenticate_with_admin_api_key(auth_token: str) -> Optional[Account]:
    """使用管理员API密钥进行认证。

    Args:
        auth_token (str): API密钥令牌。

    Returns:
        Optional[Account]: 认证成功返回账户对象，失败返回None。

    Raises:
        AuthorizationError: 当工作区验证失败时抛出。
    """
    admin_api_key = os.getenv("ADMIN_API_KEY")
    if not admin_api_key:
        logger.warning("ADMIN_API_KEY 环境变量未设置")
        return None

    if admin_api_key != auth_token:
        logger.warning("管理员API密钥验证失败")
        return None

    # 处理工作区验证
    workspace_id = request.headers.get("X-WORKSPACE-ID")
    if not workspace_id:
        logger.info("管理员API密钥认证成功，但未指定工作区")
        return None

    try:
        tenant_account_join = (
            db.session.query(Tenant, TenantAccountJoin)
            .filter(Tenant.id == workspace_id)
            .filter(TenantAccountJoin.tenant_id == Tenant.id)
            .filter(TenantAccountJoin.role == RoleTypes.OWNER)
            .one_or_none()
        )

        if not tenant_account_join:
            logger.warning(f"工作区 {workspace_id} 不存在或用户不是所有者")
            raise AuthorizationError(f"Invalid workspace ID: {workspace_id}")

        tenant, tenant_account = tenant_account_join
        account = Account.query.filter_by(id=tenant_account.account_id).first()

        if not account:
            logger.error(f"账户 {tenant_account.account_id} 不存在")
            raise AuthorizationError("Account not found")

        # 设置当前租户
        account.current_tenant = tenant
        logger.info(
            f"管理员API密钥认证成功，用户: {account.id}, 工作区: {workspace_id}"
        )
        return account

    except Exception as e:
        logger.error(f"工作区验证失败: {e}")
        raise AuthorizationError(f"Workspace validation failed: {e}") from e


def _is_admin_api_key_enabled() -> bool:
    """检查管理员API密钥功能是否启用。

    Returns:
        bool: 如果启用返回True，否则返回False。
    """
    admin_api_key_enable = os.getenv("ADMIN_API_KEY_ENABLE", "False")
    return admin_api_key_enable.lower() == "true"


def _is_login_disabled() -> bool:
    """检查登录功能是否被禁用。

    Returns:
        bool: 如果禁用返回True，否则返回False。
    """
    return os.getenv("LOGIN_DISABLED", "False").lower() == "true"


def _login_user_to_session(account: Account) -> None:
    """将用户登录到当前会话。

    Args:
        account (Account): 要登录的用户账户。
    """
    try:
        current_app.login_manager._update_request_context_with_user(account)
        user_logged_in.send(
            current_app._get_current_object(),
            user=get_user(),
        )
        logger.info(f"用户 {account.id} 已登录到会话")
    except Exception as e:
        logger.error(f"用户登录到会话失败: {e}")
        raise LoginError(f"Failed to login user to session: {e}") from e


def login_required(func: Callable) -> Callable:
    """登录验证装饰器。

    确保当前用户已登录并通过认证后才能访问被装饰的视图函数。
    支持以下认证方式：
    1. 常规用户会话认证
    2. 管理员API密钥认证（通过Authorization头）

    对于管理员API密钥认证：
    - 需要设置环境变量 ADMIN_API_KEY_ENABLE=true
    - 通过 Authorization: Bearer <api-key> 头传递API密钥
    - 可选通过 X-WORKSPACE-ID 头指定工作区

    示例用法::

        @app.route('/protected')
        @login_required
        def protected_view():
            return "Hello, authenticated user!"

    注意事项:
    - HTTP OPTIONS 请求默认免于登录检查（CORS预检请求）
    - 可通过 LOGIN_DISABLED 环境变量全局禁用登录验证（测试用）

    Args:
        func: 要装饰的视图函数。

    Returns:
        Callable: 装饰后的函数。
    """

    @wraps(func)
    def decorated_view(*args: Any, **kwargs: Any) -> Any:
        """装饰器内部函数。

        处理登录验证逻辑，包括管理员API密钥认证和常规用户认证。

        Args:
            *args: 传递给被装饰函数的位置参数。
            **kwargs: 传递给被装饰函数的关键字参数。

        Returns:
            Any: 被装饰函数的返回值。

        Raises:
            Unauthorized: 当认证失败时抛出。
        """
        # 检查是否为免检方法或登录被禁用
        if request.method in EXEMPT_METHODS or _is_login_disabled():
            logger.debug(
                f"跳过登录检查: method={request.method}, login_disabled={_is_login_disabled()}"
            )
        else:
            # 尝试管理员API密钥认证
            auth_header = request.headers.get("Authorization")
            authenticated_via_api_key = False

            if _is_admin_api_key_enabled() and auth_header:
                try:
                    auth_token = _validate_bearer_token_format(auth_header)
                    account = _authenticate_with_admin_api_key(auth_token)

                    if account:
                        _login_user_to_session(account)
                        authenticated_via_api_key = True
                        logger.info("通过管理员API密钥认证成功")

                except (AuthenticationError, AuthorizationError) as e:
                    logger.warning(f"管理员API密钥认证失败: {e}")
                    raise Unauthorized(str(e))
                except Exception as e:
                    logger.error(f"管理员API密钥认证过程中发生未知错误: {e}")
                    raise Unauthorized("Authentication failed")

            # 如果未通过API密钥认证，检查常规登录状态
            if not authenticated_via_api_key and not current_user.is_authenticated:
                logger.warning("用户未认证，拒绝访问")
                return current_app.login_manager.unauthorized()

        # 执行被装饰的函数
        try:
            # Flask 1.x 兼容性处理
            if callable(getattr(current_app, "ensure_sync", None)):
                return current_app.ensure_sync(func)(*args, **kwargs)
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"执行被装饰函数时发生错误: {e}", stack_info=True)
            raise

    return decorated_view


class CustomAnonymousUser(AnonymousUserMixin):
    """自定义匿名用户类。

    继承自 Flask-Login 的 AnonymousUserMixin，用于表示未登录的用户。
    提供与已登录用户一致的接口，但标识为匿名状态。

    Attributes:
        is_authenticated (bool): 始终为 False，表示未认证。
        is_active (bool): 始终为 False，表示非活跃用户。
        is_anonymous (bool): 始终为 True，表示匿名用户。
    """

    def __init__(self):
        """初始化自定义匿名用户。"""
        super().__init__()
        logger.debug("创建匿名用户实例")

    def get_id(self) -> None:
        """获取用户ID。

        Returns:
            None: 匿名用户没有ID。
        """
        return None

    def __repr__(self) -> str:
        """返回用户的字符串表示。

        Returns:
            str: 匿名用户的字符串表示。
        """
        return "<AnonymousUser>"


def get_user() -> Union[Account, CustomAnonymousUser]:
    """获取当前请求的用户对象。

    从 Flask 的请求上下文中获取当前用户。如果用户未登录或加载失败，
    返回自定义的匿名用户对象。

    Returns:
        Union[Account, CustomAnonymousUser]: 当前用户对象或匿名用户对象。
    """
    if not has_request_context():
        logger.debug("没有请求上下文，返回匿名用户")
        return CustomAnonymousUser()

    if "_login_user" not in g:
        try:
            current_app.login_manager._load_user()
            logger.debug("成功加载用户到请求上下文")
        except Exception as e:
            logger.warning(f"加载用户失败: {e}")
            return CustomAnonymousUser()

    user = g.get("_login_user")
    if user is None:
        logger.debug("请求上下文中没有用户，返回匿名用户")
        return CustomAnonymousUser()

    return user
