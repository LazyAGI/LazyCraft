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


import logging

import httpx
from anyio import BrokenResourceError
from flask import Response, request, stream_with_context
from flask_login import current_user
from flask_restful import marshal, reqparse
from mcp import McpError
from mcp.shared.exceptions import McpError as SharedMcpError

from core.restful import Resource
from libs.login import login_required
from parts.app.node_run.event_serializer import EventSerializer
from parts.app.refer_service import ReferManager
from parts.logs import Action, LogService, Module
from parts.mcp.model import TestState
from parts.urls import api

from . import fields
from .service import McpServerService, McpToolService


class McpServerListApi(Resource):
    @login_required
    def post(self):
        """获取MCP服务器分页列表。

        根据传入的查询条件获取MCP服务器的分页列表，支持按发布状态、
        启用状态、标签、名称等条件进行筛选。

        Args:
            page (int, optional): 页码，默认为1。
            page_size (int, optional): 每页大小，默认为20。
            publish (list, optional): 发布状态列表。
            enable (bool, optional): 启用状态。
            qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为already。
            search_tags (list, optional): 搜索标签列表，默认为空列表。
            search_name (str, optional): 搜索名称，默认为空字符串。
            user_id (list, optional): 用户ID列表，默认为空列表。

        Returns:
            dict: 包含MCP服务器分页信息的字典。

        Raises:
            ValueError: 当请求参数不合法时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="json")
        parser.add_argument("page_size", type=int, default=20, location="json")
        parser.add_argument("publish", type=list, location="json")  # 发布状态
        parser.add_argument("enable", type=bool, location="json")  # 启用状态
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
            "user_id", type=list, location="json", required=False, default=[]
        )
        args = parser.parse_args()
        
        self.check_can_read()
        
        pagination = McpServerService(current_user).get_pagination(args)
        return marshal(pagination, fields.mcp_server_pagination)


class McpServerDetailApi(Resource):
    @login_required
    def get(self):
        """获取MCP服务器详细信息。

        根据MCP服务器ID获取服务器的详细信息。

        Args:
            mcp_server_id (int): MCP服务器ID。

        Returns:
            dict: 包含MCP服务器详细信息的字典。

        Raises:
            ValueError: 当找不到指定的MCP服务器时抛出。
            ForbiddenError: 当用户没有读取权限时抛出。
        """
        mcp_server_id = request.args.get("mcp_server_id", type=int)
        mcp_server = McpServerService(current_user).get_by_id(mcp_server_id)
        if mcp_server:
            self.check_can_read_object(mcp_server)
        return marshal(mcp_server, fields.mcp_server_detail)


class McpServerCheckName(Resource):
    @login_required
    def post(self):
        """检查MCP服务器名称是否已存在。

        验证指定的服务器名称是否已经被使用。

        Args:
            name (str): 要检查的服务器名称。

        Returns:
            dict: 包含检查结果的字典，成功时返回{"message": "success", "code": 200}。

        Raises:
            ValueError: 当输入参数格式有误或名称已存在时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        
        self.check_can_read()
        
        if not McpServerService(current_user).exist_by_name(data.get("name")):
            return {"message": "success", "code": 200}
        raise ValueError("工具名称已经存在，请更换")


class McpServerCreateAndUpdateApi(Resource):
    @login_required
    def post(self):
        """创建或更新MCP服务器。

        根据传入的数据创建新的MCP服务器或更新已存在的服务器。
        如果数据中包含id字段则进行更新，否则创建新服务器。

        Args:
            name (str): 服务器名称。
            id (int, optional): 服务器ID，如果提供则进行更新。
            description (str, optional): 服务器描述。
            icon (str, optional): 服务器图标。
            transport_type (str): 传输类型。
            timeout (int, optional): 超时时间。
            stdio_command (str, optional): STDIO命令。
            stdio_arguments (str, optional): STDIO参数。
            stdio_env (dict, optional): STDIO环境变量。
            http_url (str, optional): HTTP URL。
            headers (dict, optional): HTTP头。

        Returns:
            dict: 包含创建或更新后服务器详细信息的字典。

        Raises:
            ValueError: 当输入参数不合法或缺少必要参数时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        if not data.get("name"):
            raise ValueError("参数错误")

        if data.get("id"):
            old_server = McpServerService(current_user).get_by_id(data.get("id"))
            self.check_can_write_object(old_server)
            old_description = old_server.description
            server = McpServerService(current_user).update_server(data.get("id"), data)
            LogService().add(
                Module.MCP_TOOL,
                Action.EDIT_TOOL,
                name=data.get("name"),
                old_description=old_description,
                description=server.description,
            )
        else:
            self.check_can_write()
            data["icon"] = data.get("icon") or "/app/upload/tool.jpg"
            server = McpServerService(current_user).create_server(data)
            LogService().add(
                Module.MCP_TOOL,
                Action.CREATE_TOOL,
                name=data.get("name"),
                describe=data.get("description"),
            )

        return marshal(server, fields.mcp_server_detail)


class McpServerDeleteApi(Resource):
    @login_required
    def post(self):
        """删除MCP服务器。

        删除指定的MCP服务器，删除前会检查服务器是否被引用。

        Args:
            id (int): 要删除的服务器ID。

        Returns:
            dict: 包含删除结果的字典。

        Raises:
            ValueError: 当输入参数不合法或服务器被引用时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        service = McpServerService(current_user)
        server = service.get_by_id(data.get("id"))
        self.check_can_admin_object(server)
        if ReferManager.is_mcp_refered(server.id):
            raise ValueError("该工具已被引用，无法删除")
        flag, name = service.delete_server(data.get("id"))
        if flag:
            LogService().add(Module.MCP_TOOL, Action.DELETE_TOOL, name=name)
        return {"code": 200, "message": "success"}


class McpServerPublishApi(Resource):
    @login_required
    def post(self):
        """发布MCP服务器。

        将MCP服务器发布为可用状态，支持不同的发布类型。

        Args:
            id (str): 服务器ID。
            publish_type (str): 发布类型。

        Returns:
            dict: 包含发布结果的字典。

        Raises:
            ValueError: 当输入参数不合法时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=str, location="json")
        parser.add_argument("publish_type", type=str, location="json")
        data = parser.parse_args()

        service = McpServerService(current_user)
        mcp_service = service.get_by_id(data["id"])
        self.check_can_write_object(mcp_service)

        tool = service.publish_server(data["id"], data["publish_type"])
        if tool:
            LogService().add(Module.MCP_TOOL, Action.PUBLISH_TOOL, name=tool.name)
        return {"code": 200, "message": "success"}


class McpServerEnableApi(Resource):
    @login_required
    def post(self):
        """启用或禁用MCP服务器。

        设置MCP服务器的启用状态。

        Args:
            id (int): 服务器ID。
            enable (bool): 是否启用服务器。

        Returns:
            dict: 包含操作结果的字典。

        Raises:
            ValueError: 当输入参数不合法或缺少必要参数时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        mcp_service_id = data.get("id")
        enable = data.get("enable")

        if mcp_service_id is None or enable is None:
            raise ValueError("缺少必要的参数")

        server = McpServerService(current_user)
        mcp = server.get_by_id(mcp_service_id)
        self.check_can_write_object(mcp)

        mcp = server.enable_server(mcp_service_id, enable)
        if mcp:
            if enable:
                LogService().add(Module.MCP_TOOL, Action.ENABLE_TOOL, name=mcp.name)
            else:
                LogService().add(Module.MCP_TOOL, Action.DISABLE_TOOL, name=mcp.name)

        return {"code": 200, "message": "success"}


class McpToolListApi(Resource):
    @login_required
    def post(self):
        """获取MCP工具列表。

        根据MCP服务器ID获取对应的工具列表。

        Args:
            mcp_server_id (int): MCP服务器ID。

        Returns:
            dict: 包含MCP工具列表的字典。

        Raises:
            ValueError: 当输入参数不合法或MCP服务器ID为空时抛出。
            ForbiddenError: 当用户没有读取权限时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        mcp_server_id = data.get("mcp_server_id")
        if not mcp_server_id:
            raise ValueError("MCP服务ID不能为空")

        # 检查权限
        mcp_server = McpServerService(current_user).get_by_id(mcp_server_id)
        if mcp_server:
            self.check_can_read_object(mcp_server)

        tools = McpToolService(current_user).get_by_mcp_server_id(mcp_server_id)
        return marshal({"data": tools}, fields.mcp_tool_list)


class McpToolDetailApi(Resource):
    @login_required
    def get(self):
        """获取MCP工具详细信息。

        根据工具ID获取MCP工具的详细信息。

        Args:
            tool_id (int): 工具ID。

        Returns:
            dict: 包含MCP工具详细信息的字典。

        Raises:
            ValueError: 当找不到指定的工具时抛出。
        """
        tool_id = request.args.get("tool_id", type=int)
        tool_instance = McpToolService(current_user).get_by_id(tool_id)
        if tool_instance and tool_instance.mcp_server_id:
            mcp_server = McpServerService(current_user).get_by_id(tool_instance.mcp_server_id)
            if mcp_server:
                self.check_can_read_object(mcp_server)
        return marshal(tool_instance, fields.mcp_tool_detail)


class McpServerSyncToolsApi(Resource):
    @login_required
    def post(self):
        """同步MCP服务器的工具。

        从指定的MCP服务器同步工具，使用服务器端发送事件方式返回进度。

        Args:
            id (int): MCP服务器ID。

        Returns:
            Response: 服务器端发送事件流。

        Raises:
            ValueError: 当输入参数不合法或MCP服务器ID为空时抛出。
            ForbiddenError: 当用户没有写入权限时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")

        mcp_server_id = data.get("id")
        if not mcp_server_id:
            raise ValueError("MCP服务ID不能为空")
        
        # 检查权限
        mcp_server = McpServerService(current_user).get_by_id(mcp_server_id)
        self.check_can_write_object(mcp_server)
        
        service = McpToolService(current_user)

        def event_stream():
            for x in service.sync_tools_from_server(mcp_server_id):
                yield EventSerializer.sse_message(x)

        return Response(
            stream_with_context(event_stream()),
            status=200,
            mimetype="text/event-stream",
        )


class McpToolTestApi(Resource):
    @login_required
    def post(self):
        """测试MCP工具。

        使用指定的参数测试MCP工具的功能，并更新服务器的测试状态。

        Args:
            mcp_server_id (int): MCP服务器ID。
            tool_id (int): 工具ID。
            param (dict, optional): 测试参数。

        Returns:
            dict: 包含测试结果的字典。

        Raises:
            ValueError: 当输入参数不合法或缺少必要参数时抛出。
            ForbiddenError: 当用户没有写入权限时抛出。
        """
        data = request.json
        if not data:
            raise ValueError("输入的参数格式有误")
        if not data.get("mcp_server_id") or not data.get("tool_id"):
            raise ValueError("MCP服务ID和工具ID不能为空")

        # 检查权限
        mcp_server = McpServerService(current_user).get_by_id(data["mcp_server_id"])
        self.check_can_write_object(mcp_server)

        service = McpToolService(current_user)
       
        result = service.test_tool(
            data["mcp_server_id"], data["tool_id"], data.get("param")
        )
        if result.get("status") != 200:
            return result, 400

        result = result.get("result")

        mcpServer = McpServerService(current_user)
        if result is None:
            mcpServer.update_test_state(data["mcp_server_id"], TestState.ERROR)
            return {
                "message": "工具测试失败，请检查参数或联系管理员",
                "status": 400,
            }, 400
        if result.isError:
            mcpServer.update_test_state(data["mcp_server_id"], TestState.ERROR)
            if result.content and isinstance(result.content, list):
                return {
                    "message": "MCP 工具返回的错误提示：" + result.content[0].text,
                    "status": 400,
                }, 400
            return {
                "message": "MCP 工具返回的错误提示：" + result.model_dump_json(),
                "status": 400,
            }, 400
        else:
            result_dict = result.model_dump()
            # 设置mcp应用的状态为success
            mcpServer.update_test_state(data["mcp_server_id"], TestState.SUCCESS)

            if result.content and isinstance(result.content, list):
                return {
                    "message": result_dict["content"][0]["text"],
                    "status": 200,
                }, 200
            return {"message": result_dict, "status": 200}, 200
        

class MCPToolReferenceResult(Resource):
    @login_required
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument("id", type=int, location="args")
        data = parser.parse_args()
        mcp_tool_id = data["id"]

        service = McpServerService(current_user)
        tool = service.get_by_id(mcp_tool_id)
        if not tool:
            return []
        
        # 检查用户是否有权限查看该MCP工具的引用结果（需要能读取该MCP服务器）
        self.check_can_read_object(tool)
        
        if not tool.enable:
            return []

        # 2. 查询数据
        refs = service.get_ref_apps(mcp_tool_id)
        return marshal(refs, fields.app_ref_fields)


# 注册路由
api.add_resource(McpServerListApi, "/mcp/servers")
api.add_resource(McpServerDetailApi, "/mcp/servers/detail")
api.add_resource(McpServerCheckName, "/mcp/servers/check-name")
api.add_resource(McpServerCreateAndUpdateApi, "/mcp/servers/create-update")
api.add_resource(McpServerDeleteApi, "/mcp/servers/delete")
api.add_resource(McpServerPublishApi, "/mcp/servers/publish")
api.add_resource(McpServerEnableApi, "/mcp/servers/enable")
api.add_resource(McpServerSyncToolsApi, "/mcp/servers/sync-tools")

api.add_resource(McpToolListApi, "/mcp/tools")
api.add_resource(McpToolDetailApi, "/mcp/tools/detail")
api.add_resource(McpToolTestApi, "/mcp/tools/test-tool")
api.add_resource(MCPToolReferenceResult, "/mcp/reference-result")
