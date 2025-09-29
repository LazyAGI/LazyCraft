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

tag_fields = {"id": fields.String, "name": fields.String, "type": fields.String}
account_fields = {"id": fields.String, "name": fields.String, "avatar": fields.String}

doc_detail_fields = {
    "id": fields.Integer,
    "title": fields.String,
    "doc_content": fields.String,
    "index": fields.String,
    "status": fields.String,
    "status_label": fields.String,
    "created_by": fields.String,
    "created_by_account": fields.Nested(account_fields, attribute="created_by_account"),
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}

doc_page_fields = {
    "page": fields.Integer,
    "limit": fields.Integer(attribute="per_page"),
    "total": fields.Integer,
    "has_more": fields.Boolean(attribute="has_next"),
    "data": fields.List(fields.Nested(doc_detail_fields), attribute="items"),
}
