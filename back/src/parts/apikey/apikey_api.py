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

import time

from flask import request
from flask_login import current_user
from flask_restful import marshal, reqparse

from lazyllm.engine import LightEngine

from core.account_manager import AccountService, TenantService
from core.restful import Resource
from libs.login import login_required
from models.model_account import Tenant
from parts.apikey.apikey_service import ApikeyService
from parts.apikey.model import ApiKey, ApiKeyStatus
from parts.app.app_service import AppService
from parts.app.node_run.app_run_service import AppRunService
from parts.urls import api
from utils.util_database import db

from . import fields


class ApikeyApi(Resource):
    @login_required
    def get(self):
        """获取当前用户的所有API Key列表。

        Returns:
            dict: 包含API Key详细信息的字典，使用apikey_detail_fields格式化

        Raises:
            CommonError: 当查询失败时抛出
        """
        self.check_can_read()
        result = ApikeyService.query(current_user.id)  # 根据当前用户查询其名下的apikey
        tenslist = Tenant.query.all()

        # 遍历result，将result中的tenant_id使用逗号split，然后到tenslist中查询中文名称
        tenant_id_name_map = {str(t.id): t.name for t in tenslist}
        for item in result:
            if hasattr(item, "tenant_id") and item.tenant_id:
                tenant_ids = [
                    tid.strip() for tid in item.tenant_id.split(",") if tid.strip()
                ]
                # 获取tenant的中文名称
                tenant_names = [tenant_id_name_map.get(tid, tid) for tid in tenant_ids]
                # 兼容fields.py，tenant_list字段
                item.tenant_list = ",".join(tenant_names)
            else:
                item.tenant_list = ""

        return marshal(result, fields.apikey_detail_fields)

    @login_required
    def post(self):
        """创建新的API Key。

        Args:
            description (str, optional): API Key的描述信息
            expire_date (str, optional): 过期时间，格式为YYYY-MM-DD
            tenant_id (str, required): 空间ID，多个空间ID用逗号分隔

        Returns:
            dict: 新创建的API Key详细信息

        Raises:
            CommonError: 当参数验证失败或创建失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("description", type=str, location="json", required=False)
        parser.add_argument("expire_date", type=str, location="json", required=False)
        parser.add_argument("tenant_id", type=str, location="json", required=True)

        args = parser.parse_args()
        description = args.get("description", "")
        expire_date = args.get("expire_date", None)
        tenant_id = args.get("tenant_id", None)
        if not tenant_id:
            return {"message": "tenant_id参数不能为空"}, 400

        tenants = TenantService.get_account_tenants(current_user)
        if not tenants:
            return {"message": "当前用户没有任何空间"}, 400
        # 检查tenant_id是否在当前用户的空间列表中
        tenant_ids = [str(t.id) for t in tenants]
        tenant_id_list = [tid.strip() for tid in tenant_id.split(",") if tid.strip()]
        for tid in tenant_id_list:
            if tid not in tenant_ids:
                return {"message": f"空间ID {tid} 不属于当前用户的空间"}, 400
            # 检查当前用户是否对该空间有写权限
            if not current_user.can_write_in_tenant(tid):
                return {"message": f"您对空间ID {tid} 没有写权限"}, 403
        self.check_can_write()
        result = ApikeyService.create_new(
            user_id=current_user.id,
            user_name=current_user.name,
            tenant_id=tenant_id,  # 空间ID，各个空间ID之间使用逗号分隔
            description=description,
            expire_date=expire_date,
        )
        return marshal(result, fields.apikey_detail_fields)

    @login_required
    def delete(self):
        """删除指定的API Key。

        Args:
            id (int, required): 要删除的API Key的ID

        Returns:
            dict: 删除操作的结果

        Raises:
            CommonError: 当API Key不存在或不属于当前用户时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, location="json", required=False)

        args = parser.parse_args()
        id = args.get("id", None)
        if id is None:
            return {"message": "id参数不能为空"}, 400
        api_key = ApiKey.query.get(id)
        if api_key is None:
            return {"message": "API Key不存在"}, 400
        self.check_can_admin_object(api_key)
        ApikeyService.delete_api_key(id=id, user_id=current_user.id)

        return {"result": "success"}, 204

    @login_required
    def put(self):
        """更新API Key的状态。

        Args:
            id (int, required): 要更新的API Key的ID
            status (str, required): 新的状态，可选值：active, disabled, deleted, expired

        Returns:
            dict: 更新后的API Key详细信息

        Raises:
            CommonError: 当API Key不存在、不属于当前用户或状态转换不允许时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, location="json", required=True)
        parser.add_argument("status", type=str, location="json", required=True)
        args = parser.parse_args()
        id = args.get("id")
        status = args.get("status")
        allowed_statuses = [
            ApiKeyStatus.ACTIVE,
            ApiKeyStatus.DISABLED,
            ApiKeyStatus.DELETED,
            ApiKeyStatus.EXPIRED,
        ]
        if status not in allowed_statuses:
            return {"message": f"不支持的状态: {status}"}, 400
        api_key = ApiKey.query.get(id)
        if api_key is None:
            return {"message": "API Key不存在"}, 400
        self.check_can_write_object(api_key)
        result = ApikeyService.update_status(
            id=id, user_id=current_user.id, new_status=status
        )
        return marshal(result, fields.apikey_detail_fields)


class ApikeyChat(Resource):
    def get_user(self):
        """获取当前API Key对应的用户ID。

        Returns:
            str: 用户ID
        """
        return self.api_key_info.user_id

    def post(self, app_id):
        """使用API Key与指定应用进行对话。

        Args:
            app_id (str): 应用ID
            inputs (list, required): 输入内容列表
            mode (str, optional): 运行模式，默认为"publish"
            files (list, optional): 文件列表，可为空

        Returns:
            dict: 对话结果数据

        Raises:
            CommonError: 当API Key验证失败、应用不存在或服务未开启时抛出
        """
        import json

        auth_header = request.headers.get("Authorization", "")
        if auth_header:
            if " " not in auth_header:
                return {
                    "message": "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
                }, 401
            auth_scheme, auth_token = auth_header.split(None, 1)
            auth_scheme = auth_scheme.lower()
            if auth_scheme != "bearer":
                return {
                    "message": "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
                }, 401
        self.api_key_info = ApikeyService.check_api_key(auth_token)
        account = AccountService.load_user(self.get_user())
        if account.current_tenant_id not in self.api_key_info.tenant_id.split(","):
            return {"message": "该密钥不属于当前的用户空间"}, 401
        app_id = str(app_id)
        parser = reqparse.RequestParser()
        parser.add_argument("inputs", type=list, required=True, location="json")
        parser.add_argument(
            "mode", type=str, required=False, default="publish", location="json"
        )
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(app_id)
        if app_model.enable_api:
            gid = f"publish-{app_model.id}"
            if not LightEngine().build_node(gid):
                app_model.enable_api = False
                db.session.commit()
                return {"message": "应用已经关闭服务"}, 401
        else:
            gid = f"draft-{app_model.id}"
            if not LightEngine().build_node(gid):
                app_model.enable_api = False
                db.session.commit()
                return {"message": "应用已经关闭服务"}, 401

        if app_model.enable_api_call != "1":
            return {"message": "应用未开启api调用"}, 401

        content = args["inputs"][0]
        files_list = args.get("files") or []
        history_list = []

        app_run = AppRunService.create(app_model, mode=args["mode"])

        result_data = None
        # 为API调用生成一个基于时间戳的turn_number
        turn_number = int(time.time() * 1000) % 10000 + 1

        for sse_line in app_run.run_stream(
            [content],
            files_list,
            history_list,
            account=account,
            turn_number=turn_number,
        ):
            # sse_line is like: 'data: {...}\n' or similar
            if sse_line.startswith("data: "):
                try:
                    payload = json.loads(sse_line[len("data: ") :].strip())
                    if payload.get("event") == "result":
                        result_data = payload.get("data")
                except Exception:
                    continue
        return {"result": result_data}


api.add_resource(ApikeyApi, "/apikey")
api.add_resource(ApikeyChat, "/apikey/chat/<string:app_id>")
