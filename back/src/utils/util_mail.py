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
from typing import Optional

from flask import Flask


class Mail:
    """邮件服务管理器类。

    该类用于管理邮件服务的初始化和发送功能。支持 SMTP 邮件服务，
    可以配置默认发件人地址，并提供邮件发送的验证功能。
    """

    def __init__(self):
        """初始化邮件服务管理器。

        创建 Mail 实例，邮件客户端和默认发件人地址初始化为 None，
        将在 init_app 方法中根据配置进行初始化。
        """
        self._client = None
        self._default_send_from = None

    def is_inited(self) -> bool:
        """检查邮件服务是否已初始化。

        Returns:
            bool: 如果邮件客户端已初始化返回 True，否则返回 False。
        """
        return self._client is not None

    def init_app(self, app: Flask):
        """初始化邮件服务。

        根据环境变量和 Flask 应用配置初始化邮件服务。
        目前支持 SMTP 邮件服务类型。

        Args:
            app (Flask): Flask 应用实例，包含邮件服务的配置信息。
                        需要包含以下配置项:
                        - SMTP_SERVER: SMTP 服务器地址
                        - SMTP_PORT: SMTP 服务器端口
                        - SMTP_USERNAME: SMTP 用户名
                        - SMTP_PASSWORD: SMTP 密码
                        - MAIL_DEFAULT_SEND_FROM: 默认发件人地址
                        - SMTP_USE_TLS: 是否使用 TLS
                        - SMTP_OPPORTUNISTIC_TLS: 是否使用机会性 TLS

        Raises:
            ValueError: 当配置的邮件类型不支持时抛出异常。
        """
        mail_type = os.getenv("MAIL_TYPE")
        if not mail_type:
            logging.warning("MAIL_TYPE is not set")
            return

        # 设置默认发件人（如提供）
        env_default_from = os.getenv("MAIL_DEFAULT_SEND_FROM")
        if env_default_from:
            self._default_send_from = env_default_from

        # 目前仅支持 smtp，使用表驱动以便后续扩展
        if mail_type == "smtp":
            from libs.smtp import SMTPClient

            client_kwargs = {
                "server": app.config.get("SMTP_SERVER"),
                "port": app.config.get("SMTP_PORT"),
                "username": app.config.get("SMTP_USERNAME"),
                "password": app.config.get("SMTP_PASSWORD"),
                "_from": app.config.get("MAIL_DEFAULT_SEND_FROM"),
                "use_tls": app.config.get("SMTP_USE_TLS"),
                "opportunistic_tls": app.config.get("SMTP_OPPORTUNISTIC_TLS"),
            }
            self._client = SMTPClient(**client_kwargs)
        else:
            raise ValueError("Unsupported mail type {}".format(mail_type))

    def send(self, to: str, subject: str, html: str, from_: Optional[str] = None):
        """发送邮件。

        发送 HTML 格式的邮件到指定收件人。会验证所有必需的参数，
        如果未指定发件人地址，将使用默认发件人地址。

        Args:
            to (str): 收件人邮箱地址。
            subject (str): 邮件主题。
            html (str): 邮件 HTML 内容。
            from_ (Optional[str], optional): 发件人邮箱地址。
                                           如果未指定，将使用默认发件人地址。

        Raises:
            ValueError: 当邮件客户端未初始化、发件人地址未设置、
                       收件人地址为空、邮件主题为空或邮件内容为空时抛出异常。
        """
        if not self._client:
            raise ValueError("Mail client is not initialized")

        # 使用默认发件人
        if not from_ and self._default_send_from:
            from_ = self._default_send_from

        # 参数校验去重
        required_params = {
            "mail from is not set": from_,
            "mail to is not set": to,
            "mail subject is not set": subject,
            "mail html is not set": html,
        }
        for error_message, value in required_params.items():
            if not value:
                raise ValueError(error_message)

        self._client.send({"from": from_, "to": to, "subject": subject, "html": html})


def init_app(app: Flask):
    """初始化邮件服务。

    这是一个便捷函数，用于初始化全局邮件服务实例。

    Args:
        app (Flask): Flask 应用实例。
    """
    mail.init_app(app)


mail = Mail()
