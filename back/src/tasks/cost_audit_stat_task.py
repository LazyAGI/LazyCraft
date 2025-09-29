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

from celery import shared_task

from parts.cost_audit.service import CostService


@shared_task
def daily_cost_audit_stat():
    """每日成本审计统计任务。

    这是一个 Celery 定时任务，用于执行每日的成本审计统计。
    计算前一天的应用使用成本统计，并缓存各时间段的统计数据。

    任务执行流程：
    1. 计算昨天的应用统计数据
    2. 缓存各时间段的统计数据用于快速查询
    """
    print("Starting daily cost audit statistics task")
    yesterday = date.today() - timedelta(days=1)
    CostService.daily_app_statistics(yesterday)
    CostService.cache_app_statistics_for_periods(yesterday)
    print(f"Completed daily cost audit statistics for {yesterday}")
