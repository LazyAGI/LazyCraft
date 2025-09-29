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
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# 添加项目根目录到 Python 路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

from parts.db_manage.db_manager.schema import DbManager


class TestDbManager(unittest.TestCase):
    """测试 DbManager 类的各种功能"""

    def setUp(self):
        """测试前的准备工作。

        初始化测试配置、创建DbManager实例，并设置测试用的数据库名、表名等。
        """
        # 创建测试配置
        self.config = {
            "endpoint": "postgresql://postgres:postgres@localhost:5432/postgres"
        }
        self.db_manager = DbManager(self.config)

        # 测试数据库和表名
        self.test_db_name = "test_db"
        self.test_table_name = "test_table"
        self.test_comment = "测试数据库"
        self.test_table_comment = "测试表"

    def test_is_valid_name(self):
        """测试名称验证功能。

        验证数据库和表名称的有效性检查，包括有效名称和无效名称的各种情况。
        """
        # 有效名称
        self.assertTrue(self.db_manager.is_valid_name("valid_name"))
        self.assertTrue(self.db_manager.is_valid_name("validName123"))

        # 无效名称
        self.assertFalse(self.db_manager.is_valid_name("123invalid"))  # 数字开头
        self.assertFalse(self.db_manager.is_valid_name("invalid-name"))  # 包含连字符
        self.assertFalse(self.db_manager.is_valid_name("invalid name"))  # 包含空格

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_create_database(self, mock_get_engine):
        """测试创建数据库功能。

        测试数据库创建的各种场景，包括成功创建、参数验证和错误处理。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 测试成功创建数据库
        success, message = self.db_manager.create_database(
            self.test_db_name, self.test_comment
        )
        self.assertTrue(success)
        self.assertIn("created successfully", message)

        # 测试空数据库名
        success, message = self.db_manager.create_database("", self.test_comment)
        self.assertFalse(success)
        self.assertIn("cannot be empty", message)

        # 测试空注释
        success, message = self.db_manager.create_database(self.test_db_name, "")
        self.assertFalse(success)
        self.assertIn("cannot be empty", message)

        # 测试注释过长
        with self.assertRaises(Exception):
            self.db_manager.create_database(self.test_db_name, "a" * 51)

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_update_database(self, mock_get_engine):
        """测试更新数据库功能。

        测试数据库更新的各种场景，包括更新注释、重命名数据库、参数验证等。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 测试成功更新数据库
        success, message = self.db_manager.update_database(
            self.test_db_name, self.test_db_name, self.test_comment
        )
        self.assertTrue(success)
        self.assertIn("update successfully", message)

        # 测试重命名数据库
        new_db_name = "new_test_db"
        success, message = self.db_manager.update_database(
            self.test_db_name, new_db_name, self.test_comment
        )
        self.assertTrue(success)
        self.assertIn("update successfully", message)

        # 测试空数据库名
        success, message = self.db_manager.update_database(
            "", self.test_db_name, self.test_comment
        )
        self.assertFalse(success)
        self.assertIn("cannot be empty", message)

        # 测试空注释
        success, message = self.db_manager.update_database(
            self.test_db_name, self.test_db_name, ""
        )
        self.assertFalse(success)
        self.assertIn("cannot be empty", message)

        # 测试注释过长
        with self.assertRaises(Exception):
            self.db_manager.update_database(
                self.test_db_name, self.test_db_name, "a" * 51
            )

        # 测试无效数据库名
        with self.assertRaises(Exception):
            self.db_manager.update_database(
                "123invalid", self.test_db_name, self.test_comment
            )

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_delete_database(self, mock_get_engine):
        """测试删除数据库功能。

        测试数据库删除操作，包括成功删除和参数验证。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 测试成功删除数据库
        success, message = self.db_manager.delete_database(self.test_db_name)
        self.assertTrue(success)
        self.assertIn("deleted successfully", message)

        # 测试空数据库名
        success, message = self.db_manager.delete_database("")
        self.assertFalse(success)
        self.assertIn("cannot be empty", message)

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_all_databases(self, mock_get_engine):
        """测试获取所有数据库功能。

        测试获取数据库服务器中所有数据库列表的功能。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.execute.return_value = mock_result
        mock_result.__iter__.return_value = [("db1",), ("db2",)]
        mock_get_engine.return_value = mock_engine

        # 测试成功获取数据库列表
        success, databases = self.db_manager.get_all_databases()
        self.assertTrue(success)
        self.assertEqual(databases, ["db1", "db2"])

    def test_check_primary_key(self):
        """测试主键检查功能。

        验证主键约束的有效性检查，包括有效主键和无效主键的各种情况。
        """
        # 有效主键
        valid_primary_keys = {"id": False, "code": False}
        valid_columns = [
            {
                "name": "id",
                "type": "INTEGER",
                "is_primary_key": True,
                "nullable": False,
            },
            {
                "name": "code",
                "type": "VARCHAR(255)",
                "is_primary_key": True,
                "nullable": False,
            },
        ]
        self.db_manager.check_primary_key(
            valid_primary_keys, valid_columns
        )  # 不应抛出异常

        # 空主键
        with self.assertRaises(Exception):
            self.db_manager.check_primary_key({}, [])

        # 可空主键
        with self.assertRaises(Exception):
            self.db_manager.check_primary_key(
                {"id": True},
                [
                    {
                        "name": "id",
                        "type": "INTEGER",
                        "is_primary_key": True,
                        "nullable": True,
                    }
                ],
            )

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    @patch("parts.db_manage.db_manager.schema.DbManager.get_all_tables")
    def test_create_table_structure(self, mock_get_all_tables, mock_get_engine):
        """测试创建表结构功能。

        测试表结构创建的各种场景，包括成功创建、参数验证、表名验证、列名验证等。

        Args:
            mock_get_all_tables: 模拟的获取所有表方法
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 设置get_all_tables的返回值
        mock_get_all_tables.return_value = []

        # 测试表结构
        columns = [
            {
                "name": "id",
                "type": "INTEGER",
                "is_primary_key": True,
                "nullable": False,
                "comment": "ID",
            },
            {
                "name": "name",
                "type": "VARCHAR(255)",
                "nullable": True,
                "comment": "名称",
                "is_unique": True,
                "unique_group": "1",
            },
            {
                "name": "email",
                "type": "VARCHAR(255)",
                "nullable": False,
                "default": "'test@example.com'",
                "comment": "邮箱",
                "is_unique": True,
                "unique_group": "1",
            },
        ]

        # 测试成功创建表
        success, message = self.db_manager.create_table_structure(
            self.test_db_name, self.test_table_name, self.test_table_comment, columns
        )
        self.assertTrue(success)
        self.assertIn("created successfully", message)

        # 测试缺少必要参数
        success, message = self.db_manager.create_table_structure(
            "", self.test_table_name, self.test_table_comment, columns
        )
        self.assertFalse(success)
        self.assertIn("Database name, table name, or columns cannot be empty.", message)

        success, message = self.db_manager.create_table_structure(
            self.test_db_name, self.test_table_name, "    ", columns
        )
        self.assertFalse(success)
        self.assertIn("表注释不能为空", message)

        # 测试无效表名
        success, message = self.db_manager.create_table_structure(
            self.test_db_name, "123invalid", self.test_table_comment, columns
        )
        self.assertFalse(success)
        self.assertIn("表名称只能包含 '[a-z][0-9]_' 等字符并以字母开头", message)

        # 测试无效列名
        invalid_columns = copy.deepcopy(columns)
        invalid_columns[0]["name"] = "123invalid"
        success, message = self.db_manager.create_table_structure(
            self.test_db_name,
            self.test_table_name,
            self.test_table_comment,
            invalid_columns,
        )
        self.assertFalse(success)
        self.assertIn("表字段名称只能包含 '[a-z][0-9]_' 等字符并以字母开头", message)

        # 测试重复表名
        # 修改get_all_tables的返回值，模拟表已存在
        mock_get_all_tables.return_value = [self.test_table_name]

        # 测试创建已存在的表
        success, message = self.db_manager.create_table_structure(
            self.test_db_name, self.test_table_name, self.test_table_comment, columns
        )
        self.assertFalse(success)
        self.assertIn(f"表 '{self.test_table_name}' 已存在", message)

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_edit_table_structure(self, mock_get_engine):
        """测试编辑表结构功能。

        测试表结构编辑的各种场景，包括成功编辑、参数验证、表名验证、列名验证等。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 模拟获取表结构
        with patch.object(self.db_manager, "get_table_structure") as mock_get_structure:
            mock_get_structure.return_value = {"columns": []}

            # 测试表结构
            columns = [
                {
                    "name": "id",
                    "type": "INTEGER",
                    "is_primary_key": True,
                    "nullable": False,
                    "comment": "ID",
                },
                {
                    "name": "name",
                    "type": "VARCHAR(255)",
                    "nullable": True,
                    "comment": "名称",
                    "is_unique": True,
                    "unique_group": "1",
                },
                {
                    "name": "email",
                    "type": "VARCHAR(255)",
                    "nullable": False,
                    "default": "'test@example.com'",
                    "comment": "邮箱",
                    "is_unique": True,
                    "unique_group": "1",
                },
            ]

            # 测试成功编辑表
            success, message = self.db_manager.edit_table_structure(
                self.test_db_name, self.test_table_name, self.test_table_name, columns
            )
            self.assertTrue(success)
            self.assertIn("updated successfully", message)

            # 测试缺少必要参数
            success, message = self.db_manager.edit_table_structure(
                "", self.test_table_name, self.test_table_name, columns
            )
            self.assertFalse(success)
            self.assertIn("cannot be empty", message)

            # 测试无效表名
            with self.assertRaises(Exception):
                self.db_manager.edit_table_structure(
                    self.test_db_name, "123invalid", "123invalid", columns
                )

            # 测试无效列名
            invalid_columns = copy.deepcopy(columns)
            invalid_columns[0]["name"] = "123invalid"
            with self.assertRaises(Exception):
                self.db_manager.edit_table_structure(
                    self.test_db_name,
                    self.test_table_name,
                    self.test_table_name,
                    invalid_columns,
                )

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_delete_table(self, mock_get_engine):
        """测试删除表功能。

        测试表删除操作，包括成功删除和参数验证。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__.return_value = mock_conn
        mock_get_engine.return_value = mock_engine

        # 测试成功删除表
        success, message = self.db_manager.delete_table(
            self.test_db_name, self.test_table_name
        )
        self.assertTrue(success)
        self.assertIn("deleted successfully", message)

        # 测试缺少必要参数
        result = self.db_manager.delete_table("", self.test_table_name)
        self.assertEqual(result["code"], 1)
        self.assertIn("cannot be empty", result["message"])

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_all_tables(self, mock_get_engine):
        """测试获取所有表功能。

        测试获取指定数据库中所有表的列表功能。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_inspector = MagicMock()
        mock_engine.inspect.return_value = mock_inspector
        mock_inspector.get_table_names.return_value = ["table1", "table2"]
        mock_get_engine.return_value = mock_engine

        # 测试成功获取表列表
        tables = self.db_manager.get_all_tables(self.test_db_name)
        self.assertEqual(tables, ["table1", "table2"])

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_table_structure(self, mock_get_engine):
        """测试获取表结构功能。

        测试获取指定表的完整结构信息，包括列定义、主键、外键、唯一约束等。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_inspector = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.inspect.return_value = mock_inspector
        mock_get_engine.return_value = mock_engine

        # 模拟检查器方法
        mock_inspector.get_columns.return_value = [
            {
                "name": "id",
                "type": "INTEGER",
                "nullable": False,
                "default": None,
                "comment": "ID",
            },
            {
                "name": "name",
                "type": "VARCHAR(255)",
                "nullable": True,
                "default": None,
                "comment": "名称",
            },
        ]
        mock_inspector.get_pk_constraint.return_value = {
            "constrained_columns": ["id"],
            "name": "pk_test",
        }
        mock_inspector.get_unique_constraints.return_value = []
        mock_inspector.get_foreign_keys.return_value = []
        mock_inspector.get_table_comment.return_value = {"text": "测试表"}

        # 模拟获取外键信息
        with patch.object(self.db_manager, "get_foreign_keys") as mock_get_foreign_keys:
            mock_get_foreign_keys.return_value = []

            # 测试成功获取表结构
            table_info = self.db_manager.get_table_structure(
                self.test_db_name, self.test_table_name
            )
            self.assertEqual(table_info["table_name"], self.test_table_name)
            self.assertEqual(table_info["comment"], "测试表")
            self.assertEqual(len(table_info["columns"]), 2)

            # 测试缺少必要参数
            result = self.db_manager.get_table_structure("", self.test_table_name)
            self.assertFalse(result)

            result = self.db_manager.get_table_structure(self.test_db_name, "")
            self.assertFalse(result)

    def test_data_type_transform(self):
        """测试数据类型转换功能。

        测试通用数据类型的转换，验证各种常见数据类型的转换结果。
        """
        # 测试各种数据类型的转换
        self.assertEqual(self.db_manager.data_type_transform("int"), "Integer")
        self.assertEqual(self.db_manager.data_type_transform("varchar"), "Text")
        self.assertEqual(self.db_manager.data_type_transform("timestamp"), "DateTime")
        self.assertEqual(self.db_manager.data_type_transform("bool"), "Boolean")
        self.assertEqual(self.db_manager.data_type_transform("json"), "JSON")
        self.assertEqual(self.db_manager.data_type_transform("unknown_type"), "Unknown")

    def test_mysql_data_type_transform(self):
        """测试MySQL数据类型转换功能。

        测试MySQL特有数据类型的转换，验证各种MySQL专用类型的转换结果。
        """
        # 测试MySQL特有的数据类型转换
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("tinyint"), "Integer"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("mediumint"), "Integer"
        )
        self.assertEqual(self.db_manager.mysql_data_type_transform("double"), "Float")
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("datetime"), "DateTime"
        )
        self.assertEqual(self.db_manager.mysql_data_type_transform("year"), "Integer")
        self.assertEqual(self.db_manager.mysql_data_type_transform("tinytext"), "Text")
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("mediumtext"), "Text"
        )
        self.assertEqual(self.db_manager.mysql_data_type_transform("longtext"), "Text")
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("tinyblob"), "LargeBinary"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("blob"), "LargeBinary"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("mediumblob"), "LargeBinary"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("longblob"), "LargeBinary"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("binary"), "LargeBinary"
        )
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("varbinary"), "LargeBinary"
        )
        self.assertEqual(self.db_manager.mysql_data_type_transform("enum"), "Text")
        self.assertEqual(self.db_manager.mysql_data_type_transform("set"), "Text")
        self.assertEqual(self.db_manager.mysql_data_type_transform("geometry"), "Text")
        self.assertEqual(self.db_manager.mysql_data_type_transform("point"), "Text")
        self.assertEqual(
            self.db_manager.mysql_data_type_transform("unknown_type"), "Unknown"
        )

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_primary_keys(self, mock_get_engine):
        """测试获取主键信息功能。

        测试获取指定表的主键约束信息，包括主键列名和约束名称。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_inspector = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.inspect.return_value = mock_inspector
        mock_get_engine.return_value = mock_engine

        # 模拟检查器方法
        mock_inspector.get_pk_constraint.return_value = {
            "constrained_columns": ["id"],
            "name": "pk_test",
        }

        # 测试成功获取主键信息
        pk_info = self.db_manager.get_primary_keys(
            self.test_db_name, self.test_table_name
        )
        self.assertEqual(pk_info["constrained_columns"], ["id"])
        self.assertEqual(pk_info["name"], "pk_test")

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_unique_keys(self, mock_get_engine):
        """测试获取唯一键信息功能。

        测试获取指定表的唯一约束信息，包括约束名称和列名。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_inspector = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.inspect.return_value = mock_inspector
        mock_get_engine.return_value = mock_engine

        # 模拟检查器方法
        mock_inspector.get_unique_constraints.return_value = [
            {"name": "uq_name", "column_names": ["name"]},
            {"name": "uq_email", "column_names": ["email"]},
        ]

        # 测试成功获取唯一键信息
        unique_keys = self.db_manager.get_unique_keys(
            self.test_db_name, self.test_table_name
        )
        self.assertEqual(len(unique_keys), 2)
        self.assertEqual(unique_keys[0]["name"], "uq_name")
        self.assertEqual(unique_keys[0]["column_names"], ["name"])

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_foreign_keys(self, mock_get_engine):
        """测试获取外键信息功能。

        测试获取指定表的外键约束信息，包括约束名称、引用表和列的映射关系。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_inspector = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.inspect.return_value = mock_inspector
        mock_get_engine.return_value = mock_engine

        # 模拟检查器方法
        mock_inspector.get_foreign_keys.return_value = [
            {
                "name": "fk_user",
                "referred_table": "users",
                "constrained_columns": ["user_id"],
                "referred_columns": ["id"],
            }
        ]

        # 测试成功获取外键信息
        foreign_keys = self.db_manager.get_foreign_keys(
            self.test_db_name, self.test_table_name
        )
        self.assertEqual(len(foreign_keys), 1)
        self.assertEqual(foreign_keys[0]["foreign_key_name"], "fk_user")
        self.assertEqual(foreign_keys[0]["referred_table"], "users")
        self.assertEqual(foreign_keys[0]["constrained_column"], "user_id")
        self.assertEqual(foreign_keys[0]["referred_column"], "id")

    def test_build_insert_data(self):
        """测试构建插入数据功能。

        测试INSERT SQL语句的构建，验证SQL语句格式和数据过滤的正确性。
        """
        # 测试数据
        table_name = "users"
        table_columns = ["id", "name", "email", "age"]
        columns = ["name", "email", "age"]
        data = {
            "name": "张三",
            "email": "zhangsan@example.com",
            "age": 25,
            "extra": "extra_field",
        }

        # 测试成功构建插入数据
        sql, data_res = self.db_manager.build_insert_data(
            table_name, table_columns, columns, data
        )
        self.assertIn("INSERT INTO users", sql)
        self.assertIn("name, email, age", sql)
        self.assertIn(":name, :email, :age", sql)
        self.assertEqual(data_res["name"], "张三")
        self.assertEqual(data_res["email"], "zhangsan@example.com")
        self.assertEqual(data_res["age"], 25)
        self.assertNotIn("extra", data_res)

    def test_build_update_data(self):
        """测试构建更新数据功能。

        测试UPDATE SQL语句的构建，验证SET子句、WHERE子句和参数绑定的正确性。
        """
        # 测试数据
        table_name = "users"
        table_columns = ["id", "name", "email", "age"]
        columns = ["name", "email", "age"]
        data = {
            "name": "张三",
            "email": "zhangsan@example.com",
            "age": 25,
            "extra": "extra_field",
        }
        condition_columns = {"id": 1}

        # 测试成功构建更新数据
        sql, data_res = self.db_manager.build_update_data(
            table_name, table_columns, columns, data, condition_columns
        )
        self.assertIn("UPDATE users", sql)
        self.assertIn("name = :new_name, email = :new_email, age = :new_age", sql)
        self.assertIn("WHERE id = :id", sql)
        self.assertEqual(data_res["new_name"], "张三")
        self.assertEqual(data_res["new_email"], "zhangsan@example.com")
        self.assertEqual(data_res["new_age"], 25)
        self.assertEqual(data_res["id"], 1)
        self.assertNotIn("extra", data_res)

        # 测试无效条件列
        sql, data_res = self.db_manager.build_update_data(
            table_name, table_columns, columns, data, "invalid"
        )
        self.assertEqual(sql, "")
        self.assertEqual(data_res, {})

    def test_build_delete_data(self):
        """测试构建删除数据功能。

        测试DELETE SQL语句的构建，验证WHERE子句和参数绑定的正确性。
        """
        # 测试数据
        table_name = "users"
        table_columns = ["id", "name", "email", "age"]
        condition_columns = {"id": 1, "name": "张三"}

        # 测试成功构建删除数据
        sql, data_res = self.db_manager.build_delete_data(
            table_name, table_columns, condition_columns
        )
        self.assertIn("DELETE FROM users", sql)
        self.assertIn("WHERE id = :id AND name = :name", sql)
        self.assertEqual(data_res["id"], 1)
        self.assertEqual(data_res["name"], "张三")

        # 测试无效条件列
        sql, data_res = self.db_manager.build_delete_data(
            table_name, table_columns, "invalid"
        )
        self.assertEqual(sql, "")
        self.assertEqual(data_res, {})

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_table_row_count(self, mock_get_engine):
        """测试获取表行数功能。

        测试获取指定表的记录总数。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.execute.return_value = mock_result
        mock_result.scalar.return_value = 100
        mock_get_engine.return_value = mock_engine

        # 测试成功获取表行数
        row_count = self.db_manager.get_table_row_count(
            self.test_db_name, self.test_table_name
        )
        self.assertEqual(row_count, 100)

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_table_size(self, mock_get_engine):
        """测试获取表大小功能。

        测试获取指定表的存储空间大小。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        # 模拟数据库引擎
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_result = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_conn.execute.return_value = mock_result
        mock_result.scalar.return_value = 1024
        mock_get_engine.return_value = mock_engine

        # 测试成功获取表大小
        table_size = self.db_manager.get_table_size(
            self.test_db_name, self.test_table_name
        )
        self.assertEqual(table_size, 1024)

    @patch("parts.db_manage.db_manager.schema.DbManager.get_engine")
    def test_get_comment_sql_with_length(self, mock_get_engine):
        """测试带长度参数的数据类型注释SQL生成。

        测试数据库方言适配器生成列注释SQL的功能，包括带长度参数和不带长度参数的类型。

        Args:
            mock_get_engine: 模拟的数据库引擎获取方法
        """
        from parts.db_manage.db_manager.dialect import DialectAdapter

        # 模拟MySQL引擎
        mock_engine = MagicMock()
        mock_engine.dialect.name = "mysql"
        mock_get_engine.return_value = mock_engine

        # 创建适配器
        adapter = DialectAdapter(mock_engine)

        # 测试带长度参数的VARCHAR类型
        column_with_length = {
            "name": "name",
            "type": "VARCHAR",
            "length": 255,
            "comment": "用户姓名",
        }

        comment_sql = adapter.get_comment_sql("users", column_with_length)
        expected_sql = (
            "ALTER TABLE users MODIFY COLUMN name VARCHAR(255) COMMENT '用户姓名'"
        )
        self.assertEqual(comment_sql, expected_sql)

        # 测试不带长度参数的TEXT类型
        column_without_length = {
            "name": "description",
            "type": "TEXT",
            "comment": "描述信息",
        }

        comment_sql = adapter.get_comment_sql("users", column_without_length)
        expected_sql = (
            "ALTER TABLE users MODIFY COLUMN description TEXT COMMENT '描述信息'"
        )
        self.assertEqual(comment_sql, expected_sql)

        # 测试带长度参数的INT类型
        column_int_with_length = {
            "name": "age",
            "type": "INT",
            "length": 11,
            "comment": "年龄",
        }

        comment_sql = adapter.get_comment_sql("users", column_int_with_length)
        expected_sql = "ALTER TABLE users MODIFY COLUMN age INT(11) COMMENT '年龄'"
        self.assertEqual(comment_sql, expected_sql)

        # 测试没有注释的列
        column_no_comment = {"name": "email", "type": "VARCHAR", "length": 100}

        comment_sql = adapter.get_comment_sql("users", column_no_comment)
        self.assertIsNone(comment_sql)


if __name__ == "__main__":
    unittest.main()
