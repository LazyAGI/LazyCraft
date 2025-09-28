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

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class MailConfig(BaseSettings):
    """邮件配置"""

    SMTP_USERNAME: Optional[str] = Field(
        description="SMTP 服务器用户名",
        default=None,
    )

    SMTP_PASSWORD: Optional[str] = Field(
        description="SMTP 服务器密码",
        default=None,
    )

    SMTP_USE_TLS: bool = Field(
        description="是否使用 TLS 连接到 SMTP 服务器",
        default=False,
    )

    SMTP_OPPORTUNISTIC_TLS: bool = Field(
        description="是否使用opportunistic TLS  连接到 SMTP 服务器",
        default=False,
    )
    
    MAIL_TYPE: Optional[str] = Field(
        description="邮件服务提供商类型，默认为 None，可选值为 `smtp` 和 `resend`",
        default=None,
    )

    MAIL_DEFAULT_SEND_FROM: Optional[str] = Field(
        description="默认发件人邮箱地址",
        default=None,
    )

    SMTP_SERVER: Optional[str] = Field(
        description="SMTP 服务器主机地址",
        default=None,
    )

    SMTP_PORT: Optional[int] = Field(
        description="SMTP 服务器端口",
        default=465,
    )

    
