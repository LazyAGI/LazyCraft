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

import ast
import copy

from parts.tools.model import Tool, ToolAuth, ToolHttp

# 操作符映射
OP_MAP = {
    ">": ast.Gt(),
    "<": ast.Lt(),
    "==": ast.Eq(),
    "!=": ast.NotEq(),
    ">=": ast.GtE(),
    "<=": ast.LtE(),
}


def parse_to_bool(s):
    """将字符串或其他类型的值解析为布尔值。

    Args:
        s: 要解析的值，可以是字符串或其他类型。

    Returns:
        bool: 解析后的布尔值。
              如果是字符串 "true" 或 "yes"（不区分大小写）返回 True，
              否则将值转换为布尔类型。
    """
    if isinstance(s, str):
        return s.lower() in ["true", "yes"]
    return bool(s)


def parse_newline(s):
    """将字符串中的转义字符转换为实际的换行符等特殊字符。

    Args:
        s: 包含转义字符的字符串，如果为 None 则当作空字符串处理。

    Returns:
        str: 转换后的字符串，其中转义序列被替换为对应的特殊字符。
             支持的转义序列包括：\\n, \\r, \\t, \\f, \\v, \\0。
    """
    s = s or ""
    return (
        s.replace("\\n", "\n")
        .replace("\\r", "\r")
        .replace("\\t", "\t")
        .replace("\\f", "\f")
        .replace("\\v", "\v")
        .replace("\\0", "\0")
    )


class BaseNode:
    id: str
    kind: str
    name: str
    hyperparameter: dict = {}
    extras_enable_backflow: bool
    extras_title: str

    def __init__(self, nodedata):
        """初始化节点对象。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。

        Raises:
            KeyError: 当 nodedata 缺少必要的字段时抛出。
        """
        self.nodedata = nodedata
        self.lower_type = self.get_type().lower()
        self.used_resources = {}
        self.refer_app_ids = []  # 引用的app
        self.refer_model_ids = []  # 引用的model

        self.id = self.get_id()
        self.kind = self.get_type()
        self.name = self.get_id()
        self.extras_enable_backflow = self.get_data().get("enable_backflow", False)
        self.extras_title = self.get_data().get("title", "")

        self.constant_edges = []
        self._confid_node()

    def _confid_node(self):
        """配置节点的输入端口和常量边。

        解析节点配置中的输入端口信息，并识别常量模式的输入参数，
        将其添加到 constant_edges 列表中。
        """
        input_ports = self.get_data().get("config__input_ports", [])
        self.input_ports = [d["id"] for d in input_ports]

        # 检查输入参数的类型中，是否有常量模式
        # 原代码仅支持单个常数，现在改为多个常数，可能造成其他问题
        config__input_shape = self.get_data().get("config__input_shape") or []
        for index, data in enumerate(config__input_shape):
            if data.get("variable_mode") == "mode-const":
                if data.get("variable_type") != "file":
                    variable_value = data.get("variable_const")
                    self.constant_edges.append(
                        {"constant": variable_value, "index": index}
                    )

    def set_input_ports(self, targetHandle, source_id, target_id):
        """设置节点的输入端口连接信息。

        Args:
            targetHandle: 目标端口的标识符。
            source_id: 源节点的 ID。
            target_id: 目标节点的 ID。
        """
        if targetHandle in self.input_ports:
            index = self.input_ports.index(targetHandle)
            self.input_ports[index] = (source_id, target_id)

    @classmethod
    def check_type_is_fork_type(cls, _type):
        """检查节点类型是否为分支类型。

        Args:
            _type: 节点类型字符串。

        Returns:
            bool: 如果是分支类型（ifs、switch、intention）返回 True，否则返回 False。
        """
        return _type.lower() in ["ifs", "switch", "intention"]

    @classmethod
    def check_type_is_local_model_type(cls, _type):
        """检查节点类型是否为本地模型类型。

        Args:
            _type: 节点类型字符串。

        Returns:
            bool: 如果是本地模型类型（stt、vqa、sd、tts、localembedding）返回 True，否则返回 False。
        """
        return _type.lower() in ("stt", "vqa", "sd", "tts", "localembedding")

    @classmethod
    def check_type_is_subgraph_type(cls, _type):
        """检查节点类型是否为子画布类型。

        子画布一类，其中 template 是 app 类型的特殊处理，template 可编辑，app 不可编辑。
        在传入 lazyllm 时，需要将 template 换为 subgraph，区别为 app 的可复用性。

        Args:
            _type: 节点类型字符串。

        Returns:
            bool: 如果是子画布类型（subgraph、warp、loop、app、template）返回 True，否则返回 False。
        """
        return _type.lower() in ("subgraph", "warp", "loop", "app", "template")

    def is_fork_type(self):
        """判断当前节点是否为分支类型。

        Returns:
            bool: 如果是分支类型返回 True，否则返回 False。
        """
        return self.__class__.check_type_is_fork_type(self.lower_type)

    def is_aggregator_type(self):
        """判断当前节点是否为聚合器类型。

        Returns:
            bool: 如果是聚合器类型返回 True，否则返回 False。
        """
        return self.lower_type in ["aggregator"]

    def is_start_type(self):
        """判断当前节点是否为开始节点类型。

        Returns:
            bool: 如果是开始节点类型（start、__start__）返回 True，否则返回 False。
        """
        return self.lower_type in ["start", "__start__"]

    def is_end_type(self):
        """判断当前节点是否为结束节点类型。

        Returns:
            bool: 如果是结束节点类型（end、__end__、answer）返回 True，否则返回 False。
        """
        return self.lower_type in ["end", "__end__", "answer"]

    def is_local_model_type(self):
        """判断当前节点是否为本地模型类型。

        Returns:
            bool: 如果是本地模型类型返回 True，否则返回 False。
        """
        return self.__class__.check_type_is_local_model_type(self.lower_type)

    def is_subgraph_type(self):
        """判断当前节点是否为子画布类型。

        Returns:
            bool: 如果是子画布类型返回 True，否则返回 False。
        """
        return self.__class__.check_type_is_subgraph_type(self.lower_type)

    def get_subgraph_id(self):
        """获取子画布的 ID。

        子画布可以视为 App。

        Returns:
            str or None: 子画布的 ID，如果不存在则返回 None。
        """
        return self.get_data().get("payload__patent_id")

    def get_data(self):
        """获取节点的数据部分。

        Returns:
            dict: 节点数据字典，如果不存在则返回空字典。
        """
        return self.nodedata.get("data", {})

    def get_id(self):
        """获取节点的 ID。

        Returns:
            str or None: 节点的 ID。
        """
        return self.nodedata.get("id")

    def get_type(self):
        """获取节点的类型。

        优先从 payload__kind 获取，其次从 type 字段获取。

        Returns:
            str: 节点类型字符串，如果都不存在则返回空字符串。
        """
        _type = self.get_data().get("payload__kind")
        if _type is None:
            _type = self.get_data().get("type")
        return _type or ""

    def get_input_names(self):
        """获取节点的输入变量名称列表。

        从节点的 config__input_shape 配置中提取所有输入变量的名称。

        Returns:
            list: 输入变量名称的列表。
                  如果没有配置输入形状，返回空列表。

        Example:
            输入配置示例：
            {"config__input_shape": [
                {
                    "id": "819c910f-cfb3-45b9-a5fb-e123a6a7b566",
                    "variable_name": "ie",
                    "variable_type": "str"
                },
                {
                    "id": "86f38119-bdac-425a-a327-e89b135831fb",
                    "variable_name": "wd",
                    "variable_type": "str"
                }
            ]}
            返回：["ie", "wd"]
        """
        config__input_shape = self.get_data().get("config__input_shape") or []
        return [d.get("variable_name") for d in config__input_shape]

    def get_file_resource_id(self):
        """获取文件资源的 ID。

        从节点的输入配置中查找文件类型的输入，
        如果是常量模式则返回文件资源 ID。

        Returns:
            str or None: 文件资源的 ID，如果不存在则返回 None。

        Example:
            输入配置示例：
            {"config__input_shape": [
                {
                    "id": "6bf5f6fb-ac00-4a66-ba75-55ec6cdb4dc7",
                    "variable_type": "file",
                    "variable_mode": "mode-line",
                    "variable_name": "aaa"
                },
                {
                    "id": "312e35a5-f562-4d25-87c3-7f4608aa41bc",
                    "variable_type": "file",
                    "variable_mode": "mode-const",
                    "variable_const": "3bf56fbc-35af-4229-b109-3e62df9b5e38",
                    "variable_name": "bbb"
                }
            ]}
            返回："3bf56fbc-35af-4229-b109-3e62df9b5e38"
        """
        config__input_shape = self.get_data().get("config__input_shape") or []
        for data in config__input_shape:
            if data.get("variable_type") == "file":
                if data.get("variable_mode") == "mode-const":
                    return data.get("variable_const") or None

    def set_used_resources(self, key, str_or_list):
        """设置组件引用的资源。

        Args:
            key: 资源类型的标识符。
            str_or_list: 资源 ID，可以是单个字符串或字符串列表。
        """
        self.used_resources[key] = str_or_list

    def get_used_resources(self, global_nodeid_map_rawdata=None):
        """获取组件引用的所有资源。

        递归获取当前节点及其依赖节点的所有资源 ID。

        Args:
            global_nodeid_map_rawdata: 可选的全局节点映射字典，
                                      用于递归查找依赖节点的资源。

        Returns:
            list: 去重后的资源 ID 列表。
        """
        ret_list = []
        for key, str_or_list in self.used_resources.items():
            if isinstance(str_or_list, (list, tuple)):
                ret_list.extend(str_or_list)
            else:
                ret_list.append(str_or_list)

        ret_list = list(set(ret_list))

        if global_nodeid_map_rawdata is not None:
            more_id_list = []
            for nodeid in ret_list:
                rawdata = global_nodeid_map_rawdata.get(nodeid, None)
                if rawdata:
                    more_id_list.extend(
                        BaseNode(rawdata).get_used_resources(
                            global_nodeid_map_rawdata=global_nodeid_map_rawdata
                        )
                    )

            if more_id_list:
                ret_list.extend(more_id_list)
                ret_list = list(set(ret_list))

        return ret_list

    def set_used_refer(self, _type, _id):
        """设置使用到的引用对象的 ID。

        Args:
            _type: 引用类型，支持 "app" 或 "model"。
            _id: 引用对象的 ID。

        Raises:
            ValueError: 当传入不支持的引用类型时抛出。
        """
        if _type == "app":
            self.refer_app_ids.append(_id)
        elif _type == "model":
            self.refer_model_ids.append(_id)
        else:
            raise ValueError(f"未被识别的引用类型: {_type}")

    def get_used_refer(self, _type):
        """获取使用到的引用对象的 ID 列表。

        Args:
            _type: 引用类型，支持 "app" 或 "model"。

        Returns:
            list: 对应类型的引用 ID 列表。

        Raises:
            ValueError: 当传入不支持的引用类型时抛出。
        """
        if _type == "app":
            return self.refer_app_ids
        elif _type == "model":
            return self.refer_model_ids
        else:
            raise ValueError(f"未被识别的引用类型: {_type}")

    def get_model_apikey_by_id(self, online_id):
        """根据模型 ID 获取 API 密钥信息。

        Args:
            online_id: 在线模型的 ID。

        Returns:
            dict: 模型的 API 密钥信息，如果 ID 为空则返回空字典。
        """
        from parts.models_hub.service import ModelService

        self.set_used_refer("model", online_id)
        return ModelService.get_model_apikey_by_id(online_id) if online_id else {}

    def get_db_info(self, database_id):
        """获取数据库信息。

        Args:
            database_id: 数据库的 ID。

        Returns:
            dict: 数据库的详细信息。
        """
        from parts.db_manage.service import DBManageService

        return DBManageService.get_builtin_database_info(database_id=database_id)

    def get_input_caseid(self, target_id):
        """获取节点的输入端链接的 case ID。

        Args:
            target_id: 目标节点的 ID。

        Returns:
            str or None: 对应的 case ID，如果未找到则返回 None。

        Raises:
            ValueError: 当节点不是分支节点时抛出。
        """
        if not hasattr(self, "fork_map_casedict"):
            raise ValueError("错误的处理了非分支节点")
        for case_id, edgedata in self.fork_map_casedict.items():
            if edgedata["target"] == target_id:
                return case_id
        return None

    def get_fork_caseid_list(self):
        """获取分支节点下所有可能的 case ID。

        Returns:
            list: case ID 列表，例如 ["false", "true", "case1", "case2", ...]
        """
        ret_list = []
        for casedata in self.get_data().get("config__output_ports", []):
            ret_list.append(casedata["id"])
        return ret_list

    def get_fork_casedata_by_caseid(self, case_id):
        """根据 case ID 获取分支节点的输出端口配置数据。

        Args:
            case_id: 要查找的 case ID。

        Returns:
            dict or None: 匹配的 case 数据字典，包含以下字段：
                         - id: case ID
                         - label: 显示标签，如 "CASE 1"
                         - cond: 条件值
                         - chosen: 是否被选中
                         - selected: 是否被选择
                         如果未找到匹配的 case，返回 None。
        """
        for casedata in self.get_data().get("config__output_ports", []):
            if casedata["id"] == case_id:
                return casedata
        return None

    def to_dict(self):
        """将节点对象转换为字典格式。

        Returns:
            dict: 包含节点完整信息的字典，包括：
                  - id: 节点 ID
                  - kind: 节点类型
                  - name: 节点名称
                  - hyperparameter: 超参数配置
                  - args: 参数字典，默认包含 _lazyllm_enable_report 参数
                  - extras-enable_backflow: 是否支持回流
                  - extras-title: 画布上的标题
        """
        result = {
            "id": self.get_id(),
            "kind": self.get_type(),
            "name": self.get_id(),
            "hyperparameter": self.hyperparameter,
            "args": {},
            "extras-enable_backflow": self.get_data().get(
                "enable_backflow", False
            ),  # 支持回流
            "extras-title": self.get_data().get("title", ""),  # 画布上的标题
        }
        result = self._to_dict(result)
        result["args"]["_lazyllm_enable_report"] = True
        return result


class ForkNode(BaseNode):
    fork_map_casedict: dict

    def __init__(self, nodedata):
        """初始化分支节点。

        创建一个分支节点并初始化其 case 映射字典。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.fork_map_casedict = {}
        for casedata in self.get_data().get("config__output_ports", []):
            self.fork_map_casedict[casedata["id"]] = None  # 后续填充为edge信息

    def set_fork_map_casedict(self, casedata):
        """设置分支映射字典中的 case 数据。

        Args:
            casedata: 包含 sourceHandle 的 case 数据字典，
                     将作为边的信息存储在对应的分支中。
        """
        self.fork_map_casedict[casedata["sourceHandle"]] = casedata


class IFSNode(ForkNode):
    judge_on_full_input: bool
    cond: str
    true: list
    false: list

    def __init__(self, nodedata):
        """初始化条件判断节点。

        创建一个 if-else 条件判断节点。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.judge_on_full_input = self.get_data().get("payload__judge_on_full_input")
        self.cond = self.get_data().get("config__output_ports", [])[0].get("cond")
        self.true = []
        self.false = []

    def _to_dict(self, result):
        """将条件判断节点转换为字典格式。

        Args:
            result: 基础字典，将在此基础上添加节点特定的参数。

        Returns:
            dict: 更新后的字典，包含条件判断节点的特定参数：
                  - judge_on_full_input: 是否基于完整输入进行判断
                  - cond: 判断条件
                  - true: 条件为真时执行的节点列表
                  - false: 条件为假时执行的节点列表
        """
        result["args"] = {
            "judge_on_full_input": self.judge_on_full_input,
            "cond": self.cond,
            "true": (
                [d for node in self.true if (d := node.to_dict())] if self.true else []
            ),
            "false": (
                [d for node in self.false if (d := node.to_dict())]
                if self.false
                else []
            ),
        }
        return result


class SwitchNode(ForkNode):
    judge_on_full_input: bool
    nodes: dict

    def __init__(self, nodedata):
        """初始化多分支选择节点。

        创建一个 switch 多分支选择节点。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.judge_on_full_input = self.get_data().get("payload__judge_on_full_input")
        self.nodes = {}

    def _to_dict(self, result):
        """将多分支选择节点转换为字典格式。

        Args:
            result: 基础字典，将在此基础上添加节点特定的参数。

        Returns:
            dict: 更新后的字典，包含多分支选择节点的特定参数：
                  - judge_on_full_input: 是否基于完整输入进行判断
                  - nodes: 分支节点字典，按分支名称组织，default 分支排在最后
        """
        result["args"] = {
            "judge_on_full_input": self.judge_on_full_input,
            "nodes": (
                dict(
                    sorted(
                        {
                            key: [d for node in value if (d := node.to_dict())]
                            for key, value in self.nodes.items()
                        }.items(),
                        key=lambda x: x[0] == "default",
                    )
                )
                if self.nodes
                else {}
            ),
        }
        return result


class IntentionNode(ForkNode):
    base_model: str
    prompt: str
    constrain: str
    attention: str
    nodes: dict

    def __init__(self, nodedata):
        """初始化意图识别节点。

        创建一个基于 AI 模型的意图识别节点，可以根据用户输入判断意图并分支处理。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.base_model = self.get_data().get("payload__base_model")
        self.prompt = self.get_data().get("payload__prompt", "")
        self.constrain = self.get_data().get("payload__constrain", "")
        self.attention = self.get_data().get("payload__attention", "")
        self.nodes = {}

    def _to_dict(self, result):
        """将意图识别节点转换为字典格式。

        Args:
            result: 基础字典，将在此基础上添加节点特定的参数。

        Returns:
            dict: 更新后的字典，包含意图识别节点的特定参数：
                  - base_model: 使用的基础模型
                  - prompt: 提示词
                  - constrain: 用户限制条件
                  - attention: 注意事项
                  - nodes: 意图分支对应的节点字典
        """
        result["args"] = {
            "base_model": self.base_model,  # use_resource
            "prompt": self.prompt,
            "constrain": self.constrain,  # 用户限制
            "attention": self.attention,  # 注意事项
            "nodes": (
                {
                    key: [d for node in value if (d := node.to_dict())]
                    for key, value in self.nodes.items()
                }
                if self.nodes
                else {}
            ),  # 后续在处理时补充
        }
        self.set_used_resources("base_model", result["args"]["base_model"])
        return result


class CodeNode(BaseNode):
    code: str

    def __init__(self, nodedata):
        """初始化代码执行节点。

        创建一个可以执行自定义代码的节点。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.code = self.get_data().get("payload__code")

    def _to_dict(self, result):
        """将代码执行节点转换为字典格式。

        Args:
            result: 基础字典，将在此基础上添加节点特定的参数。

        Returns:
            dict: 更新后的字典，包含代码执行节点的代码参数。
        """
        result["args"] = {
            "code": self.code,
        }
        return result


class RetrieverNode(BaseNode):
    doc: str
    group_name: str
    similarity: str
    topk: str
    target: str
    output_format: str
    join: bool

    def __init__(self, nodedata):
        """初始化检索节点。

        创建一个用于文档检索的节点，可以从文档集合中检索相关内容。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.doc = self.get_data().get("payload__doc")
        self.group_name = self.get_data().get("payload__group_name")
        self.similarity = self.get_data().get("payload__similarity")
        self.topk = self.get_data().get("payload__topk")
        self.target = self.get_data().get("payload__target")
        self.output_format = self.get_data().get("payload__output_format")
        self.join = parse_to_bool(self.get_data().get("payload__join"))
        self.set_used_resources("doc", self.doc)

    def _to_dict(self, result):
        """将检索节点转换为字典格式。

        Args:
            result: 基础字典，将在此基础上添加节点特定的参数。

        Returns:
            dict: 更新后的字典，包含检索节点的特定参数：
                  - doc: 文档资源 ID
                  - group_name: 分组名称
                  - similarity: 相似度算法
                  - topk: 返回的最相似结果数量
                  - target: 目标字段
                  - output_format: 输出格式
                  - join: 是否合并结果
        """
        result["args"] = {
            "doc": self.doc,  # use_resource
            "group_name": self.group_name,
            "similarity": self.similarity,
            "topk": self.topk,
            "target": self.target or None,
            "output_format": self.output_format or None,
            "join": self.join,
        }
        return result


class RerankerNode(BaseNode):
    type: str
    target: str
    output_format: str
    join: bool
    arguments: dict

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.type = self.get_data().get("payload__type")
        self.target = self.get_data().get("payload__target")
        self.output_format = self.get_data().get("payload__output_format")
        self.join = parse_to_bool(self.get_data().get("payload__join"))
        self.arguments = self.get_data().get("payload__arguments")

    def _to_dict(self, result):
        result["args"] = {
            "type": self.type,
            "target": self.target or None,
            "output_format": self.output_format or None,
            "join": self.join,
            "arguments": self.arguments,
        }
        return result


class FunctionCallNode(BaseNode):
    llm: str
    tools: list
    algorithm: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.llm = self.get_data().get("payload__base_model")
        self.tools = self.get_data().get("payload__tools", [])
        self.algorithm = self.get_data().get("payload__algorithm")
        self.set_used_resources("llm", self.llm)
        self.set_used_resources("tools", self.tools)

    def _to_dict(self, result):
        result["args"] = {
            "llm": self.llm,  # use_resource
            "tools": self.tools,
            "algorithm": self.algorithm,
        }
        return result


class ToolsForLLMNode(BaseNode):
    tools: list

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.tools = self.get_data().get("payload__tools", [])
        self.set_used_resources("tools", self.tools)

    def _to_dict(self, result):
        result["args"] = {
            "tools": self.tools,
        }
        return result


class SqlCallNode(BaseNode):
    llm: str
    sql_manager: str
    sql_examples: list
    use_llm_for_sql_result: bool

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.llm = self.get_data().get("payload__llm")
        self.sql_manager = self.get_data().get("payload__sql_manager")
        self.sql_examples = self.get_data().get("payload__sql_examples")
        self.use_llm_for_sql_result = self.get_data().get(
            "payload__use_llm_for_sql_result"
        )
        self.set_used_resources("llm", self.llm)
        self.set_used_resources("sql_manager", self.sql_manager)

    def _to_dict(self, result):
        result["args"] = {
            "llm": self.llm,  # use_resource
            "sql_manager": self.sql_manager,  # use_resource
            "sql_examples": self.sql_examples,
            "use_llm_for_sql_result": self.use_llm_for_sql_result,
        }
        return result


class HttpNode(BaseNode):
    method: str
    url: str
    api_key: str
    headers: dict
    params: dict
    body: dict

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.method = self.get_data().get("payload__method")
        self.url = self.get_data().get("payload__url")
        self.api_key = self.get_data().get("payload__api_key")
        self.headers = self.get_data().get("payload__headers", {})
        self.params = self.get_data().get("payload__params", {})
        self.body = self.get_data().get("payload__body", None)

    def _to_dict(self, result):
        result["args"] = {
            "method": self.method,
            "url": self.url,
            "api_key": self.api_key,  # PRD文档与实际的引擎源码定义不一样
            "headers": self.headers,
            "params": self.params,
            "body": self.body or None,
            "_lazyllm_arg_names": self.get_input_names(),
        }
        return result


class HttpToolNode(BaseNode):
    timeout: int
    doc: str

    extras_provider_name: str

    build_mode: str
    code_str: str
    user_id: str
    tool_api_id: str
    authentication_type: str
    is_share: bool
    method: str
    url: str
    headers: dict
    params: dict
    body: dict
    outputs: list
    extract_from_result: bool

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.timeout = self.get_data().get("payload__timeout")
        self.doc = self.get_data().get("payload__doc", "")

        default_name = self.id.replace("-", "")
        provider_id = str(self.get_data().get("provider_id", default_name))
        provider_name = (
            "Func" + provider_id
        )  # 工具的名字需要唯一,并且需要可以推测得到,因为它就是ToolsForLLM的参数之一
        self.extras_provider_name = provider_name

        authentication_type = ""
        is_share = False
        tool_api_id = ""
        tool_instance = Tool.query.get(provider_id)
        if tool_instance:
            tool_api_id = tool_instance.tool_api_id
            tool_api_instance = ToolHttp.query.get(tool_instance.tool_api_id)
            if tool_api_instance:
                authentication_type = tool_api_instance.auth_method
                tool_auth_instance = ToolAuth.query.filter_by(
                    tool_id=tool_instance.id,
                    tool_api_id=tool_api_instance.id,
                    is_share=True,
                ).first()
                if tool_auth_instance:
                    is_share = True

        self.build_mode = "code" if self.get_data().get("payload__code_str") else "api"
        if self.build_mode == "code":
            self.code_str = self.get_data().get("payload__code_str")
        else:
            from flask_login import current_user

            self.user_id = current_user.id
            self.tool_api_id = tool_api_id
            self.authentication_type = authentication_type
            self.is_share = is_share
            self.method = self.get_data().get("payload__method")
            self.url = self.get_data().get("payload__url")
            self.headers = self.get_data().get("payload__headers", {})
            self.params = self.get_data().get("payload__params", {})
            self.body = self.get_data().get("payload__body", None)
            self.outputs = self.get_data().get("payload__outputs", None)
            self.extract_from_result = self.get_data().get(
                "payload__extract_from_result", None
            )
            if self.outputs is None:
                outputs = self.get_data().get("config__output_shape")
                if outputs:
                    self.outputs = [item["variable_name"] for item in outputs]
            if self.outputs is not None:
                if len(self.outputs) == 1:
                    self.extract_from_result = self.extract_from_result or False
                else:
                    self.extract_from_result = False
            api_key = self.get_data().get("payload__api_key")
            if api_key:
                self.headers["Authorization"] = "Bearer " + api_key

    def _to_dict(self, result):
        result["extras-provider_name"] = self.extras_provider_name
        result["args"] = {
            "timeout": self.get_data().get("payload__timeout"),
            "doc": self.get_data().get("payload__doc") or "",
        }
        if self.build_mode == "code":
            result["args"]["code_str"] = self.code_str
        else:
            result["args"]["user_id"] = self.user_id
            result["args"]["tool_api_id"] = self.tool_api_id
            result["args"]["authentication_type"] = self.authentication_type
            result["args"]["share_key"] = self.is_share
            result["args"]["method"] = self.method
            result["args"]["url"] = self.url
            result["args"]["headers"] = self.headers
            result["args"]["params"] = self.params
            result["args"]["body"] = self.body
            result["args"]["outputs"] = self.outputs
            result["args"]["extract_from_result"] = self.extract_from_result
            result["args"]["_lazyllm_arg_names"] = self.get_input_names()
        return result


class FormatterNode(BaseNode):
    ftype: str
    rule: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.ftype = self.get_data().get("payload__ftype")
        self.rule = self.get_data().get("payload__rule")

    def _to_dict(self, result):
        result["args"] = {
            "ftype": self.ftype,
            "rule": self.rule,
        }
        return result


class JoinFormatterNode(BaseNode):
    type: str
    names: list
    symbol: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.type = self.get_data().get("payload__type")
        self.names = self.get_data().get("payload__names", [])
        self.symbol = parse_newline(
            self.get_data().get("payload__symbol", "")
        )  # 处理特殊字符

    def _to_dict(self, result):
        result["args"] = {
            "type": self.type,
        }
        if self.type == "to_dict":
            result["args"]["names"] = self.names
        if self.type == "join":
            result["args"]["symbol"] = self.symbol
        return result


class LocalModelNode(BaseNode):
    deploy_method: str
    base_model: str

    file_resource_id: str = None

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.base_model = self.get_data().get("payload__base_model")
        from parts.models_hub.service import ModelService

        model_id = self.base_model
        self.base_model = ModelService.get_model_path_by_id(model_id)
        self.set_used_refer("model", model_id)
        # if os.getenv("DEBUG", "").lower() == "true":
        #     self.deploy_method = "dummy"
        # else:
        #     self.deploy_method = self.get_data().get("payload__deploy_method")
        #     from parts.models_hub.service import ModelService

        #     model_id = self.base_model
        #     self.base_model = ModelService.get_model_path_by_id(model_id)
        #     self.set_used_refer("model", model_id)

        # 是否使用了 file_resource_id, 则添加该字段: 只有vqa, stt
        file_resource_id = self.get_file_resource_id()  # use_resource
        if file_resource_id:
            self.file_resource_id = file_resource_id
            self.set_used_resources("file_resource_id", self.file_resource_id)

    def _to_dict(self, result):
        result["args"] = {
            # "deploy_method": self.deploy_method,
            "base_model": self.base_model,
        }
        # if os.getenv("DEBUG", "").lower() != "true":
        #     del result["args"]["deploy_method"]  # 实际情况lazyllm并不需要该参数

        # 是否使用了 file_resource_id, 则添加该字段: 只有vqa, stt
        if self.file_resource_id:
            result["args"]["file_resource_id"] = self.file_resource_id

        return result


class LocalTTSNode(LocalModelNode):
    def __init__(self, nodedata):
        super().__init__(nodedata)
        generate_control = self.get_data().get("payload__model_generate_control", {})
        self.pause = generate_control.get("payload__pause", 0)
        self.laugh = generate_control.get("payload__laugh", 0)
        self.oral = generate_control.get("payload__oral", 2)
        self.speed = generate_control.get("payload__speed", 1)
        self.temperature = generate_control.get("payload__temperature", 0.3)
        self.voice_seed = generate_control.get("payload__voice_seed", -1)
        self.hyperparameter = {
            "pause": self.pause,
            "laugh": self.laugh,
            "oral": self.oral,
            "speed": self.speed,
            "temperature": self.temperature,
            "voice_seed": self.voice_seed,
        }


class LocalVQANode(LocalModelNode):
    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.prompt = self.get_data().get("payload__prompt")

        generate_control = self.get_data().get("payload__model_generate_control", {})
        self.temperature = generate_control.get("payload__temperature", 0.8)
        self.top_p = generate_control.get("payload__top_p", 0.7)
        self.max_tokens = generate_control.get("payload__max_tokens", 4096)
        self.hyperparameter = {
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_new_tokens": self.max_tokens,
        }

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"]["prompt"] = self.prompt
        return result


class OnlinellmNode(BaseNode):
    use_history: bool
    prompt: str
    stream: bool
    source: str
    base_model: str
    token: str = None
    jobid: str
    input_keys: list
    base_url: str
    buildin_history: list
    output_format_split: str = "||output_format_split||"

    def __init__(self, nodedata):
        """初始化在线大语言模型节点。

        创建一个调用在线 LLM 服务的节点，支持对话历史、流式输出等功能。

        Args:
            nodedata: 节点数据字典，包含节点的配置信息。
        """
        super().__init__(nodedata)
        self.use_history = parse_to_bool(self.get_data().get("payload__use_history"))
        self.prompt = copy.deepcopy(self.get_data().get("payload__prompt"))
        self.buildin_history = self.get_data().get("payload__example_dialogs", [])
        self.stream = parse_to_bool(self.get_data().get("payload__stream"))
        # self.output_type = self.get_data().get('payload__output_type', 'text')
        # if self.output_type == "markdown":
        #     self.prompt['system'] += self.output_format_split + "\n\n请以markdown格式输出结果"
        # elif self.output_type == "json":
        #     output_example = self._construct_output_example(self.get_data().get('config__output_shape', []))
        #     json_str = json.dumps(output_example, ensure_ascii=False, indent=2)
        #     json_str = json_str.replace('}', '}}').replace('{', '{{')
        #     self.prompt['system'] += self.output_format_split + f"\n\n请以json格式输出结果, 输出格式为: {json_str}"

        generate_control = self.get_data().get("payload__model_generate_control", {})
        self.temperature = generate_control.get("payload__temperature", 0.8)
        self.top_p = generate_control.get("payload__top_p", 0.7)
        self.max_tokens = generate_control.get("payload__max_tokens", 4096)
        self.hyperparameter = {
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_new_tokens": self.max_tokens,
        }
        input_shape = self.get_data().get("config__input_shape") or []
        self.input_keys = [data.get("variable_name") for data in input_shape]

        self.source = self.get_data().get("payload__source") or self.get_data().get(
            "payload__model_source"
        )
        self.jobid = self.get_data().get("payload__jobid")
        self.base_url = (self.get_data().get("payload__base_url", "")).strip()
        if self.jobid:
            self.base_model = self.jobid
            self.token = self.get_data().get("payload__token")
        else:
            self.base_model = self.get_data().get("payload__base_model")

    def get_type(self):
        """获取节点类型。

        Returns:
            str: 返回 "LLM" 表示这是一个大语言模型节点。
        """
        return "LLM"

    def _construct_output_example(self, output_shape):
        """构建输出示例结构。

        根据输出形状配置递归构建输出示例的数据结构。

        Args:
            output_shape: 输出形状配置列表，描述输出的结构。

        Returns:
            dict: 输出示例字典，包含字段名和类型描述。
        """
        output_example = {}
        for item in output_shape:
            if item["variable_type"] == "dict":
                output_example[item["variable_name"]] = self._construct_output_example(
                    item["variable_type_detail"]
                )
            else:
                output_example[item["variable_name"]] = (
                    f"""type: {item['variable_type']}, description: {item['variable_description']}"""
                )
        return output_example

    def _to_dict(self, result):
        result["extras-use_history"] = self.use_history
        result["args"] = {
            "keys": self.input_keys,
            "type": "online",
            "source": self.source,
            "prompt": self.prompt,
            "stream": self.stream,
            "base_model": self.base_model,
        }
        if self.base_url != "":
            result["args"]["base_url"] = self.base_url
        if (
            not isinstance(self.buildin_history, list)
            or len(self.buildin_history) % 2 != 0
        ):
            raise ValueError(
                "buildin_history must be a list of lists, each containing a user message and an assistant message"
            )
        if len(self.buildin_history) > 0:
            result["args"]["history"] = self.buildin_history

        if self.token:
            result["args"]["token"] = self.token

        # set api_key + secret_key, 如果需要的话
        result["args"].update(
            self.get_model_apikey_by_id(self.get_data().get("payload__model_id"))
        )
        return result


class OnlineEmbeddingNode(BaseNode):
    embed_url: str
    source: str
    embed_model_name: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.embed_url = (self.get_data().get("payload__embed_url", "")).strip()
        self.source = self.get_data().get("payload__source")
        self.embed_model_name = self.get_data().get("payload__embed_model_name")

    def _to_dict(self, result):
        result["args"] = {
            "source": self.source,
            "embed_model_name": self.embed_model_name,
            "embed_url": self.embed_url,
        }
        # set api_key + secret_key, 如果需要的话
        result["args"].update(
            self.get_model_apikey_by_id(self.get_data().get("payload__model_id"))
        )
        return result


class SharedLLMNode(BaseNode):
    jobid: str
    token: str
    model: str
    prompt: str
    use_history: bool
    file_resource_id: str = None
    model_type: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.jobid = self.get_data().get("payload__jobid")
        self.token = self.get_data().get("payload__token")
        self.model = self.get_data().get("payload__model")
        self.prompt = self.get_data().get("payload__prompt")
        self.use_history = parse_to_bool(self.get_data().get("payload__use_history"))
        self.file_resource_id = self.get_file_resource_id()  # use_resource
        self.model_type = self.get_data().get("payload__model_type", "").lower()

        if self.jobid:
            self.model = self.jobid
        else:
            self.set_used_resources("llm", self.model)  # use_resource

        if self.file_resource_id:
            self.set_used_resources("file_resource_id", self.file_resource_id)

    def _to_dict(self, result):
        result["args"] = {"llm": self.model}

        if self.jobid:
            result["args"]["local"] = False
            result["args"]["token"] = self.token

        # 是否引用了历史作为上下文
        result["extras-use_history"] = self.use_history
        # 是否使用了 file_resource_id, 则添加该字段: 只有vqa, stt
        if self.file_resource_id:
            result["args"]["file_resource_id"] = self.file_resource_id

        return result


class DocumentNode(BaseNode):
    dataset_path: str
    embed: str
    create_ui: bool
    node_group: list

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.dataset_path = self.get_data().get("payload__dataset_path")
        self.embed = self.get_data().get("payload__embed")
        self.create_ui = self.get_data().get("payload__create_ui")
        self.node_group = self.get_data().get("payload__node_group", [])
        self.set_used_resources("embed", self.embed)

        # 目前的处理,只取第一个路径
        if isinstance(self.dataset_path, list) and len(self.dataset_path) > 0:
            self.dataset_path = self.dataset_path[0]
        # 修复node_group中的key-name关系
        if isinstance(self.node_group, list):
            for index, tempdata in enumerate(self.node_group):
                if "key" in tempdata:
                    self.node_group[index]["name"] = tempdata["key"]
                    del self.node_group[index]["key"]

                # 如果存在llm模型引用
                if (
                    "llm" in tempdata
                ):  # 仅存在于 tempdata.get("transform") == "LLMParser":
                    self.set_used_resources("llm", tempdata["llm"])

    def _to_dict(self, result):
        result["args"] = {
            "dataset_path": self.dataset_path,
            "embed": self.embed,
            "create_ui": self.create_ui,
            "node_group": self.node_group,
        }
        return result


class SqlManagerNode(BaseNode):
    source: str
    db_type: str
    user: str
    password: str
    host: str
    port: str
    db_name: str
    options_str: str
    tables_info_dict: dict

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.source = self.get_data().get("payload__source")
        self.tables_info_dict = self.get_data().get("payload__tables_info_dict")
        if self.source == "platform":
            database_id = self.get_data().get("payload__database_id")
            db_info = self.get_db_info(database_id=database_id)
            self.db_type = db_info.get("db_type")
            self.user = db_info.get("user")
            self.password = db_info.get("password")
            self.host = db_info.get("host")
            self.port = db_info.get("port")
            self.db_name = db_info.get("db_name")
            self.options_str = db_info.get("options_str")
        else:
            self.db_type = self.get_data().get("payload__db_type")
            self.user = self.get_data().get("payload__user")
            self.password = self.get_data().get("payload__password")
            self.host = self.get_data().get("payload__host")
            self.port = self.get_data().get("payload__port")
            self.db_name = self.get_data().get("payload__db_name")
            self.options_str = self.get_data().get("payload__options_str")

    def _to_dict(self, result):
        result["args"] = {
            "db_type": self.db_type,
            "user": self.user,
            "password": self.password,
            "host": self.host,
            "port": self.port,
            "db_name": self.db_name,
            "options_str": self.options_str,
            "tables_info_dict": self.tables_info_dict,
        }
        return result


class FileNode(BaseNode):
    def _to_dict(self, result):
        result["args"] = {
            "id": self.get_id(),
        }
        return result


class WebNode(BaseNode):
    title: str
    port: str
    history: list
    audio: bool
    kind: str = "web"

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.title = self.get_data().get("payload__title")
        self.port = self.get_data().get("payload__port")
        self.history = self.get_data().get("payload__history") or []
        self.audio = parse_to_bool(self.get_data().get("payload__audio"))

    def _to_dict(self, result):
        result["args"] = {
            "title": self.title,
            "port": self.port,
            "history": self.history,
            "audio": self.audio,
            "kind": self.kind,
        }
        return result


class ServerNode(BaseNode):
    port: str
    kind: str = "server"

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.port = self.get_data().get("payload__port")

    def _to_dict(self, result):
        result["args"] = {
            "port": self.port,
            "kind": self.kind,
        }
        return result


class SubgraphNode(BaseNode):
    app_id: str
    patent_graph: dict
    patent_data: dict

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.app_id = self.get_subgraph_id()
        self.patent_graph = self.get_data().get("config__patent_graph")
        if not self.patent_graph:
            from parts.app.model import Workflow

            sub_workflow = Workflow.default_getone(self.app_id, None)
            self.patent_graph = sub_workflow.flat_graph_dict
        self.patent_data = self.get_data().get("config__patent_data", {})

    def _to_dict(self, result):
        # 扩展字段
        result["extras-config__patent_data"] = self.patent_data
        from core.converter import Converter

        result["args"] = Converter(self.patent_graph).to_lazyllm(app_id=self.app_id)
        # 将template 类型改为subgraph (template是内部约定的,用以作为可编辑的app)
        if self.lower_type == "template":
            result["kind"] = "SubGraph"
        return result


class LoopNode(SubgraphNode):
    stop_condition: str
    stop_type: str

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.stop_condition = self.get_data().get("payload__stop_condition")
        self.stop_type = self.stop_condition["type"]

    def _to_dict(self, result):
        super()._to_dict(result)
        if self.stop_type == "count":
            result["args"]["count"] = self.stop_condition["max_count"]
        elif self.stop_type == "while":
            result["args"]["stop_condition"] = self._make_stop_condition_func(
                self.stop_condition["condition"]
            )
        else:
            raise ValueError(f"Invalid stop condition type: {self.stop_type}")
        return result

    def _get_input_index(self, input_name):
        for index, item in enumerate(self.get_data().get("config__input_shape", [])):
            if item["variable_name"] == input_name:
                return index, item["variable_type"]
        return None

    def _build_condition_ast(self, conditions):
        expr = None
        for item in conditions:
            idx, variable_type = self._get_input_index(item["variable_name"])
            left = ast.Subscript(
                value=ast.Name(id="x", ctx=ast.Load()),
                slice=ast.Index(value=ast.Constant(value=idx)),
                ctx=ast.Load(),
            )
            op = OP_MAP[item["operator"]]

            # 根据variable_type进行类型转换
            value = item["value"]
            try:
                if variable_type == "int":
                    value = int(value)
                elif variable_type == "float":
                    value = float(value)
                elif variable_type == "bool":
                    value = parse_to_bool(value)
                elif variable_type == "str":
                    value = str(value)
                else:
                    raise ValueError(f"不支持的变量类型: {variable_type}")
            except (ValueError, TypeError) as e:
                raise ValueError(
                    f"无法将值 '{value}' 转换为 {variable_type} 类型: {str(e)}"
                )
            right = ast.Constant(value=value)

            compare = ast.Compare(left=left, ops=[op], comparators=[right])

            if expr is None:
                expr = compare
            else:
                conj = item.get("conjunction", "and")
                if conj == "and":
                    expr = ast.BoolOp(op=ast.And(), values=[expr, compare])
                elif conj == "or":
                    expr = ast.BoolOp(op=ast.Or(), values=[expr, compare])
        return expr

    def _make_stop_condition_func(self, conditions):
        expr = self._build_condition_ast(conditions)
        if expr is None:
            return None
        func_def = ast.FunctionDef(
            name="stop_condition",
            args=ast.arguments(
                posonlyargs=[],
                args=[],
                vararg=ast.arg(arg="x"),
                kwonlyargs=[],
                kw_defaults=[],
                defaults=[],
            ),
            body=[ast.Return(value=expr)],
            decorator_list=[],
        )
        module = ast.Module(body=[func_def], type_ignores=[])
        ast.fix_missing_locations(module)
        return ast.unparse(func_def)


class EmptyNode(BaseNode):
    def to_dict(self):
        return {}


class WarpNode(SubgraphNode):
    batch_flags: list[bool]

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.batch_flags = self.get_data().get("payload__batch_flags")

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"]["batch_flags"] = self.batch_flags
        return result


class OCRNode(BaseNode):

    def __init__(self, nodedata):
        super().__init__(nodedata)

    def _to_dict(self, result):
        return result


class ReaderNode(BaseNode):

    def __init__(self, nodedata):
        super().__init__(nodedata)

    def _to_dict(self, result):
        return result


class ParameterExtractorNode(OnlinellmNode):
    base_model: str
    params: list  # 参数说明：[{"name": "year", "type": "int", "description": "年份","require"：true}]

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.params = self.get_data().get("payload__params", [])
        self.base_model = self.get_data().get("payload__base_model")

    def _to_dict(self, result):
        # 初始化四个空列表
        param: list[str] = []
        param_type: list[str] = []  # 使用 type_ 避免与内置关键字 type 冲突
        description: list[str] = []
        require: list[bool] = []

        # 遍历 params 列表，填充各个列表
        for item in self.params:
            param.append(item.get("name"))
            param_type.append(item.get("type"))
            description.append(item.get("description", ""))
            require.append(item.get("require", False))
        result["args"] = {
            "base_model": self.base_model,  # use_resource
            "param": param,
            "type": param_type,
            "description": description,
            "require": require,
        }
        self.set_used_resources("base_model", result["args"]["base_model"])
        return result

    def get_type(self):
        return "ParameterExtractor"


class QustionRewriteNode(OnlinellmNode):
    base_model: str
    out_type: str  # 参数说明：大模型输出要求，返回str、list
    rewrite_prompt: str  # 重写问题的提示词

    def __init__(self, nodedata):
        super().__init__(nodedata)
        self.rewrite_prompt = self.get_data().get("payload__prompt")
        self.out_type = (
            self.get_data().get("config__output_shape")[0].get("variable_type", None)
            if self.get_data().get("config__output_shape")
            else None
        )
        self.base_model = self.get_data().get("payload__base_model")

    def _to_dict(self, result):
        result["args"] = {
            "base_model": self.base_model,  # use_resource
            "rewrite_prompt": self.rewrite_prompt,
            "formatter": self.out_type,
        }
        self.set_used_resources("base_model", result["args"]["base_model"])
        return result

    def get_type(self):
        return "QustionRewrite"


lower_type_to_node_cls = {
    "start": EmptyNode,
    "end": EmptyNode,
    "answer": EmptyNode,
    "aggregator": EmptyNode,
    "__start__": EmptyNode,
    "__end__": EmptyNode,
    "stt": LocalModelNode,
    "vqa": LocalVQANode,
    "sd": LocalModelNode,
    "tts": LocalTTSNode,
    "localembedding": LocalModelNode,
    "sqlcall": SqlCallNode,
    "toolsforllm": ToolsForLLMNode,
    "functioncall": FunctionCallNode,
    "reranker": RerankerNode,
    "retriever": RetrieverNode,
    "subgraph": SubgraphNode,
    "warp": WarpNode,
    "loop": LoopNode,
    "app": SubgraphNode,
    "template": SubgraphNode,
    "ifs": IFSNode,
    "switch": SwitchNode,
    "intention": IntentionNode,
    "code": CodeNode,
    "http": HttpNode,
    "httptool": HttpToolNode,
    "formatter": FormatterNode,
    "joinformatter": JoinFormatterNode,
    "onlinellm": OnlinellmNode,
    "onlineembedding": OnlineEmbeddingNode,
    "sharedllm": SharedLLMNode,
    "document": DocumentNode,
    "sqlmanager": SqlManagerNode,
    "file": FileNode,
    "web": WebNode,
    "server": ServerNode,
    "parameterextractor": ParameterExtractorNode,
    "qustionrewrite": QustionRewriteNode,
    "ocr": OCRNode,
    "reader": ReaderNode,
}


def create_node(nodedata):
    lower_type = (
        nodedata.get("data", {}).get("payload__kind")
        or nodedata.get("data", {}).get("type")
        or ""
    ).lower()
    node_cls = lower_type_to_node_cls.get(lower_type)
    if node_cls:
        return node_cls(nodedata)
    else:
        raise ValueError(f"Invalid node type: {lower_type}")
