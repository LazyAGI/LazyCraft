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

import sys

from flask import Response, current_app, got_request_exception
from flask_restful import Api, http_status_message
from werkzeug.datastructures import Headers
from werkzeug.exceptions import HTTPException


class HandleErrorApi(Api):
    """
    提供自定义的错误处理机制，统一处理各种异常并返回标准化的错误响应。
    """

    def make_response(self, data, *args, **kwargs):
        """重写 make_response 方法，确保 Response 对象不会被序列化为 JSON。
        
        当 data 是 Response 对象时，直接返回，不进行 JSON 序列化。
        """
        if isinstance(data, Response):
            return data
        return super().make_response(data, *args, **kwargs)

    def _create_error_data(self, code, message, status_code):
        """创建标准化的错误数据结构。

        Args:
            code: 错误代码
            message: 错误消息
            status_code: HTTP状态码

        Returns:
            dict: 标准化的错误数据
        """
        return {
            "code": code,
            "message": message,
            "status": status_code,
        }

    def _get_http_exception_data(self, e):
        """处理 HTTPException 类型的异常。

        Args:
            e: HTTPException 异常对象

        Returns:
            tuple: (data, status_code, headers) 或 None 如果已有响应
        """
        if e.response is not None:
            return None  # 直接返回已有响应

        status_code = e.code or 400
        message = getattr(e, "description", http_status_message(status_code))

        # 特殊处理 JSON 解码错误
        if (
            message
            == "Failed to decode JSON object: Expecting value: line 1 column 1 (char 0)"
        ):
            message = "Invalid JSON payload received or JSON payload is empty."

        data = self._create_error_data(type(e).__name__.lower(), message, status_code)

        headers = e.get_response().headers
        return data, status_code, headers

    def _get_value_error_data(self, e):
        """处理 ValueError 类型的异常。

        Args:
            e: ValueError 异常对象

        Returns:
            tuple: (data, status_code, headers)
        """
        status_code = 400
        data = self._create_error_data("normal_error", str(e), status_code)
        return data, status_code, Headers()

    def _get_server_error_data(self, e):
        """处理服务器错误类型的异常。

        Args:
            e: 异常对象

        Returns:
            tuple: (data, status_code, headers)
        """
        status_code = 500
        data = self._create_error_data(
            "server_error", http_status_message(status_code), status_code
        )
        return data, status_code, Headers()

    def _apply_custom_error_config(self, e, data, status_code):
        """应用自定义错误配置。

        Args:
            e: 异常对象
            data: 错误数据字典
            status_code: 当前状态码

        Returns:
            tuple: (updated_data, updated_status_code)
        """
        error_cls_name = type(e).__name__
        if error_cls_name not in self.errors:
            return data, status_code

        custom_data = self.errors.get(error_cls_name, {}).copy()
        updated_status_code = custom_data.get("status", status_code)

        if "message" in custom_data:
            custom_data["message"] = custom_data["message"].format(
                message=str(e.description if hasattr(e, "description") else e)
            )

        data.update(custom_data)
        return data, updated_status_code

    def _clean_response_headers(self, headers):
        """清理响应头，移除不需要的头部。

        Args:
            headers: 原始响应头

        Returns:
            Headers: 清理后的响应头
        """
        remove_headers = ("Content-Length",)
        for header in remove_headers:
            headers.pop(header, None)
        return headers

    def _create_specialized_response(self, data, status_code, headers):
        """根据状态码创建特殊化的响应。

        Args:
            data: 响应数据
            status_code: HTTP状态码
            headers: 响应头

        Returns:
            Flask Response: 创建的响应对象
        """
        if status_code == 406 and self.default_mediatype is None:
            # 处理 NotAcceptable (406) 错误
            supported_mediatypes = list(self.representations.keys())
            fallback_mediatype = (
                supported_mediatypes[0] if supported_mediatypes else "text/plain"
            )

            specialized_data = {
                "code": "not_acceptable",
                "message": data.get("message"),
            }
            return self.make_response(
                specialized_data,
                status_code,
                headers,
                fallback_mediatype=fallback_mediatype,
            )

        elif status_code == 400:
            # 处理参数错误
            if isinstance(data.get("message"), dict):
                param_key, param_value = list(data.get("message").items())[0]
                specialized_data = {
                    "code": "invalid_param",
                    "message": param_value,
                    "params": param_key,
                }
            else:
                specialized_data = data.copy()
                if "code" not in specialized_data:
                    specialized_data["code"] = "unknown"

            return self.make_response(specialized_data, status_code, headers)

        else:
            # 默认响应处理
            if "code" not in data:
                data["code"] = "unknown"
            return self.make_response(data, status_code, headers)

    def handle_error(self, e):
        """处理 API 异常并转换为标准化的 Flask 响应。

        将捕获的异常转换为带有适当 HTTP 状态码和响应体的 Flask 响应。
        支持处理 HTTPException、ValueError 和其他异常类型。

        Args:
            e: 捕获的异常对象。

        Returns:
            Flask Response: 包含错误信息的标准化响应，格式如下：
                           {
                               "code": "错误代码",
                               "message": "错误消息",
                               "status": HTTP状态码
                           }
        """
        got_request_exception.send(current_app, exception=e)

        # 根据异常类型获取初始数据
        if isinstance(e, HTTPException):
            result = self._get_http_exception_data(e)
            if result is None:  # 已有响应，直接返回
                return e.get_response()
            data, status_code, headers = result
        elif isinstance(e, ValueError):
            data, status_code, headers = self._get_value_error_data(e)
        else:
            data, status_code, headers = self._get_server_error_data(e)

        # 清理响应头
        headers = self._clean_response_headers(headers)

        # 使用异常对象的数据覆盖默认数据
        data = getattr(e, "data", data)

        # 应用自定义错误配置
        data, status_code = self._apply_custom_error_config(e, data, status_code)

        # 记录服务器错误日志
        if status_code and status_code >= 500:
            exc_info = sys.exc_info()
            if exc_info[1] is None:
                exc_info = None
            current_app.log_exception(exc_info)

        # 创建响应
        resp = self._create_specialized_response(data, status_code, headers)

        # 处理未授权响应
        if status_code == 401:
            resp = self.unauthorized(resp)

        return resp
