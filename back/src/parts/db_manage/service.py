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

import ast
import decimal
import hashlib
import re
import traceback
from datetime import datetime

from sqlalchemy import func, inspect, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from configs import lazy_config
from models.model_account import Account, Tenant
from utils.util_database import db

from .db_manager import DbManager
from .model import DataBaseInfo, TableInfo


def _generate_unique_name(tenant_id: str, database_name: str) -> str:
    """
    生成唯一的数据库名称，基于 tenant_id 和 database_name，符合 PostgreSQL 命名规则。

    :param tenant_id: 租户 ID
    :param database_name: 数据库名称
    :return: 生成的唯一 name
    """
    # 清理输入：只保留字母、数字和下划线，替换其他字符为下划线
    clean_tenant_id = "".join(c if c.isalnum() else "_" for c in tenant_id)
    clean_db_name = "".join(c if c.isalnum() else "_" for c in database_name)

    # 添加固定前缀，确保以字母开头
    prefix = "db"

    # 基本字符串：前缀 + tenant_id + database_name
    base_str = f"{prefix}_{clean_tenant_id}_{clean_db_name}"

    # 生成短唯一标识（MD5 前 8 位）
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_suffix = hashlib.md5(f"{base_str}_{timestamp}".encode()).hexdigest()[:8]

    # 组合初步名称
    name = f"{base_str}_{unique_suffix}"

    # 限制长度为 63 个字符（PostgreSQL 最大限制）
    if len(name) > 63:
        # 截断 base_str，保留 unique_suffix 和前缀
        max_base_len = 63 - len(unique_suffix) - len(prefix) - 2  # 减去两个下划线
        name = f"{prefix}_{base_str[:max_base_len]}_{unique_suffix}"

    while (
        db.session.query(DataBaseInfo)
        .filter(func.lower(DataBaseInfo.name) == name.lower())
        .first()
    ):
        unique_suffix = hashlib.md5(f"{base_str}_{unique_suffix}".encode()).hexdigest()[
            :8
        ]
        name = f"{prefix}_{base_str[:max_base_len]}_{unique_suffix}"

    return name.lower()  # 返回小写名称（PostgreSQL 名称大小写不敏感）


def truncate_from_last_slash(text: str) -> str:
    """从字符串的最后一个斜杠处截断。

    保留从字符串开头到最后一个'/'的部分（包括最后一个'/'）。
    如果字符串中没有'/'，则返回原字符串。

    Args:
        text (str): 输入字符串

    Returns:
        str: 截断后的字符串
    """
    last_slash_index = text.rfind("/")
    if last_slash_index == -1:  # 如果没有找到 '/'
        return text  # 返回原字符串
    return text[: last_slash_index + 1]  # 包含最后一个 '/'


class DBManageService:
    def __init__(self, account):
        """初始化数据库管理服务。

        Args:
            account: 当前用户账号对象
        """
        self.account = account

    @staticmethod
    def get_builtin_database_info(database_id):
        """获取内置数据库的连接信息。

        根据数据库ID获取内置数据库的连接配置信息。

        Args:
            database_id: 数据库ID

        Returns:
            dict: 包含数据库连接信息的字典
        """
        database_info = DataBaseInfo.query.get(database_id)
        return {
            # "db_type": "PostgreSQL",  # PostgreSQL配置
            "db_type": "MySQL",  # MySQL配置
            "user": lazy_config.DB_USERNAME,
            "password": lazy_config.DB_PASSWORD,
            "host": lazy_config.DB_HOST,
            "port": lazy_config.DB_PORT,
            "db_name": database_info.database_name,
            "options_str": lazy_config.DB_EXTRAS,
        }

    def create_db(self, db_name, comment):
        """创建数据库信息并在数据库系统中创建实际数据库。

        生成唯一的数据库名称，保存数据库信息到系统表，并在数据库系统中创建实际的数据库。

        Args:
            db_name (str): 用户指定的数据库名称
            comment (str): 数据库描述信息

        Returns:
            dict: 包含创建结果的字典，成功时包含data字段

        Raises:
            Exception: 当数据库名称无效、已存在或创建失败时抛出
        """
        res = {}
        try:
            # 生成唯一的 name
            name = _generate_unique_name(
                self.account.current_tenant_id, database_name=db_name
            )
            uri = truncate_from_last_slash(lazy_config.SQLALCHEMY_DATABASE_URI)
            # 创建数据库信息对象
            db_info = DataBaseInfo(
                tenant_id=self.account.current_tenant_id,
                created_by=self.account.id,
                name=db_name,
                database_name=name,
                comment=comment,
                url=uri,
                # type="postgresql",  # PostgreSQL配置
                type="mysql",  # MySQL配置
                # created_at 和 updated_at 由数据库自动生成，无需手动设置
            )

            # 添加到会话并提交
            db.session.add(db_info)
            db.session.commit()
            config = self.build_config(db_info)
            manager = DbManager(config)
            if not manager.is_valid_name(db_name) or len(db_name) > 20:
                raise Exception(
                    "数据库称只能包含 '[a-z][0-9]_' 等字符并以字母开头并且长度不大于20"
                )
            res_flag, message = manager.create_database(
                db_info.database_name, db_info.comment
            )
            if res_flag:
                db.session.commit()
                info = db_info.to_dict()
                info.pop("url")
                res["data"] = info
            else:
                db.session.rollback()
                raise Exception(message)
            return res
        except Exception as e:
            db.session.rollback()  # 回滚事务
            error_msg = str(e)
            if (
                "uq_database_info_name_tenant" in error_msg.lower()
                and "duplicate entry" in error_msg.lower()
            ):
                raise Exception("数据库名称已存在，请使用其他名称")
            raise Exception(f"创建数据库失败: {error_msg}")

    def update_db(self, database_id, db_name, comment):
        """更新数据库信息。

        更新现有数据库的名称和描述信息。

        Args:
            database_id (int): 数据库ID
            db_name (str): 新的数据库名称
            comment (str): 新的数据库描述

        Returns:
            dict: 包含更新后数据库信息的字典

        Raises:
            Exception: 当更新失败时抛出
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        try:
            res = {}
            database_info.comment = comment
            name = _generate_unique_name(
                self.account.current_tenant_id, database_name=db_name
            )
            config = self.build_config(database_info)
            manager = DbManager(config)
            res_flag, message = manager.update_database(
                database_info.database_name, name, comment
            )
            if res_flag:
                database_info.database_name = name
                database_info.name = db_name
                db.session.commit()
                info = database_info.to_dict()
                info.pop("url")
                res["data"] = info
            else:
                db.session.rollback()
                raise Exception(message)
            return res
        except Exception as e:
            db.session.rollback()  # 回滚事务
            raise Exception(f"Failed to create database info: {str(e)}")

    def get_table_structure(self, database_id, table_id, table_name: str = None):
        """获取表结构信息。

        获取指定表的完整结构信息，包括列定义、约束等。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID，可选
            table_name (str): 表名，当table_id为None时使用

        Returns:
            dict: 包含表结构信息的字典
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        if table_id is None:
            table_info = (
                db.session.query(TableInfo).where(TableInfo.name == table_name).first()
            )
        else:
            table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)
        res = manager.get_table_structure(database_info.database_name, table_info.name)
        res["table_id"] = table_info.id
        return res

    def get_database_info_by_id(self, id):
        """根据ID获取数据库信息。

        Args:
            id (int): 数据库ID

        Returns:
            DataBaseInfo: 数据库信息对象，如果不存在返回None
        """
        return db.session.get(DataBaseInfo, id)

    def get_table_info_by_id(self, id):
        """根据ID获取表信息。

        Args:
            id (int): 表ID

        Returns:
            TableInfo: 表信息对象，如果不存在返回None
        """
        return db.session.get(TableInfo, id)

    def delete_table(self, database_id, table_id):
        """删除数据表。

        从数据库中删除指定的表，并删除对应的表信息记录。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Returns:
            tuple: (是否成功, 消息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)
        res, message = manager.delete_table(
            database_info.database_name, table_info.name
        )
        if res:
            db.session.delete(table_info)
            db.session.commit()
        return res, message

    def delete_db(self, database_id):
        """删除数据库。

        从数据库系统中删除指定的数据库，并删除对应的数据库信息记录。

        Args:
            database_id (int): 数据库ID

        Returns:
            tuple: (是否成功, 消息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        config = self.build_config(database_info)
        manager = DbManager(config)

        db.session.delete(database_info)

        result, message = manager.delete_database(database_info.database_name)
        if result:
            db.session.delete(database_info)
            db.session.commit()
        return result, message

    def get_all_table(self, database_id, args):
        """获取数据库中的所有表信息。

        分页获取指定数据库中的表列表，支持按表名筛选。

        Args:
            database_id (int): 数据库ID
            args (dict): 查询参数，包含page、limit、table_name等

        Returns:
            Pagination: 分页的表信息对象
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        if not database_info:
            raise ValueError(f"当前数据库: {database_id} 不存在")
        config = self.build_config(database_info)
        manager = DbManager(config)
        filters = [TableInfo.database_id == database_id]
        if args.get("table_name", ""):
            filters.append(
                func.lower(TableInfo.name).like(f"%{args.get('table_name', '')}%")
            )
        pagination = db.paginate(
            db.select(TableInfo).where(*filters).order_by(TableInfo.created_at.desc()),
            page=args["page"],
            per_page=args["limit"],
            error_out=False,
        )
        for i in pagination.items:
            row_count = manager.get_table_row_count(
                db_name=database_info.database_name, table_name=i.name
            )
            i.row_count = row_count
        return pagination

    def create_table_structure(self, database_id, table_name: str, comment, columns):
        """创建表结构。

        在指定数据库中创建新表，包括列定义、约束等，并保存表信息到系统表。

        Args:
            database_id (int): 数据库ID
            table_name (str): 表名称
            comment (str): 表描述信息
            columns (list): 列定义列表

        Returns:
            tuple: (是否成功, 消息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        config = self.build_config(database_info)
        manager = DbManager(config)
        table_name = table_name.rstrip().lower()
        res, message = manager.create_table_structure(
            database_info.database_name, table_name, comment, columns
        )
        if res:
            table_info = TableInfo()
            table_info.comment = comment
            table_info.database_id = database_id
            table_info.name = (table_name,)
            table_info.created_by = self.account.id
            table_info.tenant_id = self.account.current_tenant_id
            db.session.add(table_info)
            db.session.commit()
        # 检查database_name下的表是否和table_info里一致，有不一致的要在database_name里删除
        tables = manager.get_all_tables(database_info.database_name)
        table_infos = (
            db.session.query(TableInfo)
            .filter(TableInfo.database_id == database_id)
            .all()
        )
        table_info_tables = [t.name for t in table_infos]
        for tab in tables:
            if tab not in table_info_tables:
                manager.delete_table(database_info.database_name, tab)
        return res, message

    def edit_table_structure(self, database_id, table_id, table_name, comment, columns):
        """编辑表结构。

        修改现有表的结构，包括表名、注释和列定义。只允许修改没有数据的表。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID
            table_name (str): 新的表名称
            comment (str): 新的表描述信息
            columns (list): 新的列定义列表

        Returns:
            tuple: (是否成功, 消息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        if table_info:
            config = self.build_config(database_info)
            manager = DbManager(config)
            row_count = manager.get_table_row_count(
                db_name=database_info.database_name, table_name=table_info.name
            )
            if row_count > 0:
                return False, "有数据的表不允许修改表结构"
            res, message = manager.edit_table_structure(
                db_name=database_info.database_name,
                old_table_name=table_info.name,
                table_name=table_name,
                columns=columns,
            )
            if res:
                table_info.name = (table_name,)
                table_info.comment = comment
                db.session.commit()
            return res, message

    def get_all_databases(self, args):
        """获取数据库列表。

        根据查询条件分页获取数据库列表，支持按名称筛选、按用户筛选、按类型筛选等。

        Args:
            args (dict): 查询参数，包含page、limit、db_name、user_id、qtype等

        Returns:
            Pagination: 分页的数据库信息对象
        """
        model_cls = DataBaseInfo
        filters = []
        if args.get("db_name", ""):
            # 对db_name中的通配符进行转义处理
            db_name = args.get("db_name", "").lower()
            db_name = db_name.replace("%", "\\%").replace("_", "\\_")
            args["db_name"] = db_name
            filters.append(
                func.lower(model_cls.name).like(f"%{args.get('db_name', '')}%")
            )
        if args.get("user_id"):
            filters.append(model_cls.created_by.in_(args["user_id"]))
        if args.get("qtype") == "mine":  # 我的应用(包含草稿)
            filters.append(model_cls.tenant_id == self.account.current_tenant_id)
            filters.append(model_cls.created_by == self.account.id)
        elif args.get("qtype") == "group":  # 同组应用(包含草稿)
            filters.append(model_cls.tenant_id == self.account.current_tenant_id)
            filters.append(model_cls.created_by != self.account.id)
        elif args.get("qtype") == "builtin":  # 内置的应用
            filters.append(model_cls.created_by == self.account.get_administrator_id())
        elif args.get("qtype") == "already":  # 混合了前3者的数据
            from sqlalchemy import or_

            filters.append(
                or_(
                    model_cls.tenant_id == self.account.current_tenant_id,
                    model_cls.created_by == self.account.get_administrator_id(),
                )
            )

        pagination = db.paginate(
            db.select(DataBaseInfo)
            .where(*filters)
            .order_by(DataBaseInfo.created_at.desc()),
            page=args["page"],
            per_page=args["limit"],
            error_out=False,
        )
        # 往pagination结果添加user_name字段
        for i in pagination.items:
            if i.created_by and i.created_by == self.account.get_administrator_id():
                i.user_name = "Lazy LLM官方"
                if i.created_by_account:
                    i.created_by_account.name = "Lazy LLM官方"
            else:
                i.user_name = getattr(db.session.get(Account, i.created_by), "name", "")
        return pagination

    def build_config(self, database_info: DataBaseInfo):
        """构建数据库配置信息。

        根据数据库信息对象构建用于连接数据库的配置字典。

        Args:
            database_info (DataBaseInfo): 数据库信息对象

        Returns:
            dict: 包含数据库连接配置的字典
        """
        return {
            "endpoint": database_info.url,
            "database_name": database_info.database_name,
        }

    def select_data(self, database_id, table_id, page, limit):
        """查询表数据。

        分页查询指定表中的数据记录。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID
            page (int): 页码
            limit (int): 每页数量

        Returns:
            dict: 包含分页数据和表结构信息的字典
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)

        pagination = manager.select_table_data(
            db_name=database_info.database_name,
            table_name=table_info.name,
            page=page,
            limit=limit,
        )
        # schema = DyPaginationSchema.from_table(table)
        # res = schema.dump(pagination)
        res = pagination
        res["columns"] = manager.get_table_structure(
            db_name=database_info.database_name, table_name=table_info.name
        )
        return res

    def update_data(self, database_id, table_id, add_items, update_items, delete_items):
        """批量更新表数据。

        执行表数据的批量增加、更新和删除操作，并更新存储空间使用量。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID
            add_items (list): 要添加的数据项列表
            update_items (list): 要更新的数据项列表
            delete_items (list): 要删除的数据项列表

        Returns:
            tuple: (是否成功, 错误行列表, 异常信息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)
        error_rows = []
        engine = manager.get_engine(database_info.database_name)

        table_structure_res = self.get_table_structure(database_info.id, table_info.id)
        table_columns = []
        if table_structure_res:
            # 传递结构体列表，包含字段名和类型
            table_columns = [
                {"name": c["name"], "type": c["type"]}
                for c in table_structure_res["columns"]
            ]
        primary_keys = manager.get_primary_keys(
            database_info.database_name, table_name=table_info.name
        )["constrained_columns"]
        try:
            # 获取数据库操作之前大小
            before_table_size = manager.get_table_size(
                database_info.database_name, table_info.name
            )
            with engine.begin() as connection:
                if update_items:
                    for index, row in enumerate(update_items):
                        try:
                            new_data = row["new_data"]
                            old_data = row["old_data"]
                            self.validate_col_data(
                                new_data, table_structure_res["columns"]
                            )
                            cond_column = {
                                k: v for k, v in old_data.items() if k in primary_keys
                            }
                            columns = [k for k, _ in new_data.items()]
                            sql, data = manager.build_update_data(
                                table_info.name,
                                table_columns,
                                columns,
                                new_data,
                                cond_column,
                            )
                            connection.execute(text(sql), data)
                        except Exception as e:
                            # 记录错误行信息
                            error_info = {
                                "row": index + 1,  # 加2因为有标题行和从1开始计数
                                "old_data": old_data,
                                "error": "更新数据:" + self.db_error_msg(e),
                                "new_data": new_data,
                            }
                            error_rows.append(error_info)
                            raise Exception("更新数据出错")
                if delete_items:
                    for index, row in enumerate(delete_items):
                        try:
                            old_data = row
                            cond_column = {
                                k: v for k, v in old_data.items() if k in primary_keys
                            }
                            sql, data = manager.build_delete_data(
                                table_info.name,
                                [c["name"] for c in table_structure_res["columns"]],
                                cond_column,
                            )
                            connection.execute(text(sql), data)
                        except Exception as e:
                            # 记录错误行信息
                            error_info = {
                                "row": index + 1,  # 加2因为有标题行和从1开始计数
                                "old_data": old_data,
                                "error": "删除数据：" + str(e),
                            }
                            error_rows.append(error_info)
                            raise Exception("删除数据出错")
                if add_items:
                    for index, row in enumerate(add_items):
                        try:
                            self.validate_col_data(row, table_structure_res["columns"])
                            excel_columns = [k for k, v in row.items()]
                            sql, data = manager.build_insert_data(
                                table_info.name, table_columns, excel_columns, row
                            )
                            connection.execute(text(sql), data)
                        except Exception as e:
                            # 记录错误行信息
                            error_info = {
                                "row": index + 1,  # 加2因为有标题行和从1开始计数
                                "error": "添加数据: " + self.db_error_msg(e),
                                "data": row,
                            }
                            error_rows.append(error_info)
                            raise Exception("添加数据:" + str(e))
            # 获取数据库操作之后大小
            after_table_size = manager.get_table_size(
                database_info.database_name, table_info.name
            )
            Tenant.update_used_storage(
                database_info.tenant_id, before_table_size, after_table_size
            )
            # 全部成功
            return True, None, None
        except Exception as e:
            traceback.print_exc()
            return False, error_rows, str(e)

    def db_error_msg(self, e):
        """处理数据库错误信息。

        将数据库异常转换为用户友好的错误消息。

        Args:
            e (Exception): 数据库异常对象

        Returns:
            str: 用户友好的错误消息
        """
        error_msg = str(e).lower()
        if "unique constraint" in error_msg:
            return "唯一约束冲突，请检查数据是否重复"
        elif "foreign key constraint" in error_msg:
            return "外键约束冲突，请检查数据的外键关系"
        elif "not-null constraint" in error_msg:
            return "非空约束冲突，请检查数据是否包含必填字段"
        elif m := re.search(
            r"duplicate entry '(.+)' for key '(.+)\.primary'", error_msg
        ):
            value = m.group(1)
            return f"数据“{value}”为表的主键，已存在，不能重复。"
        elif re.search(r"column '(.+)' cannot be null", error_msg):
            col = re.search(r"column '(.+)' cannot be null", error_msg).group(1)
            return f"字段“{col}”不能为空，请检查数据是否包含必填字段"
        elif "data too long for column" in error_msg.lower():
            match = re.search(r"data too long for column '(.+?)'", error_msg.lower())
            column = match.group(1)
            return f"字段{column}数据太长"
        elif m := re.search(
            r"duplicate entry '(.+)' for key '(.+)_uniq'", error_msg.lower()
        ):
            value = m.group(1)
            return f'数据"{value}"已存在，其设定唯一不能重复。'
        elif m := re.search(
            r"in foreign key constraint '(.+)' are incompatible", error_msg.lower()
        ):
            value = m.group(1)
            return f'外键约束"{value}"冲突。'
        return str(e)

    def validate_col_data(self, data, table_columns):
        """验证列数据格式。

        根据表列定义验证输入数据的格式和类型是否正确。

        Args:
            data (dict or list): 要验证的数据
            table_columns (list): 表列定义列表

        Raises:
            Exception: 当数据格式不正确时抛出
        """
        if isinstance(data, dict):
            data = [data]
        for d in data:
            for col in table_columns:
                if not col["name"] in d:
                    continue
                if col["type"] in ["TIMESTAMP"]:
                    date_pattern = r"^\d{4}-\d{2}-\d{2}$"  # 匹配 YYYY-MM-DD
                    date_pattern2 = r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$"
                    if d[col["name"]]:
                        if not re.match(date_pattern, d[col["name"]]) and not re.match(
                            date_pattern2, d[col["name"]]
                        ):
                            raise Exception("日期类型格式不正确")
                elif col["type"] in ["INT", "INTEGER", "TINYINT", "BIGINT"]:
                    if d[col["name"]]:
                        try:
                            if isinstance(d[col["name"]], str):
                                val = ast.literal_eval(d[col["name"]])
                            else:
                                val = d[col["name"]]
                            if not isinstance(val, int):
                                raise Exception(f"{col['name']}整数类型格式不正确")
                        except Exception:
                            raise Exception(f"{col['name']}整数类型格式不正确")
                elif col["type"] in ["NUMERIC"]:
                    if d[col["name"]]:
                        try:
                            val = decimal.Decimal(d[col["name"]])
                        except Exception:
                            raise Exception(f"{col['name']} NUMERIC类型格式不正确")
                elif col["type"] in ["VARCHAR", "TEXT"]:
                    if d[col["name"]]:
                        if not isinstance(d[col["name"]], str):
                            raise Exception(
                                f"{col['name']} VARCHAR or TEXT类型格式不正确"
                            )

    def delete_data(self, database_id, table_id, data):
        """删除表数据。

        根据条件删除表中的数据记录，并更新存储空间使用量。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID
            data (list): 要删除的数据条件列表

        Returns:
            tuple: (是否成功, 错误行列表, 异常信息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)
        error_rows = []
        engine = manager.get_engine(database_info.database_name)

        table_structure_res = self.get_table_structure(database_info.id, table_info.id)
        table_columns = []
        if table_structure_res:
            table_columns = [c["name"] for c in table_structure_res["columns"]]
        try:
            # 获取数据库操作之前大小
            before_table_size = manager.get_table_size(
                database_info.database_name, table_info.name
            )
            with engine.begin() as connection:
                for index, row in enumerate(data):
                    try:
                        old_data = row["old_data"]
                        cond_column = old_data
                        sql, data = manager.build_delete_data(
                            table_info.name, table_columns, cond_column
                        )
                        connection.execute(text(sql), data)
                    except Exception as e:
                        # 记录错误行信息
                        error_info = {
                            "row": index + 1,  # 加2因为有标题行和从1开始计数
                            "old_data": old_data,
                            "error": str(e),
                        }
                        error_rows.append(error_info)
                        raise Exception("导入数据出错")
            # 获取数据库操作之后大小
            after_table_size = manager.get_table_size(
                database_info.database_name, table_info.name
            )
            Tenant.update_used_storage(
                database_info.tenant_id, before_table_size, after_table_size
            )
            # 全部成功
            return True, None, None
        except Exception as e:
            return False, error_rows, str(e)

    def import_data(self, database_id, table_id, data):
        """执行数据导入操作。

        将外部数据批量导入到指定的表中。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID
            data (list): 要导入的数据列表

        Returns:
            tuple: (是否成功, 错误行列表, 异常信息)
        """
        database_info = db.session.get(DataBaseInfo, database_id)
        table_info = db.session.get(TableInfo, table_id)
        config = self.build_config(database_info)
        manager = DbManager(config)

        error_rows = []
        engine = manager.get_engine(database_info.database_name)

        table_structure_res = self.get_table_structure(database_info.id, table_info.id)
        table_columns = []
        if table_structure_res:
            table_columns = [c["name"] for c in table_structure_res["columns"]]
        try:
            with engine.begin() as connection:
                for index, row in enumerate(data):
                    try:
                        excel_columns = [k for k, v in row.items()]
                        sql, data = manager.build_insert_data(
                            table_info.name, table_columns, excel_columns, row.to_dict()
                        )
                        connection.execute(text(sql), data)
                    except Exception as e:
                        # 记录错误行信息
                        error_info = {
                            "row": index + 1,  # 加2因为有标题行和从1开始计数
                            "error": str(e),
                            "data": row.to_dict(),
                        }
                        error_rows.append(error_info)
                        raise Exception("导入数据出错")
            # 全部成功
            return True, None, None
        except Exception as e:
            return False, error_rows, str(e)

    @staticmethod
    def get_model_columns_info(model_class):
        """获取数据库模型的列信息。

        获取SQLAlchemy模型类的所有列信息，包括列名、数据类型、注释和主键信息。

        Args:
            model_class: SQLAlchemy模型类

        Returns:
            list: 包含列信息的字典列表，每个字典包含name、data_type、comment、is_primary_key字段
        """
        inspector = inspect(model_class)
        columns_info = []
        for column in inspector.columns:
            # 处理 ARRAY、JSONB 和 JSON 类型，提取内部类型
            if isinstance(column.type, ARRAY):
                data_type = f"ARRAY({str(column.type.item_type)})"
            elif isinstance(column.type, JSONB):
                data_type = "JSONB"
            elif hasattr(column.type, "__class__") and "JSON" in str(
                column.type.__class__
            ):
                data_type = "JSON"
            else:
                data_type = str(column.type)
            columns_info.append(
                {
                    "name": column.name,
                    "data_type": data_type,  # 将数据类型转换为字符串
                    "comment": (
                        column.comment if column.comment else ""
                    ),  # 获取注释，如果为空则设置为空字符串
                    "is_primary_key": column.primary_key,
                }
            )
        return columns_info
