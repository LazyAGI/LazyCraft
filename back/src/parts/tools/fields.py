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

from flask_restful import fields

from libs.fields import CustomDateTime, IntegerArray

tool_detail = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "publish_at": CustomDateTime,
    "user_id": fields.String,
    "publish": fields.Boolean,
    "publish_type": fields.String,
    "enable": fields.Boolean,
    "tool_type": fields.String,
    "tool_kind": fields.String,
    "tool_mode": fields.String,
    "tool_ide_code": fields.String,
    "tool_ide_code_type": fields.String,
    "tool_field_input_ids": IntegerArray,
    "tool_field_output_ids": IntegerArray,
    "tool_api_id": fields.String,
    "icon": fields.String,
    "tags": fields.List(fields.String, attribute="tags"),
    "share": fields.Boolean,  # 共享的状态
    "need_share": fields.Boolean,  # 是否展示共享按钮
    "auth": fields.Integer,  # 是否授权 0-默认值 1-授权 2-未授权 3已过期
    "user_name": fields.String,
    "test_state": fields.String,
    "ref_status": fields.Boolean,
}

tool_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(tool_detail), attribute="items"),
}

_short_detail = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "field_type": fields.String,
    "field_format": fields.String,
    "field_use_model": fields.String,
    "required": fields.Boolean,
    "default_value": fields.String,
    "visible": fields.Boolean,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "user_id": fields.String,
}

create_update_tool = {
    "save_success_field": fields.List(fields.Nested(_short_detail)),
    "update_success_field": fields.List(fields.Nested(_short_detail)),
    "save_error": fields.String,
    "update_error": fields.String,
}

tool_list = {
    "data": fields.List(fields.Nested(_short_detail)),
}

tool_api_fileds = {
    "id": fields.String,
    "url": fields.String,
    "header": fields.Raw,
    "auth_method": fields.String,
    "api_key": fields.String,
    "request_type": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
    "user_id": fields.String,
    "grant_type": fields.String,
    "endpoint_url": fields.String,
    "audience": fields.String,
    "scope": fields.String,
    "client_id": fields.String,
    "client_secret": fields.String,
    "client_url": fields.String,
    "authorization_url": fields.String,
    "authorization_content_type": fields.String,
    "location": fields.String,
    "param_name": fields.String,
}


tool_field_fileds = {
    "name": fields.String,
    "description": fields.String,
    "field_type": fields.String,
    "field_format": fields.String,
    "file_field_format": fields.String,
    "field_use_model": fields.String,
    "required": fields.Boolean,
    "default_value": fields.String,
    "tool_id": fields.String,
    "visible": fields.Boolean,
    "user_id": fields.String,
}


tool_auth_fileds = {
    "tool_id": fields.String,
    "tool_api_id": fields.String,
    "endpoint_url": fields.String,
    "user_id": fields.String,
    "user_name": fields.String,
    "user_type": fields.String,
    "location": fields.String,
    "param_name": fields.String,
    "token": fields.String,
    "token_secret": fields.String,
    "refresh_token": fields.String,
    "id_token": fields.String,
    "token_type": fields.String,
    "is_share": fields.Boolean,
    "is_auth_success": fields.Boolean,
    "state": fields.String,
    "client_id": fields.String,
    "client_secret": fields.String,
    "expires_at": CustomDateTime,
}

tool_fields = {
    "name": fields.String,
    "description": fields.String,
    "icon": fields.String,
    "user_id": fields.String,
    "user_name": fields.String,
    "tenant_id": fields.String,
    "tool_type": fields.String,
    "tool_kind": fields.String,
    "tool_mode": fields.String,
    "tool_ide_code": fields.String,
    "tool_ide_code_type": fields.String,
    "tool_field_input_ids": IntegerArray,
    "tool_field_output_ids": IntegerArray,
    "tool_api_id": fields.String,
    "publish": fields.Boolean,
    "publish_type": fields.String,
    "enable": fields.Boolean,
    "test_state": fields.String,
}

tool_api_full_fileds = {
    "url": fields.String,
    "header": fields.Raw,
    "auth_method": fields.String,
    "api_key": fields.String,
    "request_type": fields.String,
    "request_body": fields.Raw,
    "user_id": fields.String,
    "grant_type": fields.String,
    "endpoint_url": fields.String,
    "audience": fields.String,
    "subject_token": fields.String,
    "subject_token_type": fields.String,
    "scope": fields.String,
    "client_id": fields.String,
    "client_secret": fields.String,
    "client_url": fields.String,
    "authorization_url": fields.String,
    "authorization_content_type": fields.String,
}

app_ref_fields = {
    "id": fields.String,
    "name": fields.String,
    "is_public": fields.Boolean,
}
