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


from sqlalchemy import UniqueConstraint

from models import StringUUID
from models.model_account import Account
from utils.util_database import db


class DataBaseInfo(db.Model):
    __tablename__ = "database_info"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    created_by = db.Column(StringUUID, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    database_name = db.Column(db.String(255), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    url = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    _table_count = None

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_database_info_name_tenant"),
    )

    @property
    def created_by_account(self):
        """获取创建该数据库的用户账号信息。

        Returns:
            Account: 创建者的账号对象，如果用户不存在则返回None
        """
        return db.session.get(Account, self.created_by)

    @property
    def table_count(self):
        """获取该数据库下的表数量。

        使用缓存机制避免重复查询，提高性能。

        Returns:
            int: 数据库中的表数量
        """
        if self._table_count:
            return self._table_count
        else:
            self._table_count = self._table_count = (
                db.session.query(TableInfo)
                .where(TableInfo.database_id == self.id)
                .count()
            )
        return self._table_count

    def to_dict(self):
        """将数据库信息对象转换为字典格式。

        将模型对象的所有字段转换为字典，便于JSON序列化。
        对UUID字段进行字符串转换，对日期时间字段使用ISO格式。

        Returns:
            dict: 包含数据库信息的字典
        """
        return {
            "id": self.id,
            "tenant_id": str(self.tenant_id),  # StringUUID 转为字符串
            "created_by": str(self.created_by),  # StringUUID 转为字符串
            "name": self.name,
            "database_name": self.database_name,
            "comment": self.comment,
            "url": self.url,
            "type": self.type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TableInfo(db.Model):
    __tablename__ = "table_info"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    created_by = db.Column(StringUUID, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    database_id = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    _row_count = None

    @property
    def created_by_account(self):
        """获取创建该表的用户账号信息。

        Returns:
            Account: 创建者的账号对象，如果用户不存在则返回None
        """
        return db.session.get(Account, self.created_by)

    @property
    def row_count(self):
        """获取表的行数。

        Returns:
            int: 表中的行数，如果未设置则返回None
        """
        return self._row_count

    @row_count.setter
    def row_count(self, value):
        """设置表的行数。

        用于临时存储表的行数统计信息，通常在查询表统计时使用。

        Args:
            value (int): 要设置的行数值
        """
        self._row_count = value

    def to_dict(self):
        """将表信息对象转换为字典格式。

        将模型对象的所有字段转换为字典，便于JSON序列化。
        对UUID字段进行字符串转换，对日期时间字段使用ISO格式。

        Returns:
            dict: 包含表信息的字典
        """
        return {
            "id": self.id,
            "tenant_id": str(self.tenant_id),  # StringUUID 转为字符串
            "created_by": str(self.created_by),  # StringUUID 转为字符串
            "name": self.name,
            "comment": self.comment,
            "database_id": self.database_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
