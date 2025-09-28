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

import os
from typing import Any, Dict, Optional

import jwt
from werkzeug.exceptions import BadRequest, Unauthorized


class PassportService:
    """JWT 令牌服务。

    提供 JWT 令牌的签发和验证功能。使用环境变量中的密钥进行签名和验证，
    采用 HS256 算法确保安全性。
    """

    # 支持的算法列表
    SUPPORTED_ALGORITHMS = ["HS256"]
    DEFAULT_ALGORITHM = "HS256"

    def __init__(
        self, secret_key: Optional[str] = None, algorithm: str = DEFAULT_ALGORITHM
    ):
        """初始化护照服务。

        Args:
            secret_key (Optional[str]): JWT 签名密钥，如果不提供则从环境变量获取
            algorithm (str): JWT 签名算法，默认为 HS256

        Raises:
            ValueError: 当密钥为空或算法不支持时抛出
        """
        self.sk = secret_key or os.getenv("LAZY_PLATFORM_KEY")
        if not self.sk:
            raise ValueError("LAZY_PLATFORM_KEY 必须在环境变量中设置或通过参数提供")

        if algorithm not in self.SUPPORTED_ALGORITHMS:
            raise ValueError(
                f"不支持的算法: {algorithm}. 支持的算法: {self.SUPPORTED_ALGORITHMS}"
            )

        self.algorithm = algorithm

    def issue(self, payload: Dict[str, Any]) -> str:
        """签发 JWT 令牌。

        使用配置的密钥和算法对载荷进行签名，生成 JWT 令牌。

        Args:
            payload (Dict[str, Any]): 要编码到 JWT 中的载荷数据。

        Returns:
            str: 生成的 JWT 令牌字符串。

        Raises:
            BadRequest: 当载荷为空或格式错误时抛出
            Unauthorized: 当签名过程失败时抛出
        """
        if not payload or not isinstance(payload, dict):
            raise BadRequest("载荷必须是非空的字典对象")

        try:
            return jwt.encode(payload, self.sk, algorithm=self.algorithm)
        except Exception as e:
            raise Unauthorized(f"令牌签发失败: {str(e)}")

    def verify(self, token: str, **kwargs) -> Dict[str, Any]:
        """验证 JWT 令牌。

        使用配置的密钥验证 JWT 令牌的有效性，并返回解码后的载荷。

        Args:
            token (str): 要验证的 JWT 令牌字符串。
            **kwargs: 传递给 jwt.decode 的额外参数。

        Returns:
            Dict[str, Any]: 解码后的载荷数据。

        Raises:
            BadRequest: 当令牌为空时抛出
            Unauthorized: 当令牌签名无效、格式错误或已过期时抛出
        """
        if not token or not isinstance(token, str):
            raise BadRequest("令牌必须是非空字符串")

        # 移除可能的 Bearer 前缀
        if token.startswith("Bearer "):
            token = token[7:]

        try:
            return jwt.decode(token, self.sk, algorithms=[self.algorithm], **kwargs)
        except jwt.exceptions.InvalidSignatureError:
            raise Unauthorized("令牌签名无效")
        except jwt.exceptions.DecodeError:
            raise Unauthorized("令牌格式无效")
        except jwt.exceptions.ExpiredSignatureError:
            raise Unauthorized("令牌已过期")
        except jwt.exceptions.InvalidTokenError:
            raise Unauthorized("令牌无效")
        except Exception as e:
            raise Unauthorized(f"令牌验证失败: {str(e)}")
