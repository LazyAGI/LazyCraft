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

from libs.filetools import FileTools
from utils.util_database import db


class Conversation(db.Model):
    """对话模型。

    用于存储对话会话和消息记录。
    """

    __tablename__ = "conversation"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="conversation_pkey"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    app_id = db.Column(db.String(40), nullable=True)
    sessionid = db.Column(db.String(40))
    content = db.Column(db.Text, nullable=True)
    files = db.Column(db.String(1024), nullable=True)
    from_who = db.Column(db.String(40))
    turn_number = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())

    is_satisfied = db.Column(db.Boolean, nullable=True)
    user_feedback = db.Column(db.String(2048), nullable=True)

    @property
    def files_as_list(self):
        """获取文件列表。

        Returns:
            list: 文件URL列表

        Raises:
            Exception: 当解析文件列表失败时抛出
        """
        data_list = self.files.split(",") if self.files else []
        data_list = [FileTools.parse_lazyllm_path_to_url(f) for f in data_list]
        return data_list

    def set_files(self, files_list):
        """设置文件列表。

        Args:
            files_list (list): 文件列表

        Returns:
            None: 无返回值

        Raises:
            Exception: 当设置文件列表失败时抛出
        """
        string_list = []
        for item in files_list or []:
            if isinstance(item, str) and item:
                string_list.append(item)
            elif isinstance(item, dict) and item.get("value"):
                string_list.append(item["value"])
        self.files = ",".join(string_list)

    @classmethod
    def create_new(cls, app_id, sessionid, from_who, content, turn_number, files_list):
        """创建新的对话记录。

        Args:
            app_id (str): 应用ID
            sessionid (str): 会话ID
            from_who (str): 发送者
            content (str): 消息内容
            turn_number (int): 轮次号
            files_list (list): 文件列表

        Returns:
            Conversation: 新创建的对话实例

        Raises:
            Exception: 当创建失败时抛出
        """
        instance = cls()
        instance.app_id = app_id
        instance.sessionid = sessionid
        instance.from_who = from_who
        instance.content = content
        instance.turn_number = turn_number
        instance.set_files(files_list)

        db.session.add(instance)
        db.session.flush()
        db.session.commit()
        return instance
