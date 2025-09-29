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
import os
import time
import uuid

from flask import Response, stream_with_context
from flask_login import current_user
from flask_restful import reqparse

from core.restful import Resource
from libs.helper import build_response
from parts.app.node_run.app_run_service import AppRunService
from parts.app.node_run.run_context import RunContext
from parts.inferservice.model import InferModelService
from parts.inferservice.service import InferService
from parts.urls import api


class TestSpeakToApi(Resource):
    """测试对话API控制器。

    提供推理服务的测试对话功能。
    """

    def post(self, service_id):
        """处理POST请求，测试推理服务对话。

        验证服务存在性，解析输入参数，执行流式对话测试。

        Args:
            service_id (str): 服务ID。

        Returns:
            Response: 流式响应对象。

        Raises:
            ValueError: 当服务不存在时抛出异常。
        """

        service = InferModelService.query.get(service_id)
        # 如果服务不存在，返回404错误
        if not service:
            return build_response(status=400, message="Service not found")
        infer_service = InferService()
        service_info = infer_service.get_infer_model_service_by_id(service_id)
        logging.info(f"TestSpeakToApi, service_info: {service_info}")

        parser = reqparse.RequestParser()
        parser.add_argument(
            "inputs", type=list, required=True, nullable=False, location="json"
        )
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        args = parser.parse_args()
        inputs = args["inputs"]
        files = args.get("files") or []

        history_list = []
        manager = RunTestManager(service_info=service_info)
        return manager.stream_run(inputs, files, history_list)


class RunTestManager:
    """测试运行管理器。

    管理推理服务的测试运行流程。
    """

    def __init__(self, service_info=None):
        """初始化测试运行管理器。

        Args:
            service_info (dict, optional): 服务信息字典。

        Returns:
            None: 无返回值。
        """
        self.service_info = service_info
        logging.info(f"RunTestManager, service_info: {self.service_info}")

    def build_test_workflow(self, run_node_id):
        """构建测试工作流。

        根据服务信息构建测试用的工作流配置。

        Args:
            run_node_id (str): 运行节点ID。

        Returns:
            dict: 工作流图配置。

        Raises:
            FileNotFoundError: 当找不到测试配置文件时抛出异常。
        """
        current_file_path = os.path.dirname(os.path.abspath(__file__))
        test_llm_json_path = os.path.join(current_file_path, "test_llm.json")
        workflow = json.load(open(test_llm_json_path))

        workflow["graph"]["nodes"][2]["data"]["payload__base_model"] = (
            self.service_info["model_name"]
        )
        workflow["graph"]["nodes"][2]["data"]["payload__type"] = "local"
        workflow["graph"]["nodes"][2]["data"]["payload__url"] = self.service_info["url"]
        workflow["graph"]["nodes"][2]["data"]["payload__deploy_method"] = (
            self.service_info["framework"]
        )
        workflow["graph"]["nodes"][2]["id"] = run_node_id
        logging.info(f"llm_node: {workflow['graph']['nodes'][2]}")
        return workflow["graph"]

    def stream_run(self, inputs, files, history):
        """执行流式运行测试。

        创建应用运行服务，执行流式对话测试。

        Args:
            inputs (list): 输入参数列表。
            files (list): 文件列表。
            history (list): 对话历史列表。

        Returns:
            Response: 流式响应对象。

        Raises:
            Exception: 当运行测试失败时抛出异常。
        """
        logging.info(f"LightEngine stream_run: inputs={inputs}, files={files}")
        app_id = str(uuid.uuid4())
        run_node_id = str(int(time.time() * 1000))
        run_context = RunContext(app_id=app_id, run_node_id=run_node_id)
        app_run_service = AppRunService(run_context)
        app_run_service.start(self.build_test_workflow(run_node_id))
        generator = app_run_service.run_stream(
            inputs,
            input_files=files,
            chat_history=history,
            account=current_user,
            stop_engine=True,
        )
        return Response(
            stream_with_context(generator), status=200, mimetype="text/event-stream"
        )


api.add_resource(TestSpeakToApi, "/infer-service/test/<string:service_id>/run")
