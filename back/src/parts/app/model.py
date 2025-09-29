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
import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.dialects.mysql import MEDIUMTEXT

from libs import helper
from libs.checker import NestedChecker
from models import StringUUID
from models.model_account import Account, Tenant
from parts.tag.model import Tag
from utils.util_database import db
from libs.timetools import TimeTools

status_list = [
    "draft",
    "normal",
    "deleted",
]


def compare_list(a_list, b_list):
    """比较两个列表是否相等。

    Args:
        a_list (list): 第一个列表
        b_list (list): 第二个列表

    Returns:
        bool: 两个列表是否相等

    Raises:
        Exception: 当比较失败时抛出
    """
    if len(a_list) != len(b_list):
        return False
    for i, k in enumerate(a_list):
        if a_list[i] != b_list[i]:
            return False
    return True


class AppMixin:
    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    categories = db.Column(db.String(255))
    icon = db.Column(db.String(255))
    icon_background = db.Column(db.String(255))
    workflow_id = db.Column(StringUUID, nullable=True)

    status = db.Column(
        db.String(255), nullable=False, server_default=db.text("'normal'")
    )
    enable_site = db.Column(db.Boolean, nullable=False, server_default=db.text("0"))
    enable_api = db.Column(db.Boolean, nullable=False, server_default=db.text("0"))
    is_public = db.Column(db.Boolean, nullable=False, server_default=db.text("0"))

    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    created_by = db.Column(StringUUID, nullable=True)
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )

    enable_backflow = db.Column(db.Boolean, nullable=True, default=False)

    @property
    def tenant(self):
        tenant = db.session.query(Tenant).filter(Tenant.id == self.tenant_id).first()
        return tenant

    @property
    def created_by_account(self):
        return db.session.get(Account, self.created_by)

    @property
    def categories_as_list(self):
        return self.categories.split(",") if self.categories else []

    def set_categories(self, categories):
        """设置应用分类。

        Args:
            categories (list): 分类列表

        Returns:
            None: 无返回值

        Raises:
            Exception: 当设置失败时抛出
        """
        self.categories = ",".join(categories or [])

    @property
    def mode(self):
        return "workflow"

    @property
    def model_config(self):
        return None

    @property
    def tracing(self):
        return None

    @property
    def publish_status(self):
        return "WIP" if self.status == "draft" else "完成"

    @property
    def engine_status(self):
        return "已完成"

    def to_copy_dict(self):
        """转换为复制字典。

        Returns:
            dict: 包含应用基本信息的字典

        Raises:
            Exception: 当转换失败时抛出
        """
        key_list = [
            "tenant_id",
            "name",
            "description",
            "categories",
            "icon",
            "icon_background",
        ]
        # not_list = workflow_id, status
        return {k: getattr(self, k) for k in key_list}


class App(db.Model, AppMixin):
    __tablename__ = "newapps"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="newapp_pkey"),
        db.Index("newapp_tenant_id_idx", "tenant_id"),
    )
    api_url = db.Column(db.String(255), nullable=True)
    # 开启api调用,0 关闭,1 开启
    enable_api_call = db.Column(
        db.String(10), nullable=True, server_default=db.text("'0'")
    )

    @property
    def tags(self):
        return Tag.get_names_by_target_id(Tag.Types.APP, self.id)


class AppTemplate(db.Model, AppMixin):
    __tablename__ = "app_templates"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="app_template_pkey"),
        db.Index("app_template_id_idx", "tenant_id"),
    )

    @property
    def tags(self):
        return []


class WorkflowRefer(db.Model):
    __tablename__ = "workrefer"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="workrefer_pkey"),
        db.Index("workrefer_app_idx", "app_id"),
    )
    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    app_id = db.Column(StringUUID, nullable=False)
    target_type = db.Column(db.String(16), nullable=False)
    target_id = db.Column(db.String(40), nullable=False)

    class Types(str, Enum):
        # KNOWLEDGE = 'knowledgebase'  # 知识库
        DOCUMENT = "document"  # 知识库
        TOOL = "tool"  # 工具
        MODEL = "model"  # 模型
        APP = "app"  # 应用
        MCP = "mcp"  # MCP应用


class Workflow(db.Model):
    __tablename__ = "newworkflows"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="newworkflow_pkey"),
        db.Index("newworkflow_version_idx", "tenant_id", "app_id", "version"),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    app_id = db.Column(
        StringUUID, nullable=False
    )  # 命名不妥: 其实这里的app_id理解为 parent_id 会更合适
    type = db.Column(db.String(255), nullable=False)  # 固定为: workflow
    version = db.Column(db.String(255), nullable=False)  # 选择项: draft/publish
    graph = db.Column(MEDIUMTEXT)

    created_by = db.Column(StringUUID, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_by = db.Column(StringUUID)
    updated_at = db.Column(db.DateTime)
    publish_by = db.Column(StringUUID)
    publish_at = db.Column(db.DateTime)

    # level = db.Column(db.Integer, nullable=True, default=1)  # 第0级为主画布
    main_app_id = db.Column(StringUUID, nullable=True)  # 主画布对应的app_id
    ref_app_ids = db.Column(db.String(1024), nullable=True)
    ref_tool_ids = db.Column(db.String(1024), nullable=True)
    ref_model_ids = db.Column(db.String(1024), nullable=True)
    ref_knowledge_ids = db.Column(db.String(1024), nullable=True)

    def _set_refers(self, _type, id_list):
        content = ",".join([str(k) for k in id_list if k])
        if _type == "app":
            self.ref_app_ids = content
        elif _type == "tool":
            self.ref_tool_ids = content
        elif _type == "model":
            self.ref_model_ids = content
        elif _type == "document":
            self.ref_knowledge_ids = content

    def _get_refers(self, _type):
        content = ""
        if _type == "app":
            content = self.ref_app_ids
        elif _type == "tool":
            content = self.ref_tool_ids
        elif _type == "model":
            content = self.ref_model_ids
        elif _type == "document":
            content = self.ref_knowledge_ids
        return [k for k in content.split(",") if k] if content else []

    @property
    def refer_model_count(self):
        """返回模型的数量(也即粗略估算显卡的占用数量)"""
        return len(self._get_refers("model"))

    def _check_refers(self, level, flat_data):
        """检查引用关系"""
        ref_app_ids = []
        ref_model_ids = []
        ref_tool_ids = []
        ref_knowledge_ids = []
        ref_mcp_ids = []

        def _internal_check_refers(nodedata):
            node_type = self.node_lower_type(nodedata)
            if node_type == "app":
                ref_app_ids.append(self.get_subgraph_id(nodedata))
            elif self.is_local_model_type(node_type):
                ref_model_ids.append(self.get_data(nodedata).get("payload__base_model"))
            # elif basenode.lower_type == "onlinellm":  # 废弃原因: onlinellm可能是包含jobid的推理服务,而且ref_model_ids要用来计算显卡占用的数量
            #     ref_model_ids.append(basenode.get_data().get('payload__model_id'))
            elif node_type == "httptool":
                ref_tool_ids.append(self.get_data(nodedata).get("provider_id"))
            elif node_type == "mcptool":
                ref_mcp_ids.append(self.get_data(nodedata).get("provider_id"))
            elif node_type == "document":
                target_ids = self.get_data(nodedata).get("payload__knowledge_id") or []
                if isinstance(target_ids, list):
                    ref_knowledge_ids.extend(target_ids)
                else:
                    ref_knowledge_ids.append(target_ids)

        for nodedata in flat_data.get("nodes", []):
            _internal_check_refers(nodedata)
        for nodedata in flat_data.get("resources", []):
            _internal_check_refers(nodedata)

        self.temp_ref_app_ids = {k for k in ref_app_ids if k}
        self.temp_ref_model_ids = {k for k in ref_model_ids if k}
        self.temp_ref_tool_ids = {k for k in ref_tool_ids if k}
        self.temp_ref_knowledge_ids = {k for k in ref_knowledge_ids if k}
        self.temp_ref_mcp_ids = {k for k in ref_mcp_ids if k}

    @property
    def created_by_account(self):
        return db.session.get(Account, self.created_by)

    @property
    def updated_by_account(self):
        return db.session.get(Account, self.updated_by) if self.updated_by else None

    @property
    def flat_graph_dict(self):
        """不递归解析,只解析最外层"""
        return json.loads(self.graph) if self.graph else {}

    @property
    def graph_dict(self):
        """递归解析subgraph的graph, 只递归一层"""
        flat_data = self.flat_graph_dict

        for index, nodedata in enumerate(flat_data.get("nodes", [])):
            node_type = self.node_lower_type(nodedata)
            if self.is_subgraph_type(node_type):
                app_id = self.get_subgraph_id(nodedata)
                sub_workflow = self.default_getone(
                    app_id, self.version
                )  # draft/publish 各自取对应的
                flat_data["nodes"][index]["data"][
                    "config__patent_graph"
                ] = sub_workflow.flat_graph_dict

        return flat_data

    @property
    def nested_graph_dict(self):
        """嵌套的解析所有层级的graph"""
        checker = NestedChecker()
        level = 0
        checker.add_level(level, self.app_id)
        return self._help_check_referenced(checker, level, True)

    def _help_check_referenced(self, checker, level, fetch):
        """辅助函数,检查是否被引用,避免无限循环
        param fetch: 是否要拉取数据
        """
        flat_data = self.flat_graph_dict
        self._check_refers(level, flat_data)

        for index, nodedata in enumerate(flat_data.get("nodes", [])):
            node_type = self.node_lower_type(nodedata)
            if self.is_subgraph_type(node_type):
                app_id = self.get_subgraph_id(nodedata)
                checker.add_level(level + 1, app_id)
                sub_workflow = self.default_getone(
                    app_id, self.version
                )  # draft/publish 各自取对应的
                sub_flat_data = sub_workflow._help_check_referenced(
                    checker, level + 1, fetch
                )

                if level == 0:
                    self.temp_ref_app_ids = (
                        self.temp_ref_app_ids | sub_workflow.temp_ref_app_ids
                    )
                    self.temp_ref_model_ids = (
                        self.temp_ref_model_ids | sub_workflow.temp_ref_model_ids
                    )
                    self.temp_ref_tool_ids = (
                        self.temp_ref_tool_ids | sub_workflow.temp_ref_tool_ids
                    )
                    self.temp_ref_knowledge_ids = (
                        self.temp_ref_knowledge_ids
                        | sub_workflow.temp_ref_knowledge_ids
                    )
                    self.temp_ref_mcp_ids = (
                        self.temp_ref_mcp_ids | sub_workflow.temp_ref_mcp_ids
                    )

                if fetch:
                    flat_data["nodes"][index]["data"][
                        "config__patent_graph"
                    ] = sub_flat_data

        return flat_data

    @classmethod
    def default_getone(cls, app_id, version):
        """获取默认工作流。

        Args:
            app_id (str): 应用ID
            version (str): 版本号

        Returns:
            Workflow: 工作流实例

        Raises:
            Exception: 当获取失败时抛出
        """
        filters = [cls.app_id == app_id]
        if version:
            filters.append(cls.version == version)
        return (
            db.session.query(cls)
            .filter(*filters)
            .order_by(cls.created_at.desc())
            .first()
        )

    @classmethod
    def new_empty(cls, account, is_main, app_id=None, version="draft"):
        """创建空的工作流。

        Args:
            account: 用户账户对象
            is_main (bool): 是否为主工作流
            app_id (str, optional): 应用ID
            version (str, optional): 版本号，默认为draft

        Returns:
            Workflow: 新创建的工作流实例

        Raises:
            AssertionError: 当版本号不在允许范围内时抛出
        """
        assert version in ["draft", "publish"]
        new_app_id = app_id or str(uuid.uuid4())
        workflow = cls(
            tenant_id=account.current_tenant_id,
            app_id=new_app_id,
            main_app_id=None,
            type="workflow",
            version=version,
            graph=None,
            created_by=account.id,
            updated_by=account.id,
        )
        if is_main:
            workflow.main_app_id = new_app_id
        # 因为前端的bug必须设置更新时间, 否则前端会认为是第一次创建的流程重新初始化
        workflow.updated_at = TimeTools.now_datetime_china()
        return workflow

    def get_data(self, data):
        return data.get("data", {})

    def is_subgraph_type(self, node_type):
        return node_type.lower() in ("subgraph", "warp", "loop", "app", "template")

    def is_local_model_type(self, node_type):
        return node_type in ("stt", "vqa", "sd", "tts", "localembedding")

    def node_lower_type(self, data):
        node_type = self.get_data(data).get("payload__kind")
        if node_type is None:
            node_type = self.get_data(data).get("type")
        node_type = node_type or ""
        return node_type.lower()

    def get_subgraph_id(self, data):
        """获取子画布的ID。

        Args:
            data (dict): 节点数据

        Returns:
            str: 子画布ID

        Raises:
            Exception: 当获取失败时抛出
        """
        return self.get_data(data).get("payload__patent_id")

    def update_graph(self, flat_data):
        """更新工作流图。

        Args:
            flat_data (dict): 扁平化的工作流数据

        Returns:
            None: 无返回值

        Raises:
            ValueError: 当存在循环引用时抛出
        """
        for index, nodedata in enumerate(flat_data.get("nodes", [])):
            node_type = self.node_lower_type(nodedata)
            if self.is_subgraph_type(node_type):
                flat_data["nodes"][index]["data"][
                    "config__patent_graph"
                ] = {}  # 将子画布数据置空
                # 检查是否存在循环引用
                if node_type == "app":
                    if self.app_id == self.get_subgraph_id(nodedata):
                        raise ValueError("应用不可引用自己")

        self.graph = json.dumps(flat_data)

        # 检测是否有死循环
        checker = NestedChecker()
        level = 0
        checker.add_level(level, self.app_id)
        self._help_check_referenced(
            checker, level, False
        )  # 内部调用了 self._check_refers

        # 只在主画布中执行: 检查到主画布 + 所有子画布中的引用关系
        if self.main_app_id == self.app_id:
            app_id = self.app_id
            add_refs = []
            if not compare_list(self._get_refers("app"), list(self.temp_ref_app_ids)):
                WorkflowRefer.query.filter_by(app_id=app_id, target_type="app").delete()
                add_refs.extend(
                    [
                        WorkflowRefer(
                            app_id=app_id, target_type="app", target_id=str(k)
                        )
                        for k in self.temp_ref_app_ids
                    ]
                )

            if not compare_list(
                self._get_refers("model"), list(self.temp_ref_model_ids)
            ):
                WorkflowRefer.query.filter_by(
                    app_id=app_id, target_type="model"
                ).delete()
                add_refs.extend(
                    [
                        WorkflowRefer(
                            app_id=app_id, target_type="model", target_id=str(k)
                        )
                        for k in self.temp_ref_model_ids
                    ]
                )

            if not compare_list(self._get_refers("tool"), list(self.temp_ref_tool_ids)):
                WorkflowRefer.query.filter_by(
                    app_id=app_id, target_type="tool"
                ).delete()
                add_refs.extend(
                    [
                        WorkflowRefer(
                            app_id=app_id, target_type="tool", target_id=str(k)
                        )
                        for k in self.temp_ref_tool_ids
                    ]
                )

            if not compare_list(
                self._get_refers("document"), list(self.temp_ref_knowledge_ids)
            ):
                WorkflowRefer.query.filter_by(
                    app_id=app_id, target_type="document"
                ).delete()
                add_refs.extend(
                    [
                        WorkflowRefer(
                            app_id=app_id, target_type="document", target_id=str(k)
                        )
                        for k in self.temp_ref_knowledge_ids
                    ]
                )

            if not compare_list(
                self._get_refers("mcp"), list(self.temp_ref_mcp_ids)
            ):
                WorkflowRefer.query.filter_by(
                    app_id=app_id, target_type="mcp"
                ).delete()
                add_refs.extend(
                    [
                        WorkflowRefer(
                            app_id=app_id, target_type="mcp", target_id=str(k)
                        )
                        for k in self.temp_ref_mcp_ids
                    ]
                )

            if add_refs:
                db.session.bulk_save_objects(add_refs)

            self._set_refers("app", self.temp_ref_app_ids)
            self._set_refers("model", self.temp_ref_model_ids)
            self._set_refers("tool", self.temp_ref_tool_ids)
            self._set_refers("document", self.temp_ref_knowledge_ids)
            self._set_refers("mcp", self.temp_ref_mcp_ids)

    def nested_update_graph(self, account, graph):
        """导入DSL文件时, 嵌套更新graph字段"""
        for index, nodedata in enumerate(graph.get("nodes", [])):
            node_type = self.node_lower_type(nodedata)
            if self.is_subgraph_type(node_type):
                app_exist = False
                if node_type == "app":
                    app_id = self.get_subgraph_id(nodedata)
                    app_model = db.session.query(App).filter(App.id == app_id).first()
                    if app_model:
                        app_exist = True
                    else:
                        graph["nodes"][index]["data"][
                            "payload__kind"
                        ] = "Template"  # 找不到时,app被视为模板

                if app_exist:  # 如果是app并且app存在于数据库中
                    pass  # do nothing
                else:
                    new_sub_workflow = self.new_empty(account, False)
                    app_id = new_sub_workflow.app_id
                    graph["nodes"][index]["data"]["payload__patent_id"] = app_id

                    sub_graph = graph["nodes"][index]["data"]["config__patent_graph"]
                    new_sub_workflow.nested_update_graph(account, sub_graph)
                    db.session.add(new_sub_workflow)

        self.update_graph(graph)

    def nested_clone_graph(self, account, new_version):
        """复制并写入数据库
        return self.graph_dict
        """
        graph = self.flat_graph_dict

        for index, nodedata in enumerate(graph.get("nodes", [])):
            node_type = self.node_lower_type(nodedata)
            if self.is_subgraph_type(node_type):
                app_id = self.get_subgraph_id(nodedata)
                if node_type == "app":
                    pass  # do nothing
                else:
                    sub_workflow = self.default_getone(
                        app_id, self.version
                    )  # draft/publish 各自取对应的

                    # add child's children
                    new_sub_graph = sub_workflow.nested_clone_graph(
                        account, new_version
                    )
                    new_sub_workflow = self.new_empty(
                        account, False, app_id=None, version=new_version
                    )
                    new_sub_workflow.update_graph(new_sub_graph)
                    db.session.add(new_sub_workflow)

                    graph["nodes"][index]["data"][
                        "payload__patent_id"
                    ] = new_sub_workflow.app_id

        return graph

    @property
    def unique_hash(self):
        entity = {"graph": self.flat_graph_dict}
        return helper.generate_text_hash(json.dumps(entity, sort_keys=True))

    def update_resource_ref_status(self, resources):
        resource_map = {}
        # app_resource_ids = []
        tool_resource_ids = []
        doc_resource_ids = []
        mcp_tool_resource_ids = []
        for resource in resources:
            data = resource.get("data", {})
            resource_type = data.get("payload__kind").lower()
            if resource_type == "document":
                resource_ids = data.get("payload__knowledge_id", [])
                if resource_ids:
                    if isinstance(resource_ids, list):
                        resource_ids = resource_ids[0]
                    doc_resource_ids.append(resource_ids)
                    resource_map[resource_ids] = data
            elif resource_type == "httptool":
                resource_id = data.get("provider_id", [])
                tool_resource_ids.append(int(resource_id))
                resource_map[resource_id] = data
            elif resource_type == "mcptool":
                resource_id = data.get("provider_id", [])
                mcp_tool_resource_ids.append(int(resource_id))
                resource_map[resource_id] = data

        disabled_docs = self.check_doc_disabled_refs(doc_resource_ids)
        disabled_tools = self.check_tool_disabled_refs(tool_resource_ids)
        disabled_mcp_tools = self.check_mcp_tool_disabled_refs(mcp_tool_resource_ids)
        
        disabled_resources = disabled_docs | disabled_tools | disabled_mcp_tools

        for resource_id in resource_map.keys():
            data = resource_map[resource_id]
            if resource_id in disabled_resources:
                data["ref_status"] = True
            else:
                data["ref_status"] = False

    def check_doc_disabled_refs(self, resource_ids):
        from parts.knowledge_base.model import KnowledgeBase

        kbs = (
            db.session.query(KnowledgeBase.id)
            .filter(KnowledgeBase.id.in_(resource_ids))
            .all()
        )
        return set(resource_ids) - set([kb.id for kb in kbs])

    def check_tool_disabled_refs(self, resource_ids):
        from parts.tools.model import Tool

        tools = (
            db.session.query(Tool.id)
            .filter(Tool.id.in_(resource_ids), Tool.enable == True)
            .all()
        )
        return set([str(resource_id) for resource_id in resource_ids]) - set([str(tool.id) for tool in tools])

    def check_mcp_tool_disabled_refs(self, resource_ids):
        from parts.mcp.model import McpServer

        mcp_tools = (
            db.session.query(McpServer.id)
            .filter(McpServer.id.in_(resource_ids), McpServer.enable == True)
            .all()
        )
        return set(resource_ids) - set([mcp_tool.id for mcp_tool in mcp_tools])

    def check_app_disabled_refs(self, resource_ids):
        apps = (
            db.session.query(App.id)
            .filter(App.id.in_(resource_ids), App.enable_api == True)
            .all()
        )
        return set(resource_ids) - set([app.id for app in apps])


class AppVersion(db.Model):
    __tablename__ = "app_versions"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="appversions_pkey"),
        db.Index("appversions_app_id_idx", "app_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    app_id = db.Column(StringUUID, nullable=False)
    publisher = db.Column(StringUUID, nullable=False)
    release_time = db.Column(db.DateTime, nullable=False)
    version = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Boolean, default=True)

    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(db.DateTime)
