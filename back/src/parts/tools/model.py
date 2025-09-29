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

import uuid

from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.sql import func

from models import StringUUID
from parts.tag.model import Tag
from utils.util_database import db


class Tool(db.Model):
    __tablename__ = "tool"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="tool_pkey"),)
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
    tool_type = db.Column(db.String(50), nullable=False)  # 官方内置 or 自定义
    tool_kind = db.Column(db.String(50), nullable=False)  # 工具类别: 翻译/天气/时间等
    tool_mode = db.Column(db.String(50), nullable=False)  # 工具模式: API/IDE
    tool_ide_code = db.Column(db.Text, nullable=True)  # 工具IDE代码
    tool_ide_code_type = db.Column(
        db.String(50), nullable=True
    )  # 工具IDE代码类型 python/nodejs
    tool_field_input_ids = db.Column(JSON, nullable=True)  # 工具字段输入id
    tool_field_output_ids = db.Column(JSON, nullable=True)  # 工具字段输出id
    tool_api_id = db.Column(db.Integer, nullable=True)  # 工具api_id
    publish = db.Column(db.Boolean, nullable=False, default=False)  # 是否发布
    publish_at = db.Column(db.DateTime, nullable=True)  # 发布时间
    publish_type = db.Column(
        db.String(32), nullable=True, default=""
    )  # 发布类型: 预发布/正式发布
    enable = db.Column(db.Boolean, nullable=False, default=False)  # 是否启用
    test_state = db.Column(
        db.String(50), nullable=True, default="init"
    )  # 测试状态: init/success/error

    is_draft = db.Column(db.Boolean, nullable=True, default=True)
    tool_id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))

    @property
    def tags(self):
        return Tag.get_names_by_target_id(Tag.Types.TOOL, self.id)


class ToolField(db.Model):
    __tablename__ = "tool_field"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="tool_field_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    field_type = db.Column(db.String(50), nullable=False)  # 字段类型 输入还是输出
    field_format = db.Column(
        db.String(50), nullable=False
    )  # 字段格式（如：字符串、数字、日期等）
    file_field_format = db.Column(
        db.String(50), nullable=True
    )  # 字段格式（如：字符串、数字、日期等）
    field_use_model = db.Column(db.String(50), nullable=True)  # 带入方法 API模式有
    required = db.Column(db.Boolean, nullable=True)  # 是否必填
    default_value = db.Column(db.String(255), nullable=True)  # 默认值 API模式有
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    tool_id = db.Column(
        db.Integer, nullable=True
    )  # 字段固定为0，废弃字段, 太容易让人误会了!
    visible = db.Column(
        db.Boolean, nullable=False, default=True
    )  # 是否可见 （默认为可见）
    user_id = db.Column(db.String(255), nullable=False)


class ToolHttp(db.Model):
    __tablename__ = "tool_api"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="tool_api_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    url = db.Column(db.Text, nullable=False)
    header = db.Column(JSON)
    auth_method = db.Column(db.String(50), nullable=True)
    api_key = db.Column(db.Text, nullable=True)
    request_type = db.Column(db.String(50), nullable=False)
    request_body = db.Column(JSON)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    user_id = db.Column(db.String(255), nullable=False)
    # -----------新增 oidc&oauth1.0-----------------------------
    grant_type = db.Column(
        db.String(200), nullable=True
    )  # - TokenExchange：用于在不同服务之间交换令牌。 - ClientCredential：用于客户端凭据授权流程，适用于没有用户直接参与的情况。
    endpoint_url = db.Column(
        db.Text, nullable=True
    )  # 授权服务器的端点 URL，用于发送授权请求和接收响应。配置时需要指定授权服务器的地址，以便客户端可以正确地向服务器发起请求。
    audience = db.Column(
        db.String(200), nullable=True
    )  # 资源服务器，客户端告诉授权服务器它希望代表用户访问哪个资源服务器。配置时需要指定资源服务器的标识符
    subject_token = db.Column(db.Text, nullable=True)  # 现有令牌（如 ID Token）
    subject_token_type = db.Column(
        db.String(200), nullable=True
    )  # eg: urn:ietf:params:oauth:token-type:jwt
    # -----------新增 oidc------------------------------------
    # ------tencent OIDC 公共参数v3 放在HTTP请求头----------------
    # action = db.Column(db.String(50), nullable=True,default="AssumeRoleWithWebIdentity")
    # version = db.Column(db.String(50), nullable=True, default="2018-08-13")
    # region = db.Column(db.String(50), nullable=True, default="ap-beijing")
    # provider_id = db.Column(db.String(50), nullable=True)#身份提供商名称 示例值：OIDC
    # web_identity_token = db.Column(db.String(200), nullable=True) #IdP签发的OIDC令牌 示例值：eyJraWQiOiJkT**CNOQ
    # role_arn = db.Column(db.String(200), nullable=True) #角色访问描述名  示例值：qcs::cam::uin/7989***:roleName/OneLogin-Role
    # role_session_name = db.Column(db.String(200), nullable=True) #会话名称 示例值：test_OIDC
    # duration_seconds = db.Column(db.Integer, nullable=True , default=7200)

    # oidc和oauth 共用
    scope = db.Column(
        db.String(200), nullable=True
    )  # 客户端请求的权限范围。对于 OIDC，通常需要包含openid作用域，以请求身份验证，配置时需要根据需要请求的权限范围来设置。
    # 注册 OAuth 后获取的唯一标识符。
    client_id = db.Column(
        db.String(50), nullable=True
    )  # 客户端在授权服务器注册时获得的唯一标识符，配置时需要使用在授权服务器注册应用时获得的 client_id。

    client_secret = db.Column(db.String(50), nullable=True)  # 与 client_id 匹配的密码
    client_url = db.Column(
        db.Text, nullable=True
    )  # 服务方的 OAuth 页面URL，用于拼接用户登录授权页的URL。重定向授权 URL，在授权过程中，会将用户引导至 [client_url]?response_type=code&client_id=[client_id]&scope=[scope]&state=****&redirect_uri=[平台的回调安全地址]
    authorization_url = db.Column(
        db.Text, nullable=True
    )  # 获取用户令牌（token）的 URL。当用户通过上述 client_url 引导链接授权成功后，三方服务会返回用于获取 token 的 code，并跳转至平台的回调安全地址，此时，会通过对应参数向 authorization_url 对应地址发起请求，获取用户的 access_token
    authorization_content_type = db.Column(
        db.Text, nullable=True
    )  # 向 OAuth 发送授权请求时的内容类型或数据格式。


class ToolAuth(db.Model):
    __tablename__ = "tool_auth"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="tool_auth_pkey"),)
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tool_id = db.Column(db.Integer, nullable=True)
    tool_api_id = db.Column(db.Integer, nullable=True)
    endpoint_url = db.Column(
        db.Text, nullable=True
    )  # oauth1.0时为authorization_url值 OIDC时为endpoint_url
    user_id = db.Column(db.String(255), nullable=False)
    user_name = db.Column(db.String(255), nullable=True)
    user_type = db.Column(db.String(50), nullable=True)
    location = db.Column(db.String(50), nullable=True)  # header & query
    param_name = db.Column(db.String(255), nullable=True)
    token = db.Column(db.String(255), nullable=True)
    token_secret = db.Column(db.String(255), nullable=True)  # secret oauth
    refresh_token = db.Column(db.String(255), nullable=True)  # refresh token oidc
    id_token = db.Column(db.String(255), nullable=True)  # id token oidc
    token_type = db.Column(db.String(255), nullable=True)  # oauth & oidc&service_api
    is_share = db.Column(db.Boolean, nullable=False, default=False)  # 是否共享 默认否
    is_auth_success = db.Column(
        db.Boolean, nullable=False, default=False
    )  # 是否授权成功 默认否
    state = db.Column(
        db.String(255), nullable=True
    )  # 验证 state (重要!  防止 CSRF 攻击)
    client_id = db.Column(db.String(255), nullable=True)
    client_secret = db.Column(db.String(255), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)  # 过期时间
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
