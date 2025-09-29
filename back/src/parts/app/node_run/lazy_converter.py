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
import logging
import traceback

import networkx as nx

from .node_base import BaseNode, BaseRunContext, EmptyNode
from .node_creater import create_node

assert logging
assert json


def print_and_log(msg):
    print(msg)
    # logging.info(msg)


def get_simple_paths_with_key(graph: nx.DiGraph, a: str, b: str):
    # 找出从 a 到 b 的所有边路径
    # G = nx.DiGraph()
    # G.add_edges_from([
    #     ("A", "N1", {'key': True}),
    #     ("N1", "N2"),
    #     ("N2", "B"),
    #     ("A", "N3", {'key': False}),
    #     ("N3", "B"),
    #     ("B", "X"),
    #     ("B", "Y")
    # ])
    # print(get_simple_paths_with_key(G, "A", "B"))
    # => {True: ['N1', 'N2', 'B'], False: ['N3', 'B']}
    all_edges = list(nx.all_simple_edge_paths(graph, a, b))
    all_keys = [
        [graph[begin][end]["key"] for begin, end in edges if len(graph[begin][end]) > 0]
        for edges in all_edges
    ]
    return {
        keys[0]: [end for (begin, end) in edges]
        for keys, edges in zip(all_keys, all_edges)
    }


def compress_a_to_b(graph: nx.DiGraph, a: str, b: str):
    # 压缩从 a 到 b 的所有边路径
    # G = nx.DiGraph()
    # G.add_edges_from([
    #     ("A", "N1", {'key': True}),
    #     ("N1", "N2"),
    #     ("N2", "B"),
    #     ("A", "N3", {'key': False}),
    #     ("N3", "B"),
    #     ("B", "X"),
    #     ("B", "Y")
    # ])
    # compress_a_to_b(G, "A", "B")
    # print(G.edges)
    # [('A', 'X'), ('A', 'Y')]
    paths = list(nx.all_simple_edge_paths(graph, a, b))
    all_edges = [edge for path in paths for edge in path]

    # 提取中间节点（不含 a 和 b）
    middle_nodes = {v for path in paths for (_, v, *_) in path[:-1]}

    # 删除路径上的所有边
    graph.remove_edges_from((u, v) for (u, v, *_) in all_edges)

    # 删除中间节点
    graph.remove_nodes_from(middle_nodes)

    # 迁移 b 的出边到 a
    for succ in list(graph.successors(b)):
        graph.add_edge(a, succ)

    # 删除 b
    graph.remove_node(b)


class LazyConverter:
    def __init__(self, rawdata):
        graph_dict = rawdata.get("graph", {})
        if not graph_dict:
            graph_dict = rawdata

        self.raw_nodes = graph_dict.get("nodes", [])
        self.raw_edges = graph_dict.get("edges", [])
        self.raw_resources = graph_dict.get("resources", [])
        self.prepare_all()

    def prepare_all(self):
        """预备数据"""
        self.id_map_basenode = {}  # id->原始数据
        self.id_map_finals = {}  # id->最终数据
        self.fork_type_ids = []  # fork类型的ids
        self.aggregator_ids = []  # 聚合器类型的ids
        self.start_id = None
        self.end_id = None
        self._help_store_used_forks = []  # 辅助存储某种用途的变量: 已经使用过的分支类型
        self.target_sorting_inputs = {}  # 作为目标节点时,输入连线的顺序
        self.constant_edges = {}  # 常量类型的连线: {oid: {constant: "", index: 0}}

        context = BaseRunContext(id_map_basenode=self.id_map_basenode)

        for nodedata in self.raw_resources:
            try:
                basenode = create_node(nodedata, context)
            except:
                print(traceback.print_exc())
                node_id = nodedata["id"]
                self.id_map_basenode[node_id] = EmptyNode(
                    nodedata, BaseRunContext(id_map_basenode={})
                )
                continue
            self.id_map_basenode[basenode.get_id()] = basenode

        for nodedata in self.raw_nodes:
            try:
                basenode = create_node(nodedata, context)
            except:
                print(traceback.print_exc())
                node_id = nodedata["id"]
                self.id_map_basenode[node_id] = EmptyNode(
                    nodedata, BaseRunContext(id_map_basenode={})
                )
                self.constant_edges[node_id] = basenode.constant_edges
                continue

            self.id_map_basenode[basenode.get_id()] = basenode
            self.constant_edges[basenode.get_id()] = basenode.constant_edges

            if basenode.is_fork_type():  # fork类型
                self.fork_type_ids.append(basenode.get_id())
            elif basenode.is_start_type():
                self.start_id = basenode.get_id()
            elif basenode.is_aggregator_type():  # 聚合器类型
                self.aggregator_ids.append(basenode.get_id())
            elif basenode.is_end_type():
                self.end_id = basenode.get_id()

        # 连线数据预处理
        for edgedata in self.raw_edges:
            source_id = edgedata["source"]
            target_id = edgedata["target"]

            # 端点的输出有哪些
            if self.id_map_basenode[source_id].is_fork_type():
                self.id_map_basenode[source_id].set_fork_map_casedict(edgedata)
            # 端点的输入是什么顺序, edges需要按照端点的输入顺序从上到下排序
            if len(self.id_map_basenode[target_id].input_ports) > 1:
                self.id_map_basenode[target_id].set_input_ports(
                    edgedata["targetHandle"], source_id, target_id
                )

    @staticmethod
    def is_graph_can_run(graph_dict):
        nodes = graph_dict.get("nodes", []) + graph_dict.get("resources", [])
        for node in nodes:
            if (
                node.get("kind")
                not in ("start", "end", "answer", "aggregator", "__start__", "__end__")
                and not node
            ):
                return False
        return True

    def get_basenode_by_id(self, _id):
        if _id in self.id_map_basenode:
            return self.id_map_basenode[_id]
        raise ValueError(f"node not found: {_id}")

    def _match_if_blocks_with_nesting(self, node_ids: list[str]) -> list[dict]:
        stack = []  # 每个元素是 {'id':..., 'children':[], 'end': None}
        roots = []

        for node_id in node_ids:
            if self.id_map_basenode[node_id].is_fork_type():
                node = {"start": node_id, "end": None, "children": []}
                if stack:
                    # 当前节点是上一个的子节点
                    stack[-1]["children"].append(node)
                else:
                    # 当前是根节点
                    roots.append(node)
                stack.append(node)
            elif self.id_map_basenode[node_id].is_aggregator_type():
                if not stack:
                    raise ValueError(f"没有与 {node_id} 匹配的 if_begin")
                current = stack.pop()
                current["end"] = node_id

        if stack:
            raise ValueError("存在未闭合的 if_begin")

        return roots

    def custom_topological_sort(self, graph: nx.DiGraph) -> list:
        """
        自定义拓扑排序实现
        Args:
            graph: 有向图
        Returns:
            拓扑排序后的节点列表
        """
        # 计算每个节点的入度
        indegree = dict.fromkeys(graph.nodes(), 0)
        for u, v in graph.edges():
            indegree[v] += 1

        # 将所有入度为0的节点加入队列
        stack = [node for node, degree in indegree.items() if degree == 0]
        result = []

        # 处理队列中的节点
        while stack:
            node = stack.pop()
            result.append(node)

            # 更新邻居节点的入度
            for neighbor in graph.successors(node):
                indegree[neighbor] -= 1
                if indegree[neighbor] == 0:
                    stack.append(neighbor)

        # 检查是否所有节点都被处理
        if len(result) != len(graph.nodes()):
            raise ValueError("图中存在环，无法进行拓扑排序")

        return result

    def _post_process_if_blocks(self, input_g: nx.DiGraph):
        if not nx.is_directed_acyclic_graph(input_g):
            raise ValueError("图中存在环，无法拓扑排序")

        list_topo_sort = self.custom_topological_sort(input_g)
        block_matches = self._match_if_blocks_with_nesting(list_topo_sort)

        def _deal_mathch_block(in_matches):
            print(f"block_matches: {in_matches}")
            for item in in_matches:
                start, end, children = item["start"], item["end"], item["children"]
                if children:
                    _deal_mathch_block(children)

                edge_dict = get_simple_paths_with_key(input_g, start, end)
                print(f"edge_dict: {edge_dict}")
                if self.id_map_basenode[start].lower_type in ["ifs"]:
                    self.id_map_basenode[start].true = [
                        self.id_map_basenode[node] for node in edge_dict.get("true", [])
                    ]
                    self.id_map_basenode[start].false = [
                        self.id_map_basenode[node]
                        for node in edge_dict.get("false", [])
                    ]
                elif self.id_map_basenode[start].lower_type in ["switch", "intention"]:
                    self.id_map_basenode[start].nodes = {
                        key: [self.id_map_basenode[node] for node in edge_dict[key]]
                        for key in edge_dict.keys()
                    }
                compress_a_to_b(input_g, start, end)

        _deal_mathch_block(block_matches)

    def draw_graph(self, g: nx.DiGraph):
        import matplotlib.pyplot as plt

        pos = nx.spring_layout(g)
        nx.draw(g, pos, with_labels=True, node_color="lightblue", arrows=True)
        plt.savefig("graph.png", format="png", dpi=300)

    def full_node_graph(self, app_id=None):
        def _get_edge_handle(edgedata: dict):
            source = edgedata.get("source")
            if self.id_map_basenode[source].lower_type in ["ifs"]:
                if edgedata.get("sourceHandle") and edgedata.get("sourceHandle") in [
                    "true",
                    "false",
                ]:
                    return edgedata["sourceHandle"]
            elif self.id_map_basenode[source].lower_type in ["switch", "intention"]:
                cond_key = (
                    self.id_map_basenode[source]
                    .get_fork_casedata_by_caseid(edgedata.get("sourceHandle"))
                    .get("cond", "default")
                )
                if not cond_key:
                    cond_key = "default"  # 如果cond_key是空字符串,重置为default
                switch_input_variable_type = None
                config__input_shape = (
                    self.id_map_basenode[source].get_data().get("config__input_shape")
                    or []
                )
                if len(config__input_shape) > 0:
                    switch_input_variable_type = config__input_shape[0].get(
                        "variable_type"
                    )

                # 类型转换映射
                type_map_func = {
                    "int": lambda x: int(x) if x != "default" else x,
                    "float": lambda x: float(x) if x != "default" else x,
                }

                # 如果存在类型转换函数且不是default值，则进行转换
                if switch_input_variable_type in type_map_func:
                    try:
                        cond_key = type_map_func[switch_input_variable_type](cond_key)
                    except (ValueError, TypeError):
                        # 转换失败时保持原值
                        pass
                return cond_key
            return ""

        ggg = nx.DiGraph(
            [
                (
                    d["source"],
                    d["target"],
                    {"key": _get_edge_handle(d), "formatter": d.get("label", "")},
                )
                for d in self.raw_edges
            ]
        )
        self._post_process_if_blocks(ggg)

        ret_nodes = {}
        ret_edges = []

        change_map = {self.start_id: "__start__", self.end_id: "__end__"}
        succ_edges = [(v, u) for u in ggg.pred for v in ggg.pred[u]]
        for edge in succ_edges:
            ret_edges.append(
                {
                    "iid": change_map.get(edge[0], edge[0]),
                    "oid": change_map.get(edge[1], edge[1]),
                }
            )
            if ggg.edges[(edge[0], edge[1])].get("formatter"):
                ret_edges[-1]["formatter"] = ggg.edges[(edge[0], edge[1])][
                    "formatter"
                ]  # 给连线加上formatter
            finaldata = self.id_map_basenode[edge[0]].to_dict()
            if finaldata:
                ret_nodes[edge[0]] = finaldata

        result = {
            "nodes": [n for n in ret_nodes.values()],
            "edges": ret_edges,
            "resources": self.get_default_resources(),
        }

        nodes = [self.id_map_basenode[node["id"]] for node in result["nodes"]]
        result["resources"] = result[
            "resources"
        ] + BaseNode.get_used_resources_by_nodes(nodes)
        LazyConverter.refresh_ids_for_all(app_id, result)
        return result

    def single_node_graph(self, node_id, app_id=None) -> dict:
        """准备单节点图"""
        try:
            self.full_node_graph(app_id=app_id)
        except Exception as e:
            print(f"error: {e}")
            raise e

        node = self.id_map_basenode[node_id]
        nodes = [node.to_dict()]
        resources = self.get_default_resources() + node.get_used_resources()

        edges = [
            {"iid": "__start__", "oid": nodes[0]["id"]},
            {"iid": nodes[0]["id"], "oid": "__end__"},
        ]

        graph_dict = {"nodes": nodes, "edges": edges, "resources": resources}
        LazyConverter.refresh_ids_for_all(app_id, graph_dict)
        return graph_dict

    @staticmethod
    def find_history_list(result):
        """查询出画布中需要历史的控件, 用于应用发布后, 引用到历史对话"""
        history_list = []

        def _inter_find(node_list):
            for data in node_list:
                if data.get("extras-use_history", False):
                    history_list.append(data["id"])

                node_kind = data.get("kind", "").lower()
                if node_kind in ["ifs"]:
                    _inter_find(data["args"]["true"])
                    _inter_find(data["args"]["false"])
                elif node_kind in ["switch", "intention"]:
                    for key in data["args"]["nodes"].keys():
                        _inter_find(data["args"]["nodes"][key])
                elif BaseNode.check_type_is_subgraph_type(node_kind):
                    _inter_find(data["args"]["nodes"])

        _inter_find(result["nodes"])
        return list(set(history_list))

    def get_default_resources(self):
        ret_list = []
        for rawdata in self.raw_resources:
            if self.id_map_basenode[rawdata["id"]].lower_type in ("server", "web"):
                ret_list.append(self.id_map_basenode[rawdata["id"]].to_dict())
        return ret_list

    @staticmethod
    def convert_workflow_to_lazy(workflow, app_id=None):
        converter = LazyConverter(workflow)
        graph_dict = converter.full_node_graph(app_id=app_id)
        return graph_dict

    @staticmethod
    def convert_workflow_single_node_to_lazy(workflow, node_id, app_id=None):
        converter = LazyConverter(workflow)
        graph_dict = converter.single_node_graph(node_id, app_id=app_id)
        print(8888888888888888888888888888, graph_dict)
        return graph_dict

    @staticmethod
    def refresh_ids_for_all(app_id, result):
        """将nodes/edges的ID改写, 确保唯一性. 不修改resources的ID"""

        return

    def single_virtual_node_graph(self, node_id) -> dict:
        """准备虚拟单节点图"""
        node = self.id_map_basenode[node_id]
        doc_node = node.to_dict()

        resources = self.get_default_resources() + node.get_used_resources()
        resources.append(doc_node)

        virtual_retriever_node = [
            dict(
                id="1",
                kind="Retriever",
                name="ret1",
                args=dict(
                    doc=node.id,
                    group_name="CoarseChunk",
                    similarity="bm25_chinese",
                    topk=3,
                ),
            )
        ]

        edges = [
            {"iid": "__start__", "oid": virtual_retriever_node[0]["id"]},
            {"iid": virtual_retriever_node[0]["id"], "oid": "__end__"},
        ]

        graph_dict = {
            "nodes": virtual_retriever_node,
            "edges": edges,
            "resources": resources,
        }
        return graph_dict
