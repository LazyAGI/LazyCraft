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
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class SMTPClient:
    """SMTP 邮件客户端。

    用于发送电子邮件的 SMTP 客户端类。支持多种 SMTP 配置，包括 TLS 加密、
    机会性 TLS 和用户认证。可以发送 HTML 格式的邮件。
    """

    def __init__(
        self,
        server: str,
        port: int,
        username: str,
        password: str,
        _from: str,
        use_tls=False,
        opportunistic_tls=False,
    ):
        """初始化 SMTP 客户端。

        配置 SMTP 服务器连接参数和认证信息。

        Args:
            server (str): SMTP 服务器地址。
            port (int): SMTP 服务器端口。
            username (str): SMTP 用户名。
            password (str): SMTP 密码。
            _from (str): 默认发件人邮箱地址。
            use_tls (bool, optional): 是否使用 TLS 加密。默认为 False。
            opportunistic_tls (bool, optional): 是否使用机会性 TLS（STARTTLS）。
                                              只有在 use_tls=True 时生效。默认为 False。
        """
        self.server = server
        self.port = port
        self._from = _from
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.opportunistic_tls = opportunistic_tls

    def send(self, mail: dict):
        """发送邮件。

        发送 HTML 格式的邮件。支持不同的 TLS 配置和用户认证。

        Args:
            mail (dict): 邮件信息字典，必须包含以下键：
                - subject (str): 邮件主题
                - to (str): 收件人邮箱地址
                - html (str): 邮件 HTML 内容

        Raises:
            smtplib.SMTPException: SMTP 操作失败时抛出。
            TimeoutError: 连接或发送超时时抛出。
            Exception: 其他未预期的错误。
        """
        smtp = None
        try:
            if self.use_tls:
                if self.opportunistic_tls:
                    smtp = smtplib.SMTP(self.server, self.port, timeout=10)
                    smtp.starttls()
                else:
                    smtp = smtplib.SMTP_SSL(self.server, self.port, timeout=10)
            else:
                smtp = smtplib.SMTP(self.server, self.port, timeout=10)

            if self.username and self.password:
                smtp.login(self.username, self.password)

            msg = MIMEMultipart()
            msg["Subject"] = mail["subject"]
            msg["From"] = self._from
            msg["To"] = mail["to"]
            msg.attach(MIMEText(mail["html"], "html"))

            smtp.sendmail(self._from, mail["to"], msg.as_string())
        except smtplib.SMTPException as e:
            logging.error(
                f"SMTP 邮件发送失败 - 服务器: {self.server}:{self.port}, "
                f"收件人: {mail.get('to', '未知')}, 错误: {str(e)}"
            )
            raise
        except TimeoutError as e:
            logging.error(
                f"邮件发送超时 - SMTP 服务器连接超时 {self.server}:{self.port}, "
                f"收件人: {mail.get('to', '未知')}, 超时详情: {str(e)}"
            )
            raise
        except Exception as e:
            logging.error(
                f"邮件发送遇到未知错误 - 服务器: {self.server}:{self.port}, "
                f"发件人: {self._from}, 收件人: {mail.get('to', '未知')}, "
                f"主题: {mail.get('subject', '未知')}, 错误类型: {type(e).__name__}, "
                f"错误详情: {str(e)}"
            )
            raise
        finally:
            if smtp:
                smtp.quit()
