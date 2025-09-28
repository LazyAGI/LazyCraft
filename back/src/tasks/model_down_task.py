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

import logging
from threading import Thread

from celery import shared_task
from flask import current_app

from lazyllm.components import ModelManager

from parts.models_hub.model import Lazymodel, ModelStatus
from utils.util_database import db


@shared_task
def check_download_status():
    """检查模型下载状态的任务。

    查询所有处于下载状态的模型记录。这是一个 Celery 后台任务，
    用于定期检查模型下载的进度状态。

    Note:
        当前实现为空，仅查询了下载中的模型但未进行实际处理。
    """
    db.session.query(Lazymodel).filter(
        Lazymodel.model_status._in([ModelStatus.DOWNLOAD])
    ).all()

    pass


@shared_task
def do_download(model_id):
    """执行模型下载任务。

    异步下载指定ID的模型文件。这是一个 Celery 后台任务，
    会在新线程中执行实际的模型下载操作。

    Args:
        model_id: 要下载的模型ID。
    """
    model_record = db.session.query(Lazymodel).filter(Lazymodel.id == model_id).first()
    app = current_app._get_current_object()

    def async_download_model(m, app):
        """异步下载模型的内部函数。

        在独立线程中执行模型下载，支持从 HuggingFace 和 ModelScope 下载。
        下载完成后更新数据库中的模型状态和消息。

        Args:
            m: 模型记录对象。
            app: Flask 应用实例。

        Raises:
            ValueError: 当模型来源不支持时抛出。
        """
        with app.app_context():
            model = db.session.query(Lazymodel).filter(Lazymodel.id == model_id).first()
            logging.info(f"start download model: {m.model_from}, {m.model_key}")
            if m.model_from in ["huggingface", "modelscope"]:
                # model.model_path = ModelManager(model_source=model_from).download(model_key)
                res = ModelManager(model_source=m.model_from).download(
                    m.model_key
                )  # model_path记录为model_key即可
                if res != m.model_key:
                    model.model_status = ModelStatus.SUCCESS.value
                    model.download_message = "Download successful"
                    db.session.commit()
                else:
                    model.model_status = ModelStatus.FAILED.value
                    model.download_message = "Fail"
                    db.session.commit()
            else:
                raise ValueError(f"Invalid source: {model.model_from}")

    thread = Thread(target=async_download_model, args=(model_record, app))
    thread.start()
