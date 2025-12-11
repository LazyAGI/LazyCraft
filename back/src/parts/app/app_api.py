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

import json
import logging
import os
import tempfile
import time
from datetime import datetime

from flask import Response, request, send_from_directory, stream_with_context
from flask_login import current_user
from flask_restful import inputs, marshal, marshal_with, reqparse
from werkzeug.datastructures import FileStorage

from lazyllm.engine import LightEngine

import parts.data.data_reflux_service as reflux
from core.restful import Resource
from libs import helper
from libs.feature_gate import require_internet_feature
from libs.login import login_required
from libs.timetools import TimeTools
from parts.app.node_run.app_run_service import AppRunService, EventHandler
from parts.app.node_run.engine_manager import RedisStateManager
from parts.cost_audit.service import CostService
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db
from utils.util_redis import redis_client

from . import fields
from .app_service import AppService, TemplateService, WorkflowService
from .model import App, Workflow
from .refer_service import ReferManager
from .reflux_helper import RefluxHelper


def get_create_app_parser():
    """创建应用解析器。

    创建并配置用于解析应用创建请求的RequestParser，
    包含应用创建所需的所有参数定义。

    Args:
        None

    Returns:
        RequestParser: 配置好的请求解析器，包含name、description、icon、
                       icon_background、categories等参数。

    Raises:
        None
    """
    parser = reqparse.RequestParser()
    parser.add_argument("name", type=str, location="json")
    parser.add_argument("description", type=str, location="json")
    parser.add_argument("icon", type=str, location="json")
    parser.add_argument("icon_background", type=str, location="json")
    parser.add_argument("categories", type=list, location="json")
    return parser


class AppListApi(Resource):
    @login_required
    def get(self):
        """获取应用列表。

        根据查询参数获取应用的分页列表，支持按名称、标签、发布状态等条件筛选。

        Args:
            page (int, optional): 页码，范围1-99999，默认为1。
            limit (int, optional): 每页数量，范围1-100，默认为20。
            search_name (str, optional): 搜索应用名称，支持模糊匹配。
            search_tags (str, optional): 搜索标签名称。
            qtype (str, optional): 查询类型，可选值：mine（我的）/group（团队）/builtin（内置）/already（全部），默认为mine。
            is_published (bool, optional): 是否已发布的过滤条件。

        Returns:
            dict: 包含应用列表的分页数据，包含data、total、page、limit字段。

        Raises:
            ValueError: 当参数验证失败时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=inputs.int_range(1, 99999),
            required=False,
            default=1,
            location="args",
        )
        parser.add_argument(
            "limit",
            type=inputs.int_range(1, 100),
            required=False,
            default=20,
            location="args",
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        parser.add_argument("search_tags", type=str, location="args", required=False)
        parser.add_argument(
            "qtype", type=str, location="args", required=False, default="mine"
        )  # mine/group/builtin/already
        parser.add_argument(
            "is_published", type=inputs.boolean, location="args", required=False
        )
        args = parser.parse_args()

        # 权限校验：列表接口需要 read 权限
        self.check_can_read()

        client = AppService()
        pagination = client.get_paginate_apps(current_user, args)
        response = marshal(pagination, fields.app_pagination_fields)

        # 根据实际服务的情况,判断是否已开启
        for appdata in response["data"]:
            if appdata["enable_api"]:
                gid = f"publish-{appdata['id']}"
                if not LightEngine().build_node(gid):
                    appdata["enable_api"] = False

        return response

    @login_required
    @marshal_with(fields.app_detail_fields)
    def post(self):
        """创建空白的应用。

        根据传入的参数创建一个新的空白应用，并记录操作日志。

        Args:
            name (str): 应用名称，必填。
            description (str, optional): 应用描述。
            icon (str, optional): 应用图标URL。
            icon_background (str, optional): 图标背景色。
            categories (list, optional): 应用分类列表。

        Returns:
            tuple: 包含新创建的应用实例和状态码201的元组。

        Raises:
            ValueError: 当应用名称重复或创建失败时抛出。
        """
        parser = get_create_app_parser()
        args = parser.parse_args()
        self.check_can_write()

        client = AppService()
        client.validate_name(current_user, args["name"])
        app = client.create_app(current_user, args)
        LogService().add(Module.APP_STORE, Action.CREATE_APP, name=app.name)
        return app, 201


class AppListPageApi(Resource):
    @login_required
    def post(self):
        """获取应用列表（分页版本）。

        使用POST方式获取应用的分页列表，支持更复杂的查询参数。

        Args:
            page (int, optional): 页码，范围1-99999，默认为1。
            limit (int, optional): 每页数量，范围1-100，默认为20。
            search_name (str, optional): 搜索应用名称，支持模糊匹配。
            search_tags (list, optional): 搜索标签列表。
            qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为mine。
            is_published (bool, optional): 是否已发布的过滤条件。
            enable_api (bool, optional): 是否启用API的过滤条件。

        Returns:
            dict: 包含应用列表的分页数据，使用app_pagination_fields格式。

        Raises:
            ValueError: 当参数验证失败时抛出。
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=inputs.int_range(1, 99999),
            required=False,
            default=1,
            location="json",
        )
        parser.add_argument(
            "limit",
            type=inputs.int_range(1, 100),
            required=False,
            default=20,
            location="json",
        )
        parser.add_argument("search_name", type=str, location="json", required=False)
        parser.add_argument(
            "search_tags", type=list, location="json", required=False
        )  # 修改为数组
        parser.add_argument(
            "qtype", type=str, location="json", required=False, default="mine"
        )  # mine/group/builtin/already
        parser.add_argument(
            "is_published", type=inputs.boolean, location="json", required=False
        )
        parser.add_argument(
            "enable_api", type=inputs.boolean, location="json", required=False
        )
        args = parser.parse_args()
        
        self.check_can_read()
        client = AppService()
        pagination = client.get_paginate_apps(current_user, args)
        response = marshal(pagination, fields.app_pagination_fields)

        # 根据实际服务的情况,判断是否已开启
        for appdata in response["data"]:
            if appdata["enable_api"]:
                gid = f"publish-{appdata['id']}"
                if not LightEngine().build_node(gid):
                    appdata["engine_status"] = "服务异常"

        return response


class AppDetailApi(Resource):
    @login_required
    def get(self, app_id):
        """获取应用详情。

        Args:
            app_id (str): 应用ID

        Returns:
            dict: 应用详细信息

        Raises:
            ValueError: 当应用不存在时抛出
        """
        # 如果是通过子画布的接口来访问，会拿不到app_model
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_read_object(app_model)
            
        return marshal(app_model, fields.app_detail_fields)

    @login_required
    def put(self, app_id):
        """更新应用信息。

        Args:
            app_id (str): 应用ID
            name (str, optional): 应用名称
            description (str, optional): 应用描述
            icon (str, optional): 应用图标
            icon_background (str, optional): 图标背景色
            categories (list, optional): 应用分类

        Returns:
            dict: 更新后的应用信息

        Raises:
            ValueError: 当应用不存在或名称重复时抛出
        """
        parser = get_create_app_parser()
        args = parser.parse_args()
        self.check_can_write()

        client = AppService()
        app_model = client.get_app(app_id)

        self.check_can_write_object(app_model)

        if args.get("name") != app_model.name:  # 如果改名需要重新验证唯一性
            client.validate_name(current_user, args["name"])

        app_model = client.update_app(app_model, args)
        return marshal(app_model, fields.app_detail_fields)

    @login_required
    def delete(self, app_id):
        """删除应用。

        Args:
            app_id (str): 应用ID

        Returns:
            dict: 删除操作结果

        Raises:
            ValueError: 当应用不存在、被引用或权限不足时抛出
        """
        self.check_can_admin()
        client = AppService()
        app_model = client.get_app(app_id)

        self.check_can_admin_object(app_model)
        if ReferManager.is_app_refered(app_model.id):
            raise ValueError("该应用正在被引用, 不能删除")

        if client.can_delete(app_model):
            LogService().add(Module.APP_STORE, Action.DELETE_APP, name=app_model.name)
            client.delete_app(app_model)
        return {"result": "success"}, 204


class AppEnableApi(Resource):
    @login_required
    @require_internet_feature("应用服务启停")
    def post(self, app_id):
        """启用或禁用应用服务。

        Args:
            app_id (str): 应用ID
            enable_api (bool, required): 是否启用API服务

        Returns:
            Response: SSE流式响应，包含启动或停止服务的状态

        Raises:
            ValueError: 当应用未发布、工作流不存在或GPU配额不足时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "enable_api", required=True, type=inputs.boolean, location="json"
        )
        args = parser.parse_args()

        client = AppService()
        app_model = client.get_app(app_id)
        if app_model.status != "normal":
            raise ValueError("应用还没有发布")

        workflow = WorkflowService().get_published_workflow(app_id)
        if workflow is None:
            raise ValueError("应用还没有发布")

        self.check_can_write_object(app_model)
        args.setdefault("description",app_model.description)
        if args["enable_api"] is True:
            # 检查gpu配额
            gpu_count = workflow.refer_model_count
            current_user.current_tenant.check_gpu_available(gpu_count)

            app_run = AppRunService.create(app_model, mode="publish")

            def generate():
                event_handler: EventHandler = yield from app_run.start_stream(
                    workflow.nested_graph_dict
                )

                client.update_app(app_model, args=args)
                LogService().add(
                    Module.APP_STORE, Action.ENABLE_APP, name=app_model.name
                )

                if event_handler.is_success():
                    # current_user.current_tenant.gpu_used += gpu_count
                    db.session.commit()

            return Response(
                stream_with_context(generate()),
                status=200,
                mimetype="text/event-stream",
            )

        if args["enable_api"] is False:
            app_model = client.update_app(app_model, args=args)
            LogService().add(
                module=Module.APP_STORE, action=Action.DISABLE_APP, name=app_model.name
            )

            app_run = AppRunService.create(app_model, mode="publish")

            def generate():
                event_handler: EventHandler = yield from app_run.stop_stream()
                if event_handler.is_success():
                    current_user.current_tenant.gpu_used = max(
                        0,
                        current_user.current_tenant.gpu_used
                        - workflow.refer_model_count,
                    )
                    db.session.commit()

            return Response(
                stream_with_context(generate()),
                status=200,
                mimetype="text/event-stream",
            )


class AppEnableBackflow(Resource):
    @login_required
    def post(self, app_id):
        """启用或禁用数据回流功能。

        Args:
            app_id (str): 应用ID
            enable_backflow (bool, required): 是否启用回流功能

        Returns:
            dict: 更新后的应用信息

        Raises:
            ValueError: 当应用不存在或权限不足时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "enable_backflow", required=True, type=inputs.boolean, location="json"
        )
        args = parser.parse_args()

        client = AppService()
        app_model = client.get_app(app_id)
        self.check_can_write_object(app_model)

        if args["enable_backflow"] is True and app_model.enable_backflow is False:
            RefluxHelper(current_user).create_backflow(app_model)

        app_model = client.update_app(app_model, args)
        return marshal(app_model, fields.app_detail_fields)


class AppConvertToTemplate(Resource):
    @login_required
    def post(self):
        """将应用转换为模板。

        Args:
            id (str, required): 应用ID
            name (str, optional): 模板名称
            description (str, optional): 模板描述
            icon (str, optional): 模板图标
            icon_background (str, optional): 图标背景色
            categories (list, optional): 模板分类

        Returns:
            dict: 转换操作结果

        Raises:
            ValueError: 当应用未发布或名称重复时抛出
        """
        parser = get_create_app_parser()
        parser.add_argument(
            "id", type=helper.uuid_value, required=True, location="json"
        )
        args = parser.parse_args()

        if args.get("name", ""):
            TemplateService().validate_name(current_user, args["name"])

        client = AppService()
        app_model = client.get_app(args["id"])
        self.check_can_write_object(app_model)

        template = client.convert_to_template(current_user, app_model, args)

        LogService().add(
            Module.APP_STORE,
            Action.ADD_TEMPLATE,
            app_name=app_model.name,
            t_name=template.name,
        )
        return {"result": "success"}, 201


class AppExportApi(Resource):
    @login_required
    def get(self, app_id):
        """导出应用配置。

        Args:
            app_id (str): 应用ID
            format (str, optional): 导出格式，默认为文件下载
            version (str, optional): 版本，默认为draft

        Returns:
            Response: JSON数据或文件下载响应

        Raises:
            ValueError: 当应用不存在时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("format", type=str, required=False, location="args")
        parser.add_argument(
            "version", type=str, required=False, default="draft", location="args"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        result = marshal(app_model, fields.app_export_fields)
        workflow = Workflow.default_getone(app_id, args["version"])
        result["graph"] = workflow.nested_graph_dict if workflow else {}

        LogService().add(Module.APP_STORE, Action.EXPORT_APP, name=app_model.name)

        if args["format"] == "json":
            return result
        else:  # download file
            with tempfile.TemporaryDirectory() as tmpdirname:
                app_name = result.get("name") or ""
                filename = "{}-{}.json".format(
                    app_name, datetime.now().strftime("%Y%m%d%H%M%S")
                )
                with open(os.path.join(tmpdirname, filename), "w") as f_write:
                    f_write.write(json.dumps(result))
                return send_from_directory(tmpdirname, filename, as_attachment=True)


class AppImportFromFile(Resource):
    @login_required
    def post(self):
        """从文件导入应用。

        Args:
            file (FileStorage, required): 上传的应用配置文件

        Returns:
            dict: 新创建的应用信息

        Raises:
            ValueError: 当文件格式错误或创建失败时抛出
        """
        self.check_can_write()
        parser = reqparse.RequestParser()
        parser.add_argument("file", type=FileStorage, required=True, location="files")
        uploaded_file = parser.parse_args()["file"]

        rawdata = json.loads(uploaded_file.read())
        client = AppService()

        rawdata["name"] = client.auto_rename_app(
            rawdata.get("name") or "未命名"
        )  # 遇到重名自动命名
        app = client.create_app(current_user, rawdata)

        # 更新标签
        from parts.tag.model import Tag
        from parts.tag.tag_service import TagService

        TagService(current_user).update_tag_binding(
            Tag.Types.APP, app.id, rawdata.get("tags", [])
        )

        workflow = Workflow.new_empty(current_user, True, app_id=app.id)
        workflow.nested_update_graph(current_user, rawdata.get("graph", {}))

        db.session.add(workflow)
        db.session.commit()

        LogService().add(Module.APP_STORE, Action.CREATE_APP_DSL, name=app.name)

        return marshal(app, fields.app_detail_fields), 201


class DraftImportFromFile(Resource):
    @login_required
    def post(self, app_id):
        """从文件导入工作流到草稿。

        Args:
            app_id (str): 应用ID
            file (FileStorage, required): 上传的工作流配置文件

        Returns:
            dict: 导入操作结果

        Raises:
            ValueError: 当文件格式错误或应用不存在时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("file", type=FileStorage, required=True, location="files")
        uploaded_file = parser.parse_args()["file"]
        
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        rawdata = json.loads(uploaded_file.read())

        workflow = Workflow.default_getone(app_id, "draft")
        workflow.update_graph(rawdata.get("graph", {}))
        db.session.commit()
        return {}


class TemplateListApi(Resource):
    @login_required
    def get(self):
        """获取模板列表。

        Args:
            page (int, optional): 页码，默认为1
            limit (int, optional): 每页数量，默认为20
            search_name (str, optional): 搜索模板名称
            search_tags (str, optional): 搜索标签
            qtype (str, optional): 查询类型，默认为mine

        Returns:
            dict: 包含模板列表的分页数据

        Raises:
            ValueError: 当参数验证失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "page",
            type=inputs.int_range(1, 99999),
            required=False,
            default=1,
            location="args",
        )
        parser.add_argument(
            "limit",
            type=inputs.int_range(1, 100),
            required=False,
            default=20,
            location="args",
        )
        parser.add_argument("search_name", type=str, location="args", required=False)
        parser.add_argument("search_tags", type=str, location="args", required=False)
        parser.add_argument(
            "qtype", type=str, location="args", required=False, default="mine"
        )  # mine/group/builtin/already
        args = parser.parse_args()

        self.check_can_read()
        client = TemplateService()
        app_pagination = client.get_paginate_apps(current_user, args)
        if not app_pagination:
            return {"data": [], "total": 0, "page": 1, "limit": 20, "has_more": False}
        return marshal(app_pagination, fields.app_pagination_fields)


class TemplateDetailApi(Resource):
    @login_required
    def get(self, app_id):
        """获取模板详情。

        Args:
            app_id (str): 模板ID

        Returns:
            dict: 模板详细信息

        Raises:
            ValueError: 当模板不存在时抛出
        """
        template = TemplateService().get_app(app_id)
        self.check_can_read_object(template)
        return marshal(template, fields.app_detail_fields)

    @login_required
    def put(self, app_id):
        """更新模板信息。

        Args:
            app_id (str): 模板ID
            name (str, optional): 模板名称
            description (str, optional): 模板描述
            icon (str, optional): 模板图标
            icon_background (str, optional): 图标背景色
            categories (list, optional): 模板分类

        Returns:
            dict: 更新后的模板信息

        Raises:
            ValueError: 当模板不存在或名称重复时抛出
        """
        parser = get_create_app_parser()
        args = parser.parse_args()

        client = TemplateService()
        template = client.get_app(app_id)
        self.check_can_write_object(template)

        if args.get("name") != template.name:  # 如果改名需要重新验证唯一性
            client.validate_name(current_user, args["name"])

        template = client.update_app(template, args)
        return marshal(template, fields.app_detail_fields)

    @login_required
    def delete(self, app_id):
        """删除模板。

        Args:
            app_id (str): 模板ID

        Returns:
            dict: 删除操作结果

        Raises:
            ValueError: 当模板不存在或权限不足时抛出
        """
        client = TemplateService()
        template = client.get_app(app_id)
        self.check_can_admin_object(template)

        client.delete_app(template)
        return {"result": "success"}, 204


class TemplateConvertToApp(Resource):
    @login_required
    @marshal_with(fields.app_detail_fields)
    def post(self):
        """将模板转换为应用。

        Args:
            id (str, required): 模板ID
            name (str, optional): 应用名称
            description (str, optional): 应用描述
            icon (str, optional): 应用图标
            icon_background (str, optional): 图标背景色
            categories (list, optional): 应用分类

        Returns:
            App: 新创建的应用实例

        Raises:
            ValueError: 当模板不存在或名称重复时抛出
        """
        self.check_can_write()
        parser = get_create_app_parser()
        parser.add_argument(
            "id", type=str, required=True, nullable=False, location="json"
        )
        args = parser.parse_args()

        AppService().validate_name(current_user, args["name"])

        client = TemplateService()
        template = client.get_app(args["id"])
        if template:
            self.check_can_read_object(template)

        app = client.convert_to_app(current_user, template, args)
        LogService().add(Module.APP_STORE, Action.CREATE_APP_TMP, name=app.name)
        return app, 201


class AppReportApi(Resource):
    # 该接口不允许登录
    def post(self):
        """接收引擎报告回调数据。

        Args:
            id (str, required): 节点ID
            sessionid (str, required): 会话ID
            timecost (float, optional): 耗时
            prompt_tokens (int, optional): 提示词token数
            completion_tokens (int, optional): 完成token数
            input (str, optional): 输入内容
            output (str, optional): 输出内容

        Returns:
            None: 无返回值

        Raises:
            Exception: 当数据处理失败时抛出
        """
        rawdata = request.json
        logging.info(f"get report: {json.dumps(rawdata)}")
        prompt_tokens = rawdata.get("prompt_tokens", 0)
        completion_tokens = rawdata.get("completion_tokens", 0)
        if prompt_tokens < 0:
            prompt_tokens = 0
        if completion_tokens < 0:
            completion_tokens = 0

        try:
            node_id = rawdata["id"]
            tokens = prompt_tokens + completion_tokens
            cost_time = rawdata.get("timecost", 0.0)
            split = rawdata["sessionid"].split(":")
            app_id = split[0]
            mode = split[1]  # mode = draft/publish/node
            user_id = split[2]  # noqa 暂时废弃
            track_id = split[4]
            turn_number = int(split[5]) if split[5] else 1
        except Exception:
            # logging.exception(e)
            return

        # 1. 费用审计记录tokens
        # 类型需要转为费用审计模块所需格式
        # if tokens > 0:
        call_type = {
            "draft": "debug",
            "publish": "release",
            "fine_tune": "fine_tune",
            "evaluation": "evaluation",
        }.get(mode, mode)
        CostService.add(user_id, app_id, tokens, call_type, track_id, cost_time)

        # 2. 数据回流
        try:
            state_manager = RedisStateManager(app_id, mode)
            nodes_map = state_manager.get_graph_nodes_map()
            if (
                mode == "publish"
                and node_id in nodes_map
                and nodes_map[node_id].get("extras-enable_backflow")
            ):
                node_title = nodes_map[node_id].get("extras-title", "")
                app_model = App.query.get(app_id)
                if app_model and app_model.enable_backflow:
                    data = {
                        "app_id": app_id,
                        "app_name": app_model.name,
                        "module_id": node_id,
                        "module_name": node_title,
                        "module_type": "node",
                        "output_time": TimeTools.get_china_now(),
                        "module_input": rawdata["input"],
                        "module_output": rawdata["output"],
                        "conversation_id": track_id,
                        "turn_number": str(turn_number),
                        "is_satisfied": True,
                        "user_feedback": "",
                    }
                    reflux.create_reflux_data(data)
                    # reflux.update_reflux_data_feedback(data)
        except Exception as e:
            logging.info(f"处理node数据回流时发生异常: {e}")

        # 3. 显示逐步调试信息
        nodedata = nodes_map.get(node_id, None)
        if (mode == "draft" or mode == "node") and nodedata is not None:
            # eg. node_id = draft-48f9e95a-e54c-4812-a41b-f61f635816b8-1731324014737
            front_node_id = node_id.split("-")[-1]
            node_finished = {
                "node_id": front_node_id,
                "node_type": nodedata.get("kind", ""),
                "title": nodedata.get("extras-title", ""),
                "inputs": rawdata["input"],
                "outputs": rawdata["output"],
                "status": "succeeded",
                "elapsed_time": rawdata.get("timecost", 0),
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "sessionid": track_id,
                "turn_number": turn_number,
            }
            state_manager.set_detail(node_finished, turn_number)


class DraftDebugDetailApi(Resource):

    def get(self, app_id, mode="draft"):
        """获取调试详情信息。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft
            conversation_type (str, optional): 对话类型，"single"表示单轮对话，"multi"表示多轮对话，默认为"single"

        Returns:
            dict: 调试详情数据

        Raises:
            Exception: 当获取数据失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "conversation_type",
            type=str,
            required=False,
            default="single",
            location="args",
            help="对话类型：single(单轮对话) 或 multi(多轮对话)",
        )
        args = parser.parse_args()

        return RedisStateManager(app_id, mode).get_detail(
            conversation_type=args.conversation_type
        )


class AppEnableApiCall(Resource):
    @login_required
    def post(self, app_id):
        """启用或禁用API调用功能。

        Args:
            app_id (str): 应用ID
            enable_api_call (str, required): 是否启用API调用，值为'0'或'1'

        Returns:
            dict: 操作结果消息

        Raises:
            ValueError: 当应用未启动或参数错误时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument("enable_api_call", required=True, type=str, location="json")
        args = parser.parse_args()
        client = AppService()
        app_model = client.get_app(app_id)
        create_account = app_model.created_by_account
        if not create_account:
            return {"message": "应用创建者不存在"}, 400

        if create_account.is_administrator and not current_user.is_administrator:
            return {"message": "该应用只能administrator用户修改"}, 400

        # 权限校验
        self.check_can_write_object(app_model)
        # 校验 enable_api_call 只能为 '0' 或 '1'
        if args["enable_api_call"] not in ("0", "1"):
            return {"message": "enable_api_call参数 只能为'0'或'1'"}, 401
        if app_model.enable_api != True:
            return {"message": "应用未启动，请先启动！"}, 401
        # 更新 enable_api_call 字段
        if app_model.enable_api_call == args["enable_api_call"]:
            return {"message": "应用已处于该状态"}, 401
        app_model.enable_api_call = args["enable_api_call"]
        db.session.commit()
        if app_model.enable_api_call == "1":
            return {"message": "开启成功"}, 200
        else:
            return {"message": "关闭成功"}, 200


class SSEStreamManager:
    """SSE流管理器，支持远程停止功能和连接管理"""

    def __init__(self, app_id, mode="draft"):
        self.app_id = app_id
        self.mode = mode
        self.stop_key = f"sse_stop:{app_id}:{mode}"
        self.connections_key = f"sse_connections:{app_id}:{mode}"
        self.max_connections = 10  # 每个应用最大并发连接数

    def _build_stop_key(self, connection_id: str | None = None) -> str:
        if connection_id:
            return f"{self.stop_key}:{connection_id}"
        return self.stop_key

    def set_stop_signal(self, connection_id: str | None = None):
        """设置停止信号（可按connection_id精确停止，缺省为全局停止）"""
        key = self._build_stop_key(connection_id)
        redis_client.setex(key, 60, "stop")  # 60秒过期

    def check_stop_signal(self, connection_id: str) -> bool:
        """检查是否对该连接有停止信号（检查全局和该连接专属）。"""
        # 全局停止
        if redis_client.exists(self.stop_key):
            return True
        # 指定连接停止
        per_conn_key = self._build_stop_key(connection_id)
        return bool(redis_client.exists(per_conn_key))

    def clear_stop_signal(
        self, connection_id: str | None = None, clear_global: bool = False
    ):
        """清除停止信号。
        默认只清理当前连接的停止信号；如需清除全局停止信号，设置 clear_global=True。
        """
        if connection_id:
            redis_client.delete(self._build_stop_key(connection_id))
        if clear_global:
            redis_client.delete(self.stop_key)

    def add_connection(self, connection_id):
        """添加连接"""
        try:
            current_connections = redis_client.scard(self.connections_key)
            if current_connections >= self.max_connections:
                return False, f"已达到最大连接数限制 ({self.max_connections})"

            redis_client.sadd(self.connections_key, connection_id)
            redis_client.expire(self.connections_key, 3600)  # 1小时过期
            return True, f"连接已添加，当前连接数: {current_connections + 1}"
        except Exception as e:
            return False, f"添加连接失败: {str(e)}"

    def remove_connection(self, connection_id):
        """移除连接"""
        try:
            redis_client.srem(self.connections_key, connection_id)
            return True, "连接已移除"
        except Exception as e:
            return False, f"移除连接失败: {str(e)}"

    def get_connection_count(self):
        """获取当前连接数"""
        try:
            return redis_client.scard(self.connections_key)
        except Exception:
            return 0

    def get_all_connections(self):
        """获取所有连接ID"""
        try:
            return list(redis_client.smembers(self.connections_key))
        except Exception:
            return []


class DraftDebugDetailStreamApi(Resource):
    def get(self, app_id, mode="draft"):
        """实时SSE推送逐步调试信息。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft
            conversation_type (str, optional): 对话类型，"single"表示单轮对话，"multi"表示多轮对话，默认为"single"

        Returns:
            Response: SSE流式响应

        Raises:
            Exception: 当流式推送失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "conversation_type",
            type=str,
            required=False,
            default="single",
            location="args",
            help="对话类型：single(单轮对话) 或 multi(多轮对话)",
        )
        args = parser.parse_args()
        conversation_type = args.conversation_type

        def event_stream():
            state_manager = RedisStateManager(app_id, mode)
            stream_manager = SSEStreamManager(app_id, mode)
            last_index = -1
            start_time = time.time()
            max_duration = 3600  # 最大运行1小时
            last_data_time = time.time()
            max_idle_time = 300  # 最大空闲5分钟

            # 生成唯一的连接ID
            connection_id = f"{app_id}_{mode}_{int(time.time() * 1000)}"

            try:
                # 尝试添加连接
                success, message = stream_manager.add_connection(connection_id)
                if not success:
                    yield f"data: {json.dumps({'type': 'error', 'message': message}, ensure_ascii=False)}\n\n"
                    return

                # 清除本连接之前的停止信号（不影响全局）
                stream_manager.clear_stop_signal(connection_id)

                # 发送连接成功消息
                yield f"data: {json.dumps({'type': 'connected', 'message': message, 'connection_id': connection_id}, ensure_ascii=False)}\n\n"

                while True:
                    # 检查客户端连接状态
                    if hasattr(request, "environ") and request.environ.get(
                        "wsgi.input"
                    ):
                        try:
                            # 尝试检测连接是否断开
                            if request.environ["wsgi.input"].closed:
                                break
                        except (KeyError, AttributeError):
                            # 如果无法检测连接状态，继续运行
                            pass

                    # 检查远程停止信号（优先检查针对本连接或全局的停止）
                    if stream_manager.check_stop_signal(connection_id):
                        yield f"data: {json.dumps({'type': 'stopped', 'message': 'Stream stopped remotely', 'connection_id': connection_id}, ensure_ascii=False)}\n\n"
                        break

                    # 检查运行时间超时
                    if time.time() - start_time > max_duration:
                        yield f"data: {json.dumps({'type': 'timeout', 'message': 'Stream timeout after 1 hour', 'connection_id': connection_id}, ensure_ascii=False)}\n\n"
                        break

                    # 检查空闲时间超时
                    if time.time() - last_data_time > max_idle_time:
                        yield f"data: {json.dumps({'type': 'idle_timeout', 'message': 'No new data for 5 minutes', 'connection_id': connection_id}, ensure_ascii=False)}\n\n"
                        break

                    current_len = state_manager.get_detail_length(
                        conversation_type=conversation_type
                    )
                    # 如果被清空了，说明本次会话结束，通知前端并关闭连接
                    if current_len == 0:
                        if last_index != -1:
                            yield f"data: {json.dumps({'type': 'stopped', 'message': '会话结束，连接关闭', 'connection_id': connection_id}, ensure_ascii=False)}\n\n"
                            break
                        # 初始阶段（尚无任何数据）则继续等待
                    elif current_len > last_index + 1:
                        new_data = state_manager.get_detail_since(
                            last_index, conversation_type=conversation_type
                        )
                        for item in new_data:
                            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
                        last_index = current_len - 1
                        last_data_time = time.time()  # 更新最后数据时间

                    time.sleep(1)

            except Exception as e:
                # 发送错误信息给客户端
                error_data = {
                    "type": "error",
                    "message": f"Stream error: {str(e)}",
                    "timestamp": time.time(),
                    "connection_id": connection_id,
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
                # 记录错误日志
                print(f"SSE stream error for app {app_id}: {str(e)}")
            finally:
                # 清理连接和停止信号
                stream_manager.remove_connection(connection_id)
                stream_manager.clear_stop_signal(connection_id)

        return Response(
            stream_with_context(event_stream()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            },
        )


class DraftDebugDetailHistoryApi(Resource):
    def get(self, app_id, mode="draft"):
        """获取历史逐步调试信息。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft
            limit (int, optional): 限制返回的turn_number组数量

        Returns:
            dict: 历史调试信息

        Raises:
            Exception: 当获取历史数据失败时抛出
        """
        parser = reqparse.RequestParser()
        parser.add_argument(
            "limit",
            type=int,
            required=False,
            location="args",
            help="限制返回的turn_number组数量，不传则返回全部数据",
        )
        args = parser.parse_args()

        limit = args.get("limit")
        return RedisStateManager(app_id, mode).get_detail_history(limit=limit)


class DraftDebugDetailHistoryDeleteApi(Resource):
    def delete(self, app_id, mode="draft"):
        """删除历史逐步调试信息。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft

        Returns:
            dict: 删除操作结果

        Raises:
            Exception: 当删除失败时抛出
        """
        RedisStateManager(app_id, mode).delete_detail_history(current_user.id)

        return {"result": "success"}, 200


class AppVersion(Resource):
    def get(self, app_id):
        app_versions = AppService().get_app_versions(app_id)
        return marshal(app_versions, fields.app_versions_fields)


class CheckVersionsCount(Resource):
    @login_required
    def get(self, app_id):
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)
        version_count = AppService().get_version_count(app_id)
        message = ""
        is_over_limit = False
        if version_count >= 10:
            is_over_limit = True
            message = "版本数量已达10个上限，发布将删除最早版本，确认继续？"
        return {"is_over_limit": is_over_limit, "message": message}


class AppRestore(Resource):
    def post(self, app_id):
        parser = reqparse.RequestParser()
        parser.add_argument("version", required=True, type=str, location="json")
        args = parser.parse_args()

        app_version_info = AppService().get_specific_app_versions(
            app_id=app_id, version=args["version"]
        )
        file_path = app_version_info.file_path

        if not os.path.exists(file_path):
            raise FileNotFoundError("当前版本记录不存在")

        with open(file_path, "r", encoding="utf-8") as f:
            rawdata = json.load(f)

        workflow = WorkflowService().get_draft_workflow(app_id)
        workflow.nested_update_graph(current_user, rawdata.get("graph", {}))
        db.session.commit()

        LogService().add(
            Module.APP_STORE, Action.CREATE_APP_DSL, name=rawdata.get("name", "")
        )
        return {"message": "success"}


class ReferenceResult(Resource):
    def get(self, app_id):
        app = AppService().get_app(app_id)
        if not app.enable_api:
            return []

        refs = AppService().get_ref_apps(app_id)
        return marshal(refs, fields.app_ref_fields)


class DraftDebugDetailStreamStopApi(Resource):
    def post(self, app_id, mode="draft"):
        """远程停止SSE流。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft
            connection_id (str, optional, in body): 连接ID；提供则精准停止该连接，否则全局停止

        Returns:
            dict: 停止操作结果

        Raises:
            Exception: 当停止失败时抛出
        """
        try:
            parser = reqparse.RequestParser()
            parser.add_argument(
                "connection_id", type=str, required=False, location="json"
            )
            args = parser.parse_args()

            stream_manager = SSEStreamManager(app_id, mode)
            connection_id = args.get("connection_id")
            stream_manager.set_stop_signal(connection_id)

            scope = connection_id or "global"
            return {
                "result": "success",
                "message": "Stop signal sent",
                "scope": scope,
            }, 200
        except Exception as e:
            return {
                "result": "error",
                "message": f"Failed to stop stream: {str(e)}",
            }, 500


class DraftDebugDetailStreamStatusApi(Resource):
    def get(self, app_id, mode="draft"):
        """获取SSE流连接状态。

        Args:
            app_id (str): 应用ID
            mode (str, optional): 模式，默认为draft

        Returns:
            dict: 连接状态信息

        Raises:
            Exception: 当获取状态失败时抛出
        """
        try:
            stream_manager = SSEStreamManager(app_id, mode)
            connection_count = stream_manager.get_connection_count()
            all_connections = stream_manager.get_all_connections()

            return {
                "result": "success",
                "app_id": app_id,
                "mode": mode,
                "connection_count": connection_count,
                "max_connections": stream_manager.max_connections,
                "connections": all_connections,
                "timestamp": time.time(),
            }, 200
        except Exception as e:
            return {
                "result": "error",
                "message": f"Failed to get status: {str(e)}",
            }, 500


api.add_resource(AppListApi, "/apps")
api.add_resource(AppListPageApi, "/apps/list/page")

api.add_resource(AppDetailApi, "/apps/<uuid:app_id>")
api.add_resource(AppEnableApi, "/apps/<uuid:app_id>/enable_api")
api.add_resource(AppEnableBackflow, "/apps/<uuid:app_id>/enable_backflow")

api.add_resource(AppConvertToTemplate, "/apps/to/apptemplate")
api.add_resource(AppExportApi, "/apps/<uuid:app_id>/export")
api.add_resource(DraftImportFromFile, "/apps/<uuid:app_id>/workflows/draft/import")
api.add_resource(AppImportFromFile, "/apps/import")
api.add_resource(AppEnableApiCall, "/apps/<uuid:app_id>/enable_api_call")

api.add_resource(TemplateListApi, "/apptemplate")
api.add_resource(TemplateDetailApi, "/apptemplate/<uuid:app_id>")
api.add_resource(TemplateConvertToApp, "/apptemplate/to/apps")

api.add_resource(AppReportApi, "/app/report")
api.add_resource(
    DraftDebugDetailApi, "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail"
)
api.add_resource(
    DraftDebugDetailStreamApi,
    "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail/stream",
)
api.add_resource(
    DraftDebugDetailHistoryApi,
    "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail/history",
)
api.add_resource(
    DraftDebugDetailHistoryDeleteApi,
    "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail/history",
)
api.add_resource(
    DraftDebugDetailStreamStopApi,
    "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail/stream/stop",
)
api.add_resource(
    DraftDebugDetailStreamStatusApi,
    "/apps/<uuid:app_id>/workflows/<string:mode>/debug-detail/stream/status",
)


api.add_resource(AppVersion, "/apps/<uuid:app_id>/versions")
api.add_resource(AppRestore, "/apps/<uuid:app_id>/versions/restore")
api.add_resource(CheckVersionsCount, "/apps/<uuid:app_id>/versions/check-count")
api.add_resource(ReferenceResult, "/apps/<uuid:app_id>/reference-result")
