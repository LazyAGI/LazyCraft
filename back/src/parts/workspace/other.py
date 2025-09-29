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

from flask_restful import Resource

from parts.urls import api


class FeatureApi(Resource):
    """功能特性 API 资源类。

    提供系统功能特性的配置信息
    """

    def get(self):
        """获取系统功能特性配置。

        Returns:
            dict: 系统功能特性配置信息
        """
        t = """{"billing":{"enabled":false,"subscription":{"plan":"sandbox","interval":""}},"members":{"size":0,"limit":1},"apps":{"size":0,"limit":10},"vector_space":{"size":0,"limit":5},"annotation_quota_limit":{"size":0,"limit":10},"documents_upload_quota":{"size":0,"limit":50},"docs_processing":"standard","can_replace_logo":false,"model_load_balancing_enabled":false,"dataset_operator_enabled":false}"""
        return json.loads(t)


class RetrievalSetting(Resource):
    """检索设置 API 资源类。

    提供检索方法的配置信息
    """

    def get(self):
        """获取检索方法配置。

        Returns:
            dict: 检索方法配置信息
        """
        t = """ {"retrieval_method":["semantic_search","full_text_search","hybrid_search"]} """
        return json.loads(t)


class ModelProviders(Resource):
    """模型提供商 API 资源类。

    提供模型提供商的配置信息
    """

    def get(self):
        """获取模型提供商配置。

        Returns:
            dict: 模型提供商配置信息
        """
        t = """ {"data":[{"provider":"openai","label":{"zh_Hans":"OpenAI","en_US":"OpenAI"},"description":{"zh_Hans":"OpenAI 提供的模型，例如 GPT-3.5-Turbo 和 GPT-4。","en_US":"Models provided by OpenAI, such as GPT-3.5-Turbo and GPT-4."},"icon_small":{"zh_Hans":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/openai/icon_small/zh_Hans","en_US":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/openai/icon_small/en_US"},"icon_large":{"zh_Hans":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/openai/icon_large/zh_Hans","en_US":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/openai/icon_large/en_US"},"background":"#E5E7EB","help":{"title":{"zh_Hans":"从 OpenAI 获取 API Key","en_US":"Get your API Key from OpenAI"},"url":{"zh_Hans":"https://platform.openai.com/account/api-keys","en_US":"https://platform.openai.com/account/api-keys"}},"supported_model_types":["llm","text-embedding","speech2text","moderation","tts"],"configurate_methods":["predefined-model","customizable-model"],"provider_credential_schema":{"credential_form_schemas":[{"variable":"openai_api_key","label":{"zh_Hans":"API Key","en_US":"API Key"},"type":"secret-input","required":true,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的 API Key","en_US":"Enter your API Key"},"max_length":0,"show_on":[]},{"variable":"openai_organization","label":{"zh_Hans":"组织 ID","en_US":"Organization"},"type":"text-input","required":false,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的组织 ID","en_US":"Enter your Organization ID"},"max_length":0,"show_on":[]},{"variable":"openai_api_base","label":{"zh_Hans":"API Base","en_US":"API Base"},"type":"text-input","required":false,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的 API Base, 如：https://api.openai.com","en_US":"Enter your API Base, e.g. https://api.openai.com"},"max_length":0,"show_on":[]}]},"model_credential_schema":{"model":{"label":{"zh_Hans":"模型名称","en_US":"Model Name"},"placeholder":{"zh_Hans":"输入模型名称","en_US":"Enter your model name"}},"credential_form_schemas":[{"variable":"openai_api_key","label":{"zh_Hans":"API Key","en_US":"API Key"},"type":"secret-input","required":true,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的 API Key","en_US":"Enter your API Key"},"max_length":0,"show_on":[]},{"variable":"openai_organization","label":{"zh_Hans":"组织 ID","en_US":"Organization"},"type":"text-input","required":false,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的组织 ID","en_US":"Enter your Organization ID"},"max_length":0,"show_on":[]},{"variable":"openai_api_base","label":{"zh_Hans":"API Base","en_US":"API Base"},"type":"text-input","required":false,"default":null,"options":null,"placeholder":{"zh_Hans":"在此输入您的 API Base","en_US":"Enter your API Base"},"max_length":0,"show_on":[]}]},"preferred_provider_type":"custom","custom_configuration":{"status":"no-configure"},"system_configuration":{"enabled":false,"current_quota_type":null,"quota_configurations":[]}}]} """
        return json.loads(t)


class LLM(Resource):
    """大语言模型 API 资源类。

    提供大语言模型的配置信息
    """

    def get(self):
        """获取大语言模型配置。

        Returns:
            dict: 大语言模型配置信息
        """
        t = """ {"data":[{"provider":"tongyi","label":{"zh_Hans":"\u901a\u4e49\u5343\u95ee","en_US":"TONGYI"},"icon_small":{"zh_Hans":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/tongyi/icon_small/zh_Hans","en_US":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/tongyi/icon_small/en_US"},"icon_large":{"zh_Hans":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/tongyi/icon_large/zh_Hans","en_US":"http://192.168.2.73:8081/console/api/workspaces/current/model-providers/tongyi/icon_large/en_US"},"status":"active","models":[{"model":"qwen-long","label":{"zh_Hans":"qwen-long","en_US":"qwen-long"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":10000000},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-max-longcontext","label":{"zh_Hans":"qwen-max-longcontext","en_US":"qwen-max-longcontext"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":32768},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-max-0428","label":{"zh_Hans":"qwen-max-0428","en_US":"qwen-max-0428"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-plus-chat","label":{"zh_Hans":"qwen-plus-chat","en_US":"qwen-plus-chat"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":32768},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-max","label":{"zh_Hans":"qwen-max","en_US":"qwen-max"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-max-0403","label":{"zh_Hans":"qwen-max-0403","en_US":"qwen-max-0403"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-turbo","label":{"zh_Hans":"qwen-turbo","en_US":"qwen-turbo"},"model_type":"llm","features":["agent-thought"],"fetch_from":"predefined-model","model_properties":{"mode":"completion","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-max-1201","label":{"zh_Hans":"qwen-max-1201","en_US":"qwen-max-1201"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-vl-plus","label":{"zh_Hans":"qwen-vl-plus","en_US":"qwen-vl-plus"},"model_type":"llm","features":["vision","agent-thought"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":32768},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-plus","label":{"zh_Hans":"qwen-plus","en_US":"qwen-plus"},"model_type":"llm","features":["agent-thought"],"fetch_from":"predefined-model","model_properties":{"mode":"completion","context_size":32768},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-turbo-chat","label":{"zh_Hans":"qwen-turbo-chat","en_US":"qwen-turbo-chat"},"model_type":"llm","features":["multi-tool-call","agent-thought","stream-tool-call"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false},{"model":"qwen-vl-max","label":{"zh_Hans":"qwen-vl-max","en_US":"qwen-vl-max"},"model_type":"llm","features":["vision","agent-thought"],"fetch_from":"predefined-model","model_properties":{"mode":"chat","context_size":8192},"deprecated":false,"status":"active","load_balancing_enabled":false}]}]} """
        return json.loads(t)


class Version(Resource):
    """版本信息 API 资源类。

    提供系统版本信息
    """

    def get(self):
        """获取系统版本信息。

        Returns:
            dict: 系统版本信息
        """
        t = """ {"version":"1.0.1","release_date":"2024-01-01","release_notes":"http://www.baidu.com","can_auto_update":true,"features":{"can_replace_logo":false,"model_load_balancing_enabled":false}} """
        return json.loads(t)


class ToolProviders(Resource):
    """工具提供商 API 资源类。

    提供工具提供商的配置信息
    """

    def get(self):
        """获取工具提供商配置。

        Returns:
            list: 工具提供商配置列表
        """
        t = """ []"""
        return json.loads(t)


class DefaultBlockConfigs(Resource):
    """默认块配置 API 资源类。

    提供默认工作流块配置信息
    """

    t = """ [{"type":"llm","config":{"prompt_templates":{"chat_model":{"prompts":[{"role":"system","text":"You are a helpful AI assistant.","edition_type":"basic"}]},"completion_model":{"conversation_histories_role":{"user_prefix":"Human","assistant_prefix":"Assistant"},"prompt":{"text":"Here is the chat histories between human and assistant, inside <histories></histories> XML tags.<histories>{{#histories#}}</histories>Human: {{#sys.query#}}Assistant:","edition_type":"basic"},"stop":["Human:"]}}}},{"type":"code","config":{"variables":[{"variable":"arg1","value_selector":[]},{"variable":"arg2","value_selector":[]}],"code_language":"python3","code":"def main(arg1, arg2):","outputs":{"result":{"type":"string","children":null}}},"available_dependencies":[{"name":"jinja2","version":""},{"name":"httpx","version":""},{"name":"requests","version":""}]},{"type":"template-transform","config":{"variables":[{"variable":"arg1","value_selector":[]}],"template":"{{ arg1 }}"}},{"type":"question-classifier","config":{"instructions":""}},{"type":"http-request","config":{"method":"get","authorization":{"type":"no-auth"},"body":{"type":"none"},"timeout":{"connect":10,"read":60,"write":20,"max_connect_timeout":300,"max_read_timeout":600,"max_write_timeout":600}}},{"model":{"prompt_templates":{"completion_model":{"conversation_histories_role":{"user_prefix":"Human","assistant_prefix":"Assistant"},"stop":["Human:"]}}}}] """

    def get(self, app_id):
        """获取应用的默认块配置。

        Args:
            app_id (str): 应用ID

        Returns:
            list: 默认块配置列表
        """
        return json.loads(self.t)


class OneDefaultBlockConfig(DefaultBlockConfigs):
    """单个默认块配置 API 资源类。

    提供获取单个默认工作流块配置的接口
    """

    def get(self, app_id, module):
        """获取应用的单个默认块配置。

        Args:
            app_id (str): 应用ID
            module (str): 模块类型

        Returns:
            dict: 单个默认块配置信息
        """
        data_list = json.loads(self.t)
        for data in data_list:
            if data.get("type") == module:
                return data
        return {}


# 以下为历史遗留的接口,暂时收留在此防止前端报错
api.add_resource(FeatureApi, "/features")
api.add_resource(RetrievalSetting, "/datasets/retrieval-setting")
api.add_resource(ModelProviders, "/workspaces/current/model-providers")
api.add_resource(LLM, "/workspaces/current/models/model-types/llm")
api.add_resource(ToolProviders, "/workspaces/current/tool-providers")
api.add_resource(Version, "/version")
api.add_resource(
    DefaultBlockConfigs, "/apps/<uuid:app_id>/workflows/default-workflow-block-configs"
)
api.add_resource(
    OneDefaultBlockConfig,
    "/apps/<uuid:app_id>/workflows/default-workflow-block-configs/<string:module>",
)
