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

import hashlib
import os
import shutil
import uuid
import zipfile
from urllib.parse import unquote

import chardet

UPLOAD_BASE_PATH = os.environ.get("UPLOAD_BASE_PATH", "/app/upload")
CONSOLE_WEB_URL = os.environ.get("WEB_CONSOLE_ENDPOINT", "")


class FileTools:
    """文件处理工具类。

    提供各种文件操作的静态方法，包括文件哈希计算、压缩包解压、
    文件大小获取、路径处理、存储目录创建等功能。
    """

    @staticmethod
    def calculate_md5(file_path):
        """计算文件的 MD5 哈希值。

        逐块读取文件内容并计算 MD5 哈希值，适用于大文件处理。

        Args:
            file_path (str): 文件路径。

        Returns:
            str: 文件的 MD5 哈希值（十六进制字符串）。
        """
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @staticmethod
    def extract_zip(zip_path, extract_to):
        """解压 ZIP 文件。

        解压 ZIP 文件到指定目录，支持中文文件名的编码处理。
        尝试使用 GBK 和 UTF-8 编码处理文件名。

        Args:
            zip_path (str): ZIP 文件路径。
            extract_to (str): 解压目标目录。
        """
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for file_info in zip_ref.infolist():
                try:
                    file_info.filename = file_info.filename.encode("cp437").decode(
                        "gbk"
                    )
                except Exception:
                    file_info.filename = file_info.filename.encode("cp437").decode(
                        "utf-8"
                    )

                zip_ref.extract(file_info, extract_to)

    @staticmethod
    def get_file_size(file):
        """获取文件对象的大小。

        通过移动文件指针到末尾来获取文件大小，然后重置指针到开头。

        Args:
            file: 文件对象（类似 file-like object）。

        Returns:
            int: 文件大小（字节）。
        """
        file.seek(0, 2)  # 移动到文件末尾
        size = file.tell()  # 获取当前位置，即文件大小
        file.seek(0)  # 重置文件指针到开头
        return size

    @staticmethod
    def get_file_path_size(file_path_list):
        """获取文件路径列表的总大小。

        计算文件路径列表中所有文件的总大小。

        Args:
            file_path_list (list): 文件路径列表。

        Returns:
            int: 所有文件的总大小（字节），如果出错返回 0。
        """
        size = 0
        try:
            if not file_path_list:
                return size
            for file_path in file_path_list:
                size += os.path.getsize(file_path)
        except Exception:
            size = 0
        return size

    @staticmethod
    def get_dir_path_size(dir_path):
        """获取目录的总大小。

        递归计算目录中所有文件的总大小。

        Args:
            dir_path (str): 目录路径。

        Returns:
            int: 目录总大小（字节），如果出错返回 0。
        """
        size = 0
        try:
            for root, dirs, files in os.walk(dir_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    size += os.path.getsize(file_path)
        except Exception:
            size = 0
        return size

    @staticmethod
    def get_filename(file):
        """获取并解码文件名。

        从文件对象中获取文件名并进行 URL 解码。

        Args:
            file: 文件对象，需要有 filename 属性。

        Returns:
            str: 解码后的文件名。
        """
        filename = file.filename
        if filename:
            filename = unquote(filename)  # 解码文件名
        return filename

    @staticmethod
    def random_filename(file):
        """生成随机文件名。

        保持原文件的扩展名，但将文件名替换为随机的 UUID。

        Args:
            file: 文件对象，需要有 filename 属性。

        Returns:
            str: 随机生成的文件名（保持原扩展名）。
        """
        filename = file.filename
        ext = os.path.splitext(filename)[-1]
        return f"{uuid.uuid4().hex}{ext}"

    @staticmethod
    def parse_path_to_url(filepath):
        """将绝对路径转换为 URL。

        将本地文件路径转换为 Web 可访问的 URL 地址。

        Args:
            filepath (str): 本地文件路径。

        Returns:
            str: 转换后的 URL 地址，如果已经是 URL 则直接返回。
        """
        if filepath.startswith("http") or filepath.startswith("/static"):  # is url
            return filepath
        base_path = UPLOAD_BASE_PATH
        if filepath.startswith(base_path):
            return CONSOLE_WEB_URL + filepath.replace(base_path, "/static/upload", 1)
        else:
            return filepath

    @staticmethod
    def parse_lazyllm_path_to_url(filepath):
        """将 LazyLLM 生成的文件地址转换为 URL。

        处理 LazyLLM 框架生成的文件路径，复制文件到临时目录并返回新路径。

        Args:
            filepath (str): LazyLLM 生成的文件路径。

        Returns:
            str: 转换后的文件路径，如果已经是 URL 则直接返回。
        """
        if filepath.startswith("http") or filepath.startswith("/static"):  # is url
            return filepath
        if os.path.exists(filepath):
            ext = os.path.splitext(filepath)[-1]
            new_filepath = FileTools.create_temp_file(
                "0", "lazyllm_files", ext
            )  # 这里只是一个名字,并没有文件
            shutil.copy(filepath, new_filepath)  # 只复制,不干扰lazyllm原来的的文件处理
            # return FileTools.parse_path_to_url(new_filepath)
            return new_filepath
        else:
            return filepath

    @staticmethod
    def create_storage_dir(path_name, user_id, *args, **kwargs):
        """创建存储目录。

        生成标准化的存储路径格式：/app/upload/{path_name}/user_id/args[0]/args[1]/...
        如果没有提供额外参数，则生成随机目录名以防止文件名冲突。

        Args:
            path_name (str): 路径类型名称，支持以下类型：
                - temp: 临时文件
                - icons: 图片文件
                - knowledge: 知识库文件
                - models_hub: 模型文件
                - tools: 工具文件
                - data: 数据文件
                - script: 脚本文件
            user_id: 用户 ID。
            *args: 额外的路径组件。
            **kwargs: 关键字参数，支持 base_path 自定义基础路径。

        Returns:
            str: 创建的目录路径。
        """
        if kwargs is not None and "base_path" in kwargs:
            base_path = kwargs.get("base_path")
        else:
            base_path = UPLOAD_BASE_PATH

        path = os.path.join(base_path, path_name)
        if user_id:
            path = os.path.join(path, str(user_id))

        if len(args) > 0:
            assert all([isinstance(x, str) for x in args])  # 所有的args参数都是str类型
            path = os.path.join(path, *args)
        else:
            path = os.path.join(path, str(uuid.uuid4()))

        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)
        return path

    @staticmethod
    def create_temp_file(user_id, folder, ext):
        """创建临时文件路径。

        在临时存储目录中创建唯一的文件路径。

        Args:
            user_id: 用户 ID。
            folder (str): 文件夹名称。
            ext (str): 文件扩展名（包含点号）。

        Returns:
            str: 临时文件的完整路径。
        """
        dirname = FileTools.create_temp_storage(user_id, folder)
        filename = f"{uuid.uuid4().hex}{ext}"
        return os.path.join(dirname, filename)

    @staticmethod
    def create_temp_storage(user_id, *args, **kwargs):
        """创建临时文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。
            **kwargs: 关键字参数。

        Returns:
            str: 临时存储目录路径。
        """
        return FileTools.create_storage_dir("temp", user_id, *args, **kwargs)

    @staticmethod
    def create_icons_storage(user_id, *args):
        """创建图标文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。

        Returns:
            str: 图标存储目录路径。
        """
        return FileTools.create_storage_dir("icons", user_id, *args)

    @staticmethod
    def create_knowledge_storage(user_id, *args):
        """创建知识库文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。

        Returns:
            str: 知识库存储目录路径。
        """
        return FileTools.create_storage_dir("knowledge", user_id, *args)

    @staticmethod
    def create_model_storage(user_id, *args, **kwargs):
        """创建模型文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。
            **kwargs: 关键字参数。

        Returns:
            str: 模型存储目录路径。
        """
        return FileTools.create_storage_dir("models_hub", user_id, *args, **kwargs)

    @staticmethod
    def create_data_storage(user_id, *args):
        """创建数据文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。

        Returns:
            str: 数据存储目录路径。
        """
        return FileTools.create_storage_dir("data", user_id, *args)

    @staticmethod
    def create_script_storage(user_id, *args):
        """创建脚本文件存储目录。

        Args:
            user_id: 用户 ID。
            *args: 额外的路径组件。

        Returns:
            str: 脚本存储目录路径。
        """
        return FileTools.create_storage_dir("script", user_id, *args)

    @staticmethod
    def get_file_encoding(file_path):
        """检测文件编码。

        使用 chardet 库检测文件的字符编码，适用于文本文件的编码识别。

        Args:
            file_path (str): 文件路径。

        Returns:
            str: 检测到的编码格式，默认返回 "utf-8"。
        """
        try:
            file_size = os.path.getsize(file_path)
            with open(file_path, "rb") as file:
                # 只读取文件的一部分来检测编码
                raw_data = file.read(min(1024 * 1024, file_size))
                if not raw_data:
                    return "utf-8"

                # 使用 chardet 检测编码
                result = chardet.detect(raw_data)
                encoding = result["encoding"]

                # 检查编码是否为 None 或置信度是否过低
                if encoding is None or result["confidence"] < 0.7:
                    return "utf-8"

                return encoding
        except Exception as e:
            print(f"Error detecting encoding: {str(e)}")
            return "utf-8"
