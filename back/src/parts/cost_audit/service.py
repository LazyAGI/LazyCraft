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
from datetime import date, datetime, timedelta

from sqlalchemy import func

from libs.http_exception import CommonError
from libs.timetools import TimeTools
from models.model_account import Account, Tenant, TenantStatus
from parts.app.model import App
from parts.conversation.model import Conversation
from utils.util_database import db
from utils.util_redis import redis_client

from .model import AppStatistics, CostAudit

CATEGORY_TYPES = {
    "debug": "应用编排",
    "release": "应用发布",
    "evaluation": "模型评测",
    "fine_tune_online": "模型微调(线上模型)",
    "fine_tune_local": "模型微调(线下模型)",
}


class CostService:
    def add(
        user_id: str,
        app_id: str,
        token_num: int,
        call_type: str,
        session_id=None,
        cost_time=None,
        **kwargs,
    ):
        """插入一条成本审计记录到数据库。

        Args:
            user_id (str): 用户的唯一标识符。
            app_id (str): 应用的唯一标识符。
            token_num (int): 使用的Token数量。
            call_type (str): 调用类型，可以是 'debug'、'release'、'fine_tune' 或 'evaluation'。
            session_id (str, optional): 会话的唯一标识符。
            cost_time (Numeric, optional): 大模型思考时长，单位为秒，精确到小数点后六位。
            **kwargs: 额外参数，包括：
                - task_id (int, optional): 任务的唯一ID。
                - tenant_id (str, optional): 租户的唯一标识符。

        Raises:
            Exception: 当数据库操作失败时抛出异常。
        """
        try:
            new_audit = CostAudit(
                user_id=str(user_id),
                call_type=call_type,
                token_num=token_num,
                created_at=TimeTools.now_datetime_china(),
                updated_at=TimeTools.now_datetime_china(),
                session_id=session_id,
                cost_time=cost_time,
            )
            if app_id != "":
                new_audit.app_id = str(app_id)
                # 获取appid的租户id
                new_audit.tenant_id = (
                    App.query.filter(App.id == app_id).first().tenant_id
                )
            if kwargs.get("task_id"):
                # 模型微调或模型评测的任务ID
                new_audit.task_id = kwargs.get("task_id")
            if kwargs.get("tenant_id"):
                new_audit.tenant_id = kwargs.get("tenant_id")
            db.session.add(new_audit)
            db.session.commit()
        except Exception as e:
            print(f"CostService.add发生异常: {e}")
            logging.exception(f"CostService.add发生异常: {e}")

    # def statistics(self, start_date, end_date):
    def get_cost(account, tenant_id):
        """获取成本审计记录列表。

        Args:
            account (Account): 用户账户对象。
            tenant_id (str, optional): 租户ID。如果未指定，则使用当前用户的租户ID。

        Returns:
            list: 成本审计记录列表，包含指定租户下的所有成本审计记录。

        Raises:
            Exception: 当数据库查询失败时抛出异常。
        """

        if not tenant_id:  # mei指定用户组
            tenant_id = account.current_tenant_id
        if tenant_id == "all_user_space":
            tenants = (
                db.session.query(Tenant.id)
                .filter(Tenant.status == TenantStatus.PRIVATE)
                .all()
            )
            tenant_ids = [tenant.id for tenant in tenants]
            # 超管查询所有个人空间的数据
            query = CostAudit.query.filter(CostAudit.tenant_id.in_(tenant_ids))
        else:
            query = CostAudit.query.filter(CostAudit.tenant_id == tenant_id)

        call_types = [item for item in CATEGORY_TYPES]
        query = query.filter(CostAudit.call_type.in_(call_types))

        return query.all()

    @staticmethod
    def get_app_statistics(app_id, cache_expire=3600):
        """统计指定app_id下的各类指标，并缓存到redis，重复访问优先读缓存。

        统计指标包括：
        - 累计token消费总数（CostAudit.token_num求和）
        - 累计用户数（Conversation.from_who在Account.id中的数量）
        - 临时用户数（Conversation.from_who不在Account.id中的数量）
        - 累计会话数（Conversation.sessionid去重计数）
        - 累计互动数（Conversation中每个sessionid下from_who为lazyllm的turn_number最大值之和）

        Args:
            app_id (str): 指定应用ID。
            cache_expire (int, optional): 缓存过期时间（秒），默认为3600秒。

        Returns:
            dict: 包含统计指标的字典，包括token_sum、user_count、guest_count、
                  session_count、interaction_count等。

        Raises:
            CommonError: 当指定的app_id不存在时抛出异常。
        """
        # 校验app_id是否存在
        app = App.query.filter_by(id=app_id).first()
        if not app:
            raise CommonError("指定的app_id不存在")

        cache_key = f"app_stats:{app_id}"
        cached = redis_client.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        # 1. 累计token消费总数
        token_sum = (
            db.session.query(func.sum(CostAudit.token_num))
            .filter(CostAudit.app_id == app_id, CostAudit.call_type == "release")
            .scalar()
            or 0
        )

        # 2. 获取所有有效用户id集合
        all_user_ids = set(
            str(acc.id) for acc in Account.query.with_entities(Account.id).all()
        )

        # 3. 查询该app下所有会话
        conversations = (
            db.session.query(
                Conversation.sessionid, Conversation.from_who, Conversation.turn_number
            )
            .filter(Conversation.app_id == app_id)
            .all()
        )

        # 4. 累计会话数
        sessionid_set = set()
        # 5. 用户统计
        user_set = set()
        guest_set = set()
        # 6. 互动数统计
        # sessionid -> 最大turn_number（只统计from_who为lazyllm的）
        session_turn_max = {}

        for sessionid, from_who, turn_number in conversations:
            if sessionid:
                sessionid_set.add(sessionid)
            if from_who and from_who != "lazyllm":
                if from_who in all_user_ids:
                    user_set.add(from_who)
                else:
                    guest_set.add(from_who)
            if from_who == "lazyllm" and sessionid:
                if sessionid not in session_turn_max or (
                    turn_number is not None
                    and turn_number > session_turn_max[sessionid]
                ):
                    session_turn_max[sessionid] = turn_number or 0

        session_count = len(sessionid_set)
        user_count = len(user_set)
        guest_count = len(guest_set)
        interaction_count = sum(session_turn_max.values())

        result = {
            "app_id": app_id,
            "token_sum": int(token_sum),
            "user_count": user_count,
            "guest_count": guest_count,
            "session_count": session_count,
            "interaction_count": int(interaction_count),
        }

        # 缓存到redis
        redis_client.setex(cache_key, cache_expire, json.dumps(result))

        return result

    @staticmethod
    def calc_and_save_app_statistics(
        app_id,
        call_type="release",
        stat_date=None,
        stat_date_start=None,
        stat_date_end=None,
        need_save_db=False,
    ):
        """统计指定app_id下的各类指标，并存入AppStatistics表。

        Args:
            app_id (str): 应用ID。
            call_type (str, optional): 调用类型，默认为"release"。
            stat_date (date, optional): 统计日期。如果指定，则统计该日期的数据。
            stat_date_start (date, optional): 统计开始日期。与stat_date_end配合使用。
            stat_date_end (date, optional): 统计结束日期。与stat_date_start配合使用。
            need_save_db (bool, optional): 是否需要保存到数据库，默认为False。

        Returns:
            dict: 包含统计结果的字典，包括系统用户数、Web用户数、会话数、
                  Token消耗、互动数、响应时间等指标。

        Raises:
            CommonError: 当指定的app_id不存在时抛出异常。
            ValueError: 当stat_date和stat_date_start/stat_date_end都未指定时抛出异常。
        """
        # 校验app_id是否存在
        app = App.query.filter_by(id=app_id).first()
        if not app:
            raise CommonError("指定的app_id不存在")

        # 1. 统计时间区间
        if stat_date:
            start_time = datetime.combine(stat_date, datetime.min.time())
            end_time = datetime.combine(stat_date, datetime.max.time())
        else:
            if not stat_date_start or not stat_date_end:
                raise ValueError("必须指定stat_date或stat_date_start和stat_date_end")
            start_time = datetime.combine(stat_date_start, datetime.min.time())
            end_time = datetime.combine(stat_date_end, datetime.max.time())

        # 2. 获取所有系统用户id集合
        all_user_ids = set(
            str(acc.id) for acc in Account.query.with_entities(Account.id).all()
        )

        # 3. 查询app下所有会话
        conversations = (
            db.session.query(
                Conversation.sessionid, Conversation.from_who, Conversation.turn_number
            )
            .filter(
                Conversation.app_id == app_id,
                Conversation.from_who != "lazyllm",
                Conversation.created_at >= start_time,
                Conversation.created_at <= end_time,
            )
            .all()
        )

        # 4. sessionid归类
        sessionid_to_user_type = {}
        sessionid_set = set()
        system_user_set = set()
        web_user_set = set()
        system_user_session_set = set()
        web_user_session_set = set()
        system_user_interaction = {}
        web_user_interaction = {}

        for sessionid, from_who, turn_number in conversations:
            if not sessionid:
                continue
            sessionid_set.add(sessionid)
            is_system_user = (
                from_who and from_who != "lazyllm" and from_who in all_user_ids
            )
            if is_system_user:
                system_user_set.add(from_who)
                system_user_session_set.add(sessionid)
            elif from_who and from_who != "lazyllm":
                web_user_set.add(from_who)
                web_user_session_set.add(sessionid)
            # 记录sessionid属于哪类用户
            if (
                sessionid not in sessionid_to_user_type
                and from_who
                and from_who != "lazyllm"
            ):
                sessionid_to_user_type[sessionid] = (
                    "system" if is_system_user else "web"
                )
            # 统计互动数
            # if from_who == "lazyllm":
            if sessionid in sessionid_to_user_type:
                if sessionid_to_user_type[sessionid] == "system":
                    if sessionid not in system_user_interaction or (
                        turn_number and turn_number > system_user_interaction[sessionid]
                    ):
                        system_user_interaction[sessionid] = turn_number or 0
                elif sessionid_to_user_type[sessionid] == "web":
                    if sessionid not in web_user_interaction or (
                        turn_number and turn_number > web_user_interaction[sessionid]
                    ):
                        web_user_interaction[sessionid] = turn_number or 0

        # 5. token消费统计
        # 先查出所有session_id属于哪类
        system_sessionids = set(
            [sid for sid, typ in sessionid_to_user_type.items() if typ == "system"]
        )
        web_sessionids = set(
            [sid for sid, typ in sessionid_to_user_type.items() if typ == "web"]
        )

        # CostAudit token统计
        cost_audits = (
            db.session.query(
                CostAudit.session_id, CostAudit.token_num, CostAudit.cost_time
            )
            .filter(
                CostAudit.app_id == app_id,
                CostAudit.call_type == call_type,
                CostAudit.created_at >= start_time,
                CostAudit.created_at <= end_time,
            )
            .all()
        )

        system_user_token_sum = 0
        web_user_token_sum = 0
        cost_times = []
        for session_id, token_num, cost_time in cost_audits:
            if session_id in system_sessionids:
                system_user_token_sum += token_num or 0
            elif session_id in web_sessionids:
                web_user_token_sum += token_num or 0
            if cost_time is not None:
                cost_times.append(float(cost_time))

        # 6. 响应耗时P50/P99
        cost_times_sorted = sorted(cost_times)
        n = len(cost_times_sorted)
        cost_time_p50 = cost_times_sorted[int(n * 0.5)] if n > 0 else 0
        cost_time_p99 = cost_times_sorted[int(n * 0.99)] if n > 0 else 0

        # 7. 互动数
        system_user_interaction_count = sum(system_user_interaction.values())
        web_user_interaction_count = sum(web_user_interaction.values())

        # 8. WEB用户人均互动数
        web_user_count = len(web_user_set)
        web_user_avg_interaction = (
            (web_user_interaction_count / web_user_count) if web_user_count > 0 else 0
        )

        # 9. 存入统计表
        stat = AppStatistics(
            app_id=app_id,
            call_type=call_type,
            stat_date=stat_date or stat_date_start,
            system_user_count=len(system_user_set),
            web_user_count=web_user_count,
            system_user_session_count=len(system_user_session_set),
            web_user_session_count=len(web_user_session_set),
            system_user_token_sum=system_user_token_sum,
            web_user_token_sum=web_user_token_sum,
            system_user_interaction_count=system_user_interaction_count,
            web_user_interaction_count=web_user_interaction_count,
            cost_time_p50=cost_time_p50,
            cost_time_p99=cost_time_p99,
            web_user_avg_interaction=web_user_avg_interaction,
        )
        if need_save_db:
            # 如果需要保存到数据库
            # 检查是否已存在相同日期和应用的统计记录
            existing_stat = AppStatistics.query.filter_by(
                app_id=app_id,
                call_type=call_type,
                stat_date=stat_date or stat_date_start,
            ).first()
            if not existing_stat:
                db.session.add(stat)
                db.session.commit()

        return stat.to_dict()

    @staticmethod
    def daily_app_statistics(stat_date: date):
        """遍历Conversation中的所有app_id，统计指定日期的数据并存入AppStatistics表。

        Args:
            stat_date (date): 统计日期。

        Returns:
            None: 无返回值，直接操作数据库。

        Raises:
            Exception: 当数据库操作失败时抛出异常。
        """
        # 计算昨天日期
        # yesterday = date.today() - timedelta(days=1)

        # 查询所有app_id（去重）
        app_ids = db.session.query(Conversation.app_id).distinct()
        for app_id_row in app_ids:
            app_id = app_id_row.app_id
            if not app_id:
                continue
            # 先缓存统计（可选，便于后续接口快速访问）
            CostService.get_app_statistics(app_id)
            # 统计并存入数据库
            CostService.calc_and_save_app_statistics(
                app_id=app_id, stat_date=stat_date, need_save_db=True
            )

    @staticmethod
    def cache_app_statistics_for_periods(stat_date: date):
        """遍历Conversation中的所有app_id，统计近7日、近30日的数据并缓存到redis。

        Args:
            stat_date (date): 统计基准日期。

        Returns:
            None: 无返回值，直接操作Redis缓存。

        Raises:
            Exception: 当Redis操作失败时抛出异常。
        """
        # today = date.today()
        # 近7天区间
        stat_date_start_7 = stat_date - timedelta(days=6)
        stat_date_end_7 = stat_date
        # 近30天区间
        stat_date_start_30 = stat_date - timedelta(days=29)
        stat_date_end_30 = stat_date

        # 格式化日期字符串
        start_7_str = stat_date_start_7.strftime("%Y%m%d")
        end_7_str = stat_date_end_7.strftime("%Y%m%d")
        start_30_str = stat_date_start_30.strftime("%Y%m%d")
        end_30_str = stat_date_end_30.strftime("%Y%m%d")
        # 查询所有app_id（去重）
        app_ids = db.session.query(Conversation.app_id).distinct()
        for app_id_row in app_ids:
            app_id = app_id_row.app_id
            if not app_id:
                continue

            # 近7天统计
            cache_key_7 = f"app_stats:{app_id}:{start_7_str}_{end_7_str}"
            cached_7 = redis_client.get(cache_key_7)
            if cached_7:
                try:
                    result_7 = json.loads(cached_7)
                except Exception:
                    result_7 = None
            else:
                result_7 = None

            if not result_7:
                result_7 = CostService.calc_and_save_app_statistics(
                    app_id=app_id,
                    stat_date_start=stat_date_start_7,
                    stat_date_end=stat_date_end_7,
                    need_save_db=False,
                )
                redis_client.setex(
                    cache_key_7, 3600 * 23, json.dumps(result_7)
                )  # 缓存23小时

            # 近30天统计
            cache_key_30 = f"app_stats:{app_id}:{start_30_str}_{end_30_str}"
            cached_30 = redis_client.get(cache_key_30)
            if cached_30:
                try:
                    result_30 = json.loads(cached_30)
                except Exception:
                    result_30 = None
            else:
                result_30 = None

            if not result_30:
                result_30 = CostService.calc_and_save_app_statistics(
                    app_id=app_id,
                    stat_date_start=stat_date_start_30,
                    stat_date_end=stat_date_end_30,
                    need_save_db=False,
                )
                redis_client.setex(
                    cache_key_30, 3600 * 23, json.dumps(result_30)
                )  # 缓存23小时

    @staticmethod
    def get_app_statistics_by_period(app_id, start_date: date, end_date: date):
        """获取指定app_id和时间区间的统计数据，优先从redis获取，未命中则实时统计。

        Args:
            app_id (str): 应用ID。
            start_date (date): 起始日期。
            end_date (date): 结束日期。

        Returns:
            dict: 统计结果字典，包含系统用户数、Web用户数、会话数、Token消耗等指标。

        Raises:
            CommonError: 当指定的app_id不存在时抛出异常。
        """
        # 校验app_id是否存在
        app = App.query.filter_by(id=app_id).first()
        if not app:
            raise CommonError("指定的app_id不存在")

        start_str = start_date.strftime("%Y%m%d")
        end_str = end_date.strftime("%Y%m%d")
        cache_key = f"app_stats:{app_id}:{start_str}_{end_str}"
        cached = redis_client.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        # 若缓存未命中，则实时统计（不写入redis）
        result = CostService.calc_and_save_app_statistics(
            app_id=app_id,
            stat_date_start=start_date,
            stat_date_end=end_date,
            need_save_db=False,
        )
        return result

    @staticmethod
    def query_app_statistics(app_id, start_date=None, end_date=None, call_type=None):
        """根据app_id、时间区间、call_type查询AppStatistics表的数据。

        Args:
            app_id (str): 应用ID。
            start_date (date or str, optional): 起始日期，支持date类型或字符串格式。
            end_date (date or str, optional): 结束日期，支持date类型或字符串格式。
            call_type (str, optional): 调用类型，用于过滤数据。

        Returns:
            list: 统计结果列表，每个元素为字典格式的统计数据。

        Raises:
            ValueError: 当日期格式不正确时抛出异常。
        """
        query = AppStatistics.query.filter(AppStatistics.app_id == app_id)
        if call_type:
            query = query.filter(AppStatistics.call_type == call_type)
        if start_date:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date)
            query = query.filter(AppStatistics.stat_date >= start_date)
        if end_date:
            if isinstance(end_date, str):
                end_date = date.fromisoformat(end_date)
            query = query.filter(AppStatistics.stat_date <= end_date)
        return [
            stat.to_dict() for stat in query.order_by(AppStatistics.stat_date).all()
        ]

    @staticmethod
    def query_conversations(app_id=None, start_time=None, end_time=None, from_who=None):
        """查询Conversation表，支持按app_id、时间区间、from_who过滤。

        Args:
            app_id (str, optional): 应用ID。
            start_time (str or datetime, optional): 起始时间，支持字符串或datetime格式。
            end_time (str or datetime, optional): 结束时间，支持字符串或datetime格式。
            from_who (str, optional): 用户ID，用于过滤特定用户的对话。

        Returns:
            list: Conversation对象列表，每个元素为字典格式的对话记录。

        Raises:
            ValueError: 当时间格式不正确时抛出异常。
        """
        query = Conversation.query
        if app_id:
            query = query.filter(Conversation.app_id == app_id)
        if start_time:
            query = query.filter(Conversation.created_at >= start_time)
        if end_time:
            query = query.filter(Conversation.created_at <= end_time)
        if from_who:
            query = query.filter(Conversation.from_who == from_who)
        return [dict(row) for row in query.all()]
