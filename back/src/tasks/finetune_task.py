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


from celery import shared_task
from flask import current_app

from parts.finetune.model import FinetuneTask, TaskStatus
from parts.finetune.task_manager import manage
from utils.util_database import db


@shared_task
def add_task(task_id):
    """添加微调任务。

    这是一个 Celery 后台任务，用于启动模型微调任务。
    会将任务状态设置为进行中，并委托给任务管理器执行。

    Args:
        task_id: 微调任务的ID。
    """
    with current_app.app_context():
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        task.status = TaskStatus.IN_PROGRESS.value
        db.session.commit()
        manage.add_task(task_id)


@shared_task
def cancel_task(task_id):
    """取消微调任务。

    这是一个 Celery 后台任务，用于取消正在进行的模型微调任务。

    Args:
        task_id: 要取消的微调任务ID。
    """
    with current_app.app_context():
        manage.cancel_task(task_id=task_id)


@shared_task
def check_status():
    """检查微调任务状态。

    这是一个 Celery 定时任务，用于定期检查所有微调任务的执行状态。
    通过任务管理器来检查和更新任务状态。
    """
    print("check_status start")
    manage.check_task_status()
    print("check_status end")
