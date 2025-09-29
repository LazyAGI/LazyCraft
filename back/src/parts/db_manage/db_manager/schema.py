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

import re
import traceback
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import MetaData, Table, create_engine, func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.inspection import inspect

from .dialect import DialectAdapter
from .utils import (build_foreign_key_sql, determine_operation,
                    group_unique_list, parse_column_default_val,
                    union_of_dict_lists, unique_check)


def mysql_bool_to_int(val):
    """将各种布尔表达式转换为MySQL/TiDB兼容的整数值。

    专为MySQL/TiDB的tinyint/boolean字段设计，将各种形式的布尔值
    转换为1（真）或0（假），非布尔值原样返回。

    Args:
        val: 要转换的值，可以是布尔类型、字符串或数字

    Returns:
        int | Any: 布尔值转换为1或0，非布尔值原样返回
    """
    if val in (True, "true", "True", 1, "1"):
        return 1
    elif val in (False, "false", "False", 0, "0"):
        return 0
    elif isinstance(val, str) and val.lower() == "true":
        return 1
    elif isinstance(val, str) and val.lower() == "false":
        return 0
    return val


class DbManager:

    def __init__(self, config):
        """初始化数据库管理器。

        Args:
            config (dict): 数据库连接配置，包含endpoint等信息
        """
        self.config = config

    def get_engine(self, db_name: str = None) -> "Engine":
        """获取数据库引擎。

        根据配置创建数据库引擎连接，支持MySQL、PostgreSQL、TiDB、达梦等数据库。

        Args:
            db_name (str, optional): 数据库名称，如果为None则连接到默认数据库

        Returns:
            Engine: SQLAlchemy数据库引擎对象
        """
        endpoint = self.config["endpoint"]
        if endpoint.lower().startswith("dm"):  # 假设达梦的连接字符串包含 "dm"
            url = f"{endpoint}{db_name}" if db_name else endpoint
            # 达梦需要特定的驱动，例如 'dm' 或 'pydm'
            return create_engine(url, connect_args={"charset": "utf8"})
        url = f"{endpoint}{db_name}" if db_name else endpoint
        return create_engine(url)

    def create_database(self, db_name: str, comment: str) -> (bool, str):
        """创建数据库并添加注释。

        在数据库服务器中创建新数据库，并根据数据库类型添加相应的注释。
        支持PostgreSQL的COMMENT ON DATABASE语法。

        Args:
            db_name (str): 数据库名称
            comment (str): 数据库注释，长度不能超过50个字符

        Returns:
            tuple[bool, str]: (是否成功, 消息描述)

        Raises:
            Exception: 当注释长度超过50个字符时抛出
        """
        if not db_name or not comment:
            return False, "Database name and comment cannot be empty."
        if len(comment) > 50:
            raise Exception("数据库comment只能包含长度不大于50")
        engine = self.get_engine("")
        try:
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                conn.execute(text(f"CREATE DATABASE {db_name}"))

                # 根据数据库类型使用不同的注释语法
                dialect = engine.dialect.name.lower()
                if dialect == "postgresql":
                    # 仅 PostgreSQL 支持使用 COMMENT ON DATABASE 语法
                    conn.execute(text(f"COMMENT ON DATABASE {db_name} IS '{comment}'"))

            return True, f"Database '{db_name}' created successfully."
        except SQLAlchemyError as e:
            traceback.print_exc()
            return False, f"Error creating database: {str(e)}"

    def update_database(
        self, db_name: str, new_db_name: str, comment: str
    ) -> (bool, str):
        """更新数据库名称和注释。

        修改现有数据库的名称和注释信息。不同数据库系统有不同的支持程度：
        - PostgreSQL: 支持重命名和注释更新
        - SQL Server: 支持重命名
        - MySQL/TiDB: 不支持直接重命名

        Args:
            db_name (str): 当前数据库名称
            new_db_name (str): 新的数据库名称
            comment (str): 新的数据库注释，长度不能超过50个字符

        Returns:
            tuple[bool, str]: (是否成功, 消息描述)

        Raises:
            Exception: 当注释长度超过50个字符或数据库名称格式无效时抛出
        """
        if not db_name or not comment:
            return False, "Database name and comment cannot be empty."
        if len(comment) > 50:
            raise Exception("数据库comment只能包含长度不大于50")
        if not self.is_valid_name(db_name) or len(db_name) > 20:
            raise Exception(
                "数据库称只能包含 '[a-z][0-9]_' 等字符并以字母开头并且长度不大于20"
            )

        engine = self.get_engine("")
        try:
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                if db_name != new_db_name:
                    # 根据数据库类型使用不同的重命名语法
                    dialect = engine.dialect.name.lower()
                    if dialect == "postgresql":
                        # PostgreSQL 支持使用 ALTER DATABASE ... RENAME TO 语法重命名数据库
                        conn.execute(
                            text(f"ALTER DATABASE {db_name} RENAME TO {new_db_name}")
                        )
                    elif dialect == "mssql":
                        # SQL Server 支持使用 ALTER DATABASE ... MODIFY NAME 语法重命名数据库
                        conn.execute(
                            text(
                                f"ALTER DATABASE {db_name} MODIFY NAME = {new_db_name}"
                            )
                        )
                    else:
                        # MySQL/TiDB 不支持直接重命名数据库.
                        return False, f"Unsupported database type: {dialect}"

                # 根据数据库类型使用不同的注释语法
                dialect = engine.dialect.name.lower()
                if dialect == "postgresql":
                    # PostgreSQL 使用 COMMENT ON DATABASE 语法
                    conn.execute(
                        text(f"COMMENT ON DATABASE {new_db_name} IS '{comment}'")
                    )
                else:
                    return False, f"Unsupported database type: {dialect}"

            return True, f"Database '{db_name}' comment update successfully."
        except SQLAlchemyError as e:
            traceback.print_exc()
            return False, f"Error updating database: {str(e)}"

    def delete_database(self, db_name: str) -> (bool, str):
        """删除指定的数据库。

        从数据库服务器中删除指定的数据库。对于PostgreSQL，
        会先终止所有连接到该数据库的会话。

        Args:
            db_name (str): 要删除的数据库名称

        Returns:
            tuple[bool, str]: (是否成功, 消息描述)
        """
        if not db_name:
            return False, "Database id cannot be empty."
        engine = self.get_engine("")
        try:
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")

                # 根据数据库类型使用不同的语法
                dialect = engine.dialect.name.lower()
                if dialect == "postgresql":
                    # PostgreSQL 需要先终止连接到该数据库的会话
                    conn.execute(
                        text(
                            """SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :database_name AND pid <> pg_backend_pid()"""
                        ),
                        {"database_name": db_name},
                    )

                conn.execute(text(f"DROP DATABASE IF EXISTS {db_name}"))
            return True, f"Database '{db_name}' deleted successfully."
        except SQLAlchemyError as e:
            traceback.print_exc()
            return False, f"Error deleting database: {str(e)}"

    def get_all_databases(self) -> (bool, Any):
        """获取数据库服务器中的所有数据库列表。

        根据不同的数据库类型使用相应的系统表或命令获取数据库列表：
        - PostgreSQL: 使用pg_database系统表
        - MySQL/TiDB: 使用SHOW DATABASES命令

        Returns:
            tuple[bool, Any]: (是否成功, 数据库名称列表或错误消息)
        """
        engine = self.get_engine("")
        try:
            with engine.connect() as conn:
                # 根据数据库类型使用不同的语法
                dialect = engine.dialect.name.lower()
                if dialect == "postgresql":
                    # PostgreSQL 使用 pg_database 系统表
                    result = conn.execute(
                        text(
                            "SELECT datname FROM pg_database WHERE datistemplate = false"
                        )
                    )
                elif dialect in ["mysql", "tidb"]:
                    # MySQL/TiDB 使用 SHOW DATABASES 语法
                    result = conn.execute(text("SHOW DATABASES"))
                else:
                    return False, f"Unsupported database type: {dialect}"

                databases = [row[0] for row in result]
                return True, databases
        except SQLAlchemyError as e:
            traceback.print_exc()
            return False, f"Error retrieving databases: {str(e)}"

    def is_valid_name(self, s):
        """验证数据库或表名称是否符合命名规范。

        检查名称是否以字母开头，后面跟零个或多个字母、数字或下划线。

        Args:
            s (str): 要验证的名称

        Returns:
            bool: 名称是否有效
        """
        # 正则表达式：以字母开头，后面跟零个或多个字母、数字或下划线
        pattern = r"^[a-zA-Z][a-zA-Z0-9_]*$"
        return bool(re.fullmatch(pattern, s))

    def _has_primary_key_changed(
        self, existing_primary, new_primary_keys, existing_columns, new_columns
    ):
        """检查主键是否发生变化。

        比较现有主键和新主键定义，检查字段名和字段类型是否有变化。

        Args:
            existing_primary (dict): 现有主键定义，包含constrained_columns
            new_primary_keys (dict): 新主键字段字典
            existing_columns (list): 现有列定义列表
            new_columns (list): 新列定义列表

        Returns:
            bool: 主键是否发生变化
        """
        # 1. 比较字段名
        existing_pk_names = set(existing_primary["constrained_columns"])
        new_pk_names = set(new_primary_keys.keys())

        if existing_pk_names != new_pk_names:
            return True

        # 2. 比较字段类型
        for pk_name in existing_pk_names:
            # 找到现有字段和新字段的定义
            existing_col = next(
                (col for col in existing_columns if col["name"] == pk_name), None
            )
            new_col = next((col for col in new_columns if col["name"] == pk_name), None)

            if not existing_col or not new_col:
                return True

            # 比较类型
            if existing_col.get("type") != new_col.get("type"):
                return True

        return False

    def check_primary_key(self, primary_keys: dict, columns: list[dict]) -> bool:
        """验证主键定义的有效性。

        检查主键定义是否符合以下规则：
        1. 表必须有主键
        2. 主键字段不能为空
        3. 只能有一个主键
        4. 主键字段不能是TEXT类型

        Args:
            primary_keys (dict): 主键字段字典，键为字段名，值为是否可空
            columns (list[dict]): 列定义列表

        Returns:
            bool: 验证是否通过

        Raises:
            Exception: 当主键定义不符合规则时抛出
        """
        if len(primary_keys) == 0:
            raise Exception("表必须要有主键")
        elif any(v for v in primary_keys.values()):
            raise Exception("表主键不允许为空")
        elif len(primary_keys) != 1:
            raise Exception("表必须有且仅有一个主键")

        for col in columns:
            if col.get("is_primary_key") and col.get("type", "").lower() in ["text"]:
                raise Exception(f"主键字段 '{col['name']}' 不能是 {col['type']} 类型")

    def create_table_structure(
        self, db_name: str, table_name: str, comment: str, columns: list[dict]
    ) -> (bool, Any):
        """创建数据表结构。

        在指定数据库中创建新表，包括列定义、主键、外键、唯一约束和注释。
        支持不同数据库方言的特殊处理，如TiDB的非聚簇索引。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称
            comment (str): 表注释
            columns (list[dict]): 列定义列表，每个字典包含列的所有属性

        Returns:
            tuple[bool, Any]: (是否成功, 成功消息或错误信息)

        Raises:
            Exception: 当表已存在、名称无效或列定义有误时抛出
        """
        if db_name is None or db_name.strip() == "":
            return False, "数据库名不可以为空."
        if table_name is None or table_name.strip() == "":
            return False, "表名不可以为空."
        if comment is None or comment.strip() == "":
            return False, "表注释不可以为空."
        if columns is None or len(columns) == 0:
            return False, "列不可以为空."
        for col in columns:
            if col["type"] == "TEXT":
                if col["is_unique"]:
                    return False, "TEXT类型不可以为唯一."
                elif col["is_primary_key"]:
                    return False, "TEXT类型不可以为主键."
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        full_table_name = adapter.get_full_table_name(table_name)

        try:
            if table_name in self.get_all_tables(db_name):
                raise Exception(f"表 '{table_name}' 已存在")
            elif not self.is_valid_name(table_name):
                raise Exception("表名称只能包含 '[a-z][0-9]_' 等字符并以字母开头")
            if comment is None or comment.strip() == "":
                raise Exception("表注释不能为空")
            for c in columns:
                if not self.is_valid_name(c.get("name", "")):
                    raise Exception(
                        "表字段名称只能包含 '[a-z][0-9]_' 等字符并以字母开头"
                    )
            with engine.begin() as conn:
                sql_parts = [f"CREATE TABLE {full_table_name} ("]
                primary_keys = {
                    col["name"]: col.get("nullable", False)
                    for col in columns
                    if col.get("is_primary_key", False)
                }
                self.check_primary_key(primary_keys, columns)
                foreign_key_infos = [
                    col["foreign_key_info"]
                    for col in columns
                    if col.get("foreign_key_info")
                ]
                unique_keys = [
                    {"column_name": col["name"], "name": col.get("unique_group")}
                    for col in columns
                    if col.get("is_unique", False)
                    and not col.get("is_primary_key", False)
                ]

                for column in columns:
                    sql_parts.append(f"{adapter.format_column_definition(column)},")
                if (
                    primary_keys and adapter.dialect != "dm"
                ):  # 达梦的主键在 IDENTITY 中已隐含
                    if adapter.dialect == "tidb":
                        # TiDB中避免使用聚簇索引，不在这里定义PRIMARY KEY
                        # 主键将在表创建后通过ALTER TABLE添加，这样会创建非聚簇索引
                        pass
                    else:
                        # 其他数据库正常添加PRIMARY KEY
                        sql_parts.append(
                            f"PRIMARY KEY ({', '.join(primary_keys.keys())}),"
                        )
                sql_parts[-1] = sql_parts[-1].rstrip(",")
                sql_parts.append(")")
                conn.execute(text("".join(sql_parts)))

                # 根据数据库类型使用不同的表注释语法
                dialect = adapter.dialect
                if dialect == "postgresql":
                    # PostgreSQL 使用 COMMENT ON TABLE 语法
                    conn.execute(text(f"COMMENT ON TABLE {table_name} IS '{comment}'"))
                elif dialect in ["mysql", "tidb"]:
                    conn.execute(
                        text(f"ALTER TABLE {full_table_name} COMMENT = '{comment}'")
                    )
                else:
                    return False, f"Unsupported database type: {dialect}"

                for column in columns:
                    if comment_sql := adapter.get_comment_sql(table_name, column):
                        conn.execute(text(comment_sql))

                for sql in build_foreign_key_sql(
                    adapter, table_name, foreign_key_infos
                ):
                    conn.execute(text(sql))

                for gu in group_unique_list(unique_keys):
                    key_name = f"{table_name}_{'_'.join(gu['column_names'])}_uniq"
                    # 先尝试删除已存在的同名唯一约束
                    try:
                        if adapter.dialect in ["mysql", "tidb"]:
                            # MySQL/TiDB 使用 DROP INDEX
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP INDEX {key_name}"
                                )
                            )
                        else:
                            # PostgreSQL 使用 DROP CONSTRAINT
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP CONSTRAINT {key_name}"
                                )
                            )
                    except Exception as e:
                        # 如果删除失败（可能约束不存在），继续执行
                        print(f"删除唯一约束 {key_name} 失败（可能不存在）: {e}")
                        pass

                    # 添加新的唯一约束
                    conn.execute(
                        text(
                            f"ALTER TABLE {full_table_name} ADD CONSTRAINT {key_name} UNIQUE ({', '.join(gu['column_names'])})"
                        )
                    )

                # 如果是TiDB且有主键，在表创建后添加非聚簇索引的主键
                if adapter.dialect == "tidb" and primary_keys:
                    conn.execute(
                        text(
                            f"ALTER TABLE {full_table_name} ADD CONSTRAINT {table_name}_pkey PRIMARY KEY ({', '.join(primary_keys.keys())})"
                        )
                    )

            return (
                True,
                f"Table {table_name} in database {db_name} created successfully.",
            )
        except Exception as e:
            traceback.print_exc()
            return False, str(e)

    def edit_table_structure(
        self, db_name: str, old_table_name: str, table_name: str, columns: list[dict]
    ) -> (bool, Any):
        """编辑表结构。

        修改现有表的结构，包括添加、删除、修改列，以及更新主键、外键、唯一约束。
        操作前会创建备份表以防数据丢失。

        Args:
            db_name (str): 数据库名称
            old_table_name (str): 原表名称
            table_name (str): 新表名称（可以与原表名相同）
            columns (list[dict]): 新的列定义列表

        Returns:
            tuple[bool, Any]: (是否成功, 成功消息或错误信息)

        Raises:
            Exception: 当表名无效、列定义有误或操作失败时抛出
        """
        if db_name is None or db_name.strip() == "":
            return False, "数据库名不可以为空."
        if table_name is None or table_name.strip() == "":
            return False, "表名不可以为空."
        if columns is None or len(columns) == 0:
            return False, "列不可以为空."
        for col in columns:
            if col["type"] == "TEXT":
                if col["is_unique"]:
                    return False, "TEXT类型不可以为唯一."
                elif col["is_primary_key"]:
                    return False, "TEXT类型不可以为主键."
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        full_table_name = adapter.get_full_table_name(old_table_name)
        try:
            if not self.is_valid_name(table_name):
                raise Exception("表名称只能包含 '[a-z][0-9]_' 等字符并以字母开头")
            for c in columns:
                if not self.is_valid_name(c.get("name", "")):
                    raise Exception(
                        "表字段名称只能包含 '[a-z][0-9]_' 等字符并以字母开头"
                    )
            with engine.begin() as conn:
                backup_table_name = f"{old_table_name}_backup"
                # 先删除已存在的备份表
                conn.execute(
                    text(
                        f"DROP TABLE IF EXISTS {adapter.get_full_table_name(backup_table_name)}"
                    )
                )
                # 使用适配器方法创建备份表
                backup_create_sql = adapter.create_backup_table_sql(
                    old_table_name, backup_table_name
                )
                conn.execute(text(backup_create_sql))

                # 如果是TiDB，需要单独复制数据
                if adapter.dialect == "tidb":
                    copy_data_sql = adapter.copy_data_to_backup_sql(
                        old_table_name, backup_table_name
                    )
                    if copy_data_sql:
                        conn.execute(text(copy_data_sql))

                existing_columns = self.get_table_structure(db_name, old_table_name)[
                    "columns"
                ]
                existing_primary = self.get_primary_keys(db_name, old_table_name) or {
                    "constrained_columns": [],
                    "name": None,
                }
                existing_foreign = self.get_foreign_keys(db_name, old_table_name)
                existing_unique = self.get_unique_keys(db_name, old_table_name)

                primary_keys = {
                    col["name"]: col.get("nullable", False)
                    for col in columns
                    if col.get("is_primary_key", False)
                }
                self.check_primary_key(primary_keys, columns)
                foreign_key_infos = [
                    col["foreign_key_info"]
                    for col in columns
                    if col.get("foreign_key_info")
                ]
                unique_keys = [
                    {"column_name": col["name"], "name": col.get("unique_group")}
                    for col in columns
                    if col.get("is_unique", False)
                    and not col.get("is_primary_key", False)
                ]

                alter_sqls = []
                all_columns = union_of_dict_lists(columns, existing_columns, "name")
                for column in all_columns:
                    op = determine_operation(existing_columns, columns, column)
                    if op == "add":
                        alter_sqls.append(
                            f"ALTER TABLE {full_table_name} ADD {adapter.format_column_definition(column)}".rstrip(
                                ","
                            )
                        )
                        if comment_sql := adapter.get_comment_sql(
                            old_table_name, column
                        ):
                            alter_sqls.append(comment_sql)
                    elif op == "del":
                        alter_sqls.append(
                            f"ALTER TABLE {full_table_name} DROP COLUMN {column['name']}"
                        )
                    elif op == "modify":
                        # 使用适配器方法生成修改列的SQL
                        modify_sql = adapter.modify_column_sql(old_table_name, column)
                        if isinstance(modify_sql, list):
                            # PostgreSQL返回SQL列表
                            alter_sqls.extend(modify_sql)
                        else:
                            # MySQL/TiDB返回单个SQL字符串
                            alter_sqls.append(modify_sql)
                        if comment_sql := adapter.get_comment_sql(
                            old_table_name, column
                        ):
                            alter_sqls.append(comment_sql)
                can_add_primary = False
                if existing_primary:
                    # 判断主键发生变化
                    print(
                        existing_primary["constrained_columns"],
                        "+++++++",
                        primary_keys.keys(),
                    )
                    if self._has_primary_key_changed(
                        existing_primary, primary_keys, existing_columns, columns
                    ):
                        try:
                            # 尝试删除现有主键
                            if existing_primary["name"]:
                                conn.execute(
                                    text(
                                        f"ALTER TABLE {full_table_name} DROP CONSTRAINT {existing_primary['name']}"
                                    )
                                )
                            else:
                                # 如果没有主键名，尝试使用PRIMARY KEY关键字删除
                                conn.execute(
                                    text(
                                        f"ALTER TABLE {full_table_name} DROP PRIMARY KEY"
                                    )
                                )
                            can_add_primary = True
                        except Exception as e:
                            # 如果是TiDB聚簇索引错误，需要特殊处理
                            if (
                                "clustered index" in str(e).lower()
                                and adapter.dialect == "tidb"
                            ):
                                # 对于TiDB聚簇索引，我们跳过主键删除，只处理列修改
                                can_add_primary = False
                            else:
                                # 如果删除失败，尝试使用PRIMARY KEY关键字删除
                                try:
                                    conn.execute(
                                        text(
                                            f"ALTER TABLE {full_table_name} DROP PRIMARY KEY"
                                        )
                                    )
                                    can_add_primary = True
                                except Exception:
                                    # 如果还是失败，跳过主键处理
                                    can_add_primary = False
                    # 如果主键没有变化，can_add_primary保持False，不添加主键、
                else:
                    can_add_primary = True
                if existing_foreign:
                    keys = set([i["foreign_key_name"] for i in existing_foreign])
                    for fk in keys:
                        if adapter.dialect in ["mysql", "tidb"]:
                            # MySQL/TiDB 使用 DROP INDEX
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP FOREIGN KEY {fk}"
                                )
                            )
                        else:
                            # PostgreSQL 使用 DROP CONSTRAINT
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP CONSTRAINT {fk}"
                                )
                            )
                for uk in existing_unique:
                    conn.execute(
                        text(
                            f"ALTER TABLE {full_table_name} DROP CONSTRAINT {uk['name']}"
                        )
                    )
                for sql in alter_sqls:
                    conn.execute(text(sql))
                if (
                    primary_keys and adapter.dialect != "dm" and can_add_primary
                ):  # 达梦的主键通过 IDENTITY 已处理
                    conn.execute(
                        text(
                            f"ALTER TABLE {full_table_name} ADD CONSTRAINT {old_table_name}_pkey PRIMARY KEY ({', '.join(primary_keys.keys())})"
                        )
                    )
                for sql in build_foreign_key_sql(
                    adapter, old_table_name, foreign_key_infos
                ):
                    conn.execute(text(sql))
                if existing_unique:
                    # 删除已经不用的唯一约束
                    for item in existing_unique:
                        key_name = item["name"]
                        unique_key_is_using = False
                        for gu in group_unique_list(unique_keys):
                            key_name2 = (
                                f"{table_name}_{'_'.join(gu['column_names'])}_uniq"
                            )
                            if key_name == key_name2:
                                unique_key_is_using = True
                        if not unique_key_is_using:
                            if adapter.dialect in ["mysql", "tidb"]:
                                # MySQL/TiDB 使用 DROP INDEX
                                conn.execute(
                                    text(
                                        f"ALTER TABLE {full_table_name} DROP INDEX {key_name}"
                                    )
                                )
                            else:
                                # PostgreSQL 使用 DROP CONSTRAINT
                                conn.execute(
                                    text(
                                        f"ALTER TABLE {full_table_name} DROP CONSTRAINT {key_name}"
                                    )
                                )
                for gu in group_unique_list(unique_keys):
                    key_name = f"{table_name}_{'_'.join(gu['column_names'])}_uniq"
                    # 先尝试删除已存在的同名唯一约束
                    try:
                        if adapter.dialect in ["mysql", "tidb"]:
                            # MySQL/TiDB 使用 DROP INDEX
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP INDEX {key_name}"
                                )
                            )
                        else:
                            # PostgreSQL 使用 DROP CONSTRAINT
                            conn.execute(
                                text(
                                    f"ALTER TABLE {full_table_name} DROP CONSTRAINT {key_name}"
                                )
                            )
                    except Exception as e:
                        # 如果删除失败（可能约束不存在），继续执行
                        print(f"删除唯一约束 {key_name} 失败（可能不存在）: {e}")
                        pass

                    # 添加新的唯一约束
                    conn.execute(
                        text(
                            f"ALTER TABLE {full_table_name} ADD CONSTRAINT {key_name} UNIQUE ({', '.join(gu['column_names'])})"
                        )
                    )

                conn.execute(
                    text(f"DROP TABLE {adapter.get_full_table_name(backup_table_name)}")
                )
                if old_table_name != table_name:
                    conn.execute(
                        text(f"alter table {full_table_name} rename to {table_name}")
                    )
            return True, f"更新表 {old_table_name} 成功"
        except Exception as e:
            traceback.print_exc()
            return False, f"更新表 {old_table_name} 失败 {str(e)}"

    def delete_table(self, db_name: str, table_name: str) -> (bool, Any):
        """删除指定的数据表。

        从指定数据库中删除表，如果表不存在则不会报错。
        会检查外键依赖关系，如果存在外键依赖则返回友好的错误信息。

        Args:
            db_name (str): 数据库名称
            table_name (str): 要删除的表名

        Returns:
            tuple[bool, Any]: (是否成功, 成功消息或错误信息)
        """
        if not all([db_name, table_name]):
            return False, "Database name and table name cannot be empty."

        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        f"DROP TABLE IF EXISTS {adapter.get_full_table_name(table_name)}"
                    )
                )
            return (
                True,
                f"Table '{table_name}' in database '{db_name}' deleted successfully.",
            )
        except SQLAlchemyError as e:
            traceback.print_exc()
            error_msg = str(e)
            match = re.search(
                r"constraint\s+(\S+)\s+on table (\S+)\s+depends on table (\S+)",
                error_msg,
            )
            if match:
                dep_table = match.group(2)
                target_table = match.group(3)
                return (
                    False,
                    f"表 {dep_table} 存在外键依赖于表 {target_table}，无法删除。",
                )
            return False, error_msg

    def get_all_tables(self, db_name: str) -> list:
        """获取指定数据库中的所有表名。

        使用SQLAlchemy的inspector查询数据库中的所有表。

        Args:
            db_name (str): 数据库名称

        Returns:
            list: 表名列表
        """

        engine = self.get_engine(db_name)
        # 创建 inspector 对象
        inspector = inspect(engine)
        # 获取所有表名
        table_names = inspector.get_table_names()

        return table_names

    def get_table_structure(self, db_name: str, table_name: str) -> Any:
        """获取指定表的完整结构信息。

        获取表的列定义、主键、外键、唯一约束、注释等完整结构信息，
        并进行数据类型转换和格式化。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            dict: 包含表结构信息的字典，包含table_name、comment、columns等字段

        Raises:
            Exception: 当获取表结构失败时抛出
        """
        if not db_name or not table_name:
            return False
        table_name = table_name.lower()
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        try:
            with engine.connect() as conn:
                inspector = inspect(conn)
                columns = inspector.get_columns(table_name, schema=adapter.schema)
                primary_keys = inspector.get_pk_constraint(
                    table_name, schema=adapter.schema
                )["constrained_columns"]
                unique_keys = inspector.get_unique_constraints(
                    table_name, schema=adapter.schema
                )
                inspector.get_foreign_keys(table_name, schema=adapter.schema)
                table_comment = inspector.get_table_comment(
                    table_name, schema=adapter.schema
                ).get("text", "")
                foreign_key_dict = {
                    fk["constrained_column"]: {
                        "constrained_column": fk["constrained_column"],
                        "referred_table": fk["referred_table"],
                        "referred_columns": fk["referred_column"],
                    }
                    for fk in self.get_foreign_keys(db_name, table_name)
                }

                table_info = {
                    "table_name": table_name,
                    "comment": table_comment or "",
                    "columns": [
                        {
                            "name": col["name"],
                            "type": str(
                                self.data_type_transform(str(col["type"]), engine)
                            ),
                            "data_type": str(
                                self.data_type_transform(str(col["type"]), engine)
                            ),
                            "nullable": (
                                False
                                if col["name"] in primary_keys
                                else col["nullable"]
                            ),
                            "default": parse_column_default_val(
                                col["type"], col["default"]
                            ),
                            "comment": col["comment"] or "",
                            "is_unique": unique_check(col["name"], unique_keys)[
                                "is_unique"
                            ]
                            or col["name"] in primary_keys,
                            "unique_group": (
                                "primary_pk"
                                if col["name"] in primary_keys
                                else unique_check(col["name"], unique_keys)["name"]
                            ),
                            "is_primary_key": col["name"] in primary_keys,
                            "is_foreign_key": col["name"] in foreign_key_dict,
                            "foreign_key_info": foreign_key_dict.get(col["name"]),
                        }
                        for col in columns
                    ],
                }
                return table_info
        except Exception as e:
            traceback.print_exc()
            raise e

    def data_type_transform(self, data_type: str, db_engine=None):
        """数据类型转换方法。

        根据数据库类型自动选择正确的映射规则，将原始数据类型
        转换为统一的通用数据类型。

        Args:
            data_type (str): 数据库原始数据类型
            db_engine (Engine, optional): 数据库引擎，用于检测数据库类型

        Returns:
            str: 转换后的通用数据类型名称
        """
        # 如果没有提供引擎，默认使用PostgreSQL映射（向后兼容）
        if db_engine is None:
            return self._postgresql_data_type_transform(data_type)

        # 根据数据库类型选择对应的映射方法
        dialect = db_engine.dialect.name.lower()

        if dialect in ["mysql", "tidb"]:
            return self._mysql_data_type_transform(data_type)
        elif dialect == "postgresql":
            return self._postgresql_data_type_transform(data_type)
        else:
            # 对于其他数据库类型，默认使用PostgreSQL映射
            return self._postgresql_data_type_transform(data_type)

    def _postgresql_data_type_transform(self, postgresql_type: str):
        """PostgreSQL数据类型转换。

        将PostgreSQL特有的数据类型转换为通用的数据类型标识。

        Args:
            postgresql_type (str): PostgreSQL数据类型名称

        Returns:
            str: 转换后的通用数据类型，未知类型返回"Unknown"
        """
        # PostgreSQL 数据类型到 commonDBTypes 的映射规则
        postgresql_type_mapping = {
            # 整数类型
            "int": "Integer",
            "int2": "Integer",
            "int4": "Integer",
            "int8": "Integer",
            "smallint": "Integer",
            "bigint": "Integer",
            "integer": "Integer",
            # 浮点数类型
            "float4": "Float",
            "float8": "Float",
            "numeric": "Float",
            "decimal": "Float",
            "boolean": "Boolean",
            # 文本类型
            "text": "Text",
            "varchar": "Text",
            "char": "Text",
            # 布尔类型
            "bool": "Boolean",
            # 日期时间类型
            "timestamp": "DateTime",
            "timestamptz": "DateTime",
            "date": "Date",
            "time": "Time",
            "timetz": "Time",
            # 二进制类型
            "bytea": "LargeBinary",
            # JSON 类型
            "json": "JSON",
            "jsonb": "JSON",
        }

        return postgresql_type_mapping.get(postgresql_type.lower(), "Unknown")

    def _mysql_data_type_transform(self, mysql_type: str):
        """MySQL数据类型转换。

        将MySQL/TiDB特有的数据类型转换为通用的数据类型标识。

        Args:
            mysql_type (str): MySQL数据类型名称

        Returns:
            str: 转换后的通用数据类型，未知类型返回"Unknown"
        """
        # MySQL 数据类型到 commonDBTypes 的映射规则
        mysql_type_mapping = {
            # 整数类型
            "tinyint": "BOOLEAN",
            "smallint": "INT",
            "mediumint": "INT",
            "int": "INT",
            "integer": "INTEGER",
            "bigint": "BIGINT",
            # 浮点数类型
            "float": "FLOAT",
            "double": "FLOAT",
            "decimal": "NUMERIC",
            "numeric": "NUMERIC",
            "real": "FLOAT",
            # 布尔类型
            "boolean": "BOOLEAN",
            "bool": "BOOLEAN",
            "bit": "BOOLEAN",
            # 文本类型
            "char": "TEXT",
            "varchar": "VARCHAR",
            "tinytext": "TEXT",
            "text": "TEXT",
            "mediumtext": "TEXT",
            "longtext": "TEXT",
            # 日期时间类型
            "date": "DATE",
            "time": "TIME",
            "datetime": "DATETIME",
            "timestamp": "TIMESTAMP",
            "year": "INT",  # YEAR类型映射为INT
            # 二进制类型
            "tinyblob": "LARGEBINARY",
            "blob": "LARGEBINARY",
            "mediumblob": "LARGEBINARY",
            "longblob": "LARGEBINARY",
            "binary": "LARGEBINARY",
            "varbinary": "LARGEBINARY",
            # JSON 类型
            "json": "JSON",
            # 其他类型
            "enum": "TEXT",
            "set": "TEXT",
            "geometry": "TEXT",
            "point": "TEXT",
            "linestring": "TEXT",
            "polygon": "TEXT",
            "multipoint": "TEXT",
            "multilinestring": "TEXT",
            "multipolygon": "TEXT",
            "geometrycollection": "TEXT",
        }

        # 提取基本类型名（去除括号及内容），如 "varchar(191)" -> "varchar"
        base_type = re.match(r"^\w+", mysql_type.lower())
        base_type_str = base_type.group(0) if base_type else mysql_type.lower()

        # 查找映射
        common_type = mysql_type_mapping.get(base_type_str)

        if common_type is None:
            print(
                f"[未识别的 MySQL 类型] 原始类型: '{mysql_type}'，基础类型: '{base_type_str}'"
            )
            return "UNKNOWN"

        return common_type

    # 保持向后兼容的方法名
    def mysql_data_type_transform(self, mysql_type: str):
        """保持向后兼容的MySQL数据类型转换方法。

        Args:
            mysql_type (str): MySQL数据类型名称

        Returns:
            str: 转换后的通用数据类型
        """
        return self._mysql_data_type_transform(mysql_type)

    def get_primary_keys(self, db_name: str, table_name: str) -> dict[str, Any]:
        """获取指定表的主键信息。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            dict[str, Any]: 主键约束信息字典，如果没有主键则返回None
        """
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        with engine.connect() as conn:
            inspector = inspect(conn)
            pk = inspector.get_pk_constraint(table_name, schema=adapter.schema)
            return pk if pk else None

    def get_unique_keys(self, db_name: str, table_name: str) -> list[dict]:
        """获取指定表的唯一键约束信息。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            list[dict]: 唯一键约束信息列表
        """
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        with engine.connect() as conn:
            inspector = inspect(conn)
            return inspector.get_unique_constraints(table_name, schema=adapter.schema)

    def get_foreign_keys(self, db_name: str, table_name: str) -> list[dict]:
        """获取指定表的外键约束信息。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            list[dict]: 外键约束信息列表，每个字典包含外键名、引用表、约束列、引用列
        """
        engine = self.get_engine(db_name)
        adapter = DialectAdapter(engine)
        with engine.connect() as conn:
            inspector = inspect(conn)
            foreign_keys = inspector.get_foreign_keys(table_name, schema=adapter.schema)
            return [
                {
                    "foreign_key_name": fk["name"],
                    "referred_table": fk["referred_table"],
                    "constrained_column": local_col,
                    "referred_column": ref_col,
                }
                for fk in foreign_keys
                for local_col, ref_col in zip(
                    fk["constrained_columns"], fk["referred_columns"]
                )
            ]

    def build_insert_data(self, table_name, table_columns, columns, data):
        """构建插入数据的SQL语句和参数。

        根据表结构和数据构建INSERT语句，自动处理布尔类型转换。

        Args:
            table_name (str): 表名
            table_columns (list): 表列定义，可以是字典列表或字符串列表
            columns (list): 要插入的列名列表
            data (dict): 要插入的数据字典

        Returns:
            tuple: (SQL语句, 处理后的数据字典)
        """
        # 兼容table_columns为结构体列表或字段名列表
        table_column_names = (
            [col["name"] for col in table_columns]
            if table_columns and isinstance(table_columns[0], dict)
            else table_columns
        )
        columns = [c for c in columns if c in table_column_names]
        placeholders = ", ".join([":" + col for col in columns])
        sql = f"INSERT INTO {table_name} ({','.join(columns)}) VALUES ({placeholders})"
        # 获取字段类型映射（字段名->类型），table_columns可以是结构体或字符串
        type_map = {}
        if (
            isinstance(table_columns, list)
            and table_columns
            and isinstance(table_columns[0], dict)
        ):
            # table_columns为结构体列表
            for col in table_columns:
                type_map[col["name"]] = str(col.get("type", "")).upper()
        elif isinstance(table_columns, list):
            # table_columns为字段名列表
            pass
        # 构建数据，自动处理布尔类型
        data_res = {}
        for k, v in data.items():
            if k in columns:
                col_type = type_map.get(k, "")
                if col_type in ("TINYINT", "BOOLEAN", "BOOL"):
                    data_res[k] = mysql_bool_to_int(v)
                else:
                    data_res[k] = v
        return sql, data_res

    def build_update_data(
        self, table_name, table_columns, columns, data, condition_columns
    ):
        """构建更新数据的SQL语句和参数。

        根据表结构、更新数据和条件构建UPDATE语句，自动处理布尔类型转换。

        Args:
            table_name (str): 表名
            table_columns (list): 表列定义，可以是字典列表或字符串列表
            columns (list): 要更新的列名列表
            data (dict): 更新数据字典
            condition_columns (dict): 更新条件字典

        Returns:
            tuple: (SQL语句, 处理后的数据字典)
        """
        # 兼容table_columns为结构体列表或字段名列表
        table_column_names = (
            [col["name"] for col in table_columns]
            if table_columns and isinstance(table_columns[0], dict)
            else table_columns
        )
        columns = [c for c in columns if c in table_column_names]

        # 获取字段类型映射（字段名->类型），table_columns可以是结构体或字符串
        type_map = {}
        if (
            isinstance(table_columns, list)
            and table_columns
            and isinstance(table_columns[0], dict)
        ):
            for col in table_columns:
                type_map[col["name"]] = str(col.get("type", "")).upper()
        elif isinstance(table_columns, list):
            pass

        # condition_columns 现在是一个字典，提取条件字段
        if not isinstance(condition_columns, dict):
            return "", {}  # 如果 condition_columns 不是字典，返回空

        valid_condition_columns = [
            c for c in condition_columns.keys() if c in table_column_names
        ]

        # 分离更新字段（从 columns 中排除条件字段）
        update_columns = [c for c in columns if c in table_column_names]

        # 如果没有更新字段或条件字段，返回空
        if not update_columns or not valid_condition_columns:
            return "", {}

        # 构建 SET 子句：column1 = :column1, column2 = :column2
        set_clause = ", ".join([f"{col} = :new_{col}" for col in update_columns])

        # 构建 WHERE 子句：condition_column1 = :condition_column1
        where_clause = " AND ".join(
            [f"{col} = :{col}" for col in valid_condition_columns]
        )

        # 完整 SQL
        sql = f"UPDATE {table_name} SET {set_clause} WHERE {where_clause}"

        # 合并数据：更新字段来自 data，条件字段来自 condition_columns
        data_res = {}
        for k in update_columns:
            v = data.get(k)
            col_type = type_map.get(k, "")
            if col_type in ("TINYINT", "BOOLEAN", "BOOL"):
                data_res["new_" + k] = mysql_bool_to_int(v)
            else:
                data_res["new_" + k] = v
        for k in valid_condition_columns:
            data_res[k] = condition_columns[k]

        return sql, data_res

    def build_delete_data(self, table_name, table_columns, condition_columns):
        """构建删除数据的SQL语句和参数。

        根据表结构和条件构建DELETE语句。

        Args:
            table_name (str): 表名
            table_columns (list): 表列名列表
            condition_columns (dict): 删除条件字典

        Returns:
            tuple: (SQL语句, 条件数据字典)
        """

        # condition_columns 现在是一个字典，提取条件字段
        if not isinstance(condition_columns, dict):
            return "", {}  # 如果 condition_columns 不是字典，返回空

        valid_condition_columns = [
            c for c in condition_columns.keys() if c in table_columns
        ]

        # 如果没有条件字段，返回空
        if not valid_condition_columns:
            return "", {}

        # 构建 WHERE 子句：condition_column1 = :condition_column1
        where_clause = " AND ".join(
            [f"{col} = :{col}" for col in valid_condition_columns]
        )

        # 完整 SQL
        sql = f"DELETE FROM {table_name} WHERE {where_clause}"

        # 数据直接从 condition_columns 中取，因为删除只依赖条件
        data_res = {
            k: v for k, v in condition_columns.items() if k in valid_condition_columns
        }

        return sql, data_res

    def build_table_def(self, db_name, table_name):
        """构建SQLAlchemy表定义对象。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            Table: SQLAlchemy表对象
        """
        engine = self.get_engine(db_name)
        metadata = MetaData()
        users_table = Table(table_name, metadata, autoload_with=engine)
        return users_table

    def select_table_data(self, db_name, table_name, page, limit):
        """分页查询表数据。

        查询指定表的数据并进行分页处理，自动转换特殊数据类型。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称
            page (int): 页码（从1开始）
            limit (int): 每页数量

        Returns:
            dict: 包含分页信息的字典，包含data、total、page、per_page、total_pages字段
        """
        engine = self.get_engine(db_name)
        table = self.build_table_def(db_name, table_name=table_name)
        # 获取字段类型映射
        inspector = inspect(engine)
        columns_info = inspector.get_columns(table_name)
        type_map = {col["name"]: str(col["type"]).upper() for col in columns_info}
        with engine.connect() as conn:
            total_query = select(func.count()).select_from(table)
            total = conn.execute(total_query).scalar()

            # 计算偏移量和限制
            offset = (page - 1) * limit  # 从 0 开始计算偏移
            if offset < 0:
                offset = 0  # 防止负数

            # 构建分页查询
            paginated_query = select(table).offset(offset).limit(limit)
            result = conn.execute(paginated_query).mappings().fetchall()

            # 将结果转换为字典列表
            rows = [dict(row) for row in result]
            for row in rows:
                for k, v in row.items():
                    if type_map.get(k) == "TINYINT":
                        # 判断是否为boolean类型（前端定义）。tinyint默认为为boolean.
                        row[k] = (
                            True
                            if v in (1, "1", True)
                            else False if v in (0, "0", False) else v
                        )
                    elif isinstance(v, datetime):
                        row[k] = v.strftime("%Y-%m-%d %H:%M:%S")  # 日期时间格式化
                    elif isinstance(v, Decimal):
                        row[k] = float(v)  # Decimal 转为 float
                    elif isinstance(v, bytes):
                        row[k] = v.decode("utf-8", errors="replace")  # bytes 转为字符串
                    elif isinstance(v, uuid.UUID):
                        row[k] = str(v)  # UUID 转为字符串
                    elif v is None:
                        row[k] = None  # 显式处理 None
                        # 可扩展其他类型，例如自定义对象
                    elif not isinstance(v, (str, int, float, bool, list, dict)):
                        row[k] = str(v)  # 默认转为字符串
            # 计算总页数
            total_pages = (total + limit - 1) // limit if total > 0 else 1

            # 构造分页对象
            pagination = {
                "data": rows,  # 当前页数据
                "total": total,  # 总行数
                "page": page,  # 当前页码
                "per_page": limit,  # 每页数量
                "total_pages": total_pages,  # 总页数
            }
            return pagination

    def get_table_row_count(self, db_name: str, table_name: str) -> int:
        """获取表的行数统计。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            int: 表的行数，出错时返回-1
        """
        engine = self.get_engine(db_name)
        try:
            with engine.connect() as conn:
                query = text(f"SELECT COUNT(*) AS total_rows FROM {table_name}")
                result = conn.execute(query)
                total_rows = result.scalar()  # 获取单值
                return total_rows
        except SQLAlchemyError as e:
            print(f"Error querying row count: {e}")
            return -1

    def get_table_size(self, db_name, table_name):
        """获取表的存储大小。

        根据不同数据库类型使用相应的方法获取表的存储大小（包括数据和索引）。

        Args:
            db_name (str): 数据库名称
            table_name (str): 表名称

        Returns:
            int: 表的存储大小（字节），出错时返回0
        """
        engine = self.get_engine(db_name)
        try:
            with engine.connect() as conn:
                # 根据数据库类型使用不同的语法
                dialect = engine.dialect.name.lower()
                if dialect == "postgresql":
                    # PostgreSQL 使用 pg_total_relation_size 函数
                    query = text(f"SELECT pg_total_relation_size('{table_name}');")
                elif dialect in ["mysql", "tidb"]:
                    # MySQL/TiDB 使用 information_schema 查询表大小
                    query = text(
                        f"""
                        SELECT 
                            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size_MB'
                        FROM information_schema.tables 
                        WHERE table_schema = DATABASE() 
                        AND table_name = '{table_name}'
                    """
                    )
                else:
                    print(f"Unsupported dialect '{dialect}'")
                    return 0

                result = conn.execute(query)
                if dialect in ["mysql", "tidb"]:
                    # MySQL 返回的是 MB，需要转换为字节
                    size_mb = result.scalar()
                    return int(size_mb * 1024 * 1024) if size_mb else 0
                else:
                    # PostgreSQL 和其他数据库返回字节
                    total_bytes = result.scalar()
                    return total_bytes if total_bytes else 0
        except SQLAlchemyError as e:
            print(f"Error querying table bytes: {e}")
            return 0
