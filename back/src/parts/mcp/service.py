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

import asyncio
import logging
import queue
import threading
from datetime import timedelta
import httpx
import mcp
from anyio import BrokenResourceError
from exceptiongroup import ExceptionGroup
from httpx import ConnectError
from mcp import ClientSession, McpError, StdioServerParameters
from mcp.client.sse import sse_client
from mcp.client.stdio import stdio_client
from mcp.shared.context import RequestContext
from mcp.shared.exceptions import McpError as SharedMcpError
from mcp.types import CreateMessageRequestParams

from sqlalchemy import and_, or_
from sqlalchemy.orm.exc import NoResultFound

from lazyllm.tools import MCPClient

from libs.timetools import TimeTools
from models.model_account import Account
from parts.logs import Action, LogService, Module
from parts.tag.model import Tag
from utils.util_database import db


from .model import McpServer, McpTool, TestState
from parts.app.model import App, WorkflowRefer


class McpServerService:
    def __init__(self, account):
        if account:
            self.user_id = account.id
            self.account = account

    def get_pagination(self, data):
        """获取MCP服务器分页列表。

        根据传入的筛选条件获取MCP服务器的分页列表，支持多种查询类型和过滤条件。

        Args:
            data (dict): 包含查询条件的字典，可包含以下字段：
                - publish (list): 发布状态过滤条件
                - enable (bool): 启用状态过滤条件
                - search_tags (list): 搜索标签列表
                - search_name (str): 搜索名称关键词
                - user_id (list): 用户ID过滤列表
                - qtype (str): 查询类型（mine/group/builtin/already）
                - page (int): 页码
                - page_size (int): 每页大小

        Returns:
            Pagination: Flask-SQLAlchemy分页对象，包含查询结果和分页信息。

        Raises:
            ValueError: 当查询参数不合法时抛出。
        """
        filters = []
        query = McpServer.query

        if data.get("publish"):
            publish_value = [1 if x == True else 0 for x in data["publish"]]
            query = query.filter(McpServer.publish.in_(publish_value))
        if data.get("enable") is not None:
            query = query.filter(McpServer.enable == data.get("enable"))
        if data.get("search_tags"):
            target_ids = Tag.get_target_ids_by_names(Tag.Types.MCP, data["search_tags"])
            target_ids = [int(k) for k in target_ids]
            query = query.filter(McpServer.id.in_(target_ids))
        if data.get("search_name"):
            search_name = data["search_name"]
            filters.append(
                or_(
                    McpServer.name.ilike(f"%{search_name}%"),
                    McpServer.description.ilike(f"%{search_name}%"),
                )
            )
        if data.get("user_id"):
            query = query.filter(McpServer.user_id.in_(data["user_id"]))

        if data.get("qtype") == "mine":
            filters.append(McpServer.tenant_id == self.account.current_tenant_id)
            filters.append(McpServer.user_id == self.account.id)
        elif data.get("qtype") == "group":
            filters.append(
                and_(
                    McpServer.tenant_id == self.account.current_tenant_id,
                    McpServer.user_id != self.account.id,
                )
            )
        elif data.get("qtype") == "builtin":  # 内置的服务
            filters.append(McpServer.user_id == Account.get_administrator_id())
        elif data.get("qtype") == "already":  # 混合数据
            filters.append(
                or_(
                    McpServer.tenant_id == self.account.current_tenant_id,
                    McpServer.user_id == Account.get_administrator_id(),
                )
            )

        query = query.filter(*filters)
        query = query.order_by(McpServer.updated_at.desc())
        paginate = query.paginate(
            page=data["page"], per_page=data["page_size"], error_out=False
        )

        mcp_server_ids = [str(server.id) for server in paginate.items]
        ref_res = self.get_apps_references(mcp_server_ids)
        for server in paginate.items:
            if server.user_id and server.user_id == Account.get_administrator_id():
                server.user_name = "Lazy LLM官方"
            else:
                server.user_name = getattr(
                    db.session.get(Account, server.user_id), "name", ""
                )

            server_id = server.id
            ref_list = ref_res.get(str(server_id), [])
            server.ref_status = True if ref_list else False

        return paginate
    
    def get_apps_references(self, mcp_server_ids):
        ref_apps = (
            db.session.query(App.id, App.name, App.is_public, WorkflowRefer.target_id)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id.in_(mcp_server_ids),
                WorkflowRefer.target_type == "mcp",
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

    def get_by_id(self, mcp_server_id):
        """根据ID获取MCP服务器。

        通过MCP服务器ID查询并返回对应的服务器实例。

        Args:
            mcp_server_id (int): MCP服务器的唯一标识符。

        Returns:
            McpServer: MCP服务器模型实例。

        Raises:
            ValueError: 当找不到指定ID的MCP服务器时抛出。
        """
        mcp_server_id = int(mcp_server_id)
        try:
            return McpServer.query.filter_by(id=mcp_server_id).one()
        except NoResultFound:
            raise ValueError("没有找到 MCP 服务")

    def create_server(self, data):
        """创建新的MCP服务器。

        根据传入的数据创建一个新的MCP服务器实例并保存到数据库。

        Args:
            data (dict): 包含服务器配置信息的字典，包含以下字段：
                - name (str): 服务器名称
                - description (str, optional): 服务器描述
                - icon (str, optional): 服务器图标
                - transport_type (str): 传输类型（SSE/STDIO/Streamable_HTTP）
                - timeout (int, optional): 超时时间
                - stdio_command (str, optional): STDIO命令
                - stdio_arguments (str, optional): STDIO参数
                - stdio_env (dict, optional): STDIO环境变量
                - http_url (str, optional): HTTP URL
                - headers (dict, optional): HTTP头

        Returns:
            McpServer: 新创建的MCP服务器模型实例。

        Raises:
            ValueError: 当transport_type不合法或服务器名称已存在时抛出。
        """
        user_id = self.user_id
        now_str = TimeTools.get_china_now()

        # 校验 transport_type
        valid_types = ["SSE", "STDIO", "Streamable_HTTP"]
        if data.get("transport_type") not in valid_types:
            raise ValueError(f"transport_type 只能为 {valid_types} 之一")

        if McpServer.query.filter_by(
            name=data.get("name"), tenant_id=self.account.current_tenant_id
        ).first():
            raise ValueError("MCP服务名称已存在")

        new_server = McpServer()  # 假设 McpServer.__init__ 支持无参数初始化

        new_server.name = data.get("name")
        new_server.description = data.get("description") or ""
        new_server.icon = data.get("icon") or ""
        new_server.transport_type = data.get("transport_type")
        new_server.timeout = data.get("timeout")
        new_server.stdio_command = data.get("stdio_command")
        new_server.stdio_arguments = data.get("stdio_arguments")
        new_server.stdio_env = data.get("stdio_env")
        new_server.http_url = data.get("http_url")
        new_server.headers = data.get("headers")
        new_server.created_at = now_str
        new_server.updated_at = now_str
        new_server.user_id = user_id
        new_server.user_name = self.account.name
        new_server.tenant_id = self.account.current_tenant_id
        new_server.publish = False
        new_server.enable = False
        new_server.test_state = TestState.INIT.value  # 初始状态为未测试

        db.session.add(new_server)
        db.session.flush()
        db.session.commit()
        return new_server

    def update_server(self, mcp_server_id, data):
        """MCP 服务"""
        server = self.get_by_id(mcp_server_id)
        now_str = TimeTools.get_china_now()

        # 校验 transport_type
        valid_types = ["SSE", "STDIO", "Streamable_HTTP"]
        if data.get("transport_type") and data.get("transport_type") not in valid_types:
            raise ValueError(f"transport_type 只能为 {valid_types} 之一")

        # 检查关键字段是否有变化
        changed = False
        if "transport_type" in data and data["transport_type"] != server.transport_type:
            changed = True
        if "stdio_command" in data and data["stdio_command"] != server.stdio_command:
            changed = True
        if (
            "stdio_arguments" in data
            and data["stdio_arguments"] != server.stdio_arguments
        ):
            changed = True
        if "stdio_env" in data and data["stdio_env"] != server.stdio_env:
            changed = True
        if "http_url" in data and data["http_url"] != server.http_url:
            changed = True
        if "headers" in data and data["headers"] != server.headers:
            changed = True

        if data.get("name") and data.get("name") != server.name:
            if McpServer.query.filter_by(
                name=data.get("name"), tenant_id=self.account.current_tenant_id
            ).first():
                raise ValueError("服务名称已存在")
            server.name = data.get("name", server.name)
        server.description = data.get("description")
        server.icon = data.get("icon") or "/app/upload/tool.jpg"
        server.transport_type = data.get("transport_type")
        server.timeout = data.get("timeout")
        server.stdio_command = data.get("stdio_command")
        server.stdio_arguments = data.get("stdio_arguments")
        server.stdio_env = data.get("stdio_env")
        server.http_url = data.get("http_url")
        server.headers = data.get("headers")
        server.updated_at = now_str

        server.user_id = self.user_id
        server.user_name = self.account.name
        server.tenant_id = self.account.current_tenant_id

        # 如果关键字段有变化，重置测试状态
        if changed:
            server.test_state = TestState.INIT.value  # 重置为未测试状态
            server.publish = False  # 更新时不自动发布
            server.publish_type = ""
            server.publish_at = None
            server.enable = False  # 更新时不自动启用

        db.session.commit()
        return server

    def update_test_state(self, mcp_server_id, test_state: TestState):
        server = self.get_by_id(mcp_server_id)
        server.test_state = test_state.value
        server.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return server

    def delete_server(self, mcp_server_id):
        """MCP 服务"""
        server = self.get_by_id(mcp_server_id)
        name = server.name
        Tag.delete_bindings(Tag.Types.MCP, mcp_server_id)
        db.session.delete(server)
        db.session.commit()
        return True, name

    def publish_server(self, mcp_server_id, publish_type):
        """MCP 服务"""
        server = self.get_by_id(mcp_server_id)
        if publish_type not in ["正式发布", ""]:
            raise ValueError("发布类型只能为 '正式发布' 或空字符串")
        # 检查测试状态
        if publish_type == "正式发布" and server.test_state != TestState.SUCCESS.value:
            raise ValueError("测试通过后才能发布")
        now_str = TimeTools.get_china_now()
        if publish_type == "正式发布":
            server.publish = True
            server.publish_at = now_str
            server.publish_type = publish_type
        else:
            # 如果是空字符串，表示取消发布
            server.publish = False
            server.publish_at = None
            server.publish_type = ""
        server.updated_at = now_str
        db.session.commit()
        return server

    def enable_server(self, mcp_server_id, enable):
        """启用/禁用MCP 服务"""
        server = self.get_by_id(mcp_server_id)
        if not isinstance(enable, bool):
            raise ValueError("enable 参数必须为布尔值")

        # 检查是否可以启用
        if enable and not server.publish:
            raise ValueError("服务未发布，无法启用")

        server.enable = enable
        server.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return server

    def exist_by_name(self, name):
        """服务名称是否存在"""
        return (
            McpServer.query.filter_by(
                name=name, tenant_id=self.account.current_tenant_id
            ).first()
            is not None
        )

    def get_ref_apps(self, mcp_tool_id):
        using_apps = (
            db.session.query(App.id, App.name, App.is_public)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id == str(mcp_tool_id),
                WorkflowRefer.target_type == "mcp",
            )
            .all()
        )

        return using_apps


class McpToolService:
    def __init__(self, account):
        if account:
            self.user_id = account.id
            self.account = account

    def get_by_mcp_server_id(self, mcp_server_id):
        """据服务器 ID 获取工具列表"""
        return McpTool.query.filter_by(mcp_server_id=mcp_server_id).all()

    def get_by_id(self, mcp_tool_id):
        """据 ID 获取 MCP 工具"""
        mcp_tool_id = int(mcp_tool_id)
        try:
            return McpTool.query.filter_by(id=mcp_tool_id).one()
        except NoResultFound:
            raise ValueError("没有找到 MCP 工具")

    def delete_tools_by_mcp_server_id(self, mcp_server_id):
        """根据 MCP 服务器 ID 删除工具"""
        McpTool.query.filter_by(mcp_server_id=mcp_server_id).delete()
        db.session.commit()
        return True

    def test_tool(self, mcp_server_id, tool_id, arguments: dict):
        server = McpServerService(self.account).get_by_id(mcp_server_id)
        if not server:
            return {
                "message": "MCP 服务不存在",
                "status": 400,
            }
        tool = self.get_by_id(tool_id)
        if not tool:
            return {
                "message": "MCP 工具不存在",
                "status": 400,
            }
        try:
            if server.transport_type == "STDIO":
                args = []
                if server.stdio_arguments:
                    args = [word for word in server.stdio_arguments.split(" ") if word]
                client = MCPClient(
                    command_or_url=server.stdio_command,
                    args=args,
                    env=server.stdio_env,
                    timeout=server.timeout,
                )
                return {
                    "status": 200,
                    "result": asyncio.run(client.call_tool(tool.name, arguments))
                }
            elif server.transport_type == "SSE":
                client = MCPClient(
                    command_or_url=server.http_url,
                    headers=server.headers or {},
                    timeout=server.timeout,
                )
                return {
                    "status": 200,
                    "result": asyncio.run(client.call_tool(tool.name, arguments))
                }
            else:
                return {
                    "message": "该MCP服务类型不支持，仅支持SSE、STDIO",
                    "status": 400,
                }
        except Exception as e:
            error_msg = []
            for error_message in handle_exception(e):
                error_msg.append(error_message.get("data"))
            return {
                    "message": '\n'.join(error_msg),
                    "status": 400,
                   }

        

    def sync_tools_from_server(self, mcp_server_id):
        """服务器同步工具，分阶段yield状态"""
        yield {"flow_type": "mcp", "event": "start", "data": "开始"}
        try:
            server = McpServerService(self.account).get_by_id(mcp_server_id)
        except Exception as e:
            yield {"flow_type": "mcp", "event": "error", "data": str(e)}

        if not server:
            yield {"flow_type": "mcp", "event": "error", "data": "MCP 服务不存在"}
            return
        try:
            if server.transport_type == "STDIO":
                tools_func = self.sync_tools_from_stdio
            elif server.transport_type == "SSE":
                tools_func = self.sync_tools_from_sse
            else:
                yield {
                    "flow_type": "mcp",
                    "event": "error",
                    "data": f"暂不支持的该 MCP 服务类型: {server.transport_type}",
                }
                return
            for x in self.sync_event_stream(tools_func(server)):
                logging.info(f"同步工具信息: {x}")
                if x and x.get("event") == "finish" and x.get("data"):
                    # 获取当前数据库中的工具
                    existing_tools = McpTool.query.filter_by(
                        mcp_server_id=mcp_server_id
                    ).all()
                    existing_tools_dict = {tool.name: tool for tool in existing_tools}

                    # 处理同步的工具
                    synced_tool_names = set()
                    new_tools = []
                    updated_count = 0

                    for tool_dict in x["data"]:
                        tool_name = tool_dict.get("name")
                        if not tool_name:
                            continue

                        synced_tool_names.add(tool_name)

                        if tool_name in existing_tools_dict:
                            # 更新现有工具
                            existing_tool = existing_tools_dict[tool_name]
                            existing_tool.description = tool_dict.get("description", "")
                            if tool_dict.get("inputSchema"):
                                existing_tool.input_schema = tool_dict["inputSchema"]
                            elif tool_dict.get("input_schema"):
                                existing_tool.input_schema = tool_dict["input_schema"]
                            if tool_dict.get("annotations"):
                                existing_tool.additional_properties = (
                                    tool_dict["annotations"].model_dump_json()
                                    if hasattr(
                                        tool_dict["annotations"], "model_dump_json"
                                    )
                                    else str(tool_dict["annotations"])
                                )
                            existing_tool.updated_at = TimeTools.get_china_now()
                            updated_count += 1
                        else:
                            # 新增工具
                            new_tool = self.convert_tool(mcp_server_id, tool_dict)
                            new_tools.append(new_tool)

                    # 删除数据库中存在但本次同步中不存在的工具
                    tools_to_delete = [
                        tool
                        for tool in existing_tools
                        if tool.name not in synced_tool_names
                    ]
                    deleted_count = len(tools_to_delete)
                    for tool in tools_to_delete:
                        db.session.delete(tool)

                    # 添加新工具
                    if new_tools:
                        db.session.add_all(new_tools)

                    db.session.commit()

                    result_msg = f"同步工具完成: 新增{len(new_tools)}个, 更新{updated_count}个, 删除{deleted_count}个工具"
                    yield {
                        "flow_type": "mcp",
                        "event": "finish",
                        "data": result_msg,
                    }
                else:
                    yield x
            now_str = TimeTools.get_china_now()
            server.sync_tools_at = now_str
            db.session.commit()
            LogService().add(Module.MCP_TOOL, Action.SYNC_MCP_TOOL, name=server.name)
        except Exception as e:
            yield {"flow_type": "mcp", "event": "error", "data": str(e)}
        finally:
            yield {"flow_type": "mcp", "event": "stop", "data": "结束"}

    def convert_tool(self, mcp_server_id, tool_dict: dict):
        mcpTool = McpTool()
        mcpTool.mcp_server_id = mcp_server_id
        if tool_dict.get("name"):
            mcpTool.name = tool_dict["name"]
        if tool_dict.get("description"):
            mcpTool.description = tool_dict["description"]
        if tool_dict.get("inputSchema"):
            mcpTool.input_schema = tool_dict["inputSchema"]
        if tool_dict.get("input_schema"):
            mcpTool.input_schema = tool_dict["input_schema"]
        if tool_dict.get("annotations"):
            mcpTool.additional_properties = (
                tool_dict["annotations"].model_dump_json()
                if hasattr(tool_dict["annotations"], "model_dump_json")
                else str(tool_dict["annotations"])
            )
        return mcpTool

    def sync_event_stream(self, async_gen):
        q = queue.Queue()

        def runner():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                async def consume():
                    async for msg in async_gen:
                        q.put(msg)

                loop.run_until_complete(consume())
            except Exception as e:
                logging.error(f"同步工具时发生错误: {str(e)}", exc_info=True)
                q.put({"flow_type": "mcp", "event": "error", "data": str(e)})
            finally:
                q.put(None)  # 结束信号

        threading.Thread(target=runner, daemon=True).start()
        while True:
            item = q.get()
            if item is None:
                break
            yield item

    async def sync_tools_from_stdio(self, server: McpServer):
        args = []
        if server.stdio_arguments:
            args = [word for word in server.stdio_arguments.split(" ") if word]
        try:
            server_params = StdioServerParameters(
                command=server.stdio_command, args=args, env=server.stdio_env
            )
        except Exception as e:
            logging.error(f"创建 MCP STDIO 客户端失败: {str(e)}")
            yield {
                "flow_type": "mcp",
                "event": "error",
                "data": f"创建 MCP STDIO 客户端失败: {str(e)}",
            }
            return

        try:
            tools = []
            async with stdio_client(server_params) as (read_stream, write_stream):
                logging.info(
                    f"开始连接 MCP 服务: {server.stdio_command} {args} ,timeout={server.timeout}"
                )
                async with ClientSession(
                    read_stream=read_stream,
                    write_stream=write_stream,
                    sampling_callback=handle_stido_callback,
                    read_timeout_seconds=timedelta(seconds=server.timeout),
                ) as session:
                    yield {
                        "flow_type": "mcp",
                        "event": "chunk",
                        "data": "初始化MCP客户端",
                    }
                    await session.initialize()

                    yield {
                        "flow_type": "mcp",
                        "event": "chunk",
                        "data": "开始获取工具列表",
                    }
                    response = await session.list_tools()

                    for tool in response.tools:
                        tool_dict = tool.model_dump()
                        tools.append(tool_dict)
                        tool_name = tool_dict["name"]
                        yield {
                            "flow_type": "mcp",
                            "event": "chunk",
                            "data": f"同步工具: [{tool_name}] 成功",
                        }
                    if not tools:
                        yield {
                            "flow_type": "mcp",
                            "event": "error",
                            "data": "获取工具列表成功，单查询到0个工具，故失败！请检查该MCP是否提供Tool调用能力。",
                        }
                    else:
                        yield {"flow_type": "mcp", "event": "finish", "data": tools}
        except Exception as e:
            for error_msg in handle_exception(e):
                yield error_msg

    async def sync_tools_from_sse(self, server: McpServer):
        try:
            yield {"flow_type": "mcp", "event": "chunk", "data": "初始化MCP客户端"}
            async with sse_client(
                url=server.http_url,
                headers=server.headers,
                timeout=server.timeout or 30,
            ) as streams:
                async with mcp.ClientSession(*streams) as session:
                    await session.initialize()
                    yield {
                        "flow_type": "mcp",
                        "event": "chunk",
                        "data": "开始获取工具列表",
                    }
                    response = await session.list_tools()
                    if response and response.tools:
                        tools = []
                        for tool in response.tools:
                            tool_dict = tool.model_dump()
                            tools.append(tool_dict)
                            tool_name = tool_dict["name"]
                            yield {
                                "flow_type": "mcp",
                                "event": "chunk",
                                "data": f"同步工具: [{tool_name}] 成功",
                            }
                        yield {"flow_type": "mcp", "event": "finish", "data": tools}
                    else:
                        yield {
                            "flow_type": "mcp",
                            "event": "error",
                            "data": "获取工具列表成功，单查询到0个工具，故失败！请检查该MCP是否提供Tool调用能力。",
                        }
        except Exception as e:
            for error_msg in handle_exception(e):
                yield error_msg


async def handle_stido_callback(
    context: RequestContext[ClientSession, None],
    params: CreateMessageRequestParams,
):
    # 获取工具发送的消息
    logging.info(
        f"---------------获取工具发送的消息: {params.messages[0].content.text}"
    )


def handle_exception(e: Exception):
    """处理异常组"""
    if isinstance(e, ExceptionGroup):
        for exc in e.exceptions:
            for error_message in handle_exception(exc):
                yield error_message
    elif isinstance(e, BrokenResourceError):
        logging.error(f"连接 MCP 服务失败(该问题可以被忽略): {str(e)}", exc_info=True)
    elif isinstance(e, ConnectError):
        logging.error(f"连接 MCP 服务失败: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": "获取工具列表失败，请检查参数是否正确",
        }
    elif isinstance(e,httpx.ConnectTimeout):
        logging.error(f"连接超时: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": "连接超时，请检查 MCP 服务器是否可用，并确认设置的超时时间是否太短",
        }
    elif isinstance(e,httpx.ConnectError):
        logging.error(f"连接 MCP 服务失败: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": "获取工具列表失败，请检查参数是否正确",
        } 
    elif isinstance(e, (McpError,SharedMcpError)):
        logging.error(f"调用MCP工具异常,报错信息: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": f"调用MCP工具异常,报错信息: {str(e)}",
        }
    elif isinstance(e, ProcessLookupError):
        logging.error(f"连接 MCP 服务失败: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": "安装工具失败，可能如下问题导致：(1) 检查启动命令、启动参数、环境变量是否正确(2) 包管理器找不到指定的包，检查包源是否正确。(3) 包依赖冲突等。",
        }
    else:
        logging.error(f"连接 MCP 服务失败: {str(e)}", exc_info=True)
        yield {
            "flow_type": "mcp",
            "event": "error",
            "data": f"获取工具列表失败。 {str(e)}",
        }
