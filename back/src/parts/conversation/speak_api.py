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

import json
import logging
import uuid
from collections import OrderedDict

from flask import Response, request, stream_with_context
from flask_restful import inputs, marshal, reqparse
from sqlalchemy.sql import func

from lazyllm.engine import LightEngine

import parts.data.data_reflux_service as reflux
from core.restful import Resource as OldResource
from libs.passport import PassportService
from parts.app.app_service import AppService
from parts.app.node_run.app_run_service import AppRunService, EventHandler
from parts.urls import api
from utils.util_database import db

from . import fields
from .model import Conversation


class Resource(OldResource):
    """基础资源类。

    提供用户身份验证的基础功能。
    """

    def get_user(self):
        """获取用户信息。

        这里的用户可能是用户体系中的用户，也可能是随机生成的游客账号。

        Returns:
            str: 用户ID

        Raises:
            Exception: 当获取用户信息失败时抛出
        """
        temp_token = request.headers.get("TempToken", "")
        if not temp_token:
            temp_token = request.headers.get("Authorization", "")
        decoded = PassportService().verify(temp_token, options={"verify_exp": False})
        user_id = decoded.get("user_id")
        return user_id


class SpeakInitApi(Resource):
    """对话初始化API。

    用于初始化用户身份和获取认证令牌。
    """

    def get(self, app_id):
        """换取用户信息。

        Args:
            app_id (str): 应用ID

        Returns:
            dict: 包含认证令牌的字典

        Raises:
            Exception: 当初始化失败时抛出
        """
        app_id = str(app_id)

        auth_token = request.headers.get("TempToken", "")
        if auth_token:
            return {"token": auth_token}

        auth_token = request.args.get("_token")
        if auth_token:
            return {"token": auth_token}

        user_id = str(uuid.uuid4())
        auth_token = PassportService().issue({"user_id": user_id})
        return {"token": auth_token}


class SpeakSessionsApi(Resource):
    """会话列表API。

    用于获取用户的对话会话列表。
    """

    def get(self, app_id):
        """获取会话列表。

        Args:
            app_id (str): 应用ID

        Returns:
            dict: 包含会话列表的字典

        Raises:
            Exception: 当获取会话列表失败时抛出
        """
        app_id = str(app_id)
        from_who = self.get_user()
        queryset = (
            db.session.query(Conversation.sessionid, func.count(Conversation.sessionid))
            .filter(Conversation.app_id == app_id)
            .filter(Conversation.from_who == from_who)
            .group_by(Conversation.sessionid)
            .all()
        )

        data_list = []
        for sessionid, count in queryset:
            instance = (
                Conversation.query.filter(Conversation.sessionid == sessionid)
                .order_by(Conversation.id)
                .first()
            )
            if instance:
                title = instance.content[:100]
                data_list.append(
                    {"sessionid": sessionid, "title": title, "order": instance.id}
                )

        data_list = sorted(data_list, key=lambda x: -x["order"])
        return {"data": data_list}


class SpeakHistoryApi(Resource):
    """会话历史API。

    用于获取特定会话的历史对话记录。
    """

    def get(self, app_id):
        """获取某个会话的历史记录。

        Args:
            app_id (str): 应用ID
            sessionid (str, required): 会话ID
            start_id (int, optional): 起始消息ID

        Returns:
            dict: 包含历史记录的字典

        Raises:
            Exception: 当获取历史记录失败时抛出
        """
        app_id = str(app_id)
        parser = reqparse.RequestParser()
        parser.add_argument("sessionid", type=str, location="args")
        parser.add_argument("start_id", type=int, location="args", required=False)
        args = parser.parse_args()

        self.get_user()  # 检查用户权限

        queryset = Conversation.query.filter_by(sessionid=args["sessionid"])
        if args.get("start_id") is not None:
            queryset = queryset.filter(Conversation.id > args["start_id"])
        queryset = queryset.order_by(Conversation.id.asc()).limit(1000)

        data_list = [marshal(item, fields.speak_fields) for item in queryset]
        return {"data": data_list}


class SpeakToAppApi(Resource):
    """应用对话API。

    用于与应用程序进行对话交互。
    """

    def post(self, app_id):
        """跟app对话。

        Args:
            app_id (str): 应用ID
            sessionid (str, required): 会话ID
            inputs (list, required): 输入内容列表
            files (list, optional): 文件列表
            mode (str, optional): 运行模式，默认为publish

        Returns:
            Response: SSE流式响应

        Raises:
            ValueError: 当应用服务关闭时抛出
        """
        app_id = str(app_id)
        parser = reqparse.RequestParser()
        parser.add_argument("sessionid", type=str, required=True, location="json")
        parser.add_argument("inputs", type=list, required=True, location="json")
        # parser.add_argument('turn_number', type=int, required=True, location='json')
        parser.add_argument(
            "files", type=list, required=False, nullable=True, location="json"
        )
        parser.add_argument(
            "mode", type=str, required=False, default="publish", location="json"
        )
        args = parser.parse_args()

        app_model = AppService().get_app(app_id)
        if app_model.enable_api:
            gid = f"publish-{app_model.id}"
            if not LightEngine().build_node(gid):
                app_model.enable_api = False
                db.session.commit()
                raise ValueError("应用已经关闭服务")
        else:
            gid = f"draft-{app_model.id}"
            if not LightEngine().build_node(gid):
                app_model.enable_api = False
                db.session.commit()
                raise ValueError("应用已经关闭服务")

        from_who = self.get_user()
        from_machine = "lazyllm"
        sessionid = args["sessionid"]
        content = args["inputs"][0]
        files_list = args.get("files") or []

        last_instance = (
            Conversation.query.filter_by(sessionid=sessionid)
            .order_by(Conversation.id.desc())
            .first()
        )
        turn_number = (last_instance.turn_number + 1) if last_instance else 1

        Conversation.create_new(
            app_id, sessionid, from_who, content, turn_number, files_list
        )

        # 构建历史记录
        history_dict = OrderedDict()
        queryset = Conversation.query.filter_by(sessionid=sessionid).order_by(
            Conversation.created_at.asc()
        )
        for item in queryset:
            if item.turn_number not in history_dict:
                history_dict[item.turn_number] = [None, None]
            if item.from_who != from_machine:
                history_dict[item.turn_number][0] = item.content
            else:
                history_dict[item.turn_number][1] = item.content

        history_list = []
        for key, value in history_dict.items():
            if value[0] and value[1]:
                history_list.append(value)

        app_run = AppRunService.create(app_model, mode=args["mode"])

        def generate():
            event_handler: EventHandler = yield from app_run.run_stream(
                args["inputs"],
                files_list,
                history_list,
                track_id=sessionid,
                turn_number=turn_number,
            )

            output_str = ""
            output_urls = []

            if event_handler.is_success():
                output_data = app_run.parse_media(event_handler.get_run_result())
                if isinstance(output_data, dict):
                    output_str = output_data.get("raw") or output_data.get("query")
                    output_urls = output_data["file_urls"]
                else:
                    output_str = str(event_handler.get_stream_result()) + str(
                        output_data
                    )
                    output_urls = []

                Conversation.create_new(
                    app_id,
                    sessionid,
                    from_machine,
                    output_str,
                    turn_number,
                    output_urls,
                )
            else:
                Conversation.create_new(
                    app_id,
                    sessionid,
                    from_machine,
                    event_handler.get_stream_result(),
                    turn_number,
                    [],
                )
            # refresh_data = marshal(instance, fields.speak_fields)
            # refresh_data["content"] = manager.stream_result  # 当前对话中将流式输出全部显示，但是历史记录中指记录最终输出
            # yield AppQueueManager.build_dict_as_message({"event": "tts_message_end", "data": refresh_data})

        return Response(
            stream_with_context(generate()), status=200, mimetype="text/event-stream"
        )


class SpeakFeedbackApi(Resource):
    """对话反馈API。

    用于对对话结果进行用户反馈。
    """

    def post(self, app_id):
        """对对话的结果进行反馈。

        Args:
            app_id (str): 应用ID
            sessionid (str, required): 会话ID
            speak_id (int, required): 对话消息ID
            is_satisfied (bool, required): 是否满意
            user_feedback (str, required): 用户反馈内容

        Returns:
            dict: 反馈结果

        Raises:
            Exception: 当反馈处理失败时抛出
        """
        app_id = str(app_id)
        # app_model = AppService().get_app(app_id)
        parser = reqparse.RequestParser()
        parser.add_argument("sessionid", type=str, required=True, location="json")
        parser.add_argument("speak_id", type=int, required=True, location="json")
        parser.add_argument(
            "is_satisfied", type=inputs.boolean, required=True, location="json"
        )
        parser.add_argument("user_feedback", type=str, required=True, location="json")
        args = parser.parse_args()

        instance = Conversation.query.get(args["speak_id"])
        if not instance or instance.sessionid != args["sessionid"]:
            return {"result": "success"}

        instance.is_satisfied = args["is_satisfied"]
        instance.user_feedback = args["user_feedback"]
        db.session.commit()

        data = {
            "app_id": app_id,
            "module_id": app_id,
            "module_type": "app",
            "conversation_id": instance.sessionid,
            "turn_number": instance.turn_number,
            "is_satisfied": instance.is_satisfied,
            "user_feedback": instance.user_feedback,
        }
        try:
            reflux.update_reflux_data_feedback(data)
        except Exception as e:
            logging.error(f"feedback data is {json.dumps(data)}")
            logging.exception(e)
        return {"result": "success"}


api.add_resource(SpeakInitApi, "/conversation/<string:app_id>/init")
api.add_resource(SpeakSessionsApi, "/conversation/<string:app_id>/sessions")
api.add_resource(SpeakHistoryApi, "/conversation/<string:app_id>/history")
api.add_resource(SpeakToAppApi, "/conversation/<string:app_id>/run")
api.add_resource(SpeakFeedbackApi, "/conversation/<string:app_id>/feedback")
