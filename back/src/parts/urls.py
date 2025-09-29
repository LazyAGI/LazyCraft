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

from flask import Blueprint

from core.handle_error import HandleErrorApi

bp = Blueprint("console", __name__, url_prefix="/console/api")
api = HandleErrorApi(bp)

from parts.apikey import apikey_api  # noqa
from parts.app import app_api, workflow_api  # noqa
from parts.auth import forgot_password, login, oauth  # noqa
from parts.conversation import speak_api  # noqa
from parts.cost_audit import controller  # noqa
from parts.data import controller  # noqa
from parts.data import data_reflux_api  # noqa
from parts.db_manage import db_manage_api  # noqa
from parts.doc import doc_api  # noqa
from parts.evalution import controller  # noqa
from parts.files import file_api  # noqa
from parts.finetune import finetune_api  # noqa
from parts.inferservice import controller, test_chat  # noqa
from parts.knowledge_base import controller  # noqa
from parts.logs import controller  # noqa
from parts.mcp import controller  # noqa
from parts.message import controller  # noqa
from parts.models_hub import controller  # noqa
from parts.prompt import manage  # noqa
from parts.tag import tag_api  # noqa
from parts.tools import controller  # noqa
from parts.workspace import members, other  # noqa
