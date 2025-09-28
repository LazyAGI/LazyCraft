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

from libs.helper import TimestampField

tag_fields = {"id": fields.String, "name": fields.String, "type": fields.String}
account_fields = {"id": fields.String, "name": fields.String, "avatar": fields.String}

app_detail_fields = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "icon": fields.String,
    "icon_background": fields.String,
    "workflow_id": fields.String,
    "status": fields.String,
    "categories": fields.List(fields.String, attribute="categories_as_list"),
    "enable_site": fields.Boolean,
    "enable_api": fields.Boolean,
    "enable_backflow": fields.Boolean,
    "created_at": TimestampField,
    "updated_at": TimestampField,
    "workflow_updated_at": TimestampField,
    "created_by": fields.String,
    "enable_api_call": fields.String,
    "ref_status": fields.Boolean,
    "mode": fields.String(attribute="mode"),
    "model_config": fields.Raw(attribute="model_config"),
    "tracing": fields.Raw(attribute="tracing"),
    "tags": fields.List(fields.String, attribute="tags"),
    "created_by_account": fields.Nested(account_fields, attribute="created_by_account"),
    "publish_status": fields.String(attribute="publish_status"),
    "engine_status": fields.String(attribute="engine_status"),
}

app_pagination_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(app_detail_fields), attribute="items"),
}

workflow_fields = {
    "id": fields.String,
    "graph": fields.Raw(attribute="graph_dict"),
    "hash": fields.String(attribute="unique_hash"),
    "refer_model_count": fields.Integer,
    "created_by": fields.String,
    "created_at": TimestampField,
    "updated_by": fields.String,
    "updated_at": TimestampField,
}

app_export_fields = {
    "id": fields.String,
    "name": fields.String,
    "description": fields.String,
    "icon": fields.String,
    "icon_background": fields.String,
    "categories": fields.List(fields.String, attribute="categories_as_list"),
    "tags": fields.List(fields.String, attribute="tags"),
}

app_version_fields = {
    "id": fields.String,
    "app_id": fields.String,
    "publisher": fields.String,
    "release_time": fields.String,
    "version": fields.String,
    "description": fields.String,
    "file_path": fields.String,
    "status": fields.Boolean,
    "created_at": TimestampField,
    "updated_at": TimestampField,
    "name": fields.String,
}

app_versions_fields = {
    "data": fields.List(fields.Nested(app_version_fields), attribute="items")
}

app_ref_fields = {
    "id": fields.String,
    "name": fields.String,
    "is_public": fields.Boolean,
}
