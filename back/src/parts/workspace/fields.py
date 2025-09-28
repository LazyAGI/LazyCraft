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

from libs.fields import CustomDateTime
from libs.helper import TimestampField

account_with_role_fields = {
    "id": fields.String,
    "name": fields.String,
    "avatar": fields.String,
    "email": fields.String,
    "phone": fields.String(attribute="safe_phone"),
    "last_login_at": TimestampField,
    "last_active_at": TimestampField,
    "created_at": TimestampField,
    "status": fields.String,
    "role": fields.String,  # 特定情况才有意义
}

account_pagination_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(account_with_role_fields), attribute="items"),
}

tenant_fields = {
    "id": fields.String,
    "name": fields.String,
    "status": fields.String,
    "created_at": TimestampField,
    "current": fields.Boolean,
    "role": fields.String,  # 特定情况才有意义
    "storage_quota": fields.Integer,
    "storage_used": fields.Float,
    "gpu_quota": fields.Integer,  # 额外后添加的算力配额信息
    "gpu_used": fields.Integer,
    "enable_ai": fields.Boolean,
}

tenant_pagination_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(tenant_fields), attribute="items"),
}

cooperation_fields = {
    "target_type": fields.String,
    "target_id": fields.String,
    "enable": fields.Boolean,
    "tenant_id": fields.String,
    "created_by": fields.String,
    "accounts": fields.List(fields.String, attribute="accounts_as_list"),
}


quota_fields = {
    "id": fields.String,
    "request_type": fields.String,
    "requested_amount": fields.Integer,
    "approved_amount": fields.Integer,
    "reason": fields.String,
    "tenant_name": fields.String,
    "tenant_id": fields.String,
    "account_id": fields.String,
    "account_name": fields.String,
    "reject_reason": fields.String,
    "status": fields.String,
    "processed_at": CustomDateTime,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}

quota_pagination = {
    "page": fields.Integer,
    "page_size": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "pages": fields.Integer,
    "has_prev": fields.Boolean,
    "has_next": fields.Boolean,
    "data": fields.List(fields.Nested(quota_fields), attribute="items"),
}
