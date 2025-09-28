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

apikey_detail_fields = {
    "id": fields.String,
    "user_id": fields.String,
    "user_name": fields.String,
    "tenant_list": fields.String,  # Changed to List of Strings for multiple tenant IDs
    "api_key": fields.String,
    "description": fields.String,
    "status": fields.String,
    "expire_date": fields.String,
    "created_at": CustomDateTime,
    "updated_at": CustomDateTime,
}
