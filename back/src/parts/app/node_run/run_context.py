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

from dataclasses import dataclass
from typing import Literal


@dataclass
class RunContext:
    """运行时上下文配置类。

    用于存储和管理应用运行时的上下文信息。
    """

    app_id: str
    mode: Literal["draft", "publish", "node"] = "draft"
    app_name: str = ""
    run_node_id: str = None
    enable_backflow: bool = False
    report_url: str = "http://localhost:8087/console/api/app/report"
    auto_server: bool = False
