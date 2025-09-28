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
import os
import urllib.parse

from flask import jsonify, request, send_file
from flask_login import current_user
from flask_restful import Resource, marshal, reqparse

from libs.login import login_required
from parts.urls import api

from . import fields
from .data_reflux_service import (DataRefluxService, create_reflux_data,
                                  update_reflux_data,
                                  update_reflux_data_feedback)


class RefluxAppPublishApi(Resource):
    """应用发布回流API，用于处理应用发布时的数据回流。

    Args:
        app_msg (dict): 应用消息数据。
        node_msgs (list): 节点消息数据列表。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    @login_required
    def post(self):
        """发布应用回流数据。

        Args:
            通过JSON请求体传递参数：
                app_msg (dict): 应用消息数据。
                node_msgs (list): 节点消息数据列表。

        Returns:
            tuple: (响应数据, HTTP状态码)

        Raises:
            ValueError: 当缺少必要参数时抛出异常。
        """
        request_data = request.get_json()
        app_msg = request_data.get("app_msg")
        node_msgs = request_data.get("node_msgs")

        if not app_msg or not node_msgs:
            return (
                jsonify({"error": "Missing app_msg or node_msgs in the request"}),
                400,
            )
        service = DataRefluxService(current_user)
        service.app_publish(app_msg, node_msgs)
        return {"code": 200, "message": "success"}, 200


class RefluxDataCreateApi(Resource):
    """回流数据创建API。

    Args:
        data (dict): 回流数据。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    @login_required
    def post(self):
        """创建回流数据。

        Args:
            通过JSON请求体传递参数：
                data (dict): 回流数据。

        Returns:
            tuple: (响应数据, HTTP状态码)
        """
        request_data = request.get_json()
        data = request_data.get("data")

        create_reflux_data(data)

        return {"code": 200, "message": "success"}, 200


class RefluxDataUpdateFeedbackApi(Resource):
    """回流数据反馈更新API。

    Args:
        data (dict): 反馈数据。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    # @login_required
    def post(self):
        """更新回流数据反馈。

        Args:
            通过JSON请求体传递参数：
                data (dict): 反馈数据。

        Returns:
            tuple: (响应数据, HTTP状态码)
        """
        request_data = request.get_json()
        data = request_data.get("data")
        update_reflux_data_feedback(data)
        return {"code": 200, "message": "success"}, 200


class RefluxDataSetVersionPublishApi(Resource):
    """数据集版本发布回流API。

    Args:
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 数据集版本信息。
    """

    @login_required
    def post(self):
        """发布数据集版本回流数据。

        Args:
            通过JSON请求体传递参数：
                data_set_version_id (str): 数据集版本ID。

        Returns:
            dict: 数据集版本信息。

        Raises:
            ValueError: 当数据集版本ID为空时抛出异常。
        """
        data = request.get_json()
        if data["data_set_version_id"] is None or data["data_set_version_id"] == "":
            raise ValueError("输入的参数格式有误")
        data_set_version_instance = DataRefluxService(
            current_user
        ).publish_data_set_version(data["data_set_version_id"])

        return marshal(data_set_version_instance, fields.data_set_version_field)


class RefluxDataListApi(Resource):
    """回流数据分页API。

    Args:
        page (int): 页码，默认为1。
        page_size (int): 每页大小，默认为20。
        data_set_version_id (str): 数据集版本ID。

    Returns:
        dict: 分页结果。
    """

    @login_required
    def get(self):
        """获取回流数据分页列表。

        Args:
            通过查询参数传递：
                page (int, optional): 页码，默认为1。
                page_size (int, optional): 每页大小，默认为20。
                data_set_version_id (str, optional): 数据集版本ID。

        Returns:
            dict: 分页结果，包含回流数据列表和分页信息。
        """
        parser = reqparse.RequestParser()
        parser.add_argument("page", type=int, default=1, location="args")
        parser.add_argument("page_size", type=int, default=20, location="args")
        parser.add_argument(
            "data_set_version_id", type=str, default="", location="args"
        )
        args = parser.parse_args()

        pagination = DataRefluxService(current_user).page_reflux_data_by_version_id(
            args
        )
        return marshal(pagination, fields.reflux_data_pagination)


class RefluxDataDeleteApi(Resource):
    """回流数据删除API。

    Args:
        reflux_data_ids (list): 要删除的回流数据ID列表。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    @login_required
    def post(self):
        """删除回流数据。

        Args:
            通过JSON请求体传递参数：
                reflux_data_ids (list): 要删除的回流数据ID列表。

        Returns:
            tuple: (响应数据, HTTP状态码)

        Raises:
            ValueError: 当回流数据ID列表为空时抛出异常。
        """
        data = request.get_json()
        reflux_data_ids = data.get("reflux_data_ids", [])
        if not reflux_data_ids or len(reflux_data_ids) == 0:
            raise ValueError("reflux_data_ids 不能为空")
        service = DataRefluxService(current_user)
        service.delete_reflux_data_by_ids(reflux_data_ids)
        return {"message": "success", "code": 200}, 200


class RefluxDataDetailApi(Resource):
    """查询回流数据详情API。

    Args:
        reflux_data_id (str): 回流数据ID。

    Returns:
        dict: 回流数据详情。
    """

    @login_required
    def get(self):
        """获取回流数据详情。

        Args:
            通过查询参数传递：
                reflux_data_id (str): 回流数据ID。

        Returns:
            dict: 回流数据详情，包含内容和ID。

        Raises:
            ValueError: 当回流数据ID为空时抛出异常。
        """
        reflux_data_id = request.args.get("reflux_data_id", default="", type=str)
        if not reflux_data_id:
            raise ValueError("reflux_data_id 不能为空")

        reflux_data_json = DataRefluxService(current_user).get_reflux_data_by_id(
            reflux_data_id
        )
        # 拼接前端json
        res = {"content": reflux_data_json, "id": reflux_data_id}
        return {"message": res, "code": 200}, 200


class RefluxDataUpdateApi(Resource):
    """修改回流数据API。

    Args:
        reflux_data_id (str): 回流数据ID。
        content (str): 更新内容。

    Returns:
        tuple: (响应数据, HTTP状态码)
    """

    @login_required
    def post(self):
        """修改回流数据。

        Args:
            通过JSON请求体传递参数：
                reflux_data_id (str): 回流数据ID。
                content (str): 更新内容。

        Returns:
            tuple: (响应数据, HTTP状态码)

        Raises:
            ValueError: 当回流数据ID或内容为空时抛出异常。
        """
        data = request.get_json()
        if data["reflux_data_id"] is None or data["reflux_data_id"] == "":
            raise ValueError("reflux_data_id 不能为空")
        if data["content"] is None or data["content"] == "":
            raise ValueError("content 不能为空")
        update_reflux_data(data.get("reflux_data_id"), data.get("content"))
        return {"message": "success", "code": 200}, 200


class RefluxDataSetVersionExport(Resource):
    """数据集版本导出API。

    Args:
        data_set_version_ids (list): 数据集版本ID列表。

    Returns:
        Response: 文件下载响应。
    """

    @login_required
    def post(self):
        """导出数据集版本。

        Args:
            通过JSON请求体传递参数：
                data_set_version_ids (list): 数据集版本ID列表。

        Returns:
            Response: 文件下载响应。

        Raises:
            ValueError: 当数据集版本ID列表为空时抛出异常。
            Exception: 当导出失败时抛出异常。
        """
        data = request.get_json()
        data_set_version_ids = data.get("data_set_version_ids", [])

        if not data_set_version_ids:
            raise ValueError("输入的参数有误")
        service = DataRefluxService(current_user)
        try:
            combined_zip_filename = service.create_combined_zip(data_set_version_ids)
            encoded_filename = urllib.parse.quote(combined_zip_filename)
            response = send_file(
                combined_zip_filename,
                as_attachment=True,
                download_name=encoded_filename,
            )
            os.remove(combined_zip_filename)
            return response
        except Exception as e:
            return jsonify({"error": str(e)}), 500


class RefluxDataSetVersionExportForFT(Resource):
    """数据集版本导出API（用于微调）。

    Args:
        filename (str): 数据集文件名。

    Returns:
        Response: 文件下载响应。
    """

    # @login_required
    def get(self):
        """导出数据集版本（用于微调）。

        Args:
            通过查询参数传递：
                filename (str): 数据集文件名。

        Returns:
            Response: 文件下载响应。

        Raises:
            ValueError: 当文件名为空或文件不存在时抛出异常。
            Exception: 当导出失败时抛出异常。
        """
        dataset_filename = request.args.get("filename", default="", type=str)
        if not dataset_filename:
            raise ValueError("输入的参数有误")

        if not os.path.exists(dataset_filename):
            raise ValueError(f"文件 {dataset_filename} 不存在")

        try:
            mime_type, _ = mimetypes.guess_type(dataset_filename)
            if mime_type is None:
                mime_type = "application/octet-stream"  # 默认二进制流

            download_name = os.path.basename(dataset_filename)

            response = send_file(
                dataset_filename,
                as_attachment=True,
                download_name=download_name,
                mimetype=mime_type,
            )

            os.remove(dataset_filename)
            return response
        except Exception as e:
            if os.path.exists(dataset_filename):
                os.remove(dataset_filename)
            return jsonify({"error": str(e)}), 500


api.add_resource(RefluxAppPublishApi, "/data/reflux/app/publish")
api.add_resource(RefluxDataCreateApi, "/data/reflux/create")
api.add_resource(RefluxDataUpdateFeedbackApi, "/data/reflux/feedback/update")

# 暂时不使用。
api.add_resource(RefluxDataSetVersionPublishApi, "/data/reflux/version/publish")
api.add_resource(RefluxDataListApi, "/data/reflux/list")
api.add_resource(RefluxDataDetailApi, "/data/reflux/detail")
api.add_resource(RefluxDataDeleteApi, "/data/reflux/delete")
api.add_resource(RefluxDataUpdateApi, "/data/reflux/update")
api.add_resource(RefluxDataSetVersionExport, "/data/reflux/version/export")
api.add_resource(RefluxDataSetVersionExportForFT, "/data/reflux/version/export/ft")
