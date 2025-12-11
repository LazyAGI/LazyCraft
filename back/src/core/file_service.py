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

import functools
import os
import shutil
import zipfile
import logging
import sqlalchemy

from libs.filetools import FileTools
from libs.timetools import TimeTools
from models.model_account import Tenant
from parts.knowledge_base.model import FileRecord
from parts.knowledge_base.model import KnowledgeBase as kb
from utils.util_database import db


class PrettyFile:
    def __init__(self, file_path):
        """初始化文件处理对象。

        Args:
            file_path: 文件的路径。
        """
        self.file_path = file_path

    @functools.cached_property
    def file_md5(self):
        """计算并缓存文件的 MD5 值。

        Returns:
            str: 文件的 MD5 哈希值。
        """
        return FileTools.calculate_md5(self.file_path)

    @functools.cached_property
    def postfix(self):
        """获取文件的后缀名。

        Returns:
            str: 小写的文件后缀名，包含点号（如 ".txt"）。
        """
        return os.path.splitext(self.file_path)[-1].lower()

    @functools.cached_property
    def is_zipfile(self):
        """判断文件是否为有效的 ZIP 文件。

        Returns:
            bool: 如果文件后缀为 .zip 且是有效的 ZIP 文件返回 True，否则返回 False。
        """
        return self.postfix == ".zip" and zipfile.is_zipfile(self.file_path)

    def save_to_db(self, user_id):
        """将文件信息保存到数据库。

        如果是 ZIP 文件，会先解压并递归处理解压后的所有文件。
        如果文件已存在（通过 MD5 判断），则复用已有记录。

        Args:
            user_id: 用户 ID。

        Returns:
            list: FileRecord 对象列表，包含所有保存的文件记录。
        """
        file_list = []

        if self.is_zipfile:
            # 解压zip，对解压目录的每个文件递归
            extract_to = os.path.splitext(self.file_path)[0]
            FileTools.extract_zip(self.file_path, extract_to)
            os.remove(self.file_path)  # 删除原zip文件

            for root, _, files in os.walk(extract_to):
                for name in files:
                    if name.startswith("."):
                        continue  # 忽略掉解压后的隐藏文件
                    child_file_path = os.path.join(root, name)
                    child_file_list = PrettyFile(child_file_path).save_to_db(user_id)
                    file_list.extend(child_file_list)
        else:
            file_md5 = self.file_md5
            save_db_path = self.file_path
            filename = os.path.basename(self.file_path)

            existing_file = (
                db.session.query(FileRecord).filter_by(file_md5=file_md5).first()
            )
            if existing_file:
                os.remove(self.file_path)  # 同md5文件存在,删除新的文件
                save_db_path = (
                    existing_file.file_path
                )  # 改写为旧文件的地址,但是文件名保持为filename
                if not os.path.exists(save_db_path):  # 修复商汤的移动知识库文件处理
                    first = os.path.dirname(save_db_path)
                    second = "default/__data/sources"  # 商汤的知识库一旦被使用,会擅自挪动目录内的文件
                    third = os.path.basename(save_db_path)
                    save_db_path = os.path.join(first, second, third)

            file_record = FileRecord.init_as_knowledge(
                user_id, filename, save_db_path, file_md5
            )
            db.session.add(file_record)
            db.session.commit()
            file_list.append(file_record)

        return file_list


class FileService:

    def __init__(self, account):
        """初始化文件服务。

        Args:
            account: 账户对象，包含用户 ID 和租户信息。
                    传入 account 的好处是后续如果业务改为需要租户 ID，
                    不需要再修改大量函数入参。
        """
        # 传入account的好处, 是后续如果业务改为需要租户ID, 不需要再修改大量函数入参
        self.user_id = account.id
        self.current_tenant_id = account.current_tenant_id

    def add_knowledge_files(self, knowledge_base_id, file_ids):
        """往知识库添加文件。

        将已存在的文件添加到指定的知识库，只需要更新文件路径和关联关系。

        Args:
            knowledge_base_id: 知识库 ID。
            file_ids: 要添加的文件 ID 列表。

        Returns:
            list: 成功添加的文件名列表。

        Raises:
            ValueError: 当文件名重复或保存失败时抛出。
        """
        files_to_move = (
            db.session.query(FileRecord).filter(FileRecord.id.in_(file_ids)).all()
        )
        knowledge_base = db.session.query(kb).filter_by(id=knowledge_base_id).first()
        file_name_list = []
        try:
            for file_record in files_to_move:
                file_record_exist = (
                    db.session.query(FileRecord)
                    .filter(
                        FileRecord.knowledge_base_id == knowledge_base_id,
                        FileRecord.file_md5 == file_record.file_md5,
                        FileRecord.name == file_record.name,
                    )
                    .first()
                )
                if file_record_exist:
                    if len(file_ids) > 1:  # 有多个文件，仅过滤
                        continue
                    else:  # 只有一个文件 返回错误
                        raise ValueError(f"{file_record.name}文件名重复")

                old_path = file_record.file_path
                new_path = os.path.join(knowledge_base.path, os.path.basename(old_path))
                os.makedirs(os.path.dirname(new_path), exist_ok=True)
                if old_path != new_path:
                    shutil.copy(
                        old_path, new_path
                    ) 

                file_record.file_path = new_path
                file_record.tenant_id = knowledge_base.tenant_id
                file_record.used = True
                file_record.knowledge_base_id = knowledge_base_id
                file_record.updated_at = TimeTools.get_china_now()
                db.session.add(file_record)
                file_name_list.append(file_record.name)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"保存失败: {e}")
        return file_name_list

    def upload_file(self, file_obj):
        """保存上传文件。

        保存用户上传的文件，如果是 ZIP 文件会自动解压处理。
        同时更新租户的存储空间使用量。

        Args:
            file_obj: Flask 文件对象。

        Returns:
            list: FileRecord 对象列表，包含所有保存的文件记录。
        """
        user_id = self.user_id
        current_tenant_id = self.current_tenant_id
        storage_path = FileTools.create_knowledge_storage(user_id)
        filename = FileTools.get_filename(file_obj)
        file_path = os.path.join(storage_path, filename)

        file_obj.save(file_path)  # 保存文件

        file_list = PrettyFile(file_path).save_to_db(user_id)
        # 资源库文件大小同步至用户组空间下
        file_path_list = [file.file_path for file in file_list]
        Tenant.save_used_storage(
            current_tenant_id, FileTools.get_file_path_size(file_path_list)
        )
        return file_list

    def get_file_by_id(self, file_id):
        """通过 ID 获取单个文件。

        Args:
            file_id: 文件 ID。

        Returns:
            FileRecord or None: 文件记录对象，如果不存在返回 None。
        """
        return db.session.query(FileRecord).filter_by(id=file_id).first()

    def get_file_by_ids(self, file_ids):
        """通过 ID 列表获取多个文件。

        Args:
            file_ids: 文件 ID 列表。

        Returns:
            list: FileRecord 对象列表。
        """
        return db.session.query(FileRecord).filter(FileRecord.id.in_(file_ids)).all()

    def get_pagination_files(self, args):
        """分页查询知识库下的文件列表。

        Args:
            args: 查询参数字典，包含：
                  - knowledge_base_id: 知识库 ID（必需）
                  - file_name: 文件名关键字（可选）
                  - page: 页码
                  - page_size: 每页大小

        Returns:
            Pagination: SQLAlchemy 分页对象。
        """
        query = db.session.query(FileRecord).filter_by(
            knowledge_base_id=args["knowledge_base_id"], used=True
        )

        file_name = args.get("file_name", "")  # 查询文件名
        if file_name:
            query = query.filter(FileRecord.name.ilike(f"%{file_name}%"))

        query = query.order_by(sqlalchemy.desc(FileRecord.updated_at))
        return query.paginate(
            page=args["page"],
            per_page=args["page_size"],
            error_out=False,
        )

    def batch_delete_files(self, file_ids):
        """批量删除文件的数据库记录和物理文件。

        删除文件在数据库中的记录，并恢复租户的存储空间使用量。
        同时删除物理文件，但会检查是否有其他记录使用相同的文件路径，避免误删。

        Args:
            file_ids: 要删除的文件 ID 列表。

        Returns:
            int: 删除的文件数量。
        """
        if not file_ids:
            return 0  # 或者抛出一个适当的异常

        # 先获取所有要删除的文件记录，以便删除物理文件
        files_to_delete = db.session.query(FileRecord).filter(FileRecord.id.in_(file_ids)).all()

        # 使用数据库查询来计算文件大小
        total_size = (
            db.session.query(sqlalchemy.func.sum(FileRecord.size))
            .filter(FileRecord.id.in_(file_ids))
            .scalar()
            or 0
        )
        # 恢复已使用的存储空间
        Tenant.restore_used_storage(self.current_tenant_id, total_size)

        # 删除物理文件（在删除数据库记录之前）
        for file_record in files_to_delete:
            file_path = file_record.file_path
            if file_path:
                # 检查是否有其他 FileRecord 使用相同的文件路径
                # 只检查当前租户的记录，且 tenant_id 不为空
                other_records = db.session.query(FileRecord).filter(
                    FileRecord.file_path == file_path,
                    FileRecord.id.notin_(file_ids),
                    FileRecord.tenant_id == self.current_tenant_id
                ).count()
                
                # 如果没有其他记录使用该文件，则删除物理文件
                if other_records == 0 and os.path.exists(file_path):
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path, ignore_errors=True)
                    except Exception as e:
                        # 记录错误但不中断删除流程
                        logging.warning(f"删除文件失败: {file_path}, 错误: {e}")

        # 使用批量删除数据库记录
        delete_stmt = sqlalchemy.delete(FileRecord).where(FileRecord.id.in_(file_ids))
        result = db.session.execute(delete_stmt)
        deleted_count = result.rowcount
        db.session.commit()
        return deleted_count

    @staticmethod
    def get_file_size_by_knowledge_base_id(knowledge_base_id):
        """获取知识库中的文件数量。

        Args:
            knowledge_base_id: 知识库 ID。

        Returns:
            int: 知识库中已使用的文件数量。
        """
        query = db.session.query(sqlalchemy.func.count(FileRecord.id)).filter_by(
            knowledge_base_id=knowledge_base_id, used=True
        )
        result = query.scalar()
        return result or 0
