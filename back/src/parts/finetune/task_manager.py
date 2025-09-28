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
import shutil
import time
import traceback
import uuid
from datetime import timedelta
from urllib.parse import quote

import pytz
import requests

from libs.timetools import TimeTools
from models.model_account import Account, Tenant
from parts.data.data_service import DataService
from parts.finetune.model import FinetuneTask, TaskStatus
from parts.logs import Action, LogService, Module
from parts.models_hub.service import ModelService
from utils.util_database import db
from utils.util_storage import storage

LOG_PATH = "finetune/log/"


def calculate_time_difference(datetime_val):
    """计算时间差。

    计算给定时间与当前时间的差值（秒）。

    Args:
        datetime_val (datetime): 要比较的时间

    Returns:
        int: 时间差（秒）
    """
    datetime_val = pytz.timezone("Asia/Shanghai").localize(datetime_val)
    # 获取当前时间，并设置为中国时区
    now = TimeTools.get_china_now(output="dt")
    # 计算差值
    time_difference = (now - datetime_val).total_seconds()
    return int(time_difference)


class TaskManager:
    """任务管理器类，负责微调任务的生命周期管理。

    该管理器负责微调任务的创建、监控、状态更新、日志收集等操作。
    包括与微调后端服务的交互、模型上传下载、任务状态同步等功能。

    Attributes:
        engine: 引擎对象。
    """

    def __init__(self) -> None:
        """初始化任务管理器。

        初始化任务管理器并启动服务器。

        Returns:
            None: 无返回值。
        """
        self.supplier = os.getenv("CLOUD_SUPPLIER", "maas")
        self._handle_completed_task = (
            self._handle_completed_task_maas
            if self.supplier == "maas"
            else self._handle_completed_task_lazy
        )

    def ft_upload_finetuned_model(self, job_id, model_name, model_space_id):
        """上传微调后的模型到FT服务。

        Args:
            job_id (str): 任务ID。
            model_name (str): 模型名称。
            model_space_id (str): 模型空间ID。

        Returns:
            bool: 上传操作是否成功。

        Raises:
            Exception: 当上传请求失败时抛出异常。
        """
        ft_upload_finetuned_model_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + "/model:export"
        )
        logging.info(f"ft_upload_finetuned_model_url: {ft_upload_finetuned_model_url}")
        json_data = {
            "name": job_id,
            "model_display_name": model_name,
            "model_id": model_name,
        }
        response = requests.post(ft_upload_finetuned_model_url, json=json_data)
        logging.info(f"ft_upload_finetuned_model response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"ft_upload_finetuned_model failed: {response.text}"
            )
            return False
        return True

    def ft_delete_service(self, job_id):
        """删除FT服务中的任务。

        Args:
            job_id (str): 任务ID。

        Returns:
            bool: 删除操作是否成功。

        Raises:
            Exception: 当删除请求失败时抛出异常。
        """
        ft_delete_url = os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id
        logging.info(f"ft_delete_url: {ft_delete_url}")
        response = requests.delete(ft_delete_url)
        response_data = response.json()
        logging.info(f"ft delete response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"ft_delete_service failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            # 如果任务不存在，则返回True code=3表示 task id invalid或者已经删除
            if (response.status_code == 500 and response_data.get("code") == 13) or (
                response.status_code == 400 and response_data.get("code") == 3
            ):
                return True
            return False
        return True

    def status_change(self, ft_task_status):
        """转换FT任务状态。

        将FT服务的任务状态转换为内部状态格式。

        Args:
            ft_task_status (str): FT服务的任务状态。

        Returns:
            str: 转换后的内部状态。

        Raises:
            ValueError: 当状态值无效时抛出异常。
        """
        if self.supplier == "lazyllm":
            if ft_task_status == "Done":
                return "Completed"
            else:
                return ft_task_status
        if ft_task_status == "TASK_STATE_UNSPECIFIED":
            return "Unknown"
        elif ft_task_status == "TASK_STATE_PENDING":
            return "Pending"
        elif ft_task_status == "TASK_STATE_RUNNING":
            return "InProgress"
        elif ft_task_status == "TASK_STATE_SUCCEEDED":
            return "Completed"
        elif ft_task_status == "TASK_STATE_FAILED":
            return "Failed"
        elif ft_task_status == "TASK_STATE_CANCEL":
            return "Cancel"
        elif ft_task_status == "TASK_STATE_TERMINATED":
            return "Terminated"
        elif ft_task_status == "TASK_STATE_SUSPENDED":
            return "Suspended"
        elif ft_task_status == "TASK_STATE_READY":
            return "Ready"
        else:
            return "Unknown"

    def get_ft_status(self, job_id):
        """获取FT任务状态。

        从FT服务获取指定任务的状态。

        Args:
            job_id (str): 任务ID。

        Returns:
            tuple: (bool, str) 获取结果元组，包含：
                - bool: 是否成功获取
                - str: 任务状态或错误信息

        Raises:
            Exception: 当请求FT服务失败时抛出异常。
        """
        ft_status_url = os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id
        logging.info(f"get_ft_status_url: {ft_status_url}")
        response = requests.get(ft_status_url)
        response_data = response.json()
        logging.info(f"get_ft_status response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"get_ft_status failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            if response.status_code == 400 and response_data.get("code") == 3:
                return True, "Terminated"
            elif response.status_code == 404:
                return True, "Failed"
        return True, self.status_change(response_data.get("status"))

    def get_ft_amp_upload_status(self, job_id):
        """获取FT任务AMP上传状态。

        Args:
            job_id (str): 任务ID。

        Returns:
            tuple: (bool, str) 获取结果元组，包含：
                - bool: 是否成功获取
                - str: 上传状态或错误信息

        Raises:
            Exception: 当请求FT服务失败时抛出异常。
        """
        ft_amp_upload_status_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id
        )
        logging.info(f"get_ft_amp_upload_status_url: {ft_amp_upload_status_url}")
        response = requests.get(ft_amp_upload_status_url)
        response_data = response.json()
        logging.info(f"get_ft_amp_upload_status response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"get_ft_amp_upload_status failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            if response.status_code == 400 and response_data.get("code") == 3:
                return True, "MODEL_EXPORT_FAILED"
            return False, ""
        model_result = response_data.get("model_result")
        return True, model_result.get("model_status")

    def get_ft_log(self, job_id):
        """获取FT任务日志。

        从FT服务获取指定任务的日志。

        Args:
            job_id (str): 任务ID

        Returns:
            tuple: (是否成功, 日志内容)
                成功: (True, 日志内容)
                失败: (False, 错误信息)

        Raises:
            Exception: 当请求FT服务失败时
        """
        ft_log_url = os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + "/log"
        logging.info(f"get_ft_log_url: {ft_log_url}")
        response = requests.get(ft_log_url, timeout=30)
        logging.info(f"get_ft_log response: {response.status_code}")
        if response.status_code != 200:
            logging.info(f"get_ft_log failed: {response.text}")
            return False, ""
        return True, response.text

    def get_ft_log_sse(self, job_id):
        """获取FT任务日志（SSE格式）。

        从FT服务获取指定任务的日志，支持Server-Sent Events格式。

        Args:
            job_id (str): 任务ID

        Returns:
            tuple: (是否成功, 日志内容)
                成功: (True, 日志内容)
                失败: (False, 错误信息)

        Raises:
            Exception: 当请求FT服务失败时
        """
        get_ft_log_sse_url = (
            os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks/" + job_id + "/log"
        )
        logging.info(f"get_ft_log_sse_url: {get_ft_log_sse_url}")
        ft_logs = ""

        try:
            with requests.get(
                get_ft_log_sse_url,
                stream=True,
                headers={"Accept": "text/event-stream"},
                timeout=30,
            ) as response:
                if response.status_code != 200:
                    try:
                        error_data = response.json()
                        logging.info(
                            f"Server error: {error_data.get('error', {}).get('message', 'Unknown error')}"
                        )
                    except json.JSONDecodeError:
                        error_text = response.text.strip()
                        logging.info(
                            f"Server returned error with status code {response.status_code}: {error_text}"
                        )
                    return False, ""

                for line in response.iter_lines():
                    if line:
                        if line.startswith(b"data:"):
                            data_part = line[len(b"data:") :].strip()
                            try:
                                logging.info(
                                    f"Received ft log data: {data_part.decode('utf-8')}"
                                )

                                if data_part != b"[DONE]":
                                    ft_log = json.loads(data_part.decode("utf-8"))
                                    if (
                                        "result" in ft_log
                                        and "log_data" in ft_log["result"]
                                    ):
                                        log_data = ft_log["result"]["log_data"]
                                        logging.info("=========" * 5)
                                        logging.info(f"Received log: {log_data}")
                                        logging.info("=========" * 5)
                                        ft_logs += log_data + "\n"
                                    elif "error" in ft_log:
                                        error_message = ft_log["error"].get(
                                            "message", "Unknown error"
                                        )
                                        ft_logs += error_message + "\n"
                                        logging.info(
                                            f"Server error in data: {error_message}"
                                        )
                                    else:
                                        ft_logs += (
                                            json.dumps(ft_log, ensure_ascii=False)
                                            + "\n"
                                        )
                                        logging.info(f"Received data: {ft_log}")
                                else:
                                    logging.info("Stream ended")
                                    break
                            except json.JSONDecodeError:
                                ft_logs += data_part.decode("utf-8") + "\n"
                                logging.info(
                                    f"Failed to parse log data: {data_part.decode('utf-8')}"
                                )
        except Exception as e:
            logging.error(f"Request ft log failed: {e}")
            return False, f"请求失败: {str(e)}"

        return True, ft_logs

    def add_task_ft(
        self,
        task_name,
        model_name,
        training_dataset_list,
        validate_dataset_split_percent,
        training_args,
        training_type,
    ):
        """向FT服务添加微调任务。

        Args:
            task_name (str): 任务名称。
            model_name (str): 模型名称。
            training_dataset_list (list): 训练数据集列表。
            validate_dataset_split_percent (float): 验证集分割百分比。
            training_args (dict): 训练参数。
            training_type (str): 训练类型。

        Returns:
            tuple: (bool, str) 添加结果元组，包含：
                - bool: 是否成功添加
                - str: 任务ID或错误信息

        Raises:
            Exception: 当添加任务请求失败时抛出异常。
        """
        ft_add_task_url = os.getenv("FT_ENDPOINT", "NOT_SET_FT_ENDPOINT!!") + "/v1/finetuneTasks"
        logging.info(
            f"add_task_ft: {ft_add_task_url}, {task_name}, {model_name}, {training_dataset_list}, "
            f"{validate_dataset_split_percent}, {training_args}, {training_type}"
        )
        json_data = {
            "name": task_name,
            "model": model_name,
            "training_dataset": training_dataset_list,
            "validate_dataset_split_percent": validate_dataset_split_percent,
            "training_args": training_args,
            "stage": training_type,
        }
        logging.info(
            f"add_task_ft, ft_add_task_url: {ft_add_task_url}, json_data: {json_data}"
        )
        response = requests.post(ft_add_task_url, json=json_data)
        response_data = response.json()
        logging.info(f"add_task_ft response: {response.status_code}")
        if response.status_code != 200:
            logging.info(
                f"add_task_ft failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False, "", ""
        return (
            True,
            response_data.get("finetune_task_id"),
            self.status_change(response_data.get("status")),
        )

    def finetune_config_to_training_args(self, finetune_config, finetuning_type):
        """将微调配置转换为训练参数。

        将微调配置字典转换为FT服务所需的训练参数格式。

        Args:
            finetune_config (dict): 微调配置字典
            finetuning_type (str): 微调类型

        Returns:
            dict: 训练参数字典

        Raises:
            Exception: 当配置转换失败时
        """
        training_args = {}
        logging.info(
            f"finetune_config_to_training_args finetune_config, finetuning_type: {finetune_config}, {finetuning_type}"
        )

        training_args = self._process_finetune_config(finetune_config, training_args)
        training_args = self._add_finetuning_type(training_args, finetuning_type)
        training_args = self._add_lora_config(
            training_args, finetune_config, finetuning_type
        )
        training_args = self._add_trust_remote_code(training_args)

        logging.info(f"finetune_config_to_training_args training_args: {training_args}")
        return training_args

    def _process_finetune_config(self, finetune_config, training_args):
        """处理微调配置中的参数。

        处理微调配置字典中的参数，转换为训练参数格式。

        Args:
            finetune_config (dict): 微调配置字典
            training_args (dict): 训练参数字典

        Returns:
            dict: 更新后的训练参数字典
        """
        skip_keys = {
            "training_type",
            "lora_r",
            "lora_alpha",
            "finetuning_type",
            "lora_rate",
            "num_gpus",
        }

        for key, value in finetune_config.items():
            if key in skip_keys:
                continue

            if key == "num_epochs":
                training_args["num_train_epochs"] = str(value)
            elif key == "batch_size":
                training_args["per_device_train_batch_size"] = str(value)
            else:
                training_args[key] = str(value)

        return training_args

    def _add_finetuning_type(self, training_args, finetuning_type):
        """添加微调类型参数。

        向训练参数中添加微调类型。

        Args:
            training_args (dict): 训练参数字典
            finetuning_type (str): 微调类型

        Returns:
            dict: 更新后的训练参数字典
        """
        training_args["finetuning_type"] = str(finetuning_type).lower()
        return training_args

    def _add_lora_config(self, training_args, finetune_config, finetuning_type):
        """添加LoRA配置参数。

        如果微调类型不是Full，则添加LoRA相关配置。

        Args:
            training_args (dict): 训练参数字典
            finetune_config (dict): 微调配置字典
            finetuning_type (str): 微调类型

        Returns:
            dict: 更新后的训练参数字典
        """
        if finetuning_type != "Full":
            lora_config = {
                "lora_rank": str(finetune_config.get("lora_r")),
                "lora_alpha": str(finetune_config.get("lora_alpha")),
            }
            training_args = training_args | lora_config
        return training_args

    def _add_trust_remote_code(self, training_args):
        """添加信任远程代码参数。

        向训练参数中添加信任远程代码设置。

        Args:
            training_args (dict): 训练参数字典

        Returns:
            dict: 更新后的训练参数字典
        """
        training_args["trust_remote_code"] = "True"
        return training_args

    def finetune_generate_training_dataset_list(
        self, dataset_urls, dataset_formats, dataset_ids
    ):
        """生成训练数据集列表。

        根据数据集URL、格式和ID生成训练数据集列表。

        Args:
            dataset_urls (list): 数据集URL列表
            dataset_formats (list): 数据集格式列表
            dataset_ids (list): 数据集ID列表

        Returns:
            list: 训练数据集列表

        Raises:
            ValueError: 当数据集格式无效时
        """
        logging.info(
            f"finetune_generate_training_dataset_list dataset_urls, dataset_formats: {dataset_urls}, {dataset_formats}"
        )
        training_dataset_list = []
        for i in range(len(dataset_urls)):
            training_dataset_map = {}
            training_dataset_map["dataset_download_uri"] = dataset_urls[i]
            if dataset_formats[i] == "ATASET_FORMAT_UNSPECIFIED":
                training_dataset_map["format"] = 0
            elif dataset_formats[i] == "DATASET_FORMAT_ALPACA":
                training_dataset_map["format"] = 1
            elif dataset_formats[i] == "DATASET_FORMAT_OPENAI":
                training_dataset_map["format"] = 2
            elif dataset_formats[i] == "DATASET_FORMAT_SHARE_GPT":
                training_dataset_map["format"] = 3
            else:
                training_dataset_map["format"] = 0

            training_dataset_map["dataset_id"] = dataset_ids[i]
            training_dataset_list.append(training_dataset_map)
        logging.info(
            f"finetune_generate_training_dataset_list training_dataset_list: {training_dataset_list}"
        )
        return training_dataset_list

    def add_task(self, task_id):
        """添加微调任务到任务管理器。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当任务添加失败时抛出异常。
        """
        logging.info("start add_task")
        task = db.session.query(FinetuneTask).get(task_id)
        config = json.loads(task.finetune_config)
        token = str(uuid.uuid4())
        try:
            if task.is_online_model:
                logging.info("skip online model in ft")
            else:
                logging.info("start add_task for local model")
                db.session.remove()
                db.session.add(task)
                db.session.commit()

                dataset_urls = []
                dataset_formats = []
                dataset_ids = []
                datasets_types = config.get("datasets_type")
                data_service = DataService(None)
                index = 0
                for item in json.loads(task.datasets):
                    dataset_file_list, dataset_file_from = (
                        data_service.create_individual_zip_ft(str(item))
                    )
                    logging.info(
                        f"dataset_file_list: {dataset_file_list}, dataset_id: {str(item)}, "
                        f"dataset_file_from: {dataset_file_from}"
                    )
                    datasets_type = datasets_types[index]
                    for dataset_file in dataset_file_list:
                        dataset_url = (
                            os.getenv("CONDUCTOR_ENDPOINT")
                            + "?filename="
                            + quote(dataset_file)
                            + "&"
                            + "filefrom="
                            + dataset_file_from
                        )
                        dataset_urls.append(dataset_url)
                        dataset_id = str(item)
                        dataset_ids.append(dataset_id)
                        dataset_formats.append(datasets_type)
                    index = index + 1

                logging.info(
                    f"start add_task dataset_urls, dataset_formats, dataset_ids, "
                    f"{dataset_urls}, {dataset_formats}, {dataset_ids}"
                )
                training_dataset_list = self.finetune_generate_training_dataset_list(
                    dataset_urls, dataset_formats, dataset_ids
                )
                logging.info(
                    f"start add_task training_dataset_list, {training_dataset_list}"
                )

                config.pop("datasets_type", None)
                training_args = self.finetune_config_to_training_args(
                    config, task.finetuning_type
                )
                logging.info(f"start add_task training_args, {training_args}")

                training_type = config.get("training_type").lower()

                add_task_ft_result, add_task_ft_return, add_task_ft_status = (
                    self.add_task_ft(
                        task.name,
                        task.base_model_key,
                        training_dataset_list,
                        config.get("val_size"),
                        training_args,
                        training_type,
                    )
                )
                logging.info(
                    f"add_task_ft_result, add_task_ft_return, add_task_ft_status: "
                    f"{add_task_ft_result}, {add_task_ft_return}, {add_task_ft_status}"
                )
                if add_task_ft_result:
                    model_id_or_path = None
                    job_info = {
                        "job_id": add_task_ft_return,  # ft task name
                        "status": add_task_ft_status,  # status not in ft
                        "model_id_or_path": model_id_or_path,  # finetuned model name
                        "token": token,
                        "source": "local",
                        "check_count": 0,
                    }
                    logging.info(f"job_info: {job_info}")
                    task = db.session.query(FinetuneTask).get(task_id)
                    task.task_job_info = json.dumps(job_info)
                    db.session.commit()

                    # 获取初始日志
                    try:
                        logging.info(
                            f"start get_ft_log_sse, job_id: {add_task_ft_return}"
                        )
                        get_ft_log_result, get_ft_log_return = self.get_ft_log_sse(
                            add_task_ft_return
                        )
                        if get_ft_log_result and get_ft_log_return.strip():
                            self.task_log_content(task_id, get_ft_log_return)
                            logging.info(f"Initial log collected for task {task_id}")
                        else:
                            logging.info(f"No initial log available for task {task_id}")
                    except Exception as e:
                        logging.warning(
                            f"Failed to get initial log for task {task_id}: {e}"
                        )
                else:
                    raise Exception("微调任务发起异常")
        except Exception as e:
            traceback.print_exc()
            self.handle_failed_task(task_id, str(e))

    def cancel_task(self, task_id):
        """取消微调任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当取消任务失败时抛出异常。
        """
        try:
            task = db.session.query(FinetuneTask).get(task_id)
            if task.task_job_info_dict:
                job_id = task.task_job_info_dict["job_id"]
                if task.is_online_model:
                    logging.info("skip online model in ft cancel_task")
                else:
                    ft_delete_service_result = self.ft_delete_service(job_id)
                    logging.info(
                        f"ft_delete_service_result: {ft_delete_service_result}"
                    )
        finally:
            pass

    def check_task_status(self):
        """检查所有任务状态。

        定期检查所有微调任务的状态，更新任务进度和状态。

        Returns:
            None: 无返回值。
        """
        eight_hours_ago = TimeTools.get_china_now(output="datetime") - timedelta(
            hours=48
        )
        tasks_db = (
            db.session.query(FinetuneTask)
            .filter(
                FinetuneTask.status == TaskStatus.IN_PROGRESS.value,
                FinetuneTask.deleted_flag == 0,
                FinetuneTask.created_at >= eight_hours_ago,
            )
            .all()
        )

        if tasks_db is not None and len(tasks_db) > 0:
            for t_db in tasks_db:
                self._process_single_task(t_db)

    def _process_single_task(self, task_db):
        """处理单个任务的状态检查。

        处理单个任务的状态检查逻辑。

        Args:
            task_db (FinetuneTask): 任务数据库对象

        Returns:
            None
        """
        if not task_db.task_job_info_dict:
            return

        job_id = task_db.task_job_info_dict["job_id"]
        token = task_db.task_job_info_dict["token"]
        check_count = task_db.task_job_info_dict["check_count"]
        model_id_or_path = task_db.task_job_info_dict["model_id_or_path"]

        status = self._get_task_status(task_db, job_id)

        if status == "Completed":
            self._handle_completed_task(
                task_db, job_id, token, check_count, model_id_or_path
            )
            # 调用handle_done_task来处理完成的任务
            self.handle_done_task(task_db.id)
        elif status in ["Failed"]:
            self.handle_failed_task(task_db.id, "")

        print(f"task_id={task_db.id} 状态 job_id={job_id},status={status}")

    def _get_task_status(self, task_db, job_id):
        """获取任务状态。

        获取指定任务的状态。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID

        Returns:
            str: 任务状态

        Raises:
            Exception: 当获取状态失败时
        """
        if task_db.is_online_model:
            return None
        else:
            get_ft_status_result, get_ft_statusreturn = self.get_ft_status(job_id)
            logging.info(
                f"get_ft_status_result, get_ft_statusreturn: {get_ft_status_result}, {get_ft_statusreturn}"
            )
            if get_ft_status_result:
                return get_ft_statusreturn
            else:
                return None

    def _handle_completed_task_lazy(
        self, task_db, job_id, token, check_count, model_id_or_path
    ):
        """处理已完成的任务。

        处理lazy已完成任务的后续操作。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID
            token (str): 认证令牌
            check_count (int): 检查次数
            model_id_or_path (str): 模型ID或路径

        Returns:
            None
        """
        if model_id_or_path is None or model_id_or_path == "":
            # 上传微调模型
            ft_upload_result = self.ft_upload_finetuned_model(
                job_id,
                task_db.target_model_name,
                None,
            )

            if not ft_upload_result:
                if check_count <= 10:
                    logging.info(
                        f"ft_upload_finetuned_model failed, check_count: {check_count}"
                    )
                    self._update_check_count(task_db, check_count + 1)
                    return
                raise Exception("任务发起异常")

            # 更新任务信息
            self._update_task_job_info(
                task_db, job_id, task_db.target_model_name, token, check_count
            )

    def _handle_completed_task_maas(
        self, task_db, job_id, token, check_count, model_id_or_path
    ):
        """处理已完成的任务。

        处理mass已完成任务的后续操作。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID
            token (str): 认证令牌
            check_count (int): 检查次数
            model_id_or_path (str): 模型ID或路径

        Returns:
            None
        """
        if model_id_or_path is None or model_id_or_path == "":
            self._handle_model_upload_and_download(task_db, job_id, token, check_count)
        else:
            self._handle_existing_model_download(task_db, job_id)

    def _handle_model_upload_and_download(self, task_db, job_id, token, check_count):
        """处理模型上传和下载。

        处理模型上传到AMP和从AMP下载的流程。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID
            token (str): 认证令牌
            check_count (int): 检查次数

        Returns:
            None

        Raises:
            Exception: 当上传或下载失败时
        """
        # 上传微调模型
        ft_upload_result = self.ft_upload_finetuned_model(
            job_id,
            task_db.target_model_name,
            os.getenv("AMP_DEFAULT_MODEL_SPACE"),
        )

        if not ft_upload_result:
            if check_count <= 10:
                logging.info(
                    f"ft_upload_finetuned_model failed, check_count: {check_count}"
                )
                self._update_check_count(task_db, check_count + 1)
                return
            raise Exception("任务发起异常")

        # 更新任务信息
        self._update_task_job_info(
            task_db, job_id, task_db.target_model_name, token, check_count
        )

        # 下载模型
        self._download_model_from_amp(task_db, job_id)

    def _handle_existing_model_download(self, task_db, job_id):
        """处理现有模型下载。

        处理已存在模型的下载流程。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID

        Returns:
            None
        """
        try:
            self.update_task_status_to_db_ft(task_db.id, TaskStatus.DOWNLOAD.value)
            self._download_model_from_amp(task_db, job_id)
        except Exception as e:
            self._handle_download_error(task_db, e)

    def _download_model_from_amp(self, task_db, job_id):
        """从AMP下载模型。

        从AMP服务下载微调后的模型。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID

        Returns:
            None

        Raises:
            Exception: 当下载失败时
        """
        logging.info(
            f"start download from amp, model_name: {task_db.target_model_name}"
        )

        amp_download_path = (
            os.getenv("AMP_DOWNLOAD_PATH") + "/" + task_db.target_model_name
        )
        self._prepare_download_path(amp_download_path)

        upload_status = self._check_amp_upload_status(job_id)

        if upload_status == "success":
            self._perform_model_download(task_db, amp_download_path)
        elif upload_status == "failed":
            self._handle_upload_failure(task_db, amp_download_path)
        else:
            self._handle_upload_timeout(task_db, amp_download_path)

    def _prepare_download_path(self, amp_download_path):
        """准备下载路径。

        准备模型下载的目录路径。

        Args:
            amp_download_path (str): 下载路径

        Returns:
            None
        """
        if os.path.exists(amp_download_path):
            shutil.rmtree(amp_download_path)
        else:
            os.makedirs(amp_download_path)

    def _check_amp_upload_status(self, job_id):
        """检查AMP上传状态。

        检查模型在AMP上的上传状态。

        Args:
            job_id (str): 任务ID

        Returns:
            str: 上传状态（success/failed/timeout）

        Raises:
            Exception: 当检查状态失败时
        """
        for amp_download_try in range(1, 21):
            time.sleep(60)
            (
                get_ft_amp_upload_status_result,
                get_ft_amp_upload_status_return,
            ) = self.get_ft_amp_upload_status(job_id)

            logging.info(
                f"get_ft_amp_upload_status_result, get_ft_amp_upload_status_return: "
                f"{get_ft_amp_upload_status_result}, {get_ft_amp_upload_status_return}"
            )

            if get_ft_amp_upload_status_result:
                if get_ft_amp_upload_status_return == "MODEL_EXPORTED":
                    logging.info("ft upload model to amp success")
                    return "success"
                elif get_ft_amp_upload_status_return == "MODEL_EXPORT_FAILED":
                    logging.info("ft upload model to amp failed")
                    return "failed"

        return "timeout"

    def _perform_model_download(self, task_db, amp_download_path):
        """执行模型下载。

        执行从AMP下载模型的操作。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            amp_download_path (str): 下载路径

        Returns:
            None

        Raises:
            Exception: 当下载失败时
        """
        try:
            account = (
                db.session.query(Account)
                .filter(Account.id == task_db.created_by)
                .one_or_none()
            )
            model_service = ModelService(account)
            model_service.amp_download(
                task_db.target_model_name,
                amp_download_path,
                os.getenv("AMP_DEFAULT_MODEL_SPACE"),
            )
            logging.info(
                f"end download from amp, model_name: {task_db.target_model_name}, path: {amp_download_path}"
            )
        except Exception as e:
            self._handle_download_error(task_db, e)

    def _handle_upload_failure(self, task_db, amp_download_path):
        """处理上传失败。

        处理模型上传失败的情况。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            amp_download_path (str): 下载路径

        Returns:
            None
        """
        self.update_task_status_to_db_ft(task_db.id, TaskStatus.FAILED.value)
        logging.info(
            f"ft upload model to amp failed, model_name: {task_db.target_model_name}, path: {amp_download_path}"
        )

    def _handle_upload_timeout(self, task_db, amp_download_path):
        """处理上传超时。

        处理模型上传超时的情况。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            amp_download_path (str): 下载路径

        Returns:
            None
        """
        self.update_task_status_to_db_ft(task_db.id, TaskStatus.IN_PROGRESS.value)
        logging.info(
            f"ft upload model to amp timeout, model_name: {task_db.target_model_name}, path: {amp_download_path}"
        )

    def _handle_download_error(self, task_db, error):
        """处理下载错误。

        处理模型下载错误的情况。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            error (Exception): 错误对象

        Returns:
            None
        """
        self.update_task_status_to_db_ft(task_db.id, TaskStatus.IN_PROGRESS.value)
        logging.info(
            f"download from amp failed model_name: {task_db.target_model_name}, error: {error}"
        )

    def _update_check_count(self, task_db, new_check_count):
        """更新检查次数。

        更新任务的检查次数。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            new_check_count (int): 新的检查次数

        Returns:
            None
        """
        job_info = task_db.task_job_info_dict
        job_info["check_count"] = new_check_count
        task_db.task_job_info = json.dumps(job_info)
        db.session.commit()

    def _update_task_job_info(
        self, task_db, job_id, model_id_or_path, token, check_count
    ):
        """更新任务作业信息。

        更新任务的作业信息。

        Args:
            task_db (FinetuneTask): 任务数据库对象
            job_id (str): 任务ID
            model_id_or_path (str): 模型ID或路径
            token (str): 认证令牌
            check_count (int): 检查次数

        Returns:
            None
        """
        job_info = {
            "job_id": job_id,
            "status": "Completed",
            "model_id_or_path": model_id_or_path,
            "token": token,
            "source": "local",
            "check_count": check_count,
        }
        task_db.task_job_info = json.dumps(job_info)
        db.session.commit()

    def handle_done_task(self, task_id):
        """处理已完成的任务。

        处理微调任务完成后的逻辑，包括模型下载、状态更新等。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当处理任务完成逻辑失败时抛出异常。
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        result = task.task_job_info_dict
        if result is not None and result["model_id_or_path"] is not None:
            target_model_path_or_key = result["model_id_or_path"]
            job_id = result["job_id"]
            # token = result["token"]
            # source = result["source"]
            self.update_task_status_to_db(task_id, TaskStatus.COMPLETED.value)
            account = (
                db.session.query(Account)
                .filter(Account.id == task.created_by)
                .one_or_none()
            )
            service = ModelService(account)
            service.create_ft_finetune_model(
                task.base_model,
                data={  # 0 in ft
                    "user_id": task.created_by,
                    "model_icon": "/app/upload/online.jpg",
                    "current_tenant_id": task.tenant_id,
                    "source_info": task.created_from_info,
                    "base_model_key": task.base_model_key,  # ft base model name
                    "base_model_key_ams": task.base_model_key_ams,
                    "target_model_key": (
                        target_model_path_or_key
                        if task.is_online_model
                        else task.target_model_key
                    ),
                    "target_model_name": task.target_model_name,
                    "model_path": target_model_path_or_key,  # task.target_model_name
                    "finetune_task_id": task.id,
                    "model_from": "finetune",
                    "model_dir": "",
                },
                create_from="finetune",
            )
            logging.info(
                f"ft finetune model created, task_id: {task_id}, target_model_path_or_key: {target_model_path_or_key}"
            )
            # 统计模型所占空间大小
            # Tenant.save_used_storage(task.tenant_id, FileTools.get_dir_path_size(target_model_path_or_key))
            amp_get_result, amp_get_size = service.amp_get_model_size(
                task.target_model_name
            )
            if amp_get_result:
                Tenant.save_used_storage(task.tenant_id, int(amp_get_size))
            else:
                logging.info(
                    "获取微调后的模型大小异常 in handle_done_task FT尚未上传AMP"
                )

            # 检查是否已有日志内容
            if not self._check_existing_log_content(task):
                try:
                    get_ft_log_result, get_ft_log_return = self.get_ft_log(job_id)
                    if get_ft_log_result:
                        if get_ft_log_return == "":
                            get_ft_log_return = "底层微调服务日志为空"
                        self.task_log_content(task_id, get_ft_log_return)
                    else:
                        self.task_log_content(task_id, "获取底层微调服务日志失败")
                except Exception as e:
                    logging.error(f"handle_done_task error: {e}")
            else:
                logging.info(
                    f"Task {task_id} already has log content, skipping log retrieval"
                )
        else:
            self.update_task_status_to_db(task_id, TaskStatus.FAILED.value)

    def handle_failed_task(self, task_id, error_message):
        """处理失败的任务。

        处理微调任务失败后的逻辑，包括状态更新、错误记录等。

        Args:
            task_id (int): 任务ID。
            error_message (str): 错误信息。

        Returns:
            None: 无返回值。
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        self.update_task_status_to_db(task_id, TaskStatus.FAILED.value)
        if task.task_job_info_dict:
            job_id = task.task_job_info_dict["job_id"]

            # 检查是否已有日志内容
            if not self._check_existing_log_content(task):
                get_ft_log_result, get_ft_log_return = self.get_ft_log(job_id)
                if get_ft_log_result:
                    if get_ft_log_return == "":
                        get_ft_log_return = "底层微调服务日志为空"
                    self.task_log_content(task_id, get_ft_log_return)
                else:
                    self.task_log_content(task_id, "获取底层微调服务日志失败")

        elif error_message:
            self.task_log_content(
                task_id=task.id, log_content="", message=error_message
            )

    def update_task_status_to_db(self, task_id, status):
        """更新任务状态到数据库。

        更新微调任务的状态，包括GPU资源释放、日志记录等。

        Args:
            task_id (int): 任务ID。
            status (str): 新的任务状态。

        Returns:
            None: 无返回值。
        """
        t = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if t is None:
            return
        if t.status not in [TaskStatus.FAILED.value, TaskStatus.COMPLETED.value]:
            print(f"更新任务状态 task_id={task_id},status={status}")
            t.status = status

            # 检查是否为超级管理员
            account = Account.default_getone(t.created_by)
            if not account.is_super:
                # 获取租户信息
                tenant = db.session.query(Tenant).filter_by(id=t.tenant_id).first()
                if tenant:
                    # 检查租户的GPU使用情况
                    if tenant.status != "private":  # 如果不是个人空间
                        # 当任务开始运行或结束时(完成/失败)都需要释放GPU资源
                        if status in [
                            TaskStatus.IN_PROGRESS.value,
                            TaskStatus.COMPLETED.value,
                            TaskStatus.FAILED.value,
                        ]:
                            if tenant.gpu_used > 0:
                                tenant.gpu_used -= 1

            if status == TaskStatus.COMPLETED.value:
                LogService().add(
                    Module.MODEL_FINETUNE,
                    Action.FINETUNE_TRAIN_SUCCESS,
                    task_name=t.name,
                    user_id=t.created_by,
                )
            if status == TaskStatus.FAILED.value:
                LogService().add(
                    Module.MODEL_FINETUNE,
                    Action.FINETUNE_TRAIN_FAIL,
                    task_name=t.name,
                    user_id=t.created_by,
                )
            t.train_runtime = calculate_time_difference(t.created_at)
            t.updated_at = TimeTools.get_china_now()
            t.train_end_time = TimeTools.get_china_now()
            db.session.commit()

    def update_task_status_to_db_ft(self, task_id, status):
        """更新FT任务状态到数据库。

        Args:
            task_id (int): 任务ID。
            status (str): 新的任务状态。

        Returns:
            None: 无返回值。
        """
        t = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        if t is None:
            return
        t.status = status
        db.session.commit()

    def _check_existing_log_content(self, task):
        """检查任务是否已有日志内容

        Args:
            task (FinetuneTask): 任务对象

        Returns:
            bool: 如果日志文件存在且有内容返回True，否则返回False
        """
        if not task.log_path:
            return False

        try:
            if os.path.exists(task.log_path):
                # 检查文件大小
                if os.path.getsize(task.log_path) > 0:
                    # 检查文件内容（读取前几行）
                    with open(task.log_path, "r", encoding="utf-8") as f:
                        content = f.read(1024)  # 读取前1KB
                        if content.strip():
                            return True
            return False
        except Exception:
            return False

    def task_log_content(self, task_id, log_content=None, message=None):
        """保存任务日志内容到存储。

        Args:
            task_id (int): 任务ID。
            log_content (str, optional): 日志内容。
            message (str, optional): 额外消息内容。

        Returns:
            None: 无返回值。
        """
        task = db.session.query(FinetuneTask).filter(FinetuneTask.id == task_id).first()
        save_path = os.path.join(LOG_PATH, str(task_id), "finetune.log")

        content = ""
        if message:
            content = log_content + str(message)
        else:
            content = log_content if log_content else ""
        content_byte = content.encode("utf-8")

        storage.save(save_path, content_byte)
        task.log_path = save_path
        db.session.commit()


manage = TaskManager()
