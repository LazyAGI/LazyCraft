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
import uuid

import networkx as nx

from core.node import BaseNode, create_node

assert logging
assert json


def print_and_log(msg):
    """打印并记录日志消息。

    同时将消息输出到控制台和日志系统（日志功能当前被注释）。

    Args:
        msg: 要打印和记录的消息字符串。
    """
    print(msg)
    # logging.info(msg)


class Converter:
    """工作流图转换器。

    将前端的工作流图数据转换为 LazyLLM 可执行的格式。
    处理节点、边、资源等元素的转换和组织。
    """

    def __init__(self, rawdata):
        """初始化转换器。

        Args:
            rawdata: 原始工作流数据字典，应包含 graph 字段，
                    其中包含 nodes、resources 和 edges 列表。
        """
        graph_dict = rawdata.get("graph", {})
        if not graph_dict:
            graph_dict = rawdata

        self.raw_nodes = graph_dict.get("nodes", [])
        self.raw_resources = graph_dict.get("resources", [])
        self.raw_edges = graph_dict.get("edges", [])
        self.raw_edges = [
            edge
            for edge in self.raw_edges
            if edge["target"] != edge["source"] + "_link"
        ]

        self.prepare_all()

    def prepare_all(self):
        """预备和初始化所有数据结构。

        解析原始节点和边数据，创建节点对象，识别特殊节点类型，
        并建立必要的映射关系。
        """
        self.id_map_basenode = {}  # id->原始数据
        self.id_map_finals = {}  # id->最终数据
        self.fork_type_ids = []  # fork类型的ids
        self.aggregator_ids = []  # 聚合器类型的ids
        self.start_id = None
        self.end_id = None
        self._help_store_used_forks = []  # 辅助存储某种用途的变量: 已经使用过的分支类型
        self.target_sorting_inputs = {}  # 作为目标节点时,输入连线的顺序
        self.constant_edges = {}  # 常量类型的连线: {oid: {constant: "", index: 0}}

        for nodedata in self.raw_resources:
            basenode = create_node(nodedata)  # 替换BaseNode
            self.id_map_basenode[basenode.get_id()] = basenode

        for nodedata in self.raw_nodes:
            basenode = create_node(nodedata)  # 替换BaseNode
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

    def get_basenode_by_id(self, _id):
        """根据 ID 获取节点对象。

        Args:
            _id: 节点的唯一标识符。

        Returns:
            BaseNode: 对应的节点对象。

        Raises:
            ValueError: 当指定的 ID 不存在时抛出。
        """
        if _id in self.id_map_basenode:
            return self.id_map_basenode[_id]
        raise ValueError(f"node not found: {_id}")

    def to_lazyllm(self, app_id=None):
        """将工作流转换为 LazyLLM 格式。

        执行完整的转换流程，包括路径准备、资源处理、ID 刷新等步骤。

        Args:
            app_id: 应用 ID，用于生成唯一的节点标识符。如果为 None，
                   则使用随机生成的 UUID。

        Returns:
            dict: LazyLLM 格式的工作流定义，包含所有节点和连接关系。
        """
        ggg = nx.DiGraph(
            [
                (d["source"], d["target"], {"formatter": d.get("label", "")})
                for d in self.raw_edges
            ]
        )  # 有向图
        edge_paths = self.prepare_paths(ggg, ggg.edges(), self.start_id, self.end_id)

        for iid, oid in edge_paths:
            if iid not in self.id_map_finals:
                basenode = self.id_map_basenode[iid]
                finaldata = basenode.to_dict()
                if finaldata:
                    self.id_map_finals[iid] = finaldata

        ret_edges = []
        change_map = {self.start_id: "__start__", self.end_id: "__end__"}
        for iid, oid in edge_paths:
            edge_data = ggg.edges[(iid, oid)] if (iid, oid) in ggg.edges else None
            ditem = {
                "iid": change_map.get(iid, iid),
                "oid": change_map.get(oid, oid),
            }
            if edge_data and edge_data.get("formatter"):
                ditem["formatter"] = edge_data["formatter"]  # 给连线加上formatter
            ret_edges.append(ditem)

        # 常量类型的连线, 插入到现有的数据中
        if self.constant_edges:
            for oid, cdatas in self.constant_edges.items():
                for cdata in cdatas:
                    constant = cdata["constant"]
                    mark_index = cdata["index"]
                    for pos in range(0, len(ret_edges)):
                        if oid == ret_edges[pos]["oid"]:
                            if mark_index == 0:  # 插入前面
                                ret_edges.insert(
                                    pos, {"constant": constant, "oid": oid}
                                )
                                break
                            elif mark_index == 1:  # 插入后面
                                ret_edges.insert(
                                    pos + 1, {"constant": constant, "oid": oid}
                                )
                                break
                            else:  # 等待下一个匹配位置
                                mark_index -= 1
                                continue

        result = {
            "nodes": [n for n in self.id_map_finals.values()],
            "edges": ret_edges,
            "resources": self.prepare_resources(),
        }

        # 过滤掉没有被引用到的资源
        used_resources = []
        for data in result["nodes"]:
            basenode = self.id_map_basenode.get(data["id"], None)
            if basenode:
                used_resources.extend(basenode.get_used_resources())
                # 特殊处理ifs
                if basenode.lower_type in ["ifs"]:
                    for key in ["true", "false"]:
                        for index, subdata in enumerate(data["args"][key]):
                            basenode = self.id_map_basenode.get(subdata["id"], None)
                            if basenode:
                                used_resources.extend(basenode.get_used_resources())
                # 特殊处理switch/intention
                if basenode.lower_type in ["switch", "intention"]:
                    for key in data["args"]["nodes"].keys():
                        for index, subdata in enumerate(data["args"]["nodes"][key]):
                            basenode = self.id_map_basenode.get(subdata["id"], None)
                            if basenode:
                                used_resources.extend(basenode.get_used_resources())

        for data in result["resources"]:
            basenode = self.id_map_basenode.get(data["id"], None)
            if basenode:
                used_resources.extend(basenode.get_used_resources())

        # 执行过滤
        result["resources"] = [
            k
            for k in result["resources"]
            if k["id"] in used_resources or k["kind"].lower() in ("server", "web")
        ]

        Converter.refresh_ids_for_all(app_id, result)
        return result

    @staticmethod
    def refresh_ids_for_all(app_id, result):
        """刷新工作流中所有节点和边的 ID。

        将所有节点、资源和边的 ID 替换为基于应用 ID 的新 ID。

        Args:
            app_id: 应用 ID，用于生成新的唯一标识符。
            result: 包含 nodes、edges 和 resources 的工作流数据字典。
        """
        if app_id is None:
            app_id = str(uuid.uuid4())

        def build_new_id(old_id, use_resource=False):
            """构建新的节点 ID。

            基于应用 ID 和原始 ID 生成新的唯一标识符。

            Args:
                old_id: 原始节点 ID。
                use_resource: 是否为资源节点，影响 ID 前缀。

            Returns:
                str: 新的节点 ID，格式为 "app_id.node.old_id" 或 "app_id.resource.old_id"。
            """
            if not old_id:
                return old_id
            if old_id in ["__start__", "__end__"]:
                return old_id
            if use_resource:  # 修复为老逻辑,资源不修改ID
                return old_id
            new_id = f"{app_id}-{old_id}"
            return new_id

        for data in result["nodes"]:
            # 改写id
            data["id"] = build_new_id(data["id"])
            # 改写ifs下的ID
            if data["kind"].lower() in ["ifs"]:
                for index, subdata in enumerate(data["args"]["true"]):
                    data["args"]["true"][index]["id"] = build_new_id(subdata["id"])
                for index, subdata in enumerate(data["args"]["false"]):
                    data["args"]["false"][index]["id"] = build_new_id(subdata["id"])
            # 改写switch/intention下的ID
            if data["kind"].lower() in ["switch", "intention"]:
                for key in data["args"]["nodes"].keys():
                    for index, subdata in enumerate(data["args"]["nodes"][key]):
                        data["args"]["nodes"][key][index]["id"] = build_new_id(
                            subdata["id"]
                        )

            # 所有使用了 # use_resource 备注的组件都需要处理
            # ***** 改写一些资源的引用 *****
            # lower_type = data["kind"].lower()
            # if lower_type in ["intention"]:
            #     data["args"]["base_model"] = build_new_id(data["args"]["base_model"], True)
            # elif lower_type in ["retriever"]:
            #     data["args"]["doc"] = build_new_id(data["args"]["doc"], True)
            # elif lower_type in ["functioncall"]:
            #     data["args"]["llm"] = build_new_id(data["args"]["llm"], True)
            #     data["args"]["tools"] = [build_new_id(k, True) for k in data["args"]["tools"]]
            # elif lower_type in ["toolsforllm"]:
            #     data["args"]["tools"] = [build_new_id(k, True) for k in data["args"]["tools"]]
            # elif lower_type in ["sqlcall"]:
            #     data["args"]["llm"] = build_new_id(data["args"]["llm"], True)
            #     data["args"]["sql_manager"] = build_new_id(data["args"]["sql_manager"], True)
            # elif lower_type in ["sharedllm"]:
            #     data["args"]["llm"] = build_new_id(data["args"]["llm"], True)
            # elif lower_type in ["document"]:
            #     data["args"]["embed"] = build_new_id(data["args"]["embed"], True)
            # ***** 结束一些资源的引用 *****

        for data in result["resources"]:
            lower_type = data["kind"].lower()

            # 改写web控件下history字段的引用
            if lower_type in ["web"]:
                for index, _id in enumerate(data["args"]["history"]):
                    data["args"]["history"][index] = build_new_id(_id)
            # 仅资源下的httptool 需要修改name, nodes下的httptool 不能修改name
            if lower_type in ["httptool"]:
                data["name"] = data["extras-provider_name"]

        # 改写连线的两边id, 可能有常量边(不存在输入端)
        for data in result["edges"]:
            if "iid" in data:
                data["iid"] = build_new_id(data["iid"])
            if "oid" in data:
                data["oid"] = build_new_id(data["oid"])

    @staticmethod
    def find_history_list(result):
        """查找工作流中所有使用历史记录的节点。

        递归遍历所有节点，找出启用了历史记录功能的节点 ID。

        Args:
            result: 包含 nodes 的工作流数据字典。

        Returns:
            list: 启用历史记录的节点 ID 列表。
        """
        history_list = []

        def _inter_find(node_list):
            """递归查找节点列表中的历史记录节点。

            Args:
                node_list: 要搜索的节点列表。
            """
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

    @staticmethod
    def remove_extras_finally(result):
        """移除以 extras 开头的额外信息。

        extras 开头的信息只是用于本项目逻辑，并不是 LazyLLM 所需要的，
        可以删除保持简洁。必须放在最后调用。

        Args:
            result: 包含节点信息的工作流数据字典。

        Note:
            当前方法已被禁用（直接返回），不再执行后续步骤。
        """
        return  # 不再执行后续步骤

    @staticmethod
    def override_transparent(result):
        """覆盖透传属性。

        父画布可以通过透传属性 config__patent_data 修改子画布中的节点属性。
        透传数据格式：
        "config__patent_data": {
            "1728889795610": {
                "type": "code",
                "payload__code": "xxx",
                "payload__code_language": "python3",
                "payload__kind": "Code",
            },
            "1728897876427": {
                "payload__kind": "HTTP",
                "payload__method": "get",
                "payload__code_language": "json",
                "payload__url": "sdaads",
                "payload__timeout": 60,
                "payload__body": "",
            }
        }

        Args:
            result: 包含 nodes 的工作流数据字典，支持递归处理。
        """
        for index, lazynode in enumerate(result["nodes"]):
            if lazynode.get("extras-config__patent_data", {}):
                for node_id, rawdata in lazynode["extras-config__patent_data"].items():
                    match_node = None

                    # 寻找满足要求的子模块中的节点
                    for j, subnode in enumerate(lazynode["args"]["nodes"]):
                        if (
                            subnode["name"] == node_id
                        ):  # 子模块中id已经被改写了,但是name依旧是原来的id
                            match_node = result["nodes"][index]["args"]["nodes"][
                                j
                            ]  # 直接引用其位置,而不是引用其复制品
                            break
                        # 如果是ifs/switch/intention, 需要在true/false/nodes中寻找
                        elif subnode["kind"].lower() == "ifs":
                            for k, ifsnode in enumerate(subnode["args"]["true"]):
                                if ifsnode["name"] == node_id:
                                    match_node = result["nodes"][index]["args"][
                                        "nodes"
                                    ][j]["args"]["true"][k]
                                    break
                            for k, ifsnode in enumerate(subnode["args"]["false"]):
                                if ifsnode["name"] == node_id:
                                    match_node = result["nodes"][index]["args"][
                                        "nodes"
                                    ][j]["args"]["false"][k]
                                    break
                        # switch/intention
                        elif subnode["kind"].lower() in ["switch", "intention"]:
                            for key in subnode["args"]["nodes"].keys():
                                for k, ifsnode in enumerate(
                                    subnode["args"]["nodes"][key]
                                ):
                                    if ifsnode["name"] == node_id:
                                        match_node = result["nodes"][index]["args"][
                                            "nodes"
                                        ][j]["args"]["nodes"][key][k]
                                        break

                    # 透传覆盖属性
                    if match_node is not None and "args" in match_node:
                        update_dict = create_node(
                            {"id": node_id, "data": rawdata}
                        ).to_dict()
                        logging.info(
                            f"override_transparent found {node_id}, {update_dict}"
                        )
                        update_dict = update_dict.get("args", {})
                        update_dict = {
                            k: v
                            for k, v in update_dict.items()
                            if k not in ["nodes", "true", "false"]
                        }
                        match_node["args"].update(update_dict)
                    else:
                        logging.error(f"override_transparent not found {node_id}")

                # 对子模块递归处理
                Converter.override_transparent(result["nodes"][index]["args"])

    def _get_sorted_edges(self, g, start_id, end_id, fork_aggr_pair):
        """获取排序后的边列表。

        找出一条从 end -> start 的路径（必然经过了最外层的 ifs-aggr）。
        必须使用倒序来查找，因为输入端的连线是有顺序的，而输出端的连线无法看出顺序。

        Args:
            g: NetworkX 有向图对象。
            start_id: 起始节点 ID。
            end_id: 结束节点 ID。
            fork_aggr_pair: 分支-聚合器对，用于修复多次循环时的比较数据。

        Returns:
            list: 排序后的边列表，格式为 [(source, target), ...]。
        """
        mapping = {}
        for item in g.edges():
            key = item[1]
            if key not in mapping:
                mapping[key] = []
            mapping[key].append(item)

        # 整理排序,按照输入端的连线从下至上排序(也即倒叙)
        for key, value_list in mapping.items():
            if key in self.target_sorting_inputs:
                # 修复多次循环时需要比较的数据
                if fork_aggr_pair is not None:
                    for index, pair in enumerate(self.target_sorting_inputs[key]):
                        if pair[0] == fork_aggr_pair[1]:
                            self.target_sorting_inputs[key][index] = (
                                fork_aggr_pair[0],
                                pair[1],
                            )
                # 在原位置进行重排: 根据 index 的位置进行排序
                mapping[key].sort(
                    key=lambda x: -self.target_sorting_inputs[key].index(x),
                )

        sorted_edges = []

        def _internal_append(match_id):
            """递归添加匹配的边到排序列表。

            Args:
                match_id: 要匹配的节点 ID，从此节点开始递归查找相关边。

            Raises:
                ValueError: 当处理连线时出错。
            """
            while match_id:
                if match_id in self.aggregator_ids:
                    onedata = mapping[match_id][0]
                    if onedata not in sorted_edges:
                        sorted_edges.append(onedata)
                    match_id = None if onedata[0] == start_id else onedata[0]
                else:
                    try:
                        for onedata in mapping[match_id]:
                            if onedata not in sorted_edges:
                                sorted_edges.append(onedata)
                            _internal_append(
                                None if onedata[0] == start_id else onedata[0]
                            )
                            match_id = None
                    except Exception as e:
                        raise ValueError(f"处理连线时出错: {e}")
                    break

        # outside while
        _internal_append(end_id)
        # 全部颠倒一遍,以恢复从start->end的顺序
        sorted_edges.reverse()
        return sorted_edges

    def _find_fork_aggr_pairs_in_sorted(self, sorted_edges):
        """找出分支-聚合器对在排序后边列表中的位置。

        在 sorted_edges 中找出第一个相对应的 fork-aggr 对（ifs/switch - aggregator）的位置索引。

        Args:
            sorted_edges: 排序后的边列表。

        Returns:
            tuple: (fork_index, aggr_index) 分支节点和聚合器节点在边列表中的索引。
                  如果没有找到完整的对，返回 (-1, -1)。
        """
        level = 0
        fork_index = aggr_index = -1
        already_ids = set()
        for i, (iid, oid) in enumerate(sorted_edges):
            if (
                iid in self._help_store_used_forks
            ):  # 忽略已经处理过的元素(已经消除了聚合控件,并重组了控件排版)
                continue
            if iid in already_ids:
                continue
            already_ids.add(iid)  # 每个元素只检查一次

            # 找出来第一个相对应的fork-aggr对(ifs/switch - aggregator)
            if iid in self.fork_type_ids:
                if level == 0:
                    fork_index = i
                level += 1
            elif iid in self.aggregator_ids:
                level -= 1
                if level == 0:
                    aggr_index = i
                    break

        return fork_index, aggr_index

    def prepare_paths(self, ggg, all_edges, start_id, end_id, fork_aggr_pair=None):
        """准备并处理工作流路径。

        寻找出"从分支到聚合器"的所有路径，处理分支节点（ifs/switch/intention）
        和聚合器之间的复杂连接关系，将其转换为线性流程。

        Args:
            ggg: NetworkX 有向图对象。
            all_edges: 所有边的列表。
            start_id: 起始节点 ID。
            end_id: 结束节点 ID。
            fork_aggr_pair: 可选的分支-聚合器对，用于递归处理嵌套结构。

        Returns:
            list: 处理后的边列表，分支结构已被转换为线性结构。

        Raises:
            ValueError: 当遇到不支持的控件类型时抛出。
        """
        g = nx.DiGraph(all_edges)
        print_and_log(f"origin_edges: {g.edges()}")
        sorted_edges = self._get_sorted_edges(g, start_id, end_id, fork_aggr_pair)
        print_and_log(f"sorted_edges: {sorted_edges}")

        fork_index, aggr_index = self._find_fork_aggr_pairs_in_sorted(sorted_edges)
        print_and_log(f"find_pairs: {fork_index}, {aggr_index}")

        if fork_index >= 0 and aggr_index >= 0:
            new_list = sorted_edges[:fork_index]  # 第一部分:头部
            new_item = (sorted_edges[fork_index][0], sorted_edges[aggr_index][1])
            new_list.append(new_item)  # 第二部分:重组为一个元素
            new_list.extend(sorted_edges[aggr_index + 1 :])  # 第三部分:尾部

            # 组织true/false两个线性流程
            fork_id = sorted_edges[fork_index][0]
            aggr_id = sorted_edges[aggr_index][0]
            case_map_onepath = self._build_fork_cases(ggg, fork_id, aggr_id)
            self._help_store_used_forks.append(fork_id)  # 认为已经使用过了

            fork_basenode = self.id_map_basenode[fork_id]
            fork_data = fork_basenode.to_dict()
            lower_type = fork_basenode.get_type().lower()
            if lower_type == "ifs":
                fork_data["args"]["true"] = [
                    self.id_map_basenode[_id].to_dict()
                    for _id in case_map_onepath["true"]
                ]
                fork_data["args"]["false"] = [
                    self.id_map_basenode[_id].to_dict()
                    for _id in case_map_onepath["false"]
                ]
            elif lower_type in ["switch", "intention"]:
                for key, value in case_map_onepath.items():
                    cond_key = (
                        self.id_map_basenode[fork_id]
                        .get_fork_casedata_by_caseid(key)
                        .get("cond", "default")
                    )
                    if not cond_key:
                        cond_key = "default"  # 如果cond_key是空字符串,重置为default

                    switch_input_variable_type = None
                    config__input_shape = (
                        self.get_basenode_by_id(fork_id)
                        .get_data()
                        .get("config__input_shape")
                        or []
                    )
                    if len(config__input_shape) > 0:
                        switch_input_variable_type = config__input_shape[0].get(
                            "variable_type"
                        )

                    type_map_func = {"int": int, "float": float}
                    if (
                        switch_input_variable_type in type_map_func
                        and cond_key != "default"
                    ):
                        try:
                            cond_key = type_map_func[switch_input_variable_type](
                                cond_key
                            )
                        except ValueError:
                            pass
                    fork_data["args"]["nodes"][cond_key] = [
                        self.id_map_basenode[_id].to_dict() for _id in value
                    ]
            else:
                raise ValueError(f"控件{lower_type} 未实现格式转换")
            self.id_map_finals[fork_id] = fork_data  # 定义好最终数据

            print_and_log(f"prepare_paths: {fork_id}, {aggr_id}")
            return self.prepare_paths(
                ggg, new_list, start_id, end_id, fork_aggr_pair=(fork_id, aggr_id)
            )
        else:
            return sorted_edges

    def _build_fork_cases(self, ggg, fork_id, aggr_id):
        """构建分支情况的路径映射。

        为分支节点（fork）到聚合器节点（aggr）之间的所有路径构建映射关系，
        按照不同的分支情况（case）组织路径。

        Args:
            ggg: NetworkX 有向图对象。
            fork_id: 分支节点的 ID。
            aggr_id: 聚合器节点的 ID。

        Returns:
            dict: 分支情况映射字典，格式为 {case_id: [path_nodes]}。

        Raises:
            ValueError: 当构建分支路径时出错，如分支节点到聚合节点直接连接等。
        """
        case_map_pathset = {}

        try:
            for path_infos in nx.all_simple_paths(ggg, source=fork_id, target=aggr_id):
                path_infos = path_infos[1:-1]
                if len(path_infos) == 0:
                    raise ValueError(
                        "构建分支路径时出错, 分支节点到聚合节点不可以直接连接"
                    )
                normal_id = path_infos[0]  # 非ifs/switch的第一个元素

                # 初始化
                if not case_map_pathset:
                    case_map_pathset = {
                        case_id: []
                        for case_id in self.id_map_basenode[
                            fork_id
                        ].get_fork_caseid_list()
                    }

                case_id = self.id_map_basenode[fork_id].get_input_caseid(normal_id)
                case_map_pathset[case_id].append(path_infos)
        except Exception:
            raise ValueError("构建分支路径时出错")

        result = {}
        for case_id, path_set in case_map_pathset.items():
            result[case_id] = self._parse_case_set(ggg, fork_id, aggr_id, path_set)
        return result

    def _parse_case_set(self, ggg, start_id, end_id, path_set):
        """解析分支情况的路径集合。

        处理单个分支情况下的路径集合，当前仅支持单一路径，
        不支持复杂嵌套的分支结构。

        Args:
            ggg: NetworkX 有向图对象（当前未使用）。
            start_id: 起始节点 ID（当前未使用）。
            end_id: 结束节点 ID（当前未使用）。
            path_set: 路径集合列表。

        Returns:
            list: 单一路径的节点列表。

        Raises:
            ValueError: 当路径集合包含多个路径时抛出，表示不支持复杂嵌套。
        """
        if len(path_set) == 1:
            return path_set[0]
        else:
            raise ValueError("条件分支暂时不支持复杂嵌套")

    def prepare_resources(self):
        """准备资源列表。

        将原始资源数据转换为 LazyLLM 格式的资源定义列表。

        Returns:
            list: 包含所有资源节点字典的列表，每个资源都已转换为标准格式。
        """
        ret_list = []
        for rawdata in self.raw_resources:
            ret_list.append(self.id_map_basenode[rawdata["id"]].to_dict())
            # ret_list.append(BaseNode(rawdata).to_dict())
        return ret_list
