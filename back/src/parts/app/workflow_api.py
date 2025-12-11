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
import re
from datetime import datetime, timezone

from flask import Response, abort, request, stream_with_context
from flask_login import current_user
from flask_restful import marshal, reqparse
from libs.timetools import TimeTools
import lazyllm
from lazyllm.engine.engine import setup_deploy_method
from lazyllm.tools.rag.utils import DocListManager

from core.restful import Resource
from libs import helper
from libs.feature_gate import require_internet_feature
from libs.http_exception import BaseHTTPError
from libs.login import login_required
from parts.app.node_run.app_run_service import AppRunService, EventHandler
from parts.app.node_run.debug_session_manager import DebugSessionManager
from parts.inferservice import service
from parts.logs import Action, LogService, Module
from parts.models_hub.model import AITools, LazymodelOnlineModels
from parts.models_hub.service import ModelService
from parts.urls import api
from utils.util_database import db

from . import fields
from .app_service import AppService, TemplateService, WorkflowService
from .model import Workflow
from .refer_service import ReferManager
from .reflux_helper import RefluxHelper


class DraftWorkflowNotExist(BaseHTTPError):
    error_code = "draft_workflow_not_exist"
    description = "Draft workflow need to be initialized."
    code = 400


class DraftWorkflowNotSync(BaseHTTPError):
    error_code = "draft_workflow_not_sync"
    description = "该画布正在编辑中,请刷新重试"
    code = 400


class DraftWorkflowApi(Resource):
    @login_required
    def get(self, app_id):
        """获取草稿工作流。

        Args:
            app_id (str): 应用ID

        Returns:
            dict: 草稿工作流信息

        Raises:
            DraftWorkflowNotExist: 当草稿工作流不存在时抛出
        """
        workflow = WorkflowService().get_draft_workflow(app_id)
        if not workflow:
            raise DraftWorkflowNotExist()

        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_read_object(app_model)

        workflow_dict = marshal(workflow, fields.workflow_fields)
        if workflow:
            new_graph = workflow_dict.get("graph", {})
            workflow.update_resource_ref_status(new_graph.get("resources", []))

        return workflow_dict

    @login_required
    def post(self, app_id):
        """同步草稿工作流。

        Args:
            app_id (str): 应用ID
            graph (dict, required): 工作流图配置
            hash (str, optional): 工作流哈希值

        Returns:
            dict: 同步结果

        Raises:
            DraftWorkflowNotSync: 当工作流不同步时抛出
        """

        content_type = request.headers.get("Content-Type", "")
        if "application/json" in content_type:
            parser = reqparse.RequestParser()
            parser.add_argument(
                "graph", type=dict, required=True, nullable=False, location="json"
            )
            parser.add_argument("hash", type=str, required=False, location="json")
            args = parser.parse_args()
        elif "text/plain" in content_type:
            try:
                data = json.loads(request.data.decode("utf-8"))
                args = {
                    "graph": data.get("graph") or {},
                    "hash": data.get("hash"),
                }
            except json.JSONDecodeError:
                return {"message": "Invalid JSON data"}, 400
        else:
            abort(415)

        workflow = WorkflowService().get_draft_workflow(app_id)

        if workflow and workflow.unique_hash != args.get("hash"):
            raise DraftWorkflowNotSync()

        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        graph = args.get("graph", {})
        if not workflow:  # create draft workflow if not found
            workflow = Workflow.new_empty(current_user, True, app_id=app_id)
            workflow.update_graph(graph)
            db.session.add(workflow)
            db.session.commit()
        else:  # update draft workflow if found
            workflow.updated_by = current_user.id
            workflow.updated_at = TimeTools.now_datetime_china()
            workflow.update_graph(graph)
            db.session.commit()

        return {
            "result": "success",
            "hash": workflow.unique_hash,
            "updated_at": helper.TimestampField().format(
                workflow.updated_at or workflow.created_at
            ),
        }


class DraftWorkflowStatusApi(Resource):
    @login_required
    def get(self, app_id):
        """查询草稿调试的状态"""
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_read_object(app_model)
            
        if not app_model:
            return {"status": "stop"}
        app_run = AppRunService.create(app_model, mode="draft")
        return app_run.redis_client().get_status()


class DraftWorkflowStartApi(Resource):
    @login_required
    @require_internet_feature("应用调试启动")
    def post(self, app_id):
        """开始草稿调试"""
        workflow = WorkflowService().get_draft_workflow(app_id)
        app_model = AppService().get_app(app_id, raise_error=False)

        if app_model:
            self.check_can_write_object(app_model)

        # 检查gpu配额
        gpu_count = workflow.refer_model_count
        current_user.current_tenant.check_gpu_available(gpu_count)

        app_run = AppRunService.create(app_model, mode="draft")

        def generate():
            event_handler: EventHandler = yield from app_run.start_stream(
                workflow.nested_graph_dict
            )
            if event_handler.is_success():
                current_user.current_tenant.gpu_used += gpu_count
                db.session.commit()

        return Response(
            stream_with_context(generate()), status=200, mimetype="text/event-stream"
        )


class DraftWorkflowRunApi(Resource):
    @login_required
    @require_internet_feature("应用预览运行")
    def post(self, app_id):
        """运行草稿调试"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "inputs", type=list, required=True, nullable=False, location="json"
        )
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)
            
        # 创建调试会话管理器，获取下一个交互轮次turn_number
        session_manager = DebugSessionManager(app_id, current_user.id, mode="draft")
        session_manager.get_next_turn_number()

        app_run = AppRunService.create(app_model, mode="draft")
        generator = app_run.run_stream(
            args.inputs, args.files, account=current_user, turn_number=-1
        )
        return Response(
            stream_with_context(generator), status=200, mimetype="text/event-stream"
        )


class DraftWorkflowStopApi(Resource):
    @login_required
    def post(self, app_id):
        """结束草稿调试"""
        workflow = WorkflowService().get_draft_workflow(app_id)
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        app_run = AppRunService.create(app_model, mode="draft")
        app_run.stop()
        draft_session_manager = DebugSessionManager(
            app_id, current_user.id, mode="draft"
        )
        draft_session_manager.reset_session()

        def generate():
            event_handler: EventHandler = yield from app_run.stop_stream()
            if event_handler.is_success():
                current_user.current_tenant.gpu_used = max(
                    0, current_user.current_tenant.gpu_used - workflow.refer_model_count
                )
                db.session.commit()

        return Response(
            stream_with_context(generate()), status=200, mimetype="text/event-stream"
        )


class DraftWorkflowResetSessionApi(Resource):
    @login_required
    def post(self, app_id):
        """重置调试会话"""
        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        # 重置草稿模式的调试会话
        draft_session_manager = DebugSessionManager(
            app_id, current_user.id, mode="draft"
        )
        draft_session_manager.reset_session()

        # 重置节点模式的调试会话
        node_session_manager = DebugSessionManager(app_id, current_user.id, mode="node")
        node_session_manager.reset_session()

        return {"result": "success", "message": "调试会话已重置"}


class NodeRunStreamApi(Resource):
    @login_required
    @require_internet_feature("节点运行")
    def post(self, app_id, node_id):
        """运行单节点调试(流式输出)"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "inputs", type=list, required=True, nullable=False, location="json"
        )
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(app_id)
        if app_model:
            self.check_can_write_object(app_model)
        
        workflow = WorkflowService().get_draft_workflow(app_id)

        # 创建调试会话管理器，获取下一个交互轮次turn_number
        session_manager = DebugSessionManager(app_id, current_user.id, mode="node")
        session_manager.get_next_turn_number()

        app_run = AppRunService.create(app_model, mode="node", node_id=node_id)
        app_run.start(workflow.nested_graph_dict)
        generator = app_run.run_stream(
            args.inputs, args.files, account=current_user, turn_number=-1
        )
        return Response(
            stream_with_context(generator), status=200, mimetype="text/event-stream"
        )


class PublishedWorkflowApi(Resource):
    @login_required
    def get(self, app_id):
        """Get published workflow"""
        app_model = AppService().get_app(app_id)
        if app_model:
            self.check_can_read_object(app_model)
            
        if app_model.status == "normal":
            workflow = WorkflowService().get_published_workflow(app_id)
        else:
            workflow = None  # 认为未发布
        return marshal(workflow, fields.workflow_fields)

    @login_required
    @require_internet_feature("应用发布")
    def post(self, app_id):
        """Publish workflow"""
        parser = reqparse.RequestParser()
        parser.add_argument("version", required=True, type=str, location="json")
        parser.add_argument("description", required=True, type=str, location="json")
        args = parser.parse_args()

        app_service = AppService()
        app_model = app_service.get_app(app_id)

        self.check_can_write_object(app_model)
        if app_service.exist_version_exists(app_id=app_id, version=args["version"]):
            raise ValueError("APP版本已经存在，请更换")

        workflow = WorkflowService().publish_workflow(app_model, current_user)
        app_service.save_app_version(app_id, current_user.id, args)

        LogService().add(Module.APP_STORE, Action.PUBLISH_APP, name=app_model.name)

        if app_model.enable_backflow:
            RefluxHelper(current_user).create_backflow(app_model, workflow=workflow)

        return {
            "result": "success",
            "publish_at": helper.TimestampField().format(workflow.updated_at),
        }


class CancelPublishApi(Resource):
    @login_required
    def post(self, app_id):
        """cancel publish workflow"""

        # parser.add_argument('version', required=True, type=str, location='json')

        app_model = AppService().get_app(app_id)
        self.check_can_write_object(app_model)

        refer = ReferManager.is_app_refered(app_model.id)
        if refer:
            AppService().get_app(refer.app_id, raise_error=False)
            # other_name = other_app.name if other_app else ""
            # raise ValueError(f"该应用已被【{other_name}】应用引用，不能取消发布。")

        # db.session.query(Workflow).filter_by(app_id=app_id, version='publish').delete()
        app_model.api_url = None
        app_model.enable_api = False
        app_model.enable_api_call = "0"
        app_model.workflow_id = None
        app_model.status = "draft"
        db.session.commit()

        AppService().update_app_last_version_status(app_id, False)
        return {"result": "success"}


class NewWorkflowFromEmpty(Resource):
    @login_required
    def post(self):
        """创建空白workflow"""
        self.check_can_write()
        new_workflow = Workflow.new_empty(current_user, False)
        db.session.add(new_workflow)
        db.session.commit()
        return {"app_id": new_workflow.app_id}


class NewWorkflowFromApp(Resource):
    @login_required
    def post(self):
        """拖拽app创建新的流程"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "app_id", type=helper.uuid_value, required=True, location="json"
        )
        parser.add_argument(
            "main_app_id", type=helper.uuid_value, required=True, location="json"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(args["app_id"])
        if app_model:
            self.check_can_read_object(app_model)
        
        main_app_model = AppService().get_app(args["main_app_id"], raise_error=False)
        if main_app_model:
            self.check_can_write_object(main_app_model)

        new_workflow = WorkflowService().get_published_workflow(app_model.id)
        if not new_workflow:
            raise ValueError("未发布的应用不能创建子画布")

        main_workflow = WorkflowService().get_draft_workflow(
            args["main_app_id"]
        )  # 主画布
        fake_node = {
            "id": "id",
            "data": {
                "payload__kind": "App",
                "payload__patent_id": args["app_id"],
            },
        }
        fake_graph = main_workflow.flat_graph_dict
        fake_graph["nodes"].append(fake_node)
        main_workflow.update_graph(
            fake_graph
        )  # 调用但是不保存到数据库, 如果有死循环会报错

        return {"app_id": new_workflow.app_id}


class NewWorkflowFromTemplate(Resource):
    @login_required
    def post(self):
        """拖拽template创建新的流程"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "app_id", type=helper.uuid_value, required=True, location="json"
        )
        args = parser.parse_args()

        self.check_can_write()
        template = TemplateService().get_app(args["app_id"])
        if template:
            self.check_can_read_object(template)
        
        source_workflow = Workflow.default_getone(template.id, "publish")

        new_workflow = Workflow.new_empty(
            current_user, False, app_id=None, version="draft"
        )
        new_workflow = WorkflowService().clone_new_workflow(
            current_user, source_workflow, new_workflow
        )

        return {"app_id": new_workflow.app_id}


class WorkflowAddLog(Resource):
    @login_required
    def post(self):
        """添加(删除)资源(节点)时上报的日志"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "app_id", type=helper.uuid_value, required=True, location="json"
        )
        parser.add_argument("app_name", type=str, required=True, location="json")
        parser.add_argument("action", type=str, required=True, location="json")
        parser.add_argument("node_name", type=str, required=False, location="json")
        parser.add_argument("res_name", type=str, required=False, location="json")
        args = parser.parse_args()

        app_model = AppService().get_app(args["app_id"], raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        name = args["app_name"]
        action = "新增" if args["action"] == "add" else "删除"
        if args.get("node_name"):
            LogService().add(
                Module.APP_STORE,
                Action.UPDATE_APP_NODE,
                name=name,
                doing=action,
                node_name=args["node_name"],
            )
        elif args.get("res_name"):
            LogService().add(
                Module.APP_STORE,
                Action.UPDATE_APP_RESOURCE,
                name=name,
                doing=action,
                res_name=args["res_name"],
            )


class WorkflowBatchLog(Resource):
    @login_required
    @require_internet_feature("批量运行")
    def post(self):
        """批量调试时上报的结果日志"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "app_id", type=helper.uuid_value, required=True, location="json"
        )
        parser.add_argument("app_name", type=str, required=True, location="json")
        parser.add_argument("ok_count", type=int, required=True, location="json")
        parser.add_argument("fail_count", type=int, required=True, location="json")
        parser.add_argument("node_name", type=str, required=False, location="json")
        args = parser.parse_args()

        app_name = args["app_name"]
        node_name = args.get("node_name", "")
        ok_count = args["ok_count"]
        fail_count = args["fail_count"]

        app_model = AppService().get_app(args["app_id"], raise_error=False)
        if app_model:
            self.check_can_write_object(app_model)

        if node_name:
            LogService().add(
                Module.APP_STORE,
                Action.DEBUG_NODE_BATCH,
                name=app_name,
                node_name=node_name,
                ok=ok_count,
                fail=fail_count,
            )
        else:
            LogService().add(
                Module.APP_STORE,
                Action.DEBUG_APP_BATCH,
                name=app_name,
                ok=ok_count,
                fail=fail_count,
            )


class DocParseApi(Resource):
    @login_required
    @require_internet_feature("知识库数据解析")
    def post(self, app_id, doc_id):
        """Document节点数据解析"""
        parser = reqparse.RequestParser()
        parser.add_argument("paths", type=list, location="json")
        parser.add_argument("is_parse", type=bool, default=True, location="json")
        args = parser.parse_args()

        workflow = WorkflowService().get_draft_workflow(app_id)
        app_model = AppService().get_app(app_id, raise_error=False)

        if app_model:
            self.check_can_write_object(app_model)

        # # 检查gpu配额
        # gpu_count = workflow.refer_model_count
        # current_user.current_tenant.check_gpu_available(gpu_count)

        app_run = AppRunService.create(app_model, mode="node", node_id=doc_id)
        if args["is_parse"]:
            # 提前使用DocListManager创建好数据库，然后再实例化Document对象，避免使用DocListManager对象查询状态和使用Document对象解析文档时，同时创建数据库
            dlm = DocListManager(args["paths"][0], doc_id, enable_path_monitoring=False)
            group_name = "__default__"
            files_info = {
                file[0]: file[5] not in [dlm.Status.waiting, dlm.Status.working]
                for file in dlm.list_kb_group_files(
                    group=group_name, details=True, status=DocListManager.Status.all
                )
            }

            # 第一次解析
            if not files_info:
                app_run.run_single_rsource(
                    app_id, workflow.nested_graph_dict, doc_id, args["paths"]
                )
            # 已完成解析
            elif files_info and all(files_info.values()):
                # 重置文档解析状态为waiting
                dlm.update_kb_group(
                    files_info.keys(), group_name, new_status=dlm.Status.waiting
                )
                app_run.run_single_rsource(
                    app_id, workflow.nested_graph_dict, doc_id, args["paths"]
                )

        def generate():
            event_handler: (
                EventHandler
            ) = yield from WorkflowService().get_docs_progress(
                app_id, args["paths"], doc_id
            )
            if event_handler.is_success():
                # current_user.current_tenant.gpu_used += gpu_count
                db.session.commit()

        return Response(
            stream_with_context(generate()), status=200, mimetype="text/event-stream"
        )


class DocParseStatusApi(Resource):

    @login_required
    def post(self, app_id, doc_id):
        """查询Document节点数据解析状态"""
        parser = reqparse.RequestParser()
        parser.add_argument("paths", type=list, location="json")
        args = parser.parse_args()

        app_model = AppService().get_app(app_id, raise_error=False)
        if app_model:
            self.check_can_read_object(app_model)

        dlm = DocListManager(args["paths"][0], doc_id, enable_path_monitoring=False)
        group_name = "__default__"
        files_status = [
            file[5] not in [dlm.Status.waiting, dlm.Status.working]
            for file in dlm.list_kb_group_files(
                group=group_name, details=True, status=DocListManager.Status.all
            )
        ]

        return {"status": all(files_status)}


class AICodeAssistant(Resource):
    @login_required
    def post(self):
        """该函数用于处理AI代码助手的POST请求

        Args:
            无直接参数。请求体中应包含以下JSON字段：
                query (str): 用户输入的查询内容，必填。
                session (str, optional): 会话ID，用于多轮对话，选填。

        Returns:
                - 若成功，返回{"message": 结果, "session": session}, 200
                - 若失败，返回{"message": 错误信息, "session": session}, 400

        Raises:
            无直接抛出异常，所有异常均被捕获并返回错误信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("query", type=str, required=True, location="json")
        parser.add_argument("session", type=str, required=False, location="json")
        args = parser.parse_args()
        
        self.check_can_write()
        
        query = args["query"]
        session = args.get("session", "")
        model = AITools.query.filter(
            AITools.tenant_id == current_user.current_tenant_id,
            AITools.name.like("%代码智能生成%"),
        ).first()
        if not model:
            return {"message": "未设置模型", "session": session}, 400
        model_name = model.model_name
        filter_prompt = """
        ## 任务
        你是一个意图识别专家,具备极为敏锐的洞察力,能够迅速且精准地判断用户问题的意图类型。
        我需要你帮过滤用户的请求，判断请求是否和大模型提示语(prompt)有关

        ## 技能
        精准判断用户输入是否与生成代码有关，若有关回复1，若无关恢复2

        ## 回复格式要求
        - 仅回复1或2

        ### 示例
        #### 示例 1
        输入: 我感觉好无聊呀
        输出: 2

        #### 示例 2
        输入: 帮我写个代码，实现两数之和
        输出: 1

        #### 示例 3
        输入: 你是谁
        输出: 2

        ### 限制
        - 若遇到难以理解或把握不准的，统一回复2。
        """
        prompt_get_param = """
        ## 任务
        你是世界上最好的程序员，你将阅读用户提供的函数代码
        你的任务是将函数的参数和返回值标注出来，其中的每个参数需要详细说明它的名称(name)、描述(describe)、类型(type)、是否必填(require)
        参考如下的json字符串进行返回
        {"input":[{"name":"model","describe":"模型名称","type":"str","require":true},{"name":"source","describe":"模型厂商","type":"str","require":true}],
        "output":[{"name":"is_enable","describe":"模型是否可用","type":"bool"}]}
        """
        try:
            if model.inferservice.lower() == "local":
                model_name, service_name = model_name.split(":", 1)
                if not service_name:
                    llm = lazyllm.TrainableModule(model_name).start()
                else:
                    service_info = (
                        service.InferService().get_infer_model_service_by_name(
                            service_name
                        )
                    )
                    if service_info:
                        llm = lazyllm.TrainableModule(model_name)
                        setup_deploy_method(
                            llm, service_info["framework"], url=service_info["url"]
                        )
                    else:
                        return {
                            "message": f"发生错误,未找到模型{model_name}的推理服务:{service_name}",
                            "session": session,
                        }, 400
                filter = llm.share(filter_prompt)
                filte_res = filter(query)
                if "2" in filte_res:
                    return {
                        "message": "输入与生成代码无关，请重新组织语言",
                        "param": "",
                        "session": session,
                    }, 400
                else:
                    code_generaotr = lazyllm.tools.CodeGenerator(llm)
                    ret = code_generaotr(query)
            else:
                model = LazymodelOnlineModels.query.filter_by(
                    model_key=model_name
                ).first()
                if model is None:
                    return {
                        "message": f"找不到模型:{model_name}",
                        "session": session,
                    }, 400
                result = ModelService.get_model_apikey_by_id(model.model_id)
                api_key = result.get("api_key")
                secret_key = result.get("secret_key")
                source = result.get("source").lower()
                llm = lazyllm.OnlineChatModule(
                    model=model_name,
                    source=source,
                    api_key=api_key,
                    secret_key=secret_key,
                )
                filter = llm.share(filter_prompt)
                filte_res = filter(query)
                if "2" in filte_res:
                    return {
                        "message": "输入与生成代码无关，请重新组织语言",
                        "param": "",
                        "session": session,
                    }, 400
                else:
                    code_generaotr = lazyllm.tools.CodeGenerator(llm)
                    ret = code_generaotr(query)
        except Exception as e:
            msg = f"发生错误:{e}"
            msg = msg.replace("400 Bad Request:", "")
            return {"message": msg, "session": session}, 400
        param_extractor = llm.share(prompt_get_param)
        param = param_extractor(ret)
        pattern = r"```json(.*?)\n```"
        matches = re.findall(pattern, param, re.DOTALL)
        if len(matches) > 0:
            param = matches[0]
            param.strip()
        return {"message": ret, "param": param, "session": session}, 200


class AIPromptAssistant(Resource):
    @login_required
    def post(self):
        """处理AI提示语助手的POST请求。

        该函数用于处理AI提示语助手的POST请求，根据用户输入生成大模型提示语。
        首先通过意图识别过滤用户请求，然后使用配置的模型生成相应的提示语。

        Args:
            无直接参数。请求体中应包含以下JSON字段：
                query (str): 用户输入的查询内容，必填。
                session (str, optional): 会话ID，用于多轮对话，选填。

        Returns:
                - 若成功，返回{"message": 结果, "session": session}, 200
                - 若失败，返回{"message": 错误信息, "session": session}, 400

        Raises:
            无直接抛出异常，所有异常均被捕获并返回错误信息。
        """

        parser = reqparse.RequestParser()
        parser.add_argument("query", type=str, required=True, location="json")
        parser.add_argument("session", type=str, required=False, location="json")
        args = parser.parse_args()
        
        self.check_can_write()
        
        query = args["query"]
        session = args.get("session", "")
        filter_prompt = """
        ## 任务
        你是一个意图识别专家,具备极为敏锐的洞察力,能够迅速且精准地判断用户问题的意图类型。
        我需要你帮过滤用户的请求，判断请求是否和大模型提示语(prompt)有关

        ## 技能
        精准判断用户输入是否与生成大模型提示语(prompt)有关，若有关回复:和prompt有关，若无关回复：和prompt无关

        ## 回复格式要求
        - 仅回复"和prompt有关"或"和prompt无关"

        ### 示例
        #### 示例 1
        输入: 我感觉好无聊呀
        输出: 和prompt无关

        #### 示例 2
        输入: 帮我写个提示语，与医学科普相关
        输出: 和prompt有关

        #### 示例 3
        输入: 你是谁
        输出: 和prompt无关

        ### 限制
        - 若遇到难以理解或把握不准的，统一回复: 和prompt无关。
        """
        prompt = """
        ## 任务
        你是一个大模型提示词prompt工程专家，请根据用户输入生成一个给大模型的提示语prompt：
        """
        prompt = re.sub(r"\{\{(\w+)\}\}", r"\\{\\{\1\\}\\}", prompt)
        prompt = re.sub(r"\{(\w+)\}", r"\\{\1\\}", prompt)
        model = AITools.query.filter(
            AITools.tenant_id == current_user.current_tenant_id,
            AITools.name.like("%Prompt智能生成%"),
        ).first()
        if not model:
            return {"message": "未设置模型", "session": session}, 400
        model_name = model.model_name
        try:
            if model.inferservice.lower() == "local":
                model_name, service_name = model_name.split(":", 1)
                if not service_name:
                    llm = lazyllm.TrainableModule(model_name).start().prompt(prompt)
                else:
                    service_info = (
                        service.InferService().get_infer_model_service_by_name(
                            service_name
                        )
                    )
                    if service_info:
                        llm = lazyllm.TrainableModule(model_name)
                        setup_deploy_method(
                            llm, service_info["framework"], url=service_info["url"]
                        )
                        llm = llm.prompt(prompt)
                    else:
                        return {
                            "message": f"发生错误,未找到模型{model_name}的推理服务:{service_name}",
                            "session": session,
                        }, 400
                filter = llm.share(filter_prompt)
                filte_res = filter(query)
                if "和prompt有关" in filte_res:
                    ret = llm(query)
                else:
                    ret = "输入与生成提示语无关，请重新组织语言。示例：帮我写个提示语，与医学科普相关。"
                    
            else:
                model = LazymodelOnlineModels.query.filter_by(
                    model_key=model_name
                ).first()
                if model is None:
                    return {
                        "message": f"找不到模型:{model_name}",
                        "session": session,
                    }, 400
                result = ModelService.get_model_apikey_by_id(model.model_id)
                api_key = result.get("api_key")
                secret_key = result.get("secret_key")
                source = result.get("source").lower()
                llm = lazyllm.OnlineChatModule(
                    model=model_name,
                    source=source,
                    api_key=api_key,
                    secret_key=secret_key,
                ).prompt(prompt)
                filter = llm.share(filter_prompt)
                filte_res = filter(query)
                if "和prompt有关" in filte_res:
                    ret = llm(query)
                else:
                    ret = "输入与生成提示语无关，请重新组织语言。示例：帮我写个提示语，与医学科普相关。"
        except Exception as e:
            msg = f"发生错误:{e}"
            msg = msg.replace("400 Bad Request:", "")
            return {"message": msg, "session": session}, 400
        return {"message": ret, "session": session}, 200


api.add_resource(DraftWorkflowApi, "/apps/<uuid:app_id>/workflows/draft")
api.add_resource(DraftWorkflowStatusApi, "/apps/<uuid:app_id>/workflows/draft/status")
api.add_resource(DraftWorkflowStartApi, "/apps/<uuid:app_id>/workflows/draft/start")
api.add_resource(DraftWorkflowRunApi, "/apps/<uuid:app_id>/workflows/draft/run")
api.add_resource(DraftWorkflowStopApi, "/apps/<uuid:app_id>/workflows/draft/stop")
api.add_resource(
    DraftWorkflowResetSessionApi, "/apps/<uuid:app_id>/workflows/draft/reset_session"
)
api.add_resource(
    NodeRunStreamApi,
    "/apps/<uuid:app_id>/workflows/draft/nodes/<string:node_id>/run/stream",
)
api.add_resource(PublishedWorkflowApi, "/apps/<uuid:app_id>/workflows/publish")
api.add_resource(CancelPublishApi, "/apps/<uuid:app_id>/workflows/cancel_publish")

api.add_resource(NewWorkflowFromEmpty, "/apps/workflows/drag_empty")
api.add_resource(NewWorkflowFromApp, "/apps/workflows/drag_app")
api.add_resource(NewWorkflowFromTemplate, "/apps/workflows/drag_template")

api.add_resource(WorkflowAddLog, "/apps/workflows/add_log")
api.add_resource(WorkflowBatchLog, "/apps/workflows/batch_log")

api.add_resource(
    DocParseApi, "/apps/<uuid:app_id>/workflows/doc_node/<string:doc_id>/parse"
)
api.add_resource(
    DocParseStatusApi,
    "/apps/<uuid:app_id>/workflows/doc_node/<string:doc_id>/parse/status",
)
api.add_resource(AICodeAssistant, "/apps/workflows/code_assistant")
api.add_resource(AIPromptAssistant, "/apps/workflows/prompt_assistant")
