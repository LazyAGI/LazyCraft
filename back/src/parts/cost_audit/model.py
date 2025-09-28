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


from sqlalchemy.sql import func

from utils.util_database import db


class CostAudit(db.Model):
    """成本审计模型，用于存储应用的单次调试或发布的Token使用记录。

    Attributes:
        id (int): 成本审计记录的唯一标识符。
        app_id (str): 应用的唯一标识符（UUID字符串格式）。
        task_id (int, optional): 任务的唯一标识符。
        tenant_id (str, optional): 租户的唯一标识符。
        user_id (str): 用户的唯一标识符。
        session_id (str, optional): 会话的唯一标识符。
        call_type (str): 调用类型，可以是 'debug'、'release'、'evaluation'、'fine_tune_online' 或 'fine_tune_local'。
        token_num (int): 使用的Token数量。
        cost_time (Numeric, optional): 大模型思考时长，单位为秒，精确到小数点后六位。
        created_at (datetime): 记录创建时间，默认为当前UTC时间。
        updated_at (datetime): 记录更新时间，默认为当前UTC时间。
    """

    __tablename__ = "cost_audits"

    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.String(36))  # app_id为字符串形式的UUID
    task_id = db.Column(db.Integer)
    tenant_id = db.Column(db.String(36))
    user_id = db.Column(db.String(255))
    session_id = db.Column(db.String(40))
    call_type = db.Column(db.String(30), nullable=False)  # 可以是 'run' 或 'release'
    token_num = db.Column(db.Integer, nullable=False)
    cost_time = db.Column(db.Numeric(10, 6), comment="思考时长")
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now())


class AppStatistics(db.Model):
    """应用统计数据表，用于存储应用的统计指标数据。

    Attributes:
        id (int): 统计记录的唯一标识符。
        app_id (str): 应用的唯一标识符。
        call_type (str): 调用类型，默认为"release"。
        stat_date (date): 统计日期。
        system_user_count (int): 系统用户数量，默认为0。
        web_user_count (int): Web用户数量，默认为0。
        system_user_session_count (int): 系统用户会话数量，默认为0。
        web_user_session_count (int): Web用户会话数量，默认为0。
        system_user_token_sum (int): 系统用户Token消耗总数，默认为0。
        web_user_token_sum (int): Web用户Token消耗总数，默认为0。
        system_user_interaction_count (int): 系统用户互动数量，默认为0。
        web_user_interaction_count (int): Web用户互动数量，默认为0。
        cost_time_p50 (Numeric): 响应时间P50值，默认为0。
        cost_time_p99 (Numeric): 响应时间P99值，默认为0。
        web_user_avg_interaction (float): Web用户平均互动数，默认为0。
        created_at (datetime): 记录创建时间，默认为当前UTC时间。
    """

    __tablename__ = "app_statistics"
    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.String(36), nullable=False, index=True)
    call_type = db.Column(db.String(30), nullable=False, default="release")
    stat_date = db.Column(db.Date, nullable=False, index=True)
    system_user_count = db.Column(db.Integer, default=0)
    web_user_count = db.Column(db.Integer, default=0)
    system_user_session_count = db.Column(db.Integer, default=0)
    web_user_session_count = db.Column(db.Integer, default=0)
    system_user_token_sum = db.Column(db.Integer, default=0)
    web_user_token_sum = db.Column(db.Integer, default=0)
    system_user_interaction_count = db.Column(db.Integer, default=0)
    web_user_interaction_count = db.Column(db.Integer, default=0)
    cost_time_p50 = db.Column(db.Numeric(10, 5), default=0)
    cost_time_p99 = db.Column(db.Numeric(10, 5), default=0)
    web_user_avg_interaction = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=func.now())

    def to_dict(self):
        """将应用统计数据转换为字典格式。

        Returns:
            dict: 包含应用统计数据的字典，包括应用ID、调用类型、统计日期、
                  系统用户数、Web用户数、会话数、Token消耗、互动数等指标。
        """
        return {
            "app_id": self.app_id,
            "call_type": self.call_type,
            "stat_date": self.stat_date.isoformat(),
            "system_user_count": self.system_user_count,
            "web_user_count": self.web_user_count,
            "system_user_session_count": self.system_user_session_count,
            "web_user_session_count": self.web_user_session_count,
            "system_user_token_sum": self.system_user_token_sum,
            "web_user_token_sum": self.web_user_token_sum,
            "system_user_interaction_count": self.system_user_interaction_count,
            "web_user_interaction_count": self.web_user_interaction_count,
            "cost_time_p50": float(self.cost_time_p50) if self.cost_time_p50 else 0,
            "cost_time_p99": float(self.cost_time_p99) if self.cost_time_p99 else 0,
            "web_user_avg_interaction": self.web_user_avg_interaction,
        }
