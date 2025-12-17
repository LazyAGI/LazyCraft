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

import copy
import json
import logging
import os
import time
from datetime import datetime, timezone

from flask_restful import marshal
from sqlalchemy import and_, or_

from lazyllm.tools.rag.utils import DocListManager

from libs.filetools import FileTools
from libs.timetools import TimeTools
from models.model_account import Account
from parts.app.node_run.lazy_converter import LazyConverter
from parts.tag.model import Tag
from utils.util_database import db

from . import fields
from .model import App, AppTemplate, AppVersion, Workflow
from .node_run.app_run_service import EventHandler, FlowType, get_app_except


class AppServiceMixin:
    """应用服务混入类。

    提供应用相关的基础服务方法，包括分页查询、搜索、过滤等功能。
    """

    model_cls = None

    def get_paginate_apps(self, account, args):
        """获取应用列表（分页）。

        Args:
            account: 用户账户对象
            args (dict): 查询参数，包含分页、搜索、过滤等条件

        Returns:
            dict: 包含应用列表的分页数据

        Raises:
            Exception: 当查询失败时抛出
        """
        model_cls = self.model_cls
        filters = []

        if args.get("search_tags"):
            target_ids = []
            if isinstance(args.get("search_tags"), str):
                target_ids = Tag.get_target_ids_by_name(
                    Tag.Types.APP, args["search_tags"]
                )
            elif isinstance(args.get("search_tags"), (list, tuple)):
                target_ids = Tag.get_target_ids_by_names(
                    Tag.Types.APP, args["search_tags"]
                )
            filters.append(model_cls.id.in_(target_ids))

        if args.get("search_name"):
            search_name = args["search_name"]
            filters.append(
                or_(
                    model_cls.name.ilike(f"%{search_name}%"),
                    model_cls.description.ilike(f"%{search_name}%"),
                )
            )

        if model_cls is App:
            if args.get("is_published") is not None:
                if args["is_published"] in (True, "true"):
                    filters.append(model_cls.status == "normal")
                elif args["is_published"] in (False, "false"):
                    filters.append(model_cls.status == "draft")
            if args.get("enable_api") is not None:
                if args["enable_api"] in (True, "true"):
                    filters.append(model_cls.enable_api == True)
                elif args["enable_api"] in (False, "false"):
                    filters.append(model_cls.enable_api == False)

        if args.get("qtype") == "mine":  # 我的应用(包含草稿)
            filters.append(model_cls.tenant_id == account.current_tenant_id)
            filters.append(model_cls.created_by == account.id)
        elif args.get("qtype") == "group":  # 同组应用(包含草稿)
            filters.append(model_cls.tenant_id == account.current_tenant_id)
            filters.append(model_cls.created_by != account.id)
        elif args.get("qtype") == "builtin":  # 内置的应用
            filters.append(model_cls.created_by == Account.get_administrator_id())
            if not account.is_administrator:
                filters.append(
                    and_(
                        model_cls.created_by == Account.get_administrator_id(),
                        model_cls.status == "normal",
                    )
                )
            else:
                filters.append(model_cls.created_by == Account.get_administrator_id())

        elif args.get("qtype") == "already":  # 混合了前3者的数据
            filters.append(
                or_(
                    model_cls.tenant_id == account.current_tenant_id,
                    and_(
                        model_cls.created_by == Account.get_administrator_id(),
                        model_cls.status == "normal",
                    ),
                )
            )

        stmt = (
            db.session.query(model_cls, Workflow.updated_at)
            .outerjoin(Workflow, model_cls.workflow_id == Workflow.id)
            .filter(*filters)  # 这里 filters 是你的筛选条件
        )

        total = stmt.count()
        queryset = (
            stmt.order_by(model_cls.created_at.desc())
            .limit(args["limit"])
            .offset((args["page"] - 1) * args["limit"])
        )

        pagination = {
            "page": args["page"],
            "per_page": args["limit"],
            "total": total,
            "items": queryset.all(),  # 每个 item 是 (App, Workflow.updated_at)
            "has_next": args["page"] * args["limit"] < total,
        }
        ret_list = []
        for item, workflow_updated_at in pagination["items"]:
            item.workflow_updated_at = workflow_updated_at
            if (
                hasattr(item, "created_by_account")
                and item.created_by_account
                and item.created_by_account.id == Account.get_administrator_id()
            ):
                item.created_by_account.name = "Lazy LLM官方"
            ret_list.append(item)
        pagination["items"] = ret_list
        return pagination

    def get_app(self, app_id, raise_error=True):
        """获取应用实例。

        Args:
            app_id (str): 应用ID
            raise_error (bool, optional): 是否在应用不存在时抛出异常，默认为True

        Returns:
            App: 应用实例

        Raises:
            ValueError: 当应用不存在且raise_error为True时抛出
        """
        instance = (
            db.session.query(self.model_cls)
            .filter(
                self.model_cls.id == app_id,
            )
            .first()
        )

        if not instance:
            if raise_error:
                raise ValueError(f"{self.model_cls.__name__}不存在")

        return instance

    def update_app(self, app, args):
        """更新应用信息。

        Args:
            app (App): 应用实例
            args (dict): 更新参数，包含名称、描述、图标等字段

        Returns:
            App: 更新后的应用实例

        Raises:
            Exception: 当更新失败时抛出
        """
        if args.get("name"):
            app.name = args.get("name")
        # if args.get('description'):
        app.description = args.get("description", "")
        if args.get("icon"):
            app.icon = args.get("icon")
        if args.get("icon_background"):
            app.icon_background = args.get("icon_background")
        if args.get("categories"):
            app.set_categories(args.get("categories"))

        if args.get("enable_site", None) is not None:
            app.enable_site = args.get("enable_site")
        if args.get("enable_api", None) is not None:
            app.enable_api = args.get("enable_api")
            if not app.enable_api:
                app.enable_api_call = "0"
        if args.get("api_url", None) is not None:
            app.api_url = args.get("api_url")
        if args.get("enable_backflow", None) is not None:
            app.enable_backflow = args.get("enable_backflow")

        app.updated_at = TimeTools.now_datetime_china()
        db.session.commit()
        return app

    def delete_app(self, app):
        """删除应用。

        Args:
            app (App): 应用实例

        Returns:
            None: 无返回值

        Raises:
            Exception: 当删除失败时抛出
        """
        Tag.delete_bindings(Tag.Types.APP, app.id)
        db.session.delete(app)
        db.session.commit()

    def validate_name(self, account, name):
        """校验应用名称不重复。

        Args:
            account: 用户账户对象
            name (str): 应用名称

        Returns:
            None: 无返回值

        Raises:
            ValueError: 当名称重复时抛出
        """
        model_cls = self.model_cls
        if (
            db.session.query(model_cls)
            .filter_by(tenant_id=account.current_tenant_id)
            .filter_by(created_by=account.id)
            .filter_by(name=name)
            .first()
        ):
            raise ValueError("名称已经重复,请修改名称")

    def auto_rename_app(self, name):
        """遇到重名时自动命名。

        Args:
            name (str): 原始名称

        Returns:
            str: 自动生成的唯一名称

        Raises:
            Exception: 当重命名失败时抛出
        """
        name = name or "未命名"
        model_cls = self.model_cls
        queryset = model_cls.query.filter(model_cls.name.ilike(f"{name}%"))
        name_list = [m.name for m in queryset]
        index = 0
        match_name = name
        while match_name in name_list:
            index += 1
            match_name = f"{name}({index})"
        return match_name


class AppService(AppServiceMixin):
    model_cls = App

    def create_app(self, account, args):
        """创建新应用。

        Args:
            account: 用户账户对象
            args (dict): 应用创建参数，包含名称、描述、图标等

        Returns:
            App: 新创建的应用实例

        Raises:
            Exception: 当创建失败时抛出
        """
        app = App()
        app.tenant_id = account.current_tenant_id
        app.name = args["name"]
        app.description = args.get("description", "")
        app.icon = args.get("icon", "")
        app.icon_background = args.get("icon_background", "")
        app.set_categories(args.get("categories"))
        app.created_by = account.id
        app.enable_site = app.enable_api = False
        app.status = "draft"

        db.session.add(app)
        db.session.flush()
        db.session.commit()
        return app

    def can_delete(self, app_model):
        """检查应用是否可以删除。

        Args:
            app_model (App): 应用实例

        Returns:
            bool: 是否可以删除

        Raises:
            ValueError: 当应用已发布时抛出
        """
        if app_model.status == "normal":
            raise ValueError("已发布的应用不可删除")
        return True

    def convert_to_template(self, account, source, args):
        """将应用转换为模板。

        Args:
            account: 用户账户对象
            source (App): 源应用实例
            args (dict): 转换参数，包含模板名称、描述等

        Returns:
            AppTemplate: 新创建的模板实例

        Raises:
            ValueError: 当应用未发布时抛出
        """
        client = WorkflowService()
        old_workflow = client.get_published_workflow(source.id)
        if not old_workflow:
            raise ValueError("未发布的应用不能转为模板")

        target = AppTemplate(**source.to_copy_dict())
        target.created_by = account.id
        target.enable_site = target.enable_api = False
        target.status = "normal"
        target.name = args.get("name") or target.name
        target.description = args.get("description") or target.description
        target.icon = args.get("icon") or target.icon
        target.icon_background = args.get("icon_background") or target.icon_background
        target.set_categories(args.get("categories"))

        db.session.add(target)
        db.session.flush()
        db.session.commit()

        new_workflow = Workflow.new_empty(
            account, True, app_id=target.id, version="publish"
        )
        new_workflow = client.clone_new_workflow(account, old_workflow, new_workflow)
        return target

    def get_specific_last_app_versions(self, app_id, version=None):
        instances = (
            db.session.query(AppVersion)
            .filter(
                AppVersion.app_id == app_id,
            )
            .order_by(AppVersion.id.desc())
            .first()
        )
        return instances

    def get_app_versions(self, app_id):
        instances = (
            db.session.query(AppVersion, Account.name)
            .join(Account, Account.id == AppVersion.publisher)
            .filter(AppVersion.app_id == app_id)
            .order_by(AppVersion.id.desc())
            .all()
        )

        new_instances = []
        for item in instances:
            app_version_obj = item[0]
            app_version_obj.name = item[1]
            new_instances.append(app_version_obj)

        return {"items": new_instances}

    def get_version_count(self, app_id):
        versions = self.get_app_versions(app_id)
        return len(versions.get("items", []))

    def update_app_last_version_status(self, app_id, new_status):
        versions = self.get_specific_last_app_versions(app_id)
        if not versions:
            # 可能是老数据，没有版本号
            return
        versions.status = new_status
        versions.updated_at = TimeTools.get_china_now()
        db.session.commit()

    def save_app_version(self, app_id, user_id, args):
        file_path = self.save_app_json(app_id)
        app_version = AppVersion(
            app_id=app_id,
            publisher=user_id,
            release_time=TimeTools.get_china_now(),
            version=args["version"],
            description=args["description"],
            file_path=file_path,
            updated_at=TimeTools.get_china_now(),
        )
        db.session.add(app_version)
        db.session.flush()
        db.session.commit()
        return app_version

    def exist_version_exists(self, app_id, version):
        if (
            db.session.query(AppVersion)
            .filter(AppVersion.app_id == app_id, AppVersion.version == version)
            .first()
        ):
            return True
        return False
    
    def get_specific_app_versions(self, app_id, version):
        instances = (
            db.session.query(AppVersion)
            .filter(
                AppVersion.app_id == app_id,
                AppVersion.version == version
            ).first()
        )
        return instances

    def save_app_json(self, app_id):
        app_versions = (
            db.session.query(AppVersion)
            .filter(AppVersion.app_id == app_id)
            .order_by(AppVersion.id)
            .all()
        )

        # 如果记录超过10条，删除最早的记录
        if len(app_versions) >= 10:
            oldest_version = app_versions[0]

            old_file_path = oldest_version.file_path
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
            db.session.delete(oldest_version)
            db.session.commit()

        app_model = self.get_app(app_id, raise_error=False)
        result = marshal(app_model, fields.app_export_fields)
        workflow = Workflow.default_getone(app_id, None)
        result["graph"] = workflow.nested_graph_dict if workflow else {}

        version_dir = FileTools.create_storage_dir(
            "app_version", app_id, "workflow_json"
        )
        app_name = result.get("name") or ""
        filename = "{}-{}.json".format(
            app_name, datetime.now().strftime("%Y%m%d%H%M%S")
        )
        file_path = os.path.join(version_dir, filename)

        with open(file_path, "w") as f_write:
            f_write.write(json.dumps(result))

        return file_path

    def get_apps_references(self, app_ids):
        from .model import WorkflowRefer

        ref_apps = (
            db.session.query(App.id, App.name, App.is_public, WorkflowRefer.target_id)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id.in_(app_ids), WorkflowRefer.target_type == "app"
            )
            .all()
        )

        ref_res = {}
        for item in ref_apps:
            if item.target_id not in ref_res:
                ref_res[item.target_id] = [item]
            else:
                ref_res[item.target_id].append(item)

        return ref_res

    def get_ref_apps(self, app_id):
        from .model import WorkflowRefer

        using_apps = (
            db.session.query(App.id, App.name, App.enable_api)
            .join(WorkflowRefer, App.id == WorkflowRefer.app_id)
            .filter(
                WorkflowRefer.target_id == str(app_id),
                WorkflowRefer.target_type == "app",
            )
            .all()
        )

        return using_apps

    def get_paginate_apps(self, account, args):
        pagination = super().get_paginate_apps(account, args)
        apps_ids = [item.id for item in pagination.get("items", [])]
        ref_res = self.get_apps_references(apps_ids)

        for item in pagination.get("items", []):
            app_id = item.id
            ref_list = ref_res.get(app_id, [])
            item.ref_status = True if ref_list else False

        return pagination


class TemplateService(AppServiceMixin):
    model_cls = AppTemplate

    def convert_to_app(self, account, source, args):
        """将模板转换为应用。

        Args:
            account: 用户账户对象
            source (AppTemplate): 源模板实例
            args (dict): 转换参数，包含应用名称、描述等

        Returns:
            App: 新创建的应用实例

        Raises:
            Exception: 当转换失败时抛出
        """
        target = App(**source.to_copy_dict())
        target.created_by = account.id
        target.tenant_id = account.current_tenant_id
        target.enable_site = target.enable_api = False
        target.status = "draft"
        target.name = args.get("name") or target.name
        target.description = args.get("description") or target.description
        target.icon = args.get("icon") or target.icon
        target.icon_background = args.get("icon_background") or target.icon_background
        target.set_categories(args.get("categories"))

        db.session.add(target)
        db.session.flush()
        db.session.commit()

        client = WorkflowService()
        old_workflow = client.get_published_workflow(source.id)

        new_workflow = Workflow.new_empty(
            account, True, app_id=target.id, version="draft"
        )
        new_workflow = client.clone_new_workflow(account, old_workflow, new_workflow)
        return target


class WorkflowService:

    def get_draft_workflow(self, app_id):
        """获取草稿工作流。

        Args:
            app_id (str): 应用ID

        Returns:
            Workflow: 草稿工作流实例

        Raises:
            Exception: 当获取失败时抛出
        """
        return Workflow.default_getone(app_id, "draft")

    def get_published_workflow(self, app_id):
        """获取已发布工作流。

        Args:
            app_id (str): 应用ID

        Returns:
            Workflow: 已发布工作流实例

        Raises:
            Exception: 当获取失败时抛出
        """
        return Workflow.default_getone(app_id, "publish")

    def publish_workflow(self, app_model, account, draft_workflow=None):
        """发布工作流（从草稿到发布）。

        Args:
            app_model (App): 应用实例
            account: 用户账户对象
            draft_workflow (Workflow, optional): 草稿工作流，如果不提供则自动获取

        Returns:
            Workflow: 发布的工作流实例

        Raises:
            ValueError: 当没有有效的工作流时抛出
        """
        if not draft_workflow:
            draft_workflow = self.get_draft_workflow(app_model.id)

        if not draft_workflow:
            raise ValueError("No valid workflow found.")

        LazyConverter.convert_workflow_to_lazy(draft_workflow.flat_graph_dict)

        new_graph_dict = draft_workflow.nested_clone_graph(account, "publish")

        workflow = self.get_published_workflow(app_model.id)
        if not workflow:
            workflow = Workflow.new_empty(
                account, True, app_id=app_model.id, version="publish"
            )
            workflow.update_graph(new_graph_dict)
            db.session.add(workflow)
            db.session.flush()
            db.session.commit()
        else:
            workflow.update_graph(new_graph_dict)
            workflow.publish_by = account.id
            workflow.publish_at = TimeTools.get_china_now()
            workflow.updated_at = TimeTools.get_china_now()
            db.session.commit()

        app_model.workflow_id = workflow.id
        app_model.status = "normal"
        app_model.updated_at = TimeTools.get_china_now()
        db.session.commit()
        return workflow

    def clone_new_workflow(self, account, source_workflow, new_workflow):
        """克隆工作流。

        Args:
            account: 用户账户对象
            source_workflow (Workflow): 源工作流实例
            new_workflow (Workflow): 新工作流实例

        Returns:
            Workflow: 克隆后的工作流实例

        Raises:
            Exception: 当克隆失败时抛出
        """
        new_graph_dict = source_workflow.nested_clone_graph(
            account, new_workflow.version
        )
        new_workflow.update_graph(new_graph_dict)

        db.session.add(new_workflow)
        db.session.flush()
        db.session.commit()
        return new_workflow

    def get_docs_progress(self, app_id, dataset_path, name):
        """获取文档解析进度。

        Args:
            app_id (str): 应用ID
            dataset_path (str or list): 数据集路径
            name (str): 数据集名称

        Yields:
            str: SSE格式的进度事件

        Raises:
            Exception: 当解析失败时抛出
        """
        if isinstance(dataset_path, list) and len(dataset_path) > 0:
            dataset_path = dataset_path[0]
        dlm = DocListManager(dataset_path, name, enable_path_monitoring=False)
        group_name = "__default__"
        files_in_path = [
            file[1] for file in dlm.list_kb_group_files(group=group_name, details=False)
        ]
        file_count = self.count_files(dataset_path)

        # 如果文件数据还未写入到数据库，就等待数据写入之后，再查询状态
        while not files_in_path and file_count:
            time.sleep(1)
            files_in_path = [
                file[1]
                for file in dlm.list_kb_group_files(group=group_name, details=False)
            ]
            continue

        event_handler = EventHandler(
            flow_type=FlowType.APP_RUN,
        )

        try:
            yield event_handler.start_event()
            parsed_total = 0
            file_total = len(files_in_path)
            files_in_path_copy = copy.deepcopy(files_in_path)
            last_rogress = "0 / 0"
            success_flag = True
            while True:
                files = dlm.list_kb_group_files(
                    group=group_name, details=True, status=DocListManager.Status.all
                )
                for file in files:
                    path = file[1]
                    status = file[5]
                    if status not in [dlm.Status.waiting, dlm.Status.working]:
                        files_in_path_copy.remove(path)
                        parsed_total += 1
                cur_last_rogress = f"{parsed_total} / {file_total}"
                if last_rogress != cur_last_rogress:
                    last_rogress = cur_last_rogress
                    yield event_handler.chunk_event(cur_last_rogress)
                files_in_path = files_in_path_copy
                if not files_in_path:
                    break

                except_str = get_app_except(app_id, name, dataset_path)
                if except_str:
                    success_flag = False
                    yield event_handler.fail_event(Exception("文档解析失败"))
                    break
                time.sleep(1)

            if success_flag:
                yield event_handler.success_event()
        except Exception as e:
            logging.exception(e)
            yield event_handler.fail_event(e)

        finally:
            yield event_handler.stop_event()
            return event_handler

    def count_files(self, dataset_path):
        """统计数据集中的文件数量。

        Args:
            dataset_path (str): 数据集路径

        Returns:
            int: 文件总数

        Raises:
            Exception: 当统计失败时抛出
        """
        file_count = 0
        for _, _, files in os.walk(dataset_path):
            file_count += len(files)
        return file_count
