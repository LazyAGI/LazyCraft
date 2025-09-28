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

from .node_base import (BaseRunContext, CodeNode, DocumentNode, EmptyNode,
                        FileNode, FormatterNode, HttpNode, HttpToolNode,
                        IFSNode, JoinFormatterNode, LoopNode, McpToolNode,
                        ReaderNode, RetrieverNode, ServerNode, SqlManagerNode,
                        SubgraphNode, SwitchNode, ToolsForLLMNode, WarpNode,
                        WebNode)
from .node_infer import (EmbeddingResource, FunctionCallNode, IntentionNode,
                         LLMNode, OCRNode, ParameterExtractorNode,
                         QustionRewriteNode, RerankerNode, SDNode, SqlCallNode,
                         STTNode, TTSNode, VQANode)

# 基础节点类型
lower_type_to_node_cls = {
    # 流程控制节点
    "start": EmptyNode,
    "end": EmptyNode,
    "answer": EmptyNode,
    "aggregator": EmptyNode,
    "__start__": EmptyNode,
    "__end__": EmptyNode,
    # 本地模型节点
    "onlinellm": LLMNode,
    "stt": STTNode,
    "vqa": VQANode,
    "sd": SDNode,
    "tts": TTSNode,
    "embedding": EmbeddingResource,
    # 数据处理节点
    "sqlcall": SqlCallNode,
    "toolsforllm": ToolsForLLMNode,
    "functioncall": FunctionCallNode,
    "reranker": RerankerNode,
    "retriever": RetrieverNode,
    # 流程组织节点
    "subgraph": SubgraphNode,
    "warp": WarpNode,
    "loop": LoopNode,
    "app": SubgraphNode,
    "template": SubgraphNode,
    # 逻辑控制节点
    "ifs": IFSNode,
    "switch": SwitchNode,
    "intention": IntentionNode,
    "code": CodeNode,
    # 网络和格式化节点
    "http": HttpNode,
    "httptool": HttpToolNode,
    "formatter": FormatterNode,
    "joinformatter": JoinFormatterNode,
    # 在线服务和工具节点
    "document": DocumentNode,
    "sqlmanager": SqlManagerNode,
    "file": FileNode,
    "web": WebNode,
    "server": ServerNode,
    "parameterextractor": ParameterExtractorNode,
    "qustionrewrite": QustionRewriteNode,
    "ocr": OCRNode,
    "reader": ReaderNode,
    "mcptool": McpToolNode,
}


def create_node(nodedata, context: BaseRunContext = None):
    """创建节点实例。

    Args:
        nodedata (dict): 节点数据
        context (BaseRunContext, optional): 运行上下文，默认为None

    Returns:
        BaseNode: 创建的节点实例

    Raises:
        ValueError: 当节点类型无效时抛出
    """
    context = context or BaseRunContext(id_map_basenode={})
    lower_type = (
        nodedata.get("data", {}).get("payload__kind")
        or nodedata.get("data", {}).get("type")
        or ""
    ).lower()

    node_cls = lower_type_to_node_cls.get(lower_type)
    if node_cls:
        return node_cls(nodedata, context)
    else:
        raise ValueError(f"Invalid node type: {lower_type}")
