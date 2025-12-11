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

import json
import os
import tempfile
from datetime import datetime

from flask import request, send_from_directory
from flask_login import current_user
from flask_restful import marshal, reqparse

from core.restful import Resource
from libs.feature_gate import require_internet_feature
from libs.login import login_required
from parts.logs import Action, LogService, Module
from parts.tag.tag_service import TagService
from parts.urls import api

from . import fields
from .service import ToolService
from .websocket_handle import get_tool_logger


class ToolListApi(Resource):

    @login_required
    def post(self):
        """获取工具分页列表。

        根据传入的查询条件获取工具的分页列表，支持按工具类型、发布状态、
        启用状态、标签、名称等条件进行筛选。

        Args:
            page (int, optional): 页码，默认为1。
            page_size (int, optional): 每页大小，默认为20。
            tool_type (str, optional): 工具类型，默认为空字符串。
            published (list, optional): 发布状态列表。
            enabled (list, optional): 启用状态列表。
            qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为already。
            search_tags (list, optional): 搜索标签列表，默认为空列表。
            search_name (str, optional): 搜索名称，默认为空字符串。
            tool_mode (list, optional): 工具模式列表，默认为空列表。
            user_id (list, optional): 用户ID列表，默认为空列表。

        Returns:
            dict: 包含工具分页信息的字典。

        Raises:
            ValueError: 当请求参数不合法时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument("tool_type", type=str, default="", location="json")
        parser.add_argument("published", type=list, location="json")
        parser.add_argument("enabled", type=list, location="json")
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="already"
        )  # mine/group/builtin/already
        parser.add_argument(
            "search_tags", type=list, location="json", required=False, default=[]
        )
        parser.add_argument(
            "search_name", type=str, location="json", required=False, default=""
        )
        parser.add_argument(
            "tool_mode", type=list, location="json", required=False, default=[]
        )
        parser.add_argument(
            "user_id", type=list, location="json", required=False, default=[]
        )
        parser.add_argument(
            "is_draft", type=bool, location="json", required=False, default=True
        )
        args = parser.parse_args()

        self.check_can_read()

        pagination = ToolService(current_user).get_pagination(args)
        return marshal(pagination, fields.tool_pagination)


class ToolDetailApi(Resource):
    @login_required
    def get(self):
        """工具详情"""
        tool_id = request.args.get("tool_id", type=str)
        tool_instance = ToolService(current_user).get_by_id_with_auth(tool_id, True)
        if tool_instance:
            self.check_can_read_object(tool_instance)
        return marshal(tool_instance, fields.tool_detail)


class ToolCheckName(Resource):
    @login_required
    def post(self):
        """检查名字重复"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        self.check_can_read()

        if not ToolService(current_user).existToolByName(data.get("name")):
            return {"message": "success", "code": 200}
        raise ValueError("工具名称已经存在，请更换")


class ToolCreateAndUpdateApi(Resource):
    @login_required
    def post(self):
        """创建与更新工具"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        if not data.get("name"):
            raise ValueError("参数错误")

        if data.get("id"):
            old_tool = ToolService(current_user).get_by_id(data.get("id"))
            self.check_can_write_object(old_tool)
            old_description = old_tool.description
            tool = ToolService(current_user).updateTool(data.get("id"), data)
            LogService().add(
                Module.TOOL,
                Action.EDIT_TOOL,
                name=data.get("name"),
                old_description=old_description,
                description=tool.description,
            )

        else:
            self.check_can_write()
            data["icon"] = data.get("icon") or "/app/upload/tool.jpg"
            tool = ToolService(current_user).createTool(data)
            LogService().add(
                Module.TOOL,
                Action.CREATE_TOOL,
                name=data.get("name"),
                describe=data.get("description"),
            )

        return marshal(tool, fields.tool_detail)


class ToolDeleteApi(Resource):
    @login_required
    def post(self):
        """删除工具"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        service = ToolService(current_user)
        tool = service.get_by_id(data.get("id"))

        self.check_can_admin_object(tool)
        # if tool_ids and ReferManager.is_tool_refered(tool_ids[0]):
        #     raise ValueError('该工具已被引用，无法删除')

        flag, name = ToolService(current_user).deleteTool(data.get("id"))
        if flag:
            LogService().add(Module.TOOL, Action.DELETE_TOOL, name=name)
        return {"code": 200, "message": "success"}


class ToolFieldCreateAndUpdateApi(Resource):

    @login_required
    def post(self):
        """field部分的页面编辑(API+IDE两种模式都有，每次都是新增数据)"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        if not isinstance(data, list):
            raise ValueError("输入的参数格式有误")

        create_list = []
        update_list = []

        for item in data:
            if item.get("id"):
                update_list.append(item)
            else:
                create_list.append(item)

        # 检查权限：如果有 tool_id，需要检查对 tool 的写权限
        tool_service = ToolService(current_user)
        tool_id = data[0].get("tool_id") if data else None
        if tool_id:
            tool = tool_service.get_by_id(tool_id)
            if tool:
                self.check_can_write_object(tool)
        else:
            self.check_can_write()

        saved_entities, save_errors = tool_service.createToolFields(create_list)
        updated_entities, update_errors = tool_service.updateToolFields(update_list)

        response = {
            "save_success_field": saved_entities,
            "update_success_field": updated_entities,
            "save_error": save_errors,
            "update_error": update_errors,
        }
        return marshal(response, fields.create_update_tool)


class ToolFieldsDetailApi(Resource):

    @login_required
    def post(self):
        """field部分的数据详情(API+IDE两种模式都有)"""
        # 获取 JSON 数据
        data = request.get_json(force=True)
        
        self.check_can_write()
        
        parsed_fields = self.parse_fields(data.get("fields", []))

        queryset = ToolService(current_user).getToolFields(parsed_fields)

        response = {"data": queryset}
        return marshal(response, fields.tool_list)

    def parse_fields(self, fields):
        if not fields:
            return []

        if isinstance(fields, int):  # 如果 fields 是整数，直接返回包含该整数的列表
            return [fields]

        if isinstance(fields, str):  # 如果 fields 是字符串，将其转换为单元素列表
            fields = [fields]

        # 现在处理列表情况
        if len(fields) == 1 and isinstance(fields[0], str):
            if fields[0].startswith("[") and fields[0].endswith("]"):
                try:
                    return json.loads(fields[0])
                except json.JSONDecodeError:
                    return [int(f.strip()) for f in fields[0].strip("[]").split(",")]
            else:
                # 单个字符串，但不是 JSON 格式
                try:
                    return [int(fields[0])]
                except ValueError:
                    return [fields[0]]  # 如果不能转换为整数，保留原字符串

        # 处理多个元素的列表
        try:
            return [int(f) for f in fields]
        except ValueError:
            return fields  # 如果转换失败，返回原始列表


class ToolApiCreateAndUpdateApi(Resource):

    @login_required
    def post(self):
        """HTTP部分的页面编辑(每次都是新增就很诡异)"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        # 检查权限：如果有 tool_id，需要检查对 tool 的写权限
        tool_id = data.get("tool_id")
        if tool_id:
            service = ToolService(current_user)
            tool = service.get_by_id(tool_id)
            if tool:
                self.check_can_write_object(tool)
        else:
            self.check_can_write()

        tool_api_instance = ToolService(current_user).upsertToolApi(
            data, data.get("id")
        )
        return marshal(tool_api_instance, fields.tool_api_fileds)


class ToolApiDetailApi(Resource):

    @login_required
    def get(self):
        """HTTP部分的数据详情"""
        tool_api_id = request.args.get("api_id", default=0, type=int)
        if tool_api_id == 0:
            return {}
        instance = ToolService(current_user).get_toolapi_by_id(tool_api_id)
        # 通过 tool_api_id 查找对应的 tool 进行权限检查
        if instance:
            from .model import Tool
            tool = Tool.query.filter_by(tool_api_id=tool_api_id).first()
            if tool:
                self.check_can_read_object(tool)
        return marshal(instance, fields.tool_api_fileds)


class ToolPublishApi(Resource):
    @login_required
    def post(self):
        """发布工具"""
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, location="json")
        parser.add_argument(
            "publish_type", type=str, location="json", default="正式发布"
        )
        data = parser.parse_args()

        service = ToolService(current_user)
        draft_tool = service.get_by_id(data["id"])
        self.check_can_write_object(draft_tool)

        tool = service.pulishTool(data["id"], data["publish_type"])
        if tool:
            LogService().add(Module.TOOL, Action.PUBLISH_TOOL, name=tool.name)
        TagService(current_user).update_tag_binding(
            "tool", tool.id, draft_tool.tags
        )  # 更新标签
        return {"code": 200, "message": "success"}


class ToolCancelPublishApi(Resource):
    @login_required
    def post(self):
        """发布工具"""
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, location="json")
        data = parser.parse_args()

        service = ToolService(current_user)
        tool = service.get_by_id(data["id"])
        self.check_can_write_object(tool)

        tool = service.cancel_pulish_tool(data["id"])
        if tool:
            LogService().add(Module.TOOL, Action.PUBLISH_TOOL, name=tool.name)
        return {"code": 200, "message": "success"}


class ToolEnableApi(Resource):
    @login_required
    def post(self):
        """启用工具"""
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        tool_id = data.get("id")
        enable = data.get("enable")

        if tool_id is None or enable is None:
            raise ValueError("缺少必要的参数")

        service = ToolService(current_user)
        tool = service.get_by_id(data["id"])
        self.check_can_write_object(tool)

        tool = service.enableTool(tool_id, enable)

        if tool:
            if enable:
                LogService().add(Module.TOOL, Action.ENABLE_TOOL, name=tool.name)
            else:
                LogService().add(Module.TOOL, Action.DISABLE_TOOL, name=tool.name)

        return {"code": 200, "message": "success"}


class ToolCopyApi(Resource):
    @login_required
    def post(self):
        """复制一份新的工具"""
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, location="json")
        data = parser.parse_args()

        service = ToolService(current_user)
        old_tool = service.get_by_id(data["id"])
        # 检查当前用户是否有权限复制该工具
        self.check_can_read_object(old_tool)
        new_name = service.get_copy_name(old_tool)
        new_tool = service.copyTool(old_tool, new_name)
        LogService().add(
            Module.TOOL,
            Action.CREATE_TOOL,
            name=new_tool.name,
            describe=new_tool.description,
        )

        TagService(current_user).update_tag_binding(
            "tool", new_tool.id, old_tool.tags
        )  # 更新标签
        return {"code": 200, "message": "success"}


class ToolTestApi(Resource):
    @login_required
    @require_internet_feature("工具运行")
    def post(self):
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        service = ToolService(current_user)
        tool = service.get_by_id(data.get("id"))
        if tool:
            self.check_can_write_object(tool)

        if not service.checkToolCanTest(data.get("id")):
            raise ValueError("当前工具不可运行")

        return service.testTool(
            data.get("id"), data.get("input", {}), data.get("vars_for_code", {})
        )


class TestApi(Resource):
    @login_required
    def post(self):
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        service = ToolService(current_user)
        tool = service.get_by_id(data.get("id"))
        if tool:
            self.check_can_write_object(tool)

        logger = get_tool_logger(data["id"])
        logger.info("test")


# 生成对应的授权URL
class ToolAuthByUserReturnUrlApi(Resource):
    @login_required
    def post(self):
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        
        service = ToolService(current_user)
        tool = service.get_by_id(data.get("tool_id"))
        if tool:
            self.check_can_write_object(tool)
        
        return service.tool_auth_by_user_return_url(
            data.get("tool_id")
        )


class ToolAuthShare(Resource):
    @login_required
    def post(self):
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        
        service = ToolService(current_user)
        tool = service.get_by_id(data.get("tool_id"))
        if tool:
            self.check_can_write_object(tool)
        
        service.tool_auth_share(
            data.get("tool_id"), data.get("share_status")
        )
        return {"code": 200, "message": "success"}


class ToolAuthDeleteAuthByUser(Resource):
    @login_required
    def post(self):
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        
        service = ToolService(current_user)
        tool = service.get_by_id(data.get("tool_id"))
        if tool:
            self.check_can_write_object(tool)
        
        service.delete_tool_auth(data.get("tool_id"))
        return {"code": 200, "message": "success"}


class ToolAuthCallBack(Resource):
    def get(self):
        code = request.args.get("code")
        state = request.args.get("state")
        ToolService(None).tool_auth(code, state)
        return {"code": 200, "message": "success"}


class ToolExportApi(Resource):
    @login_required
    def get(self):
        """导出文件"""
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, location="args")
        parser.add_argument("format", type=str, location="args")
        data = parser.parse_args()

        service = ToolService(current_user)
        tool = service.get_by_id(data["id"])
        # 检查当前用户是否有权限复制该工具
        self.check_can_read_object(tool)

        result = service.export_tool_json(data["id"])
        if data["format"] == "json":
            return result
        else:  # download file
            with tempfile.TemporaryDirectory() as tmpdirname:
                app_name = result.get("name") or ""
                filename = "{}-{}.json".format(
                    app_name, datetime.now().strftime("%Y%m%d%H%M%S")
                )
                with open(os.path.join(tmpdirname, filename), "w") as f_write:
                    f_write.write(json.dumps(result))
                return send_from_directory(tmpdirname, filename, as_attachment=True)


class ToolReferenceResult(Resource):
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, location="args")
        data = parser.parse_args()
        tool_id = data["id"]

        service = ToolService(current_user)
        tool = service.get_by_id(tool_id)
        if not tool.enable:
            return []

        # 2. 查询数据
        refs = service.get_ref_apps(tool_id)
        return marshal(refs, fields.app_ref_fields)


api.add_resource(ToolListApi, "/tool/list")
api.add_resource(ToolDetailApi, "/tool/tool_api")
api.add_resource(ToolCheckName, "/tool/check_name")
api.add_resource(ToolCreateAndUpdateApi, "/tool/create_update_tool")
api.add_resource(ToolDeleteApi, "/tool/delete_tool")
api.add_resource(ToolExportApi, "/tool/export")

api.add_resource(
    ToolFieldCreateAndUpdateApi, "/tool/create_update_field"
)  # 这个接口需要跟create_update_tool接口配合完成一件事,这种设计不好!
api.add_resource(ToolFieldsDetailApi, "/tool/tool_fields")

api.add_resource(
    ToolApiCreateAndUpdateApi, "/tool/upsert_tool_api"
)  # 这个接口需要跟create_update_tool接口配合完成一件事,这种设计不好!
api.add_resource(ToolApiDetailApi, "/tool/tool_api_info")

api.add_resource(ToolPublishApi, "/tool/publish_tool")
api.add_resource(ToolCancelPublishApi, "/tool/cancel_publish")
api.add_resource(ToolEnableApi, "/tool/enable_tool")
api.add_resource(ToolCopyApi, "/tool/copy_tool")
api.add_resource(ToolTestApi, "/tool/test_tool")
api.add_resource(TestApi, "/tool/test")

api.add_resource(ToolAuthByUserReturnUrlApi, "/tool/return_auth_url")
api.add_resource(ToolAuthCallBack, "/tool/auth")
api.add_resource(ToolAuthShare, "/tool/auth_share")
api.add_resource(ToolAuthDeleteAuthByUser, "/tool/delete_auth_by_user")
api.add_resource(ToolReferenceResult, "/tool/reference-result")
