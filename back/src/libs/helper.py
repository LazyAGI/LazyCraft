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
import random
import re
import string
import subprocess
import time
import uuid
from collections.abc import Generator
from datetime import datetime
from hashlib import sha256
from typing import Any, Optional
from zoneinfo import available_timezones

from flask import Response, stream_with_context
from flask_restful import fields

from utils.util_redis import redis_client


class TimestampField(fields.Raw):
    """时间戳字段。

    用于 Flask-RESTful 序列化，将 datetime 对象转换为 Unix 时间戳。
    """

    def format(self, value) -> int:
        """格式化时间戳。

        将 datetime 对象转换为 Unix 时间戳整数。

        Args:
            value (datetime): 要转换的 datetime 对象。

        Returns:
            int: Unix 时间戳。
        """
        return int(value.timestamp())


def email(email):
    """验证邮箱地址格式。

    使用正则表达式验证邮箱地址是否符合标准格式。

    Args:
        email (str): 要验证的邮箱地址。

    Returns:
        str: 如果格式正确，返回原邮箱地址。

    Raises:
        ValueError: 当邮箱格式不正确时抛出。
    """
    # Define a regex pattern for email addresses
    pattern = r"^[\w\.!#$%&'*+\-/=?^_`{|}~]+@([\w-]+\.)+[\w-]{2,}$"
    # Check if the email matches the pattern
    if re.match(pattern, email) is not None:
        return email

    error = "{email} 无效的邮箱地址".format(email=email)
    raise ValueError(error)


def uuid_value(value):
    """
    验证和格式化 UUID 值。

    验证输入是否为有效的 UUID 格式，空字符串被视为有效。
    支持多种常见的 UUID 格式输入，输出标准化的 UUID 字符串。

    Args:
        value (str): 要验证的 UUID 字符串。支持带连字符或不带连字符的格式。

    Returns:
        str: 标准化格式的 UUID 字符串（小写，带连字符）。
             如果输入为空字符串，则返回空字符串。

    Raises:
        ValueError: 当 UUID 格式无效时抛出，包含详细的错误信息。
        TypeError: 当输入类型不是字符串时抛出。

    Examples:
        >>> uuid_value("550e8400-e29b-41d4-a716-446655440000")
        '550e8400-e29b-41d4-a716-446655440000'
        
        >>> uuid_value("550E8400E29B41D4A716446655440000")
        '550e8400-e29b-41d4-a716-446655440000'
        
        >>> uuid_value("")
        ''
    """
    # 类型检查
    if not isinstance(value, str):
        raise TypeError(f"UUID 值必须是字符串类型，当前类型: {type(value).__name__}")
    
    # 处理空字符串情况
    if value == "":
        return ""
    
    # 去除首尾空白字符
    cleaned_value = value.strip()
    
    # 处理去除空白后的空字符串
    if not cleaned_value:
        return ""
    
    try:
        # 尝试创建 UUID 对象进行验证
        uuid_obj = uuid.UUID(cleaned_value)
        # 返回标准化格式（小写，带连字符）
        return str(uuid_obj).lower()
    except ValueError as e:
        # 提供更详细的中文错误信息
        error_msg = f"无效的 UUID 格式: '{value}'"
        
        # 根据常见错误提供更具体的提示
        if len(cleaned_value.replace('-', '').replace('{', '').replace('}', '')) != 32:
            error_msg += " - UUID 必须包含 32 个十六进制字符"
        elif not all(c in '0123456789abcdefABCDEF-{}' for c in cleaned_value):
            error_msg += " - UUID 只能包含十六进制字符 (0-9, a-f, A-F) 和连字符"
        else:
            error_msg += f" - {str(e)}"
        
        raise ValueError(error_msg) from e
    except Exception as e:
        # 处理其他意外异常
        raise ValueError(f"UUID 验证过程中发生错误: '{value}' - {str(e)}") from e


def generate_numberic_str(n):
    """
    生成随机数字字符串。

    生成指定长度的随机数字字符串，由 0-9 的数字组成。
    使用高效的字符串生成方式，适用于验证码、临时ID等场景。

    Args:
        n (int): 要生成的数字字符串长度。必须为正整数。

    Returns:
        str: 生成的随机数字字符串。

    Raises:
        TypeError: 当输入不是整数类型时抛出。
        ValueError: 当长度小于等于0或过大时抛出。

    Examples:
        >>> generate_numberic_str(6)
        '123456'
        
        >>> generate_numberic_str(4)
        '7890'
        
        >>> len(generate_numberic_str(10))
        10

    Note:
        - 生成的字符串可能以 0 开头
        - 使用系统随机数生成器，适合一般用途
        - 对于加密安全要求较高的场景，建议使用 secrets 模块
    """
    # 参数类型检查
    if not isinstance(n, int):
        raise TypeError(f"长度参数必须是整数类型，当前类型: {type(n).__name__}")
    
    # 参数范围检查
    if n <= 0:
        raise ValueError(f"长度必须是正整数，当前值: {n}")
    
    # 防止生成过长的字符串导致性能问题
    if n > 1000:
        raise ValueError(f"长度不能超过 1000，当前值: {n}")
    
    # 使用更高效的方式生成随机数字字符串
    # random.choices 比循环 random.choice 更高效
    return ''.join(random.choices(string.digits, k=n))


def get_remote_ip(request) -> str:
    """
    获取客户端真实 IP 地址。

    从 Flask 请求对象中获取客户端的真实 IP 地址，支持多种代理和 CDN 环境。
    按照优先级顺序检查不同的 HTTP 头部字段，确保获取到最准确的客户端 IP。

    检查顺序：
    1. CF-Connecting-IP (Cloudflare)
    2. X-Real-IP (Nginx 代理)
    3. X-Forwarded-For (标准代理头)
    4. X-Client-IP (某些代理)
    5. request.remote_addr (直连)

    Args:
        request: Flask 请求对象，包含 HTTP 头部信息。

    Returns:
        str: 客户端的 IP 地址。如果无法获取则返回 '未知'。

    Note:
        - 对于 X-Forwarded-For，会自动提取第一个（最原始的）IP 地址
        - 会自动清理 IP 地址中的空白字符
        - 支持 IPv4 和 IPv6 地址格式
        - 在多层代理环境下，优先返回最接近客户端的 IP

    Examples:
        >>> get_remote_ip(request)
        '192.168.1.100'
        
        >>> get_remote_ip(request)  # 通过 Cloudflare
        '203.0.113.1'
    """
    # 检查请求对象是否有效
    if not request:
        return "未知"
    
    # 按优先级检查各种 IP 头部字段
    ip_headers = [
        # Cloudflare CDN 提供的真实客户端 IP
        "CF-Connecting-IP",
        # Nginx 等反向代理常用的真实 IP 头
        "X-Real-IP", 
        # 标准的代理转发头（可能包含多个 IP）
        "X-Forwarded-For",
        # 某些代理服务器使用的客户端 IP 头
        "X-Client-IP",
        # 某些负载均衡器使用的头部
        "X-Cluster-Client-IP",
    ]
    
    # 逐个检查 IP 头部字段
    for header in ip_headers:
        ip_value = request.headers.get(header)
        if ip_value:
            # 清理 IP 地址字符串
            ip_value = ip_value.strip()
            
            # 处理 X-Forwarded-For 等可能包含多个 IP 的情况
            # 格式: "client_ip, proxy1_ip, proxy2_ip"
            if ',' in ip_value:
                # 取第一个 IP（最接近客户端的）
                ip_value = ip_value.split(',')[0].strip()
            
            # 验证 IP 地址不为空且不是占位符
            if ip_value and ip_value.lower() not in ['unknown', 'null', '-']:
                return ip_value
    
    # 如果所有头部都没有找到有效 IP，使用直连地址
    if hasattr(request, 'remote_addr') and request.remote_addr:
        return request.remote_addr
    
    # 最后的兜底返回
    return "未知"


def generate_text_hash(text: str) -> str:
    """生成文本的 SHA256 哈希值。

    为给定文本生成 SHA256 哈希值，会在文本后添加 "None" 后缀。

    Args:
        text (str): 要生成哈希的文本。

    Returns:
        str: 十六进制格式的 SHA256 哈希值。
    """
    hash_text = str(text) + "None"
    return sha256(hash_text.encode()).hexdigest()


class TokenManager:
    """令牌管理器。

    用于生成、验证和撤销各种类型的令牌，使用 Redis 进行存储。
    """

    @classmethod
    def generate_token(
        cls, account, token_type: str, additional_data: dict = None
    ) -> str:
        """生成新的令牌。

        为指定账户生成新令牌，如果存在旧令牌则先撤销。

        Args:
            account: 用户账户对象。
            token_type (str): 令牌类型。
            additional_data (dict, optional): 额外的令牌数据。

        Returns:
            str: 生成的令牌字符串。
        """
        old_token = cls._get_current_token_for_account(account.id, token_type)
        if old_token:
            if isinstance(old_token, bytes):
                old_token = old_token.decode("utf-8")
            cls.revoke_token(old_token, token_type)

        token = str(uuid.uuid4())
        token_data = {
            "account_id": account.id,
            "email": account.email,
            "token_type": token_type,
        }
        if additional_data:
            token_data.update(additional_data)

        expiry_hours = int(os.getenv(f"{token_type.upper()}_TOKEN_EXPIRY_HOURS", 0))
        if not expiry_hours:
            expiry_hours = 24
        token_key = cls._get_token_key(token, token_type)
        redis_client.setex(token_key, expiry_hours * 60 * 60, json.dumps(token_data))

        cls._set_current_token_for_account(account.id, token, token_type, expiry_hours)
        return token

    @classmethod
    def _get_token_key(cls, token: str, token_type: str) -> str:
        """获取令牌在 Redis 中的键名。

        Args:
            token (str): 令牌字符串。
            token_type (str): 令牌类型。

        Returns:
            str: Redis 键名。
        """
        return f"{token_type}:token:{token}"

    @classmethod
    def revoke_token(cls, token: str, token_type: str):
        """撤销指定的令牌。

        从 Redis 中删除令牌数据。

        Args:
            token (str): 要撤销的令牌。
            token_type (str): 令牌类型。
        """
        token_key = cls._get_token_key(token, token_type)
        redis_client.delete(token_key)

    @classmethod
    def get_token_data(cls, token: str, token_type: str) -> Optional[dict[str, Any]]:
        """获取令牌关联的数据。

        从 Redis 中检索令牌对应的数据。

        Args:
            token (str): 令牌字符串。
            token_type (str): 令牌类型。

        Returns:
            Optional[dict[str, Any]]: 令牌数据字典，如果令牌不存在则返回 None。
        """
        key = cls._get_token_key(token, token_type)
        token_data_json = redis_client.get(key)
        if token_data_json is None:
            logging.warning(f"{token_type} token {token} not found with key {key}")
            return None
        token_data = json.loads(token_data_json)
        return token_data

    @classmethod
    def _get_current_token_for_account(
        cls, account_id: str, token_type: str
    ) -> Optional[str]:
        """获取账户当前的令牌。

        Args:
            account_id (str): 账户 ID。
            token_type (str): 令牌类型。

        Returns:
            Optional[str]: 当前令牌，如果不存在则返回 None。
        """
        key = cls._get_account_token_key(account_id, token_type)
        current_token = redis_client.get(key)
        return current_token

    @classmethod
    def _set_current_token_for_account(
        cls, account_id: str, token: str, token_type: str, expiry_hours: int
    ):
        """为账户设置当前令牌。

        Args:
            account_id (str): 账户 ID。
            token (str): 令牌字符串。
            token_type (str): 令牌类型。
            expiry_hours (int): 过期时间（小时）。
        """
        key = cls._get_account_token_key(account_id, token_type)
        redis_client.setex(key, expiry_hours * 60 * 60, token)

    @classmethod
    def _get_account_token_key(cls, account_id: str, token_type: str) -> str:
        """获取账户令牌在 Redis 中的键名。

        Args:
            account_id (str): 账户 ID。
            token_type (str): 令牌类型。

        Returns:
            str: Redis 键名。
        """
        return f"{token_type}:account:{account_id}"


class RateLimiter:
    """频率限制器。

    基于 Redis 的滑动窗口频率限制器，用于防止过于频繁的请求。

    Attributes:
        prefix (str): Redis 键前缀。
        max_attempts (int): 最大尝试次数。
        time_window (int): 时间窗口（秒）。
    """

    def __init__(self, prefix: str, max_attempts: int, time_window: int):
        """初始化频率限制器。

        Args:
            prefix (str): Redis 键前缀。
            max_attempts (int): 时间窗口内允许的最大尝试次数。
            time_window (int): 时间窗口长度（秒）。
        """
        self.prefix = prefix
        self.max_attempts = max_attempts
        self.time_window = time_window

    def _get_key(self, email: str) -> str:
        """获取邮箱对应的 Redis 键名。

        Args:
            email (str): 邮箱地址。

        Returns:
            str: Redis 键名。
        """
        return f"{self.prefix}:{email}"

    def is_rate_limited(self, email: str) -> bool:
        """检查是否达到频率限制。

        检查指定邮箱在时间窗口内的请求次数是否超过限制。

        Args:
            email (str): 要检查的邮箱地址。

        Returns:
            bool: 如果达到频率限制返回 True，否则返回 False。
        """
        key = self._get_key(email)
        current_time = int(time.time())
        window_start_time = current_time - self.time_window

        redis_client.zremrangebyscore(key, "-inf", window_start_time)
        attempts = redis_client.zcard(key)

        if attempts and int(attempts) >= self.max_attempts:
            return True
        return False

    def increment_rate_limit(self, email: str):
        """增加频率限制计数。

        为指定邮箱增加一次请求记录。

        Args:
            email (str): 邮箱地址。
        """
        key = self._get_key(email)
        current_time = int(time.time())

        redis_client.zadd(key, {current_time: current_time})
        redis_client.expire(key, self.time_window * 2)


def build_response(result=None, message=None, status=0, **kwargs):
    """构建标准化的 API 响应。

    Args:
        result: 响应中要返回的数据。
        message: 响应中包含的消息。
        status: 响应状态。0 表示成功，1 表示失败。
        **kwargs: 其他要包含在响应中的键值对。

    Returns:
        tuple: 包含响应字典和 HTTP 状态码的元组。
    """
    if status == 0:
        recode = 200
        message = message or "Success"
    else:
        recode = 500
        message = message or "Failure"

    return {"status": status, "message": message, "result": result, **kwargs}, recode


def generate_random_string(length=8):
    """生成指定长度的随机字符串。

    Args:
        length (int, optional): 字符串长度。默认为 8。

    Returns:
        str: 生成的随机字符串，包含大小写字母和数字。
    """
    characters = string.ascii_letters + string.digits  # 字符池，包括大小写字母和数字
    return "".join(random.choices(characters, k=length))


def clone_model(model, **kwargs):
    """克隆 SQLAlchemy 模型对象。

    创建一个不包含主键值的模型对象副本。

    Args:
        model: 要克隆的 SQLAlchemy 模型对象。
        **kwargs: 要覆盖或添加的字段值。

    Returns:
        object: 克隆的模型对象实例。
    """
    model.id  # Ensure the model’s data is loaded before copying.

    table = model.__table__
    non_pk_columns = [
        k for k in table.columns.keys() if k not in table.primary_key.columns.keys()
    ]
    data = {c: getattr(model, c) for c in non_pk_columns}
    data.update(kwargs)

    clone = model.__class__(**data)
    return clone
