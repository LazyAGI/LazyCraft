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
import zipfile
from datetime import datetime

from flask_login import current_user
from sqlalchemy import and_, desc

from libs.timetools import TimeTools
from models.model_account import Account
from parts.data.data_service import DataService
from parts.data.model import (DataSet, DataSetFileStatus, DataSetRefluxData,
                              DataSetVersion, DataSetVersionStatus)
from parts.logs import Action, LogService, Module
from utils.util_database import db


class DataRefluxService:
    """数据回流服务类，负责应用和节点的数据回流、数据集版本管理等。

    该服务用于处理应用发布、节点发布、数据集版本创建、回流数据的增删查改等操作。

    Attributes:
        user_id (str): 用户ID。
        user_name (str): 用户名。
        tenant_id (str): 租户ID。
        account (Account): 当前账户对象。
    """

    def __init__(self, account, user_id=None, tenant_id=None):
        """初始化数据回流服务。

        Args:
            account (Account, optional): 账户对象，包含用户信息。
            user_id (str, optional): 用户ID，当account为None时使用。
            tenant_id (str, optional): 租户ID，当account为None时使用。

        Returns:
            None: 无返回值。
        """
        if account is not None:
            self.user_id = account.id
            self.user_name = account.name
            self.tenant_id = account.current_tenant_id
            self.account = account
        else:
            account = Account.default_getone("00000000-0000-0000-0000-000000000001")
            self.user_id = account.id
            self.user_name = account.name
            self.tenant_id = tenant_id
            self.account = account

    def app_publish(self, app_msg: dict, node_msgs: list):
        """应用发布开启数据回流。

        Args:
            app_msg (dict): 应用消息数据，包含app_id、app_name、app_label。
            node_msgs (list): 节点消息数据列表，每个节点包含node_id、node_name。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当数据集版本创建失败时抛出异常。
        """
        dataset = DataSet.query.filter(
            DataSet.app_id == app_msg.get("app_id"), DataSet.reflux_type == "app"
        ).first()
        if not dataset:
            print("首次发布 begin")
            self.__first_publish(app_msg, node_msgs)
        else:
            print("再次发布 begin")
            self.__republish(app_msg, node_msgs, dataset)

    def __first_publish(self, app_msg: dict, node_msgs: list):
        """首次发布，新建数据集与初始分支。

        Args:
            app_msg (dict): 应用消息数据。
            node_msgs (list): 节点消息数据列表。

        Returns:
            None: 无返回值。
        """
        self.__create_data_for_app(app_msg)
        self.__create_data_for_node(app_msg, node_msgs)

    def __republish(self, app_msg: dict, node_msgs: list, dataset):
        """再次发布，新增节点创建数据集和分支升级。

        Args:
            app_msg (dict): 应用消息数据。
            node_msgs (list): 节点消息数据列表。
            dataset (DataSet): 已存在的数据集对象。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当app数据集版本创建失败时抛出异常。
        """
        data_set_version_obj = self.__update_data_for_app(dataset)
        if not data_set_version_obj:
            raise ValueError("app数据集版本创建失败")
        """ 再次发布，新增节点创建数据集和branch升级 """
        self.__update_data_for_nodes(
            app_msg, node_msgs, dataset, data_set_version_obj.version
        )

    def __update_data_for_app(self, dataset):
        """更新应用对应的数据集记录，更新当前版本。

        Args:
            dataset (DataSet): 数据集对象。

        Returns:
            DataSetVersion: 新创建的数据集版本对象。
        """
        dataclient = DataService(current_user)
        version_name = f"{dataset.name}-{dataset.default_branches_num + 1}"
        version = f"{dataclient.increment_version('v1.0.0', dataset.default_branches_num)}-dirty"

        data_set_version_obj = self.__create_data_set_version_by_version(
            dataset, version_name, version, "branch"
        )
        return data_set_version_obj

    def __update_data_for_nodes(self, app_msg: dict, node_msgs: list, dataset, version):
        """更新节点数据，为未创建数据集的节点创建数据集，为已创建数据集的节点创建新版本。

        Args:
            app_msg (dict): 应用消息数据。
            node_msgs (list): 节点消息数据列表。
            dataset (DataSet): 数据集对象。
            version (str): 版本号。

        Returns:
            None: 无返回值。
        """
        # 未创建数据集的node，先创建数据集再创建version,已创建数据集的node，创建新的version
        app_id = app_msg.get("app_id")
        app_name = app_msg.get("app_name")
        app_label = app_msg.get("app_label")

        for node in node_msgs:
            node_id = node.get("node_id")
            node_name = node.get("node_name")
            existing_dataset = DataSet.query.filter_by(node_id=node_id).first()
            data = {
                "name": f"{app_name}-{node_name}",  # 数据集名称
                "app_id": app_id,
                "node_id": node_id,
                "label": app_label,  # 将 app_label 保存到数据集
                "version": version,
                "reflux_type": "node",
            }
            if not existing_dataset:
                self.__create_single_data(data)
            else:
                self.__create_data_set_version(data, existing_dataset)

    def __create_single_data(self, data: dict):
        """创建单个数据集。

        Args:
            data (dict): 数据集创建参数，包含name、app_id、node_id、label、version、reflux_type等。

        Returns:
            DataSet: 创建的数据集对象。

        Raises:
            ValueError: 当数据集创建失败时抛出异常。
        """
        data["from_type"] = "return"
        data["data_type"] = "doc"
        data["upload_type"] = "return"
        data_set_instance = self.__create_data_set(data)
        LogService().add(
            Module.DATA_MANAGEMENT,
            Action.CREATE_TEXT_DATA,
            name=data_set_instance.name,
            data_type="文本数据集",
            from_type="数据回流",
        )
        if data_set_instance is None:
            raise ValueError("数据集创建失败")
        self.__create_data_set_version(data, data_set_instance)
        return data_set_instance

    def __create_data_set_version(self, data: dict, dataset):
        """创建数据集版本。

        Args:
            data (dict): 版本创建参数，包含data_set_version_name、version等。
            dataset (DataSet): 数据集对象。

        Returns:
            DataSet: 更新后的数据集对象。
        """
        data["data_set_id"] = dataset.id
        data["data_set_version_name"] = DataService.get_data_set_version_name(
            data.get("name"), False
        )
        self.__create_data_set_version_for_single(data, dataset.id)
        dataset.branches_num += 1
        dataset.default_branches_num += 1
        db.session.commit()
        return dataset

    def __create_data_set_version_for_single(self, data, data_set_id):
        """为单个数据集创建版本。

        Args:
            data (dict): 版本创建参数。
            data_set_id (int): 数据集ID。

        Returns:
            DataSetVersion: 新创建的数据集版本对象。
        """
        now_str = TimeTools.get_china_now()
        data_set_version_obj = DataSetVersion(
            data_set_id=data_set_id,
            user_id=self.user_id,
            status=DataSetVersionStatus.version_done.value,
            created_at=now_str,
            updated_at=now_str,
            name=data.get("data_set_version_name"),
            version=data.get("version", "v1.0.0-dirty"),
            is_original=data.get("is_original", True),
            data_set_file_ids=data.get("data_set_file_ids", []),
            version_type=data.get("version_type", "branch"),
        )
        db.session.add(data_set_version_obj)
        db.session.commit()
        return data_set_version_obj

    def __create_data_for_app(self, app_msg: dict):
        """为应用创建数据集。

        Args:
            app_msg (dict): 应用消息数据，包含app_name、app_id、app_label。

        Returns:
            DataSet: 创建的数据集对象。
        """
        app_name = app_msg.get("app_name")
        app_id = app_msg.get("app_id")
        app_label = app_msg.get("app_label")
        data = {
            "name": f"{app_name}",  # 数据集名称
            "app_id": app_id,
            "label": app_label,  # 将 app_label 保存到数据集
            "version": "v1.0.0-dirty",
            "reflux_type": "app",
        }
        return self.__create_single_data(data)

    def __create_data_for_node(self, app_msg: dict, node_msgs: list):
        """为节点创建数据集。

        Args:
            app_msg (dict): 应用消息数据。
            node_msgs (list): 节点消息数据列表。

        Returns:
            None: 无返回值。
        """
        app_id = app_msg.get("app_id")
        app_name = app_msg.get("app_name")
        app_label = app_msg.get("app_label")
        for node in node_msgs:
            node_id = node.get("node_id")
            node_name = node.get("node_name")
            data = {
                "name": f"{app_name}-{node_name}",  # 数据集名称
                "app_id": app_id,
                "node_id": node_id,
                "label": app_label,  # 将 app_label 保存到数据集
                "version": "v1.0.0-dirty",
                "reflux_type": "node",
            }
            self.__create_single_data(data)

    def __create_data_set(self, data):
        """创建数据集对象。

        Args:
            data (dict): 数据集创建参数，包含name、description、data_type、upload_type等。

        Returns:
            DataSet: 创建的数据集对象。

        Raises:
            ValueError: 当数据集已存在时抛出异常。
        """

        if DataSet.query.filter_by(
            name=data["name"], app_id=data.get("app_id", "")
        ).first():
            raise ValueError("数据集已存在")

        now_str = TimeTools.get_china_now()

        data_set_obj = DataSet(
            name=data.get("name"),
            user_id=self.user_id,
            tenant_id=self.tenant_id,
            user_name=self.user_name,
            description=data.get("description"),
            # label=data.get('label'),
            data_type=data.get("data_type"),
            upload_type=data.get("upload_type"),
            from_type=data.get("from_type"),
            created_at=now_str,
            tags_num=data.get("tags_num", 0),
            branches_num=data.get("branches_num", 0),
            # 数据回流使用
            app_id=data.get("app_id", ""),
            node_id=data.get("node_id", ""),
            reflux_type=data.get("reflux_type", ""),
        )
        if data.get("upload_type") == "local":
            data_set_obj.file_paths = data.get("file_paths")
        else:
            data_set_obj.file_urls = data.get("file_urls")

        db.session.add(data_set_obj)
        db.session.flush()
        db.session.commit()

        # 这里调用Tag中的标签更新
        label_list = data.get("label") or []
        if isinstance(label_list, list) and len(label_list) > 0:
            from parts.tag.tag_service import TagService

            TagService(self.account).update_tag_binding(
                "dataset", str(data_set_obj.id), label_list
            )

        return data_set_obj

    def __create_data_set_version_by_version(
        self, dataset, version_name, version, version_type
    ):
        """根据版本信息创建数据集版本。

        Args:
            dataset (DataSet): 数据集对象。
            version_name (str): 版本名称。
            version (str): 版本号。
            version_type (str): 版本类型，如"tag"或"branch"。

        Returns:
            DataSetVersion: 新创建的数据集版本对象。
        """
        now_str = TimeTools.get_china_now()
        data_set_version_obj = DataSetVersion(
            data_set_id=dataset.id,
            user_id=dataset.user_id,
            status=DataSetVersionStatus.version_done.value,
            created_at=now_str,
            updated_at=now_str,
            name=version_name,
            version=version,
            is_original=False,
            version_type=version_type,
        )
        db.session.add(data_set_version_obj)
        if version_type == "tag":
            dataset.tags_num += 1
            dataset.default_tags_num += 1
        elif version_type == "branch":
            dataset.branches_num += 1
            dataset.default_branches_num += 1
        db.session.commit()
        return data_set_version_obj

    @staticmethod
    def create_single_reflux_data(latest_version, data):
        """创建单个回流数据记录。

        Args:
            latest_version (DataSetVersion): 最新的数据集版本。
            data (dict): 回流数据，包含app_id、app_name、module_id、module_name、module_type、
                        output_time、module_input、module_output、conversation_id、turn_number、
                        user_feedback等。

        Returns:
            DataSetRefluxData: 创建的回流数据对象。
        """
        now_str = TimeTools.get_china_now()
        data_set_reflux_data = DataSetRefluxData(
            data_set_id=latest_version.data_set_id,
            data_set_version_id=latest_version.id,
            user_id="",
            created_at=now_str,
            updated_at=now_str,
            app_id=data.get("app_id"),
            app_name=data.get("app_name"),
            module_id=data.get("module_id"),
            module_name=data.get("module_name"),
            module_type=data.get("module_type"),
            output_time=data.get("output_time"),
            module_input=data.get("module_input"),
            module_output=data.get("module_output"),
            conversation_id=data.get("conversation_id"),  # 会话id
            turn_number=data.get("turn_number"),  # 会话轮次
            # 创建时 忽略这个值
            is_satisfied=None,  # 是否满意，为空时未反馈
            user_feedback=data.get("user_feedback"),  # 用户反馈
            status=DataSetFileStatus.file_done.value,
            finished_at=now_str,
        )
        db.session.add(data_set_reflux_data)
        db.session.commit()
        json_data = DataRefluxService.get_reflux_data_by_id(data_set_reflux_data.id)
        if json_data:
            # json_data 字段是 JSON 对象，直接存储
            data_set_reflux_data.json_data = json_data
        db.session.commit()
        return data_set_reflux_data

    def publish_data_set_version(self, data_set_version_id):
        """发布回流数据集版本。

        Args:
            data_set_version_id (int): 数据集版本ID。

        Returns:
            DataSetVersion: 新创建的发布版本对象。

        Raises:
            ValueError: 当未查询到数据集版本时抛出异常。
        """
        # DataSetVersion.query.filter_by(da)
        data_set_version = DataSetVersion.query.get(data_set_version_id)
        if not data_set_version:
            raise ValueError("未查询到此数据集版本")
        data_set = DataSet.query.get(data_set_version.data_set_id)
        db.session.commit()

        version = data_set_version.version.removesuffix("-dirty")
        # version = f"{DataService(current_user).increment_version('v1.0.0', data_set.tags_num)}-dirty"
        new_data_set_version = self.__create_data_set_version_by_version(
            data_set, data_set_version.name, version, "tag"
        )
        # 复制数据记录
        self.__copy_reflux_data(data_set_version.id, new_data_set_version.id)
        return new_data_set_version

    def __copy_reflux_data(self, old_data_set_version_id, new_data_set_version_id):
        """复制回流数据到新版本。

        Args:
            old_data_set_version_id (int): 旧数据集版本ID。
            new_data_set_version_id (int): 新数据集版本ID。

        Returns:
            None: 无返回值。
        """
        try:
            old_data_list = DataSetRefluxData.query.filter_by(
                data_set_version_id=old_data_set_version_id
            ).all()
            print(old_data_list)
            for reflux_data in old_data_list:
                now_str = TimeTools.get_china_now()
                new_reflux_data = DataSetRefluxData(
                    data_set_id=reflux_data.data_set_id,
                    data_set_version_id=new_data_set_version_id,
                    user_id=reflux_data.user_id,
                    created_at=now_str,
                    updated_at=now_str,
                    app_id=reflux_data.app_id,
                    app_name=reflux_data.app_name,
                    module_id=reflux_data.module_id,
                    module_name=reflux_data.module_name,
                    module_type=reflux_data.module_type,
                    output_time=reflux_data.output_time,
                    module_input=reflux_data.module_input,
                    module_output=reflux_data.module_output,
                    conversation_id=reflux_data.conversation_id,  # 会话id
                    turn_number=reflux_data.turn_number,  # 会话轮次
                    is_satisfied=reflux_data.is_satisfied,  # 是否满意，为空时未反馈
                    user_feedback=reflux_data.user_feedback,  # 用户反馈
                    status=DataSetFileStatus.file_done.value,
                    finished_at=now_str,
                )
                db.session.add(new_reflux_data)
            db.session.commit()
        except Exception as e:
            print(f"Error copying data_set_file: {str(e)}")
        db.session.rollback()

    def page_reflux_data_by_version_id(self, data):
        """根据版本ID分页查询回流数据。

        Args:
            data (dict): 查询参数，包含data_set_version_id、page、page_size。

        Returns:
            Pagination: 分页结果对象。
        """
        query = DataSetRefluxData.query.filter(
            DataSetRefluxData.data_set_version_id == data.get("data_set_version_id")
        )
        query = query.order_by(desc(DataSetRefluxData.id))

        return query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

    def delete_reflux_data_by_ids(self, reflux_data_ids: list):
        """根据ID列表批量删除回流数据。

        Args:
            reflux_data_ids (list): 回流数据ID列表。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当未找到匹配的数据或删除过程中发生错误时抛出异常。
        """
        try:
            # 查询并批量删除
            deleted_count = DataSetRefluxData.query.filter(
                DataSetRefluxData.id.in_(reflux_data_ids)
            ).delete(synchronize_session=False)

            if deleted_count == 0:
                raise ValueError(f"未找到与提供的 ID 匹配的任何数据: {reflux_data_ids}")
            db.session.commit()
            print(f"成功删除 {deleted_count} 条回流数据，IDs: {reflux_data_ids}")
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"删除回流数据时发生错误: {e}")

    @staticmethod
    def get_reflux_data_by_id(reflux_data_id):
        """根据ID获取回流数据详情。

        Args:
            reflux_data_id (int): 回流数据ID。

        Returns:
            dict: 回流数据详情，包含应用信息、模块信息、会话信息等。

        Raises:
            ValueError: 当未找到指定ID的回流数据时抛出异常。
        """
        reflux_data = DataSetRefluxData.query.filter_by(id=reflux_data_id).first()
        if not reflux_data:
            raise ValueError(f"未找到 ID 为 {reflux_data_id} 的回流数据")

        if reflux_data.json_data:
            # json_data 字段是 JSON 对象，直接返回
            return reflux_data.json_data

        return {
            "app_name": reflux_data.app_name,
            "module_info": {
                "module_name": reflux_data.module_name,
                "module_type": reflux_data.module_type,
                "output_time": (
                    reflux_data.output_time.strftime("%Y-%m-%d %H:%M:%S")
                    if reflux_data.output_time
                    else None
                ),
                "module_input": reflux_data.module_input,
                "module_output": reflux_data.module_output,
            },
            "conversation_info": {
                "conversation_id": reflux_data.conversation_id,
                "turn_number": reflux_data.turn_number,
                "is_satisfied": reflux_data.is_satisfied,
                "user_feedback": reflux_data.user_feedback,
            },
        }

    def create_single_txt(self, data_set_version_id):
        """为数据集版本创建单个TXT文件。

        Args:
            data_set_version_id (int): 数据集版本ID。

        Returns:
            str: 生成的TXT文件名。

        Raises:
            ValueError: 当数据集版本未找到时抛出异常。
        """
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        if not data_set_version_instance:
            raise ValueError("数据集版本未找到")
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)

        now_str = datetime.now().strftime("%Y%m%d%H%M%S")
        txt_filename = f"{data_set_version_instance.name}_{data_set_version_instance.version}_{now_str}.txt"
        # 获取数据集版本对应的回流数据
        reflux_list = DataSetRefluxData.query.filter_by(
            data_set_version_id=data_set_version_id
        ).all()
        with open(txt_filename, "w") as info_file:
            info_file.write(f"数据集名称: {data_set_version_instance.name}\n")
            info_file.write(f"数据集版本号: {data_set_version_instance.version}\n")
            info_file.write(f"数据集描述: {data_set_instance.description}\n")
            info_file.write(f"数据集标签: {data_set_instance.label}\n")
            if reflux_list:
                info_file.write("List:\n")
                for reflux_data in reflux_list:
                    item_dict = {
                        "app_name": reflux_data.app_name,
                        "app_id": reflux_data.app_id,
                        "module_info": {
                            "module_name": reflux_data.module_name,
                            "module_type": reflux_data.module_type,
                            "output_time": (
                                reflux_data.output_time.strftime("%Y-%m-%d %H:%M:%S")
                                if reflux_data.output_time
                                else None
                            ),
                            "module_input": reflux_data.module_input,
                            "module_output": reflux_data.module_output,
                        },
                        "conversation_info": {
                            "conversation_id": reflux_data.conversation_id,
                            "turn_number": reflux_data.turn_number,
                            "is_satisfied": reflux_data.is_satisfied,
                            "user_feedback": reflux_data.user_feedback,
                        },
                    }

                    json_str = json.dumps(
                        item_dict, ensure_ascii=False
                    )  # 转换为 JSON 字符串
                    info_file.write(f"{json_str}\n")  # 写入 JSON 字符串

        return txt_filename

    def create_combined_zip(self, data_set_version_ids):
        """为多个数据集版本创建组合ZIP文件。

        Args:
            data_set_version_ids (list): 数据集版本ID列表。

        Returns:
            str: 生成的ZIP文件名。
        """
        combined_zip_filename = (
            f"export_datasets_{datetime.now().strftime('%Y%m%d%H%M%S')}.zip"
        )
        with zipfile.ZipFile(combined_zip_filename, "w") as combined_zip:
            for data_set_version_id in data_set_version_ids:
                single_txt_filename = self.create_single_txt(data_set_version_id)
                combined_zip.write(
                    single_txt_filename, os.path.basename(single_txt_filename)
                )
                os.remove(single_txt_filename)  # 删除临时文件

        return combined_zip_filename


def create_reflux_data(data: dict):
    """接收数据回传，并保存到最新版本的回传数据。

    Args:
        data (dict): 回流数据，包含以下字段：
            - app_id (str): 应用ID
            - app_name (str): 应用名称
            - module_id (str): 模块ID
            - module_name (str): 模块名称
            - module_type (str): 模块类型
            - output_time (datetime): 输出时间
            - module_input (str): 模块输入
            - module_output (str): 模块输出
            - conversation_id (str): 会话ID
            - turn_number (int): 会话轮次
            - is_satisfied (bool, optional): 是否满意
            - user_feedback (str, optional): 用户反馈

    Returns:
        DataSetRefluxData: 创建的回流数据对象。

    Raises:
        ValueError: 当数据集未创建或未找到对应的数据集版本时抛出异常。
    """
    # 获取数据集
    # 创建基本查询条件
    query_conditions = [
        DataSet.app_id == data.get("app_id"),
        DataSet.reflux_type == data.get("module_type"),
    ]

    # 如果 module_type 是 'node'，添加额外的条件
    if data.get("module_type") == "node":
        query_conditions.append(DataSet.node_id == data.get("module_id"))

    dataset = DataSet.query.filter(and_(*query_conditions)).first()

    if not dataset:
        raise ValueError("数据集未创建，请确认应用已发布")
    # 获取对应数据集的最新版本
    latest_version = (
        DataSetVersion.query.filter(
            DataSetVersion.data_set_id == dataset.id,
            DataSetVersion.version_type == "branch",
        )
        .order_by(DataSetVersion.id.desc())
        .first()
    )
    if not latest_version:
        raise ValueError("未找到对应的数据集版本")
    return DataRefluxService.create_single_reflux_data(latest_version, data)


def update_reflux_data(reflux_data_id, content: dict):
    """更新回流数据。

    Args:
        reflux_data_id (int): 回流数据ID。
        content (dict): 更新内容，包含app_name、module_info、conversation_info等。

    Returns:
        DataSetRefluxData: 更新后的回流数据对象。

    Raises:
        ValueError: 当未找到指定的回流数据时抛出异常。
    """
    reflux_data = DataSetRefluxData.query.filter_by(id=reflux_data_id).first()
    if not reflux_data:
        raise ValueError("未找到此条回流数据")
    # 获取当前时间作为更新时间
    now_str = TimeTools.get_china_now()
    logging.log("reflux_data", str(reflux_data))
    logging.log("content", str(content))
    # 更新现有的回流数据
    reflux_data.app_name = content["app_name"]
    reflux_data.module_name = content["module_info"]["module_name"]
    reflux_data.module_type = content["module_info"]["module_type"]
    reflux_data.output_time = content["module_info"]["output_time"]
    reflux_data.module_input = content["module_info"]["module_input"]
    reflux_data.module_output = content["module_info"]["module_output"]
    reflux_data.conversation_id = content["conversation_info"]["conversation_id"]
    reflux_data.turn_number = content["conversation_info"]["turn_number"]
    reflux_data.is_satisfied = content["conversation_info"]["is_satisfied"]
    reflux_data.user_feedback = content["conversation_info"]["user_feedback"]
    reflux_data.updated_at = now_str
    # 提交到数据库
    db.session.commit()
    return reflux_data


def update_reflux_data_feedback(data: dict):
    """根据app_id、module_id、conversation_id、turn_number确认回流记录并更新用户反馈。

    Args:
        data (dict): 反馈数据，包含以下字段：
            - app_id (str): 应用ID
            - module_id (str): 模块ID
            - conversation_id (str): 会话ID
            - turn_number (int): 会话轮次
            - is_satisfied (bool): 是否满意
            - user_feedback (str): 用户反馈

    Returns:
        None: 无返回值。

    Raises:
        ValueError: 当未找到对应的回流数据时抛出异常。
    """
    # if not data.get('is_satisfied'):
    #     raise ValueError('用户反馈是否满意为空')
    data_set_reflux = DataSetRefluxData.query.filter_by(
        app_id=data.get("app_id"),
        module_id=data.get("module_id"),
        conversation_id=data.get("conversation_id"),
        turn_number=data.get("turn_number"),
    ).first()
    if not data_set_reflux:
        raise ValueError("未找到此回流数据")
    now_str = TimeTools.get_china_now()
    data_set_reflux.is_satisfied = data.get("is_satisfied")
    data_set_reflux.user_feedback = data.get("user_feedback")
    data_set_reflux.update_time = now_str
    db.session.commit()
