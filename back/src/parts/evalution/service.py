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
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError

import pandas as pd
from flask_login import current_user
from sqlalchemy import func, or_

import lazyllm
from lazyllm.engine.engine import setup_deploy_method

from libs.http_exception import CommonError
from models.model_account import Account
from parts.cost_audit.service import CostService
from parts.data.model import DataSet, DataSetFile, DataSetVersion
from parts.inferservice.service import InferService
from parts.logs import Action, LogService, Module
from utils.util_database import db

from .model import (Dimension, DimensionOption, EvaluationDatasetData,
                    EvaluationDatasetFile, EvaluationScore, Task)


class Service:
    """评估服务类，提供评估任务的创建、管理和执行功能。

    Attributes:
        default_timeout (int): 默认超时时间（秒）。
        dataset_inference_timeout (int): 数据集推理超时时间（秒）。
        ai_evaluation_timeout (int): AI评测超时时间（秒）。
    """

    def __init__(self):
        """初始化评估服务。

        设置默认的超时时间配置。
        """
        # 默认超时时间配置（秒）
        self.default_timeout = 60  # 60秒
        self.dataset_inference_timeout = 60  # 60秒
        self.ai_evaluation_timeout = 60  # 60秒

    def set_timeout_config(self, dataset_timeout=None, evaluation_timeout=None):
        """设置超时时间配置。

        Args:
            dataset_timeout (int, optional): 数据集推理超时时间（秒）。
            evaluation_timeout (int, optional): AI评测超时时间（秒）。

        Returns:
            None: 无返回值。
        """
        if dataset_timeout is not None:
            self.dataset_inference_timeout = dataset_timeout
        if evaluation_timeout is not None:
            self.ai_evaluation_timeout = evaluation_timeout

    def get_timeout_config(self):
        """获取当前超时配置。

        Returns:
            dict: 包含当前超时配置的字典。
        """
        return {
            "default_timeout": self.default_timeout,
            "dataset_inference_timeout": self.dataset_inference_timeout,
            "ai_evaluation_timeout": self.ai_evaluation_timeout,
        }

    def check_task_name_notunique(self, name, tenant_id):
        """检查任务名称是否已存在。

        Args:
            name (str): 任务名称。
            tenant_id (str): 租户ID。

        Returns:
            bool: 如果任务名称已存在返回True，否则返回False。
        """
        return Task.query.filter_by(name=name, tenant_id=tenant_id).first() is not None

    def create_task(self, dataset_id, data):
        """创建评估任务。

        Args:
            dataset_id (str): 数据集ID。
            data (dict): 任务创建参数，包含以下字段：
                - task_name (str): 任务名称。
                - model_name (str): 模型名称。
                - model_type (str): 模型类型。
                - evaluation_type (str): 评估类型。
                - evaluation_method (str): 评估方法。
                - prompt (str, optional): 提示词。
                - ai_evaluator_name (str, optional): AI评估器名称。
                - ai_evaluator_type (str, optional): AI评估器类型。
                - scene (str, optional): 场景。
                - scene_descrp (str, optional): 场景描述。

        Returns:
            int: 创建的任务ID。
        """
        task_name = data.get("task_name")
        model_name = data.get("model_name")
        model_type = data.get("model_type")
        evaluation_type = data.get("evaluation_type")
        evaluation_method = data.get("evaluation_method")
        prompt = data.get("prompt", "")
        ai_evaluator_name = data.get("ai_evaluator_name", "")
        ai_evaluator_type = data.get("ai_evaluator_type")
        scene = data.get("scene", "")
        scene_descrp = data.get("scene_descrp", "")
        task = Task(
            name=task_name,
            model_name=model_name,
            dataset_id=dataset_id,
            evaluation_type=evaluation_type,
            evaluation_method=evaluation_method,
            status="dataset_processing",
            user_id=current_user.id,
            tenant_id=current_user.current_tenant_id,
            scene=scene,
            scene_descrp=scene_descrp,
            prompt=prompt,
            ai_evaluator_name=ai_evaluator_name,
            ai_evaluator_type=ai_evaluator_type,
            model_type=model_type,
        )

        # 添加任务基本信息到数据库会话
        db.session.add(task)
        db.session.flush()  # 立即刷新以便获取 task.id
        return task.id

    def create_dimension(self, dimensions: list, task_id: int):
        for dimension_data in dimensions:
            dimension = Dimension(
                dimension_name=dimension_data["dimension_name"],
                dimension_description=dimension_data["dimension_description"],
                ai_base_score=dimension_data.get("ai_base_score", 0),
                task_id=task_id,
            )
            db.session.add(dimension)
            db.session.flush()  # 刷新以便获取 dimension.id

            # 创建维度的选项
            for option_data in dimension_data["options"]:
                option = DimensionOption(
                    option_description=option_data["option_name"],
                    value=option_data["option_value"],
                    dimension_id=dimension.id,
                )
                db.session.add(option)

        # 提交数据库会话
        db.session.commit()

    def query_task_list(self, page: int, per_page: int, keyword: str, qtype: str):
        """查询任务列表。

        Args:
            page (int): 页码。
            per_page (int): 每页大小。
            keyword (str): 搜索关键词。
            qtype (str): 查询类型。

        Returns:
            dict: 分页结果，包含任务列表和分页信息。
        """
        filters = []
        if qtype == "group":  # 组内评测
            filters.append(Task.tenant_id == current_user.current_tenant_id)
            filters.append(Task.user_id != current_user.id)
        else:  # 我的评测
            filters.append(Task.tenant_id == current_user.current_tenant_id)
            filters.append(Task.user_id == current_user.id)
        tasks_query = Task.query.filter(*filters).order_by(Task.created_at.desc())
        if keyword:
            tasks_query = tasks_query.filter(Task.name.like(f"%{keyword}%"))
        return tasks_query.paginate(page=page, per_page=per_page, error_out=False)

    def delete_task(self, task):
        """删除评估任务。

        Args:
            task (Task): 要删除的任务对象。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当删除失败时抛出异常。
        """
        # 查找指定ID的任务

        if not task:
            return None
        # 删除任务
        db.session.delete(task)
        db.session.commit()
        return True

    def upload_datasets(self, file_path):
        """上传数据集。

        Args:
            file_path (str): 文件路径。

        Returns:
            str: 数据集ID。

        Raises:
            Exception: 当上传失败时抛出异常。
        """
        all_files = []
        if isinstance(file_path, list):
            all_files = file_path
        elif os.path.isdir(file_path):
            # 遍历文件夹
            for root, dirs, files in os.walk(file_path):
                for file in files:
                    all_files.append(os.path.join(root, file))
        # 保存文件信息
        des = ",".join(all_files)
        dataset = EvaluationDatasetFile(
            name=des[:128],
            description=f"{des} 上传于 {pd.Timestamp.now()}",
            file_path="",
            file_type="",
            size=0,
            has_response=False,
        )

        db.session.add(dataset)
        db.session.flush()
        dataset_id = dataset.id

        try:
            import chardet

            # filename = secure_filename(file.filename)
            for filepath in all_files:
                # 加载文件

                with open(filepath, "rb") as f:
                    result = chardet.detect(f.read())
                df = None
                if filepath.endswith(".csv"):
                    df = pd.read_csv(filepath, encoding=result["encoding"])
                elif filepath.endswith(".json"):
                    df = pd.read_json(filepath, encoding=result["encoding"])
                elif filepath.endswith(".xlsx"):
                    df = pd.read_excel(filepath)

                # 检查字段
                required_columns = {"instruction", "output"}
                if not required_columns.issubset(df.columns):
                    continue

                # 将数据写入数据库
                for _, row in df.iterrows():
                    final_instruction = ""
                    if (
                        pd.notna(row.get("instruction"))
                        and str(row["instruction"]).strip()
                    ):
                        final_instruction = str(row["instruction"]).strip()
                    if (
                        "input" in df.columns
                        and pd.notna(row.get("input"))
                        and str(row["input"]).strip()
                    ):
                        final_instruction = (
                            final_instruction + "\n" + str(row["input"]).strip()
                        )

                    dataset_entry = EvaluationDatasetData(
                        dataset_id=dataset_id,
                        instruction=final_instruction,
                        output=row["output"],
                        response=row.get("response"),  # response 字段可选
                        is_evaluated=0,  # 默认未评价
                        option_select_id=None,  # 默认未选择选项
                    )
                    db.session.add(dataset_entry)
                db.session.commit()
        except Exception as e:
            raise CommonError(f"文件{filepath}处理失败: {e}")
        return dataset_id

    def set_offline_dataset_id(self, dataset_ids):
        """设置离线数据集ID。

        Args:
            dataset_ids (list): 数据集ID列表。

        Returns:
            str: 合并后的数据集ID。
        """
        # 选择了多个数据集 要把数据集归集到一个数据集ID
        dataset = EvaluationDatasetFile(
            name="归集数据集",
            description="数据集原ID:" + ",".join(str(x) for x in dataset_ids),
            file_path="",
            file_type="",
            size=0,
            has_response=False,
        )
        db.session.add(dataset)
        db.session.flush()
        EvaluationDatasetData.query.filter(
            EvaluationDatasetData.dataset_id.in_(dataset_ids)
        ).update({"dataset_id": dataset.id})
        db.session.commit()
        return dataset.id

    def get_task_by_id(self, task_id: int):
        """根据ID获取任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            Task: 任务对象。
        """
        return Task.query.get(task_id)

    # 查询未打分的数据集的第一条数据
    def get_first_unscored_data(self, task_id: int, dataset_id: int):
        """获取第一个未评分的数据。

        Args:
            task_id (int): 任务ID。
            dataset_id (int): 数据集ID。

        Returns:
            dict: 第一个未评分的数据信息。
        """
        # 获取所有关联的数据ID
        scored_data_ids = (
            EvaluationScore.query.with_entities(EvaluationScore.data_id)
            .filter_by(task_id=task_id)
            .all()
        )
        # 提取 data_id 列表
        scored_data_ids = [data_id[0] for data_id in scored_data_ids]

        if not scored_data_ids:
            return EvaluationDatasetData.query.filter_by(dataset_id=dataset_id).first()

        # 查找未打分的第一条数据
        first_unscored_data = (
            EvaluationDatasetData.query.filter_by(dataset_id=dataset_id)
            .filter(EvaluationDatasetData.id.notin_(scored_data_ids))
            .first()
        )

        return first_unscored_data

    def get_evaluation_dimensions(self, task_id: int):
        """获取评估维度。

        Args:
            task_id (int): 任务ID。

        Returns:
            list: 评估维度列表。
        """
        dimensions = Dimension.query.filter_by(task_id=task_id).all()

        return dimensions

    def get_evaluation_dimensions_option(self, demension_id: int):
        """获取评估维度选项。

        Args:
            demension_id (int): 维度ID。

        Returns:
            list: 评估维度选项列表。
        """
        options = DimensionOption.query.filter_by(dimension_id=demension_id).all()
        return options

    def count_evaluation_option(self, task_id: int, option_id: int):
        """统计评估选项数量。

        Args:
            task_id (int): 任务ID。
            option_id (int): 选项ID。

        Returns:
            int: 评估选项数量。
        """
        try:
            # 处理option_id为0或None的情况
            if option_id == 0 or option_id is None:
                return 0

            score_count = EvaluationScore.query.filter_by(
                task_id=task_id, option_select_id=option_id
            ).count()  # 获取此指标的总得分
            return score_count
        except Exception as e:
            logging.error(f"count_evaluation_option error: {str(e)}")
            return 0

    def dimension_score_for_task(self, task_id):
        """获取任务的维度评分。

        Args:
            task_id (int): 任务ID。

        Returns:
            dict: 维度评分信息。
        """
        try:
            result = (
                db.session.query(
                    EvaluationScore.dimension_id,
                    func.sum(EvaluationScore.score).label("score_sum"),
                    func.count(EvaluationScore.id).label("score_count"),
                )
                .filter(
                    EvaluationScore.task_id == task_id,
                    EvaluationScore.score.isnot(None),  # 排除score为None的记录
                )
                .group_by(EvaluationScore.dimension_id)
                .all()
            )

            # 将结果转化为字典数组
            result_dict_array = {}
            for row in result:
                if row[0] is not None:  # 确保dimension_id不为None
                    result_dict_array[row[0]] = {
                        "total": int(row[1]) if row[1] is not None else 0,
                        "count": int(row[2]) if row[2] is not None else 0,
                    }

            return result_dict_array
        except Exception as e:
            logging.error(f"dimension_score_for_task error: {str(e)}")
            return {}

    #             score_list.append(score_sum)

    def save_evaluation_scores(
        self,
        task_id: int,
        data_id: int,
        dimension_id: int,
        option_select_id: int = 0,
        score: int = 0,
        remark: str = "",
    ):
        """保存评估分数。

        Args:
            task_id (int): 任务ID。
            data_id (int): 数据ID。
            dimension_id (int): 维度ID。
            option_select_id (int, optional): 选项ID，默认为0。
            score (int, optional): 分数，默认为0。
            remark (str, optional): 备注，默认为空字符串。

        Returns:
            bool: 保存是否成功。
        """
        if option_select_id != 0 and score == 0:
            score = DimensionOption.query.get(option_select_id).value
        score_exists = EvaluationScore.query.filter_by(
            task_id=task_id, data_id=data_id, dimension_id=dimension_id
        ).first()
        if score_exists:
            score_exists.option_select_id = option_select_id
            score_exists.score = score
            score_exists.remark = remark
            db.session.commit()
        else:
            evaluation_score = EvaluationScore(
                task_id=task_id,
                data_id=data_id,
                dimension_id=dimension_id,
                option_select_id=option_select_id,
                score=score,
                remark=remark,
            )
            db.session.add(evaluation_score)
        # if score>0:
        data = EvaluationDatasetData.query.filter_by(id=data_id).first()
        data.is_evaluated = True
        db.session.commit()
        # self.checkdone(task_id)

    #
    def checkdone(self, task_id):
        """检查任务是否完成。

        Args:
            task_id (int): 任务ID。

        Returns:
            bool: 如果任务完成返回True，否则返回False。
        """
        task = self.get_task_by_id(task_id)
        total = (
            db.session.query(EvaluationDatasetData)
            .filter_by(dataset_id=task.dataset_id)
            .count()
        )
        completed = (
            db.session.query(EvaluationDatasetData)
            .filter_by(dataset_id=task.dataset_id)
            .filter_by(is_evaluated=True)
            .count()
        )
        if total == completed:
            task.status = "done"
            db.session.commit()

    # def set_evaluation_data_evaluation(self,id:int):

    def get_evaluation_data(self, task, page: int = None, option_select_id: int = None):
        """获取评估数据。

        Args:
            task (Task): 任务对象。
            page (int, optional): 页码。
            option_select_id (int, optional): 选项ID。

        Returns:
            dict: 评估数据信息。
        """
        per_page = 1  # 每页一条数据
        dataset_id = task.dataset_id
        task_id = task.id
        first_data = None
        select_data = []
        # 如果是查看选择了某个选项的数据
        if option_select_id:
            score = EvaluationScore.query.filter(
                EvaluationScore.option_select_id == option_select_id
            ).all()
            for s in score:
                select_data.append(s.data_id)

        if (page is None or page < 1) and option_select_id is None:
            # 如果没有提供页码或页码小于 1，则查找第一条未评估数据
            first_data = (
                EvaluationDatasetData.query.filter(
                    EvaluationDatasetData.dataset_id == dataset_id,
                    EvaluationDatasetData.is_evaluated.isnot(True),
                )
                .order_by(EvaluationDatasetData.id.asc())
                .first()
            )
            if first_data:

                # 计算此未评估数据所在的页码

                current_position = EvaluationDatasetData.query.filter(
                    EvaluationDatasetData.dataset_id == dataset_id,
                    EvaluationDatasetData.id <= first_data.id,
                ).count()
                page = (current_position + per_page - 1) // per_page  # 确定所在页码
        # if first_data == None:
        page = 1 if (page is None or page < 1) else page
        # 根据页码查询当前数据,当没有未评估的数据或指定页数的数据时
        query = EvaluationDatasetData.query.filter_by(dataset_id=dataset_id)
        if select_data:
            query = query.filter(EvaluationDatasetData.id.in_(select_data))
        query = query.order_by(EvaluationDatasetData.id.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        if not pagination.items:
            raise ValueError("没有查询到数据")

        first_data = pagination.items[0]  # 每页只取一条数据
        evaluations = []
        if first_data.is_evaluated:
            # 已评估的数据查找评估的各个维度的成绩
            score = EvaluationScore.query.filter_by(
                data_id=first_data.id, task_id=task_id
            ).all()
            evaluations = [
                {
                    "dimension_id": s.dimension_id,
                    "score": s.score,
                    "option_select_id": s.option_select_id,
                }
                for s in score
            ]
        return {
            "data": {
                "id": first_data.id,
                "instruction": first_data.instruction,
                "output": first_data.output,
                "response": first_data.response,
                "is_evaluated": first_data.is_evaluated,
                "evaluations": evaluations,
            },
            "page": page,
            "total_pages": (
                EvaluationDatasetData.query.filter_by(dataset_id=dataset_id).count()
                + per_page
                - 1
            )
            // per_page,
        }

    def get_all_model(self):
        """获取所有模型。

        Returns:
            list: 模型列表。
        """
        from parts.models_hub.model import Lazymodel

        filters = [
            or_(
                Lazymodel.tenant_id == current_user.current_tenant_id,
                Lazymodel.user_id == Account.get_administrator_id(),
            )
        ]
        filters.append(Lazymodel.deleted_flag == 0)
        models = Lazymodel.query.filter(*filters).all()
        return [{"id": model.id, "name": model.model_name} for model in models]

    def get_all_dataset(self):
        """获取所有数据集。

        Returns:
            list: 数据集列表。
        """
        filters = [
            or_(
                DataSet.tenant_id == current_user.current_tenant_id,
                DataSet.user_id == Account.get_administrator_id(),
            )
        ]
        filters.append(DataSet.data_type == "doc")
        query = DataSet.query.filter(*filters)
        datasets = query.order_by(DataSet.created_at.desc()).all()
        ret = []
        for dataset in datasets:
            if dataset.file_paths:
                ret.append({"id": dataset.id, "name": dataset.name})
        return ret

    def _llm_forward_with_timeout(self, llm, prompt, timeout_seconds=60, max_retries=1):
        """带超时的LLM前向传播。

        Args:
            llm: LLM模型对象。
            prompt (str): 提示词。
            timeout_seconds (int, optional): 超时时间（秒），默认为60。
            max_retries (int, optional): 最大重试次数，默认为1。

        Returns:
            str: LLM响应结果。

        Raises:
            TimeoutError: 当请求超时时抛出异常。
            Exception: 当其他错误发生时抛出异常。
        """

        def _forward_worker():
            """LLM前向传播工作函数。

            Returns:
                str: LLM响应结果。
            """
            try:
                result = llm.forward(prompt)
                return (True, result, None)
            except Exception as e:
                return (False, None, str(e))

        for attempt in range(max_retries + 1):
            try:
                logging.info(
                    f"LLM推理开始，第{attempt + 1}次尝试，超时时间: {timeout_seconds}秒"
                )
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(_forward_worker)
                    result = future.result(timeout=timeout_seconds)

                    if result[0]:  # 成功
                        logging.info(f"LLM推理成功，第{attempt + 1}次尝试")
                        return result
                    else:  # 推理失败但未超时
                        logging.warning(
                            f"LLM推理失败，第{attempt + 1}次尝试，错误: {result[2]}"
                        )
                        if attempt < max_retries:
                            logging.info(f"准备进行第{attempt + 2}次重试...")
                            continue
                        else:
                            return result

            except TimeoutError:
                logging.error(
                    f"LLM推理超时，第{attempt + 1}次尝试，超时时间: {timeout_seconds}秒"
                )
                if attempt < max_retries:
                    logging.info(f"超时，准备进行第{attempt + 2}次重试...")
                    continue
                else:
                    return (False, None, f"推理超时，超过{timeout_seconds}秒未返回结果")
            except Exception as e:
                logging.error(f"LLM推理异常，第{attempt + 1}次尝试: {e}")
                if attempt < max_retries:
                    logging.info(f"异常，准备进行第{attempt + 2}次重试...")
                    continue
                else:
                    return (False, None, str(e))

        return (False, None, "所有重试都失败了")

    def llm_model_start(self, model, task_model_name=None):
        """启动LLM模型。

        Args:
            model: 模型对象。
            task_model_name (str, optional): 任务模型名称。

        Returns:
            object: 启动的LLM模型对象。

        Raises:
            Exception: 当模型启动失败时抛出异常。
        """
        try:
            llm = None
            if model:
                if model.model_type == "online":
                    api_key = None
                    secret_key = None
                    api_key = model.api_key
                    if api_key:
                        if ":" in api_key:
                            api_key, secret_key = api_key.split(":", 1)
                    llm = lazyllm.OnlineChatModule(
                        source=model.model_brand,
                        model=model.model_name,
                        stream=False,
                        api_key=api_key,
                        secret_key=secret_key,
                    )
                else:
                    # 启动模型l
                    # llm = lazyllm.TrainableModule(model.model_path).start()
                    if task_model_name and ":" in task_model_name:
                        service_id = task_model_name.split(":")[1]
                        service_info = InferService().get_infer_model_service_by_id(
                            service_id
                        )
                        logging.info(f"service_info: {service_info}")
                        llm = lazyllm.TrainableModule(model.model_name)
                        setup_deploy_method(
                            llm, service_info["framework"], url=service_info["url"]
                        )
                    else:
                        llm = None
                        # llm = lazyllm.TrainableModule(model.model_path).start()
            return llm
        except Exception as e:
            logging.error(f"start_model error: {e}")
            return None

    def create_ai_evaluation_prompt(self, task, dataset_data, dimensions):
        """创建AI评估提示词。

        Args:
            task (Task): 任务对象。
            dataset_data (dict): 数据集数据。
            dimensions (list): 评估维度列表。

        Returns:
            str: 生成的AI评估提示词。
        """
        instruction = dataset_data.instruction
        output = dataset_data.output
        response = dataset_data.response
        standard = ""
        for dimension in dimensions:
            standard += "\nmetric:\n"
            standard += f"metric_id:{dimension.id}\n"
            standard += (
                f"name:{dimension.dimension_name},{dimension.dimension_description}\n"
            )
            standard += f"total_score:{dimension.ai_base_score}\n"
            standard += "score_standard:\n"
            options = dimension.options
            for option in options:
                standard += f"- {option.option_description}\n"
            standard += "\n"
        prompt = (
            task.prompt.replace("{scene}", task.scene)
            .replace("{scene_descrp}", task.scene_descrp)
            .replace("{standard}", standard)
        )
        prompt = (
            prompt.replace("{instruction}", instruction)
            .replace("{output}", output)
            .replace("{response}", response)
        )
        return prompt

    def start_evaluation(self, task_id):
        """开始评估任务。

        Args:
            task_id (int): 任务ID。

        Returns:
            bool: 评估是否成功启动。
        """
        logging.info(f"start start_evaluation: {task_id}")
        self.dataset_process(task_id)
        logging.info(f"end dataset_process: {task_id}")
        self.ai_evaluation_process(task_id)

    # 处理数据集，对没有response的数据进行推理
    def dataset_process(self, task_id):
        """处理数据集。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当处理失败时抛出异常。
        """
        logging.info(f"start dataset_process: {task_id}")
        task = Task.query.get(task_id)
        dataset_id = task.dataset_id
        dataset_data = (
            EvaluationDatasetData.query.filter_by(dataset_id=dataset_id)
            .filter(EvaluationDatasetData.response.is_(None))
            .all()
        )
        model = task.model
        if dataset_data == []:
            if task.evaluation_method == "ai":
                task.status = "ai_evaluating"
            else:
                task.status = "manual_evaluating"
        else:
            llm = self.llm_model_start(model, task.model_name)
            if llm is None:
                task.status = "dataset_inference_failed"
                task.failed_reason = "启动模型推理服务失败："
                LogService().add(
                    Module.MODEL_EVALUATE,
                    Action.EVALUATE_INFERENCE_FAILED,
                    user_id=task.user_id,
                    task_method=task.evaluation_method_name,
                    task_name=task.name,
                    result="失败：启动模型推理服务失败",
                )
            if llm:
                logging.info(f"start dataset_inference by llm: {task_id}")
                # 开始对没有response的数据进行推理
                cnt = 0
                for d in dataset_data:
                    if not d.response:
                        try:
                            # 使用带超时的推理调用
                            success, response, error_msg = (
                                self._llm_forward_with_timeout(
                                    llm,
                                    d.instruction,
                                    timeout_seconds=self.dataset_inference_timeout,
                                )
                            )

                            if success:
                                d.response = response
                            else:
                                logging.error(
                                    f"数据集推理失败，data_id: {d.id}, 错误: {error_msg}"
                                )
                                d.response = "模型生成文案失败"
                                cnt += 1
                                if cnt > 3:
                                    break

                        except Exception as e:
                            LogService().add(
                                Module.MODEL_EVALUATE,
                                Action.EVALUATE_INFERENCE_FAILED,
                                user_id=task.user_id,
                                task_method=task.evaluation_method_name,
                                task_name=task.name,
                                result="失败：" + str(e),
                            )
                            d.response = "模型生成文案失败"
                            cnt += 1
                            if cnt > 3:
                                break
                        db.session.commit()

                if task.evaluation_method == "ai":
                    task.status = "ai_evaluating"
                else:
                    task.status = "manual_evaluating"
                # llm.stop()
                LogService().add(
                    Module.MODEL_EVALUATE,
                    Action.EVALUATE_INFERENCE_FAILED,
                    user_id=task.user_id,
                    task_method=task.evaluation_method_name,
                    task_name=task.name,
                    result="成功",
                )
                logging.info(f"end dataset_inference by llm: {task_id}")

        db.session.commit()

    def check_result(self, task, result_list, dimension_ids):
        """检查评估结果。

        Args:
            task (Task): 任务对象。
            result_list (list): 结果列表。
            dimension_ids (list): 维度ID列表。

        Returns:
            bool: 结果检查是否通过。
        """

        matches = re.findall(r"\[.*?\]", result_list, re.DOTALL)
        if matches:
            json_data = matches[-1]
            json_data = json_data.replace("'", '"')
            logging.info("AI测评结果中提取分数:" + json_data)
            final_result = []
            results = json.loads(json_data)
            for result in results:
                if result["metric_id"] in dimension_ids:
                    final_result.append(result)
                else:
                    LogService().add(
                        Module.MODEL_EVALUATE,
                        Action.EVALUATE_FAILED,
                        user_id=task.user_id,
                        task_method=task.evaluation_method_name,
                        task_name=task.name,
                        result="失败:AI评分结果metric_id不在维度列表中",
                    )
            return final_result

        else:
            LogService().add(
                Module.MODEL_EVALUATE,
                Action.EVALUATE_FAILED,
                user_id=task.user_id,
                task_method=task.evaluation_method_name,
                task_name=task.name,
                result="失败:没有获取到AI评分结果",
            )
            return False

    # 处理ai测评
    def ai_evaluation_process(self, task_id):
        """AI评估处理。

        Args:
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当评估失败时抛出异常。
        """

        task = Task.query.get(task_id)
        dataset_id = task.dataset_id
        if task.evaluation_method == "ai":
            logging.info(f"start ai_evaluation_process: {task_id}")
            # 开始ai评测
            llm = self.llm_model_start(task.model, task.ai_evaluator_name)
            if llm is None:
                task.status = "ai_evalute_failed"
                task.failed_reason = "启动模型推理服务失败"
                db.session.commit()
                LogService().add(
                    Module.MODEL_EVALUATE,
                    Action.EVALUATE_FAILED,
                    user_id=task.user_id,
                    task_method=task.evaluation_method_name,
                    task_name=task.name,
                    result="失败：启动模型推理服务失败",
                )
                return
            else:
                logging.info(f"start ai_evaluation_process by llm: {task_id}")
                dataset_data = EvaluationDatasetData.query.filter_by(
                    dataset_id=dataset_id
                ).all()
                dimensions = Service().get_evaluation_dimensions(task_id)
                dimension_ids = [dimension.id for dimension in dimensions]
                total = len(dataset_data)
                complete = 0
                cnt = 0
                for d in dataset_data:
                    if not d.response or d.response == "模型生成文案失败":
                        continue
                    prompt = self.create_ai_evaluation_prompt(task, d, dimensions)
                    tokens = 0
                    logging.info("AI测评prompt:" + prompt)
                    try:
                        # 使用带超时的推理调用
                        success, result_list, error_msg = (
                            self._llm_forward_with_timeout(
                                llm, prompt, timeout_seconds=self.ai_evaluation_timeout
                            )
                        )

                        if success:
                            logging.info("AI测评结果:" + result_list)
                            for key, value in lazyllm.globals.usage.items():
                                tokens += (
                                    value["prompt_tokens"] + value["completion_tokens"]
                                )
                            logging.info(
                                "获取到评测消耗token:"
                                + str(tokens)
                                + ",dataid:"
                                + str(d.id)
                            )
                            CostService.add(
                                user_id=current_user.id,
                                app_id="",
                                token_num=tokens,
                                call_type="evaluation",
                                tenant_id=task.tenant_id,
                                task_id=task.id,
                            )
                            results = self.check_result(
                                task, result_list, dimension_ids
                            )
                            if not results:
                                continue
                            for result in results:
                                score = result["metric_final_score"]
                                self.save_evaluation_scores(
                                    data_id=d.id,
                                    dimension_id=result["metric_id"],
                                    score=score,
                                    task_id=task_id,
                                )
                            complete += 1
                        else:
                            logging.error(
                                f"AI评测推理失败，data_id: {d.id}, 错误: {error_msg}"
                            )
                            LogService().add(
                                Module.MODEL_EVALUATE,
                                Action.EVALUATE_FAILED,
                                user_id=task.user_id,
                                task_method=task.evaluation_method_name,
                                task_name=task.name,
                                result="失败:" + error_msg,
                            )
                            cnt += 1
                            if cnt > 3:
                                break
                    except Exception as e:
                        LogService().add(
                            Module.MODEL_EVALUATE,
                            Action.EVALUATE_FAILED,
                            user_id=task.user_id,
                            task_method=task.evaluation_method_name,
                            task_name=task.name,
                            result="失败:" + str(e),
                        )

                        print("ai评测推理失败:" + str(e))
                        db.session.commit()
                        cnt += 1
                        if cnt > 3:
                            break
                task.status = "ai_evaluated"
                db.session.commit()
                if task.completed == task.total:
                    LogService().add(
                        Module.MODEL_EVALUATE,
                        Action.EVALUATE_TASK_FINISH,
                        task_method=task.evaluation_method_name,
                        task_name=task.name,
                        completed=task.completed,
                        total=task.total,
                    )
                if total == complete:
                    LogService().add(
                        Module.MODEL_EVALUATE,
                        Action.EVALUATE_FAILED,
                        user_id=task.user_id,
                        task_method=task.evaluation_method_name,
                        task_name=task.name,
                        result="成功",
                    )
                logging.info(f"end ai_evaluation_process by llm: {task_id}")
            logging.info(f"end ai_evaluation_process: {task_id}")

    def process_online_dataset(self, dataset_ids, task_id):
        """处理在线数据集。

        Args:
            dataset_ids (list): 数据集ID列表。
            task_id (int): 任务ID。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当处理失败时抛出异常。
        """
        logging.info(f"begin process online dataset: {dataset_ids}, {task_id}")
        task = self.get_task_by_id(task_id)
        if task.evaluation_type == "online":
            try:
                datasets = (
                    DataSet.query.filter(DataSet.data_type == "doc")
                    .filter(DataSet.id.in_(dataset_ids))
                    .all()
                )
                dataset_id = 0
                file_paths = []
                for dataset in datasets:
                    # 暂时使用v1.0.0-dirty版本
                    version = DataSetVersion.query.filter_by(
                        data_set_id=dataset.id, version="v1.0.0-dirty"
                    ).first()
                    # version.data_set_file_ids 是 list
                    if version.data_set_file_ids:
                        for file_id in version.data_set_file_ids:
                            data_file = DataSetFile.query.get(file_id)
                            if data_file and data_file.path:
                                file_paths.append(data_file.path)

                if len(file_paths) > 0:
                    dataset_id = Service().upload_datasets(file_paths)
                    task.dataset_id = dataset_id
                    db.session.commit()
                else:
                    task.status = "dateset_error"
                    db.session.commit()
                    return False
                # 更新任务数据集字段
            except Exception as e:
                task.status = "dateset_error"
                task.failed_reason = str(e)
                db.session.commit()
                return False
        logging.info(f"end process online dataset: {dataset_ids}, {task_id}")
        # 开始处理数据集和ai评测
        self.start_evaluation(task_id)
