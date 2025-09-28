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

from libs.http_exception import BaseHTTPError


class InvalidEmailError(BaseHTTPError):
    error_code = "AUTH001:invalid_email"
    description = "邮箱地址无效"
    code = 400


class PasswordMismatchError(BaseHTTPError):
    error_code = "AUTH002:password_mismatch"
    description = "密码不匹配"
    code = 400


class InvalidTokenError(BaseHTTPError):
    error_code = "AUTH003:invalid_or_expired_token"
    description = "Token无效或者已经过期"
    code = 400


class PasswordResetRateLimitExceededError(BaseHTTPError):
    error_code = "AUTH004:password_reset_rate_limit_exceeded"
    description = "忘记密码邮件太频繁，请稍后重试"
    code = 410
