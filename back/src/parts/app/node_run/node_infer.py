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


from .node_base import BaseNode, copy, parse_to_bool, track_new_attrs


class InferNode(BaseNode):
    """推理节点基类。

    提供在线模型和本地推理服务的统一接口。
    """

    def __init__(self, nodedata, context):
        """初始化推理节点。

        Args:
            nodedata (dict): 节点数据
            context: 运行上下文

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        super().__init__(nodedata, context)
        self._to_infer_data()

    @track_new_attrs
    def _to_infer_data(self):
        """转换为推理数据。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当转换失败时抛出
        """
        model_source = self.get_data().get("payload__model_source", "online_model")
        if model_source == "online_model":
            self._to_online_infer_data()
        elif model_source == "inference_service":
            self._to_local_infer_data()

    def _to_local_infer_data(self):
        """转换为本地推理数据。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当转换失败时抛出
        """
        self.base_model = self.get_data().get("payload__base_model")
        self.deploy_method = self.get_data().get("payload__deploy_method", "auto")
        self.url = self.get_data().get("payload__url", False)
        self.type = "local"

        if "暂无数据" in [self.base_model, self.deploy_method, self.url]:
            self.base_model = "internlm2_5-7b-chat"
            self.deploy_method = "Mindie"
            self.url = "https://maas.sensecore.dev/generate"

    def _to_online_infer_data(self):
        """转换为在线推理数据。

        Returns:
            None: 无返回值

        Raises:
            ValueError: 当API key缺失时抛出
        """
        if len((self.get_data().get("payload__base_url", "")).strip()) > 0:
            self.base_url = (self.get_data().get("payload__base_url", "")).strip()

        self.base_model = self.get_data().get("payload__base_model")
        self.source = self.get_data().get("payload__source")
        try:
            key_dict = self.get_model_apikey_by_id(
                self.get_data().get("payload__model_id")
            )
        except Exception as e:
            # 如果出现异常，尝试使用模型名称查找模型
            key_dict = self.get_model_apikey_by_name(self.base_model)

        if not key_dict:
            # 如果没有通过ID找到模型，尝试使用模型名称查找模型
            key_dict = self.get_model_apikey_by_name(self.base_model)

        api_key = key_dict.get("api_key", "")
        secret_key = key_dict.get("secret_key", "")
        if api_key:
            self.api_key = api_key
        else:
            raise ValueError("API key is required for online inference.")
        if secret_key:
            self.api_key = f"{api_key}:{secret_key}"
        self.type = "online"

    @classmethod
    def is_infer_node(cls, node_type: dict):
        """检查是否为推理节点。

        Args:
            node_type (dict): 节点类型数据

        Returns:
            bool: 是否为推理节点

        Raises:
            Exception: 当检查失败时抛出
        """
        source = node_type.get("payload__model_source", "")
        return source == "online_model" or source == "inference_service"


class LLMNode(InferNode):
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

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.use_history = parse_to_bool(self.get_data().get("payload__use_history"))
        self.prompt = copy.deepcopy(self.get_data().get("payload__prompt"))
        self.buildin_history = self.get_data().get("payload__example_dialogs", [])
        self.stream = parse_to_bool(self.get_data().get("payload__stream"))

        generate_control = self.get_data().get("payload__model_generate_control", {})
        self.temperature = generate_control.get("payload__temperature", 0.8)
        self.top_p = generate_control.get("payload__top_p", 0.7)
        self.max_tokens = generate_control.get("payload__max_tokens", 4096)
        self.hyperparameter = {
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_tokens": self.max_tokens,
        }
        input_shape = self.get_data().get("config__input_shape") or []
        self.input_keys = [data.get("variable_name") for data in input_shape]

        self.jobid = self.get_data().get("payload__jobid")
        # if self.jobid:
        #     self.token = self.get_data().get("payload__token")
        self.model_source = self.get_data().get("payload__source")

    def get_type(self):
        return "LLM"

    def _construct_output_example(self, output_shape):
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
        result = super()._to_dict(result)

        result["extras-use_history"] = self.use_history
        result["args"].update(
            {
                "keys": self.input_keys,
                "prompt": self.prompt,
                "stream": self.stream,
            }
        )

        if self.get_data().get("payload__model_source", "") == "online_model":
            result["args"]["static_params"] = {
                "temperature": self.temperature,
                "top_p": self.top_p,
            }

            if self.get_data().get("payload__deploy_method", "") in [
                "LMDeploy",
                "Lightllm",
            ]:
                result["args"]["static_params"]["max_new_tokens"] = self.max_tokens
            else:
                result["args"]["static_params"]["max_tokens"] = self.max_tokens

        assert (
            isinstance(self.buildin_history, list)
            and len(self.buildin_history) % 2 == 0
        ), "buildin_history must be a list of lists, each containing a user message and an assistant message"
        if len(self.buildin_history) > 0:
            result["args"]["history"] = self.buildin_history

        if self.token:
            result["args"]["token"] = self.token

        return result


class EmbeddingResource(InferNode):
    """嵌入资源节点。

    用于处理文本嵌入相关的推理任务。
    """

    def __init__(self, nodedata, context):
        """初始化嵌入资源节点。

        Args:
            nodedata (dict): 节点数据
            context: 运行上下文

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        super().__init__(nodedata, context)

    def get_type(self):
        """获取节点类型。

        Returns:
            str: 节点类型标识

        Raises:
            Exception: 当获取失败时抛出
        """
        return "Embedding"


class RerankerResource(InferNode):
    """重排序资源节点。

    用于处理文本重排序相关的推理任务。
    """

    def __init__(self, nodedata, context):
        """初始化重排序资源节点。

        Args:
            nodedata (dict): 节点数据
            context: 运行上下文

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        super().__init__(nodedata, context)

    def get_type(self):
        """获取节点类型。

        Returns:
            str: 节点类型标识

        Raises:
            Exception: 当获取失败时抛出
        """
        return "OnlineEmbedding"

    def _to_dict(self, result):
        """转换为字典格式。

        Args:
            result (dict): 基础结果字典

        Returns:
            dict: 转换后的字典

        Raises:
            Exception: 当转换失败时抛出
        """
        result = super()._to_dict(result)
        result["args"] = {
            "source": self.source,
            "embed_type": "rerank",
            "base_model": self.base_model,
            "api_key": self.api_key,
        }
        if hasattr(self, "base_url"):
            result["args"].update({"base_url": self.base_url})
        return result


class LLMResource(InferNode):
    """LLM资源节点。

    用于处理大语言模型相关的推理任务。
    """

    def __init__(self, nodedata, context):
        """初始化LLM资源节点。

        Args:
            nodedata (dict): 节点数据
            context: 运行上下文

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        super().__init__(nodedata, context)

    def get_type(self):
        """获取节点类型。

        Returns:
            str: 节点类型标识

        Raises:
            Exception: 当获取失败时抛出
        """
        return "LLM"

    def _to_dict(self, result):
        """转换为字典格式。

        Args:
            result (dict): 基础结果字典

        Returns:
            dict: 转换后的字典

        Raises:
            Exception: 当转换失败时抛出
        """
        result = super()._to_dict(result)
        return result


class SimpleNodeWithLLM(BaseNode):
    """简单LLM节点。

    提供LLM功能的简单节点实现。
    """

    def __init__(self, nodedata, context):
        """初始化简单LLM节点。

        Args:
            nodedata (dict): 节点数据
            context: 运行上下文

        Returns:
            None: 无返回值

        Raises:
            Exception: 当初始化失败时抛出
        """
        super().__init__(nodedata, context)
        self._prepare_llm_resource()

    def _prepare_llm_resource(self):
        """准备LLM资源。

        Returns:
            None: 无返回值

        Raises:
            Exception: 当准备失败时抛出
        """
        temp_data = copy.deepcopy(self.nodedata)

        import uuid

        self.model_id = str(uuid.uuid4())
        temp_data.update({"id": self.model_id})

        self.run_context.id_map_basenode[self.model_id] = LLMNode(
            temp_data, self.run_context
        )
        self.set_used_resources("llm", self.model_id)


class RerankerNode(BaseNode):
    type: str
    target: str
    output_format: str
    join: bool
    arguments: dict

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.type = self.get_data().get("payload__type")
        self.target = self.get_data().get("payload__target")
        self.output_format = self.get_data().get("payload__output_format")
        self.join = parse_to_bool(self.get_data().get("payload__join"))
        self.arguments = self.get_data().get("payload__arguments")
        self._deal_arguments_data(nodedata)

    def _deal_arguments_data(self, nodedata):
        model_source = self.arguments.get("model_source", "online_model")

        if (
            model_source == "online_model"
            and self.arguments
            and "model" in self.arguments
        ):
            self.arguments["model"] = RerankerResource(
                nodedata, self.run_context
            ).to_dict()
        elif (
            model_source == "inference_service"
            and self.arguments
            and "model" in self.arguments
        ):
            self.arguments["model"] = self.get_data().get("payload__base_model")
            self.arguments["url"] = self.get_data().get("payload__url")

        if self.type == "KeywordFilter":
            self.arguments["language"] = "zh"

    def _to_dict(self, result):
        result["args"] = {
            "type": self.type,
            "target": self.target or None,
            "output_format": (
                self.output_format if self.output_format != "node" else None
            ),
            "join": self.join,
            "arguments": self.arguments,
        }
        return result


class TTSNode(InferNode):
    """
    本地TTS模型, 文字转语音
    """

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"]["target_dir"] = "/app/upload/tts"
        return result


class VQANode(InferNode):
    """
    图文理解
    """

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self._deal_args()

    @track_new_attrs
    def _deal_args(self):
        self.prompt = self.get_data().get("payload__prompt")
        file_resource_id = self.get_file_resource_id()  # use_resource
        if file_resource_id:
            self.file_resource_id = file_resource_id
            self.set_used_resources("file_resource_id", self.file_resource_id)


class STTNode(InferNode):
    """
    本地STT模型, 语音转文字
    """

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self._deal_args()

    @track_new_attrs
    def _deal_args(self):
        file_resource_id = self.get_file_resource_id()  # use_resource
        if file_resource_id:
            self.file_resource_id = file_resource_id
            self.set_used_resources("file_resource_id", self.file_resource_id)


class SDNode(InferNode):
    """
    本地SD模型, 图片生成
    """

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"]["target_dir"] = "/app/upload/sd"
        return result


class ParameterExtractorNode(SimpleNodeWithLLM):
    params: list  # 参数说明：[{"name": "year", "type": "int", "description": "年份","require"：true}]

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.params = self.get_data().get("payload__params", [])

    def _to_dict(self, result):
        result = super()._to_dict(result)

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
            "base_model": self.model_id,
            "param": param,
            "type": param_type,
            "description": description,
            "require": require,
        }
        return result

    def get_type(self):
        return "ParameterExtractor"


class QustionRewriteNode(SimpleNodeWithLLM):
    base_model: str
    out_type: str  # 参数说明：大模型输出要求，返回str、list
    rewrite_prompt: str  # 重写问题的提示词

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.rewrite_prompt = self.get_data().get("payload__prompt")
        self.out_type = (
            self.get_data().get("config__output_shape")[0].get("variable_type", None)
            if self.get_data().get("config__output_shape")
            else None
        )

    def _to_dict(self, result):
        result = super()._to_dict(result)

        result["args"] = {
            "base_model": self.model_id,
            "rewrite_prompt": self.rewrite_prompt,
            "formatter": self.out_type,
        }
        return result


class IntentionNode(SimpleNodeWithLLM):
    prompt: str
    constrain: str
    attention: str
    nodes: dict[str, list[BaseNode]]

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.prompt = self.get_data().get("payload__prompt")
        self.constrain = self.get_data().get("payload__constrain")
        self.attention = self.get_data().get("payload__attention")
        self.nodes: dict[str, list[BaseNode]] = {}
        self.fork_map_casedict = {}

    def get_children(self):
        return [child for child_list in self.nodes.values() for child in child_list]

    def _to_dict(self, result):
        result = super()._to_dict(result)
        default = self.nodes.pop("default", [])
        self.nodes.update({"default": default})

        result["args"] = {
            "base_model": self.model_id,
            "prompt": self.prompt if self.prompt else "",  # 提示词
            "constrain": self.constrain,  # 用户限制
            "attention": self.attention if self.attention else "",  # 注意事项
            "nodes": (
                {
                    key: [d for node in value if (d := node.to_dict())]
                    for key, value in self.nodes.items()
                }
                if self.nodes
                else {}
            ),  # 后续在处理时补充
        }

        return result

    def set_fork_map_casedict(self, casedata):
        self.fork_map_casedict[casedata["sourceHandle"]] = casedata


class FunctionCallNode(SimpleNodeWithLLM):
    base_model: str
    tools: list
    algorithm: str

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.tools = self.get_data().get("payload__tools", [])
        self.algorithm = self.get_data().get("payload__algorithm")
        self.set_used_resources("tools", self.tools)

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"] = {
            "base_model": self.model_id,  # use_resource
            "tools": self.tools,
            "algorithm": self.algorithm,
        }
        return result


class SqlCallNode(SimpleNodeWithLLM):
    base_model: str
    sql_manager: str
    sql_examples: list
    use_llm_for_sql_result: bool

    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)
        self.sql_manager = self.get_data().get("payload__sql_manager")
        self.sql_examples = self.get_data().get("payload__sql_examples")
        self.use_llm_for_sql_result = self.get_data().get(
            "payload__use_llm_for_sql_result"
        )
        self.set_used_resources("sql_manager", self.sql_manager)

    def _to_dict(self, result):
        result = super()._to_dict(result)
        result["args"] = {
            "base_model": self.model_id,  # use_resource
            "sql_manager": self.sql_manager,  # use_resource
            "sql_examples": self.sql_examples,
            "use_llm_for_sql_result": self.use_llm_for_sql_result,
        }
        return result


class OCRNode(InferNode):
    def __init__(self, nodedata, context):
        super().__init__(nodedata, context)

    def _to_dict(self, result):
        result = super()._to_dict(result)
        if "type" in result.get("args", {}):
            result["args"].pop("type")
        return result

    def get_type(self):
        return "OCR"
