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

from enum import Enum


class Module(Enum):
    TOOL = "工具"
    MCP_TOOL = "MCP工具"
    DATA_MANAGEMENT = "数据管理"
    DATA_SCRIPT_MANAGEMENT = "数据脚本管理"
    APP_STORE = "应用商店"
    USER_MANAGEMENT = "用户管理"
    PROMPT_MANAGEMENT = "prompt管理"
    KNOWLEDGE_BASE_MANAGEMENT = "知识库管理"
    MODEL_MANAGEMENT = "模型管理"
    MODEL_INFERENCE = "模型推理"
    MODEL_FINETUNE = "模型微调"
    MODEL_EVALUATE = "模型管理（测评）"


# 全局计数器，用于跟踪Action值的序号
value_counter = 0


class Action(Enum):
    # 重构Action枚举，旨在构造唯一的值
    def __new__(cls, value):
        global value_counter
        value_counter += 1
        obj = object.__new__(cls)
        # 生成唯一的值
        obj._value_ = f"{value}#{value_counter}"
        return obj

    # 工具管理操作
    CREATE_TOOL = "新建"
    DELETE_TOOL = "删除"
    PUBLISH_TOOL = "发布"
    ENABLE_TOOL = "启用"
    DISABLE_TOOL = "禁用"
    EDIT_TOOL = "编辑"
    SYNC_MCP_TOOL = "从MCP服务同步工具"
    # 数据管理操作
    CREATE_TEXT_DATA = "新建文本数据集"
    CREATE_IMAGE_DATA = "新建图片数据集"
    EXPORT_TEXT_DATA = "导出文本数据集"
    IMPORT_TEXT_DATA_VERSION = "新建文本数据集版本"
    PUBLISH_TEXT_DATA = "发布文本数据集"
    EDIT_TEXT_DATA = "编辑文本数据集"
    DELETE_SET_DATA = "删除数据集"
    DELETE_VERSION_DATA = "删除数据集"
    DELETE_FILE_DATA = "删除数据集"
    EXPORT_IMAGE_DATA = "导出图像数据集"
    IMPORT_IMAGE_DATA_VERSION = "新建图像数据集版本"
    PUBLISH_IMAGE_DATA = "发布图像数据集"
    EDIT_IMAGE_DATA = "编辑图像数据集"
    # CLEAN_DATA = "数据过滤"
    # AUGMENT_DATA = "数据增强"
    OPERATE_DATA = "数据操作"  # 用于过滤、增强等操作
    # 数据脚本管理操作
    ADD_SCRIPT = "添加脚本"
    DELETE_SCRIPT = "删除脚本"

    # 应用商店操作
    CREATE_APP = "新建应用"
    CREATE_APP_TMP = "新建应用"
    CREATE_APP_DSL = "新建应用"
    DELETE_APP = "删除应用"
    EXPORT_APP = "导出应用"
    ADD_TEMPLATE = "添加应用模板"
    PUBLISH_APP = "发布应用"
    ENABLE_APP = "启用应用"
    DISABLE_APP = "禁用应用"
    DEBUG_APP_OK = "应用调试"
    DEBUG_APP_FAIL = "应用调试"
    DEBUG_APP_BATCH = "应用调试"
    DEBUG_NODE_OK = "应用调试"
    DEBUG_NODE_FAIL = "应用调试"
    DEBUG_NODE_BATCH = "应用调试"
    UPDATE_APP_NODE = "应用编排"
    UPDATE_APP_RESOURCE = "应用编排"

    # 用户管理操作
    REGISTER_USER = "用户注册"
    CHANGE_PASSWORD = "更换密码"
    LOGIN_USER = "用户登录"
    LOGOUT_USER = "用户退出"
    UPDATE_USER = "用户更新"
    DELETE_USER = "删除用户"
    CREATE_GROUP = "新建用户组"
    DELETE_GROUP = "删除用户组"
    ADD_GROUP_USER = "用户组添加用户"
    REMOVE_GROUP_USER = "用户组移除用户"

    # prompt管理操作
    CREATE_PROMPT = "新建prompt"
    EDIT_PROMPT_CONTENT = "编辑prompt"
    EDIT_PROMPT_DESCRIBE = "编辑prompt"
    DELETE_PROMPT = "删除prompt"

    # 知识库管理操作
    CREATE_KNOWLEDGE_BASE = "新增知识库"
    EDIT_KNOWLEDGE_BASE = "编辑知识库"
    UPLOAD_FILE = "上传文件"
    DELETE_FILE = "删除文件"
    DELETE_KNOWLEDGE_BASE = "删除知识库"

    # 模型管理操作
    CREATE_MODEL = "新建模型"
    DELETE_MODEL = "删除模型"
    IMPORT_FINETUNE_MODEL = "导入微调大模型"
    DELETE_FINETUNE_MODEL = "删除微调大模型"

    # 模型微调
    CREATE_FINETUNE_TASK = "新建微调任务"
    FINETUNE_TRAIN_SUCCESS = "微调训练"
    FINETUNE_TRAIN_FAIL = "微调训练"
    DELETE_FINETUNE_TASK = "删除微调任务"

    # 模型测评
    CREATE_EVALUATE_TASK = "新建测评任务"
    EVALUATE_TASK_START = "测评标注"
    EVALUATE_TASK_FINISH = "测评标注"
    EVALUATE_FAILED = "测评标注"
    EVALUATE_INFERENCE_FAILED = "测评标注"
    DOWNLOAD_EVALUATION_REPORT = "下载测评报告"
    EVALUATE_TASK_DELETE = "删除测评任务"

    # 模型推理
    CREATE_INFERENCE_TASK = "新建推理任务"
    INFERENCE_TASK_START = "启动推理任务"


class DetailProvider:
    # 定义所有模块、操作类型和对应的详细描述模板
    details = {
        (Module.TOOL, Action.CREATE_TOOL): "新建工具'{name}'，其简介为：'{describe}'",
        (Module.TOOL, Action.DELETE_TOOL): "工具'{name}'已被删除",
        (Module.TOOL, Action.PUBLISH_TOOL): "工具'{name}'已发布",
        (Module.TOOL, Action.ENABLE_TOOL): "工具'{name}'已启用",
        (Module.TOOL, Action.DISABLE_TOOL): "工具'{name}'已禁用",
        (
            Module.TOOL,
            Action.EDIT_TOOL,
        ): "工具'{name}'的简介从'{old_description}'更新为：'{description}'",
        (
            Module.MCP_TOOL,
            Action.CREATE_TOOL,
        ): "新建MCP服务'{name}'，其简介为：'{describe}'",
        (Module.MCP_TOOL, Action.DELETE_TOOL): "MCP服务'{name}'已被删除",
        (Module.MCP_TOOL, Action.PUBLISH_TOOL): "MCP服务'{name}'已发布",
        (Module.MCP_TOOL, Action.ENABLE_TOOL): "MCP服务'{name}'已启用",
        (Module.MCP_TOOL, Action.DISABLE_TOOL): "MCP服务'{name}'已禁用",
        (
            Module.MCP_TOOL,
            Action.EDIT_TOOL,
        ): "MCP服务'{name}'的简介从'{old_description}'更新为：'{description}'",
        (Module.MCP_TOOL, Action.SYNC_MCP_TOOL): "同步MCP服务'{name}'中的工具",
        (
            Module.DATA_MANAGEMENT,
            Action.CREATE_TEXT_DATA,
        ): "新建文本数据集'{name}'-'{data_type}'，数据来源于'{from_type}'",
        (
            Module.DATA_MANAGEMENT,
            Action.CREATE_IMAGE_DATA,
        ): "新建图片数据集'{name}'-'{data_type}'，数据来源于'{from_type}'",
        (
            Module.DATA_MANAGEMENT,
            Action.EXPORT_TEXT_DATA,
        ): "导出数据集'{name}'-'{data_type}'，'{version_type}':'{version_list}'",
        (
            Module.DATA_MANAGEMENT,
            Action.IMPORT_TEXT_DATA_VERSION,
        ): "新建文本数据集'{name}'-'{data_type}'，'{version_type}':‘{version}’共'{file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.PUBLISH_TEXT_DATA,
        ): "发布文本数据集'{name}'-'{data_type}'：原'{old_version}'发布为'{version}'号，含'{file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.EDIT_TEXT_DATA,
        ): "编辑文本数据集：'{name}'-'{data_type}'版本为'{version_type}':‘{version}’更新前'{old_file_size}'条数据，更新后'{new_file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.DELETE_SET_DATA,
        ): "删除数据集'{name}'-'{data_type}'所有数据,数据来源为'{from_type}'",
        (
            Module.DATA_MANAGEMENT,
            Action.DELETE_VERSION_DATA,
        ): "删除数据集'{name}'-'{data_type}'，版本为’{version_type}‘:’{version}‘所有数据，共计'{file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.DELETE_FILE_DATA,
        ): "删除数据集'{name}'-'{data_type}',版本为‘{version_type}’:‘{version}'共’{file_size}‘条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.OPERATE_DATA,
        ): "数据集 -'{name}'-'{data_type}',版本为‘{version_type}’:‘{version}'合计{operate}了’{file_size}‘个文件，其中成功为{success_size}个文件",
        # (Module.DATA_MANAGEMENT, Action.CLEAN_DATA): "数据集 -'{name}'-'{data_type}',版本为‘{version_type}’:‘{version}'合计过滤了’{file_size}‘条数据，其中成功为{success_size}条",
        # (Module.DATA_MANAGEMENT, Action.AUGMENT_DATA): "数据集 -'{name}'-'{data_type}',版本为‘{version_type}’:‘{version}'合计增强了’{file_size}‘条数据，其中成功为{success_size}条",
        (
            Module.DATA_MANAGEMENT,
            Action.EXPORT_IMAGE_DATA,
        ): "导出数据集'{name}'-'{data_type}'，'{version_type}':'{version_list}'",
        (
            Module.DATA_MANAGEMENT,
            Action.IMPORT_IMAGE_DATA_VERSION,
        ): "新建图像数据集'{name}'-'{data_type}'，'{version_type}':‘{version}’共'{file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.PUBLISH_IMAGE_DATA,
        ): "发布图像数据集'{name}'-'{data_type}'：原'{old_version}'发布为'{version}'号，含'{file_size}'条数据",
        (
            Module.DATA_MANAGEMENT,
            Action.EDIT_IMAGE_DATA,
        ): "编辑图像数据集：'{name}'-'{data_type}'版本为'{version_type}':‘{version}’更新前'{old_file_size}'条数据，更新后'{new_file_size}'条数据",
        # 数据脚本管理
        (
            Module.DATA_SCRIPT_MANAGEMENT,
            Action.ADD_SCRIPT,
        ): "脚本名称'{name}'已被添加，类别为'{script_type}'",
        (
            Module.DATA_SCRIPT_MANAGEMENT,
            Action.DELETE_SCRIPT,
        ): "脚本名称'{name}'已被删除，类别为'{script_type}'",
        # 应用商店
        (Module.APP_STORE, Action.CREATE_APP): "从空白模板创建应用“{name}”",
        (Module.APP_STORE, Action.CREATE_APP_TMP): "从应用模版中创建应用“{name}”",
        (Module.APP_STORE, Action.CREATE_APP_DSL): "导入DSL创建“{name}”",
        (Module.APP_STORE, Action.DELETE_APP): "应用“{name}”已被删除",
        (Module.APP_STORE, Action.EXPORT_APP): "应用“{name}”（DSL）已被导出",
        (
            Module.APP_STORE,
            Action.ADD_TEMPLATE,
        ): "将应用“{app_name}”添加为应用模板“{t_name}”",
        (Module.APP_STORE, Action.PUBLISH_APP): "应用“{name}”已发布",
        (Module.APP_STORE, Action.ENABLE_APP): "应用“{name}”已启用",
        (Module.APP_STORE, Action.DISABLE_APP): "应用“{name}”已禁用",
        (Module.APP_STORE, Action.DEBUG_APP_OK): "“{name}”单例运行追踪结果为成功",
        (Module.APP_STORE, Action.DEBUG_APP_FAIL): "“{name}”单例运行追踪结果为失败",
        (
            Module.APP_STORE,
            Action.DEBUG_APP_BATCH,
        ): "“{name}”批量运行结果：{ok}个成功，{fail}个失败",
        (
            Module.APP_STORE,
            Action.DEBUG_NODE_OK,
        ): "“{name}”-“{node_name}”单例运行追踪结果为成功",
        (
            Module.APP_STORE,
            Action.DEBUG_NODE_FAIL,
        ): "“{name}”-“{node_name}”单例运行追踪结果为失败",
        (
            Module.APP_STORE,
            Action.DEBUG_NODE_BATCH,
        ): "“{name}”-“{node_name}”批量运行结果：{ok}个成功，{fail}个失败",
        (
            Module.APP_STORE,
            Action.UPDATE_APP_NODE,
        ): "应用“{name}”已{doing}节点“{node_name}”",
        (
            Module.APP_STORE,
            Action.UPDATE_APP_RESOURCE,
        ): "应用“{name}”已{doing}资源“{res_name}”",
        # 用户管理
        (Module.USER_MANAGEMENT, Action.REGISTER_USER): "用户“{name}”注册成功",
        (Module.USER_MANAGEMENT, Action.CHANGE_PASSWORD): "用户“{name}”更换密码成功",
        (Module.USER_MANAGEMENT, Action.LOGIN_USER): "用户“{name}”登录",
        (Module.USER_MANAGEMENT, Action.LOGOUT_USER): "用户“{name}”退出",
        (Module.USER_MANAGEMENT, Action.DELETE_USER): "用户“{name}”已被删除",
        (Module.USER_MANAGEMENT, Action.CREATE_GROUP): "新建用户组“{tenant}”",
        (Module.USER_MANAGEMENT, Action.DELETE_GROUP): "用户组“{tenant}”被删除",
        (
            Module.USER_MANAGEMENT,
            Action.ADD_GROUP_USER,
        ): "用户组“{tenant}”添加用户成功，合计“{names}”等{count}个用户",
        (
            Module.USER_MANAGEMENT,
            Action.REMOVE_GROUP_USER,
        ): "用户组“{tenant}”移除用户成功，合计“{names}”等{count}个用户",
        # prompt管理
        (
            Module.PROMPT_MANAGEMENT,
            Action.CREATE_PROMPT,
        ): "新建 '{prompt_name}',其简介：{prompt_describe}",
        (
            Module.PROMPT_MANAGEMENT,
            Action.EDIT_PROMPT_CONTENT,
        ): "'{name}'的prompt已被更新为：{content}",
        (
            Module.PROMPT_MANAGEMENT,
            Action.EDIT_PROMPT_DESCRIBE,
        ): "'{name}'的简介已被更新为：{describe}",
        (Module.PROMPT_MANAGEMENT, Action.DELETE_PROMPT): "'{pname}'已被删除",
        # 知识库管理
        (
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.CREATE_KNOWLEDGE_BASE,
        ): "新建知识库'{name}'，简介为：'{describe}'",
        (
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.EDIT_KNOWLEDGE_BASE,
        ): "知识库'{name}'的简介更新为：'{describe}'",
        (
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.UPLOAD_FILE,
        ): "知识库'{name}'上传了'{file_name_list}'等合计'{file_size}'个文件",
        (
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.DELETE_FILE,
        ): "知识库'{name}'删除了'{file_name}'等合计'{file_size}'个文件",
        (
            Module.KNOWLEDGE_BASE_MANAGEMENT,
            Action.DELETE_KNOWLEDGE_BASE,
        ): "删除知识库'{name}'”，合计'{file_size}'个文件",
        # 模型管理
        (
            Module.MODEL_MANAGEMENT,
            Action.CREATE_MODEL,
        ): "新建模型'{name}'，来源为'{model_from}'，类别为'{model_kind}'",
        (
            Module.MODEL_MANAGEMENT,
            Action.DELETE_MODEL,
        ): "删除模型'{name}'，来源为'{model_from}'，类别为'{model_kind}'",
        (
            Module.MODEL_MANAGEMENT,
            Action.IMPORT_FINETUNE_MODEL,
        ): "导入基础模型-“{model_name}”的微调模型：“{finetune_model_name}”，来源为“{source_info}”",
        (
            Module.MODEL_MANAGEMENT,
            Action.DELETE_FINETUNE_MODEL,
        ): "删除基础模型-“{model_name}”的微调模型：“{finetune_model_name}”，来源为“{source_info}”",
        # 模型微调
        (
            Module.MODEL_FINETUNE,
            Action.CREATE_FINETUNE_TASK,
        ): "微调任务：“{task_name}”已创建",
        (
            Module.MODEL_FINETUNE,
            Action.FINETUNE_TRAIN_SUCCESS,
        ): "微调任务：“{task_name}”训练成功",
        (
            Module.MODEL_FINETUNE,
            Action.FINETUNE_TRAIN_FAIL,
        ): "微调任务：“{task_name}”训练失败",
        (
            Module.MODEL_FINETUNE,
            Action.DELETE_FINETUNE_TASK,
        ): "微调任务：“{task_name}”已删除",
        # 模型测评
        (
            Module.MODEL_EVALUATE,
            Action.CREATE_EVALUATE_TASK,
        ): "模型测评({task_method})：“{task_name}”已创建",
        (
            Module.MODEL_EVALUATE,
            Action.EVALUATE_TASK_START,
        ): "模型测评(人工测评)：“{task_name}”已开始标注",
        (
            Module.MODEL_EVALUATE,
            Action.EVALUATE_TASK_FINISH,
        ): "测评任务({task_method}):“{task_name}”已标注完所有数据（{completed}/{total}）",
        (
            Module.MODEL_EVALUATE,
            Action.EVALUATE_TASK_DELETE,
        ): "模型测评({task_method})：“{task_name}”已删除",
        (
            Module.MODEL_EVALUATE,
            Action.EVALUATE_INFERENCE_FAILED,
        ): "测评任务({task_method})：“{task_name}”推理{result}",
        (
            Module.MODEL_EVALUATE,
            Action.EVALUATE_FAILED,
        ): "测评任务（AI测评）：“{task_name}”测评{result}",
        (
            Module.MODEL_EVALUATE,
            Action.DOWNLOAD_EVALUATION_REPORT,
        ): "测评任务({task_method})：“{task_name}”的测评报告已下载",
        # 模型推理
        (Module.MODEL_INFERENCE, Action.CREATE_INFERENCE_TASK): "推理任务创建{result}",
        (Module.MODEL_INFERENCE, Action.INFERENCE_TASK_START): "推理任务启动{result}",
    }

    @classmethod
    def get_detail(cls, module: Module, action: Action, **kwargs) -> str:
        """根据 module 和 action 获取 detail 模板并格式化"""
        detail_template = cls.details.get((module, action))
        if detail_template:
            return detail_template.format(**kwargs)
        else:
            return "未找到对应的操作"
