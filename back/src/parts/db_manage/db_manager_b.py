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

import copy
import json
import traceback
from collections import Counter, defaultdict

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.inspection import inspect

# 单独提取出 create_engine 的函数
db_config = {"endpoint": "postgresql://postgres:admin@localhost/"}


def get_engine(db_name):
    """获取数据库引擎连接。

    根据配置和数据库名称创建SQLAlchemy引擎实例。

    Args:
        db_name (str): 数据库名称，如果为空则连接到默认数据库

    Returns:
        Engine: SQLAlchemy数据库引擎对象
    """
    # 配置 PostgreSQL 连接，连接到模板数据库 template1
    if db_name:
        engine_url = db_config["endpoint"] + db_name
    else:
        engine_url = db_config["endpoint"]
    return create_engine(engine_url)


def create_db(db_name, comment):
    """创建数据库并添加注释。

    在PostgreSQL服务器中创建新数据库，并为其添加描述注释。
    使用事务管理确保操作的原子性。

    Args:
        db_name (str): 要创建的数据库名称
        comment (str): 数据库的描述注释

    Returns:
        str: 操作结果消息，成功或错误信息
    """
    if not db_name or not comment:
        return "Database name and comment cannot be empty."

    # 获取连接引擎
    engine = get_engine(db_name="")

    try:
        # 使用引擎连接到数据库并开始事务
        with engine.connect() as conn:
            # 执行创建数据库的 SQL
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text(f"""CREATE DATABASE {db_name}"""))

            # 根据数据库类型使用不同的注释语法
            dialect = engine.dialect.name.lower()
            if dialect == "postgresql":
                # PostgreSQL 使用 COMMENT ON DATABASE 语法
                conn.execute(text(f"""COMMENT ON DATABASE {db_name} IS '{comment}'"""))

        # 事务提交，返回成功信息
        return f"Database '{db_name}' created successfully with comment."

    except SQLAlchemyError as e:
        # 捕获 SQLAlchemy 错误并返回异常信息
        return f"Error creating database: {str(e)}"


def get_primary_keys(db_name, table_name):
    """
    获取当前表的主键信息
    :param conn: SQLAlchemy连接对象
    :param db_name: 数据库名称
    :param table_name: 表名称
    :return: 主键列名的集合
    """
    engine = get_engine(db_name)
    with engine.begin() as conn:
        inspector = inspect(conn)

        # 获取指定表的主键列名列表
        pk_constraint = inspector.get_pk_constraint(table_name, schema="public")
        if pk_constraint:
            primary_key_columns = {
                "constrained_columns": pk_constraint["constrained_columns"],
                "name": pk_constraint["name"],
            }
            return primary_key_columns
        else:
            return None


def get_unique_keys(db_name, table_name):
    """
    获取当前表的唯一索引信息
    :param conn: SQLAlchemy连接对象
    :param db_name: 数据库名称
    :param table_name: 表名称
    :return: 主键列名的集合
    """
    engine = get_engine(db_name)
    with engine.begin() as conn:
        inspector = inspect(conn)
        # 获取指定表的主键列名列表
        pk_constraint = inspector.get_unique_constraints(
            table_name, schema=get_def_schema(engine)
        )
        return pk_constraint


def get_foreign_keys(db_name, table_name):
    """
    获取当前表的外键信息
    :param conn: SQLAlchemy连接对象
    :param db_name: 数据库名称
    :param table_name: 表名称
    :return: 外键信息的列表，每个元素为字典，包含列名、约束名、引用表和引用列
    """
    engine = get_engine(db_name)
    with engine.begin() as conn:
        inspector = inspect(conn)
        foreign_keys = inspector.get_foreign_keys(table_name, schema="public")
        ret = []
        for fk in foreign_keys:
            referred_table = fk["referred_table"]
            for local_column, referred_column in zip(
                fk["constrained_columns"], fk["referred_columns"]
            ):
                ret.append(
                    {
                        "foreign_key_name": fk["name"],
                        "referred_table": referred_table,
                        "constrained_column": local_column,
                        "referred_column": referred_column,
                    }
                )
        return ret


def get_def_schema(engine):
    """获取数据库的默认模式名。

    根据数据库类型返回相应的默认模式名称。

    Args:
        engine: SQLAlchemy数据库引擎对象

    Returns:
        str: 模式名称，PostgreSQL返回"public"，其他数据库返回空字符串
    """
    if engine.dialect.name == "postgresql":
        return "public"
    else:
        return ""


def unique_check(column_name, unique_keys):
    """检查指定列是否具有唯一约束。

    查找指定列名在唯一约束列表中的匹配情况。

    Args:
        column_name (str): 要检查的列名
        unique_keys (list): 唯一约束列表

    Returns:
        dict: 包含唯一性检查结果的字典：
              - is_unique: 布尔值，表示是否唯一
              - name: 约束名称，如果不唯一则为None
    """
    unique_keys = [
        {"column_name": key_column_name, "name": f["name"]}
        for f in unique_keys
        for key_column_name in f["column_names"]
    ]
    f = next((i for i in unique_keys if i["column_name"] == column_name), None)
    return {"is_unique": True if f else False, "name": f["name"] if f else None}


def get_table_structure(db_name, table):
    """获取指定表的完整结构信息。

    查询并返回表的详细结构信息，包括列定义、主键、外键、唯一约束等。

    Args:
        db_name (str): 数据库名称
        table (str): 表名称

    Returns:
        dict: 包含表结构信息的字典，包含table_name和columns字段

    Raises:
        Exception: 当数据库名为空或查询失败时抛出
    """
    if not db_name:
        return "Database name cannot be empty."

    # 获取连接引擎
    engine = get_engine(db_name)

    try:
        # 使用引擎连接到指定数据库
        with engine.connect() as conn:
            # 获取数据库的 Inspector 对象
            inspector = inspect(conn)
            # 遍历每个表，获取表结构信息
            columns = inspector.get_columns(
                table_name=table, schema=get_def_schema(engine)
            )
            primary_keys = inspector.get_pk_constraint(
                table_name=table, schema=get_def_schema(engine)
            )["constrained_columns"]
            unique_keys = inspector.get_unique_constraints(
                table_name=table, schema=get_def_schema(engine)
            )
            foreign_keys = inspector.get_foreign_keys(
                table_name=table, schema=get_def_schema(engine)
            )

            # 创建一个字典来快速查找外键信息
            foreign_key_dict = {}
            for fk in foreign_keys:
                for column in fk["constrained_columns"]:
                    foreign_key_dict[column] = {
                        "constrained_column": column,
                        "referred_table": fk["referred_table"],
                        "referred_columns": fk["referred_columns"][
                            fk["constrained_columns"].index(column)
                        ],
                    }

            table_info = {
                "table_name": table,
                "columns": [
                    {
                        "name": column["name"],
                        "type": str(column["type"]),
                        "nullable": column["nullable"],
                        "default": parse_column_default_val(column["default"]),
                        "comment": column["comment"] or "",
                        "is_unique": unique_check(column["name"], unique_keys)[
                            "is_unique"
                        ],
                        "unique_group": unique_check(column["name"], unique_keys)[
                            "name"
                        ],
                        "is_primary_key": column["name"] in primary_keys,
                        "is_foreign_key": column["name"] in foreign_key_dict,
                        "foreign_key_info": foreign_key_dict.get(column["name"]),
                    }
                    for column in columns
                ],
            }
            return table_info
    except Exception as e:
        raise Exception(f"Error retrieving table structure: {str(e)}")


def parse_column_default_val(default_val):
    """解析列的默认值。

    处理数据库列的默认值，去除PostgreSQL特有的类型转换语法。

    Args:
        default_val (str): 原始默认值字符串

    Returns:
        str: 处理后的默认值，如果为空则返回None
    """
    if default_val:
        if default_val.find("::") > 0:
            return default_val.split("::")[0]
        else:
            return default_val
    return None


def get_all_databases():
    """获取数据库服务器中的所有数据库列表。

    查询数据库服务器中的所有非模板数据库，返回JSON格式的数据库名称列表。

    Returns:
        str: JSON格式的数据库名称列表，或错误信息字符串
    """
    # 获取连接引擎
    engine = get_engine()

    try:
        # 使用引擎连接到数据库
        with engine.connect() as conn:
            # 根据数据库类型使用不同的语法
            dialect = engine.dialect.name.lower()
            if dialect == "postgresql":
                # PostgreSQL 使用 pg_database 系统表
                result = conn.execute(
                    "SELECT datname FROM pg_database WHERE datistemplate = false"
                )
            elif dialect in ["mysql", "tidb"]:
                # MySQL/TiDB 使用 SHOW DATABASES 语法
                result = conn.execute("SHOW DATABASES")
            else:
                return f"Unsupported database type: {dialect}"

            databases = [row[0] for row in result]
            return json.dumps(databases, indent=4)

    except SQLAlchemyError as e:
        # 捕获 SQLAlchemy 错误并返回异常信息
        return f"Error retrieving databases: {str(e)}"


def delete_table(db_name, table_name):
    """删除指定的数据表。

    在指定数据库中删除指定的表，如果表不存在则不会报错。

    Args:
        db_name (str): 数据库名称
        table_name (str): 要删除的表名

    Returns:
        str: 操作结果消息，成功或错误信息
    """
    if not db_name or not table_name:
        return "Database name and table name cannot be empty."

    # 获取连接引擎
    engine = get_engine()

    try:
        # 使用引擎连接到数据库并开始事务
        with engine.begin() as conn:
            # 执行删除表的 SQL
            conn.execute(f"DROP TABLE IF EXISTS {db_name}.{table_name}")

        # 事务提交，返回成功信息
        return f"Table '{table_name}' in database '{db_name}' deleted successfully."

    except SQLAlchemyError as e:
        # 捕获 SQLAlchemy 错误并返回异常信息
        return f"Error deleting table: {str(e)}"


def delete_db(db_name):
    """删除指定的数据库。

    删除指定的数据库，如果数据库不存在则不会报错。

    Args:
        db_name (str): 要删除的数据库名称

    Returns:
        str: 操作结果消息，成功或错误信息
    """
    if not db_name:
        return "Database name cannot be empty."

    # 获取连接引擎
    engine = get_engine(db_name)

    try:
        # 使用引擎连接到数据库并开始事务
        with engine.begin() as conn:
            # 执行删除数据库的 SQL
            conn.execute(f"DROP DATABASE IF EXISTS {db_name}")

        # 事务提交，返回成功信息
        return f"Database '{db_name}' deleted successfully."

    except SQLAlchemyError as e:
        # 捕获 SQLAlchemy 错误并返回异常信息
        return f"Error deleting database: {str(e)}"


def determine_operation(existing_columns, new_columns, column):
    """
    自动识别列操作类型，考虑主键和外键约束。
    :param existing_columns: 当前表的列信息
    :param column: 待处理的列信息
    :param primary_keys: 当前表的主键字段集合
    :param foreign_key_dict: 当前表的外键字段字典
    :return: 操作类型（add/delete/modify/none）
    """
    column_name = column.get("name")
    # 查找当前表中是否存在该列
    existing_column = next(
        (col for col in existing_columns if col["name"] == column_name), None
    )
    # 查找新表中是否存在该列
    new_column = next((col for col in new_columns if col["name"] == column_name), None)

    # 如果列不存在，操作为 'add'
    if existing_column is None:
        return "add"
    if new_column is None:
        return "del"

    # 如果列存在，检查是否需要修改
    if (
        existing_column["type"] != column.get("type")
        or existing_column["nullable"] != column.get("nullable")
        or existing_column["default"] != column.get("default")
        or existing_column["comment"] != column.get("comment")
    ):
        return "modify"

    # 如果列没有变化，不需要任何操作
    return "none"


def create_table_structure(db_name, table_name, columns):
    """
    创建新的表结构，支持定义主键、外键、列信息等，兼容 MySQL 和 PostgreSQL
    :param db_name: 数据库名称
    :param table_name: 新表名称
    :param columns: 列信息列表，包含列名、类型、主键、外键、默认值、是否可空等
    :return: 成功或错误信息
    """
    try:
        # 获取连接引擎
        engine = get_engine(db_name)
        # 获取数据库方言
        dialect = engine.dialect.name

        # 使用引擎连接到数据库并开始事务
        with engine.begin() as conn:
            # 定义表的基本结构和备选的 schema 名称
            if dialect == "postgresql":
                schema_name = get_def_schema(engine) + "."
            else:  # MySQL
                schema_name = ""

            # 创建表结构的 SQL
            create_table_sql = f"CREATE TABLE {schema_name}{table_name} ("
            add_comment_sql = ""
            primary_keys = []
            foreign_key_infos = []
            unique_keys = []
            # 遍历列信息，构建创建表的 SQL
            for column in columns:
                column_name = column.get("name")
                column_type = column.get("type")
                nullable = column.get("nullable", True)
                default = column.get("default", None)
                comment = column.get("comment", "")
                is_primary_key = column.get("is_primary_key", False)
                is_unique = column.get("is_unique", False)
                unique_group = column.get("unique_group", None)
                if is_primary_key:
                    primary_keys.append(column_name)
                foreign_key_info = column.get("foreign_key_info", None)
                if foreign_key_info:
                    foreign_key_infos.append(foreign_key_info)
                if is_unique and not is_primary_key:
                    unique_keys.append(
                        {"column_name": column_name, "name": unique_group}
                    )
                # 数据库兼容性处理：生成列定义
                create_table_sql += f"{column_name} {column_type} "

                # 可空性处理
                if not nullable:
                    create_table_sql += "NOT NULL "
                else:
                    create_table_sql += "NULL "

                # 默认值处理
                if default is not None:
                    if dialect == "postgresql":
                        create_table_sql += f"DEFAULT {default} "
                    elif dialect == "mysql":
                        create_table_sql += f"DEFAULT {default if isinstance(default, str) else f'{default}'} "

                # 注释处理：根据数据库类型差异
                if dialect == "postgresql" and comment:
                    add_comment_sql += f"COMMENT ON COLUMN {schema_name}{table_name}.{column_name} IS '{comment}';"
                elif dialect == "mysql" and comment:
                    create_table_sql += f" COMMENT '{comment}' "

                create_table_sql += ", "

            # 去除最后一个多余的逗号
            create_table_sql = create_table_sql.rstrip(", ") + ")"

            # 执行创建表的 SQL
            conn.execute(text(create_table_sql))
            conn.execute(text(add_comment_sql))
            unique_sqls = []
            grouped_unique = group_unique_list(unique_keys)
            if grouped_unique:
                for gu in grouped_unique:
                    id_names = "_".join(gu["column_names"])
                    key_name = f"{table_name}_{id_names}"
                    ids = ",".join(gu["column_names"])
                    unique_sqls.append(
                        f"ALTER TABLE {schema_name}{table_name} add CONSTRAINT {key_name} unique ({ids})"
                    )

            # 给表添加主键（如果有）
            if primary_keys:
                pkeys = ",".join(primary_keys)
                create_pk_sql = f"""ALTER TABLE {schema_name}{table_name}
                                     ADD CONSTRAINT {table_name}_pkey PRIMARY KEY ({pkeys})"""
                conn.execute(text(create_pk_sql))

            # 给表添加外键（如果有）
            if foreign_key_infos:
                create_foreign_sqls = build_foreign_sql(
                    schema_name, table_name, foreign_key_infos
                )
                for s in create_foreign_sqls:
                    conn.execute(text(s))
            # 给表添加约束
            if unique_sqls:
                for sql in unique_sqls:
                    conn.execute(text(sql))

        return {
            "code": 0,
            "message": f"Table {table_name} in database {db_name} created successfully.",
        }

    except Exception as e:
        traceback.print_exc()
        return {"code": 1, "message": f"Error creating table structure: {str(e)}"}


def union_of_dict_lists(list1, list2, key):
    """
    计算两个字典列表的并集，基于某个唯一的 key 比较字典。

    :param list1: 第一个字典列表
    :param list2: 第二个字典列表
    :param key: 用于比较字典对象的唯一键值
    :return: 并集的字典列表
    """
    # 使用集合来去重，基于给定的 key
    dict_union = {item[key]: item for item in list2 + list1}
    # 返回去重后的字典列表
    return list(dict_union.values())


def group_unique_list(unique_keys):
    """将唯一键约束按约束名称进行分组。

    将单独的唯一键列信息合并为完整的复合唯一键约束。

    Args:
        unique_keys (list): 唯一键列表，每个字典包含column_name和name字段

    Returns:
        list: 分组后的唯一键约束列表，每个字典包含column_names列表和name
    """
    if not unique_keys:
        return []

    groups = []

    def add_group(uk):
        added = False
        for g in groups:
            if uk["name"] and uk["name"] == g["name"]:
                g["column_names"].append(uk["column_name"])
                added = True
        if not added:
            groups.append({"column_names": [uk["column_name"]], "name": uk["name"]})

    for k in unique_keys:
        add_group(k)
    return groups


def are_lists_equal(list1, list2):
    """判断两个列表是否相等（忽略元素顺序）。

    使用Counter比较两个列表的元素和出现次数，忽略元素的顺序。

    Args:
        list1 (list): 第一个列表
        list2 (list): 第二个列表

    Returns:
        bool: 如果两个列表相等（忽略顺序）返回True，否则返回False
    """
    if len(list1) != len(list2):
        return False
    return Counter(list1) == Counter(list2)


def edit_table_structure(db_name, table_name, columns):
    """
    编辑表结构，支持回滚操作并返回详细的错误信息
    :param db_name: 数据库名称
    :param table_name: 表名称
    :param columns: 列信息列表，包含操作类型（add/delete/modify）和列信息
    :return: 成功或错误信息
    """
    try:
        # 获取连接引擎
        engine = get_engine(db_name)
        # 使用引擎连接到数据库并开始事务
        with engine.begin() as conn:
            # 获取当前表的列定义
            existing_columns = get_table_structure(db_name, table_name)["columns"]
            existing_foreign = get_foreign_keys(db_name, table_name)
            existing_primary_key = get_primary_keys(db_name, table_name)
            existing_unique_keys = get_unique_keys(db_name, table_name)
            # 备份当前表结构
            backup_table_name = f"{table_name}_backup"
            schema_name = ""
            if engine.dialect.name == "postgresql":
                schema_name = get_def_schema(engine) + "."

            # 根据数据库类型使用不同的备份表创建方式
            if engine.dialect.name == "tidb":
                # TiDB不支持CREATE TABLE AS SELECT，使用CREATE TABLE LIKE + INSERT
                conn.execute(
                    text(
                        f"CREATE TABLE {schema_name}{backup_table_name} LIKE {schema_name}{table_name}"
                    )
                )
                conn.execute(
                    text(
                        f"INSERT INTO {schema_name}{backup_table_name} SELECT * FROM {schema_name}{table_name}"
                    )
                )
            else:
                # MySQL、PostgreSQL等支持CREATE TABLE AS SELECT
                conn.execute(
                    text(
                        f"CREATE TABLE {schema_name}{backup_table_name} AS SELECT * FROM {schema_name}{table_name}"
                    )
                )
            foreign_key_infos = []
            primary_keys = []
            unique_keys = []
            ddl_sqls = []
            all_columns = union_of_dict_lists(columns, existing_columns, "name")
            # 遍历列信息，执行相应的操作
            for column in all_columns:
                operation = determine_operation(
                    existing_columns, columns, column
                )  # 自动识别操作类型
                column_name = column.get("name")
                column_type = column.get("type")
                nullable = column.get("nullable", True)
                default = column.get("default", None)
                comment = column.get("comment", "")
                is_primary_key = column.get("is_primary_key", False)
                foreign_key_info = column.get("foreign_key_info", None)
                is_unique = column.get("is_unique", False)
                unique_group = column.get("unique_group", None)
                if foreign_key_info and operation != "del":
                    foreign_key_infos.append(foreign_key_info)
                if is_primary_key and operation != "del":
                    primary_keys.append(column_name)
                if is_unique and not is_primary_key and operation != "del":
                    unique_keys.append(
                        {"column_name": column_name, "name": unique_group}
                    )
                if operation == "add":
                    # 新增字段
                    ddl_sqls.append(
                        f"""
                            ALTER TABLE {schema_name}{table_name}
                            ADD COLUMN {column_name} {column_type} {'NOT NULL' if not nullable else ''}
                            DEFAULT {default if default is not None else 'NULL'}
                        """
                    )
                    ddl_sqls.append(
                        f"COMMENT ON COLUMN {table_name}.{column_name}  IS '{comment}'"
                    )
                elif operation == "del":
                    # 删除字段
                    ddl_sqls.append(
                        f"ALTER TABLE {schema_name}{table_name} DROP COLUMN {column_name}"
                    )
                elif operation == "modify":
                    # 修改字段
                    ddl_sqls.append(
                        f"""ALTER TABLE {schema_name}{table_name}
                                    ALTER COLUMN {column_name} TYPE {column_type},
                                    ALTER COLUMN {column_name} {'set NOT NULL' if not nullable else 'drop NOT NULL'},
                                    ALTER COLUMN {column_name} SET DEFAULT {default if default is not None else 'NULL'}"""
                    )
                    ddl_sqls.append(
                        f"COMMENT ON COLUMN {table_name}.{column_name}  IS '{comment}'"
                    )
            # 删除原来的主键
            can_add_primary = False
            if existing_primary_key:
                # 判断主键发生变化
                if set(existing_primary_key["constrained_columns"]) != set(
                    primary_keys
                ):
                    conn.execute(
                        text(
                            f"""ALTER TABLE {schema_name}{table_name}
                                          DROP CONSTRAINT {existing_primary_key["name"]}"""
                        )
                    )
                    can_add_primary = True
            else:
                can_add_primary = True
            if existing_foreign:
                # 删除原来的外键
                foreign_names = [f["foreign_key_name"] for f in existing_foreign]
                for f_name in foreign_names:
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema_name}{table_name} DROP CONSTRAINT {f_name}"
                        )
                    )
            # 唯一键约束处理
            unique_sqls = []
            if existing_unique_keys:
                for k in existing_unique_keys:
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema_name}{table_name} DROP CONSTRAINT {k['name']}"
                        )
                    )
            grouped_unique = group_unique_list(unique_keys)
            if grouped_unique:
                for gu in grouped_unique:
                    id_names = "_".join(gu["column_names"])
                    key_name = f"{table_name}_{id_names}_pk"
                    ids = ",".join(gu["column_names"])
                    unique_sqls.append(
                        f"ALTER TABLE {schema_name}{table_name} add constraint {key_name} unique ({ids})"
                    )

            for s in ddl_sqls:
                conn.execute(text(s))
            # 给表添加主键
            if len(primary_keys) > 0 and can_add_primary:
                pkeys = ",".join(primary_keys)
                create_private_sql = f"""ALTER TABLE {schema_name}{table_name}  ADD CONSTRAINT {table_name}_pkey PRIMARY KEY ({pkeys})"""
                conn.execute(text(create_private_sql))
            # 给表添加外键
            if foreign_key_infos:
                create_foreign_sqls = build_foreign_sql(
                    schema_name, table_name, foreign_key_infos
                )
                for s in create_foreign_sqls:
                    conn.execute(text(s))
            # 给表添加约束
            if unique_sqls:
                for sql in unique_sqls:
                    conn.execute(text(sql))
            # 如果成功，删除备份表
            conn.execute(text(f"DROP TABLE {schema_name}{backup_table_name}"))
        return {
            "code": 0,
            "message": f"Table {table_name} in database {db_name} updated successfully.",
        }

    except Exception as e:
        traceback.print_exc()
        return {"code": 1, "message": f"Table update error: {str(e)}"}


def diff_dict(o_dict, n_dict):
    """计算两个字典之间的差集。

    比较两个字典，返回新增、修改和删除的项目。

    Args:
        o_dict (dict): 原始字典
        n_dict (dict): 新字典

    Returns:
        tuple: 包含三个列表的元组 (add_items, modify_items, del_items)
    """
    add_items = []
    modify_items = []
    del_items = []
    for k in o_dict.keys() | n_dict.keys():  # 获取所有唯一键
        old_val = o_dict.get(k, None)
        new_val = n_dict.get(k, None)
        if old_val != new_val:

            if old_val is None:
                add_items[k] = new_val
            elif new_val is None:
                del_items[k] = old_val
            else:
                modify_items[k] = new_val
    return add_items, modify_items, del_items


def group_foreign_key(foreign_key_infos):
    """将外键信息按引用表进行分组。

    将外键约束信息按照引用的目标表名进行分组，便于批量处理。

    Args:
        foreign_key_infos (list): 外键信息列表

    Returns:
        dict: 以引用表名为键，外键信息列表为值的字典；
              如果输入为空则返回None
    """
    if not foreign_key_infos:
        return None
    infos = copy.deepcopy(foreign_key_infos)
    grouped = defaultdict(list)
    for obj in infos:
        key = obj["referred_table"]
        grouped[key].append(obj)
    return grouped


def build_foreign_sql(schema_name, table_name, foreign_key_infos):
    """构建外键约束的SQL语句。

    根据外键信息生成添加外键约束的ALTER TABLE SQL语句。

    Args:
        schema_name (str): 模式名称（包含点号）
        table_name (str): 表名称
        foreign_key_infos (list): 外键信息列表

    Returns:
        list: 外键约束SQL语句列表
    """
    sqls = []
    groupd_foreign_key_info = group_foreign_key(foreign_key_infos)
    for refe_table, colums in groupd_foreign_key_info.items():
        c_colums = [c["constrained_column"] for c in colums]
        c_colums_str = ",".join(c_colums)
        r_colums = [c["referred_column"] for c in colums]
        r_colums_str = ",".join(r_colums)
        sql = f"""ALTER TABLE {schema_name}{table_name} add foreign key ({c_colums_str}) references {schema_name}{refe_table} ({r_colums_str})"""
        sqls.append(sql)
    return sqls
