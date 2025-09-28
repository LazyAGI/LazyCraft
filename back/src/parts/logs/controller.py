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

from datetime import datetime, time, timedelta

from flask import request
from flask_login import current_user

from core.restful import Resource
from libs.helper import build_response
from libs.login import login_required
from libs.timetools import TimeTools
from parts.urls import api

from .service import LogService


class LogsController(Resource):

    @login_required
    def get(self):
        """查询用户的操作日志。

        所有时间参数均为北京时间（Asia/Shanghai），系统会自动转换为 UTC 进行查询。
        只有管理员才有权查看其他用户的操作日志，普通用户只能查看自己的日志。

        Args:
            organization_id (int, optional): 组织的唯一标识符。如果有组织ID，查询该组织下所有用户的操作日志。
            start_date (str, optional): 开始日期，格式为 'YYYY-MM-DD'。如果有开始日期，过滤该日期之后的操作日志。
            end_date (str, optional): 结束日期，格式为 'YYYY-MM-DD'。如果有结束日期，过滤该日期之前的操作日志。
            details (str, optional): 操作的详细信息。如果有详细信息，模糊匹配该信息的操作日志。
            page (int, optional): 分页页码，默认为1。
            per_page (int, optional): 每页记录数，默认为10。
            account_id (str, optional): 用户账户ID。
            user_name (str, optional): 用户名称。
            module (str, optional): 操作模块名称。
            action (str, optional): 操作动作名称。

        Returns:
            dict: 包含操作日志数据的响应字典，包含data、total、page、per_page字段。

        Raises:
            ValueError: 当日期格式不正确时抛出。
            PermissionError: 当用户没有权限查看其他用户日志时抛出。
        """

        start_date_str = request.args.get("start_date", type=str)
        end_date_str = request.args.get("end_date", type=str)
        details = request.args.get("details", type=str)
        page = request.args.get("page", default=1, type=int)
        per_page = request.args.get("per_page", default=10, type=int)
        # 当前日志中并未记录日志所属的工作空间信息，故该参数无效
        tenant_id = request.args.get("organization_id", default="", type=str)
        account_id = request.args.get("account_id", default="", type=str)

        # 只有管理员才有权查看其他用户的操作日志
        if not current_user.is_admin:
            if account_id and account_id != current_user.id:
                return build_response(
                    status=403, message="你没有权限查看其他用户的操作日志"
                )
            account_id = current_user.id
            # if tenant_id != '':
            #     tenants = TenantService.get_account_tenants(current_user)
            #     tenant_id_list = [item["id"] for item in tenants]
            #     if tenant_id not in tenant_id_list:
            #         return build_response(status=403, message="你没有权限查看该空间的操作日志")

        # 验证时间格式和合法性
        today = TimeTools.now_datetime_china().date()
        start_date = today
        end_date = today + timedelta(days=1)
        if start_date_str:
            try:
                start_date = TimeTools.str_to_date(start_date_str, "%Y-%m-%d")
            except ValueError:
                return build_response(
                    status=400,
                    message="Invalid start_date format. Expected format: YYYY-MM-DD",
                )

        if end_date_str:
            try:
                end_date = TimeTools.str_to_date(end_date_str, "%Y-%m-%d") + timedelta(
                    days=1
                )
            except ValueError:
                return build_response(
                    status=400,
                    message="Invalid end_date format. Expected format: YYYY-MM-DD",
                )

        if start_date > end_date:
            return build_response(
                status=400, message="start_date must be earlier than end_date"
            )

        # 转为 datetime 用于数据库过滤
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date, time.min)

        logs = LogService().get(
            start_date=start_datetime,
            end_date=end_datetime,
            details=details,
            page=page,
            per_page=per_page,
            tenant_id=tenant_id,
            user_name=request.args.get("user_name", type=str),
            module=request.args.get("module", type=str),
            action=request.args.get("action", type=str),
            account_id=account_id,
        )

        response_data = {
            "data": [
                {
                    "id": log.id,
                    "username": log.username,
                    "module": log.module,
                    "action": log.action,
                    "details": log.details,
                    "created_at": TimeTools.datetime_to_str(log.created_at),
                }
                for log in logs.items
            ],
            "total": logs.total,
            "page": logs.page,
            "per_page": logs.per_page,
        }
        return build_response(result=response_data)


# Register routes to the ExternalApi instance
api.add_resource(LogsController, "/logs")
