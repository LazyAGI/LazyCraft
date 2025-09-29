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

import mimetypes


def get_content_type(file_name):
    """根据文件名获取文件的 MIME 类型。

    Args:
        file_name (str): 文件名，包含扩展名

    Returns:
        str: 文件的 MIME 类型

    Note:
        如果无法通过 mimetypes 模块自动识别文件类型，会手动处理常见的文件扩展名
    """
    mime_type, _ = mimetypes.guess_type(file_name)

    # 如果无法通过 mimetypes 得到类型，可以手动添加处理
    if mime_type is None:
        # 手动处理常见文件类型（如应用程序二进制文件）
        extension = file_name.split(".")[-1].lower()
        if extension == "jpg" or extension == "jpeg":
            return "image/jpeg"
        elif extension == "png":
            return "image/png"
        elif extension == "gif":
            return "image/gif"
        elif extension == "txt":
            return "text/plain"
        elif extension == "html":
            return "text/html"
        elif extension == "json":
            return "application/json"
        elif extension == "xml":
            return "application/xml"
        else:
            return "application/octet-stream"  # 默认二进制流文件
    return mime_type
