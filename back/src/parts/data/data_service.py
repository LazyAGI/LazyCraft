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

import importlib.util
import json
import logging
import os
import re
import shutil
import sys
import tarfile
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor

import requests
from flask import current_app
from sqlalchemy import and_, desc, or_, select

from libs.filetools import FileTools
from libs.json_utils import ensure_list_from_json
from libs.timetools import TimeTools
from models.model_account import Account, Tenant
from parts.finetune.model import FinetuneTask
from parts.finetune.model import TaskStatus as FinetuneTaskStatus
from parts.logs import Action, LogService, Module
from parts.tag.model import Tag
from utils.util_database import db

from .model import (DataSet, DataSetFile, DataSetFileStatus, DataSetRefluxData,
                    DataSetVersion, DataSetVersionStatus)
from .script_model import Script
from .script_service import ScriptService
from .task_manager import TaskStatus, task_manager
from .transform_json_tool import TransformJsonTool

# 全局线程池
executor = ThreadPoolExecutor(max_workers=20)  # 可以根据需要调整线程数


class DataService:
    """数据服务类，提供数据集的增删改查、文件处理、数据清洗等功能。

    Attributes:
        user_id (str): 用户ID。
        user_name (str): 用户名。
        tenant_id (str): 租户ID。
    """

    def __init__(self, account):
        """初始化数据服务。

        Args:
            account (Account or None): 用户账户对象。如果为None，则使用默认账户。
        """
        if account is not None:
            self.user_id = account.id
            self.user_name = account.name
            self.tenant_id = account.current_tenant_id
        else:
            account = Account.default_getone("00000000-0000-0000-0000-000000000001")
            self.user_id = account.id
            self.user_name = account.name
            self.tenant_id = None

    def get_data_set_list(self, data):
        """获取数据集列表，支持多种过滤条件。

        Args:
            data (dict): 查询参数，包含以下字段：
                - search_tags (list, optional): 搜索标签列表。
                - name (str, optional): 数据集名称。
                - search_name (str, optional): 搜索名称。
                - data_type (list, optional): 数据类型列表。
                - user_id (list, optional): 用户ID列表。
                - qtype (str, optional): 查询类型，支持 "mine"、"group"、"builtin"、"already"。
                - page (int): 页码。
                - page_size (int): 每页大小。

        Returns:
            Pagination: 分页结果对象，包含数据集列表和分页信息。
        """
        logging.info(f"获取数据集列表: {data}")
        query = DataSet.query
        filters = []

        if data.get("search_tags"):
            target_ids = Tag.get_target_ids_by_names(
                Tag.Types.DATASET, data["search_tags"]
            )
            filters.append(DataSet.id.in_(target_ids))

        if data.get("name") or data.get("search_name"):
            search_name = data.get("name") or data.get("search_name")
            filters.append(
                or_(
                    DataSet.name.ilike(f"%{search_name}%"),
                    DataSet.description.ilike(f"%{search_name}%"),
                )
            )

        if data.get("data_type"):
            filters.append(DataSet.data_type.in_(data.get("data_type")))

        if data.get("user_id"):
            filters.append(DataSet.user_id.in_(data.get("user_id")))

        if data.get("qtype") == "mine":  # 我的工具(包含草稿)
            filters.append(DataSet.tenant_id == self.tenant_id)
            filters.append(DataSet.user_id == self.user_id)
        elif data.get("qtype") == "group":  # 同组工具(包含草稿)
            filters.append(
                and_(
                    DataSet.tenant_id == self.tenant_id, DataSet.user_id != self.user_id
                )
            )
        elif data.get("qtype") == "builtin":  # 内置的工具
            filters.append(DataSet.user_id == Account.get_administrator_id())
        elif data.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    DataSet.tenant_id == self.tenant_id,
                    DataSet.user_id == Account.get_administrator_id(),
                )
            )
        query = query.filter(and_(*filters))
        query = query.order_by(desc(DataSet.created_at))

        pagination = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )
        for i in pagination.items:
            if i.user_id == Account.get_administrator_id():
                i.user_name = "Lazy LLM官方"
        return pagination

    def create_data(self, data):
        """创建数据集及其初始版本。

        Args:
            data (dict): 数据集创建参数，包含以下字段：
                - name (str): 数据集名称。
                - description (str, optional): 数据集描述。
                - data_type (str): 数据类型（doc或pic）。
                - upload_type (str): 上传类型（local或url）。
                - file_paths (list, optional): 本地文件路径列表。
                - file_urls (list, optional): 文件URL列表。
                - data_format (str, optional): 数据格式。
                - from_type (str, optional): 来源类型。

        Returns:
            DataSet: 创建的数据集对象。

        Raises:
            ValueError: 当数据集创建失败时抛出异常。
        """
        data_set_instance = self.create_data_set(data)

        if data_set_instance is None:
            raise ValueError("数据集创建失败")
        data["data_set_id"] = data_set_instance.id
        data["data_set_version_name"] = self.get_data_set_version_name(
            data.get("name"), False
        )
        data_set_version_instance = self.create_data_set_version(
            data, data_set_instance.id
        )

        version_path = FileTools.create_data_storage(
            self.user_id, data_set_version_instance.name
        )
        # 如果版本路径存在，则删除，避免存储旧文件
        if os.path.exists(version_path):
            shutil.rmtree(version_path)
        data_set_instance.version_path = version_path
        data_set_instance.branches_num += 1
        data_set_instance.default_branches_num += 1
        data["data_set_version_id"] = data_set_version_instance.id
        data["user_id"] = self.user_id
        data["user_name"] = self.user_name
        data["file_type"] = data.get("upload_type")
        data["version_path"] = version_path
        data["data_format"] = data_set_instance.data_format
        file_id_list = self.process_data_set_files(data)

        data_set_version_instance.data_set_file_ids = file_id_list
        data_set_version_instance.version_path = version_path
        db.session.commit()
        self.change_data_set_version_status(data_set_version_instance.id)
        # 统计当前用户组添加数据集的使用空间,获取version_path文件夹下文件的大小
        Tenant.save_used_storage(
            self.tenant_id, FileTools.get_dir_path_size(version_path)
        )
        return data_set_instance

    def create_data_set(self, data):
        """创建数据集记录。

        Args:
            data (dict): 数据集创建参数，包含以下字段：
                - name (str): 数据集名称。
                - description (str, optional): 数据集描述。
                - data_type (str): 数据类型（doc或pic）。
                - upload_type (str): 上传类型（local或url）。
                - file_paths (list, optional): 本地文件路径列表。
                - file_urls (list, optional): 文件URL列表。
                - data_format (str, optional): 数据格式。
                - from_type (str, optional): 来源类型。

        Returns:
            DataSet: 创建的数据集对象。

        Raises:
            ValueError: 当数据集已存在时抛出异常。
        """
        if DataSet.query.filter_by(
            name=data["name"], data_type=data["data_type"], tenant_id=self.tenant_id
        ).first():
            raise ValueError("数据集已存在")

        now_str = TimeTools.get_china_now()

        data_set_obj = DataSet(
            name=data.get("name"),
            user_id=self.user_id,
            user_name=self.user_name,
            tenant_id=self.tenant_id,
            description=data.get("description"),
            data_type=data.get("data_type"),
            data_format=data.get("data_format"),
            upload_type=data.get("upload_type"),
            from_type=data.get("from_type"),
            created_at=now_str,
            tags_num=0,
            branches_num=0,
        )
        if data.get("upload_type") == "local":
            data_set_obj.file_paths = data.get("file_paths")
        else:
            data_set_obj.file_urls = data.get("file_urls")

        db.session.add(data_set_obj)
        db.session.commit()
        return data_set_obj

    def create_data_set_version(self, data, data_set_id):
        """创建数据集版本记录。

        Args:
            data (dict): 版本创建参数，包含以下字段：
                - data_set_version_name (str): 版本名称。
                - version (str, optional): 版本号，默认为"v1.0.0-dirty"。
                - is_original (bool, optional): 是否为原始版本，默认为True。
                - data_set_file_ids (list, optional): 文件ID列表。
                - version_type (str, optional): 版本类型，默认为"branch"。
            data_set_id (str): 数据集ID。

        Returns:
            DataSetVersion: 创建的数据集版本对象。
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
            # is_published=data.get('is_published', False),
        )
        db.session.add(data_set_version_obj)
        db.session.commit()
        return data_set_version_obj

    def update_data_set_version(self, data_set_version):
        """更新数据集版本记录。

        Args:
            data_set_version (DataSetVersion): 要更新的数据集版本对象。

        Returns:
            DataSetVersion: 更新后的数据集版本对象。
        """
        data_set_version.updated_at = TimeTools.get_china_now()
        db.session.add(data_set_version)
        db.session.commit()
        return data_set_version

    def process_data_set_files(self, data):
        """处理数据集文件列表。

        Args:
            data (dict): 包含文件路径或URL的数据字典：
                - file_paths (list, optional): 本地文件路径列表。
                - file_urls (list, optional): 文件URL列表。

        Returns:
            list: 处理后的文件ID列表。
        """
        file_list = []
        if "file_paths" in data:
            for file_path in data["file_paths"]:
                file_list += self.process_file(file_path, data, is_local=True)
        elif "file_urls" in data:
            for file_url in data["file_urls"]:
                file_list += self.process_file(file_url, data, is_local=False)

        return file_list

    def process_file(self, file_path_or_url, data, is_local=True):
        """处理单个文件。

        Args:
            file_path_or_url (str): 文件路径或URL。
            data (dict): 文件处理参数，包含以下字段：
                - data_set_id (str): 数据集ID。
                - data_set_version_id (str): 数据集版本ID。
                - user_id (str): 用户ID。
                - file_type (str): 文件类型。
                - data_type (str): 数据类型。
                - version_path (str): 版本路径。
                - data_format (str): 数据格式。
            is_local (bool, optional): 是否为本地文件，默认为True。

        Returns:
            list: 处理后的文件ID列表。

        Raises:
            Exception: 当文件处理失败时抛出异常。
        """
        new_file = None
        file_list = []
        try:
            error_msg = ""
            if is_local:
                old_path = file_path_or_url
                file_path = os.path.join(
                    data["version_path"], os.path.basename(old_path)
                )
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                shutil.copy(old_path, file_path)
            else:
                file_result = self.download_file(file_path_or_url, data["version_path"])
                if file_result.get("error"):
                    raise Exception(file_result.get("error"))
                file_path = file_result.get("file_path")
                file_size = file_result.get("file_size")
                data["download_url"] = file_path_or_url

                if data.get("data_type") == "doc":
                    if file_size > 1024**3:
                        error_msg = "文件大小不能超过1GB,上传失败"
                    if not file_path.endswith(
                        (
                            ".json",
                            ".csv",
                            ".jsonl",
                            ".txt",
                            ".parquet",
                            ".zip",
                            ".tar.gz",
                        )
                    ):
                        error_msg = "文件类型不支持"
                if data.get("data_type") == "pic":
                    if file_size > 2 * 1024**3:
                        error_msg = "文件大小不能超过2GB,上传失败"
                    if not file_path.endswith(
                        (
                            ".jpg",
                            ".png",
                            ".jpeg",
                            ".gif",
                            ".svg",
                            ".webp",
                            ".bmp",
                            ".tiff",
                            ".ico",
                            ".zip",
                            ".tar.gz",
                        )
                    ):
                        error_msg = "文件类型不支持"

            if error_msg != "":
                if data.get("data_type") == "pic":
                    print("当前图片集上传文件失败，暂时不记录文件信息")
                    return file_list
                new_file = self.create_file_record(
                    "",
                    os.path.basename(file_path),
                    data,
                    DataSetFileStatus.file_upload_fail.value,
                    error_msg,
                )
                # 上传失败后 删除文件
                os.remove(file_path)
                file_list.append(new_file.id)
                return file_list

            # 判断文件类型，如果是zip或tar.gz文件，则不插入数据库中
            if file_path.endswith(".zip") or file_path.endswith(".tar.gz"):
                file_list += self.extract_and_process(file_path, data)
            else:
                new_file = self.create_file_record(
                    file_path,
                    os.path.basename(file_path),
                    data,
                    DataSetFileStatus.file_done.value,
                    "",
                )
                if data.get("data_type") == "doc":
                    executor.submit(
                        self.process_file_async,
                        new_file.id,
                        new_file.data_set_version_id,
                        data.get("data_format"),
                        current_app._get_current_object(),
                    )

                file_list.append(new_file.id)
                # self.extract_and_process(file_path, new_file, data)
            return file_list
        except Exception as e:
            print("4")
            print(e)
            error_msg = f"Error processing file {file_path_or_url}: {str(e)}"
            logging.exception(e)
            if new_file:
                self.update_file_status(
                    new_file.id, DataSetFileStatus.file_upload_fail.value, error_msg
                )
            else:
                # 如果文件记录还没创建，就创建一个错误状态的记录
                error_file = self.create_file_record(
                    file_path_or_url,
                    os.path.basename(file_path_or_url),
                    data,
                    DataSetFileStatus.file_upload_fail.value,
                    error_msg,
                )

                file_list.append(error_file.id)
        return file_list

    @staticmethod
    def download_file(file_url, save_dir):
        """下载文件到指定目录。

        Args:
            file_url (str): 文件URL地址。
            save_dir (str): 保存目录路径。

        Returns:
            dict: 包含下载结果的字典：
                - file_path (str or None): 文件保存路径。
                - file_name (str or None): 文件名。
                - file_size (int or None): 文件大小（字节）。
                - error (str or None): 错误信息。

        Raises:
            Exception: 当下载失败时抛出异常。
        """
        try:
            response = requests.get(file_url, stream=True)
            response.raise_for_status()  # 检查请求是否成功

            # 获取文件名
            if "Content-Disposition" in response.headers:
                file_name = (
                    response.headers["Content-Disposition"]
                    .split("filename=")[-1]
                    .strip('"')
                )
            else:
                file_name = file_url.split("/")[-1]

            file_path = os.path.join(save_dir, file_name)  # 将文件保存到指定路径下

            # 确保路径存在
            os.makedirs(save_dir, exist_ok=True)

            # 分块写入文件
            with open(file_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):  # 每次读取 8KB
                    if chunk:  # 确保 chunk 不为空
                        f.write(chunk)

            # 获取文件大小
            file_size = os.path.getsize(file_path)  # 使用 os.path.getsize 获取文件大小

            return {
                "file_path": file_path,
                "file_name": file_name,
                "file_size": file_size,
                "error": None,
            }

        except Exception as e:
            return {
                "file_path": None,
                "file_name": None,
                "file_size": None,
                "error": str(e),
            }

    @staticmethod
    def create_file_record(file_path, file_name, data, status, error_msg=""):
        """创建数据集文件记录。

        Args:
            file_path (str): 文件路径。
            file_name (str): 文件名。
            data (dict): 文件数据，包含以下字段：
                - download_url (str, optional): 下载URL。
                - data_set_id (int): 数据集ID。
                - data_set_version_id (int): 数据集版本ID。
                - user_id (str): 用户ID。
                - file_type (str): 文件类型。
            status (str): 文件状态。
            error_msg (str, optional): 错误信息，默认为空字符串。

        Returns:
            DataSetFile: 创建的数据集文件记录对象。

        Raises:
            Exception: 当数据库操作失败时抛出异常。
        """
        now_str = TimeTools.get_china_now()
        new_file = DataSetFile(
            name=file_name,
            path=file_path,
            download_url=data.get("download_url"),
            data_set_id=data.get("data_set_id"),
            data_set_version_id=data.get("data_set_version_id"),
            user_id=data.get("user_id"),
            file_type=data.get("file_type"),
            status=status,
            operation="新增数据",
            created_at=now_str,
            updated_at=now_str,
            finished_at=now_str,
            error_msg=error_msg,
        )
        db.session.add(new_file)
        db.session.commit()
        return new_file

    def decode_zip_filename(self, filename):
        """解码ZIP文件中的中文文件名。

        Args:
            filename (str): 需要解码的文件名。

        Returns:
            str: 解码后的文件名。
        """
        # 尝试不同的编码组合
        encodings = [
            ("cp437", "gbk"),  # Windows中文系统
            ("utf-8", "utf-8"),  # Mac/Linux UTF-8
            ("cp437", "utf-8"),  # Windows UTF-8
            ("cp437", "big5"),  # Windows繁体中文
            ("cp932", "utf-8"),  # Windows日文系统
            ("cp437", "shift_jis"),  # Windows日文系统
            ("cp437", "euc-jp"),  # Windows日文系统
            ("cp437", "cp936"),  # Windows中文系统
            ("cp437", "cp950"),  # Windows繁体中文
            ("gbk", "gbk"),  # 直接GBK
            ("utf-8", "gbk"),  # UTF-8转GBK
            ("gbk", "utf-8"),  # GBK转UTF-8
        ]

        for source_enc, target_enc in encodings:
            try:
                return filename.encode(source_enc).decode(target_enc)
            except Exception as e:
                logging.error(f"decode_zip_filename error: {e}")
                continue

        # 如果所有编码都失败，返回原始文件名
        return filename

    def extract_and_process(self, file_path, data):
        """解压并处理压缩文件。

        Args:
            file_path (str): 压缩文件路径。
            data (dict): 文件处理参数，包含以下字段：
                - data_set_id (str): 数据集ID。
                - data_set_version_id (str): 数据集版本ID。
                - user_id (str): 用户ID。
                - file_type (str): 文件类型。
                - data_type (str): 数据类型。
                - version_path (str): 版本路径。
                - data_format (str): 数据格式。

        Returns:
            list: 处理后的文件ID列表。
        """
        save_path = os.path.dirname(file_path)
        file_list = []
        if file_path.endswith(".zip"):
            with zipfile.ZipFile(file_path, "r") as zip_ref:
                for file_info in zip_ref.infolist():
                    file_info.filename = self.decode_zip_filename(file_info.filename)
                    if file_info.filename.endswith("/"):  # 是目录
                        continue
                    with zip_ref.open(file_info) as file:
                        file_id = self.process_extracted_file(
                            file_info.filename, file, data, save_path
                        )
                        if file_id is not None:
                            file_list.append(file_id)
            # 删除原始zip文件
            os.remove(file_path)
        elif file_path.endswith(".tar.gz"):
            with tarfile.open(file_path, "r:gz", encoding="utf-8") as tar_ref:
                for member in tar_ref.getmembers():
                    if member.isfile():
                        file = tar_ref.extractfile(member)
                        file_id = self.process_extracted_file(
                            member.name, file, data, save_path
                        )
                        if file_id is not None:
                            file_list.append(file_id)
            # 删除原始tar.gz文件
            os.remove(file_path)
        else:
            with open(file_path, "rb") as file:
                file_id = self.process_extracted_file(file_path, file, data, save_path)
                if file_id is not None:
                    file_list.append(file_id)

        return file_list

    def process_extracted_file(self, file_name, file_content, data, save_path):
        """处理解压后的单个文件。

        Args:
            file_name (str): 文件名。
            file_content: 文件内容对象。
            data (dict): 文件处理参数，包含以下字段：
                - data_set_id (str): 数据集ID。
                - data_set_version_id (str): 数据集版本ID。
                - user_id (str): 用户ID。
                - file_type (str): 文件类型。
                - data_type (str): 数据类型。
                - version_path (str): 版本路径。
                - data_format (str): 数据格式。
            save_path (str): 保存路径。

        Returns:
            str or None: 创建的文件记录ID，如果文件类型不支持则返回None。
        """
        if data.get("data_type") == "pic":
            if not file_name.endswith(
                (
                    ".jpg",
                    ".png",
                    ".jpeg",
                    ".gif",
                    ".svg",
                    ".webp",
                    ".bmp",
                    ".tiff",
                    ".ico",
                )
            ):
                return None

        if "__MACOSX" in file_name:
            return None
        if ".DS_Store" in file_name:
            return None

        save_path = os.path.join(save_path, file_name)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(file_content.read())

        now_str = TimeTools.get_china_now()
        # 创建子文件记录
        child_file = DataSetFile(
            name=file_name,
            path=save_path,
            download_url=data.get("download_url"),
            data_set_id=data.get("data_set_id"),
            data_set_version_id=data.get("data_set_version_id"),
            user_id=data.get("user_id"),
            file_type=data.get("file_type"),
            status=DataSetFileStatus.file_done.value,
            created_at=now_str,
            updated_at=now_str,
            finished_at=now_str,
            operation="upload",
        )
        db.session.add(child_file)
        db.session.commit()
        if data.get("data_type") == "doc":
            executor.submit(
                self.process_file_async,
                child_file.id,
                child_file.data_set_version_id,
                data.get("data_format"),
                current_app._get_current_object(),
            )

        return child_file.id

    def process_file_async(self, file_id, data_set_version_id, data_format, flask_app):
        """异步处理文件内容。

        Args:
            file_id (str): 文件记录ID。
            data_set_version_id (str): 数据集版本ID。
            data_format (str): 数据格式。
            flask_app: Flask应用对象。

        Returns:
            None: 异步处理，无返回值。
        """
        with flask_app.app_context():
            try:
                # self.update_file_status(file_id, DataSetFileStatus.file_doing.value, None)
                data_set_file_instance = DataSetFile.query.get(file_id)
                print(f"Processing file {file_id} asynchronously")
                if not data_format:
                    self.update_file_status(
                        file_id,
                        DataSetFileStatus.file_parse_fail.value,
                        "没有对应解析格式，解析失败",
                    )
                    self.change_data_set_version_status(data_set_version_id)
                    return
                flag, msg = TransformJsonTool().transform_to_json(
                    data_set_file_instance.path, data_format
                )
                if flag:
                    data_set_file_instance.path = msg
                    data_set_file_instance.status = DataSetFileStatus.file_done.value
                    data_set_file_instance.update_time = TimeTools.get_china_now()
                    db.session.add(data_set_file_instance)
                    db.session.commit()
                else:
                    self.update_file_status(
                        file_id, DataSetFileStatus.file_parse_fail.value, msg
                    )
            except Exception as e:
                print(str(e))
                error_msg = f"Error calling ABC API: {str(e)}"
                self.update_file_status(
                    file_id, DataSetFileStatus.file_parse_fail.value, error_msg
                )

            self.change_data_set_version_status(data_set_version_id)

    @staticmethod
    def update_file_status(file_id, status, error_msg):
        """更新文件状态。

        Args:
            file_id (str): 文件记录ID。
            status (str): 新的文件状态。
            error_msg (str): 错误信息。

        Returns:
            None: 无返回值。
        """
        print(file_id)
        try:
            file_instance = (
                db.session.query(DataSetFile).filter(DataSetFile.id == file_id).first()
            )
            print(file_instance)
            if file_instance:
                print("2222")
                file_instance.status = status
                file_instance.error_msg = error_msg
                file_instance.updated_at = TimeTools.get_china_now()
                db.session.add(file_instance)
                db.session.commit()
        except Exception as e:
            print(str(e))

    @staticmethod
    def get_data_set_version_list_by_id(data):
        """根据数据集ID获取版本列表。

        Args:
            data (dict): 查询参数，包含以下字段：
                - data_set_id (str): 数据集ID。
                - version_type (str, optional): 版本类型。
                - page (int): 页码。
                - page_size (int): 每页大小。

        Returns:
            dict: 分页结果，包含版本列表和分页信息。
        """
        query = (
            db.session.query(DataSetVersion, DataSet)
            .join(DataSet, DataSetVersion.data_set_id == DataSet.id)
            .filter(DataSetVersion.data_set_id == data.get("data_set_id"))
        )
        if data.get("version_type"):
            query = query.filter(
                DataSetVersion.version_type == data.get("version_type")
            )

        query = query.order_by(desc(DataSetVersion.created_at))

        pagination = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

        # 整合 DataSetVersion 和 DataSet 字段
        items = []
        for version, dataset in pagination.items:
            item = {
                # DataSetVersion 字段
                "id": version.id,
                "data_set_id": version.data_set_id,
                "user_id": version.user_id,
                "status": version.status,
                "created_at": version.created_at,
                "updated_at": version.updated_at,
                "name": version.name,
                "version": version.version,
                "is_original": version.is_original,
                "data_set_file_ids": version.data_set_file_ids,
                "version_type": version.version_type,
                "previous_version_id": getattr(version, "previous_version_id", None),
                "version_path": getattr(version, "version_path", None),
                # DataSet 字段
                "description": dataset.description,
                "data_type": dataset.data_type,
                "data_format": dataset.data_format,
                "user_name": dataset.user_name,
                "from_type": dataset.from_type,
                "reflux_type": dataset.reflux_type,
            }
            items.append(item)

        return {
            "items": items,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "per_page": pagination.per_page,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
            "page": pagination.page,
        }

    @staticmethod
    def get_data_set_file_by_id(data):
        """根据数据集版本ID获取文件列表。

        Args:
            data (dict): 查询参数，包含以下字段：
                - data_set_version_id (str): 数据集版本ID。
                - page (int): 页码。
                - page_size (int): 每页大小。

        Returns:
            Pagination: 分页结果对象，包含文件列表和分页信息。
        """
        query = DataSetFile.query.filter(
            DataSetFile.data_set_version_id == data.get("data_set_version_id")
        )
        query = query.order_by(desc(DataSetFile.finished_at))

        return query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

    @staticmethod
    def get_data_set_version_name(name, flag):
        """生成数据集版本名称。

        Args:
            name (str): 基础名称。
            flag (bool): 是否递增版本号。

        Returns:
            str: 生成的版本名称。
        """
        if flag:
            match = re.search(r"-(\d+)$", name)
            if match:
                number = int(match.group(1)) + 1
                return f"{name[:match.start()]}-{number}"

        return f"{name}-1"

    @staticmethod
    def increment_version(version, default_num=None):
        """递增版本号。

        Args:
            version (str): 当前版本号。
            default_num (int, optional): 默认递增数字。

        Returns:
            str: 递增后的版本号。

        Raises:
            ValueError: 当版本号格式无效时抛出异常。
        """
        # 检查是否包含 "-dirty"
        dirty_suffix = ""
        if "-dirty" in version:
            version, dirty_suffix = version.split("-dirty")
            dirty_suffix = "-dirty"

        # 如果提供了 default_num，则生成 v1.0.0+n 格式的版本号
        if default_num is not None:
            major, minor, patch = 1, 0, 0
            patch += default_num
            if patch >= 10:
                minor += patch // 10
                patch = patch % 10
            if minor >= 10:
                major += minor // 10
                minor = minor % 10
            return f"v{major}.{minor}.{patch}{dirty_suffix}"

        # 处理三位版本号
        elif re.match(r"^v\d+\.\d+\.\d+$", version):
            major, minor, patch = map(int, version[1:].split("."))
            patch += 1
            if patch == 10:
                minor += 1
                patch = 0
            if minor == 10:
                major += 1
                minor = 0
            return f"v{major}.{minor}.{patch}{dirty_suffix}"

        else:
            raise ValueError("Invalid version format")

    @staticmethod
    def get_data_set_tag_list(data_set_id):
        """获取数据集的标签版本列表。

        Args:
            data_set_id (str): 数据集ID。

        Returns:
            list: 标签版本列表。
        """
        tag_list = (
            DataSetVersion.query.filter(
                DataSetVersion.data_set_id == data_set_id,
                DataSetVersion.version_type == "tag",
            )
            .order_by(desc(DataSetVersion.created_at))
            .all()
        )
        return tag_list

    def create_data_set_version_by_tag(self, data_set_version_id, name):
        """根据标签版本创建新的分支版本。

        Args:
            data_set_version_id (str): 数据集版本ID。
            name (str, optional): 新版本名称。

        Returns:
            DataSetVersion: 创建的数据集版本对象。
        """
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)

        version = f"{self.increment_version('v1.0.0', data_set_instance.default_branches_num)}-dirty"

        if not name:
            name = (
                f"{data_set_instance.name}-"
                f"{data_set_instance.default_branches_num + data_set_instance.default_tags_num}"
            )

        version_path = FileTools.create_data_storage(
            data_set_version_instance.user_id, name
        )
        data_set_version_obj = self.create_data_set_version_by_version(
            data_set_version_instance,
            name,
            "branch",
            version,
            version_path,
            data_set_instance,
        )

        return data_set_version_obj

    def publish_data_set_version(self, data_set_version_id):
        """发布数据集版本为标签版本。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            DataSetVersion: 发布的标签版本对象。
        """
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        # data_set_version_instance.is_published = True
        db.session.commit()
        # 生成新的Tag
        version = data_set_version_instance.version.removesuffix("-dirty")

        # 判断当前版本是否已存在 如果存在直接 用default_tags_num+1  生成新版本
        published_tag_instance = DataSetVersion.query.filter_by(
            data_set_id=data_set_instance.id, version_type="tag", version=version
        ).all()
        if len(published_tag_instance) > 0:
            version = self.increment_version(
                "v1.0.0", data_set_instance.default_tags_num
            )

        if data_set_instance.from_type == "return":
            version_path = ""
        else:
            version_path = data_set_version_instance.version_path + "-published"
        data_set_version_obj = self.create_data_set_version_by_version(
            data_set_version_instance,
            data_set_version_instance.name,
            "tag",
            version,
            version_path,
            data_set_instance,
        )
        # 统计当前用户组添加数据集的使用空间,获取version_path文件夹下文件的大小
        Tenant.save_used_storage(
            self.tenant_id, FileTools.get_dir_path_size(version_path)
        )
        return data_set_version_obj

    def create_data_set_version_by_version(
        self,
        data_set_version_instance,
        name,
        version_type,
        version,
        version_path,
        data_set_instance,
    ):
        """根据指定参数创建数据集版本。

        Args:
            data_set_version_instance (DataSetVersion): 原始数据集版本实例。
            name (str): 新版本名称。
            version_type (str): 版本类型（branch或tag）。
            version (str): 版本号。
            version_path (str): 版本路径。
            data_set_instance (DataSet): 数据集实例。

        Returns:
            DataSetVersion: 创建的数据集版本对象。
        """
        now_str = TimeTools.get_china_now()
        data_set_version_obj = DataSetVersion(
            data_set_id=data_set_version_instance.data_set_id,
            user_id=data_set_version_instance.user_id,
            status=DataSetVersionStatus.version_done.value,
            created_at=now_str,
            updated_at=now_str,
            name=name,
            version=version,
            is_original=False,
            data_set_file_ids=[],
            version_type=version_type,
            # is_published=is_published,
            previous_version_id=data_set_version_instance.id,
            version_path=version_path,
        )
        db.session.add(data_set_version_obj)

        if version_type == "tag":
            data_set_instance.tags_num += 1
            data_set_instance.default_tags_num += 1
        elif version_type == "branch":
            data_set_instance.branches_num += 1
            data_set_instance.default_branches_num += 1
        db.session.commit()
        print(data_set_version_instance.id)
        print(data_set_version_obj.id)
        # 复制 file 文件
        self.copy_data_set_file(
            data_set_version_instance.id,
            data_set_version_obj.id,
            data_set_version_obj.version_path,
        )

        stmt = select(DataSetFile.id).filter_by(
            data_set_version_id=data_set_version_obj.id
        )
        id_list = db.session.scalars(stmt).all()
        data_set_version_obj.data_set_file_ids = id_list
        db.session.commit()

        return data_set_version_obj

    @staticmethod
    def copy_data_set_file(
        old_data_set_version_id, new_data_set_version_id, new_version_path
    ):
        """复制数据集文件到新版本。

        Args:
            old_data_set_version_id (str): 原始数据集版本ID。
            new_data_set_version_id (str): 新数据集版本ID。
            new_version_path (str): 新版本路径。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当复制失败时抛出异常。
        """
        try:
            old_data_file_list = DataSetFile.query.filter_by(
                data_set_version_id=old_data_set_version_id
            ).all()
            print(old_data_file_list)
            for data_file in old_data_file_list:
                now_str = TimeTools.get_china_now()
                path = ""
                if data_file.path:
                    old_path = data_file.path
                    path = os.path.join(new_version_path, os.path.basename(old_path))
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    shutil.copy(old_path, path)

                new_data_set_file_obj = DataSetFile(
                    name=data_file.name,
                    path=path,
                    download_url=data_file.download_url,
                    data_set_id=data_file.data_set_id,
                    data_set_version_id=new_data_set_version_id,
                    user_id=data_file.user_id,
                    file_type=data_file.file_type,
                    status=DataSetFileStatus.file_done.value,
                    operation="upload",
                    created_at=now_str,
                    updated_at=now_str,
                    finished_at=now_str,
                )
                db.session.add(new_data_set_file_obj)
            db.session.commit()
        except Exception as e:
            print(f"Error copying data_set_file: {str(e)}")
            db.session.rollback()

    @staticmethod
    def get_data_set_file_by_file_id(file_id, start=None, end=None):
        """根据文件ID获取文件内容。

        Args:
            file_id (str): 数据集文件ID。
            start (int, optional): 起始行号。
            end (int, optional): 结束行号。

        Returns:
            dict: 包含文件内容的响应，包含以下字段：
                - json: 文件内容。
                - name: 文件名。
                - total: 总行数。

        Raises:
            ValueError: 当文件未找到、路径无效或内容格式错误时抛出异常。
        """
        file = DataSetFile.query.get(file_id)
        if not file:
            raise ValueError("文件未找到")

        file_path = file.path
        if not file_path or not os.path.exists(file_path):
            raise ValueError("当前文件路径无效或者被删除")

        if not file_path.lower().endswith(".json"):
            raise ValueError("当前文件类型不支持查看详情")

        encoding = FileTools.get_file_encoding(file_path)
        try:
            with open(file_path, encoding=encoding) as f:
                json_content = json.load(f)

        except json.JSONDecodeError:
            raise ValueError("文件内容不是有效的 JSON 格式")
        except Exception as e:
            raise ValueError(f"读取文件时发生错误: {str(e)}")
        # 只对list类型内容做切片
        if isinstance(json_content, list):
            total = len(json_content)
            # 处理start/end参数
            if start is not None:
                start_idx = max(0, start - 1)
                if end is not None:
                    end_idx = min(end, total)
                else:
                    end_idx = total
                sliced_content = json_content[start_idx:end_idx]
                return {"json": sliced_content, "name": file.name, "total": total}
            else:
                return {"json": json_content, "name": file.name, "total": total}
        else:
            # 非list类型不做切片，total为1
            return {"json": json_content, "name": file.name, "total": 1}

    @staticmethod
    def get_data_set_file_by_data_set_file_id(data_set_file_id):
        """根据数据集文件ID获取文件记录。

        Args:
            data_set_file_id (str): 数据集文件ID。

        Returns:
            DataSetFile: 数据集文件记录对象。
        """
        return DataSetFile.query.get(data_set_file_id)

    @staticmethod
    def update_data_set_file(
        data_set_file_id, content, data_set_file_name, start=None, end=None
    ):
        """更新数据集文件内容。

        Args:
            data_set_file_id (str): 数据集文件ID。
            content (str or list or dict): 新的文件内容。
            data_set_file_name (str): 新的文件名。
            start (int, optional): 起始行号。
            end (int, optional): 结束行号。

        Returns:
            int: 更新后的总行数。

        Raises:
            ValueError: 当文件未找到、路径无效或内容格式错误时抛出异常。
        """
        file_instance = DataSetFile.query.get(data_set_file_id)
        if not file_instance:
            raise ValueError("文件未找到")

        # 检查文件是否存在
        file_path = file_instance.path
        if not file_path or not os.path.exists(file_path):
            raise ValueError("当前文件路径无效或者被删除")

        new_total = 1
        # 如果是list类型且有start/end参数，则做区间替换
        if isinstance(content, list) and start is not None and end is not None:
            # 读取原文件内容
            try:
                with open(file_path, encoding="utf-8") as f:
                    original_json = json.load(f)
            except Exception as e:
                logging.exception(e)
                raise ValueError("读取原文件失败：" + str(e))

            if not isinstance(original_json, list):
                raise ValueError("原文件内容不是list，无法按区间替换")

            # 获取原始结构样本
            if original_json:
                sample_keys = (
                    set(original_json[0].keys())
                    if isinstance(original_json[0], dict)
                    else None
                )
            else:
                sample_keys = None

            logging.info(f"sample_keys: {sample_keys}")
            # 校验 content 内部结构
            for idx, item in enumerate(content):
                if not isinstance(item, dict):
                    raise ValueError(f"content[{idx}] 不是字典类型")
                # if sample_keys and set(item.keys()) != sample_keys:
                # raise ValueError(f"content[{idx}] 字段结构与原文件不一致")

            total = len(original_json)
            start_idx = max(0, start - 1)
            end_idx = min(end, total)
            # 替换指定区间内容
            new_json = original_json[:start_idx] + content + original_json[end_idx:]
            new_total = total - (end_idx - start_idx) + len(content)

            content_str = json.dumps(new_json, ensure_ascii=False, indent=4)
        else:
            # 普通写入
            if isinstance(content, (dict, list)):
                content_str = json.dumps(content, ensure_ascii=False, indent=4)
                new_total = len(content) if isinstance(content, list) else 1
            else:
                content_str = str(content)

        try:
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(content_str)
        except Exception as e:
            logging.exception(e)
            raise ValueError("修改当前文件失败：", str(e))
        file_instance.name = data_set_file_name
        db.session.commit()
        return new_total

    def delete_data_set(self, data_set_id):
        """删除数据集及其所有版本。

        Args:
            data_set_id (str): 数据集ID。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当数据集未找到或正在被使用时抛出异常。
        """
        data_set_obj = DataSet.query.get(data_set_id)
        if not data_set_obj:
            raise ValueError("数据集未找到")
        data_set_version_list = DataSetVersion.query.filter_by(
            data_set_id=data_set_id
        ).all()
        for data_set_version in data_set_version_list:
            if self.check_data_set_version_by_fine_tune(data_set_version.id):
                raise ValueError("当前数据集有版本正在被使用，无法删除")
        try:
            for data_set_version_obj in data_set_version_list:
                self.delete_data_set_version(
                    data_set_version_obj.id, False, data_set_obj.from_type
                )
                db.session.delete(data_set_version_obj)
            Tag.delete_bindings(Tag.Types.DATASET, data_set_id)
            db.session.delete(data_set_obj)
            db.session.commit()
        except Exception as e:
            logging.exception(e)
            db.session.rollback()
            raise ValueError("删除失败e:" + str(e))

    def delete_data_set_version(self, data_set_version_id, need_commit, from_type):
        """删除数据集版本。

        Args:
            data_set_version_id (str): 数据集版本ID。
            need_commit (bool): 是否需要提交事务。
            from_type (str): 来源类型（upload或return）。

        Returns:
            int: 删除的文件数量。

        Raises:
            ValueError: 当版本未找到或正在被使用时抛出异常。
        """
        data_set_version_obj = DataSetVersion.query.get(data_set_version_id)
        if not data_set_version_obj:
            raise ValueError("版本未找到")
        delete_num = 0

        if self.check_data_set_version_by_fine_tune(data_set_version_obj.id):
            raise ValueError("该版本正在被使用，无法删除")

        # 查询要删除数据集下的文件大小
        version_path = data_set_version_obj.version_path
        Tenant.restore_used_storage(
            self.tenant_id, FileTools.get_dir_path_size(version_path)
        )

        if from_type == "return":
            delete_num = DataSetRefluxData.query.filter_by(
                data_set_version_id=data_set_version_id
            ).delete()

        if from_type == "upload":
            data_set_file_list = DataSetFile.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()
            try:
                for data_set_file_obj in data_set_file_list:
                    delete_num += 1
                    self.delete_data_set_file(data_set_file_obj.id, False, False)
            except Exception as e:
                db.session.rollback()
                raise ValueError("删除失败:" + str(e))

        # 在删除之前获取需要的数据
        data_set_id = data_set_version_obj.data_set_id
        version_type = data_set_version_obj.version_type

        db.session.delete(data_set_version_obj)

        if need_commit:
            data_set_instance = DataSet.query.get(data_set_id)
            # 更新数据集branch&tag数量
            if version_type == "branch":
                data_set_instance.branches_num -= 1
            elif version_type == "tag":
                data_set_instance.tags_num -= 1
            db.session.commit()

        return delete_num

    def delete_data_set_file(self, data_set_file_id, need_commit, need_update_status):
        """删除数据集文件。

        Args:
            data_set_file_id (str): 数据集文件ID。
            need_commit (bool): 是否需要提交事务。
            need_update_status (bool): 是否需要更新版本状态。

        Returns:
            None: 无返回值。

        Raises:
            ValueError: 当文件未找到时抛出异常。
        """
        data_set_file_obj = DataSetFile.query.get(data_set_file_id)
        if not data_set_file_obj:
            raise ValueError("文件未找到")

        file_path = data_set_file_obj.path
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        db.session.delete(data_set_file_obj)

        if need_commit:
            db.session.commit()

        if need_update_status:
            self.change_data_set_version_status(data_set_file_obj.data_set_version_id)
            data_set_version_instance = DataSetVersion.query.get(
                data_set_file_obj.data_set_version_id
            )
            ids = ensure_list_from_json(data_set_version_instance.data_set_file_ids)
            if data_set_file_id in ids:
                ids.remove(data_set_file_id)
            data_set_version_instance.data_set_file_ids = ids
            db.session.add(data_set_version_instance)
            db.session.commit()

    @staticmethod
    def change_data_set_version_status(data_set_version_id):
        """根据文件状态更新数据集版本状态。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            DataSetVersion: 更新后的数据集版本对象。
        """
        data_set_version_obj = DataSetVersion.query.get(data_set_version_id)
        results = DataSetFile.query.filter(
            DataSetFile.data_set_version_id == data_set_version_id,
            DataSetFile.status.in_(
                [
                    DataSetFileStatus.file_waiting.value,
                    DataSetFileStatus.file_doing.value,
                    DataSetFileStatus.file_uploading.value,
                    DataSetFileStatus.file_cleaning.value,
                    DataSetFileStatus.file_enhancing.value,
                    DataSetFileStatus.file_denoising.value,
                    DataSetFileStatus.file_annotating.value,
                ]
            ),
        ).all()
        if len(results) > 0:
            data_set_version_obj.status = DataSetVersionStatus.version_doing.value
            db.session.commit()
            return data_set_version_obj

        results = DataSetFile.query.filter(
            DataSetFile.data_set_version_id == data_set_version_id,
            DataSetFile.status.in_(
                [
                    DataSetFileStatus.file_upload_fail.value,
                    DataSetFileStatus.file_parse_fail.value,
                    DataSetFileStatus.file_clean_fail.value,
                    DataSetFileStatus.file_enhance_fail.value,
                    DataSetFileStatus.file_denoise_fail.value,
                    DataSetFileStatus.file_annotate_fail.value,
                ]
            ),
        ).all()
        if len(results) > 0:
            data_set_version_obj.status = DataSetVersionStatus.version_fail.value
            db.session.commit()
            return data_set_version_obj

        data_set_version_obj.status = DataSetVersionStatus.version_done.value
        db.session.commit()
        return data_set_version_obj

    @staticmethod
    def get_data_set_by_id(data_set_id):
        """根据ID获取数据集。

        Args:
            data_set_id (str): 数据集ID。

        Returns:
            DataSet: 数据集对象。
        """
        return DataSet.query.get(data_set_id)

    @staticmethod
    def get_data_set_version_by_id(data_set_version_id):
        """根据ID获取数据集版本。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            DataSetVersion: 数据集版本对象。
        """
        return DataSetVersion.query.get(data_set_version_id)

    @staticmethod
    def get_data_set_version_count_by_data_set_id(data_set_id):
        """根据数据集ID获取版本数量。

        Args:
            data_set_id (str): 数据集ID。

        Returns:
            int: 版本数量。
        """
        return DataSetVersion.query.filter(
            DataSetVersion.data_set_id == data_set_id
        ).count()

    @staticmethod
    def get_data_set_info_by_version_ids(version_ids):
        """根据版本ID列表获取数据集信息。

        Args:
            version_ids (list): 版本ID列表。

        Returns:
            tuple: 包含数据集实例、版本类型和版本列表的元组。
        """
        versions = DataSetVersion.query.filter(DataSetVersion.id.in_(version_ids)).all()
        version_type = ""
        version_list = []
        # versions 循环
        for version in versions:
            version_type = version.version_type
            version_list.append(version.version)

        data_set_version_instance = DataSetVersion.query.get(version_ids[0])
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        return data_set_instance, version_type, version_list

    def add_data_set_version_file(self, data):
        """向数据集版本添加文件。

        Args:
            data (dict): 添加文件参数，包含以下字段：
                - data_set_version_id (str): 数据集版本ID。
                - name (str, optional): 版本名称。
                - version (str, optional): 版本号。
                - file_paths (list, optional): 本地文件路径列表。
                - file_urls (list, optional): 文件URL列表。

        Returns:
            DataSetVersion: 更新后的数据集版本对象。

        Raises:
            ValueError: 当数据集版本ID不存在时抛出异常。
        """
        data_set_version_obj = DataSetVersion.query.get(data.get("data_set_version_id"))
        if data_set_version_obj is None:
            raise ValueError("data_set_version_id is not exist")

        data_set_obj = DataSet.query.get(data_set_version_obj.data_set_id)

        if data.get("name"):
            data_set_version_obj.name = data.get("name")
        if data.get("version"):
            data_set_version_obj.version = data.get("version")

        data["version_path"] = data_set_version_obj.version_path
        data["user_id"] = data_set_version_obj.user_id
        data["data_set_id"] = data_set_version_obj.data_set_id
        data["data_type"] = data_set_obj.data_type
        data["file_type"] = data_set_obj.upload_type
        data["from_type"] = data_set_obj.from_type
        data["data_format"] = data_set_obj.data_format

        file_id_list = self.process_data_set_files(data)

        # 确保 data_set_file_ids 是一个列表
        ids = ensure_list_from_json(data_set_version_obj.data_set_file_ids)
        data_set_version_obj.data_set_file_ids = []
        db.session.commit()

        # 无法检测到ids变化 先置为[]再更新
        ids.extend(file_id_list)
        data_set_version_obj.data_set_file_ids = ids

        db.session.commit()
        # 设置状态
        self.change_data_set_version_status(data_set_version_obj.id)

        return data_set_version_obj

    @staticmethod
    def create_individual_zip(data_set_version_id):
        """创建单个数据集版本的压缩包。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            str: 压缩包文件路径。

        Raises:
            Exception: 当压缩包创建失败时抛出异常。
        """
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        # 压缩一个数据集
        now_str = TimeTools.get_china_now()
        zip_filename = f"{data_set_version_instance.name}_{data_set_version_instance.version}_{now_str}.zip"
        with zipfile.ZipFile(zip_filename, "w") as zf:
            if data_set_instance.from_type == "upload":
                if os.path.exists(data_set_version_instance.version_path):
                    for root, _, files in os.walk(
                        data_set_version_instance.version_path
                    ):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zf.write(
                                file_path,
                                os.path.relpath(
                                    file_path, data_set_version_instance.version_path
                                ),
                            )

            elif data_set_instance.from_type == "return":
                # 新的返回数据逻辑
                # 假设我们有一个函数来获取相关的 A 表数据
                reflux_list = DataSetRefluxData.query.filter_by(
                    data_set_version_id=data_set_version_id
                ).all()

                for item in reflux_list:
                    # 为每个项创建一个 JSON 文件
                    json_filename = f"{item.id}.json"
                    with open(json_filename, "w") as json_file:
                        json.dump(
                            item.json_data, json_file, ensure_ascii=False, indent=4
                        )

                    # 将 JSON 文件添加到 zip
                    zf.write(json_filename, json_filename)

                    # 删除临时 JSON 文件
                    os.remove(json_filename)

            # 创建信息文件
            info_filename = f"info_{data_set_version_instance.name}.txt"
            with open(info_filename, "w") as info_file:
                info_file.write(f"数据集名称: {data_set_version_instance.name}\n")
                info_file.write(f"数据集版本号: {data_set_version_instance.version}\n")
                info_file.write(f"数据集描述: {data_set_instance.description}\n")
                info_file.write(f"数据集标签: {data_set_instance.label}\n")
                info_file.write(f"数据集类型: {data_set_instance.from_type}\n")

            # 将信息文件添加到压缩包
            zf.write(info_filename, os.path.basename(info_filename))
            os.remove(info_filename)  # 删除临时信息文件

        return zip_filename

    @staticmethod
    def create_individual_zip_ft(data_set_version_id):
        """创建单个数据集版本的压缩包（微调专用）。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            tuple: 包含文件列表和来源类型的元组。
        """
        dataset_files = []
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        if data_set_instance.from_type == "upload":
            if os.path.exists(data_set_version_instance.version_path):
                for root, _, files in os.walk(data_set_version_instance.version_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        dataset_files.append(file_path)
        elif data_set_instance.from_type == "return":
            reflux_list = DataSetRefluxData.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()

            for item in reflux_list:
                json_filename = f"{item.id}.json"
                with open(json_filename, "w") as json_file:
                    json.dump(item.json_data, json_file, ensure_ascii=False, indent=4)

                dataset_files.append(json_filename)
                # os.remove(json_filename)
        return dataset_files, data_set_instance.from_type

    def create_combined_zip(self, data_set_version_ids):
        """创建多个数据集版本的组合压缩包。

        Args:
            data_set_version_ids (list): 数据集版本ID列表。

        Returns:
            str: 组合压缩包文件路径。

        Raises:
            Exception: 当压缩包创建失败时抛出异常。
        """
        combined_zip_filename = f"多个数据集_{TimeTools.get_china_now()}.zip"
        with zipfile.ZipFile(combined_zip_filename, "w") as combined_zip:
            for data_set_version_id in data_set_version_ids:
                individual_zip_filename = self.create_individual_zip(
                    data_set_version_id
                )
                combined_zip.write(
                    individual_zip_filename, os.path.basename(individual_zip_filename)
                )
                os.remove(individual_zip_filename)  # 删除临时压缩包

        return combined_zip_filename

    def _prepare_script_instance(self, script_agent, script_id, script_type):
        """准备脚本实例。

        Args:
            script_agent (str): 脚本代理类型（script或agent）。
            script_id (str): 脚本ID。
            script_type (str): 脚本类型。

        Returns:
            Script: 脚本实例。

        Raises:
            Exception: 当脚本代理类型不支持或脚本不存在时抛出异常。
        """
        if script_agent == "script":
            script_instance = ScriptService.get_script_by_id(script_id)
        elif script_agent == "agent":
            script_instance = Script(script_type=script_type, script_url=script_id)
        else:
            raise Exception("不支持的脚本代理类型")

        if not script_instance:
            raise Exception("脚本不存在")

        return script_instance

    def _execute_clean_or_enhance_core(
        self, data_set_version_id, script_instance, script_agent
    ):
        """执行清洗或增强的核心逻辑。

        Args:
            data_set_version_id (str): 数据集版本ID。
            script_instance (Script): 脚本实例。
            script_agent (str): 脚本代理类型。

        Returns:
            tuple: 包含成功列表和失败列表的元组。
        """
        success_list = []
        fail_list = []

        logging.info(f"开始执行清洗或增强，data_set_version_id: {data_set_version_id}")
        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        from_type = DataSet.query.get(data_set_version_instance.data_set_id).from_type

        if from_type == "return":
            reflux_list = DataSetRefluxData.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()
            for reflux in reflux_list:
                success_flag = self.process_clean_or_enhance(
                    reflux, script_instance, from_type, script_agent
                )
                if success_flag:
                    success_list.append(reflux.id)
                else:
                    fail_list.append(reflux.id)

        if from_type == "upload":
            data_set_file_list = DataSetFile.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()
            for data_set_file in data_set_file_list:
                success_flag = self.process_clean_or_enhance(
                    data_set_file, script_instance, from_type, script_agent
                )
                if success_flag:
                    success_list.append(data_set_file.id)
                else:
                    fail_list.append(data_set_file.id)

        return success_list, fail_list

    def data_clean_or_enhance(
        self, data_set_version_id, script_id, script_type, script_agent
    ):
        """清洗数据或增强数据，根据脚本属性来决定（同步版本，保持向后兼容）。

        Args:
            data_set_version_id (str): 数据集版本ID。
            script_id (str): 脚本ID。
            script_type (str): 脚本类型。
            script_agent (str): 脚本代理类型。

        Returns:
            tuple: 包含数据集版本实例、脚本实例、成功列表和失败列表的元组。
        """
        script_instance = self._prepare_script_instance(
            script_agent, script_id, script_type
        )

        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        data_set_version_instance.status = DataSetVersionStatus.version_doing.value
        db.session.commit()

        # 执行核心处理逻辑（同步执行）
        success_list, fail_list = self._execute_clean_or_enhance_core(
            data_set_version_id, script_instance, script_agent
        )

        data_set_version_instance.status = DataSetVersionStatus.version_done.value
        db.session.commit()
        return data_set_version_instance, script_instance, success_list, fail_list

    def process_clean_or_enhance(
        self,
        data_set_file,
        script_instance,
        from_type,
        script_agent,
        progress_callback=None,
    ):
        """处理单个文件的清洗或增强操作。

        Args:
            data_set_file (DataSetFile or DataSetRefluxData): 数据集文件或回流数据对象。
            script_instance (Script): 脚本实例。
            from_type (str): 来源类型（upload或return）。
            script_agent (str): 脚本代理类型。
            progress_callback (function, optional): 进度回调函数。

        Returns:
            bool: 处理是否成功。
        """
        logging.info(f"开始处理清洗或增强，data_set_file_id:{data_set_file.id}")
        file_path = None
        json_data = None
        if from_type == "upload":
            file_path = data_set_file.path
        if from_type == "return":
            json_data = data_set_file.json_data
        success_flag = False
        # is_cleaning = script_instance.script_type == "数据过滤"
        # operation = 'clean' if is_cleaning else 'augment'
        operation = script_instance.script_type

        try:
            # 根据来源类型计算处理前的大小
            if from_type == "upload" and hasattr(data_set_file, 'path') and data_set_file.path:
                before_size = FileTools.get_file_path_size([data_set_file.path])
            elif from_type == "return" and hasattr(data_set_file, 'json_data') and data_set_file.json_data:
                # 对于回流数据，计算JSON数据的大小
                json_str = json.dumps(data_set_file.json_data, ensure_ascii=False)
                before_size = len(json_str.encode('utf-8'))
            else:
                before_size = 0
                
            data_set_file.status = DataSetFileStatus.get_script_type_processing_status(
                script_instance.script_type
            )
            db.session.commit()

            # 创建文件内部进度回调函数
            def file_progress_callback(processed, total, message):
                if progress_callback:
                    progress_callback(
                        processed, total, f"文件 {data_set_file.name}: {message}"
                    )

            if script_agent == "script":
                success, msg = self.process_json_with_pio(
                    file_path,
                    json_data,
                    script_instance.script_url,
                    operation,
                    file_progress_callback,
                )
            else:
                success, msg = self.process_data_with_agent(
                    file_path,
                    json_data,
                    script_instance.script_url,
                    operation,
                    file_progress_callback,
                )

            if success:
                success_flag = True
                data_set_file.status = DataSetFileStatus.file_done.value
                data_set_file.error_msg = ""
                data_set_file.operation = script_instance.script_type
                if from_type == "return":
                    # 确保 json_data 存储为 JSON 对象
                    if isinstance(msg, str):
                        # 如果返回的是文件路径字符串，需要读取文件内容
                        try:
                            with open(msg, 'r', encoding='utf-8') as f:
                                data_set_file.json_data = json.load(f)
                        except Exception as e:
                            logging.error(f"读取处理结果文件失败: {e}")
                            try:
                                data_set_file.json_data = json.loads(msg)
                            except Exception as e:
                                logging.error(f"读取处理结果文件失败: {e}")
                                data_set_file.json_data = {"error": f"读取处理结果文件失败: {str(e)}"}
                    else:
                        # 如果返回的是 JSON 对象，直接存储
                        data_set_file.json_data = msg
                # 更新增强或者清洗之后的数据
                if from_type == "upload" and hasattr(data_set_file, 'path') and data_set_file.path:
                    after_size = FileTools.get_file_path_size([data_set_file.path])
                elif from_type == "return" and hasattr(data_set_file, 'json_data') and data_set_file.json_data:
                    # 对于回流数据，计算处理后JSON数据的大小
                    json_str = json.dumps(data_set_file.json_data, ensure_ascii=False)
                    after_size = len(json_str.encode('utf-8'))
                else:
                    after_size = 0
                    
                Tenant.update_used_storage(self.tenant_id, before_size, after_size)
            else:
                data_set_file.status = DataSetFileStatus.get_script_type_failed_status(
                    script_instance.script_type
                )
                data_set_file.error_msg = msg

        except Exception as e:

            data_set_file.status = DataSetFileStatus.get_script_type_failed_status(
                script_instance.script_type
            )
            data_set_file.error_msg = str(e)
            data_set_file.updated_at = TimeTools.get_china_now()
            logging.error(
                f"{script_instance.script_type}失败，data_set_file_id:{data_set_file.id}, error:{e}"
            )
        logging.info(f"处理清洗或增强完成，data_set_file_id:{data_set_file.id}")
        db.session.commit()
        return success_flag

    def get_data_tree(self, qtype="already", data_type="doc"):
        """获取数据树结构。

        Args:
            qtype (str, optional): 查询类型，默认为"already"。
            data_type (str, optional): 数据类型，默认为"doc"。

        Returns:
            list: 数据树结构列表。
        """
        filters = [DataSet.data_type == data_type, DataSet.tags_num > 0]
        if qtype == "mine":  # 我的应用(包含草稿)
            filters.append(
                or_(
                    and_(
                        DataSet.user_id == self.user_id,
                        DataSet.tenant_id == self.tenant_id,
                    ),
                    DataSet.user_id == Account.get_administrator_id(),
                )
            )
        elif qtype == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    DataSet.tenant_id == self.tenant_id,
                    DataSet.user_id == Account.get_administrator_id(),
                )
            )

        datasets = db.session.query(DataSet).filter(*filters).all()
        data_set_version = []
        if len(datasets) > 0:
            ids = [d.id for d in datasets]
            data_set_version = (
                db.session.query(DataSetVersion)
                .filter(
                    DataSetVersion.version_type == "tag",
                    DataSetVersion.data_set_id.in_(ids),
                )
                .all()
            )

        result = []
        for d in datasets:
            result.append(
                {
                    "val_key": "null$" + str(d.id),
                    "type": d.data_format,
                    "label": d.name,
                    "child": [
                        {
                            "val_key": i.id,
                            "type": d.data_format,
                            "label": i.name + ":" + i.version,
                        }
                        for i in data_set_version
                        if i.data_set_id == d.id
                    ],
                }
            )

        return result

    @staticmethod
    def _load_data_from_source(input_json_path, json_data):
        """从文件或直接数据中加载数据。

        Args:
            input_json_path (str): 输入JSON文件路径。
            json_data (dict or list): 直接传入的JSON数据。

        Returns:
            tuple: (data, error_message) 如果成功返回(data, None)，失败返回(None, error_message)
        """
        try:
            data = None
            if input_json_path:
                with open(input_json_path, encoding="utf-8") as f:
                    data = json.load(f)
            elif json_data:
                data = json_data

            if not data:
                return None, "数据为空"
            return data, None
        except json.JSONDecodeError as e:
            return None, f"读取JSON文件出错: {e}"
        except FileNotFoundError as e:
            return None, f"文件未找到: {e.filename}"

    @staticmethod
    def _load_pio_script(pio_script_path):
        """加载PIO脚本并获取处理函数。

        Args:
            pio_script_path (str): PIO脚本路径。

        Returns:
            tuple: (func, error_message) 如果成功返回(func, None)，失败返回(None, error_message)
        """
        if not os.path.exists(pio_script_path):
            return None, f"PIO script file not found: {pio_script_path}"

        # 动态加载 PIO 脚本
        spec = importlib.util.spec_from_file_location("pio_module", pio_script_path)
        pio_module = importlib.util.module_from_spec(spec)
        sys.modules["pio_module"] = pio_module
        spec.loader.exec_module(pio_module)

        # 解析文件名获取数据格式和脚本方法
        filename = os.path.basename(pio_script_path)
        name, _ = os.path.splitext(filename)
        parts = name.split("_", 1)
        if len(parts) != 2:
            return (
                None,
                f"The script file name {filename} must be in the format 'data_format_script_method.py'.",
            )

        data_format, script_method = parts
        func = getattr(pio_module, script_method, None)

        if not func or not callable(func):
            return (
                None,
                f"No {script_method} function found in the PIO script. {filename}",
            )

        return func, None

    @staticmethod
    def _process_single_item(func, item, operation):
        """处理单个数据项。

        Args:
            func: 处理函数。
            item: 要处理的数据项。
            operation (str): 操作类型。

        Returns:
            list: 处理结果列表。
        """
        try:
            result = func(item)
            if result is None:
                if "数据增强" == operation:
                    return [item]  # 数据增强为空时，保留原数据
                return []  # 返回空list，表示这条数据被忽略
            if isinstance(result, list):
                return result
            else:
                return [result]
        except Exception as e:
            logging.error(f"Error processing item: {e}")
            return [item]  # 失败则保留原数据

    @staticmethod
    def _process_list_data(func, data, operation, progress_callback=None):
        """并行处理列表类型数据。

        Args:
            func: 处理函数。
            data (list): 要处理的数据列表。
            operation (str): 操作类型。
            progress_callback (function, optional): 进度回调函数。

        Returns:
            list: 处理后的数据列表。
        """
        results = [None] * len(data)
        total_items = len(data)
        processed_items = 0

        def process_one(idx, item):
            result_list = DataService._process_single_item(func, item, operation)
            return idx, result_list

        max_workers = min(16, os.cpu_count() or 4)
        from concurrent.futures import ThreadPoolExecutor, as_completed

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(process_one, idx, item) for idx, item in enumerate(data)
            ]
            for future in as_completed(futures):
                idx, result_list = future.result()
                results[idx] = result_list
                processed_items += 1

                # 调用进度回调函数
                if progress_callback:
                    progress_callback(
                        processed_items,
                        total_items,
                        f"处理第 {processed_items} 条数据",
                    )

        # 保持原顺序，合并所有结果
        processed_list = []
        for result_list in results:
            processed_list.extend(result_list)

        return processed_list

    @staticmethod
    def _save_result_to_file(input_json_path, result):
        """将结果保存到文件。

        Args:
            input_json_path (str): 输出文件路径。
            result: 要保存的结果。

        Returns:
            tuple: (success, message) 保存成功返回(True, file_path)，失败返回(False, error_message)
        """
        try:
            with open(input_json_path, "w", encoding="utf-8") as f:
                if isinstance(result, (dict, list)):
                    json.dump(result, f, ensure_ascii=False, indent=4)
                else:
                    f.write(str(result))
            return True, input_json_path
        except OSError as e:
            logging.error(f"写入文件失败: {e}")
            return False, f"写入文件失败: {str(e)}"

    @staticmethod
    def process_json_with_pio(
        input_json_path,
        json_data,
        pio_script_path,
        operation=None,
        progress_callback=None,
    ):
        """通过PIO脚本处理JSON数据。

        Args:
            input_json_path (str): 输入JSON文件路径。
            json_data (dict or list): 直接传入的JSON数据。
            pio_script_path (str): PIO脚本路径。
            operation (str, optional): 操作类型。
            progress_callback (function, optional): 进度回调函数，用于实时更新处理进度。

        Returns:
            tuple: 包含处理是否成功和结果的元组。

        Raises:
            Exception: 当脚本文件不存在、函数未找到或处理失败时抛出异常。
        """
        try:
            # 加载数据
            data, error = DataService._load_data_from_source(input_json_path, json_data)
            if error:
                logging.error(f"加载数据失败: {error}")
                return False, error

            # 加载PIO脚本
            func, error = DataService._load_pio_script(pio_script_path)
            if error:
                logging.error(f"加载PIO脚本失败: {error}")
                return False, error

            # 处理数据
            if isinstance(data, list):
                # 并行处理list类型数据
                processed_list = DataService._process_list_data(
                    func, data, operation, progress_callback
                )

                # 保存结果
                if input_json_path and len(processed_list) > 0:
                    success, result = DataService._save_result_to_file(
                        input_json_path, processed_list
                    )
                    return success, result
                else:
                    return True, processed_list
            else:
                # 非list类型，整体处理
                try:
                    result = func(data)
                    if input_json_path:
                        success, result = DataService._save_result_to_file(
                            input_json_path, result
                        )
                        return success, result
                    else:
                        return True, result
                except Exception as e:
                    logging.error(f"PIO脚本处理异常: {e}")
                    return False, f"PIO脚本处理异常: {str(e)}"

        except Exception as e:
            logging.error(f"脚本处理发生异常: {str(e)}")
            return False, f"发生异常: {str(e)}"

    @staticmethod
    def check_data_set_version_by_fine_tune(data_set_version_id):
        """检查数据集版本是否正在被微调任务使用。

        Args:
            data_set_version_id (str): 数据集版本ID。

        Returns:
            bool: 如果正在被使用返回True，否则返回False。
        """
        tasks = FinetuneTask.query.filter(
            FinetuneTask.status.in_(
                [FinetuneTaskStatus.PENDING.value, FinetuneTaskStatus.IN_PROGRESS.value]
            ),
            FinetuneTask.deleted_flag == 0,
        ).all()

        if tasks:
            for task in tasks:
                datasets = task.datasets
                if isinstance(datasets, str):
                    try:
                        datasets = json.loads(datasets)
                    except json.JSONDecodeError:
                        print("解析json失败")
                        continue

                if not isinstance(datasets, list):
                    # 如果解析后不是列表，跳过这个任务
                    continue

                # 确保比较的类型一致
                if str(data_set_version_id) in map(str, datasets):
                    return True

        return False

    @staticmethod
    def _run_agent_and_get_handler(app_run, input_str):
        """运行agent并获取处理器。

        Args:
            app_run: 应用运行实例。
            input_str (str): 输入字符串。

        Returns:
            EventHandler: 事件处理器。
        """
        # 为数据处理生成一个基于时间戳的turn_number
        turn_number = int(time.time() * 1000) % 10000 + 1
        gen = app_run.run_stream([input_str], turn_number=turn_number)
        try:
            while True:
                next(gen)
        except StopIteration as e:
            return e.value  # EventHandler

    @staticmethod
    def _check_item_format(origin_item, result_item):
        """校验数据项格式。

        Args:
            origin_item: 原始数据项。
            result_item: 结果数据项。

        Returns:
            bool: 格式是否匹配。
        """
        # 只校验dict类型
        if not isinstance(origin_item, dict) or not isinstance(result_item, dict):
            return False
        # 字段包含校验
        for k in origin_item.keys():
            if k not in result_item:
                return False
        return True

    @staticmethod
    def _validate_and_create_app_run(app_id):
        """验证应用并创建运行实例。

        Args:
            app_id (str): 应用ID。

        Returns:
            tuple: (app_run, error_message) 成功返回(app_run, None)，失败返回(None, error_message)
        """
        from parts.app.app_service import AppService
        from parts.app.node_run.app_run_service import AppRunService

        app_model = AppService().get_app(app_id)
        if not app_model:
            return None, f"应用不存在{app_id}"
        if app_model.enable_api is False:
            return None, f"应用未启动{app_id}"

        app_run = AppRunService.create(app_model, mode="publish")
        return app_run, None

    @staticmethod
    def _parse_agent_output(output_data):
        """解析agent输出数据。

        Args:
            output_data: agent输出的原始数据。

        Returns:
            dict or list: 解析后的数据。
        """
        # 检查output_data是否为可序列化的类型
        if hasattr(output_data, "__dict__") and not isinstance(
            output_data, (dict, list, str, int, float, bool, type(None))
        ):
            # 如果是不可序列化的对象，尝试转换为字符串
            output_data = str(output_data)

        if not output_data:
            return None

        try:
            # 处理可能的单引号问题，先尝试直接解析
            try:
                result = json.loads(output_data)
            except json.JSONDecodeError:
                # 如果解析失败，尝试将单引号替换为双引号
                processed_output = output_data.replace("'", '"')
                result = json.loads(processed_output)
            return result
        except Exception as e:
            logging.error(f"解析output_data失败: {e}, output_data: {output_data}")
            return None

    @staticmethod
    def _validate_and_format_result(original_item, parsed_result, operation):
        """验证和格式化处理结果。

        Args:
            original_item: 原始数据项。
            parsed_result: 解析后的结果。
            operation (str): 操作类型。

        Returns:
            list: 验证后的结果列表。
        """
        if parsed_result is None:
            if "数据增强" == operation:
                return [original_item]  # 数据增强为空时，保留原数据
            return []  # 返回空list，表示这条数据被忽略

        checked_result = []
        if isinstance(parsed_result, list):
            for r in parsed_result:
                if DataService._check_item_format(original_item, r):
                    checked_result.append(r)
                else:
                    checked_result.append(original_item)
        elif isinstance(parsed_result, dict):
            if DataService._check_item_format(original_item, parsed_result):
                checked_result.append(parsed_result)
            else:
                checked_result.append(original_item)
        else:
            checked_result.append(original_item)

        return checked_result

    @staticmethod
    def _process_single_item_with_agent(app_run, item, operation):
        """使用agent处理单个数据项。

        Args:
            app_run: 应用运行实例。
            item: 要处理的数据项。
            operation (str): 操作类型。

        Returns:
            list: 处理结果列表。
        """
        try:
            input_str = json.dumps(item, ensure_ascii=False)
            event_handler = DataService._run_agent_and_get_handler(app_run, input_str)

            if event_handler and event_handler.is_success():
                output_data = event_handler.get_run_result()
                parsed_result = DataService._parse_agent_output(output_data)
                return DataService._validate_and_format_result(
                    item, parsed_result, operation
                )
            else:
                return [item]  # 失败则返回原数据
        except Exception as e:
            logging.error(f"agent处理单条数据异常: {e}")
            return [item]

    @staticmethod
    def _process_list_data_with_agent(app_run, data, operation, progress_callback=None):
        """并行处理列表类型数据。

        Args:
            app_run: 应用运行实例。
            data (list): 要处理的数据列表。
            operation (str): 操作类型。
            progress_callback (function, optional): 进度回调函数。

        Returns:
            list: 处理后的数据列表。
        """
        results = [None] * len(data)
        total_items = len(data)
        processed_items = 0

        def process_one(idx, item):
            result_list = DataService._process_single_item_with_agent(
                app_run, item, operation
            )
            return idx, result_list

        max_workers = min(16, os.cpu_count() or 4)
        from concurrent.futures import ThreadPoolExecutor, as_completed

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(process_one, idx, item) for idx, item in enumerate(data)
            ]
            for future in as_completed(futures):
                idx, res_list = future.result()
                results[idx] = res_list
                processed_items += 1

                # 调用进度回调函数
                if progress_callback:
                    progress_callback(
                        processed_items,
                        total_items,
                        f"处理第 {processed_items} 条数据",
                    )

        # 保持原顺序，合并所有结果
        processed_list = []
        for result_list in results:
            processed_list.extend(result_list)

        return processed_list

    @staticmethod
    def _process_single_data_with_agent(app_run, data, operation):
        """使用agent处理单个数据。

        Args:
            app_run: 应用运行实例。
            data: 要处理的数据。
            operation (str): 操作类型。

        Returns:
            dict or list: 处理结果。
        """
        try:
            input_str = json.dumps(data, ensure_ascii=False)
            event_handler = DataService._run_agent_and_get_handler(app_run, input_str)

            if event_handler and event_handler.is_success():
                output_data = event_handler.get_run_result()
                parsed_result = DataService._parse_agent_output(output_data)

                if parsed_result is None:
                    return data

                # 校验格式
                if isinstance(data, dict) and isinstance(parsed_result, dict):
                    if DataService._check_item_format(data, parsed_result):
                        return parsed_result
                    else:
                        return data
                else:
                    return parsed_result
            else:
                return data
        except Exception as e:
            logging.error(f"agent整体处理异常: {e}")
            return data

    @staticmethod
    def process_data_with_agent(
        input_json_path, json_data, app_id, operation, progress_callback=None
    ):
        """通过agent方式处理数据，支持list和单条数据，与process_json_with_pio的并行处理逻辑类似。

        Args:
            input_json_path (str): 输入json文件路径。
            json_data (dict or list): 直接传入的json数据。
            app_id (str): agent的app_id（即script_instance.script_url）。
            operation (str): 操作类型（如'数据增强'等）。
            progress_callback (function, optional): 进度回调函数，用于实时更新处理进度。

        Returns:
            tuple: 包含处理是否成功和结果的元组。

        Raises:
            Exception: 当应用不存在、未启动或处理失败时抛出异常。
        """
        try:
            # 加载数据
            data, error = DataService._load_data_from_source(input_json_path, json_data)
            if error:
                logging.error(f"加载数据失败: {error}")
                return False, error

            # 验证应用并创建运行实例
            app_run, error = DataService._validate_and_create_app_run(app_id)
            if error:
                logging.error(f"验证应用并创建运行实例失败: {error}")
                return False, error

            # 处理数据
            if isinstance(data, list):
                # 并行处理list类型数据
                processed_list = DataService._process_list_data_with_agent(
                    app_run, data, operation, progress_callback
                )

                # 保存结果
                if input_json_path and len(processed_list) > 0:
                    success, result = DataService._save_result_to_file(
                        input_json_path, processed_list
                    )
                    return success, result
                else:
                    return True, processed_list
            else:
                # 非list类型，整体处理
                checked_result = DataService._process_single_data_with_agent(
                    app_run, data, operation
                )

                if input_json_path:
                    success, result = DataService._save_result_to_file(
                        input_json_path, checked_result
                    )
                    return success, result
                else:
                    return True, checked_result

        except Exception as e:
            logging.error(f"智能处理发生异常: {str(e)}")
            return False, f"智能处理发生异常: {str(e)}"

    def data_clean_or_enhance_async(
        self,
        data_set_version_id,
        script_id,
        script_type,
        script_agent,
        data_set_version_name=None,
    ):
        """异步清洗数据或增强数据，支持大数据集处理。

        Args:
            data_set_version_id (str): 数据集版本ID。
            script_id (str): 脚本ID。
            script_type (str): 脚本类型。
            script_agent (str): 脚本代理类型。
            data_set_version_name (str, optional): 数据集版本名称。

        Returns:
            str: 任务ID。

        Raises:
            Exception: 当脚本不存在、数据集版本不存在或任务启动失败时抛出异常。
        """
        if script_agent == "script":
            script_instance = ScriptService.get_script_by_id(script_id)
        elif script_agent == "agent":
            script_instance = Script(script_type=script_type, script_url=script_id)
        if not script_instance:
            raise Exception("脚本不存在")

        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        if not data_set_version_instance:
            raise Exception(f"数据集版本不存在: {data_set_version_id}")

        if data_set_version_name:
            data_set_version_instance.name = data_set_version_name
            db.session.commit()

        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        if not data_set_instance:
            raise Exception(f"数据集不存在: {data_set_version_instance.data_set_id}")

        # 获取数据总量
        from_type = data_set_instance.from_type
        if from_type == "return":
            total_items = DataSetRefluxData.query.filter_by(
                data_set_version_id=data_set_version_id
            ).count()
        else:
            total_items = DataSetFile.query.filter_by(
                data_set_version_id=data_set_version_id
            ).count()

        # 创建异步任务
        task_id = task_manager.create_task(total_items, self._execute_data_processing)

        # 启动任务
        task_manager.start_task(
            task_id,
            data_set_version_id,
            script_instance,
            from_type,
            script_agent,
            data_set_instance,
            self,
        )

        return task_id

    def _execute_data_processing(
        self,
        task_id,
        data_set_version_id,
        script_instance,
        from_type,
        script_agent,
        data_set_instance,
        data_service,
    ):
        """执行数据处理任务。

        Args:
            task_id (str): 任务ID。
            data_set_version_id (str): 数据集版本ID。
            script_instance (Script): 脚本实例。
            from_type (str): 来源类型。
            script_agent (str): 脚本代理类型。
            data_set_instance (DataSet): 数据集实例。
            data_service (DataService): 数据服务实例。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当处理失败时抛出异常。
        """
        try:
            # 更新数据集版本状态
            data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
            data_set_version_instance.status = DataSetVersionStatus.version_doing.value
            db.session.commit()

            success_list = []
            fail_list = []
            processed_count = 0

            if from_type == "return":
                reflux_list = DataSetRefluxData.query.filter_by(
                    data_set_version_id=data_set_version_id
                ).all()
                for reflux in reflux_list:
                    # 检查任务是否被取消
                    progress = task_manager.get_task_progress(task_id)
                    if progress and progress.status == TaskStatus.CANCELLED:
                        return

                    # 更新当前处理项
                    task_manager.update_progress(
                        task_id, current_item=f"处理回流数据 ID: {reflux.id}"
                    )

                    success_flag = data_service.process_clean_or_enhance(
                        reflux, script_instance, from_type, script_agent
                    )
                    if success_flag:
                        success_list.append(reflux.id)
                    else:
                        fail_list.append(reflux.id)

                    processed_count += 1
                    task_manager.update_progress(
                        task_id,
                        processed=processed_count,
                        success=len(success_list),
                        failed=len(fail_list),
                    )

            if from_type == "upload":
                data_set_file_list = DataSetFile.query.filter_by(
                    data_set_version_id=data_set_version_id
                ).all()
                for data_set_file in data_set_file_list:
                    # 检查任务是否被取消
                    progress = task_manager.get_task_progress(task_id)
                    if progress and progress.status == TaskStatus.CANCELLED:
                        return

                    # 更新当前处理项
                    task_manager.update_progress(
                        task_id, current_item=f"处理文件: {data_set_file.name}"
                    )

                    success_flag = data_service.process_clean_or_enhance(
                        data_set_file, script_instance, from_type, script_agent
                    )
                    if success_flag:
                        success_list.append(data_set_file.id)
                    else:
                        fail_list.append(data_set_file.id)

                    processed_count += 1
                    task_manager.update_progress(
                        task_id,
                        processed=processed_count,
                        success=len(success_list),
                        failed=len(fail_list),
                    )

            # 更新数据集版本状态
            data_set_version_instance.status = DataSetVersionStatus.version_done.value
            db.session.commit()

            # 记录日志
            if data_set_instance.data_type == "doc":
                data_type = "文本数据集"
            else:
                data_type = "图像数据集"

            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.OPERATE_DATA,
                name=data_set_instance.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                operate=script_instance.script_type[-2:],
                success_size=len(success_list),
                file_size=len(fail_list) + len(success_list),
            )

        except Exception as e:
            # 更新数据集版本状态为失败
            data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
            data_set_version_instance.status = DataSetVersionStatus.version_fail.value
            db.session.commit()
            raise e

    def get_processing_task_progress(self, task_id: str):
        """获取处理任务进度。

        Args:
            task_id (str): 任务ID。

        Returns:
            dict or None: 任务进度信息，如果任务不存在则返回None。
        """
        progress = task_manager.get_task_progress(task_id)
        if progress:
            return progress.to_dict()
        return None

    def cancel_processing_task(self, task_id: str):
        """取消处理任务。

        Args:
            task_id (str): 任务ID。

        Returns:
            bool: 取消是否成功。
        """
        return task_manager.cancel_task(task_id)

    def list_processing_tasks(self):
        """列出所有处理任务。

        Returns:
            dict: 所有任务的字典，键为任务ID，值为任务进度信息。
        """
        tasks = task_manager.get_all_tasks()
        return {task_id: progress.to_dict() for task_id, progress in tasks.items()}

    def data_clean_or_enhance_async_with_item_count(
        self,
        data_set_version_id,
        script_id,
        script_type,
        script_agent,
        data_set_version_name=None,
    ):
        """异步清洗数据或增强数据 - 支持统计文件内部数据条数。

        Args:
            data_set_version_id (str): 数据集版本ID。
            script_id (str): 脚本ID。
            script_type (str): 脚本类型。
            script_agent (str): 脚本代理类型。
            data_set_version_name (str, optional): 数据集版本名称。

        Returns:
            str: 任务ID。

        Raises:
            Exception: 当脚本不存在、数据集版本不存在或任务启动失败时抛出异常。
        """
        if script_agent == "script":
            script_instance = ScriptService.get_script_by_id(script_id)
        elif script_agent == "agent":
            script_instance = Script(script_type=script_type, script_url=script_id)
        if not script_instance:
            raise Exception("脚本不存在")

        data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
        if not data_set_version_instance:
            raise Exception(f"数据集版本不存在: {data_set_version_id}")

        if data_set_version_name:
            data_set_version_instance.name = data_set_version_name
            db.session.commit()

        data_set_instance = DataSet.query.get(data_set_version_instance.data_set_id)
        if not data_set_instance:
            raise Exception(f"数据集不存在: {data_set_version_instance.data_set_id}")

        # 获取数据总量（文件内部的数据条数）
        from_type = data_set_instance.from_type
        total_items = 0

        if from_type == "return":
            # 回流数据：每个DataSetRefluxData可能包含多条记录
            reflux_list = DataSetRefluxData.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()
            for reflux in reflux_list:
                if reflux.json_data:
                    try:
                        # json_data 字段是 JSON 对象，直接使用
                        data = reflux.json_data
                        if isinstance(data, list):
                            total_items += len(data)
                        else:
                            total_items += 1
                    except Exception as e:
                        logging.error(f"count_reflux_data error: {e}")
                        total_items += 1
        else:
            # 上传文件：需要读取文件内容统计数据条数
            data_set_file_list = DataSetFile.query.filter_by(
                data_set_version_id=data_set_version_id
            ).all()
            for data_set_file in data_set_file_list:
                try:
                    if data_set_file.path and os.path.exists(data_set_file.path):
                        with open(data_set_file.path, encoding="utf-8") as f:
                            data = json.load(f)
                            if isinstance(data, list):
                                total_items += len(data)
                            else:
                                total_items += 1
                    else:
                        total_items += 1  # 如果文件不存在，按1条计算
                except Exception as e:
                    logging.warning(
                        f"无法统计文件 {data_set_file.path} 的数据条数: {e}"
                    )
                    total_items += 1  # 出错时按1条计算

        # 创建异步任务
        task_id = task_manager.create_task(
            total_items, self._execute_data_processing_with_item_count
        )

        # 启动任务
        task_manager.start_task(
            task_id,
            data_set_version_id,
            script_instance,
            from_type,
            script_agent,
            data_set_instance,
            self,
        )

        return task_id

    def _execute_data_processing_with_item_count(
        self,
        task_id,
        data_set_version_id,
        script_instance,
        from_type,
        script_agent,
        data_set_instance,
        data_service,
    ):
        """执行数据处理任务 - 基于数据条数统计。

        Args:
            task_id (str): 任务ID。
            data_set_version_id (str): 数据集版本ID。
            script_instance (Script): 脚本实例。
            from_type (str): 来源类型。
            script_agent (str): 脚本代理类型。
            data_set_instance (DataSet): 数据集实例。
            data_service (DataService): 数据服务实例。

        Returns:
            None: 无返回值。

        Raises:
            Exception: 当处理失败时抛出异常。
        """
        try:
            # 更新数据集版本状态
            data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
            data_set_version_instance.status = DataSetVersionStatus.version_doing.value
            db.session.commit()

            success_list = []
            fail_list = []
            processed_count = 0
            current_file_processed = 0

            if from_type == "return":
                reflux_list = DataSetRefluxData.query.filter_by(
                    data_set_version_id=data_set_version_id
                ).all()
                for reflux in reflux_list:
                    # 检查任务是否被取消
                    progress = task_manager.get_task_progress(task_id)
                    if progress and progress.status == TaskStatus.CANCELLED:
                        return

                    # 获取当前回流数据的数据条数
                    current_item_count = 1
                    if reflux.json_data:
                        try:
                            # json_data 字段是 JSON 对象，直接使用
                            data = reflux.json_data
                            if isinstance(data, list):
                                current_item_count = len(data)
                        except Exception as e:
                            logging.error(f"count_reflux_data error: {e}")
                            current_item_count = 1

                    current_file_processed = 0

                    # 创建文件内部进度回调函数
                    def file_progress_callback(processed, total, message):
                        nonlocal current_file_processed
                        current_file_processed = processed
                        # 更新当前处理项，包含文件内部进度
                        task_manager.update_progress(
                            task_id,
                            current_item=f"处理回流数据 ID: {reflux.id} ({processed}/{total} 条数据)",
                            current_file_processed=processed,
                            current_file_total=total,
                        )

                    # 更新当前处理项
                    task_manager.update_progress(
                        task_id,
                        current_item=f"处理回流数据 ID: {reflux.id} (包含 {current_item_count} 条数据)",
                    )

                    success_flag = data_service.process_clean_or_enhance(
                        reflux,
                        script_instance,
                        from_type,
                        script_agent,
                        file_progress_callback,
                    )
                    if success_flag:
                        success_list.append(reflux.id)
                    else:
                        fail_list.append(reflux.id)

                    processed_count += current_item_count
                    task_manager.update_progress(
                        task_id,
                        processed=processed_count,
                        success=len(success_list),
                        failed=len(fail_list),
                    )

            if from_type == "upload":
                data_set_file_list = DataSetFile.query.filter_by(
                    data_set_version_id=data_set_version_id
                ).all()
                for data_set_file in data_set_file_list:
                    # 检查任务是否被取消
                    progress = task_manager.get_task_progress(task_id)
                    if progress and progress.status == TaskStatus.CANCELLED:
                        return

                    # 获取当前文件的数据条数
                    current_item_count = 1
                    try:
                        if data_set_file.path and os.path.exists(data_set_file.path):
                            with open(data_set_file.path, encoding="utf-8") as f:
                                data = json.load(f)
                                if isinstance(data, list):
                                    current_item_count = len(data)
                    except Exception as e:
                        logging.warning(
                            f"无法统计文件 {data_set_file.path} 的数据条数: {e}"
                        )
                        current_item_count = 1

                    current_file_processed = 0

                    # 创建文件内部进度回调函数
                    def file_progress_callback(processed, total, message):
                        nonlocal current_file_processed
                        current_file_processed = processed
                        # 更新当前处理项，包含文件内部进度
                        task_manager.update_progress(
                            task_id,
                            current_item=f"处理文件: {data_set_file.name} ({processed}/{total} 条数据)",
                            current_file_processed=processed,
                            current_file_total=total,
                        )

                    # 更新当前处理项
                    task_manager.update_progress(
                        task_id,
                        current_item=f"处理文件: {data_set_file.name} (包含 {current_item_count} 条数据)",
                    )

                    success_flag = data_service.process_clean_or_enhance(
                        data_set_file,
                        script_instance,
                        from_type,
                        script_agent,
                        file_progress_callback,
                    )
                    if success_flag:
                        success_list.append(data_set_file.id)
                    else:
                        fail_list.append(data_set_file.id)

                    processed_count += current_item_count
                    task_manager.update_progress(
                        task_id,
                        processed=processed_count,
                        success=len(success_list),
                        failed=len(fail_list),
                    )

            # 更新数据集版本状态
            data_set_version_instance.status = DataSetVersionStatus.version_done.value
            db.session.commit()

            # 记录日志
            if data_set_instance.data_type == "doc":
                data_type = "文本数据集"
            else:
                data_type = "图像数据集"

            LogService().add(
                Module.DATA_MANAGEMENT,
                Action.OPERATE_DATA,
                name=data_set_instance.name,
                data_type=data_type,
                version_type=data_set_version_instance.version_type,
                version=data_set_version_instance.version,
                operate=script_instance.script_type[-2:],
                success_size=len(success_list),
                file_size=len(fail_list) + len(success_list),
            )

        except Exception as e:
            # 更新数据集版本状态为失败
            data_set_version_instance = DataSetVersion.query.get(data_set_version_id)
            data_set_version_instance.status = DataSetVersionStatus.version_fail.value
            db.session.commit()
            raise e
