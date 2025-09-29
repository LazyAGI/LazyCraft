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

import time

from celery import shared_task
from flask import current_app

from lazyllm.engine import LightEngine

from parts.inferservice.model import InferModelService
from utils.util_database import db


@shared_task
def add_task(token, jobid):
    """启动推理服务节点任务。

    这是一个 Celery 后台任务，用于启动本地LLM推理服务节点。
    任务会创建一个新的推理引擎，启动服务，并等待服务就绪。

    Args:
        token (str): 服务认证令牌。
        jobid (str): 作业ID，用于标识特定的推理服务实例。

    Raises:
        ValueError: 当启动推理服务节点失败时抛出。
    """
    print(f"infer_service_node:token: {token}, jobid: {jobid}")
    with current_app.app_context():
        try:
            engine = LightEngine()
            engine.launch_localllm_infer_service()
            engine.infer_client.wait_ready(token, jobid)
            nodes = [
                dict(
                    id=jobid,
                    kind="SharedLLM",
                    name=jobid,
                    args=dict(llm=jobid, local=False, token=token, stream=True),
                )
            ]
            gid = engine.start(nodes)
            print(f"infer_service_node:gid: {gid}")
            service = (
                db.session.query(InferModelService)
                .filter(InferModelService.job_id == jobid)
                .first()
            )
            while not service:
                print("infer_service_node:sleep 3s")
                time.sleep(3)
                service = (
                    db.session.query(InferModelService)
                    .filter(InferModelService.job_id == jobid)
                    .first()
                )
            print("infer_service_node:service_id:", service.id)
            service.gid = gid
            db.session.commit()
        except Exception as e:
            print(f"Error in add_task: {e}")
            raise ValueError("Failed to start infer service node") from e
