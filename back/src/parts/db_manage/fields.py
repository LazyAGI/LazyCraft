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

from marshmallow import Schema, fields


class Account(Schema):
    id = fields.String()
    name = fields.String()


class TableRowSchema(Schema):
    @classmethod
    def from_table(cls, table):
        """根据数据库表结构动态创建表行模式。

        Args:
            table: SQLAlchemy 表对象，包含列信息

        Returns:
            TableRowSchema: 根据表结构生成的模式实例
        """
        fields_dict = {col.name: fields.Raw() for col in table.columns}
        return cls.from_dict(fields_dict)()


schema_cache = {}


class DyPaginationSchema(Schema):
    page = fields.Integer()
    limit = fields.Integer(attribute="per_page")  # 使用 per_page 映射为 limit
    total = fields.Integer()
    has_more = fields.Boolean(attribute="has_next")  # 使用 has_next 映射为 has_more
    data = fields.List(fields.Nested(TableRowSchema), attribute="items")

    @classmethod
    def from_table(cls, table):
        """根据数据库表结构创建动态分页模式。

        为指定的数据库表创建带缓存的分页序列化模式。
        使用表名作为缓存键，避免重复创建相同的模式。

        Args:
            table: SQLAlchemy 表对象，包含表名和列信息

        Returns:
            DyPaginationSchema: 针对该表的分页模式实例
        """
        table_name = table.name
        if table_name not in schema_cache:
            table_row_schema = TableRowSchema.from_table(table)
            fields_dict = {
                "page": fields.Integer(),
                "limit": fields.Integer(attribute="per_page"),
                "total": fields.Integer(),
                "has_more": fields.Boolean(attribute="has_next"),
                "data": fields.List(fields.Nested(table_row_schema), attribute="items"),
            }
            schema_cache[table_name] = cls.from_dict(fields_dict)()
        return schema_cache[table_name]


# 定义 DataBaseInfo 的序列化字段
class DataBaseInfoSchema(Schema):
    id = fields.Integer()
    tenant_id = fields.String()  # StringUUID 会自动转为字符串
    created_by = fields.String()
    name = fields.String()
    database_name = fields.String()
    comment = fields.String()
    url = fields.String(allow_none=True)  # url 可以为 null
    type = fields.String()
    created_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")  # ISO 格式
    updated_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")
    created_by_account = fields.Nested(Account, attribute="created_by_account")
    table_count = fields.Integer()
    user_name = fields.String()


class TableInfoSchema(Schema):
    id = fields.Integer()
    tenant_id = fields.String()
    created_by = fields.String()
    name = fields.String()
    comment = fields.String()
    row_count = fields.Integer()
    created_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")  # ISO 格式
    updated_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")
    created_by_account = fields.Nested(Account, attribute="created_by_account")


# 定义分页数据的序列化格式
class PaginationSchema(Schema):
    page = fields.Integer()
    limit = fields.Integer(attribute="per_page")  # 使用 per_page 映射为 limit
    total = fields.Integer()
    has_more = fields.Boolean(attribute="has_next")  # 使用 has_next 映射为 has_more
    data = fields.List(fields.Nested(DataBaseInfoSchema), attribute="items")


class TablePaginationSchema(Schema):
    page = fields.Integer()
    limit = fields.Integer(attribute="per_page")  # 使用 per_page 映射为 limit
    total = fields.Integer()
    has_more = fields.Boolean(attribute="has_next")  # 使用 has_next 映射为 has_more
    data = fields.List(fields.Nested(TableInfoSchema), attribute="items")


# 实例化 schema 对象
pagination_schema = PaginationSchema()

table_pagination_schema = TablePaginationSchema()
