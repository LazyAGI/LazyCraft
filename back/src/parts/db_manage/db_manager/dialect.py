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

from typing import Optional

from sqlalchemy.engine import Engine


class DialectAdapter:
    """数据库方言适配器，支持 PostgreSQL、MySQL 和达梦"""

    def __init__(self, engine: Engine):
        """初始化数据库方言适配器。

        根据数据库引擎类型自动识别数据库方言，并设置相应的schema配置。
        支持PostgreSQL、MySQL、TiDB和达梦数据库。

        Args:
            engine (Engine): SQLAlchemy数据库引擎对象
        """
        self.dialect = engine.dialect.name.lower()

        # TiDB使用mysql+pymysql连接，但需要特殊处理
        # 可以通过连接字符串或其他方式检测是否为TiDB
        if self.dialect == "mysql":
            # 检查是否为TiDB（可以通过端口或其他特征）
            # TiDB默认端口是4000，MySQL是3306
            if hasattr(engine, "url") and engine.url.port == 4000:
                self.dialect = "tidb"

        self.schema = "public" if self.dialect == "postgresql" else None
        if self.dialect == "dm":  # 达梦数据库
            self.schema = None  # 达梦默认无 schema 前缀，类似 MySQL

    def get_full_table_name(self, table_name: str) -> str:
        """获取完整的表名。

        根据数据库方言添加适当的schema前缀。

        Args:
            table_name (str): 表名

        Returns:
            str: 完整的表名，PostgreSQL会添加schema前缀
        """
        return f"{self.schema}.{table_name}" if self.schema else table_name

    def format_default_val(self, name, type, default):
        """格式化列的默认值。

        根据列的数据类型对默认值进行验证和格式化。
        支持布尔、整数、数值、字符串、时间戳等类型的默认值处理。

        Args:
            name (str): 列名，用于错误提示
            type (str): 列的数据类型
            default: 默认值

        Returns:
            默认值的格式化结果

        Raises:
            Exception: 当默认值格式不符合类型要求时抛出
        """
        if default is None:
            return None
        if type in ["BOOLEAN"]:
            if default not in [None, True, False, "True", "true", "False", "false"]:
                raise Exception(f"[{name}] 布尔类型的参数默认值 只能是 None,True,False")
            else:
                if default in [True, "true", "True", "TRUE"]:
                    return "TRUE"
                else:
                    return "FALSE"
        if type in ["INTEGER", "BIGINT", "INT"]:
            if default is not None:
                if isinstance(default, int) or (
                    isinstance(default, str) and default.isdigit()
                ):
                    return int(default)
                else:
                    raise Exception(f"[{name}] 数值类型的参数默认值只能是数字")
        if type in ["NUMERIC", "DECIMAL"]:
            if isinstance(default, (int, float)):
                return float(default)
            elif isinstance(default, str):
                default = default.strip()
                if not default:
                    raise Exception(f"[{name}] 数值的参数默认值不能为空字符串")
                try:
                    return float(default)
                except ValueError:
                    raise Exception(f"[{name}]数值的参数默认值格式错误: '{default}'")
            else:
                raise Exception(f"[{name}] 数值的参数默认值只能是数字或数字字符串")
        if type in ["VARCHAR"]:
            if default is not None and isinstance(default, (int, float, str)):
                if isinstance(default, (int, float)):
                    return str(f"'{str(default)}'")
                if not default.startswith("'") or not default.endswith("'"):
                    return str(f"'{default}'")
            else:
                raise Exception(f"[{name}] 字符串类型的参数默认值 只能是字符")
        if type in ["TIMESTAMP"]:
            if default is not None:
                valid_expressions = ["CURRENT_TIMESTAMP", "NOW()"]
                import re

                date_pattern = r"^\d{4}-\d{2}-\d{2}$"  # 匹配 YYYY-MM-DD
                date_pattern2 = r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$"
                if default in valid_expressions:
                    return default
                elif isinstance(default, str) and (
                    re.match(date_pattern, default) or re.match(date_pattern2, default)
                ):
                    # 如果是日期字符串，外面加单引号以符合 SQL 语法
                    return f"'{default}'"
                else:
                    raise Exception(
                        f"[{name}] 日期类型的参数默认值 只能是 CURRENT_TIMESTAMP, NOW() 或 YYYY-MM-DD 格式的日期字符串"
                    )
        if type in ["TEXT"]:
            if default is not None:
                raise Exception(f"[{name}] TEXT类型无法设置默认值")
        return default

    def format_column_definition(self, column: dict) -> str:
        """格式化列定义为SQL语句。

        将列定义字典转换为SQL DDL语句中的列定义部分。
        包括列名、类型、约束、默认值、注释等。

        Args:
            column (dict): 列定义字典，包含name、type、nullable等属性

        Returns:
            str: 格式化后的列定义SQL片段
        """
        column_name = column["name"]
        column_type = column["type"]

        # 类型验证和长度处理
        processed_type = self._validate_and_process_type(
            column_name, column_type, column
        )

        parts = [column_name, processed_type]
        default_val = self.format_default_val(
            column_name, column_type, column.get("default")
        )
        # 可空性
        if not column.get("nullable", True):
            parts.append("NOT NULL")

        # 默认值处理
        default = column.get("default")
        if default is not None:
            parts.append(f"DEFAULT {default_val}")
        # 注释处理
        if self.dialect == "mysql" and column.get("comment"):
            parts.append(f"COMMENT '{column['comment']}'")
        elif self.dialect == "dm" and column.get("comment"):
            # 达梦使用单独的 COMMENT ON 语句
            pass  # 在后续单独处理

        # 达梦的自增列特殊处理
        if (
            self.dialect == "dm"
            and column.get("is_primary_key")
            and column_type.upper() in ("INTEGER", "BIGINT")
        ):
            parts.append("IDENTITY(1,1)")  # 达梦的自增语法

        return " ".join(parts)

    def _validate_and_process_type(
        self, column_name: str, column_type: str, column: dict = None
    ) -> str:
        """验证和处理列类型定义。

        确保需要长度参数的数据类型有正确的长度定义，
        当前端没有传递长度时使用合理的默认值。

        Args:
            column_name (str): 列名
            column_type (str): 列类型名称
            column (dict, optional): 列定义字典，包含length、precision等参数

        Returns:
            str: 处理后的完整类型定义
        """
        type_upper = column_type.upper()

        # VARCHAR 类型必须指定长度，默认1000
        if type_upper == "VARCHAR":
            # 如果是主键，强制长度为191
            length = 191
            return f"VARCHAR({length})"

        # CHAR 类型必须指定长度，默认1
        if type_upper == "CHAR":
            length = column.get("length", 1) if column else 1
            return f"CHAR({length})"

        # NUMERIC/DECIMAL 类型必须指定精度和小数位数
        if type_upper in ["NUMERIC", "DECIMAL"]:
            precision = column.get("precision", 10) if column else 10
            scale = column.get("scale", 2) if column else 2
            return f"{type_upper}({precision},{scale})"

        # MySQL中的整数类型可以指定长度（可选）
        if type_upper in ["TINYINT", "SMALLINT", "MEDIUMINT", "INT", "BIGINT"]:
            # MySQL中整数类型的长度是可选的，但为了兼容性，我们可以添加默认长度
            if self.dialect == "mysql" and column and column.get("length"):
                return f"{type_upper}({column['length']})"
            return type_upper

        # 其他类型直接返回（TEXT, BOOLEAN, TIMESTAMP等不需要长度）
        return column_type

    def get_comment_sql(self, table_name: str, column: dict) -> Optional[str]:
        """生成列注释的SQL语句。

        根据不同数据库方言生成添加或修改列注释的SQL语句。

        Args:
            table_name (str): 表名
            column (dict): 列定义字典，包含注释信息

        Returns:
            Optional[str]: 注释SQL语句，如果不需要则返回None
        """
        if self.dialect == "postgresql" and column.get("comment"):
            return f"COMMENT ON COLUMN {self.get_full_table_name(table_name)}.{column['name']} IS '{column['comment']}'"
        elif self.dialect == "dm" and column.get("comment"):
            return f"COMMENT ON COLUMN {self.get_full_table_name(table_name)}.{column['name']} IS '{column['comment']}'"
        elif self.dialect in ["mysql", "tidb"] and column.get("comment"):
            # MySQL/TiDB 使用 ALTER TABLE ... MODIFY COLUMN ... COMMENT 语法
            # 使用_validate_and_process_type方法来正确处理列类型（包括长度参数）
            column_type = self._validate_and_process_type(
                column["name"], column["type"], column
            )
            return f"ALTER TABLE {self.get_full_table_name(table_name)} MODIFY COLUMN {column['name']} {column_type} COMMENT '{column['comment']}'"
        return None

    def create_backup_table_sql(self, table_name: str, backup_table_name: str) -> str:
        """生成创建备份表的SQL语句。

        根据不同数据库方言生成创建备份表的SQL语句。
        TiDB不支持CREATE TABLE AS SELECT，需要使用CREATE TABLE LIKE。

        Args:
            table_name (str): 源表名
            backup_table_name (str): 备份表名

        Returns:
            str: 创建备份表的SQL语句
        """

        if self.dialect == "tidb":
            # TiDB不支持CREATE TABLE AS SELECT，使用CREATE TABLE LIKE + INSERT
            return f"CREATE TABLE {self.get_full_table_name(backup_table_name)} LIKE {self.get_full_table_name(table_name)}"
        else:
            # MySQL、PostgreSQL等支持CREATE TABLE AS SELECT
            return f"CREATE TABLE {self.get_full_table_name(backup_table_name)} AS SELECT * FROM {self.get_full_table_name(table_name)}"

    def copy_data_to_backup_sql(self, table_name: str, backup_table_name: str) -> str:
        """生成复制数据到备份表的SQL语句。

        主要用于TiDB数据库，因为TiDB不支持CREATE TABLE AS SELECT，
        需要先创建表结构再复制数据。

        Args:
            table_name (str): 源表名
            backup_table_name (str): 备份表名

        Returns:
            str: 复制数据的SQL语句，如果不需要则返回None
        """
        if self.dialect == "tidb":
            return f"INSERT INTO {self.get_full_table_name(backup_table_name)} SELECT * FROM {self.get_full_table_name(table_name)}"
        else:
            # 其他数据库在CREATE TABLE AS SELECT时已经复制了数据
            return None

    def modify_column_sql(self, table_name: str, column: dict) -> str:
        """生成修改列定义的SQL语句。

        根据不同数据库方言生成修改列的SQL语句，包括类型、约束、默认值等。

        Args:
            table_name (str): 表名
            column (dict): 列定义字典

        Returns:
            str: 修改列的SQL语句
        """
        column_name = column["name"]
        # 使用_validate_and_process_type方法来正确处理列类型
        column_type = self._validate_and_process_type(
            column_name, column["type"], column
        )
        nullable = column.get("nullable", True)
        default = column.get("default")
        comment = column.get("comment", "")

        if self.dialect in ["mysql", "tidb"]:
            # MySQL/TiDB 使用 MODIFY COLUMN 语法
            parts = [
                f"ALTER TABLE {self.get_full_table_name(table_name)} MODIFY COLUMN {column_name} {column_type}"
            ]

            # 添加可空性 - 只有当NOT NULL时才需要指定
            if not nullable:
                parts.append("NOT NULL")
            # 注意：当nullable为True时，不需要添加NULL关键字

            # 添加默认值
            if default is not None:
                default_val = self.format_default_val(
                    column_name, column["type"], default
                )
                if default_val:
                    parts.append(f"DEFAULT {default_val}")

            # 添加注释
            if comment:
                parts.append(f"COMMENT '{comment}'")

            return " ".join(parts)

        elif self.dialect == "postgresql":
            # PostgreSQL 使用 ALTER COLUMN 语法
            sql_parts = []

            # 修改类型
            sql_parts.append(
                f"ALTER TABLE {self.get_full_table_name(table_name)} ALTER COLUMN {column_name} TYPE {column_type}"
            )

            # 修改可空性
            nullable_clause = "SET NOT NULL" if not nullable else "DROP NOT NULL"
            sql_parts.append(
                f"ALTER TABLE {self.get_full_table_name(table_name)} ALTER COLUMN {column_name} {nullable_clause}"
            )

            # 修改默认值
            if default is not None:
                default_val = self.format_default_val(column_name, column_type, default)
                if default_val:
                    default_clause = f"SET DEFAULT {default_val}"
                else:
                    default_clause = "SET DEFAULT NULL"
                sql_parts.append(
                    f"ALTER TABLE {self.get_full_table_name(table_name)} ALTER COLUMN {column_name} {default_clause}"
                )

            return sql_parts

        else:
            # 其他数据库类型
            raise Exception(f"Unsupported database dialect: {self.dialect}")
