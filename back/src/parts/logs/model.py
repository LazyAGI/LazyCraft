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


from utils.util_database import db


class OperationLog(db.Model):
    """操作日志模型，用于记录用户的操作记录。

    该模型用于存储用户在系统中进行的各种操作，包括操作模块、
    具体动作、详细信息和时间等，便于系统审计和日志追踪。

    Attributes:
        id (int): 日志记录的唯一标识符。
        user_id (str): 用户的唯一标识符。
        module (str): 操作的模块名称。
        action (str): 操作的具体动作。
        details (str): 操作的详细信息。
        created_at (datetime): 记录创建时间，默认为当前UTC时间。
    """

    __tablename__ = "operation_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    module = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
