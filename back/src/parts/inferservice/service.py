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

import logging
import os
import time
from datetime import timedelta

import requests
from flask_login import current_user
from sqlalchemy import or_

from lazyllm.engine import LightEngine

from libs.timetools import TimeTools
from models.model_account import Account, Tenant
from parts.inferservice.model import InferModelService, InferModelServiceGroup
from parts.logs import Action, LogService, Module
from parts.models_hub.model import Lazymodel
from parts.models_hub.model_list import \
    ams_model_list as ams_local_model_list_ams
from parts.models_hub.model_list import model_kinds
from utils.util_database import db

logger = logging.getLogger(__name__)

def get_service_info(service_id):
    """获取服务信息。

    Args:
        service_id (int): 服务ID。

    Returns:
        dict: 服务信息字典，包含model_name、service_name、service_name_ams、framework等。

    Raises:
        Exception: 当获取服务信息失败时抛出异常。
    """
    logging.info(f"get_service_info service_id: {service_id}")
    service = InferModelService.query.get(service_id)
    get_service_info_res = {}
    try:
        if service.gid:
            group_id = service.group_id
            group_info = InferModelServiceGroup.query.get(group_id)
            model_name = group_info.model_name
            get_service_info_res["model_name"] = model_name
            service_name = service.name
            get_service_info_res["service_name"] = service_name
            service_name_ams = service.gid
            get_service_info_res["service_name_ams"] = service_name_ams

            model_info = Lazymodel.query.get(service.model_id)
            if model_info.model_from == "finetune":
                model_name = model_info.model_key_ams
                get_service_info_res["model_name"] = model_info.model_key_ams
            for local_ams_model in ams_local_model_list_ams:
                if local_ams_model["model_name"] == model_name:
                    get_service_info_res["framework"] = local_ams_model["framework"]
                    break

    except Exception as e:
        logging.info(f"get_service_info failed, id: {service_id}, error: {str(e)}")
    logging.info(f"get_service_info: {get_service_info_res}")
    return get_service_info_res


class InferService:
    """推理服务类，负责管理模型推理服务。

    该服务提供推理服务的创建、启动、停止、查询等操作，
    包括与AMS服务的交互、本地模型管理等功能。

    Attributes:
        engine (LightEngine): 轻量级引擎对象。
    """
    def __init__(self):
        self.supplier = os.getenv("CLOUD_SUPPLIER", "lazyllm")

    def _get_used_infer_model_ids(self):
        rows = (
            db.session.query(InferModelServiceGroup.model_id)
            .filter(InferModelServiceGroup.model_id.isnot(None))
            .distinct()
            .all()
        )
        return {row[0] for row in rows if row[0]}

    def check_gpu_quota(self, tenant_id, required_gpus=1):
        """检查GPU配额。

        Args:
            tenant_id (str): 租户ID。
            required_gpus (int, optional): 需要的GPU数量，默认为1。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当GPU配额不足时抛出异常。
        """
        tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()
        print(
            "tenant.gpu_used",
            tenant.gpu_used,
            "required_gpus",
            required_gpus,
            "tenant.gpu_quota",
            tenant.gpu_quota,
            "tenant_id",
            tenant_id,
        )
        if tenant.gpu_used + required_gpus > tenant.gpu_quota:
            remaining = tenant.gpu_quota - tenant.gpu_used
            raise ValueError(
                f"当前组内/个人空间已消耗{tenant.gpu_used}张显卡，"
                f"仅剩{remaining}张可用，不足{required_gpus}张。"
            )

    def ams_get_service_status(self, lws_release_name):
        """获取AMS服务状态。

        Args:
            lws_release_name (str): LWS发布名称。

        Returns:
            tuple: (bool, str, str) 获取结果元组，包含：
                - bool: 是否成功获取
                - str: 服务状态
                - str: 服务端点

        Raises:
            Exception: 当请求AMS服务失败时抛出异常。
        """
        ams_get_url = (
            os.getenv("AMS_ENDPOINT") + "/v1/inference_services/" + lws_release_name
        )
        logging.info(f"ams_get_url: {ams_get_url}")
        try:
            response = requests.get(ams_get_url, timeout=5)
            try:
                response_data = response.json()
            except ValueError:
                logging.info(
                    f"ams_get_service_status 响应非JSON，status={response.status_code}, text={response.text}"
                )
                return False, "", ""
            logging.info(f"ams get model status response: {response.status_code}")
            logging.info(f"ams_get_service_status response: {response.text}")
            if response.status_code != 200:
                logging.info(
                    f"ams_get_service_status failed: {response_data.get('code')}, {response_data.get('message')}"
                )
                return False, "", ""
            if response_data.get("deploy_method"):
                for local_ams_model in ams_local_model_list_ams:
                    if local_ams_model["name"] == response_data.get("model_name"):
                        local_ams_model["framework"] = response_data.get(
                            "deploy_method"
                        )
                        break
            
            # 获取endpoint并检查是否需要替换IP
            endpoint = response_data.get("endpoint")
            if endpoint:
                # 从ams_get_url中提取IP地址
                from urllib.parse import urlparse
                parsed_url = urlparse(ams_get_url)
                ams_host = parsed_url.hostname
                
                # 检查endpoint是否包含127.0.0.1或localhost
                if "127.0.0.1" in endpoint or "localhost" in endpoint:
                    # 替换为ams_get_url的IP地址
                    if "127.0.0.1" in endpoint:
                        endpoint = endpoint.replace("127.0.0.1", ams_host)
                    if "localhost" in endpoint:
                        endpoint = endpoint.replace("localhost", ams_host)
                    logging.info(f"替换endpoint中的IP地址: {endpoint}")
            
            return True, response_data.get("status"), endpoint
        except Exception as e:
            logging.info(f"ams_get_service_status failed: {str(e)}")
            return False, "", ""

    def _build_filters(self, qtype, search_name, model_kind, is_draw, tenant=""):
        """构建查询过滤器。

        Args:
            qtype (str): 查询类型。
            search_name (str): 搜索名称。
            model_kind (str): 模型类型。
            is_draw (bool): 是否为草稿。

        Returns:
            list: 过滤器列表。
        """
        from flask_login import current_user
        from core.account_manager import AccountService

        admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
        current_user = current_user if current_user else admin_account
        target_tanent = tenant if tenant else current_user.current_tenant_id
        filters = []
        if qtype == "mine":  # 我的
            filters.append(InferModelServiceGroup.created_by == current_user.id)
            filters.append(
                InferModelServiceGroup.tenant_id == target_tanent
            )
        elif qtype == "group":  # 同组
            filters.append(
                InferModelServiceGroup.tenant_id == target_tanent
            )
        elif qtype == "builtin":
            filters.append(
                InferModelServiceGroup.created_by == Account.get_administrator_id()
            )
        elif qtype == "already":  # 混合了前3者的数据
            if is_draw:
                filters.append(
                    or_(
                        InferModelServiceGroup.tenant_id
                        == target_tanent,
                        InferModelServiceGroup.created_by
                        == Account.get_administrator_id(),
                        InferModelServiceGroup.created_by == Account.get_admin_id(),
                    )
                )  # 由于GPU有限，增加admin创建启动的服务也为其它普通用户使用
            else:
                filters.append(
                    or_(
                        InferModelServiceGroup.tenant_id
                        == target_tanent,
                        InferModelServiceGroup.created_by
                        == Account.get_administrator_id(),
                    )
                )
        if search_name:
            filters.append(InferModelServiceGroup.model_name.ilike(f"%{search_name}%"))
        if model_kind:
            filters.append(
                db.session.query(Lazymodel)
                .filter(
                    Lazymodel.id == InferModelServiceGroup.model_id,
                    Lazymodel.model_kind == model_kind,
                )
                .exists()
            )
        return filters

    def _get_ams_service_status(self, infer_model_service_groups):
        """获取AMS服务状态。

        Args:
            infer_model_service_groups (list): 推理模型服务组列表。

        Returns:
            tuple: (ams_service_status, ams_service_endpoint) 状态和端点字典。
        """
        ams_service_status = {}
        ams_service_endpoint = {}
        for infer_model_service_group in infer_model_service_groups:
            ams_model_name = infer_model_service_group.model_name
            services = infer_model_service_group.services
            for service in services:
                if service.gid:
                    (
                        ams_get_service_status_result,
                        ams_get_service_status_return,
                        ams_get_service_status_endpoint,
                    ) = self.ams_get_service_status(service.gid)
                    if not ams_get_service_status_result:
                        logging.info(
                            f"获取AMS推理任务状态失败： " f"{str(service.gid)}"
                        )
                        ams_service_status[str(service.gid)] = "Cancelled"
                        ams_service_endpoint[str(service.gid)] = ""
                        continue
                    # TBD: convert status
                    if ams_get_service_status_return == "Available":
                        ams_service_status[str(service.gid)] = "Ready"
                    elif ams_get_service_status_return == "Unavailable":
                        # 判断service.updated_time与当前系统时间是否超过2分钟，如果没有超过2分钟，则设置为Running
                        if (
                            service.updated_time + timedelta(minutes=2)
                            > TimeTools.now_datetime_china()
                        ):
                            ams_service_status[str(service.gid)] = "Running"
                        else:
                            ams_service_status[str(service.gid)] = "Failed"
                    elif ams_get_service_status_return == "Unknown":
                        ams_service_status[str(service.gid)] = "Cancelled"
                    else:
                        ams_service_status[str(service.gid)] = (
                            ams_get_service_status_return
                        )

                    model_info = Lazymodel.query.get(service.model_id)
                    if model_info.model_from == "finetune":
                        ams_model_name = model_info.model_key_ams
                    for local_ams_model in ams_local_model_list_ams:
                        if local_ams_model["model_name"] == ams_model_name:
                            if "http" in ams_get_service_status_endpoint:
                                endpoint_url = ams_get_service_status_endpoint
                            else:
                                endpoint_url = (
                                    "http://"
                                    + ams_get_service_status_endpoint
                                    + local_ams_model["endpoint"]
                                )
                            ams_service_endpoint[str(service.gid)] = endpoint_url
        return ams_service_status, ams_service_endpoint

    def _process_status_filter(self, status):
        """处理状态过滤器。

        Args:
            status (list): 状态列表。

        Returns:
            set: 处理后的状态集合。
        """
        if status:
            status = set(status)  # 转换为 set 去重
            if "Invalid" in status:
                status.add("Failed")
            if "Done" in status:
                status.update(["InQueue", "Running", "Pending"])
        return status

    def _build_service_info(
        self, services, ams_service_status, ams_service_endpoint, status, user_id
    ):
        """构建服务信息列表。

        Args:
            services (list): 服务列表。
            ams_service_status (dict): AMS服务状态。
            ams_service_endpoint (dict): AMS服务端点。
            status (set): 状态过滤器。
            user_id (list): 用户ID列表。

        Returns:
            list: 服务信息列表。
        """
        service_info = []
        for service in services:
            service_status = (
                ams_service_status.get(service.gid, "Cancelled")
                if service.gid
                else "Cancelled"
            )
            if status and service_status not in status:
                continue

            service_info.append(
                {
                    "id": service.id,
                    "gid": service.gid,
                    "base_model": "",
                    "deploy_method": "",
                    "url": ams_service_endpoint.get(service.gid, ""),
                    "name": service.name,
                    "status": service_status,
                    "job_id": ams_service_endpoint.get(service.gid, ""),
                    "token": service.tenant_id,
                    "logs": service.logs,
                    "created_by": Account.query.get(service.created_by).name,
                    "created_at": service.created_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "updated_at": service.updated_time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

        # 如果 service_info 为空，则跳过
        if not service_info:
            return []

        for service_info_temp in service_info:
            get_service_info_map = get_service_info(service_info_temp.get("id"))
            service_info_temp["base_model"] = get_service_info_map.get("model_name", "")
            service_info_temp["deploy_method"] = get_service_info_map.get(
                "framework", ""
            )
        # 根据status参数过滤服务信息
        if status:
            service_info = [
                info for info in service_info
                if info.get("status") in status
            ]
            
        return service_info

    def list_infer_model_service(
        self,
        page,
        per_page,
        qtype,
        search_name,
        status=None,
        user_id=None,
        model_kind=None,
        is_draw=False,
        tenant=""
    ):
        """获取推理模型服务列表。

        Args:
            page (int): 页码。
            per_page (int): 每页数量。
            qtype (str): 查询类型，支持"mine"、"group"、"builtin"、"already"。
            search_name (str): 搜索名称。
            status (list, optional): 状态过滤器。
            user_id (list, optional): 用户ID过滤器。
            model_kind (str, optional): 模型类型过滤器。
            is_draw (bool, optional): 是否为草稿。

        Returns:
            tuple: (list, dict) 结果元组，包含：
                - list: 服务列表
                - dict: 分页信息

        Raises:
            ValueError: 当查询失败时抛出异常。
        """
        try:
            # 清理孤立的服务记录，确保数据一致性
            cleaned_count = self._cleanup_orphaned_services()
            if cleaned_count > 0:
                logging.info(f"在查询前清理了 {cleaned_count} 个孤立的服务记录")
            filters = self._build_filters(qtype, search_name, model_kind, is_draw, tenant)

            # 先查询所有符合条件的数据，不分页
            query = InferModelServiceGroup.query.filter(*filters).order_by(
                InferModelServiceGroup.id.desc()
            )
            infer_model_service_groups = query.all()

            ams_service_status, ams_service_endpoint = self._get_ams_service_status(
                infer_model_service_groups
            )
            status = self._process_status_filter(status)

            # 生成 result 列表
            result = []
            for infer_model_service_group in infer_model_service_groups:
                services = infer_model_service_group.services

                # 如果 services 为空，则删除空服务组
                if not services:
                    try:
                        # 删除空服务组
                        db.session.delete(infer_model_service_group)
                        db.session.commit()
                        logging.info(f"已删除空服务组: {infer_model_service_group.id}")
                    except Exception as e:
                        logging.error(f"删除空服务组失败: {str(e)}")
                        # 继续处理其他服务组，不中断整个流程
                    continue

                service_info = self._build_service_info(
                    services,
                    ams_service_status,
                    ams_service_endpoint,
                    status,
                    user_id,
                )

                if not service_info:
                    continue

                user_name = ""
                if (
                    infer_model_service_group.created_by
                    and infer_model_service_group.created_by
                    == Account.get_administrator_id()
                ):
                    user_name = "Lazy LLM官方"
                else:
                    user_name = getattr(
                        db.session.get(Account, infer_model_service_group.created_by),
                        "name",
                        "",
                    )

                online_cnt = len(
                    [info for info in service_info if info["status"] == "Ready"]
                )
                has_status_filter = bool(status)
                if (
                    not has_status_filter
                    and online_cnt < 1
                    and (
                        (
                            infer_model_service_group.created_by
                            == Account.get_admin_id()
                            and current_user.id != Account.get_admin_id()
                        )
                        or is_draw
                    )
                ):
                    continue  # 如果在线服务数为0且(是admin模型或者是草稿)，则跳过
                result.append(
                    {
                        "id": infer_model_service_group.id,
                        "name": infer_model_service_group.model_name,
                        "services": service_info,
                        "model_name": infer_model_service_group.model_name,
                        "model_type": infer_model_service_group.model_type,
                        "model_type_display": model_kinds.get(
                            infer_model_service_group.model_type,
                            infer_model_service_group.model_type,
                        ),
                        "service_count": len(service_info),
                        "online_count": online_cnt,
                        "created_at": infer_model_service_group.created_time.strftime(
                            "%Y-%m-%d %H:%M:%S"
                        ),
                        "updated_at": infer_model_service_group.updated_time.strftime(
                            "%Y-%m-%d %H:%M:%S"
                        ),
                        "user_id": infer_model_service_group.created_by,
                        "user_name": user_name,
                    }
                )

            # 计算手动分页
            total = len(result)
            if page is None or per_page is None:
                paginated_result = result
                pagination_info = {
                    "total": total,
                    "pages": 1,
                    "current_page": 1,
                    "next_page": None,
                    "prev_page": None,
                }
            else:
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_result = result[start_idx:end_idx]

                total_pages = (total + per_page - 1) // per_page  # 计算总页数
                pagination_info = {
                    "total": total,
                    "pages": total_pages,
                    "current_page": page,
                    "next_page": page + 1 if page < total_pages else None,
                    "prev_page": page - 1 if page > 1 else None,
                }

            return paginated_result, pagination_info

        except Exception as e:
            logging.error(f"获取推理模型异常: {e}", exc_info=True)
            raise ValueError("失败：" + str(e)) from e

    def get_infer_model_service_by_name(self, service_name: str):
        """根据服务名称获取推理模型服务信息。

        Args:
            service_name (str): 服务名称。

        Returns:
            dict: 服务信息字典，如果服务不存在则返回None。
        """
        logging.info(f"get_service_info service_name: {service_name}")
        item = InferModelService.query.filter_by(name=service_name).first()
        if item:
            service_id = item.id
            return self.get_infer_model_service_by_id(service_id)
        else:
            return None

    def get_infer_model_service_by_id(self, service_id):
        """根据服务ID获取推理模型服务信息。

        Args:
            service_id (int): 服务ID。

        Returns:
            dict: 服务信息字典，包含url等详细信息。
        """
        service_info_map = get_service_info(service_id)
        ams_get_service_status_result, ams_get_service_status_status, ams_get_service_status_endpoint = self.ams_get_service_status(
            service_info_map["service_name_ams"]
        )
        
        # 如果AMS服务状态获取失败，返回空URL
        if not ams_get_service_status_result or not ams_get_service_status_endpoint:
            service_info_map["url"] = ""
            return service_info_map
            
        for local_ams_model in ams_local_model_list_ams:
            if local_ams_model["model_name"] == service_info_map["model_name"]:
                if "http" in ams_get_service_status_endpoint:
                    service_info_map["url"] = ams_get_service_status_endpoint
                else:
                    service_info_map["url"] = (
                        "http://"
                        + ams_get_service_status_endpoint
                        + local_ams_model["endpoint"]
                    )
                break
        return service_info_map

    def create_infer_model_service_group(
        self, model_type, model_id, model_name, services
    ):
        """创建推理模型服务组。

        Args:
            model_type (str): 模型类型。
            model_id (int): 模型ID。
            model_name (str): 模型名称。
            services (list): 服务列表。

        Returns:
            bool: 创建成功返回True。

        Raises:
            ValueError: 当服务组已存在或创建失败时抛出异常。
        """
        try:
            from flask_login import current_user
            from core.account_manager import AccountService

            admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
            current_user = current_user if current_user else admin_account
            # 检查模型服务组是否存在
            existing_group = InferModelServiceGroup.query.filter(
                InferModelServiceGroup.model_name == model_name,
                InferModelServiceGroup.tenant_id == current_user.current_tenant_id,
            ).first()
            if existing_group:
                raise ValueError(f"推理模型服务组 {model_name} 已存在，不能重复创建。")

            new_group = InferModelServiceGroup(
                model_type=model_type,
                model_id=model_id,
                model_name=model_name,
                created_by=current_user.id,
                tenant_id=current_user.current_tenant_id,
                updated_by=current_user.id,
                created_time=TimeTools.get_china_now(),
                updated_time=TimeTools.get_china_now(),
            )
            db.session.add(new_group)
            db.session.commit()

            self.create_infer_model_service(new_group.id, model_id, services)
            return True
        except Exception as e:
            logging.error(f"创建推理模型服务组异常: {e}", exc_info=True)
            db.session.rollback()
            raise ValueError("失败：" + str(e)) from e

    def create_infer_model_service(self, group_id, model_id, services):
        """创建推理模型服务。

        Args:
            group_id (int): 服务组ID。
            model_id (int): 模型ID。
            services (list): 服务配置列表。

        Returns:
            bool: 创建成功返回True。

        Raises:
            ValueError: 当服务名称重复或创建失败时抛出异常。
        """
        try:
            from flask_login import current_user
            from core.account_manager import AccountService

            admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
            current_user = current_user if current_user else admin_account

            # 验证 group_id 不能为 None
            if group_id is None:
                raise ValueError("group_id 不能为 None")

            # 验证服务组是否存在
            group = InferModelServiceGroup.query.get(group_id)
            if not group:
                raise ValueError(f"服务组已{group_id} 不存在，请刷新列表重试")
            existing_service_names = set()
            for service in services:
                # 检查服务名称是否重复
                existing_service = (
                    db.session.query(InferModelService)
                    .filter(InferModelService.name == service.get("name"))
                    .first()
                )

                if existing_service:
                    existing_service_names.add(service.get("name"))
            if existing_service_names:
                raise ValueError(
                    f"服务名称 {existing_service_names} 已被使用，请使用其他名称"
                )

            for service_data in services:
                new_service = InferModelService(
                    group_id=group_id,
                    model_num_gpus= 1 if service_data.get("model_num_gpus") is None or service_data.get("model_num_gpus") <1 else service_data.get("model_num_gpus"),
                    name=service_data.get("name"),
                    model_id=model_id,
                    created_by=current_user.id,
                    tenant_id=current_user.current_tenant_id,
                    updated_by=current_user.id,
                    created_time=TimeTools.get_china_now(),
                    updated_time=TimeTools.get_china_now(),
                )
                db.session.add(new_service)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise ValueError(e) from e

    def close_service_group(self, group_id):
        """关闭服务组。

        Args:
            group_id (int): 服务组ID。

        Returns:
            bool: 关闭成功返回True。

        Raises:
            ValueError: 当关闭服务组失败时抛出异常。
        """
        try:
            group = InferModelServiceGroup.query.get(group_id)
            for service in group.services:
                stop_service_result = self.stop_service(service.id)
                if not stop_service_result:
                    return False
            return True
        except Exception as e:
            raise ValueError("关闭推理服务组失败") from e

    def _cleanup_orphaned_services(self):
        """清理孤立的服务记录。

        删除所有孤立的服务记录（group_id指向不存在的服务组）。

        Returns:
            int: 清理的服务记录数量。
        """
        try:
            # 查找所有服务组ID
            group_ids = set(db.session.query(InferModelServiceGroup.id).all())
            group_ids = {row[0] for row in group_ids}

            # 查找所有服务记录
            all_services = InferModelService.query.all()
            orphaned_services = []

            for service in all_services:
                if service.group_id not in group_ids:
                    orphaned_services.append(service)
                    logging.warning(
                        f"发现孤立的服务记录: {service.id}, group_id: {service.group_id}"
                    )

            # 清理孤立的服务记录
            cleaned_count = 0
            for service in orphaned_services:
                try:
                    # 停止服务
                    self.stop_service(service.id)

                    # 释放GPU资源（如果不是超级管理员）
                    account = Account.default_getone(current_user.id)
                    if not account.is_super:
                        Tenant.decrement_gpu_usage(service.tenant_id, 1)

                    # 删除服务记录
                    db.session.delete(service)
                    cleaned_count += 1
                    logging.info(f"已清理孤立的服务记录: {service.id}")
                except Exception as e:
                    logging.error(f"清理孤立服务记录 {service.id} 时出错: {str(e)}")

            if cleaned_count > 0:
                db.session.commit()
                logging.info(f"清理完成，共清理 {cleaned_count} 个孤立的服务记录")

            return cleaned_count
        except Exception as e:
            db.session.rollback()
            logging.error(f"清理孤立服务记录时出错: {str(e)}")
            return 0

    def delete_infer_model_service(self, service_id):
        """删除推理模型服务。

        删除指定的推理模型服务，如果服务组中没有其他服务，则同时删除服务组。

        Args:
            service_id (int): 服务ID。

        Returns:
            bool: 删除成功返回True，失败返回False。

        Raises:
            ValueError: 当服务不存在或删除失败时抛出异常。
        """
        try:
            service = InferModelService.query.get(service_id)
            if not service:
                raise ValueError("服务不存在")

            # 保存服务组ID，用于后续检查
            group_id = service.group_id

            # 停止服务
            stop_service_result = self.stop_service(service.id)
            if not stop_service_result:
                return False

            # 使用事务确保原子性操作
            try:
                # 删除服务记录
                db.session.delete(service)
                db.session.commit()

                # 检查服务组是否还有其他服务（在事务中重新查询）
                remaining_services = InferModelService.query.filter_by(
                    group_id=group_id
                ).first()
                if not remaining_services:
                    # 如果服务组没有其他服务，删除服务组
                    group = InferModelServiceGroup.query.get(group_id)
                    if group:
                        db.session.delete(group)
                        db.session.commit()
                        logging.info(f"已删除空服务组: {group_id}")

                return True

            except Exception as e:
                db.session.rollback()
                logging.error(f"删除服务时数据库操作失败: {str(e)}")
                raise

        except Exception as e:
            db.session.rollback()
            raise ValueError("删除推理服务失败") from e

    def ams_stop_service(self, lws_release_name):
        """通过AMS停止服务。

        调用AMS API停止指定的推理服务。

        Args:
            lws_release_name (str): LWS发布名称。

        Returns:
            bool: 停止成功返回True，失败返回False。

        Raises:
            Exception: 当请求AMS服务失败时抛出异常。
        """
        ams_delete_url = (
            os.getenv("AMS_ENDPOINT") + "/v1/inference_services/" + lws_release_name
        )
        logging.info(f"ams_delete_url: {ams_delete_url}")
        response = requests.delete(ams_delete_url)
        status_code = response.status_code
        try:
            response_data = response.json()
        except ValueError:
            response_data = {}

        logging.info(f"ams delete response: {status_code}")
        logging.info(f"ams_stop_service response: {response.text}")

        if status_code == 404:
            detail = response_data.get("message") or response_data.get("detail")
            logging.info(
                "ams_stop_service job absent (%s)，视为已删除: %s",
                detail or "Job not found",
                lws_release_name,
            )
            return True

        if status_code != 200:
            logging.info(
                f"ams_stop_service failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False
        return True

    def stop_service(self, service_id):
        """停止推理服务。

        停止指定的推理服务，释放相关资源并更新GPU使用统计。

        Args:
            service_id (int): 服务ID。

        Returns:
            bool: 停止成功返回True，失败返回False。

        Raises:
            ValueError: 当停止服务失败时抛出异常。
        """
        service = InferModelService.query.get(service_id)
        try:
            if service.gid:
                ams_stop_service_result = self.ams_stop_service(service.gid)
                if not ams_stop_service_result:
                    logging.info(f"ams delete failed: {service.gid}")
                    return False

            # 检查当前用户是否为超级管理员
            account = Account.default_getone(current_user.id)
            # 只有非超级管理员需要释放GPU资源统计
            if not account.is_super:
                # 释放GPU资源
                Tenant.decrement_gpu_usage(service.tenant_id, 1 if service.model_num_gpus is None or service.model_num_gpus < 1 else service.model_num_gpus)

            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"任务取消失败，id: {service.gid}") from e

    def ams_start_service(self, service_name, model_name, model_num_gpus=1):
        """通过AMS启动服务。

        调用AMS API启动指定的推理服务。

        Args:
            service_name (str): 服务名称。
            model_name (str): 模型名称。

        Returns:
            tuple: (bool, str) 结果元组，包含：
                - bool: 启动是否成功
                - str: LWS名称，失败时为空字符串

        Raises:
            Exception: 当请求AMS服务失败时抛出异常。
        """
        ams_start_server_url = os.getenv("AMS_ENDPOINT") + "/v1/inference_services"
        logging.info(
            f"ams_start_service: {ams_start_server_url}, {service_name}, {model_name}"
        )
        if self.supplier == "lazyllm":
            model_name = model_name.split(":")[-1]
        json_data = {"service_name": service_name, "model_name": model_name, "num_gpus": model_num_gpus}  # list
        response = requests.post(ams_start_server_url, json=json_data)
        time.sleep(1)  # 等待1秒，确保服务启动完成
        try:
            response_data = response.json()
        except ValueError:
            logging.info(
                f"ams_start_service 响应非JSON，status={response.status_code}, text={response.text}"
            )
            return False, ""
        logging.info(f"ams_start_service response: {response.status_code}")
        logging.info(f"ams_start_service response: {response.text}")
        if response.status_code != 200:
            logging.info(
                f"ams_start_service failed: {response_data.get('code')}, {response_data.get('message')}"
            )
            return False, ""
        return True, response_data.get("lwsName")

    def is_cloud_service_available(self, timeout: float = 2.0):
        """检查 cloud-service 是否可用。

        Args:
            timeout (float, optional): 请求超时时间，单位秒。默认 1.0 秒。

        Returns:
            tuple[bool, str]: (是否可用, 说明信息)
        """
        ams_endpoint = os.getenv("AMS_ENDPOINT")
        if not ams_endpoint:
            return False, "未配置 AMS_ENDPOINT，cloud-service 未启用"
        url = ams_endpoint.rstrip("/") + "/v1/inference_services"
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                return True, "cloud-service 服务正常"
            return False, f"cloud-service 返回异常状态码 {resp.status_code}"
        except requests.RequestException as exc:
            return False, f"无法连接 cloud-service：{exc}"

    def start_service(self, service_id):
        """启动推理服务。

        启动指定的推理服务，包括GPU配额检查、AMS服务启动和资源统计更新。

        Args:
            service_id (int): 服务ID。

        Returns:
            bool: 启动成功返回True，失败返回False。

        Raises:
            ValueError: 当GPU配额不足、基础模型不支持推理或启动失败时抛出异常。
        """
        try:
            from flask_login import current_user
            from core.account_manager import AccountService

            admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
            current_user = current_user if current_user else admin_account
            
            service = InferModelService.query.get(service_id)
            # # 检查单个服务的GPU配额
            # self.check_gpu_quota(service.tenant_id)

            # 检查当前用户是否为超级管理员
            account = Account.default_getone(current_user.id)
            if not account.is_super:
                # 非超级管理员需要检查GPU配额
                self.check_gpu_quota(service.tenant_id,1 if service.model_num_gpus is None or service.model_num_gpus < 1 else service.model_num_gpus)

            model_info = Lazymodel.query.get(service.model_id)
 
            infer_model_name = model_info.model_name
            if model_info.model_from == "finetune":
                infer_model_name = (
                    model_info.model_key_ams + ":" + model_info.model_name
                )
            ams_start_service_result, ams_start_service_return = self.ams_start_service(
                service.name, infer_model_name, 1 if service.model_num_gpus is None or service.model_num_gpus < 1 else service.model_num_gpus
            )
            logging.info(
                f"ams_start_service result: {ams_start_service_result}, {ams_start_service_return}"
            )
            if ams_start_service_result:
                service.gid = ams_start_service_return
                service.job_id = ""
                service.updated_time = TimeTools.now_datetime_china()
            else:
                return False

            # 只有非超级管理员需要增加GPU使用量统计
            if not account.is_super:
                Tenant.increment_gpu_usage(service.tenant_id, 1 if service.model_num_gpus is None or service.model_num_gpus < 1 else service.model_num_gpus)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            error_msg = str(e)
            if "failed" in error_msg.lower():
                error_msg = "服务启动失败，请通过日志查看详情"
            logger.error(f"启动服务失败: {e}", stack_info=True)
            print(f"启动服务失败： {str(e)}")
            LogService().add(
                Module.MODEL_INFERENCE,
                Action.INFERENCE_TASK_START,
                result="失败：" + str(e),
            )
            raise ValueError("失败：" + error_msg) from e

    def start_service_group(self, group_id):
        """启动服务组并管理GPU配额。

        启动服务组中的所有服务，包括GPU配额检查和批量服务启动。

        Args:
            group_id (int): 服务组ID。

        Returns:
            bool: 启动成功返回True，失败返回False。

        Raises:
            ValueError: 当服务组不存在、GPU配额不足或启动失败时抛出异常。
        """
        try:
            from flask_login import current_user
            from core.account_manager import AccountService

            admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
            current_user = current_user if current_user else admin_account

            # 1. 获取服务组
            group = InferModelServiceGroup.query.get(group_id)
            if not group:
                raise ValueError("服务组不存在")

            # 2. 检查是否为超级管理员
            account = Account.default_getone(current_user.id)
            if not account.is_super:
                # 3. 计算需要的GPU总数
                total_gpus = 0
                for service in group.services:
                    num = 1 if service.model_num_gpus is None or service.model_num_gpus < 1 else service.model_num_gpus 
                    total_gpus += num

                # 4. 检查租户的GPU配额
                tenant = db.session.query(Tenant).filter_by(id=group.tenant_id).first()
                if tenant:
                    # 检查是否有足够的GPU配额
                    if tenant.gpu_quota and tenant.gpu_quota > 0:
                        available_gpus = tenant.gpu_quota - tenant.gpu_used
                        if available_gpus < total_gpus:
                            raise ValueError("GPU配额不足，启动失败")

            # 5. 启动所有服务
            for service in group.services:
                start_service_result = self.start_service(service.id)
                if not start_service_result:
                    logging.info(
                        f"ams service start failed in group: {group_id}, {service.name}"
                    )
                    return False

            return True
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"启动服务组失败： {str(e)}") from e

    def list_local_model(self, qtype, model_kind, model_type):
        """获取本地模型列表。

        根据查询类型、模型种类和类型过滤获取本地模型列表。

        Args:
            qtype (str): 查询类型，支持"mine"、"group"、"builtin"、"already"。
            model_kind (str): 模型种类。
            model_type (str): 模型类型。

        Returns:
            list: 模型列表，每个模型包含id和model_name字段。

        Raises:
            ValueError: 当获取本地模型列表失败时抛出异常。
        """
        try:
            filters = []
            if qtype == "mine":  # 我的
                filters.append(Lazymodel.user_id == current_user.id)
                filters.append(Lazymodel.tenant_id == current_user.current_tenant_id)
            elif qtype == "group":  # 同组
                filters.append(Lazymodel.tenant_id == current_user.current_tenant_id)
            elif qtype == "builtin":
                filters.append(Lazymodel.user_id == Account.get_administrator_id())
            elif qtype == "already":  # 混合了前3者的数据
                filters.append(
                    or_(
                        Lazymodel.tenant_id == current_user.current_tenant_id,
                        Lazymodel.user_id == Account.get_administrator_id(),
                    )
                )

            filters.append(Lazymodel.model_kind == model_kind)
            filters.append(Lazymodel.model_type == model_type)
            filters.append(Lazymodel.model_status.in_([3]))
            filters.append(Lazymodel.deleted_flag == 0)
            models = (
                Lazymodel.query.filter(*filters)
                .with_entities(
                    Lazymodel.id,
                    Lazymodel.model_name,
                    Lazymodel.builtin_flag,
                )
                .all()
            )

            used_model_ids = self._get_used_infer_model_ids()

            return [
                {
                    "id": model.id,
                    "model_name": model.model_name,
                    "need_confirm": (not model.builtin_flag)
                    and (model.id not in used_model_ids),
                }
                for model in models
            ]
        except Exception as e:
            raise ValueError("本地模型列表获取失败") from e
