import json
import logging
import os
import uuid
import shutil
import pandas as pd
from datetime import datetime
from flask_restful import marshal
from typing import List, Dict

from configs import lazy_config
from models.model_account import Account


from parts.tag.tag_service import TagService

from parts.db_manage.service import _generate_unique_name, truncate_from_last_slash, DataBaseInfo, DBManageService, DbManager
from parts.db_manage.model import TableInfo

from parts.knowledge_base.service import KnowledgeBaseService
from parts.knowledge_base.model import KnowledgeBase
from core.file_service import FileService, PrettyFile
from libs.filetools import FileTools
from models.model_account import Tenant
from parts.tools.model import Tool, ToolHttp, ToolAuth, ToolField
from parts.tools.service import ToolService
from utils.util_database import db
from parts.inferservice.service import InferService
from parts.mcp.service import  McpToolService
from parts.mcp.fields import *
from parts.models_hub.service import ModelService
from parts.app.model import Workflow
from libs.timetools import TimeTools


REFERENCE_DBS: Dict[str, Dict] = {
    "test_1": {
        "db_name": "test_1",
        "db_comment": "测试",
        "tables": [
            {
                "table_name":"test_1",
                "comment":"数据表test_1",
                "database_id":"1",
                "import_file": "test_1_test_1.xlsx",
                "columns": [
                    {
                        "name": "id",
                        "type": "INTEGER",
                        "data_type": "INTEGER",
                        "nullable": False,
                        "default": "1",
                        "comment": "",
                        "is_unique": True,
                        "unique_group": "primary_pk",
                        "is_primary_key": True,
                        "is_foreign_key": False,
                        "foreign_key_info": None
                    },
                    {
                        "name": "name",
                        "type": "TEXT",
                        "data_type": "TEXT",
                        "nullable": True,
                        "default": None,
                        "comment": "姓名",
                        "is_unique": False,
                        "unique_group": None,
                        "is_primary_key": False,
                        "is_foreign_key": False,
                        "foreign_key_info": None
                    },
                    {
                        "name": "age",
                        "type": "INTEGER",
                        "data_type": "INTEGER",
                        "nullable": True,
                        "default": None,
                        "comment": "年龄",
                        "is_unique": False,
                        "unique_group": None,
                        "is_primary_key": False,
                        "is_foreign_key": False,
                        "foreign_key_info": None
                    },
                    {
                        "name": "height",
                        "type": "NUMERIC",
                        "data_type": "NUMERIC",
                        "nullable": True,
                        "default": None,
                        "comment": "身高",
                        "is_unique": False,
                        "unique_group": None,
                        "is_primary_key": False,
                        "is_foreign_key": False,
                        "foreign_key_info": None
                    }
                ],
            }
        ],
    } 
}


REFERENCE_KBS: Dict[str, Dict] = {
    "法规知识库": {
        "name":"法规知识库",
        "tags":["研发"],
        "description":"法规知识库知识库"
    },
}


REFERENCE_TOOL_TAGS: Dict[str, List[str]] = {
    # "工具名称": ["工具tag"]
    "饼图": ["图像"],
    "柱状图": ["图像"],
}


REFERENCE_MCP_SERVER_INFO: List[Dict] = [
    {
        "name": "邮件发送",
        "description": "邮件发送MCP",
        "transport_type": "STDIO",
        "timeout": 60,
        "stdio_command": "npx",
        "stdio_arguments": "mcp-email",
        "stdio_env": {
            "EMAIL_USER": "",
            "EMAIL_PASSWORD": "",
            "EMAIL_TYPE": ""
        }
    },
    {
        "name": "sse-画图工具",
        "description": "sse-画图工具",
        "transport_type": "SSE",
        "http_url": "http://mcp-echarts-sse.lazyplatform.svc.cluster.local:3033/sse",
        "headers": None,
        "timeout": 60, 
        "tags":["图像","科学教育","实用工具"],
        "env_url": {
            "docker": "http://mcp-echarts-sse:3033/sse",
            "k8s": "http://mcp-echarts-sse.lazyplatform.svc.cluster.local:3033/sse"
        }
    },
    {
        "transport_type":"STDIO",
        "stdio_command":"npx",
        "stdio_arguments":"mcp-searxng-public",
        "stdio_env":{
            "DEFAULT_LANGUAGE":"zh",
            "SEARXNG_BASE_URL":"https://searx.be;https://searx.tiekoetter.com;https://opnxng.com;https://searxng.world;https://searx.oloke.xyz;https://seek.fyi"
        },
        "timeout":60,
        "id":38,
        "name":"联网搜索",
        "description":"",
        "icon":"/app/upload/tool.jpg",
        "tags":["实用工具"]
    },
    {
        "transport_type": "SSE",
        "http_url": "http://web-search-sse.lazyplatform.svc.cluster.local:3000/sse",
        "headers": None,
        "timeout": 60,
        "id": 46,
        "name": "Web-Search",
        "description": "联网搜索",
        "icon": "/app/upload/tool.jpg",
        "tags": ["实用工具"],
        "env_url": {
            "docker": "http://web-search-sse:3000/sse",
            "k8s": "http://web-search-sse.lazyplatform.svc.cluster.local:3000/sse"
        }
    }
]


REFERENCE_ONLIEN_MCP_SERVER_INFO: List[Dict] = []


REFERENCE_INFER_SERVICE_INFO: List[Dict] = [
    {
        "model_type":"OCR", 
        "model_name":"PP-OCRv5_mobile", 
        "services":[{"name":"ocr"}]
    }
]


def add_document_resource(admin_account, root_dir, resource):
    logging.info('开始创建知识库...')
    kb_path_old = resource.get("data", {}).get("payload__dataset_path", [])
    if kb_path_old and isinstance(kb_path_old, list):
        kb_path_old = kb_path_old[0]

    kb_name = os.path.basename(kb_path_old)
    # 知识库存在，不要重复创建
    kb_instance = KnowledgeBase.query.filter_by(name=kb_name, tenant_id=admin_account.current_tenant_id).first()
    if kb_instance:
        logging.info(f'当前知识库: {kb_name} 已经存在')
        return kb_instance.id, kb_instance.path
    
    args = REFERENCE_KBS.get(kb_name, {})
    tags = args.pop("tags")
    knowledge_base = KnowledgeBaseService(admin_account).create(args)
    source_dir = os.path.join(root_dir, "kbs", kb_name)

    kb_path = knowledge_base.path
    file_ids = []
    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)
        if os.path.isfile(source_path):
            target_path = os.path.join(kb_path, filename)
            shutil.copy2(source_path, target_path)
            logging.info(f"知识库[{kb_name}]路径为：{target_path}")
        
        # 添加文档
        file_list = PrettyFile(target_path).save_to_db(admin_account.id)
        # 资源库文件大小同步至用户组空间下
        file_path_list = [file.file_path for file in file_list]
        Tenant.save_used_storage(admin_account.current_tenant_id, FileTools.get_file_path_size(file_path_list))
        file_ids.append([file.id for file in file_list])
    file_name_list = FileService(admin_account).add_knowledge_files(knowledge_base.id, file_ids)
    TagService(admin_account).update_tag_binding("knowledgebase", knowledge_base.id, tags)
    logging.info(f"创建知识库成功, 知识库名称：{knowledge_base.name}, 知识库文件: {file_name_list}")

    return knowledge_base.id, knowledge_base.path


def update_infer_model_info(data, service_map):
    base_model = data.get("payload__base_model", "")
    service_name = data.get("payload__service_name", "")
    service_info = service_map.get(f"{base_model}__{service_name}", {})
    if service_info:
        update_workflow_infersevice(data, service_info)

def update_online_model_info(data):
    model_name = data.get("payload__base_model")
    online_id = ModelService.get_model_id_by_name(model_name)
    data["payload__model_id"] = online_id
    data["payload__source_id"] = online_id


def add_tool_resource(admin_account, root_dir, resource):
    logging.info('开始创建内置工具...')
    data = resource.get("data", {})
    name = data.get("name", "")

    tool_instance = db.session.query(Tool).filter(
        Tool.name==name,
        Tool.tenant_id==admin_account.current_tenant_id,
        Tool.publish==True,
    ).first()

    if tool_instance:
        logging.info(f'当前工具: {name} 已经存在')
        return {
            "provider_id": tool_instance.id,
            "tool_api_id": tool_instance.tool_api_id,
            "tool_field_input_ids": tool_instance.tool_field_input_ids,
            "tool_field_output_ids": tool_instance.tool_field_output_ids
        }

    filepath = os.path.join(root_dir, "tools", f"{name}.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        tool_data = json.load(f)

    tool_dict = tool_data.get("tool", {})
    tool_api_dict = tool_data.get("tool_api", {})
    tool_auth_dict = tool_data.get("tool_auth", {})
    tool_fields_list = tool_data.get("tool_fields", [])

    # 添加草稿
    tool = Tool(**tool_dict)
    db.session.add(tool)

    if tool_api_dict:
        tool_api = ToolHttp(**tool_api_dict)
        db.session.add(tool_api)
        tool_api.user_id = admin_account.id

        if tool_auth_dict:
            tool_auth_dict["tool_id"] = tool.id
            tool_auth_dict["tool_api_id"] = tool_api.id
            tool_auth = ToolAuth(**tool_auth_dict)
            db.session.add(tool_auth)

        tool_api.location = tool_auth.location
        tool_api.param_name = tool_auth.param_name
        tool.tool_api_id = tool_api.id


    new_input_fields = []
    new_output_fields = []
    for tool_field_dict in tool_fields_list:
        tool_filed = ToolField(**tool_field_dict)
        tool_filed.user_id = admin_account.id
        tool_filed.tool_id = tool.id
        db.session.add(tool_filed)
        if tool_filed.field_type == "input":
            new_input_fields.append(tool_filed)
        else:
            new_output_fields.append(tool_filed)
    db.session.commit()

    new_input_ids = [k.id for k in new_input_fields]
    new_output_ids = [k.id for k in new_output_fields]

    tool.user_id = admin_account.id
    tool.user_name = admin_account.name
    tool.tenant_id = admin_account.current_tenant_id
    tool.tool_field_input_ids = new_input_ids
    tool.tool_field_output_ids = new_output_ids
    tool.is_draft = True
    tool.tool_id = uuid.uuid4()
    db.session.add(tool)
    db.session.commit()

    # 发布工具
    service = ToolService(admin_account)
    publish_tool = service.pulishTool(tool.id, "正式发布")

    tags = REFERENCE_TOOL_TAGS.get(name, [])
    TagService(admin_account).update_tag_binding("tool", tool.id, tags)
    logging.info(f'内置工具[{publish_tool.name}]创建成功...')

    return {
        "provider_id": publish_tool.id,
        "tool_api_id": publish_tool.tool_api_id if tool_api_dict else 0,
        "tool_field_input_ids": publish_tool.tool_field_input_ids,
        "tool_field_output_ids": publish_tool.tool_field_output_ids
    }
    

def add_database_resource(admin_account, root_dir, resource):
    logging.info('开始创建内置数据库...')
    data = resource.get("data", {})
    name = data.get("payload__database_name", "")

    database_info = REFERENCE_DBS.get(name, {})
    db_name = database_info["db_name"]
    db_comment = database_info["db_comment"]

    db_instance = db.session.query(DataBaseInfo).filter(
        DataBaseInfo.tenant_id==admin_account.current_tenant_id, 
        DataBaseInfo.created_by==admin_account.id, DataBaseInfo.name==db_name
    ).first()

    if db_instance:
        logging.info(f"当前数据库{db_name}已存在")
        return db_instance.id

    name = _generate_unique_name(admin_account.current_tenant_id, database_name=db_name)
    uri = truncate_from_last_slash(lazy_config.SQLALCHEMY_DATABASE_URI)
    # 创建数据库信息对象
    db_info = DataBaseInfo(
        tenant_id=admin_account.current_tenant_id,
        created_by=admin_account.id,
        name=db_name,
        database_name=name,
        comment=db_comment,
        url=uri,
        type="mysql",
    )
    db.session.add(db_info)
    db.session.commit()

    service = DBManageService(admin_account)
    config = service.build_config(db_info)
    manager = DbManager(config)
    manager.create_database(db_info.database_name, db_info.comment)

    for table in database_info["tables"]:
        service.create_table_structure(
            database_id=db_info.id, 
            table_name=table['table_name'],
            comment=table['comment'], 
            columns=table['columns']
        )
        
        table_instance = db.session.query(TableInfo).filter(TableInfo.database_id == db_info.id, TableInfo.name == table['table_name']).first()
        if table.get('import_file'):
            import_file_path = os.path.join(root_dir, "dbs", f"{table['import_file']}")
            if os.path.isfile(import_file_path):
                import_data(admin_account, import_file_path, database_id=db_info.id, table_id=table_instance.id)
    
    logging.info(f'内置数据库[{name}]创建成功...')
    return db_info.id


def import_data(admin_account, file, database_id, table_id):
    service = DBManageService(admin_account)
    table_info = service.get_table_info_by_id(table_id)
    columns = service.get_table_structure(database_id=database_id, table_id=table_info.id)["columns"]
    
    df = pd.read_excel(file)
    column_names = [r["name"] for r in columns]
    data = df.to_dict(orient='records')
    column_types = {col["name"]: col.get("type", "text") for col in columns}

    add_data = []
    for row in data:
        filtered_row = {k: v for k, v in row.items() if k in column_names}
        for col_name, value in filtered_row.items():
            col_type = column_types.get(col_name, "text").lower()
            if pd.isna(value):  # 处理空值
                filtered_row[col_name] = None                    
            # 如果是日期类型，格式化为字符串
            if "date" in col_type or "timestamp" in col_type:
                if isinstance(value, datetime):
                    filtered_row[col_name] = value.strftime("%Y-%m-%d %H:%M:%S")  # 自定义格式
                elif isinstance(value, str):  # 如果已经是字符串，尝试解析并格式化
                    try:
                        dt = pd.to_datetime(value)
                        filtered_row[col_name] = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except (ValueError, TypeError) as e:
                        logging.error(f"Error processing file: {str(e)}")
        add_data.append(filtered_row)

    service = DBManageService(admin_account)
    service.update_data(database_id=database_id, table_id=table_id, add_items=add_data, update_items=[], delete_items=[])


def update_workflow_infersevice(data, sevice_info):
    data["payload__inference_service"] = sevice_info.get("job_id", "")
    data["payload__inference_service_selected_keys"] = [f'parnet__{sevice_info.get("parent_id")}', sevice_info.get("job_id", "")]
    data["payload__jobid"] = sevice_info.get("job_id", "")
    data["payload__token"] = sevice_info.get("token", "")
    data["payload__base_model"] = sevice_info.get("base_model", "")
    data["payload__deploy_method"] = sevice_info.get("deploy_method", "")
    data["payload__url"] = sevice_info.get("url", "")


def get_all_infersevice():
    # /infer-service/list/draw
    infer_service_info, _ = InferService().list_infer_model_service(page=None, per_page=None, qtype="already", search_name=None, is_draw=False)
    services_map = {}
    for infer_service in infer_service_info:
        model_name = infer_service["model_name"]
        for service in infer_service["services"]:
            service["parent_id"] = infer_service["id"]
            services_map[f"{model_name}__{service['name']}"] = service 

    return services_map


def get_all_mcpservices():
    # /mcp/servers
    from parts.mcp.model import McpServer
    services = db.session.query(McpServer).filter(
        McpServer.publish == True,
        McpServer.enable == True,
        McpServer.user_id == Account.get_administrator_id()
    )

    services_map = {}
    for mcp_service in services:
        mcp_dict = marshal(mcp_service, mcp_tool_detail)
        services_map[mcp_dict["name"]] = mcp_dict
        
    return services_map


def get_all_mcptools(admin_account, mcp_service_id):
    # /mcp/tools
    tools = McpToolService(admin_account).get_by_mcp_server_id(mcp_service_id)
    tools_list= marshal({"data": tools}, mcp_tool_list)
    return {tool["name"]: tool for tool in tools_list.get("data", [])}


def handle_llm_data(data, service_map):
    model_source = data.get("payload__model_source", "")
    if model_source == "inference_service":
        update_infer_model_info(data, service_map)
    elif model_source == "online_model":
        update_online_model_info(data)


def publish_workflow(workflowserver, app_model, account, draft_workflow=None):
    if not draft_workflow:
        draft_workflow = workflowserver.get_draft_workflow(app_model.id)

    if not draft_workflow:
        raise ValueError("No valid workflow found.")
    new_graph_dict = draft_workflow.nested_clone_graph(account, "publish")

    workflow = workflowserver.get_published_workflow(app_model.id)
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
