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
import time

import click
from celery import shared_task
from flask import render_template

from utils.util_mail import mail


@shared_task(queue="mail")
def send_reset_password_mail_task(language: str, to: str, token: str):
    """异步发送重置密码邮件任务。

    这是一个 Celery 后台任务，用于向用户发送密码重置邮件。
    邮件包含重置密码的链接和令牌。

    Args:
        language (str): 邮件语言代码（如 'en', 'zh'）。
        to (str): 收件人邮箱地址。
        token (str): 重置密码令牌，将包含在邮件链接中。

    Note:
        如果邮件服务未初始化，函数会直接返回而不发送邮件。
        当前实现固定使用中文模板。
    """
    if not mail.is_inited():
        logging.info("邮件服务未初始化，函数会直接返回而不发送邮件", fg="green")
        return

    logging.info(click.style("Start password reset mail to {}".format(to), fg="green"))
    start_at = time.perf_counter()

    # send reset password mail using different languages
    try:
        web_url = os.getenv("WEB_CONSOLE_ENDPOINT")
        url = f"{web_url}/forgot-password?token={token}"
        template_name = "reset_password_mail_template_zh-CN.html"
        html_content = render_template(template_name, to=to, url=url)
        mail.send(to=to, subject="重置您的密码", html=html_content)
        # if language == 'zh-Hans':
        #     template_name = 'reset_password_mail_template_zh-CN.html'
        #     html_content = render_template(template_name, to=to, url=url)
        #     mail.send(to=to, subject="重置您的密码", html=html_content)
        # else:
        #     template_name = 'reset_password_mail_template_en-US.html'
        #     template_name = 'reset_password_mail_template_zh-CN.html'
        #     html_content = render_template(template_name, to=to, url=url)
        #     mail.send(to=to, subject="Reset Your Password", html=html_content)

        end_at = time.perf_counter()
        logging.info(
            click.style(
                "Send password reset mail to {} succeeded: latency: {}".format(
                    to, end_at - start_at
                ),
                fg="green",
            )
        )
    except Exception as e:
        logging.exception("Send password reset mail to {} failed".format(to))
        logging.exception(e)
