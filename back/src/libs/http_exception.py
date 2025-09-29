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

from typing import Optional

from werkzeug.exceptions import HTTPException


class BaseHTTPError(HTTPException):
    """基础 HTTP 异常类。

    继承自 Werkzeug 的 HTTPException，提供标准化的错误响应格式。
    包含错误代码、消息和状态码等信息。

    Attributes:
        error_code (str): 错误代码标识符。
        data (Optional[dict]): 错误响应数据。
    """

    error_code: str = "unknown"
    data: Optional[dict] = None

    def __init__(self, description=None, response=None):
        """初始化基础 HTTP 异常。

        创建标准化的错误响应数据结构。

        Args:
            description: 错误描述信息。
            response: HTTP 响应对象。
        """
        super().__init__(description, response)

        self.data = {
            "code": self.error_code,
            "message": self.description,
            "status": self.code,
        }


class CommonError(BaseHTTPError):
    """通用错误异常。

    用于表示一般性的业务逻辑错误，HTTP 状态码为 400。
    """

    error_code = "normal_error"
    code = 400
