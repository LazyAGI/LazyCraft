# Copyright (c) 2025 SenseTime. All Rights Reserved.
# Author: LazyLLM Team,  https://github.com/LazyAGI/LazyLLM
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

import re
from datetime import datetime
from io import BytesIO

import pandas as pd
from flask import abort, request, send_file
from flask_login import current_user
from flask_restful import reqparse

from core.restful import Resource
from libs.login import login_required
from parts.urls import api
from utils.util_database import db

from .fields import pagination_schema, table_pagination_schema
from .model import DataBaseInfo
from .service import DBManageService


class DBManageDatabaseBase(Resource):
    # 获取所有数据库
    # @login_required
    # def get(self):
    #     parser = reqparse.RequestParser()
    #     parser.add_argument('page', type=int, default=1, location='args', help='Page number must be an integer')
    #     parser.add_argument('limit', type=int, default=10, location='args', help='Limit must be an integer')
    #     parser.add_argument('db_name', type=str, default='', location='args', help='')
    #     parser.add_argument('qtype', type=str, location='args', required=False,
    #                         default="mine")  # mine/group/builtin/already
    #     args = parser.parse_args()
    #     """Get all databases"""
    #     service = DBManageService(current_user)
    #     result = service.get_all_databases(args)
    #     return pagination_schema.dump(result)

    # 创建数据库
    @login_required
    def post(self):
        """创建新数据库。

        接收数据库名称和注释，验证名称格式，然后创建新的数据库。
        要求数据库名称以字母开头，只能包含字母、数字和下划线，且长度不超过20。

        Returns:
            dict: 包含创建结果的响应字典

        Raises:
            Exception: 当数据库名称格式无效或创建失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "db_name", type=str, required=True, help="Database name is required"
        )
        parser.add_argument(
            "comment", type=str, required=True, help="Database comment is required"
        )
        args = parser.parse_args()
        self.check_can_write()

        service = DBManageService(current_user)
        try:
            # 正则表达式：以字母开头，后面跟零个或多个字母、数字或下划线
            pattern = r"^[a-zA-Z][a-zA-Z0-9_]*$"
            if (
                not bool(re.fullmatch(pattern, args["db_name"]))
                or len(args["db_name"]) > 20
            ):
                raise Exception(
                    "数据库称只能包含 '[a-z][0-9]_' 等字符并以字母开头并且长度不大于20"
                )
            result = service.create_db(args["db_name"], args["comment"])
        except Exception as e:
            return {"message": str(e), "code": 400}, 400

        return {"message": "success", "code": 200, "data": result["data"]}, 200


class DBManageDatabaseBaseList(Resource):
    # 获取所有数据库
    @login_required
    def post(self):
        """获取数据库列表（分页）。

        分页获取用户可访问的数据库列表，支持按数据库名称筛选、
        按查询类型筛选和按用户ID筛选。

        Request Body:
            page (int): 页码，默认为1
            limit (int): 每页数量，默认为10
            db_name (str): 数据库名称筛选，默认为空
            qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
            user_id (list): 用户ID列表筛选，默认为空列表

        Returns:
            dict: 分页的数据库信息列表
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=int,
            default=1,
            location="json",
            help="Page number must be an integer",
        )
        parser.add_argument(
            "limit",
            type=int,
            default=10,
            location="json",
            help="Limit must be an integer",
        )
        parser.add_argument("db_name", type=str, default="", location="json", help="")
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="already"
        )  # mine/group/builtin/already
        parser.add_argument("user_id", type=list, default=[], location="json", help="")
        args = parser.parse_args()
        
        self.check_can_read()
        
        """Get all databases"""
        service = DBManageService(current_user)
        result = service.get_all_databases(args)
        return pagination_schema.dump(result)


class DBManageDatabase(Resource):
    @login_required
    def put(self, database_id):
        """更新数据库信息。

        更新指定数据库的名称和注释信息。

        Args:
            database_id (int): 数据库ID

        Request Body:
            db_name (str): 新的数据库名称
            comment (str): 新的数据库注释

        Returns:
            dict: 包含更新结果的响应字典

        Raises:
            Exception: 当更新失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("db_name", type=str, required=True, location="json")
        parser.add_argument("comment", type=str, required=True, location="json")
        args = parser.parse_args()
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_write_object(database_model)
        
        try:
            result = service.update_db(
                database_id=database_id,
                db_name=args["db_name"],
                comment=args["comment"],
            )
        except Exception as e:
            return {"message": str(e), "code": 400}, 400

        return {"message": "success", "code": 200, "data": result["data"]}, 200

    # 删除数据库
    @login_required
    def delete(self, database_id):
        """删除数据库。

        删除指定的数据库，需要管理员权限。

        Args:
            database_id (int): 要删除的数据库ID

        Returns:
            dict: 包含删除结果的响应字典
        """
        service = DBManageService(current_user)

        database_model = service.get_database_info_by_id(database_id)
        if not database_model:
            raise ValueError("数据库不存在")
        
        # 检查用户是否有权限删除该数据库（需要对该数据库有管理员权限）
        self.check_can_admin_object(database_model)
            
        result, message = service.delete_db(database_id=database_id)
        if result:
            return {"message": message, "code": 200}, 200
        else:
            return {"message": message, "code": 400}, 400


class DBManageTableList(Resource):
    # 获取表结构
    @login_required
    def get(self, database_id):
        """获取数据库中的表列表。

        分页获取指定数据库中的所有表，支持按表名筛选。

        Args:
            database_id (int): 数据库ID

        Query Parameters:
            page (int): 页码，默认为1
            limit (int): 每页数量，默认为10
            table_name (str): 表名筛选，默认为空

        Returns:
            dict: 分页的表信息列表
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=int,
            default=1,
            location="args",
            help="Page number must be an integer",
        )
        parser.add_argument(
            "limit",
            type=int,
            default=10,
            location="args",
            help="Limit must be an integer",
        )
        parser.add_argument(
            "table_name", type=str, default="", location="args", help=""
        )
        args = parser.parse_args()
        service = DBManageService(current_user)

        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_read_object(database_model)
            
        result = service.get_all_table(database_id=database_id, args=args)
        return table_pagination_schema.dump(result)


class DBManageTableByName(Resource):
    # 获取表结构
    @login_required
    def get(self, database_id, table_name):
        """根据表名获取表结构。

        获取指定数据库中指定表名的表结构信息。

        Args:
            database_id (int): 数据库ID
            table_name (str): 表名

        Returns:
            dict: 包含表结构信息的响应字典
        """
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_read_object(database_model)
        
        try:
            result = service.get_table_structure(
                database_id=database_id, table_id=None, table_name=table_name
            )
            return {"code": 200, "data": result}, 200
        except Exception as e:
            return {"code": 400, "message": str(e)}, 400


class DBManageTable(Resource):
    # 获取表结构
    @login_required
    def get(self, database_id, table_id):
        """根据表ID获取表结构。

        获取指定数据库中指定表ID的表结构信息。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Returns:
            dict: 包含表结构信息的响应字典
        """
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_read_object(database_model)
            
        try:
            result = service.get_table_structure(
                database_id=database_id, table_id=table_id
            )
            result["table_id"] = table_id
            return {"code": 200, "data": result}, 200
        except Exception as e:
            return {"code": 400, "message": str(e)}, 400

    # 编辑表结构
    @login_required
    def put(self, database_id, table_id):
        """编辑表结构。

        修改指定表的结构，包括表名、注释和列定义。
        需要写入权限。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Request Body:
            table_name (str): 新的表名
            comment (str): 新的表注释
            columns (list): 列定义列表

        Returns:
            dict: 包含修改结果的响应字典

        Raises:
            Exception: 当列类型为空或修改失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("table_name", type=str, required=True, location="json")
        parser.add_argument("comment", type=str, required=True, location="json")
        parser.add_argument(
            "columns", type=dict, required=True, action="append", location="json"
        )
        args = parser.parse_args()
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_write_object(database_model)
            
        try:
            for col in args["columns"]:
                if not col["type"]:
                    return {"code": 400, "message": f'{col["name"]}类型不能为空'}, 400
            result, message = service.edit_table_structure(
                database_id,
                table_id,
                args["table_name"],
                args["comment"],
                args["columns"],
            )
            if result:
                return {"code": 200, "message": message}, 200
            else:
                return {"code": 400, "message": message}, 400
        except Exception as e:
            return {"code": 400, "message": str(e)}, 400

    # 删除表
    @login_required
    def delete(self, database_id, table_id):
        """删除表。

        删除指定数据库中的指定表，需要管理员权限。

        Args:
            database_id (int): 数据库ID
            table_id (int): 要删除的表ID

        Returns:
            dict: 包含删除结果的响应字典
        """
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if not database_model:
            raise ValueError("数据库不存在")
        
        # 检查用户是否有权限删除该表（需要对该数据库有管理员权限）
        self.check_can_admin_object(database_model)
        
        try:
            result, message = service.delete_table(
                database_id=database_id, table_id=table_id
            )
            if result:
                return {"code": 200, "message": message}, 200
            else:
                return {"code": 400, "message": message}, 400
        except Exception as e:
            return {"code": 400, "message": str(e)}, 400


class DBManageTableCreate(Resource):
    # 创建表结构
    @login_required
    def post(self, database_id):
        """创建新表。

        在指定数据库中创建新表，包括表名、注释和列定义。
        需要写入权限。

        Args:
            database_id (int): 数据库ID

        Request Body:
            table_name (str): 表名
            comment (str): 表注释
            columns (list): 列定义列表

        Returns:
            dict: 包含创建结果的响应字典

        Raises:
            Exception: 当列类型为空或创建失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("table_name", type=str, required=True, location="json")
        parser.add_argument("comment", type=str, required=True, location="json")
        parser.add_argument(
            "columns", type=dict, required=True, action="append", location="json"
        )
        args = parser.parse_args()
        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if not database_model:
            raise ValueError("数据库不存在")
        
        # 检查用户是否有权限在该数据库中创建表（需要对该数据库有写权限）
        self.check_can_write_object(database_model)
            
        try:
            for col in args["columns"]:
                if not col["type"]:
                    return {"code": 400, "message": f'{col["name"]}类型不能为空'}, 400
            result, message = service.create_table_structure(
                database_id=database_id,
                table_name=args["table_name"],
                comment=args["comment"],
                columns=args["columns"],
            )
            if result:
                return {"code": 200, "message": message}, 200
            else:
                return {"code": 400, "message": message}, 400
        except Exception as e:
            return {"code": 400, "message": str(e)}, 400


class DataImport(Resource):

    def get(self, database_id, table_id):
        """下载数据导入模板。

        生成并下载指定表的Excel导入模板文件，包含表的所有列。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Returns:
            File: Excel格式的导入模板文件

        Raises:
            Exception: 当生成模板失败时抛出
        """
        try:
            service = DBManageService(None)

            table_info = service.get_table_info_by_id(table_id)
            # 获取表结构
            columns = service.get_table_structure(
                database_id=database_id, table_id=table_info.id
            )["columns"]
            # 创建模板 DataFrame
            df = pd.DataFrame(columns=[col["name"] for col in columns])
            # 转换为 Excel 文件
            output = BytesIO()
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="Template")
                # 设置列宽
                worksheet = writer.sheets["Template"]
                for i, col in enumerate(df.columns):
                    worksheet.set_column(i, i, 20)

            output.seek(0)
            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f"{table_info.name}_import_template.xlsx",
            )
        except Exception as e:
            abort(400, message=f"Failed to generate template: {str(e)}")

    @login_required
    def post(self, database_id, table_id):
        """上传并预览导入数据。

        上传Excel文件并预览要导入的数据，包括数据验证和格式转换。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Form Data:
            file: 要上传的Excel文件

        Returns:
            dict: 包含预览数据的字典，包括总行数、列定义和数据

        Raises:
            ValueError: 当未上传文件时抛出
            Exception: 当处理文件失败时抛出
        """
        if "file" not in request.files:
            raise ValueError("请上传文件")
        file = request.files["file"]
        try:
            service = DBManageService(current_user)
            database_model = service.get_database_info_by_id(database_id)
            if database_model:
                self.check_can_write_object(database_model)
            
            table_info = service.get_table_info_by_id(table_id)
            columns = service.get_table_structure(
                database_id=database_id, table_id=table_info.id
            )["columns"]
            # 读取上传的 Excel 文件
            df = pd.read_excel(file)
            column_names = [r["name"] for r in columns]
            data = df.to_dict(orient="records")
            column_types = {col["name"]: col.get("type", "text") for col in columns}
            result_data = []
            for row in data:
                filtered_row = {k: v for k, v in row.items() if k in column_names}
                for col_name, value in filtered_row.items():
                    col_type = column_types.get(col_name, "text").lower()
                    if pd.isna(value):  # 处理空值
                        filtered_row[col_name] = None
                        continue
                    # 如果是日期类型，格式化为字符串
                    if "date" in col_type or "timestamp" in col_type:
                        if isinstance(value, datetime):
                            filtered_row[col_name] = value.strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )  # 自定义格式
                        elif isinstance(
                            value, str
                        ):  # 如果已经是字符串，尝试解析并格式化
                            try:
                                dt = pd.to_datetime(value)
                                filtered_row[col_name] = dt.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                )
                            except (ValueError, TypeError) as e:
                                abort(400, message=f"Error processing file: {str(e)}")
                result_data.append(filtered_row)

                # 返回预览数据
            preview_data = {
                "total_rows": len(result_data),
                "columns": columns,
                "data": result_data,
            }
            return preview_data
        except Exception as e:
            abort(400, message=f"Error processing file: {str(e)}")

    @login_required
    def put(self, database_id, table_id):
        """执行数据导入。

        根据预览的数据执行实际的数据导入操作。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Request Body:
            action (str): 操作类型，只支持"import"
            data (list): 要导入的数据列表

        Returns:
            dict: 包含导入结果的响应字典

        Raises:
            Exception: 当导入失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "action",
            type=str,
            required=True,
            choices=["preview", "import"],
            location="json",
            help='Action must be either "preview" or "import"',
        )
        parser.add_argument(
            "data", type=list, location="json", required=False, help="最终数据"
        )
        args = parser.parse_args()

        service = DBManageService(current_user)
        database_model = service.get_database_info_by_id(database_id)
        if database_model:
            self.check_can_write_object(database_model)

        try:
            if args["action"] == "import":
                # 执行数据导入
                flag, error, exception = service.import_data(
                    database_id=database_id, table_id=table_id, data=args["data"]
                )
                if flag:
                    return {"code": 200, "message": "success"}, 200
                else:
                    return {"code": 400, "message": error}, 400
        except Exception as e:
            abort(400, message=f"Error processing file: {str(e)}")


class TableDataManager(Resource):
    @login_required
    def get(self, database_id, table_id):
        """获取表数据（分页）。

        分页获取指定表中的数据记录。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Query Parameters:
            page (int): 页码，默认为1
            limit (int): 每页数量，默认为10

        Returns:
            dict: 分页的表数据
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=int,
            default=1,
            location="args",
            help="Page number must be an integer",
        )
        parser.add_argument(
            "limit",
            type=int,
            default=10,
            location="args",
            help="Limit must be an integer",
        )
        args = parser.parse_args()
        database = db.session.get(DataBaseInfo, database_id)
        if database:
            self.check_can_read_object(database)

        service = DBManageService(current_user)
        page_data = service.select_data(
            database_id=database_id,
            table_id=table_id,
            page=args["page"],
            limit=args["limit"],
        )

        return page_data

    @login_required
    def put(self, database_id, table_id):
        """批量更新表数据。

        批量执行表数据的增加、更新和删除操作。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Request Body:
            add_items (list): 要添加的数据项列表
            update_items (list): 要更新的数据项列表
            delete_items (list): 要删除的数据项列表
            table_name (str): 表名

        Returns:
            dict: 包含操作结果的响应字典
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "add_items",
            type=list,
            help="需要更新的表数据对象",
            location="json",
        )
        parser.add_argument(
            "update_items",
            type=list,
            help="需要更新的表数据对象",
            location="json",
        )
        parser.add_argument(
            "delete_items",
            type=list,
            help="需要更新的表数据对象",
            location="json",
        )

        parser.add_argument("table_name", type=str, help="Limit must be an integer")
        args = parser.parse_args()
        database = db.session.get(DataBaseInfo, database_id)
        if database:
            self.check_can_write_object(database)

        service = DBManageService(current_user)
        flag, error, exception = service.update_data(
            database_id=database_id,
            table_id=table_id,
            add_items=args["add_items"],
            update_items=args["update_items"],
            delete_items=args["delete_items"],
        )
        if flag:
            return {"code": 200, "message": "success"}, 200
        else:
            return {"code": 400, "message": error[0]["error"]}, 400

    @login_required
    def delete(self, database_id, table_id):
        """删除表数据。

        删除指定表中的数据记录。

        Args:
            database_id (int): 数据库ID
            table_id (int): 表ID

        Request Body:
            data_items (list): 要删除的数据项列表
            table_name (str): 表名

        Returns:
            dict: 包含删除结果的响应字典
        """
        parser = reqparse.RequestParser()
        parser.add_argument("data_items", type=list, help="删除表数据", location="json")
        parser.add_argument("table_name", type=str, help="Limit must be an integer")
        args = parser.parse_args()
        database = db.session.get(DataBaseInfo, database_id)
        if database:
            self.check_can_write_object(database)
        service = DBManageService(current_user)
        flag, error, exception = service.delete_data(
            database_id=database_id, table_id=table_id, data=args["data_items"]
        )
        if flag:
            return {"code": 200, "message": "success"}, 200
        else:
            return {"code": 400, "message": error}, 400


# 路由注册
api.add_resource(DBManageDatabaseBase, "/database")
api.add_resource(DBManageDatabaseBaseList, "/database/list/page")
api.add_resource(DBManageDatabase, "/database/<database_id>")
api.add_resource(DataImport, "/database/import/<database_id>/<table_id>")
api.add_resource(DBManageTableList, "/database/<database_id>/table/list")
api.add_resource(DBManageTableCreate, "/database/<database_id>/table")
api.add_resource(DBManageTable, "/database/<database_id>/table/<table_id>")
api.add_resource(DBManageTableByName, "/database/<database_id>/table_name/<table_name>")
api.add_resource(TableDataManager, "/database/<database_id>/table_data/<table_id>")
