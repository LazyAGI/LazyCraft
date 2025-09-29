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

from abc import ABC, abstractmethod
from collections.abc import Generator

from flask import Flask


class AbstractStorage(ABC):
    """文件存储的抽象基类接口。

    定义了所有存储实现必须遵循的接口规范，包括文件的保存、加载、下载、
    检查存在性和删除等基本操作。所有具体的存储实现都必须继承此类并
    实现所有抽象方法。

    Attributes:
        app (Flask): Flask 应用实例。
    """

    app = None

    def __init__(self, app: Flask):
        """初始化存储基类。

        Args:
            app (Flask): Flask 应用实例，包含存储相关的配置信息。
        """
        self.app = app

    @abstractmethod
    def save(self, filename, data):
        """保存数据到存储服务。

        将给定的数据以指定文件名保存到存储服务中。

        Args:
            filename: 要保存的文件名。
            data: 要保存的数据内容。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError

    @abstractmethod
    def load_once(self, filename: str) -> bytes:
        """一次性加载文件的全部内容。

        从存储服务中一次性读取指定文件的全部数据，适用于小文件。

        Args:
            filename (str): 要加载的文件名。

        Returns:
            bytes: 文件的二进制数据。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError

    @abstractmethod
    def load_stream(self, filename: str) -> Generator:
        """以流的方式加载文件内容。

        从存储服务中以流的方式逐块读取指定文件的数据，适用于大文件。

        Args:
            filename (str): 要加载的文件名。

        Returns:
            Generator: 用于逐块读取文件数据的生成器。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError

    @abstractmethod
    def download(self, filename, target_filepath):
        """下载文件到本地指定路径。

        将存储服务中的文件下载到本地文件系统的指定路径。

        Args:
            filename: 存储服务中的文件名。
            target_filepath: 本地目标文件的完整路径。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError

    @abstractmethod
    def exists(self, filename):
        """检查文件是否存在于存储服务中。

        检查指定的文件是否在存储服务中存在。

        Args:
            filename: 要检查的文件名。

        Returns:
            bool: 文件存在返回 True，否则返回 False。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError

    @abstractmethod
    def delete(self, filename):
        """从存储服务中删除文件。

        从存储服务中删除指定的文件。

        Args:
            filename: 要删除的文件名。

        Returns:
            bool: 删除成功返回 True，否则返回 False。

        Raises:
            NotImplementedError: 子类必须实现此方法。
        """
        raise NotImplementedError
