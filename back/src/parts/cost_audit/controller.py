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

from datetime import date, timedelta

from flask import request
from flask_login import current_user

from core.restful import Resource
from libs.login import login_required
from parts.urls import api

from .model import CostAudit
from .service import CATEGORY_TYPES, CostService


class AppCostAudit(Resource):
    @login_required
    def get(self, app_id):
        """查询应用的成本审计信息。

        Args:
            app_id (str): 应用的唯一标识符。

        Returns:
            dict: 包含应用成本审计信息的字典，包括调试和发布模式的调用次数和Token使用数。
        """
        # 查询成本审计记录
        cost_audits = CostAudit.query.filter_by(app_id=str(app_id)).all()
        run_call_num = 0
        run_token_num = 0
        release_call_num = 0
        release_token_num = 0
        if cost_audits:
            for audit in cost_audits:
                if audit.call_type == "debug":
                    run_call_num += 1
                    run_token_num += audit.token_num
                elif audit.call_type == "release":
                    release_call_num += 1
                    release_token_num += audit.token_num
        return {
            "run_call_num": run_call_num,
            "run_token_num": run_token_num,
            "release_call_num": release_call_num,
            "release_token_num": release_token_num,
        }


class StatCostAudit(Resource):
    def get(self):
        """查询费用统计数据。

        Args:
            tenant_id (str, optional): 组织的唯一标识符。如果有组织ID，查询当前组织下所有用户的费用统计数据，否则查询当前用户的费用统计数据。

        Returns:
            dict: 包含费用统计数据的字典，包括各类别的统计信息和总计数据。
        """

        tenant_id = request.args.get("tenant_id", None)
        if tenant_id and tenant_id != current_user.current_tenant_id:
            self.check_is_super()

        self.check_can_admin()

        cost_audits = CostService.get_cost(current_user, tenant_id)

        categories = {
            category: {"count": 0, "token_usage_times": 0, "token_consumption": 0}
            for key, category in CATEGORY_TYPES.items()
        }
        total = {
            "count": 0,
            "token_usage_times": 0,
            "token_consumption": 0,
            "gpu_consumption": 0,
        }

        if cost_audits:
            for audit in cost_audits:
                category_key = CATEGORY_TYPES[audit.call_type]
                self.update_category_stats(categories, category_key, audit)

            for key, category in CATEGORY_TYPES.items():
                categories[category]["count"] = len(
                    categories[category].get(category, set())
                )
                total["count"] += categories[category]["count"]
                total["token_usage_times"] += categories[category]["token_usage_times"]
                total["token_consumption"] += (
                    0
                    if category == "模型微调(线下模型)"
                    else categories[category]["token_consumption"]
                )
                total["gpu_consumption"] += (
                    categories[category]["token_consumption"]
                    if category == "模型微调(线下模型)"
                    else 0
                )

        return {
            "categories": [
                {
                    "category": category,
                    "count": categories[category]["count"],
                    "token_usage_times": categories[category]["token_usage_times"],
                    "token_consumption": (
                        0
                        if category == "模型微调(线下模型)"
                        else categories[category]["token_consumption"]
                    ),
                    "gpu_consumption": (
                        categories[category]["token_consumption"]
                        if category == "模型微调(线下模型)"
                        else 0
                    ),
                }
                for index, category in CATEGORY_TYPES.items()
            ],
            "total": total,
        }

    def update_category_stats(self, categories, category_key, audit):
        """更新分类统计数据。

        Args:
            categories (dict): 分类统计数据字典。
            category_key (str): 分类键名。
            audit (CostAudit): 成本审计记录对象。

        Returns:
            None: 直接修改传入的categories字典。
        """
        categories[category_key]["token_usage_times"] += 1
        categories[category_key]["token_consumption"] += audit.token_num
        if category_key not in categories[category_key]:
            categories[category_key][category_key] = set()
        if category_key == "应用编排" or category_key == "应用发布":  # app数
            categories[category_key][category_key].add(audit.app_id)
        elif category_key == "模型评测" or category_key == "模型微调":  # 任务数
            categories[category_key][category_key].add(audit.task_id)


class AppStatisticsApi(Resource):
    @login_required
    def post(self):
        """获取指定app_id的统计指标，优先从redis缓存读取。

        Args:
            通过JSON请求体传递参数：
                app_id (str): 应用的唯一标识符。

        Returns:
            dict: 包含统计指标的字典，包括累计token消费、用户数、会话数、互动数等。

        Example:
            请求示例:
            POST /costaudit/app_statistics
            Content-Type: application/json
            {
                "app_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        """
        data = request.json or {}
        app_id = data.get("app_id")
        result = CostService.get_app_statistics(app_id)
        return {"data": result}


class CalcAndSaveAppStatisticsApi(Resource):
    @login_required
    def post(self):
        """统计指定app_id下的各类指标，并存入AppStatistics表。

        Args:
            通过JSON请求体传递参数：
                app_id (str): 应用的唯一标识符。
                call_type (str, optional): 调用类型，默认为"release"。
                stat_date (str, optional): 统计日期，格式为"YYYY-MM-DD"。
                stat_date_start (str, optional): 统计开始日期，格式为"YYYY-MM-DD"。
                stat_date_end (str, optional): 统计结束日期，格式为"YYYY-MM-DD"。
                need_save_db (bool, optional): 是否需要保存到数据库，默认为False。

        Returns:
            dict: 包含统计结果的字典。

        Example:
            请求示例:
            POST /costaudit/calc_and_save_app_statistics
            Content-Type: application/json
            {
                "app_id": "123e4567-e89b-12d3-a456-426614174000",
                "call_type": "release",
                "stat_date": "2025-06-01",
                "stat_date_start": "2025-06-01",
                "stat_date_end": "2025-06-07",
                "need_save_db": true
            }
        """
        data = request.json or {}
        app_id = data.get("app_id")
        call_type = data.get("call_type", "release")
        stat_date = data.get("stat_date")
        stat_date_start = data.get("stat_date_start")
        stat_date_end = data.get("stat_date_end")
        need_save_db = data.get("need_save_db", False)
        # 日期字符串转date对象（如有必要）
        if stat_date and isinstance(stat_date, str):
            stat_date = date.fromisoformat(stat_date)
        if stat_date_start and isinstance(stat_date_start, str):
            stat_date_start = date.fromisoformat(stat_date_start)
        if stat_date_end and isinstance(stat_date_end, str):
            stat_date_end = date.fromisoformat(stat_date_end)
        result = CostService.calc_and_save_app_statistics(
            app_id=app_id,
            call_type=call_type,
            stat_date=stat_date,
            stat_date_start=stat_date_start,
            stat_date_end=stat_date_end,
            need_save_db=need_save_db,
        )
        return {"data": result}


class DailyAppStatisticsApi(Resource):
    @login_required
    def post(self):
        """遍历所有app_id，统计指定日期的数据并存入AppStatistics表。

        Args:
            通过JSON请求体传递参数：
                stat_date (str, optional): 统计日期，格式为"YYYY-MM-DD"。如果不提供，则统计昨天的数据。

        Returns:
            dict: 包含操作结果的字典。

        Example:
            请求示例:
            POST /costaudit/daily_app_statistics
            Content-Type: application/json
            {
                "stat_date": "2025-06-01"
            }
        """
        data = request.json or {}
        stat_date = data.get("stat_date")
        if stat_date and isinstance(stat_date, str):
            stat_date = date.fromisoformat(stat_date)
        else:
            stat_date = date.today() - timedelta(days=1)
        CostService.daily_app_statistics(stat_date)
        return {"msg": "统计完成"}


class CacheAppStatisticsForPeriodsApi(Resource):
    @login_required
    def post(self):
        """遍历所有app_id，统计近7天、近30天的数据并缓存到redis。

        Args:
            通过JSON请求体传递参数：
                stat_date (str, optional): 统计基准日期，格式为"YYYY-MM-DD"。如果不提供，则使用今天作为基准日期。

        Returns:
            dict: 包含操作结果的字典。

        Example:
            请求示例:
            POST /costaudit/cache_app_statistics_for_periods
            Content-Type: application/json
            {
                "stat_date": "2025-06-07"
            }
        """
        data = request.json or {}
        stat_date = data.get("stat_date")
        if stat_date and isinstance(stat_date, str):
            stat_date = date.fromisoformat(stat_date)
        else:
            stat_date = date.today()
        CostService.cache_app_statistics_for_periods(stat_date)
        return {"msg": "缓存完成"}


class GetAppStatisticsByPeriodApi(Resource):
    @login_required
    def post(self):
        """获取指定app_id和时间区间的统计数据，优先从redis获取，未命中则实时统计。

        Args:
            通过JSON请求体传递参数：
                app_id (str): 应用的唯一标识符。
                start_date (str): 起始日期，格式为"YYYY-MM-DD"。
                end_date (str): 结束日期，格式为"YYYY-MM-DD"。

        Returns:
            dict: 包含统计数据的字典。

        Example:
            请求示例:
            POST /costaudit/get_app_statistics_by_period
            Content-Type: application/json
            {
                "app_id": "123e4567-e89b-12d3-a456-426614174000",
                "start_date": "2025-06-01",
                "end_date": "2025-06-07"
            }
        """
        data = request.json or {}
        app_id = data.get("app_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if end_date and isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)
        result = CostService.get_app_statistics_by_period(app_id, start_date, end_date)
        return {"data": result}


class QueryAppStatisticsApi(Resource):
    @login_required
    def post(self):
        """查询AppStatistics表，支持按app_id、时间区间、call_type过滤。

        Args:
            通过JSON请求体传递参数：
                app_id (str): 应用的唯一标识符。
                start_date (str, optional): 起始日期，格式为"YYYY-MM-DD"。
                end_date (str, optional): 结束日期，格式为"YYYY-MM-DD"。
                call_type (str, optional): 调用类型，用于过滤数据。

        Returns:
            dict: 包含查询结果的字典。

        Example:
            请求示例:
            POST /costaudit/query_app_statistics
            Content-Type: application/json
            {
                "app_id": "123e4567-e89b-12d3-a456-426614174000",
                "start_date": "2025-06-01",
                "end_date": "2025-06-07",
                "call_type": "release"
            }
        """
        data = request.json or {}
        app_id = data.get("app_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        call_type = data.get("call_type")
        result = CostService.query_app_statistics(
            app_id, start_date, end_date, call_type
        )
        return {"data": result}


class QueryConversationsApi(Resource):
    @login_required
    def post(self):
        """查询Conversation表，支持按app_id、时间区间、from_who过滤。

        Args:
            通过JSON请求体传递参数：
                app_id (str, optional): 应用的唯一标识符。
                start_time (str, optional): 起始时间，格式为"YYYY-MM-DD HH:MM:SS"。
                end_time (str, optional): 结束时间，格式为"YYYY-MM-DD HH:MM:SS"。
                from_who (str, optional): 用户ID，用于过滤特定用户的对话。

        Returns:
            dict: 包含查询结果的字典。

        Example:
            请求示例:
            POST /costaudit/query_conversations
            Content-Type: application/json
            {
                "app_id": "123e4567-e89b-12d3-a456-426614174000",
                "start_time": "2025-06-01 00:00:00",
                "end_time": "2025-06-07 23:59:59",
                "from_who": "user-001"
            }
        """
        data = request.json or {}
        app_id = data.get("app_id")
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        from_who = data.get("from_who")
        result = CostService.query_conversations(app_id, start_time, end_time, from_who)
        return {"data": result}


api.add_resource(AppCostAudit, "/costaudit/apps/<uuid:app_id>")
api.add_resource(StatCostAudit, "/costaudit/stats")

api.add_resource(AppStatisticsApi, "/costaudit/app_statistics")
api.add_resource(CalcAndSaveAppStatisticsApi, "/costaudit/calc_and_save_app_statistics")
api.add_resource(DailyAppStatisticsApi, "/costaudit/daily_app_statistics")
api.add_resource(
    CacheAppStatisticsForPeriodsApi, "/costaudit/cache_app_statistics_for_periods"
)
api.add_resource(GetAppStatisticsByPeriodApi, "/costaudit/get_app_statistics_by_period")
api.add_resource(QueryAppStatisticsApi, "/costaudit/query_app_statistics")
api.add_resource(QueryConversationsApi, "/costaudit/query_conversations")
