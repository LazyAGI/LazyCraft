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
import urllib.parse
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


@dataclass
class OAuthUserInfo:
    """OAuth 用户信息数据类。

    用于标准化不同 OAuth 提供商返回的用户信息。

    Attributes:
        id (str): 用户的唯一标识符。
        name (str): 用户显示名称。
        email (str): 用户邮箱地址。
        avatar_url (Optional[str]): 用户头像 URL。
    """

    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None


class OAuthError(Exception):
    """OAuth 相关异常的基类。"""

    pass


class OAuthAuthorizationError(OAuthError):
    """OAuth 授权过程中的异常。"""

    pass


class OAuthTokenError(OAuthError):
    """OAuth 令牌获取过程中的异常。"""

    pass


class OAuthUserInfoError(OAuthError):
    """OAuth 用户信息获取过程中的异常。"""

    pass


class OAuth:
    """OAuth 认证抽象基类。

    定义了 OAuth 认证流程的通用接口。子类需要实现具体的 OAuth 提供商逻辑。

    Attributes:
        client_id (str): OAuth 应用的客户端 ID。
        client_secret (str): OAuth 应用的客户端密钥。
        redirect_uri (str): OAuth 回调地址。
        timeout (int): 请求超时时间（秒）。
        max_retries (int): 最大重试次数。
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        """初始化 OAuth 客户端。

        Args:
            client_id (str): OAuth 应用的客户端 ID。
            client_secret (str): OAuth 应用的客户端密钥。
            redirect_uri (str): OAuth 授权完成后的回调地址。
            timeout (int): 请求超时时间，默认 30 秒。
            max_retries (int): 最大重试次数，默认 3 次。

        Raises:
            ValueError: 当必要参数为空时抛出。
        """
        if not client_id:
            raise ValueError("client_id 不能为空")
        if not client_secret:
            raise ValueError("client_secret 不能为空")
        if not redirect_uri:
            raise ValueError("redirect_uri 不能为空")

        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.timeout = timeout
        self.max_retries = max_retries

        # 配置请求会话
        self._session = self._create_session()

    def _create_session(self) -> requests.Session:
        """创建配置了重试策略的请求会话。

        Returns:
            requests.Session: 配置好的请求会话。
        """
        session = requests.Session()

        # 配置重试策略
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=1,
            status_forcelist=[410, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "POST"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """获取 OAuth 授权 URL。

        Args:
            state (Optional[str]): 状态参数，用于防止 CSRF 攻击。

        Returns:
            str: 用户授权的 URL 地址。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError("子类必须实现 get_authorization_url 方法")

    def get_access_token(self, code: str) -> str:
        """使用授权码获取访问令牌。

        Args:
            code (str): OAuth 授权码。

        Returns:
            str: 访问令牌。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError("子类必须实现 get_access_token 方法")

    def get_raw_user_info(self, token: str) -> Dict[str, Any]:
        """获取原始用户信息。

        Args:
            token (str): 访问令牌。

        Returns:
            Dict[str, Any]: 原始用户信息字典。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError("子类必须实现 get_raw_user_info 方法")

    def get_user_info(self, token: str) -> OAuthUserInfo:
        """获取标准化的用户信息。

        调用 get_raw_user_info 获取原始信息，然后转换为标准化格式。

        Args:
            token (str): 访问令牌。

        Returns:
            OAuthUserInfo: 标准化的用户信息对象。

        Raises:
            OAuthUserInfoError: 当获取用户信息失败时抛出。
        """
        try:
            raw_info = self.get_raw_user_info(token)
            return self._transform_user_info(raw_info)
        except Exception as e:
            logger.error(f"获取用户信息失败: {e}")
            raise OAuthUserInfoError(f"获取用户信息失败: {e}") from e

    def _transform_user_info(self, raw_info: Dict[str, Any]) -> OAuthUserInfo:
        """将原始用户信息转换为标准格式。

        Args:
            raw_info (Dict[str, Any]): 原始用户信息字典。

        Returns:
            OAuthUserInfo: 标准化的用户信息对象。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError("子类必须实现 _transform_user_info 方法")

    def __del__(self):
        """析构函数，关闭请求会话。"""
        if hasattr(self, "_session"):
            self._session.close()


class GitHubOAuth(OAuth):
    """GitHub OAuth 认证实现。

    实现 GitHub OAuth 2.0 认证流程，包括获取授权 URL、访问令牌和用户信息。
    """

    _AUTH_URL = "https://github.com/login/oauth/authorize"
    _TOKEN_URL = "https://github.com/login/oauth/access_token"
    _USER_INFO_URL = "https://api.github.com/user"
    _EMAIL_INFO_URL = "https://api.github.com/user/emails"

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """获取 GitHub OAuth 授权 URL。

        构建包含客户端 ID、回调地址和权限范围的授权 URL。

        Args:
            state (Optional[str]): 状态参数，用于防止 CSRF 攻击。

        Returns:
            str: GitHub OAuth 授权 URL。
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "user:email",  # 只请求基本用户信息
        }

        if state:
            params["state"] = state

        url = f"{self._AUTH_URL}?{urllib.parse.urlencode(params)}"
        logger.info(f"生成 GitHub OAuth 授权 URL: {url}")
        return url

    def get_access_token(self, code: str) -> str:
        """使用授权码获取 GitHub 访问令牌。

        向 GitHub 的令牌端点发送请求，交换授权码获取访问令牌。

        Args:
            code (str): GitHub OAuth 授权码。

        Returns:
            str: GitHub 访问令牌。

        Raises:
            OAuthTokenError: 当获取访问令牌失败时抛出。
        """
        if not code:
            raise ValueError("授权码不能为空")

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
        }
        headers = {"Accept": "application/json"}

        try:
            logger.info("开始获取 GitHub 访问令牌")
            response = self._session.post(
                self._TOKEN_URL, data=data, headers=headers, timeout=self.timeout
            )
            response.raise_for_status()

            response_json = response.json()
            access_token = response_json.get("access_token")

            if not access_token:
                error_msg = response_json.get("error_description", "未知错误")
                logger.error(f"GitHub OAuth 令牌获取失败: {error_msg}")
                raise OAuthTokenError(f"GitHub OAuth 令牌获取失败: {error_msg}")

            logger.info("GitHub 访问令牌获取成功")
            return access_token

        except requests.RequestException as e:
            logger.error(f"GitHub OAuth 令牌请求失败: {e}")
            raise OAuthTokenError(f"GitHub OAuth 令牌请求失败: {e}") from e

    def get_raw_user_info(self, token: str) -> Dict[str, Any]:
        """获取 GitHub 用户的原始信息。

        使用访问令牌从 GitHub API 获取用户基本信息和邮箱列表。

        Args:
            token (str): GitHub 访问令牌。

        Returns:
            Dict[str, Any]: 包含用户信息和主邮箱的字典。

        Raises:
            OAuthUserInfoError: 当 API 请求失败时抛出。
        """
        if not token:
            raise ValueError("访问令牌不能为空")

        headers = {"Authorization": f"token {token}"}

        try:
            logger.info("开始获取 GitHub 用户信息")

            # 获取用户基本信息
            user_response = self._session.get(
                self._USER_INFO_URL, headers=headers, timeout=self.timeout
            )
            user_response.raise_for_status()
            user_info = user_response.json()

            # 获取用户邮箱信息
            email_response = self._session.get(
                self._EMAIL_INFO_URL, headers=headers, timeout=self.timeout
            )
            email_response.raise_for_status()
            email_info = email_response.json()

            # 查找主邮箱
            primary_email = None
            if isinstance(email_info, list) and email_info:
                primary_email = next(
                    (email for email in email_info if email.get("primary") is True),
                    email_info[0],  # 如果没有主邮箱，使用第一个
                )

            # 合并用户信息和邮箱信息
            result = {
                **user_info,
                "email": primary_email.get("email") if primary_email else None,
            }

            logger.info("GitHub 用户信息获取成功")
            return result

        except requests.RequestException as e:
            logger.error(f"GitHub 用户信息请求失败: {e}")
            raise OAuthUserInfoError(f"GitHub 用户信息请求失败: {e}") from e

    def _transform_user_info(self, raw_info: Dict[str, Any]) -> OAuthUserInfo:
        """将 GitHub 原始用户信息转换为标准格式。

        处理 GitHub 用户信息，生成标准化的用户信息对象。
        如果没有公开邮箱，会生成 GitHub 的 noreply 邮箱格式。

        Args:
            raw_info (Dict[str, Any]): GitHub 返回的原始用户信息。

        Returns:
            OAuthUserInfo: 标准化的用户信息对象。

        Raises:
            OAuthUserInfoError: 当用户信息格式不正确时抛出。
        """
        try:
            logger.debug(f"GitHub 原始用户信息: {raw_info}")

            # 提取用户 ID
            user_id = raw_info.get("id")
            if not user_id:
                raise OAuthUserInfoError("GitHub 用户信息中缺少用户 ID")

            # 提取邮箱，如果没有则生成 noreply 邮箱
            email = raw_info.get("email")
            if not email:
                login = raw_info.get("login", "")
                email = f"{user_id}+{login}@users.noreply.github.com"

            # 提取用户名
            name = (
                raw_info.get("name") or raw_info.get("login") or f"GitHub用户{user_id}"
            )

            # 提取头像 URL
            avatar_url = raw_info.get("avatar_url")

            user_info = OAuthUserInfo(
                id=str(user_id), name=str(name), email=email, avatar_url=avatar_url
            )

            logger.info(f"用户信息转换成功: ID={user_info.id}, Name={user_info.name}")
            return user_info

        except Exception as e:
            logger.error(f"GitHub 用户信息转换失败: {e}")
            raise OAuthUserInfoError(f"GitHub 用户信息转换失败: {e}") from e
