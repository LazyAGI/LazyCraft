# Copyright (c) 2025 SenseTime. All Rights Reserved.
# Author: LazyLLM Team,  https://github.com/LazyAGI/LazyLLM
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

import ast
import copy
import logging
import re
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm.exc import NoResultFound

from parts.mcp.model import McpTool
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
    if isinstance(s, str):
        return s.lower() in ["true", "yes"]
    return bool(s)


def parse_newline(s):
    s = s or ""
    return (
        s.replace("\\n", "\n")
        .replace("\\r", "\r")
        .replace("\\t", "\t")
        .replace("\\f", "\f")
        .replace("\\v", "\v")
        .replace("\\0", "\0")
    )


def track_new_attrs(func):
    def wrapper(self, *args, **kwargs):
        if not hasattr(self, "_attr_tracking_stack"):
            self._attr_tracking_stack = []

        self._attr_tracking_stack.append(set(self.__dict__.keys()))
        result = func(self, *args, **kwargs)
        before_attrs = self._attr_tracking_stack.pop()

        # 嵌套调用时，合并字段
        new_attrs = set(self.__dict__.keys()) - before_attrs
        if not hasattr(self, "_custom_fields"):
            self._custom_fields = []

        self._custom_fields.extend(
            attr for attr in new_attrs if attr not in self._custom_fields
        )
        return result

    return wrapper


@dataclass
class BaseRunContext:
    id_map_basenode: dict[str, "BaseNode"] = field(default_factory=dict)


class BaseNode:
    id: str
    kind: str
    name: str
    hyperparameter: dict = {}
    extras_enable_backflow: bool
    extras_title: str

    def __init__(self, nodedata: dict[str, Any], context: BaseRunContext):
        self.nodedata = nodedata
        self._run_context = context
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

    @property
    def run_context(self) -> BaseRunContext:
        return self._run_context

    def _confid_node(self):
        input_ports = self.get_data().get("config__input_ports", [])
        self.input_ports = [d["id"] for d in input_ports]

        # 检查输入参数的类型中，是否有常量模式
        # 原代码仅支持单个常数，现在改为多个常数，可能造成其他问题
        config__input_shape = self.get_data().get("config__input_shape") or []

        # print(f"=================== config__input_shape is {config__input_shape}")

        for index, data in enumerate(config__input_shape):
            if data.get("variable_mode") == "mode-const":
                if data.get("variable_type") != "file":
                    variable_value = data.get("variable_const")
                    self.constant_edges.append(
                        {"constant": variable_value, "index": index}
                    )

    def set_input_ports(self, targetHandle, source_id, target_id):
        if targetHandle in self.input_ports:
            index = self.input_ports.index(targetHandle)
            self.input_ports[index] = (source_id, target_id)

    @classmethod
    def check_type_is_fork_type(cls, _type):
        return _type.lower() in ["ifs", "switch", "intention"]

    @classmethod
    def check_type_is_local_model_type(cls, _type):
        return _type.lower() in ("stt", "vqa", "sd", "tts", "localembedding")

    @classmethod
    def check_type_is_subgraph_type(cls, _type):
        """子画布一类
        其中 template 是 app 类型的特殊处理, template可编辑, app不可编辑,
        在传入 lazyllm 时, 需要将 template 换为 subgraph, 区别为app 的可复用性.
        """
        return _type.lower() in ("subgraph", "warp", "loop", "app", "template")

    def is_fork_type(self):
        return self.__class__.check_type_is_fork_type(self.lower_type)

    def is_aggregator_type(self):
        return self.lower_type in ["aggregator"]

    def is_start_type(self):
        return self.lower_type in ["start", "__start__"]

    def is_end_type(self):
        return self.lower_type in ["end", "__end__", "answer"]

    def is_local_model_type(self):
        return self.__class__.check_type_is_local_model_type(self.lower_type)

    def is_subgraph_type(self):
        return self.__class__.check_type_is_subgraph_type(self.lower_type)

    def get_subgraph_id(self):
        """获取子画布的ID, 子画布可以视为App"""
        return self.get_data().get("payload__patent_id")

    def get_data(self):
        return self.nodedata.get("data", {})

    def get_id(self):
        return self.nodedata.get("id")

    def get_type(self):
        _type = self.get_data().get("payload__kind")
        if _type is None:
            _type = self.get_data().get("type")
        return _type or ""

    def get_input_names(self):
        """
        {"config__input_shape":
            [
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
            ], }
        """
        config__input_shape = self.get_data().get("config__input_shape") or []
        return [d.get("variable_name") for d in config__input_shape]

    def get_file_resource_id(self):
        """
        {"config__input_shape":
            [
                {
                    "id": "6bf5f6fb-ac00-4a66-ba75-55ec6cdb4dc7",
                    "variable_type": "file",
                    "variable_mode": "mode-line"
                    "variable_name": "aaa",
                },
                {
                    "id": "312e35a5-f562-4d25-87c3-7f4608aa41bc",
                    "variable_type": "file",
                    "variable_mode": "mode-const",
                    "variable_const": "3bf56fbc-35af-4229-b109-3e62df9b5e38",
                    "variable_name": "bbb"
                }
            ], }
        """
        config__input_shape = self.get_data().get("config__input_shape") or []
        for data in config__input_shape:
            if data.get("variable_type") == "file":
                if data.get("variable_mode") == "mode-const":
                    return data.get("variable_const") or None

    def set_used_resources(self, key, str_or_list):
        if key in self.used_resources:
            if isinstance(str_or_list, str):
                self.used_resources[key].append(str_or_list)
            else:
                self.used_resources[key].extend(str_or_list)
        else:
            if isinstance(str_or_list, str):
                self.used_resources[key] = [str_or_list]
            else:
                self.used_resources[key] = str_or_list

    def get_used_resources(self):
        all_nodes = self.get_children_descendants() + [self]

        resource_ids = set()
        for node in all_nodes:
            for val in getattr(node, "used_resources", {}).values():
                if isinstance(val, (list, tuple)):
                    resource_ids.update(val)
                else:
                    resource_ids.add(val)

        res_list = []
        for resource_id in resource_ids:
            res_node = self.run_context.id_map_basenode.get(resource_id, None)
            if not res_node:
                continue

            res_list.append(res_node.to_dict())
            sub_resources = res_node.get_used_resources()
            res_list.extend(sub_resources)

        res_id_list = {
            res["id"]
            for res in res_list
            if res["id"] in self.run_context.id_map_basenode
        }
        return [
            self.run_context.id_map_basenode.get(id).to_dict() for id in res_id_list
        ]

    @classmethod
    def get_used_resources_by_nodes(cls, node_list: list["BaseNode"]):
        out_nodes = []
        for node in node_list:
            out_nodes.extend(node.get_used_resources())
        return out_nodes

    def set_used_refer(self, _type, _id):
        """设置使用到的引用对象的ID"""
        if _type == "app":
            self.refer_app_ids.append(_id)
        elif _type == "model":
            self.refer_model_ids.append(_id)
        else:
            raise ValueError(f"未被识别的引用类型: {_type}")

    def get_used_refer(self, _type):
        """获取使用到的引用对象的ID"""
        if _type == "app":
            return self.refer_app_ids
        elif _type == "model":
            return self.refer_model_ids
        else:
            raise ValueError(f"未被识别的引用类型: {_type}")

    def get_model_apikey_by_id(self, online_id):
        from parts.models_hub.service import ModelService

        self.set_used_refer("model", online_id)
        return ModelService.get_model_apikey_by_id(online_id) if online_id else {}

    def get_model_apikey_by_name(self, model_name):
        from parts.models_hub.service import ModelService

        online_id = ModelService.get_model_id_by_name(model_name)
        if not online_id:
            return {}

        return self.get_model_apikey_by_id(online_id)

    def get_db_info(self, database_id):
        from parts.db_manage.service import DBManageService

        return DBManageService.get_builtin_database_info(database_id=database_id)

    def get_input_caseid(self, target_id):
        if not hasattr(self, "fork_map_casedict"):
            raise ValueError("错误的处理了非分支节点")
        """ 获取节点的输入端链接的是什么case """
        for case_id, edgedata in self.fork_map_casedict.items():
            if edgedata["target"] == target_id:
                return case_id
        return None

    def get_fork_caseid_list(self):
        """fork节点下所有可能的caseid
        return ["false", "true", "case1", "case2", ...]
        """
        ret_list = []
        for casedata in self.get_data().get("config__output_ports", []):
            ret_list.append(casedata["id"])
        return ret_list

    def get_fork_casedata_by_caseid(self, case_id):
        """获取fork节点中的config__output_ports
        return {"id": "xxx", "label": "CASE 1", "cond": "1", "chosen": false, "selected": false}
        """
        for casedata in self.get_data().get("config__output_ports", []):
            if casedata["id"] == case_id:
                return casedata
        return None

    def get_children(self):
        return []

    def get_children_descendants(self):
        all_descendants = []

        def collect(node: BaseNode):
            if hasattr(node, "get_children") and node.get_children():
                for child in node.get_children():
                    all_descendants.append(child)
                    collect(child)

        for child in self.get_children():
            all_descendants.append(child)
            collect(child)

        return all_descendants

    def _to_dict(self, result):
        if hasattr(self, "_custom_fields"):
            for custom_field in self._custom_fields:
                result["args"][custom_field] = getattr(self, custom_field)
        return result

    def to_dict(self):
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.fork_map_casedict = {}
        for casedata in self.get_data().get("config__output_ports", []):
            self.fork_map_casedict[casedata["id"]] = None  # 后续填充为edge信息

    def set_fork_map_casedict(self, casedata):
        self.fork_map_casedict[casedata["sourceHandle"]] = casedata


class IFSNode(ForkNode):
    judge_on_full_input: bool
    cond: str
    true: list[BaseNode]
    false: list[BaseNode]

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.judge_on_full_input = self.get_data().get("payload__judge_on_full_input")
        self.cond = self.get_data().get("config__output_ports", [])[0].get("cond")
        self.true: list[BaseNode] = []
        self.false: list[BaseNode] = []

    def _to_dict(self, result):
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

    def get_children(self):
        return self.true + self.false


class SwitchNode(ForkNode):
    judge_on_full_input: bool
    nodes: dict[str, list[BaseNode]]

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.judge_on_full_input = self.get_data().get("payload__judge_on_full_input")
        if self.judge_on_full_input is None:
            self.judge_on_full_input = True
        self.nodes = {}
        self.conversion = self.get_data().get("payload__code")

    def _to_dict(self, result):
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
            "conversion": self.conversion,
        }
        return result

    def get_children(self):
        return [child for child_list in self.nodes.values() for child in child_list]


class CodeNode(BaseNode):
    code: str

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.code = self.get_data().get("payload__code")

    def _to_dict(self, result):
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.doc = self.get_data().get("payload__doc")
        self.group_name = self.get_data().get("payload__group_name")
        self.similarity = self.get_data().get("payload__similarity")
        self.topk = self.get_data().get("payload__topk")
        self.target = self.get_data().get("payload__target")
        self.output_format = self.get_data().get("payload__output_format")
        self.join = parse_to_bool(self.get_data().get("payload__join"))
        self.set_used_resources("doc", self.doc)

    def _to_dict(self, result):
        doc_node: DocumentNode = self.run_context.id_map_basenode[self.doc]
        if self.group_name in doc_node.get_group_name_key_map():
            self.group_name = doc_node.get_group_name_key_map()[self.group_name]

        if self.target in doc_node.get_group_name_key_map():
            self.target = doc_node.get_group_name_key_map()[self.target]

        merge_groups = doc_node.get_merge_groups()
        if merge_groups.get(self.group_name):
            self.similarity = "cosine"
        else:
            self.similarity = "bm25"

        result["args"] = {
            "doc": self.doc,  # use_resource
            "group_name": self.group_name,
            "similarity": self.similarity,
            "topk": self.topk,
            "target": self.target or None,
            "output_format": (
                self.output_format if self.output_format != "node" else None
            ),
            "join": self.join,
        }
        return result


class HttpNode(BaseNode):
    method: str
    url: str
    api_key: str
    headers: dict
    params: dict
    body: dict

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.method = self.get_data().get("payload__method")
        self.url = self._replace_keys(self.get_data().get("payload__url"))
        self.api_key = self.get_data().get("payload__api_key")
        self.headers = self._dict_replace_keys(
            self.get_data().get("payload__headers", {})
        )
        self.params = self._dict_replace_keys(
            self.get_data().get("payload__params", {})
        )
        self.body = (
            self._replace_keys(
                self.get_data().get("payload__body"), left_delim="${", right_delim="$}"
            )
            if self.get_data().get("payload__body")
            else None
        )

    def _replace_keys(self, target_str, left_delim="{", right_delim="}"):
        """替换目标字符串中被定制符号包裹的key"""
        if not isinstance(target_str, str):
            return target_str

        space_pattern = r"[ ]*"
        input_shape = self.get_data().get("config__input_shape") or []
        input_keys = [data.get("variable_name") for data in input_shape]
        for key in input_keys:
            pattern = rf"{re.escape(left_delim)}{space_pattern}{re.escape(key)}{space_pattern}{re.escape(right_delim)}"
            target_str = re.sub(pattern, rf"{{{{{key}}}}}", target_str)

        return target_str

    def _dict_replace_keys(self, target, left_delim="{", right_delim="}"):
        if not isinstance(target, dict):
            return target

        for key, target_str in target.items():
            target[key] = self._replace_keys(target_str, left_delim, right_delim)

        return target

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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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


class DocumentNode(BaseNode):
    dataset_path: str
    # embed: str
    create_ui: bool
    node_group: list
    activated_groups: list

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

        self.dataset_path = self.get_data().get("payload__dataset_path")
        if isinstance(self.dataset_path, list) and len(self.dataset_path) > 0:
            self.dataset_path = self.dataset_path[0]

        self.create_ui = self.get_data().get("payload__create_ui")
        self._deal_node_group()

    def _deal_node_group(self):
        from parts.app.node_run.node_infer import (EmbeddingResource,
                                                   InferNode, LLMResource)

        self.group_name_key_map = {}

        self.activated_groups_resource = self.get_data().get(
            "payload__activated_groups", []
        )
        self.activated_groups = []
        for group_data in self.activated_groups_resource:
            if "embed" in group_data and InferNode.is_infer_node(group_data["embed"]):
                embed_data = {
                    "id": str(uuid.uuid4()),
                    "data": group_data["embed"],
                }
                self.run_context.id_map_basenode[embed_data["id"]] = EmbeddingResource(
                    embed_data, self.run_context
                )
                self.activated_groups.append([group_data["name"], embed_data["id"]])
                self.set_used_resources("embed", embed_data["id"])
            else:
                self.activated_groups.append([group_data["name"], None])

        self.node_group_resource = self.get_data().get("payload__node_group", [])
        self.node_group = []

        for node_data in self.node_group_resource:
            new_data = copy.deepcopy(node_data)
            if (
                "embed" in node_data
                and node_data["embed"] is not None
                and InferNode.is_infer_node(node_data["embed"])
            ):
                embed_data = {
                    "id": str(uuid.uuid4()),
                    "data": node_data["embed"],
                }
                self.run_context.id_map_basenode[embed_data["id"]] = EmbeddingResource(
                    embed_data, self.run_context
                )
                self.set_used_resources("embed", embed_data["id"])
                new_data["embed"] = embed_data["id"]
                print(f"DocumentNode embed: {new_data}")
            else:
                new_data["embed"] = None

            if "llm" in node_data and InferNode.is_infer_node(node_data["llm"]):
                llm_data = {
                    "id": str(uuid.uuid4()),
                    "data": node_data["llm"],
                }
                self.run_context.id_map_basenode[llm_data["id"]] = LLMResource(
                    llm_data, self.run_context
                )
                self.set_used_resources("llm", llm_data["id"])
                new_data["llm"] = llm_data["id"]

            new_data.pop("embed_name", None)
            new_data.pop("enable_embed", None)
            self.group_name_key_map[new_data["name"]] = new_data["key"]
            new_data["name"] = new_data["key"]
            new_data.pop("key")

            self.node_group.append(new_data)

    def get_merge_groups(self):
        merge_groups = {}
        for group in self.activated_groups:
            if group[1] is not None:
                merge_groups[group[0]] = group[1]
        for group in self.node_group:
            if group["embed"]:
                merge_groups[group["name"]] = group["embed"]
        return merge_groups

    def get_group_name_key_map(self):
        return self.group_name_key_map

    def _to_dict(self, result):
        result["args"] = {
            "dataset_path": self.dataset_path,
            "create_ui": self.create_ui,
            "node_group": self.node_group,
            "activated_groups": self.activated_groups,
        }

        print(f"DocumentNode result: {result}")
        print(f"DocumentNode resources: {self.get_used_resources()}")
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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

    def _validate_db_params(self) -> None:
        """校验数据库连接参数，确保不会通过连接 URL 携带多余命令或进行URL注入。

        由于这些参数会被直接拼接到数据库连接URL中，需要校验：
        1. 禁止SQL注入相关的字符（分号、换行、注释符等）
        2. 禁止URL中的特殊字符，防止URL注入
        """
        # SQL注入相关的禁止字符
        sql_forbidden_tokens = [";", "\n", "\r", "--", "/*", "*/"]
        
        # URL特殊字符（用于URL注入防护）
        # 注意：host可能包含IPv6地址（如[::1]），需要特殊处理
        url_forbidden_for_user = ["@", ":", "/", "?", "#"]
        url_forbidden_for_host = ["@", "/", "?", "#"]  # 允许:和[]（IPv6）
        url_forbidden_for_db_name = ["/", "?", "#"]
        url_forbidden_for_options = ["#"]  # options_str是查询字符串，允许&和=

        def _check_sql_injection(name: str, value: str) -> None:
            """检查SQL注入相关的字符"""
            if value is None:
                return
            s = str(value)
            for token in sql_forbidden_tokens:
                if token in s:
                    raise ValueError(f"非法数据库连接参数 {name} 中包含非法字符: {token}")

        def _check_url_special_chars(name: str, value: str, forbidden_chars: list) -> None:
            """检查URL特殊字符"""
            if value is None:
                return
            s = str(value)
            for char in forbidden_chars:
                if char in s:
                    raise ValueError(f"非法数据库连接参数 {name} 中包含URL特殊字符: {char}")

        # 校验所有字段的SQL注入风险
        _check_sql_injection("user", self.user)
        _check_sql_injection("host", self.host)
        _check_sql_injection("db_name", self.db_name)
        _check_sql_injection("options_str", self.options_str)

        # 校验URL特殊字符（防止URL注入）
        _check_url_special_chars("user", self.user, url_forbidden_for_user)
        _check_url_special_chars("host", self.host, url_forbidden_for_host)
        _check_url_special_chars("db_name", self.db_name, url_forbidden_for_db_name)
        _check_url_special_chars("options_str", self.options_str, url_forbidden_for_options)

        # 端口必须是数字
        if self.port is not None:
            port_str = str(self.port)
            if not port_str.isdigit():
                raise ValueError("非法数据库连接参数 port 必须为数字")
            port_num = int(port_str)
            if port_num < 1 or port_num > 65535:
                raise ValueError("非法数据库连接参数 port 必须在1-65535范围内")

    def _to_dict(self, result):
        # 在序列化前再次校验，确保数据安全
        self._validate_db_params()
        
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
    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.app_id = self.get_subgraph_id()
        self.patent_graph = self.get_data().get("config__patent_graph")
        if not self.patent_graph:
            from parts.app.model import Workflow

            sub_workflow = Workflow.default_getone(self.app_id, None)
            self.patent_graph = sub_workflow.flat_graph_dict
        self.patent_data = self.get_data().get("config__patent_data", {})
        self._create_sub_graph()

    def _create_sub_graph(self):
        from parts.app.node_run.lazy_converter import LazyConverter

        self.converter = LazyConverter(self.patent_graph)
        result = self.converter.full_node_graph(app_id=self.app_id)
        self.run_context.id_map_basenode.update(self.converter.id_map_basenode)

        self._nodes: list[BaseNode] = result["nodes"]
        self._edges: list[dict] = result["edges"]
        self._resources = result["resources"]

    def _to_dict(self, result):
        # 扩展字段
        result["extras-config__patent_data"] = self.patent_data

        result["args"] = {
            "nodes": self._nodes,
            "edges": self._edges,
            "resources": self._resources,
        }
        # 将template 类型改为subgraph (template是内部约定的,用以作为可编辑的app)
        if self.lower_type == "template":
            result["kind"] = "SubGraph"
        return result

    def get_children(self):
        return self._nodes


class LoopNode(SubgraphNode):
    stop_condition: str
    count: int
    stop_type: str
    stop_condition_code: str

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.stop_condition = self.get_data().get("payload__stop_condition")
        self.stop_type = self.stop_condition["type"]
        if self.stop_type == "count":
            self.count = self.stop_condition["max_count"]
        elif self.stop_type == "while":
            self.stop_condition_code = self._make_stop_condition_func(
                self.stop_condition["condition"]
            )
        else:
            raise ValueError(f"Invalid stop condition type: {self.stop_type}")

    def _to_dict(self, result):
        super()._to_dict(result)
        if self.stop_type == "while":
            result["args"]["stop_condition"] = self.stop_condition_code
        elif self.stop_type == "count":
            result["args"]["count"] = self.count
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
                else:
                    raise ValueError(f"不支持的连接符: {conj}")
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
    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

    def to_dict(self):
        return {}


class WarpNode(SubgraphNode):
    batch_flags: list[bool]

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.batch_flags = self.get_data().get("payload__batch_flags")

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"]["batch_flags"] = self.batch_flags
        return result


class ReaderNode(BaseNode):
    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

    def _to_dict(self, result):
        return result


class ToolsForLLMNode(BaseNode):
    tools: list

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.tools = self.get_data().get("payload__tools", [])
        self.set_used_resources("tools", self.tools)

    def _to_dict(self, result):
        result["args"] = {
            "tools": self.tools,
        }
        return result


class McpToolNode(BaseNode):
    mcp_tool_id: int  # 从前端获取，mcp server中的一个工具
    mcp_server_id: int  # 从前端获取，mcp server
    command_or_url: str
    tool_name: str
    args: list[str]
    env: dict[str, str]
    headers: dict[str, str]
    timeout: int

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.mcp_tool_id = self.get_data().get("payload__mcp_tool_id")
        self.mcp_server_id = self.get_data().get("payload__mcp_server_id")

        try:
            mcp_tool = McpTool.query.get(self.mcp_tool_id)
            if not mcp_tool:
                logging.error(f"没有找到MCP工具: {self.mcp_tool_id}")
                raise ValueError("没有找到MCP工具")
        except NoResultFound:
            logging.error(f"没有找到MCP工具: {self.mcp_tool_id}")
            raise ValueError("没有找到MCP工具")
        if mcp_tool.mcp_server_id != int(self.mcp_server_id):
            logging.error(
                f"MCP工具和MCP服务不匹配: {self.mcp_tool_id} vs {self.mcp_server_id}"
            )
            raise ValueError("MCP工具和MCP服务不匹配")
        mcp_server = mcp_tool.mcp_server
        if not mcp_server:
            logging.error(f"没有找到MCP服务: {self.mcp_server_id}")
            raise ValueError("没有找到MCP服务")

        if not mcp_server.enable:
            logging.error("MCP服务未启动")
            raise ValueError("MCP服务未启动")

        self.timeout = mcp_server.timeout or 30  # 默认超时时间
        self.tool_name = mcp_tool.name
        if mcp_server.transport_type == "STDIO":
            self.command_or_url = mcp_server.stdio_command
            self.env = mcp_server.stdio_env or {}
            if mcp_server.stdio_arguments:
                self.args = [
                    word for word in mcp_server.stdio_arguments.split(" ") if word
                ]
        elif mcp_server.transport_type == "SSE":
            self.command_or_url = mcp_server.http_url
            self.headers = mcp_server.headers or {}
        else:
            logging.error(f"不支持的MCP服务传输类型: {mcp_server.transport_type}")
            raise ValueError(f"不支持的MCP服务传输类型: {mcp_server.transport_type}")

    def _to_dict(self, result):
        result["args"] = {
            "command_or_url": self.command_or_url,
            "tool_name": self.tool_name,
            "args": self.args if hasattr(self, "args") else [],
            "env": self.env if hasattr(self, "env") else {},
            "headers": self.headers if hasattr(self, "headers") else {},
            "timeout": self.timeout,
        }
        return result
