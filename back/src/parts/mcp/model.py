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

from enum import Enum

from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.sql import func

from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


class TransportType:
    """MCP传输类型常量定义。

    定义MCP服务器支持的传输协议类型常量。

    Attributes:
        SSE (str): 服务器发送事件协议。
        STDIO (str): 标准输入输出协议。
        STREAMABLE_HTTP (str): 流式HTTP协议。
    """

    SSE = "SSE"
    STDIO = "STDIO"
    STREAMABLE_HTTP = "Streamable_HTTP"


class TestState(Enum):
    """MCP服务器测试状态枚举。

    定义MCP服务器测试过程中的各种状态。

    Attributes:
        SUCCESS (str): 测试成功状态。
        ERROR (str): 测试失败状态。
        INIT (str): 测试未开始状态。
    """

    SUCCESS = "success"  # 测试成功
    ERROR = "error"  # 测试失败
    INIT = "init"  # 测试未开始


class McpServer(db.Model):
    """MCP服务器模型。

    该模型用于存储MCP（Model Context Protocol）服务器的配置信息，
    包括连接参数、认证信息、发布状态等。

    Attributes:
        id (int): 服务器唯一标识符。
        name (str): 服务器名称。
        description (str): 服务器描述。
        icon (str): 服务器图标路径。
        created_at (datetime): 创建时间。
        updated_at (datetime): 最后更新时间。
        user_id (str): 创建用户ID。
        user_name (str): 创建用户名称。
        tenant_id (str): 租户ID。
        publish (bool): 是否已发布。
        publish_at (datetime): 发布时间。
        publish_type (str): 发布类型。
        enable (bool): 是否启用。
        test_state (str): 测试状态。
        transport_type (str): 传输协议类型。
        timeout (int): 超时时间（秒）。
        stdio_command (str): STDIO命令。
        stdio_arguments (str): STDIO参数。
        stdio_env (dict): STDIO环境变量。
        http_url (str): HTTP URL。
        headers (dict): HTTP请求头。
        sync_tools_at (datetime): 同步工具时间。
    """

    __tablename__ = "mcp_server"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="mcp_server_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    user_id = db.Column(db.String(255), nullable=False)
    user_name = db.Column(db.String(255), nullable=True)
    tenant_id = db.Column(StringUUID, nullable=True)
    publish = db.Column(db.Boolean, nullable=False, default=False)  # 是否发布
    publish_at = db.Column(db.DateTime, nullable=True)  # 发布时间
    publish_type = db.Column(
        db.String(32), nullable=True, default=""
    )  # 发布类型: 预发布/正式发布
    enable = db.Column(db.Boolean, nullable=False, default=False)  # 是否启用
    test_state = db.Column(
        db.String(50), nullable=True, default="init"
    )  # 测试状态: init/success/error

    # 连接相关
    transport_type = db.Column(
        db.String(50), nullable=False
    )  # STDIO\SSE\Streamable HTTP
    timeout = db.Column(db.Integer, nullable=True)  # 超时时间（秒）

    # stdio相关
    stdio_command = db.Column(db.String(255), nullable=True)
    stdio_arguments = db.Column(db.Text, nullable=True)  # 建议用JSON存参数列表
    stdio_env = db.Column(JSON, nullable=True)  # 环境变量，JSON对象

    # http相关
    http_url = db.Column(db.Text, nullable=True)
    headers = db.Column(JSON, nullable=True)  # HTTP头，JSON对象
    sync_tools_at = db.Column(db.DateTime, nullable=True)  # 同步工具时间

    @property
    def tags(self):
        return Tag.get_names_by_target_id(Tag.Types.MCP, self.id)

    def __repr__(self):
        return f"<McpServer {self.name}>"


class McpTool(db.Model):
    """MCP工具模型。

    该模型用于存储MCP服务器提供的具体工具信息，包括工具名称、
    描述、输入参数模式等。

    Attributes:
        id (int): 工具唯一标识符。
        mcp_server_id (int): 所属MCP服务器ID。
        name (str): 工具名称。
        description (str): 工具描述。
        input_schema (dict): 输入参数模式（JSON格式）。
        additional_properties (dict): 额外属性（预留字段）。
        annotations (dict): 注释信息（预留字段）。
        schema (str): 模式信息（预留字段）。
        status (str): 工具状态。
        created_at (datetime): 创建时间。
        updated_at (datetime): 最后更新时间。
    """

    __tablename__ = "mcp_tools"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="mcp_tools_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    mcp_server_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(255), nullable=False)  # 工具名
    description = db.Column(db.Text, nullable=True)  # 工具描述
    input_schema = db.Column(JSON, nullable=True)  # 输入参数schema，JSON格式
    # 预留字段
    additional_properties = db.Column(JSON, nullable=True)  # 预留，暂不使用
    annotations = db.Column(JSON, nullable=True)  # 预留，暂不使用
    schema = db.Column(db.String(255), nullable=True)  # 预留，暂不使用
    status = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    @property
    def mcp_server(self):
        return McpServer.query.get(self.mcp_server_id)

    def __repr__(self):
        return f"<McpTool {self.name}>"
