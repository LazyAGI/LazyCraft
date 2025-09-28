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

import os
import shutil
from collections.abc import Generator

from flask import Flask

from utils.storage.abstract_storage import AbstractStorage


class LocalStorage(AbstractStorage):
    """本地文件系统存储实现。

    将文件存储在本地文件系统中。根据环境变量 STORAGE_LOCAL_PATH
    配置存储目录，支持相对路径和绝对路径。提供文件的基本增删改查操作。

    Attributes:
        folder (str): 本地存储目录的完整路径。
    """

    def __init__(self, app: Flask):
        """初始化本地存储。

        根据环境变量 STORAGE_LOCAL_PATH 设置存储目录。如果是相对路径，
        会相对于应用根目录的父目录进行解析。

        Args:
            app (Flask): Flask 应用实例。
        """
        super().__init__(app)
        folder = os.getenv("STORAGE_LOCAL_PATH")
        if not os.path.isabs(folder):
            # folder = os.path.join(app.root_path, folder)
            folder = os.path.join(
                os.path.dirname(app.root_path), folder
            )  # 改为 /app/storage 目录，而非 /app/src/storage
        self.folder = folder

    def save(self, filename, data):
        """保存数据到本地文件。

        将数据保存到本地文件系统的指定路径。如果目录不存在会自动创建。

        Args:
            filename: 相对于存储目录的文件名。
            data: 要保存的二进制数据。
        """
        if not self.folder or self.folder.endswith("/"):
            filename = self.folder + filename
        else:
            filename = self.folder + "/" + filename

        folder = os.path.dirname(filename)
        os.makedirs(folder, exist_ok=True)

        with open(os.path.join(os.getcwd(), filename), "wb") as f:
            f.write(data)

    def load_once(self, filename: str) -> bytes:
        """一次性加载本地文件的全部内容。

        从本地文件系统中读取指定文件的全部数据。

        Args:
            filename (str): 相对于存储目录的文件名。

        Returns:
            bytes: 文件的二进制数据。

        Raises:
            FileNotFoundError: 当文件不存在时抛出。
        """
        if not self.folder or self.folder.endswith("/"):
            filename = self.folder + filename
        else:
            filename = self.folder + "/" + filename

        if not os.path.exists(filename):
            raise FileNotFoundError("File not found")

        with open(filename, "rb") as f:
            data = f.read()

        return data

    def load_stream(self, filename: str) -> Generator:
        """以流的方式加载本地文件内容。

        从本地文件系统中以 4KB 的块大小逐块读取文件数据。

        Args:
            filename (str): 相对于存储目录的文件名。

        Returns:
            Generator: 用于逐块读取文件数据的生成器，每块大小为 4KB。

        Raises:
            FileNotFoundError: 当文件不存在时抛出。
        """

        def generate(filename: str = filename) -> Generator:
            if not self.folder or self.folder.endswith("/"):
                filename = self.folder + filename
            else:
                filename = self.folder + "/" + filename

            if not os.path.exists(filename):
                raise FileNotFoundError("File not found")

            with open(filename, "rb") as f:
                while chunk := f.read(4096):  # Read in chunks of 4KB
                    yield chunk

        return generate()

    def download(self, filename, target_filepath):
        """将本地存储的文件复制到指定路径。

        将存储目录中的文件复制到目标路径。

        Args:
            filename: 相对于存储目录的源文件名。
            target_filepath: 目标文件的完整路径。

        Raises:
            FileNotFoundError: 当源文件不存在时抛出。
        """
        if not self.folder or self.folder.endswith("/"):
            filename = self.folder + filename
        else:
            filename = self.folder + "/" + filename

        if not os.path.exists(filename):
            raise FileNotFoundError("File not found")

        shutil.copyfile(filename, target_filepath)

    def exists(self, filename):
        """检查本地文件是否存在。

        检查存储目录中的指定文件是否存在。

        Args:
            filename: 相对于存储目录的文件名。

        Returns:
            bool: 文件存在返回 True，否则返回 False。
        """
        if not self.folder or self.folder.endswith("/"):
            filename = self.folder + filename
        else:
            filename = self.folder + "/" + filename

        return os.path.exists(filename)

    def delete(self, filename):
        """删除本地文件。

        从本地文件系统中删除指定的文件。如果文件不存在，不会抛出异常。

        Args:
            filename: 相对于存储目录的文件名。
        """
        if not self.folder or self.folder.endswith("/"):
            filename = self.folder + filename
        else:
            filename = self.folder + "/" + filename
        if os.path.exists(filename):
            os.remove(filename)
