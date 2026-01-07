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

from datetime import timedelta

from celery import Celery, Task
from celery.schedules import crontab
from flask import Flask


def init_app(app: Flask) -> Celery:
    """初始化 Celery 应用。

    创建并配置 Celery 应用实例，包括任务类、连接器配置、SSL 选项、
    任务路由、定时任务等。支持与 Flask 应用上下文的集成。

    Args:
        app (Flask): Flask 应用实例，包含 Celery 相关的配置信息。
                    需要包含以下配置项:
                    - CELERY_BROKER_URL: Celery 代理 URL
                    - CELERY_BACKEND: Celery 后端配置
                    - CELERY_RESULT_BACKEND: 结果后端配置
                    - BROKER_USE_SSL: 是否使用 SSL 连接代理

    Returns:
        Celery: 配置完成的 Celery 应用实例。
    """

    # 定义继承自Task的Flask上下文任务类
    class ContextualTask(Task):
        """支持 Flask 应用上下文的 Celery 任务基类。

        此类扩展了 Celery 原生 Task 类，保证任务执行期间
        可以正常访问 Flask 应用的上下文环境。
        """

        def __call__(self, *task_args: object, **task_kwargs: object) -> object:
            """在 Flask 应用上下文环境中运行任务。

            Args:
                *task_args (object): 任务的位置参数。
                **task_kwargs (object): 任务的关键字参数。

            Returns:
                object: 任务的执行结果。
            """
            with app.app_context():
                return self.run(*task_args, **task_kwargs)

    # 创建Celery实例并进行基础配置
    celery_instance = Celery(
        app.name,
        task_cls=ContextualTask,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_BACKEND"],
        task_ignore_result=True,
    )

    # 配置SSL连接参数
    ssl_config = {
        "ssl_cert_reqs": None,
        "ssl_ca_certs": None,
        "ssl_certfile": None,
        "ssl_keyfile": None,
    }

    task_imports = [
        "tasks",
        "tasks.finetune_task",
        "tasks.mail_reset_password_task",
        "tasks.inferservice_start_node_task",
        "tasks.cost_audit_stat_task",
    ]

    routing_rules = ({"tasks.*": {"queue": "celery"}},)

    periodic_tasks = {
        "check-status-every-10-seconds": {
            "task": "tasks.finetune_task.check_status",
            "schedule": timedelta(seconds=10),
        },
        "cost-audit-daily-stat": {
            "task": "tasks.cost_audit_stat_task.daily_cost_audit_stat",
            "schedule": crontab(hour=1, minute=0),  # 每日凌晨1点运行
            "options": {"expires": 7200},
        },
    }

    # 聚合所有conf更新，减少多次update调用
    aggregated_conf = {
        "result_backend": app.config["CELERY_RESULT_BACKEND"],
        "broker_connection_retry_on_startup": True,
        "task_annotations": {},
        "beat_schedule": periodic_tasks,
        "imports": task_imports,
        "task_routes": routing_rules,
        "task_default_queue": "celery",
    }

    if app.config["BROKER_USE_SSL"]:
        aggregated_conf["broker_use_ssl"] = ssl_config

    celery_instance.conf.update(**aggregated_conf)

    # 设置默认配置并注册到Flask扩展
    celery_instance.set_default()
    app.extensions["celery"] = celery_instance

    return celery_instance
