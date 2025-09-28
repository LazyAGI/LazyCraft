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

import json

from core.node import BaseNode
from parts.app.node_run.lazy_converter import LazyConverter
from parts.data.data_reflux_service import DataRefluxService

from .app_service import WorkflowService


class RefluxHelper:

    def __init__(self, account):
        self.account = account

    def create_backflow(self, app_model, workflow=None):
        """创建回流数据集和版本
        {
            "app_msg": {
                "app_id": "20241015test01",
                "app_name": "20241015测试01",
                "app_label": ["test1","test2"]
            },
            "node_msgs": [
                {
                "node_id": "20241015test01001",
                "node_name": "20241015测试01001"
                },
            ]
        }
        """

        if workflow is None:
            workflow = WorkflowService().get_published_workflow(app_model.id)

        if not workflow:
            return

        app_msg = {
            "app_id": app_model.id,
            "app_name": app_model.name,
            "app_label": app_model.tags,
        }
        node_msgs = []

        def extract_node_info(graph_or_nodelist, prefix=""):
            if isinstance(graph_or_nodelist, dict):
                node_list = graph_or_nodelist.get("nodes", [])
            elif isinstance(graph_or_nodelist, (tuple, list)):
                node_list = graph_or_nodelist
            else:
                node_list = [
                    graph_or_nodelist,
                ]

            for nodedata in node_list:
                enable_backflow = nodedata.get("extras-enable_backflow", False)
                node_id = nodedata.get("id")
                node_kind = nodedata.get("kind", "").lower()
                node_title = nodedata.get("extras-title", "")
                if prefix:
                    node_title = f"{prefix}>{node_title}"

                if node_id is not None and enable_backflow:
                    node_msgs.append(
                        {
                            "node_id": node_id,
                            "node_name": node_title,
                        }
                    )

                if node_kind == "ifs":
                    extract_node_info(nodedata["args"]["true"], prefix=prefix)
                    extract_node_info(nodedata["args"]["false"], prefix=prefix)
                elif node_kind in ["switch", "intention"]:
                    for key in nodedata["args"]["nodes"].keys():
                        extract_node_info(nodedata["args"]["nodes"][key], prefix=prefix)
                elif BaseNode.check_type_is_subgraph_type(node_kind):
                    if node_kind != "app":  # 如果是app则不再处理回流逻辑
                        extract_node_info(nodedata["args"], prefix=node_title)

        graph_dict = LazyConverter.convert_workflow_to_lazy(
            workflow.flat_graph_dict, app_id=f"publish-{app_model.id}"
        )
        extract_node_info(graph_dict)

        print_data = {"app_msg": app_msg, "node_msgs": node_msgs}
        print(f"DataRefluxService app_publish: {json.dumps(print_data)}")

        DataRefluxService(self.account).app_publish(app_msg, node_msgs)
