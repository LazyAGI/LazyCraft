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
import json
import logging
import re
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone

import requests
from flask_restful import marshal
from sqlalchemy import and_, or_
from sqlalchemy.orm.exc import NoResultFound

from lazyllm.tools.tools import HttpTool

from libs.helper import clone_model
from libs.json_utils import ensure_list_from_json
from libs.timetools import TimeTools
from models.model_account import Account
from parts.app.model import App, WorkflowRefer
from parts.tag.model import Tag
from utils.util_database import db

from . import fields
from .model import Tool, ToolAuth, ToolField, ToolHttp
from .utils import object_to_json
from .websocket_handle import get_tool_logger


class ToolService:

    def __init__(self, account):
        if account:
            self.user_id = account.id
            self.account = account
        # self.redirect_uri = "http://localhost:8082/auth"
        self.redirect_uri = "http://103.237.29.235:40382/auth"

    def get_pagination(self, data):
        filters = []
        query = Tool.query.filter(
            or_(Tool.is_draft == data.get("is_draft", True), Tool.is_draft == None)  # noqa: E711
        )

        if data.get("tool_type"):
            query = query.filter(Tool.tool_type == data["tool_type"])
        if data.get("published"):
            # 修复切换成tidb的bug，增加对布尔值的处理
            publish_value = [1 if x == "true" else 0 for x in data["published"]]
            query = query.filter(Tool.publish.in_(publish_value))
        if data.get("enabled"):
            query = query.filter(Tool.enable == True)
        if data.get("search_tags"):
            target_ids = Tag.get_target_ids_by_names(
                Tag.Types.TOOL, data["search_tags"]
            )
            target_ids = [int(k) for k in target_ids]
            query = query.filter(Tool.id.in_(target_ids))
        if data.get("search_name"):
            search_name = data["search_name"]
            filters.append(
                or_(
                    Tool.name.ilike(f"%{search_name}%"),
                    Tool.description.ilike(f"%{search_name}%"),
                )
            )
        if data.get("tool_mode"):
            query = query.filter(Tool.tool_mode.in_(data["tool_mode"]))
        if data.get("user_id"):
            query = query.filter(Tool.user_id.in_(data["user_id"]))

        if data.get("qtype") == "mine":  # 我的工具(包含草稿)
            filters.append(Tool.tenant_id == self.account.current_tenant_id)
            filters.append(Tool.user_id == self.account.id)
        elif data.get("qtype") == "group":  # 同组工具(包含草稿)
            filters.append(
                and_(
                    Tool.tenant_id == self.account.current_tenant_id,
                    Tool.user_id != self.account.id,
                )
            )
        elif data.get("qtype") == "builtin":  # 内置的工具
            filters.append(Tool.user_id == Account.get_administrator_id())
        elif data.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    Tool.tenant_id == self.account.current_tenant_id,
                    Tool.user_id == Account.get_administrator_id(),
                )
            )
        query = query.filter(*filters)
        query = query.order_by(Tool.created_at.desc())
        paginate = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

        tool_ids = [str(tool.id) for tool in paginate.items]
        ref_res = self.get_apps_references(tool_ids)
        for tool in paginate.items:
            self.tool_add_auth_attribute(tool)
            if tool.user_id and tool.user_id == Account.get_administrator_id():
                tool.user_name = "Lazy LLM官方"
            else:
                tool.user_name = getattr(
                    db.session.get(Account, tool.user_id), "name", ""
                )

            tool_id = tool.id
            ref_list = ref_res.get(str(tool_id), [])
            tool.ref_status = True if ref_list else False

        return paginate

    def get_by_id_with_auth(self, tool_id, need_auth=True):
        if need_auth:
            tool = self.get_by_id(tool_id)
            self.tool_add_auth_attribute(tool)
            return tool

    def get_by_id(self, tool_id):
        tool_id = int(tool_id)
        try:
            return Tool.query.filter_by(id=tool_id).one()
        except NoResultFound:
            raise ValueError("没有找到工具")

    def get_draft_tool(self, tool_id):
        try:
            return Tool.query.filter(
                Tool.tool_id == tool_id, Tool.is_draft == True
            ).first()
        except NoResultFound:
            raise ValueError("没有找到工具")

    def get_publish_tool(self, tool_id):
        try:
            return Tool.query.filter(
                Tool.tool_id == tool_id, Tool.is_draft == False
            ).first()
        except NoResultFound:
            raise ValueError("没有找到工具")

    def get_by_tool_id(self, tool_id):
        try:
            return Tool.query.filter(Tool.tool_id == tool_id).all()
        except NoResultFound:
            raise ValueError("没有找到工具")

    def get_toolapi_by_id(self, tool_api_id):
        tool_api_instance = ToolHttp.query.get(tool_api_id)
        if not tool_api_instance:
            raise ValueError("工具API不存在")
        if tool_api_instance.auth_method == "service_api":
            tool_auth = ToolAuth.query.filter_by(tool_api_id=tool_api_id).first()
            tool_api_instance.location = tool_auth.location
            tool_api_instance.param_name = tool_auth.param_name
        return tool_api_instance

    def createToolFields(self, data_list):
        user_id = self.user_id
        saved_entities = []
        errors = ""
        now_str = TimeTools.get_china_now()

        for item in data_list:
            try:
                entity = ToolField(
                    name=item.get("name"),
                    description=item.get("description"),
                    field_type=item.get("field_type"),
                    field_format=item.get("field_format"),
                    file_field_format=item.get("file_field_format"),
                    required=item.get("required", True),
                    created_at=now_str,
                    updated_at=now_str,
                    tool_id=item.get(
                        "tool_id", 0
                    ),  # 妈的，这里前段压根就没有传过，一直都是0
                    visible=item.get("visible", True),
                    user_id=user_id,
                    # API模式特有
                    field_use_model=item.get("field_use_model", ""),
                    default_value=item.get("default_value", ""),
                )
                db.session.add(entity)
                saved_entities.append(entity)
            except Exception as e:
                logging.exception(e)
                errors += f"新增工具元数据异常: {str(e)}"

        # 在循环结束后一次性提交所有更改
        try:
            db.session.commit()
        except Exception as e:
            logging.exception(e)
            db.session.rollback()
            errors += f"新增元数据异常: {str(e)}"
            saved_entities = []  # 清空已保存的实体列表

        return saved_entities, errors

    def updateToolFields(self, data_list):
        updated_entities = []
        errors = ""
        now_str = TimeTools.get_china_now()

        for item in data_list:
            try:
                entity = db.session.query(ToolField).filter_by(id=item["id"]).one()
                entity.name = item.get("name", entity.name)
                entity.description = item.get("description", entity.description)
                entity.field_type = item.get("field_type", entity.field_type)
                entity.field_format = item.get("field_format", entity.field_format)
                entity.file_field_format = item.get(
                    "file_field_format", entity.file_field_format
                )
                entity.required = item.get("required", entity.required)
                entity.updated_at = now_str
                entity.tool_id = item.get("tool_id", entity.tool_id)
                entity.visible = item.get("visible", entity.visible)
                entity.field_use_model = item.get(
                    "field_use_model", entity.field_use_model
                )
                entity.default_value = item.get("default_value", entity.default_value)

                updated_entities.append(entity)
            except Exception as e:
                logging.exception(e)
                errors += f"更新工具元数据异常: {str(e)}"

        # 在循环结束后一次性提交所有更改
        try:
            db.session.commit()
        except Exception as e:
            logging.exception(e)
            db.session.rollback()
            errors += f"提交元数据异常: {str(e)}"
            updated_entities = []  # 清空已更新的实体列表

        return updated_entities, errors

    def getToolFields(self, field_ids):
        fields = db.session.query(ToolField).filter(ToolField.id.in_(field_ids)).all()
        return fields

    def createTool(self, data):
        user_id = self.user_id
        now_str = TimeTools.get_china_now()

        if Tool.query.filter_by(
            name=data.get("name"), tenant_id=self.account.current_tenant_id
        ).first():
            raise ValueError("工具名称已存在")

        new_tool = Tool(
            name=data.get("name") or "",
            description=data.get("description") or "",
            icon=data.get("icon") or "/app/upload/tool.jpg",
            created_at=now_str,
            updated_at=now_str,
            user_id=user_id,
            user_name=self.account.name,
            tenant_id=self.account.current_tenant_id,
            tool_type="self",
            tool_kind=data.get("tool_kind") or "",
            tool_mode=data.get("tool_mode") or "",
            tool_ide_code=data.get("tool_ide_code") or "",
            tool_ide_code_type=data.get("tool_ide_code_type") or "",
            tool_field_input_ids=data.get("tool_field_input_ids") or [],
            tool_field_output_ids=data.get("tool_field_output_ids") or [],
            tool_api_id=data.get("tool_api_id") or 0,
            publish=False,
            publish_type="",
            enable=False,
            test_state="init",  # 设置初始测试状态
            is_draft=1,
        )

        db.session.add(new_tool)
        db.session.flush()
        db.session.commit()
        return new_tool

    def updateTool(self, tool_id, data):
        update_tool = self.get_by_id(tool_id)

        if Tool.query.filter_by(
            name=data.get("name"), tenant_id=self.account.current_tenant_id
        ).first() and update_tool.name != data.get("name"):
            raise ValueError("工具名称已存在")

        # 检查关键字段是否发生变化
        fields_to_check = [
            "tool_mode",
            "tool_ide_code",
            "tool_ide_code_type",
            "tool_field_input_ids",
            "tool_field_output_ids",
        ]
        changed_fields = []
        for field in fields_to_check:
            if data.get(field) is not None and data.get(field) != getattr(
                update_tool, field
            ):
                changed_fields.append(
                    [field, getattr(update_tool, field), data.get(field)]
                )
        has_critical_changes = len(changed_fields) > 0

        update_tool.name = data.get("name", update_tool.name)
        update_tool.icon = data.get("icon", update_tool.icon)
        update_tool.description = data.get("description", update_tool.description)
        update_tool.updated_at = TimeTools.get_china_now()
        update_tool.tool_kind = data.get("tool_kind", update_tool.tool_kind)
        update_tool.tool_mode = data.get("tool_mode", update_tool.tool_mode)
        update_tool.tool_ide_code = data.get("tool_ide_code", update_tool.tool_ide_code)
        update_tool.tool_ide_code_type = data.get(
            "tool_ide_code_type", update_tool.tool_ide_code_type
        )
        update_tool.tool_field_input_ids = data.get(
            "tool_field_input_ids", update_tool.tool_field_input_ids
        )
        update_tool.tool_field_output_ids = data.get(
            "tool_field_output_ids", update_tool.tool_field_output_ids
        )
        update_tool.tool_api_id = data.get("tool_api_id", update_tool.tool_api_id)
        update_tool.publish = data.get("publish", update_tool.publish)
        update_tool.enable = data.get("enable", update_tool.enable)
        update_tool.is_draft = data.get("is_draft", update_tool.is_draft)
        update_tool.tool_id = data.get("tool_id", update_tool.tool_id)

        # 只在关键字段发生变化时重置测试状态
        if has_critical_changes:
            update_tool.test_state = "init"

        self.update_tool_auth(tool_id, update_tool.tool_api_id)
        db.session.commit()
        return update_tool

    def deleteTool(self, tool_id):
        tool = self.get_by_id(tool_id)
        if not tool.tool_id:
            # 没有tool_id的是版本更新前的数据
            del_tools = [tool]
        else:
            del_tools = self.get_by_tool_id(tool.tool_id)
        name = del_tools[0].name
        for del_tool in del_tools:
            Tag.delete_bindings(Tag.Types.TOOL, tool_id)
            db.session.delete(del_tool)
        db.session.commit()
        return True, name

    def pulishTool(self, tool_id, publish_type):
        now_str = TimeTools.get_china_now()
        draft_tool = self.get_by_id(tool_id)

        if not draft_tool:
            raise ValueError("No valid tool found.")

        # 检查测试状态
        if draft_tool.test_state != "success":
            raise ValueError("测试通过后才能发布")

        publish_tool = self.get_publish_tool(draft_tool.tool_id)
        draft_tool.publish = True
        draft_tool.publish_type = publish_type
        draft_tool.publish_at = now_str
        draft_tool.updated_at = now_str
        if not draft_tool.tool_id:
            draft_tool.tool_id = uuid.uuid4()
        db.session.commit()

        if publish_tool:
            # 遍历publish_tool的所有字段(排除id字段)
            for column in publish_tool.__table__.columns:
                if column.name not in ["id", "is_draft"]:  # 跳过id字段
                    setattr(publish_tool, column.name, getattr(draft_tool, column.name))
            db.session.commit()
            return draft_tool
        else:
            # 将draft_tool类型修改为publish_tool类型
            draft_tool.is_draft = False
            # 生成一份tool_id相同的草稿数据
            new_tool = self.copyTool(draft_tool, draft_tool.name, is_publish=True)

            new_tool.publish = True
            new_tool.publish_type = publish_type
            new_tool.publish_at = now_str
            new_tool.updated_at = now_str
            new_tool.is_draft = True
            new_tool.tool_id = draft_tool.tool_id
            new_tool.enable = draft_tool.enable
            db.session.commit()
            return new_tool

    def cancel_pulish_tool(self, tool_id, publish_type=""):
        now_str = TimeTools.get_china_now()
        dratf_tool = self.get_by_id(tool_id)
        if not dratf_tool.tool_id:
            # 没有tool_id的是版本更新前的数据
            tools = [dratf_tool]
        else:
            tools = self.get_by_tool_id(dratf_tool.tool_id)
        for tool in tools:
            tool.publish = False
            tool.enable = False
            tool.publish_at = None
            tool.publish_type = publish_type
            tool.updated_at = now_str
            tool.tool_id = tool.tool_id if tool.tool_id else uuid.uuid4()
        db.session.commit()
        return dratf_tool

    def enableTool(self, tool_id, enable):
        dratf_tool = self.get_by_id(tool_id)
        if not dratf_tool.tool_id:
            # 没有tool_id的是版本更新前的数据
            tools = [dratf_tool]
        else:
            tools = self.get_by_tool_id(dratf_tool.tool_id)
        for tool in tools:
            tool.enable = enable
            tool.updated_at = TimeTools.get_china_now()
            tool.tool_id = tool.tool_id if tool.tool_id else uuid.uuid4()
        db.session.commit()
        return dratf_tool

    def upsertToolApi(self, data, tool_api_id):
        user_id = self.user_id
        now_str = TimeTools.get_china_now()

        if tool_api_id:
            tool_api_instance = self.get_toolapi_by_id(tool_api_id)
        else:
            tool_api_instance = ToolHttp(user_id=user_id, created_at=now_str)

        tool_api_instance.url = data.get(
            "url", tool_api_instance.url if tool_api_id else ""
        )
        tool_api_instance.header = data.get(
            "header", tool_api_instance.header if tool_api_id else ""
        )
        tool_api_instance.updated_at = now_str
        tool_api_instance.auth_method = data.get(
            "auth_method", tool_api_instance.auth_method if tool_api_id else ""
        )
        tool_api_instance.api_key = data.get(
            "api_key", tool_api_instance.api_key if tool_api_id else ""
        )
        tool_api_instance.request_type = data.get(
            "request_type", tool_api_instance.request_type if tool_api_id else ""
        )
        tool_api_instance.request_body = data.get(
            "request_body", tool_api_instance.request_body if tool_api_id else ""
        )
        # ------oauth1.0 & oidc--------------------#
        tool_api_instance.client_id = data.get(
            "client_id", tool_api_instance.client_id if tool_api_id else ""
        )
        tool_api_instance.scope = data.get(
            "scope", tool_api_instance.scope if tool_api_id else ""
        )
        # ------oauth1.0---------------------------#
        tool_api_instance.client_secret = data.get(
            "client_secret", tool_api_instance.client_secret if tool_api_id else ""
        )
        tool_api_instance.client_url = data.get(
            "client_url", tool_api_instance.client_url if tool_api_id else ""
        )
        tool_api_instance.authorization_url = data.get(
            "authorization_url",
            tool_api_instance.authorization_url if tool_api_id else "",
        )
        tool_api_instance.authorization_content_type = data.get(
            "authorization_content_type",
            tool_api_instance.authorization_content_type if tool_api_id else "",
        )
        # ------oidc------------------------------#
        tool_api_instance.grant_type = data.get(
            "grant_type", tool_api_instance.grant_type if tool_api_id else ""
        )
        tool_api_instance.endpoint_url = data.get(
            "endpoint_url", tool_api_instance.endpoint_url if tool_api_id else ""
        )
        tool_api_instance.audience = data.get(
            "audience", tool_api_instance.audience if tool_api_id else ""
        )
        # tool_api_instance.action = data.get('action', tool_api_instance.action if tool_api_id else '')
        # tool_api_instance.version = data.get('version', tool_api_instance.version if tool_api_id else '')
        # tool_api_instance.region = data.get('region', tool_api_instance.region if tool_api_id else '')
        # tool_api_instance.provider_id = data.get('provider_id', tool_api_instance.provider_id if tool_api_id else '')
        # tool_api_instance.web_identity_token = data.get('web_identity_token', tool_api_instance.web_identity_token if tool_api_id else '')
        # tool_api_instance.role_arn = data.get('role_arn', tool_api_instance.role_arn if tool_api_id else '')
        # tool_api_instance.role_session_name = data.get('role_session_name',tool_api_instance.role_session_name if tool_api_id else '')
        # tool_api_instance.duration_seconds = data.get('duration_seconds', tool_api_instance.duration_seconds if tool_api_id else '')
        # flag = False
        # access_token = ""
        # expires_in = 0
        if not tool_api_id:
            # auth_method: null\OAuth-standard\oidc\oauth1.0 四种授权
            # if tool_api_instance.auth_method is not None and tool_api_instance.auth_method == 'oidc':
            #     access_token, expires_in = self.tool_auth_google_oidc(tool_api_instance)
            #     flag = True
            db.session.add(tool_api_instance)
        db.session.commit()
        db.session.flush()
        if (
            tool_api_instance.auth_method is not None
            and tool_api_instance.auth_method == "service_api"
        ):
            self.save_service_api_auth(
                data.get("location", ""), data.get("param_name", ""), tool_api_instance
            )
        # if flag:
        #     self.save_oidc_auth(access_token, expires_in, tool_api_instance)
        return tool_api_instance

    def checkToolCanTest(self, tool_id):
        tool_instance = self.get_by_id(tool_id)
        if tool_instance.tool_mode == "api" and not tool_instance.tool_api_id:
            raise ValueError("工具API不存在")
        if tool_instance.tool_mode == "ide" and not tool_instance.tool_ide_code:
            raise ValueError("工具IDE代码不存在")
        return True

    def existToolByName(self, name):
        if Tool.query.filter_by(
            name=name, tenant_id=self.account.current_tenant_id
        ).first():
            return True
        return False

    def testTool(self, tool_id, input_data, extra_vars):
        tool_instance = self.get_by_id(tool_id)
        try:
            if tool_instance.tool_mode == "API":
                result = self.call_api_tool(tool_instance, input_data, extra_vars)
            elif tool_instance.tool_mode == "IDE":
                result = self.call_ide_tool(tool_instance, input_data, extra_vars)
            else:
                raise ValueError(f"Unsupported tool mode: {tool_instance.tool_mode}")
            tool_instance.test_state = "success"  # 测试成功时设置状态为success
            db.session.commit()
            return result
        except Exception as e:
            logging.exception(e)
            tool_instance.test_state = "error"  # 测试失败时设置状态为error
            db.session.commit()
            return {"message": "Error calling tool", "error": str(e)}

    def call_api_tool(self, tool_instance, input_data, extra_vars):
        tool_api = self.get_toolapi_by_id(tool_instance.tool_api_id)
        # 处理JSON字段，确保tool_field_input_ids是列表
        tool_field_input_ids = ensure_list_from_json(tool_instance.tool_field_input_ids)
        tool_field_input = ToolField.query.filter(
            ToolField.id.in_(tool_field_input_ids)
        ).all()

        params = {}
        body = {}
        path_params = {}
        headers = {}

        for tool_field in tool_field_input:
            if tool_field.field_type == "input":
                # 使用 get 方法的第二个参数来设置默认值
                value = input_data.get(tool_field.name, tool_field.default_value)
                if tool_field.required and value is None:
                    raise ValueError(f"Required field '{tool_field.name}' is missing")

                if tool_field.field_use_model == "path":
                    path_params[tool_field.name] = str(value)
                elif tool_api.request_type.upper() == "GET":
                    params[tool_field.name] = str(value)
                else:
                    if tool_field.field_format == "list":
                        value = ast.literal_eval(value)
                    if tool_field.field_format == "bool":
                        value = value.lower() == "true"

                    body[tool_field.name] = value

        url = tool_api.url
        for param, value in path_params.items():
            url = re.sub(f"{{param}}", str(value), url)  # noqa

        headers = tool_api.header if tool_api.header else {}
        if tool_api.api_key:
            headers["Authorization"] = (
                tool_api.api_key
                if tool_api.api_key.startswith("Bearer")
                else f"Bearer {tool_api.api_key}"
            )

        if tool_api.auth_method in ("service_api", "oauth"):
            tool_auth_instance = ToolAuth.query.filter(
                ToolAuth.tool_id == tool_instance.id,
                ToolAuth.tool_api_id == tool_api.id,
                ToolAuth.user_id == self.account.id,
            ).first()
            if tool_auth_instance is None:
                raise ValueError("当前工具需要授权访问")

            if tool_api.auth_method == "service_api":
                if tool_auth_instance.location == "header":
                    headers[tool_auth_instance.param_name] = (
                        tool_auth_instance.token
                        if tool_auth_instance.token.startswith("Bearer")
                        else "Bearer " + tool_auth_instance.token
                    )
                if tool_auth_instance.location == "query":
                    params[tool_auth_instance.param_name] = tool_auth_instance.token
            if tool_api.auth_method == "oauth":
                headers["Authorization"] = "Bearer " + tool_auth_instance.token

        output_fields = []
        # 处理JSON字段，确保tool_field_output_ids是列表
        tool_field_output_ids = ensure_list_from_json(
            tool_instance.tool_field_output_ids
        )
        if tool_field_output_ids:
            for tool_field in ToolField.query.filter(
                ToolField.id.in_(tool_field_output_ids)
            ).all():
                if tool_field.field_type == "output":
                    output_fields.append(tool_field.name)

        # extract_from_result = True if output_fields else False
        extract_from_result = extra_vars.get("extract_from_result", True)
        if len(output_fields) != 1:
            extract_from_result = False  # 强制不允许提取
        logging.info(f"url: {url}")
        logging.info(f"method: {tool_api.request_type.upper()}")
        logging.info(f"params: {params}")
        logging.info(f"headers: {headers}")
        logging.info(f"output_fields: {output_fields}")
        logging.info(f"extract_from_result: {extract_from_result}")
        logging.info(f"body: {json.dumps(body) if body else None}")
        http_tool = HttpTool(
            method=tool_api.request_type.upper(),
            url=url,
            params=params,
            headers=headers,
            body=json.dumps(body) if body else None,
            timeout=30,  # 你可以根据需要调整超时时间
            outputs=output_fields,
            extract_from_result=extract_from_result,
        )
        response = http_tool.forward()  # 如果outputs的字段不存在，这里会返回None
        logging.info(f"origin response: {response}, outputs={output_fields}")
        return response or {}

    def call_ide_tool(self, tool_instance, input_data, extra_vars):
        # 1. 获取工具字段信息和处理输入数据
        processed_input = self.prepare_input_data(tool_instance, input_data)

        print(processed_input)
        print(tool_instance.tool_ide_code)

        # 2. 准备变量字典
        vars_for_code = {
            var_name: module_name for var_name, module_name in extra_vars.items()
        }
        if vars_for_code is None or vars_for_code == {}:
            vars_for_code = self.extract_imports(tool_instance.tool_ide_code)

        print(vars_for_code)

        # 3. 准备要在子进程中执行的代码
        code = f"""
import json
import importlib
import sys
import pytz
import traceback
from datetime import datetime
from lazyllm.tools.tools import HttpTool


def execute_http_tool(code_str, vars_for_code, processed_input, timeout):
    try:
        vars_for_code_new = {{}}
        print("Starting execution of code")
        print("code_str:", code_str)
        print("processed_input:", processed_input)
        
        for var_name, module_name in vars_for_code.items():
            flag = False
            print("Importing {{}} as {{}}".format(module_name, var_name))
            try:
                # if "." in module_name:
                #    flag = True
                #    module_name = module_name.split(".")[0]
                module = importlib.import_module(module_name)
                vars_for_code_new[var_name] = module
                #if flag:
                #    submodule = getattr(module, var_name)
                #    vars_for_code_new[var_name] = submodule
                print("Imported {{}}: {{}}".format(module_name, vars_for_code_new[var_name]))
            except ImportError as e:
                print(f"Error importing {{module_name}}: {{e}}")

        print("vars_for_code_new:", vars_for_code_new)
        print("Creating code instance")
        http_tool = HttpTool(
            code_str=code_str,
            vars_for_code=vars_for_code_new,
            timeout=timeout
        )
        
        print("Executing code")
        result = http_tool.forward(**processed_input)
        print("Code execution completed")
        print("RESULT_START")
        print(json.dumps(result))
        print("RESULT_END")
        return result
    except Exception as e:
        print("Error occurred:", str(e))
        print(traceback.format_exc())
        raise

# 执行 HTTP 调用
execute_http_tool(
    code_str='''{tool_instance.tool_ide_code}
    ''',
    vars_for_code={vars_for_code},
    processed_input={json.dumps(processed_input)},
    timeout=30
)
"""

        # 使用 Popen 在子进程中运行代码
        process = subprocess.Popen(
            [sys.executable, "-c", code],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,  # 分离标准错误输出
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        tool_logger = get_tool_logger(str(tool_instance.id))
        output_buffer = []
        result_buffer = []

        capturing_result = False

        # 同时读取标准输出和标准错误
        while True:
            # 读取标准输出
            output = process.stdout.readline()
            if output == "" and process.poll() is not None:
                break
            if output:
                output = output.strip()
                print(f"Debug: {output}")  # 调试输出
                if output == "RESULT_START":
                    capturing_result = True
                    continue
                elif output == "RESULT_END":
                    capturing_result = False
                    continue

                if capturing_result:
                    output = output.strip().replace("'''", "")
                    result_buffer.append(output)
                else:
                    try:
                        tool_logger.info(str(output))
                    except Exception as e:
                        print(f"Error logging output: {e}")
                    output_buffer.append(output)

            # 读取标准错误 这里会造成阻塞，且上面没有错误输出，先注释掉
            # error = process.stderr.readline()
            # if error:
            #     error = error.strip()
            #     error_buffer.append(error)
            #     try:
            #         tool_logger.error(str(error))  # 记录错误日志
            #     except Exception as e:
            #         print(f"Error logging error: {e}")

        # 等待进程结束并获取返回码
        return_code = process.wait()

        # 检查是否有错误发生
        if return_code != 0:
            # error_message = '\n'.join(error_buffer)
            raise RuntimeError(f"ide工具执行失败，返回码: {return_code}")

        # 解析结果
        result_json = "\n".join(result_buffer)

        try:
            result = json.loads(result_json)
        except json.JSONDecodeError:
            result = result_json

        # 处理输出
        output = self.process_output(tool_instance, result)

        # 自定义结束符
        tool_logger.warning("end")

        return output

    @staticmethod
    def extract_imports(code):
        tree = ast.parse(code)
        imports = {}

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports[alias.asname or alias.name] = alias.name
            elif isinstance(node, ast.ImportFrom):
                module = node.module
                for alias in node.names:
                    imports[alias.asname or alias.name] = alias.name
                    if module:
                        imports[alias.asname or alias.name] = f"{module}.{alias.name}"
                    else:
                        imports[alias.asname or alias.name] = alias.name

        return imports

    @staticmethod
    def prepare_input_data(tool_instance, input_data):
        # 处理JSON字段，确保tool_field_input_ids是列表
        tool_field_input_ids = ensure_list_from_json(tool_instance.tool_field_input_ids)
        tool_field_input = ToolField.query.filter(
            ToolField.id.in_(tool_field_input_ids)
        ).all()
        processed_input = {}
        for tool_field in tool_field_input:
            if tool_field.field_type == "input":
                # IDE模式中没有默认值
                if tool_instance.tool_mode == "IDE":
                    try:
                        value = input_data[tool_field.name]
                        processed_input[tool_field.name] = value
                    except Exception:
                        if tool_field.required:
                            raise ValueError(
                                f"Required field '{tool_field.name}' is missing"
                            )
                else:
                    value = input_data.get(tool_field.name, tool_field.default_value)
                    if tool_field.required and value is None:
                        raise ValueError(
                            f"Required field '{tool_field.name}' is missing"
                        )
                    processed_input[tool_field.name] = value

                # 处理文件类型
                # if tool_field.field_format == 'file':
                #     if os.path.exists(value):
                #         with open(value, 'rb') as file:
                #             value = file.read()
                #     else:
                #         raise FileNotFoundError(f"File not found: {value}")

                # 转换为 "参数名：类型 = 参数值" 格式
                # processed_input[tool_field.name] = {
                #     "type": tool_field.field_format,
                #     "value": value
                # }

        return processed_input

    @staticmethod
    def process_output(tool_instance, result):
        print("result: ", result)

        # 确保 result 是字典类型
        if isinstance(result, str):
            try:
                result = json.loads(result.replace("'", '"'))
            except json.JSONDecodeError:
                print("Failed to parse result as JSON")

        # 处理JSON字段，确保tool_field_output_ids是列表
        tool_field_output_ids = ensure_list_from_json(
            tool_instance.tool_field_output_ids
        )
        if tool_field_output_ids:
            tool_field_output = ToolField.query.filter(
                ToolField.id.in_(tool_field_output_ids)
            ).all()
            if tool_field_output:
                output = {}
                for tool_field in tool_field_output:
                    if tool_field.field_type == "output":
                        if isinstance(result, dict):
                            value = result.get(
                                tool_field.name, tool_field.default_value
                            )
                            print(f"Value for {tool_field.name}: {value}")
                            if value is not None:
                                output[tool_field.name] = value
                        else:
                            return str(result)

                # 如果 output 为空（即没有找到任何匹配的字段），返回整个 result
                if not output:
                    return object_to_json(result)
                else:
                    return object_to_json(output)
            else:
                return object_to_json(result)
        else:
            return object_to_json(result)

    @staticmethod
    def get_user_id_by_tool(tool_id):
        tool_instance = Tool.query.get(tool_id)
        if not tool_instance:
            raise ValueError("Tool not found")
        return tool_instance.user_id

    def get_copy_name(self, old_tool):
        tenant_id = self.account.current_tenant_id
        # 命名规则: 原工具名称_复制1（数字递增）
        old_name = old_tool.name
        regular = re.compile(r"(.*?)_复制(\d+)$")  # 匹配: xxx_复制x
        m = regular.match(old_name)
        if m:
            old_prefix = m.groups()[0]
            old_number = int(m.groups()[1])
        else:
            old_prefix = old_name
            old_number = 0

        # 循环获取新名字
        old_number += 1
        new_name = f"{old_prefix}_复制{old_number}"
        while Tool.query.filter_by(name=new_name, tenant_id=tenant_id).first():
            old_number += 1
            new_name = f"{old_prefix}_复制{old_number}"

        return new_name

    def copyTool(self, old_tool, new_name, is_publish=False):
        user_id = self.user_id
        now_str = TimeTools.get_china_now()

        # 添加ToolApi
        new_tool_api_id = 0
        if old_tool.tool_api_id:
            old_api_instance = self.get_toolapi_by_id(old_tool.tool_api_id)
            new_api_instance = clone_model(
                old_api_instance,
                user_id=user_id,
                created_at=now_str,
                updated_at=now_str,
            )
            db.session.add(new_api_instance)
            db.session.commit()
            new_tool_api_id = new_api_instance.id

        # 添加ToolField多个字段
        new_input_fields = []
        new_output_fields = []
        # 处理JSON字段，确保字段ID列表是列表类型
        tool_field_input_ids = ensure_list_from_json(old_tool.tool_field_input_ids)
        tool_field_output_ids = ensure_list_from_json(old_tool.tool_field_output_ids)
        old_all_field_ids = tool_field_input_ids + tool_field_output_ids
        old_db_fields = (
            db.session.query(ToolField)
            .filter(ToolField.id.in_(old_all_field_ids))
            .all()
        )
        for old_field in old_db_fields:
            new_field = clone_model(
                old_field, user_id=user_id, created_at=now_str, updated_at=now_str
            )
            db.session.add(new_field)

            if old_field.field_type == "input":
                new_input_fields.append(new_field)
            else:
                new_output_fields.append(new_field)

        if len(new_input_fields) + len(new_output_fields) > 0:
            db.session.commit()

        new_input_ids = [k.id for k in new_input_fields]
        new_output_ids = [k.id for k in new_output_fields]

        # 添加工具
        new_tool = clone_model(old_tool)
        new_tool.name = new_name
        new_tool.created_at = now_str
        new_tool.updated_at = now_str
        new_tool.user_id = user_id
        new_tool.user_name = self.account.name
        new_tool.tenant_id = self.account.current_tenant_id
        new_tool.tool_field_input_ids = new_input_ids
        new_tool.tool_field_output_ids = new_output_ids
        new_tool.tool_api_id = new_tool_api_id
        new_tool.publish = False
        new_tool.publish_type = ""
        new_tool.enable = False
        new_tool.is_draft = True
        if not is_publish:
            new_tool.tool_id = str(uuid.uuid4())

        db.session.add(new_tool)
        db.session.commit()
        return new_tool

    def tool_auth_by_user_return_url(self, tool_id):
        tool_instance = Tool.query.get(tool_id)
        print(tool_instance)
        tool_api_instance = self.get_toolapi_by_id(tool_instance.tool_api_id)
        if not tool_api_instance:
            raise ValueError("tool api not found")
        tool_auth_instance = ToolAuth.query.filter_by(
            tool_id=tool_id,
            tool_api_id=tool_instance.tool_api_id,
            user_id=self.account.id,
        ).one_or_none()
        if not tool_auth_instance:
            tool_auth_instance = self.__add_tool_auth__(tool_id, tool_api_instance)
        return (
            tool_api_instance.client_url
            + "?"
            + "client_id="
            + tool_api_instance.client_id
            + "&response_type=code"
            + "&scope="
            + tool_api_instance.scope
            + "&state="
            + tool_auth_instance.state
            + "&redirect_uri="
            + self.redirect_uri
        )

    def __add_tool_auth__(self, tool_id, tool_api_instance):

        tool_auth = ToolAuth(
            tool_id=tool_id,
            tool_api_id=tool_api_instance.id,
            user_id=self.account.id,
            user_name=self.account.name,
            user_type=(
                "mine" if tool_api_instance.user_id == self.account.id else "other"
            ),  # 确保 self.account 有 id 属性
            state=str(uuid.uuid4()).replace("-", ""),
            endpoint_url=(
                tool_api_instance.endpoint_url
                if tool_api_instance.endpoint_url
                else tool_api_instance.authorization_url
            ),
            client_id=tool_api_instance.client_id,
            client_secret=tool_api_instance.client_secret,
            token_type="oauth",
        )
        db.session.add(tool_auth)
        db.session.commit()
        db.session.flush()
        return tool_auth

    def tool_auth(self, code, state):
        tool_auth_instance = ToolAuth.query.filter_by(state=state).first()
        if not tool_auth_instance:
            raise ValueError("state 被篡改")
        tool_api_instance = ToolHttp.query.get(tool_auth_instance.tool_api_id)
        if not tool_api_instance:
            raise ValueError("工具配置未找到，工具被删除")
        if tool_api_instance.auth_method == "oauth":
            tool_auth_instance = self.tool_auth_oauth2(
                tool_api_instance, tool_auth_instance, code
            )
            print(tool_auth_instance)
        elif tool_api_instance.auth_method == "oidc":
            pass
        return

    def tool_auth_oauth2(self, tool_api_instance, tool_auth_instance, code):
        # 普通oauth，需要根据code和client_id&client_secret获取token
        data = {
            "client_id": tool_api_instance.client_id,
            "client_secret": tool_api_instance.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        headers = {
            "Accept": tool_api_instance.authorization_content_type,
            "Authorization": "Bearer " + tool_api_instance.client_secret,
        }
        print(data)
        try:
            response = requests.post(
                tool_api_instance.authorization_url,
                data=data,
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            response_json = response.json()
            print(response_json)
            access_token = response_json.get("access_token")
            expires_in = response_json.get("expires_in")
            refresh_token = response_json.get("refresh_token")
            if access_token is None:
                raise ValueError("未获取到授权信息：", response_json)
            tool_auth_instance.token = access_token
            tool_auth_instance.is_auth_success = True
            if expires_in is None or expires_in < 0:
                expiration_datetime = datetime.now(timezone.utc) + timedelta(
                    seconds=259200
                )
            else:
                try:
                    expires_in_seconds = int(expires_in)  # 尝试将 expires_in 转换为整数
                    expiration_datetime = datetime.now(timezone.utc) + timedelta(
                        seconds=expires_in_seconds
                    )
                except (ValueError, TypeError):
                    # 如果转换失败，仍然使用默认值 (三天)
                    expiration_datetime = datetime.now(timezone.utc) + timedelta(
                        seconds=259200
                    )
            expiration_datetime_str = expiration_datetime.strftime("%Y-%m-%d %H:%M:%S")
            print(expiration_datetime_str)
            tool_auth_instance.expires_at = expiration_datetime_str

            if not refresh_token:
                tool_auth_instance.refresh_token = refresh_token
            db.session.add(tool_auth_instance)
            db.session.commit()
            db.session.flush()
        except Exception as e:
            tool_auth_instance.is_auth_success = False
            db.session.add(tool_auth_instance)
            db.session.commit()
            raise ValueError("调用授权异常：", e)
        return tool_auth_instance

    @staticmethod
    def tool_auth_google_oidc(tool_api_instance):
        print(tool_api_instance)
        return "abc", 2043
        # data = {
        #     "grant_type": tool_api_instance.grant_type,
        #     "audience": tool_api_instance.audience,
        #     "scope": tool_api_instance.scope,
        #     "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
        #     "subject_token": tool_api_instance.subject_token,
        #     "subject_token_type": tool_api_instance.subject_token_type,
        # }
        # try:
        #     response = requests.post(tool_api_instance.endpoint_url, data=data)
        #     # 解析响应
        #     if response.status_code == 200:
        #         token_info = response.json()
        #         access_token = token_info.get("access_token")
        #         expires_in = token_info.get("expires_in")
        #         return access_token, expires_in
        #     else:
        #         raise ValueError("授权请求返回失败")
        # except Exception as e:
        #     raise ValueError(f'授权失败: {e}')

    # auth = 0-默认值 1-已授权 2-未授权 3-已过期
    def tool_add_auth_attribute(self, tool):
        """
        为 tool 对象添加授权相关属性，综合考虑 ToolHttp 和 ToolAuth 表的信息。
        仅当 tool_api_instance 的 auth_method 为 'service_api' 或 'oauth' 时，
        才会设置 need_share 和 share 属性。
        Args:
            tool: 要添加授权属性的 tool 对象。
        """
        tool.auth = 0  # 默认授权状态
        tool_api_instance = ToolHttp.query.get(tool.tool_api_id)
        if not tool_api_instance:
            return
        # 只有 service_api 和 oauth 才走这段逻辑
        if tool_api_instance.auth_method in ("service_api", "oauth"):
            tool_auth_instance = ToolAuth.query.filter_by(
                tool_id=tool.id,
                tool_api_id=tool.tool_api_id,
                user_id=self.account.id,
                user_type="mine",
            ).first()
            tool.need_share = bool(tool_auth_instance)  # 更简洁的写法
            if tool_auth_instance:
                tool.share = True if tool_auth_instance.is_share else False
            else:
                tool.share = False
        else:
            # 如果不是这两种类型，则不应该有 share 信息
            tool.need_share = False
            tool.share = False
        if tool_api_instance.auth_method == "service_api":
            return  # Service API 不需要 OAuth 处理
        if tool_api_instance.auth_method != "oauth":
            return
        # if tool.user_id == self.account.id:
        tool.auth = -1  # 当前用户的工具，未授权
        # 优先检查共享授权
        shared_auth = ToolAuth.query.filter_by(
            tool_id=tool.id, tool_api_id=tool.tool_api_id, user_type="mine", is_share=1
        ).first()
        tool_auth_instance = ToolAuth.query.filter_by(
            tool_id=tool.id, tool_api_id=tool.tool_api_id, user_id=self.account.id
        ).first()
        auth_instance = shared_auth or tool_auth_instance  # 优先使用共享授权
        if auth_instance:
            if auth_instance.expires_at and auth_instance.expires_at < datetime.now():
                tool.auth = 3  # 已过期
            elif auth_instance.is_auth_success:
                tool.auth = 1  # 授权成功
            else:
                tool.auth = 2  # 授权失败

    def tool_auth_share(self, tool_id, share_status):
        tool_instance = Tool.query.get(tool_id)
        if tool_instance is None:
            raise ValueError("未查询到工具")
        tool_auth_instance = ToolAuth.query.filter_by(
            tool_id=tool_id,
            tool_api_id=tool_instance.tool_api_id,
            user_id=self.account.id,
        ).first()
        if tool_auth_instance:
            tool_auth_instance.is_share = share_status
            db.session.add(tool_auth_instance)
            db.session.commit()
        return tool_auth_instance

    def save_oidc_auth(self, access_token, expires_in, tool_api_instance):
        now = TimeTools.now_datetime_china()  # 获取当前时间
        expiration_time = now + timedelta(seconds=expires_in)  # 计算过期时间
        formatted_expiration_time = expiration_time.strftime("%Y-%m-%d %H:%M:%S")
        tool_instance = Tool.query.filter_by(
            tool_api_id=tool_api_instance.id, user_id=self.account.id
        ).first()
        if tool_instance is None:
            raise ValueError("无法找到对应工具")
        tool_auth_instance = ToolAuth(
            token=access_token,
            expires_at=formatted_expiration_time,
            tool_api_id=tool_api_instance.id,
            tool_id=tool_instance.id,
            endpoint_url=tool_api_instance.endpoint_url,
            user_id=self.account.id,
            user_name=self.account.name,
            user_type=(
                "mine" if tool_api_instance.user_id == self.account.id else "other"
            ),  # 确保 self.account 有 id 属性
            is_auth_success=True,
        )
        db.session.add(tool_auth_instance)
        db.session.commit()
        return tool_auth_instance

    def delete_tool_auth(self, tool_id):
        tool = Tool.query.get(tool_id)
        if tool is None:
            raise ValueError("未查询到工具")
        ToolAuth.query.filter_by(
            tool_id=tool_id, tool_api_id=tool.tool_api_id, user_id=self.account.id
        ).delete()
        db.session.commit()

    def save_service_api_auth(self, location, param_name, tool_api_instance):
        # tool_instance = Tool.query.filter_by(tool_api_id=tool_api_instance.id, user_id=self.account.id).first()
        # if tool_instance is None:
        #     raise ValueError("未查询到工具")
        tool_auth_instance = ToolAuth(
            tool_api_id=tool_api_instance.id,
            # tool_id=tool_instance.id,
            user_id=self.account.id,
            user_name=self.account.name,
            user_type=(
                "mine" if tool_api_instance.user_id == self.account.id else "other"
            ),  # 确保 self.account 有 id 属性
            is_auth_success=True,
            is_share=False,
            token=tool_api_instance.api_key,
            location=location,
            param_name=param_name,
            token_type="service_api",
        )
        db.session.add(tool_auth_instance)
        db.session.commit()
        db.session.flush()
        return tool_auth_instance

    def update_tool_auth(self, tool_id, tool_api_id):
        tool_api_instance = ToolHttp.query.get(tool_api_id)
        if tool_api_instance is None:
            return
        if tool_api_instance.auth_method == "service_api":
            tool_auth_instance = ToolAuth.query.filter_by(
                tool_api_id=tool_api_id, user_id=self.account.id
            ).first()
            if tool_auth_instance is None:
                return
            tool_auth_instance.tool_id = tool_id
            db.session.add(tool_auth_instance)
            db.session.commit()
            db.session.flush()
            return

    def export_tool_json(self, tool_id):
        tool_instance = self.get_by_id(tool_id)
        tool_dict = marshal(tool_instance, fields.tool_fields)

        tool_api_dict = {}
        tool_auth_dict = {}
        if tool_instance.tool_api_id:
            tool_api_instance = ToolHttp.query.get(tool_instance.tool_api_id)
            if tool_api_instance.auth_method == "service_api":
                tool_auth_instance = ToolAuth.query.filter_by(
                    tool_api_id=tool_instance.tool_api_id
                ).first()
                tool_api_instance.location = tool_auth_instance.location
                tool_api_instance.param_name = tool_auth_instance.param_name
                tool_auth_dict = marshal(tool_auth_instance, fields.tool_auth_fileds)

            tool_api_dict = marshal(tool_api_instance, fields.tool_api_full_fileds)

        tool_field_input_ids = ensure_list_from_json(tool_instance.tool_field_input_ids)
        tool_field_output_ids = ensure_list_from_json(
            tool_instance.tool_field_output_ids
        )
        all_field_ids = tool_field_input_ids + tool_field_output_ids
        db_fields = (
            db.session.query(ToolField).filter(ToolField.id.in_(all_field_ids)).all()
        )

        db_fields_list = [
            marshal(field_instance, fields.tool_field_fileds)
            for field_instance in db_fields
        ]

        return {
            "tool": tool_dict,
            "tool_api": tool_api_dict,
            "tool_auth": tool_auth_dict,
            "tool_fields": db_fields_list,
        }

    def get_apps_references(self, tool_ids):
        ref_apps = (
            db.session.query(App.id, App.name, App.is_public, WorkflowRefer.target_id)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id.in_(tool_ids),
                WorkflowRefer.target_type == "tool",
            )
            .all()
        )

        ref_res = {}
        for item in ref_apps:
            if item.target_id not in ref_res:
                ref_res[item.target_id] = [item]
            else:
                ref_res[item.target_id].append(item)

        return ref_res

    def get_ref_apps(self, tool_id):
        using_apps = (
            db.session.query(App.id, App.name, App.is_public)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id == str(tool_id),
                WorkflowRefer.target_type == "tool",
            )
            .all()
        )

        return using_apps
