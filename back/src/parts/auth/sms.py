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

import requests

from libs.helper import RateLimiter, generate_numberic_str
from utils.util_redis import redis_client


class SmsChecker:

    def __init__(self, operation):
        """初始化短信验证器。

        Args:
            operation (str): 短信操作类型，可选值：
                - login: 登录LazyLLM平台
                - reset: 重置LazyLLM平台密码
                - register: 注册LazyLLM账号
                - relate: 关联LazyLLM账号

        Raises:
            AssertionError: 当operation不在允许的操作类型范围内时抛出
        """
        assert operation in ["login", "reset", "register", "relate"]
        self.operation = operation

        # http://103.237.29.231:26511/send
        self.send_url = os.environ.get("SMS_URL", None) or None

        self.smscode_template = "smscode:" + operation + ":{}"
        self.sms_rate_limiter = RateLimiter(
            prefix="sms_rate_limiter:" + operation,
            max_attempts=2,
            time_window=60,
        )

    def send(self, phone):
        """发送短信验证码。

        向指定手机号发送验证码，支持频率限制和Redis缓存。
        如果配置了短信服务URL则调用外部服务，否则使用测试验证码。

        Args:
            phone (str): 接收验证码的手机号码

        Raises:
            ValueError: 当短信发送频率过快时抛出
        """
        if self.sms_rate_limiter.is_rate_limited(phone):
            raise ValueError("短信已经发送，请1分钟后重试")

        if self.send_url:
            code = generate_numberic_str(6)  # 随机6位数验证码
            params = {
                "phone_number": phone,
                "code": code,
                "operation": self.operation,
            }
            requests.post(self.send_url, params=params)
        else:
            code = "123456"  # 测试数据

        self.sms_rate_limiter.increment_rate_limit(phone)
        redis_key = self.smscode_template.format(phone)
        redis_client.setex(redis_key, 5 * 60, code)  # redis记录验证码

    def check(self, phone, verify_code):
        """验证短信验证码。

        检查用户输入的验证码是否与Redis中存储的验证码匹配。
        验证成功后会删除Redis中的验证码。

        Args:
            phone (str): 手机号码
            verify_code (str): 用户输入的验证码

        Raises:
            ValueError: 当验证码不存在或验证码错误时抛出
        """
        redis_key = self.smscode_template.format(phone)
        check_code = redis_client.get(redis_key)
        if not check_code:
            raise ValueError("验证码校验失败，请重新获取")
        if check_code.decode() != verify_code:
            raise ValueError("验证码错误，请重新输入")
        redis_client.delete(redis_key)

    def cached_phone_code_for_registration(self, phone, verify_code):
        """为注册流程缓存手机验证码。

        将验证码存储到Redis中，用于注册流程的验证码缓存。
        验证码有效期为5分钟。

        Args:
            phone (str): 手机号码
            verify_code (str): 要缓存的验证码
        """
        redis_key = self.smscode_template.format(phone)
        redis_client.setex(redis_key, 5 * 60, verify_code)  # redis记录验证码
