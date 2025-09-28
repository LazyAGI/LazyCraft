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
from collections.abc import Generator
from importlib import import_module
from typing import Union

from flask import Flask


class Storage:
    """存储管理器类，用于处理不同类型的存储服务。

    仅支持本地存储，可以根据自己需求扩展。根据环境变量 STORAGE_TYPE 的值
    自动选择相应的存储实现。
    """

    def __init__(self):
        """初始化存储管理器。

        创建 Storage 实例，storage_runner 初始化为 None，
        将在 init_app 方法中根据配置选择具体的存储实现。
        """
        self.storage_runner = None

    def init_app(self, app: Flask):
        """初始化存储应用配置。

        根据环境变量 STORAGE_TYPE 的值选择并初始化相应的存储服务。
        支持的存储类型默认使用本地存储。

        Args:
            app (Flask): Flask 应用实例，包含存储服务的配置信息。
        """
        storage_type = os.getenv("STORAGE_TYPE")

        storage_mapping = {
             
        }
        default_module, default_class = (
            "utils.storage.local_storage",
            "LocalStorage",
        )
        module_name, class_name = storage_mapping.get(
            storage_type, (default_module, default_class)
        )

        storage_module = import_module(module_name)
        storage_class = getattr(storage_module, class_name)
        self.storage_runner = storage_class(app=app)

    def save(self, filename, data):
        """保存数据到存储服务。

        将指定的数据保存到存储服务中，使用给定的文件名。

        Args:
            filename: 要保存的文件名。
            data: 要保存的数据内容。
        """
        self.storage_runner.save(filename, data)

    def load(self, filename: str, stream: bool = False) -> Union[bytes, Generator]:
        """从存储服务加载数据。

        根据 stream 参数决定是一次性加载还是流式加载数据。

        Args:
            filename (str): 要加载的文件名。
            stream (bool, optional): 是否使用流式加载。默认为 False。

        Returns:
            Union[bytes, Generator]: 如果 stream=False 返回字节数据，
                                   如果 stream=True 返回生成器对象。
        """
        if stream:
            return self.load_stream(filename)
        else:
            return self.load_once(filename)

    def load_once(self, filename: str) -> bytes:
        """一次性加载文件数据。

        从存储服务中一次性加载指定文件的全部内容。

        Args:
            filename (str): 要加载的文件名。

        Returns:
            bytes: 文件的字节数据。
        """
        return self.storage_runner.load_once(filename)

    def load_stream(self, filename: str) -> Generator:
        """流式加载文件数据。

        从存储服务中以流的方式加载指定文件，适用于大文件处理。

        Args:
            filename (str): 要加载的文件名。

        Returns:
            Generator: 用于逐块读取文件数据的生成器。
        """
        return self.storage_runner.load_stream(filename)

    def download(self, filename, target_filepath):
        """下载文件到本地路径。

        将存储服务中的文件下载到指定的本地文件路径。

        Args:
            filename: 存储服务中的文件名。
            target_filepath: 本地目标文件路径。
        """
        self.storage_runner.download(filename, target_filepath)

    def exists(self, filename):
        """检查文件是否存在。

        检查指定的文件是否在存储服务中存在。

        Args:
            filename: 要检查的文件名。

        Returns:
            bool: 文件存在返回 True，否则返回 False。
        """
        return self.storage_runner.exists(filename)

    def delete(self, filename):
        """删除存储服务中的文件。

        从存储服务中删除指定的文件。

        Args:
            filename: 要删除的文件名。

        Returns:
            bool: 删除成功返回 True，否则返回 False。
        """
        return self.storage_runner.delete(filename)


storage = Storage()


def init_app(app: Flask):
    """初始化存储服务。

    这是一个便捷函数，用于初始化全局存储实例。

    Args:
        app (Flask): Flask 应用实例。
    """
    storage.init_app(app)
