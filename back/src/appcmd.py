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

import base64
import json
import logging
import os
import secrets
import tempfile
import zipfile

import click
import parts.data.builtin_common_datasets
import parts.data.builtin_common_scripts

from configs import lazy_config
from core.account_manager import AccountService, TenantService
from libs.password import hash_password
from models.model_account import Account
from parts.data.builtin_common_datasets import BUILTIN_COMMON_DATASETS
from parts.data.builtin_common_scripts import BUILTIN_COMMON_SCRIPTS
from parts.data.data_service import DataService
from parts.data.script_service import ScriptService
from parts.models_hub.model import Lazymodel
from parts.models_hub.model_list import (ams_model_list, firms,
                                         online_model_list)
from parts.models_hub.service import ModelService
# from parts.prompt.builtin_prompt_templates import BUILTIN_PROMPT_TEMPLATES
from parts.prompt.builtin_prompt import BUILTIN_PROMPT
from parts.prompt.model import Prompt
from parts.tag.model import ChoiceTag, Tag, TagBinding
from parts.tag.tag_service import TagService
from parts.app.app_service import AppService, WorkflowService
from parts.app.model import App, Workflow
from built_in_apps.builtin_apps import *
from utils.util_database import db
from utils.util_redis import redis_client
from parts.inferservice.service import InferService
from parts.inferservice.model import InferModelServiceGroup
from parts.mcp.service import McpServerService, McpToolService
from parts.mcp.model import TestState, McpServer
from parts.mcp.fields import *


@click.command("reset-password", help="Reset the account password.")
@click.option(
    "--name",
    prompt=True,
    help="The name of the account whose password you need to reset",
)
@click.option("--new-password", prompt=True, help="the new password.")
@click.option("--password-confirm", prompt=True, help="the new password confirm.")
def reset_password(name, new_password, password_confirm):
    """Reset password of owner account"""
    if str(new_password).strip() != str(password_confirm).strip():
        click.echo(click.style("sorry. The two passwords do not match.", fg="red"))
        return

    account = db.session.query(Account).filter(Account.name == name).one_or_none()

    if not account:
        click.echo(
            click.style("sorry. the account: [{}] not exist .".format(name), fg="red")
        )
        return

    # generate password salt
    salt = secrets.token_bytes(16)
    base64_salt = base64.b64encode(salt).decode()

    # encrypt password with salt
    password_hashed = hash_password(new_password, salt)
    base64_password_hashed = base64.b64encode(password_hashed).decode()
    account.password = base64_password_hashed
    account.password_salt = base64_salt
    db.session.commit()
    click.echo(click.style("Congratulations! Password has been reset.", fg="green"))


@click.command("upgrade-db", help="upgrade the database")
def upgrade_db():
    click.echo("Preparing database migration...")
    lock = redis_client.lock(name="db_upgrade_lock", timeout=60)
    if lock.acquire(blocking=False):
        try:
            click.echo(click.style("Start database migration.", fg="green"))

            # run db migration
            import flask_migrate

            flask_migrate.upgrade()

            click.echo(click.style("Database migration successful!", fg="green"))

        except Exception as e:
            logging.exception(f"Database migration failed, error: {e}")
        finally:
            lock.release()
    else:
        click.echo("Database migration skipped")


@click.command("init", help="Init account and tenant.")
def init():
    password = "LazyCraft@2025"
    TenantService.init(password)

    click.echo(
        click.style(
            "Congratulations! Account and tenant created.\n"
            "Account: administrator or admin \n"
            "Password: {}".format(password),
            fg="green",
        )
    )

    # 初始化标签
    DATA = {
        "app": "效率工具、文本创作、灵感提升、代码助手、图像与音频、专业服务、学习教育、办公助手、生活娱乐、数据处理",
        "knowledgebase": "项目、财务、人事、采销、IT、教学、客服、产品、研发",
        "prompt": "代码助手、角色扮演、任务执行、通用结构、技能调用、知识库问答、平台内置",
        "model": "长文本、工具调用、Text2SQL、文本评估、通用、分类、主体提取、代码",
        "tool": "图像、阅读、实用工具、便利生活、内容搜索、科学教育、游戏娱乐、金融商业",
        "mcp": "图像、阅读、实用工具、便利生活、内容搜索、科学教育、游戏娱乐、金融商业",
        "dataset": "文本问答、文本分类、Text2SQL、文本生成、翻译、人类偏好对齐、单项选择、数学、代码",
    }
    for _type, line in DATA.items():
        for name in [k.strip() for k in line.split("、") if k.strip()]:
            tag = Tag.query.filter_by(type=_type, name=name).first()
            if not tag:
                tag = Tag(type=_type, name=name)
                tag.tenant_id = Account.get_administrator_id()
                db.session.add(tag)
                db.session.commit()
            else:
                tag.tenant_id = Account.get_administrator_id()
                db.session.commit()

            print(f"create tag: {_type} {name}")

    # 初始化内置 prompt
    click.echo("Initializing built-in prompts...")

    # 获取管理员账户和 TagService
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    tag_service = TagService(admin_account)

    for prompt_data in BUILTIN_PROMPT:
        try:
            # 检查是否已存在
            existing_prompt = Prompt.query.filter_by(
                name=prompt_data["name"], user_id=admin_account.id
            ).first()

            if not existing_prompt:
                # 创建新的内置 prompt
                new_prompt = Prompt(
                    name=prompt_data["name"],
                    describe=prompt_data["describe"],
                    content=prompt_data["content"],
                    tenant_id=admin_account.id,
                    user_id=admin_account.id,
                    category=prompt_data["category"],
                )
                db.session.add(new_prompt)
                db.session.commit()

                # 使用 TagService 更新标签绑定
                tag_service.update_tag_binding(
                    tag_type=Tag.Types.PROMPT,
                    target_id=new_prompt.id,
                    current_tag_names=prompt_data["tags"],
                )

                click.echo(
                    click.style(
                        f'Created built-in prompt: {prompt_data["name"]}', fg="green"
                    )
                )
            else:
                click.echo(
                    click.style(
                        f'Built-in prompt already exists: {prompt_data["name"]}',
                        fg="yellow",
                    )
                )

        except Exception as e:
            click.echo(
                click.style(
                    f'Failed to create built-in prompt {prompt_data["name"]}: {str(e)}',
                    fg="red",
                )
            )

    click.echo(click.style("Built-in prompts initialization completed!", fg="green"))


@click.command("init-models", help="初始化内置模型清单")
def init_models():
    # 内置厂商
    choiseTags = []
    for firm, types in firms.items():
        for s in types:
            choiseTags.append(
                ChoiceTag(tenant_id=Account.get_administrator_id(), type=s, name=firm)
            )
    db.session.add_all(choiseTags)
    # local_kind = ["localLLM", "VAQ", "SD", "TTS", "STT", "Embedding"]
    online_kind = {
        "llm": "OnlineLLM",
        "embedding": "Embedding",
        "reranker": "reranker",
        "tts": "TTS",
        "stt": "STT",
        "vqa": "VQA",
        "sd": "SD",
    }

    # 查询已存在的在线云服务模型，避免重复创建
    existing_models = (
        db.session.query(Lazymodel)
        .filter(
            Lazymodel.builtin_flag == True,
            Lazymodel.deleted_flag == 0,
            Lazymodel.model_type == "online",
        )
        .all()
    )

    existing_model_names = {model.model_name for model in existing_models}

    # 内置在线模型
    account = AccountService.load_user(user_id=Account.get_administrator_id())
    service = ModelService(account)
    for firm, type_list in online_model_list.items():
        for type_key, models in type_list.items():
            model_kind = online_kind.get(type_key.split("_")[0], "")
            model_name = f"{firm}-{model_kind}"
            if model_kind != "" and model_name not in existing_model_names:
                service.create_model(
                    data={
                        "model_icon": "",
                        "model_type": "online",
                        "model_name": model_name,
                        "description": "",
                        "model_path": "",
                        "model_from": "",
                        "model_kind": model_kind,
                        "model_list": json.dumps(
                            [
                                {
                                    "model_key": i["model_name"],
                                    "can_finetune": 1 if i["support_finetune"] else 0,
                                }
                                for i in models
                            ]
                        ),
                        "model_brand": firm,
                    }
                )

    # 内置本地模型
    # for model_kind, model_list in local_model_builtins.items():
    #   for model in model_list:
    #       service.create_model(data={
    #            "model_icon": "",
    #            "model_type": "local",
    #            "model_name": model["model_key"],
    #            "model_key": model["model_key"],
    #            "description": "",
    #            "model_path": "",
    #            "model_from": model["model_from"],
    #            "model_kind": model_kind,
    #            "model_brand": ''
    #        })


@click.command("test-redis", help="test redis connection")
def test_redis():
    print(
        {
            "host": os.environ.get("REDIS_HOST"),
            "port": os.environ.get("REDIS_PORT"),
            "username": os.environ.get("REDIS_USERNAME"),
            "password": os.environ.get("REDIS_PASSWORD"),
            "db": os.environ.get("REDIS_DB"),
            "encoding": "utf-8",
            "encoding_errors": "strict",
            "decode_responses": False,
        }
    )
    print("redis get a:", redis_client.get("a"))


@click.command("init-prompts", help="初始化内置的 prompt")
def init_prompts():
    """初始化内置的 prompt"""
    click.echo("Preparing to initialize built-in prompts...")

    # 获取管理员账户
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    tag_service = TagService(admin_account)

    # 初始化内置 prompt
    for prompt_data in BUILTIN_PROMPT:
        try:
            # 检查是否已存在
            existing_prompt = Prompt.query.filter_by(
                name=prompt_data["name"], user_id=admin_account.id
            ).first()

            if not existing_prompt:
                # 创建新的内置 prompt
                new_prompt = Prompt(
                    name=prompt_data["name"],
                    describe=prompt_data["describe"],
                    content=prompt_data["content"],
                    tenant_id=admin_account.id,
                    user_id=admin_account.id,
                )
                db.session.add(new_prompt)
                db.session.commit()

                # 使用 TagService 更新标签绑定
                tag_service.update_tag_binding(
                    tag_type=Tag.Types.PROMPT,
                    target_id=new_prompt.id,
                    current_tag_names=prompt_data["tags"],
                )

                click.echo(
                    click.style(
                        f'Created built-in prompt: {prompt_data["name"]}', fg="green"
                    )
                )
            else:
                click.echo(
                    click.style(
                        f'Built-in prompt already exists: {prompt_data["name"]}',
                        fg="yellow",
                    )
                )

        except Exception as e:
            click.echo(
                click.style(
                    f'Failed to create built-in prompt {prompt_data["name"]}: {str(e)}',
                    fg="red",
                )
            )

    click.echo(click.style("Built-in prompts initialization completed!", fg="green"))


# 删除内置prompt。
# 此命令仅用于开发环境下测试内置prompt的初始化功能。
# 不可用于其他用途。
@click.command(
    "delete-prompts", help="删除内置的 prompt 及其使用标签（若标签仅与内置prompt关联）"
)
def delete_prompts():
    """删除内置的 prompt"""
    click.echo("Preparing to delete built-in prompts...")

    # 获取管理员账户
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())

    # 获取所有内置prompt
    prompts = Prompt.query.filter_by(user_id=admin_account.id).all()

    if not prompts:
        click.echo(click.style("No built-in prompts found.", fg="yellow"))
        return

    # 收集所有prompt关联的标签
    prompt_tags = set()
    for prompt in prompts:
        prompt_tags.update(prompt.tags)

    # 删除所有内置prompt
    for prompt in prompts:
        try:
            # 删除标签绑定
            Tag.delete_bindings(Tag.Types.PROMPT, prompt.id)
            # 删除prompt
            db.session.delete(prompt)
            db.session.commit()
            click.echo(
                click.style(f"Deleted built-in prompt: {prompt.name}", fg="green")
            )
        except Exception as e:
            click.echo(
                click.style(
                    f"Failed to delete built-in prompt {prompt.name}: {str(e)}",
                    fg="red",
                )
            )
            db.session.rollback()

    click.echo(click.style("Built-in prompts deletion completed!", fg="green"))


@click.command("update-prompts", help="更新内置的 prompt 内容")
def update_prompts():
    """更新内置的 prompt 内容，保持名称不变，更新描述、内容和标签"""
    click.echo("Preparing to update built-in prompts...")

    # 获取管理员账户和 TagService
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    tag_service = TagService(admin_account)

    updated_count = 0
    skipped_count = 0
    error_count = 0
    deleted_tags = set()

    for prompt_data in BUILTIN_PROMPT:
        try:
            # 查找现有prompt
            existing_prompt = Prompt.query.filter_by(
                name=prompt_data["name"], user_id=admin_account.id
            ).first()

            if existing_prompt:
                # 记录更新前的标签
                old_tags = set(existing_prompt.tags)

                # 更新prompt内容
                existing_prompt.describe = prompt_data["describe"]
                existing_prompt.content = prompt_data["content"]
                db.session.commit()

                # 更新标签绑定
                tag_service.update_tag_binding(
                    tag_type=Tag.Types.PROMPT,
                    target_id=existing_prompt.id,
                    current_tag_names=prompt_data["tags"],
                )

                # 检查被移除的标签是否还有其他绑定关系
                removed_tags = old_tags - set(prompt_data["tags"])
                for tag_name in removed_tags:
                    # 检查标签是否还被其他对象使用
                    binding_count = TagBinding.query.filter_by(
                        type=Tag.Types.PROMPT, name=tag_name
                    ).count()

                    if binding_count == 0:
                        try:
                            # 删除未使用的标签
                            Tag.query.filter_by(
                                type=Tag.Types.PROMPT,
                                name=tag_name,
                                tenant_id=admin_account.id,
                            ).delete()
                            db.session.commit()
                            deleted_tags.add(tag_name)
                            click.echo(
                                click.style(
                                    f"Deleted unused tag: {tag_name}", fg="blue"
                                )
                            )
                        except Exception as e:
                            click.echo(
                                click.style(
                                    f"Failed to delete tag {tag_name}: {str(e)}",
                                    fg="red",
                                )
                            )
                            db.session.rollback()
                click.echo(
                    click.style(
                        f'Updated built-in prompt: {prompt_data["name"]}', fg="green"
                    )
                )
                updated_count += 1
            else:
                click.echo(
                    click.style(
                        f'Built-in prompt not found, skipping: {prompt_data["name"]}',
                        fg="yellow",
                    )
                )
                skipped_count += 1

        except Exception as e:
            click.echo(
                click.style(
                    f'Failed to update built-in prompt {prompt_data["name"]}: {str(e)}',
                    fg="red",
                )
            )
            error_count += 1
            db.session.rollback()

    # 输出更新统计信息
    click.echo(click.style("\nUpdate Summary:", fg="blue"))
    click.echo(click.style(f"Successfully updated: {updated_count}", fg="green"))
    click.echo(click.style(f"Skipped (not found): {skipped_count}", fg="yellow"))
    click.echo(click.style(f"Errors: {error_count}", fg="red"))
    if deleted_tags:
        click.echo(
            click.style(f'Deleted unused tags: {", ".join(deleted_tags)}', fg="blue")
        )
    click.echo(click.style("Built-in prompts update completed!", fg="green"))


@click.command("init-datasets", help="初始化内置数据集")
def init_datasets():
    """初始化内置数据集"""
    click.echo("Preparing to initialize built-in datasets...")

    # 获取管理员账户
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    temp_account = Account()
    temp_account.id = admin_account.id
    temp_account.name = "Lazy LLM官方"
    temp_account.current_tenant_id = admin_account.current_tenant_id
    data_service = DataService(temp_account)
    tag_service = TagService(temp_account)

    # {"name":"testdataset","tag_names":["文本分类","表格问答"],"description":"简介","data_type":"doc","upload_type":"local","data_format":"Alpaca_fine_tuning","file_paths":["/app/upload/temp/00000000-0000-0000-0000-000000000001/ce1f5e18-30bd-45c8-9b2f-324900cef9fe/train_template.json"],"from_type":"upload"}

    # 数据集zip文件路径
    base_dir = os.path.dirname(
        os.path.abspath(parts.data.builtin_common_datasets.__file__)
    )
    zip_path = os.path.join(base_dir, "common_datasets", "common_datasets.zip")

    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(tmpdir)
        click.echo(
            click.style(f"Built-in common datasets extract tmpdir:{tmpdir}", fg="green")
        )

        for dataset_meta in BUILTIN_COMMON_DATASETS:
            try:
                data = {}
                data["name"] = dataset_meta["name"]
                data["description"] = dataset_meta["description"]
                data["upload_type"] = dataset_meta["upload_type"]
                data["data_type"] = dataset_meta["data_type"]
                data["data_format"] = dataset_meta["data_format"]
                data["from_type"] = dataset_meta["from_type"]
                data["tag_names"] = dataset_meta.get("tag_names", [])

                dataset_json_path = os.path.join(tmpdir, dataset_meta["file"])
                data["file_paths"] = [dataset_json_path]

                new_dataset = data_service.create_data(data=data)
                click.echo(
                    click.style(f'Created dataset: {dataset_meta["name"]}', fg="green")
                )

                if data["tag_names"]:
                    # 标签绑定
                    tag_service.update_tag_binding(
                        tag_type=Tag.Types.DATASET,
                        target_id=new_dataset.id,
                        current_tag_names=data["tag_names"],
                    )
                    click.echo(
                        click.style(
                            f'Created dataset tag: {dataset_meta["name"]}', fg="green"
                        )
                    )
            except Exception as e:
                click.echo(
                    click.style(
                        f'Failed to create dataset {dataset_meta["name"]}: {str(e)}',
                        fg="red",
                    )
                )

    click.echo(click.style("Built-in datasets initialization completed!", fg="green"))


@click.command("init-scripts", help="初始化内置数据集脚本")
def init_scripts():
    """初始化内置数据集脚本"""
    click.echo("Preparing to initialize built-in common scripts...")

    # 获取管理员账户
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    temp_account = Account()
    temp_account.id = admin_account.id
    temp_account.name = "Lazy LLM官方"
    temp_account.current_tenant_id = admin_account.current_tenant_id

    # {"name":"官方脚本测试","description":"官方脚本测试","script_type":"数据清洗","data_type":"文本类","input_type":"local","script_url":"/app/upload/script/00000000-0000-0000-0000-000000000000/ff6d1689-2456-466d-b18d-96e671390ad6/alpaca_clean_data.py","icon":""}

    # 数据集脚本zip文件路径
    base_dir = os.path.dirname(
        os.path.abspath(parts.data.builtin_common_scripts.__file__)
    )
    common_scripts_path = os.path.join(base_dir, "common_scripts")
    if not os.path.exists(common_scripts_path):
        click.echo(
            click.style(
                f"Built-in common scripts directory does not exist: {common_scripts_path}",
                fg="red",
            )
        )
        return

    # zip_path = os.path.join(base_dir, 'common_scripts', 'common_scripts.zip')
    if os.path.exists(common_scripts_path):
        # with tempfile.TemporaryDirectory() as tmpdir:
        # with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # zip_ref.extractall(tmpdir)
        # click.echo(click.style(f'Built-in common scripts extract tmpdir:{tmpdir}', fg='green'))
        click.echo(
            click.style(
                f"Built-in common scripts extract common_scripts_path:{common_scripts_path}",
                fg="green",
            )
        )

        for script_meta in BUILTIN_COMMON_SCRIPTS:
            try:
                data = {}
                data["name"] = script_meta["name"]
                data["description"] = script_meta["description"]
                data["script_type"] = script_meta["script_type"]
                data["data_type"] = script_meta["data_type"]
                data["input_type"] = script_meta["input_type"]
                data["icon"] = script_meta["icon"]

                # script_path = os.path.join(tmpdir, script_meta["script"])
                script_path = os.path.join(common_scripts_path, script_meta["script"])
                if not os.path.exists(script_path):
                    click.echo(
                        click.style(
                            f"Script file does not exist: {script_path}", fg="red"
                        )
                    )
                    continue

                data["script_url"] = script_path
                ScriptService(temp_account).create_script(data=data)
                click.echo(
                    click.style(
                        f'Created common scripts: {script_meta["name"]}', fg="green"
                    )
                )
            except Exception as e:
                click.echo(
                    click.style(
                        f'Failed to create common scripts {script_meta["name"]}: {str(e)}',
                        fg="red",
                    )
                )

    click.echo(
        click.style("Built-in common scripts initialization completed!", fg="green")
    )


@click.command("init-ams-models", help="初始化内置AMS模型")
def init_ams_models():
    """初始化内置AMS模型清单，直接操作数据库"""
    click.echo("Preparing to init ams built-in models...")

    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())

    created_count = 0
    error_count = 0
    # 查询已存在的模型，避免重复创建
    existing_models = (
        db.session.query(Lazymodel)
        .filter(Lazymodel.builtin_flag == True, Lazymodel.deleted_flag == 0)
        .all()
    )
    existing_model_names = {model.model_name for model in existing_models}

    # 过滤出需要创建的模型
    models_to_create = [
        model for model in ams_model_list if model["name"] not in existing_model_names
    ]

    if not models_to_create:
        click.echo(
            click.style(
                "All built-in AMS models already exist, skipping creation.", fg="yellow"
            )
        )
        return

    click.echo(
        click.style(f"Found {len(models_to_create)} new models to create...", fg="blue")
    )

    for model_data in models_to_create:
        try:
            new_model = Lazymodel(
                model_icon="/app/upload/online.jpg",
                model_type=model_data["model_type"],
                model_name=model_data["name"],
                model_key=model_data["name"],
                description="",
                model_path="",
                model_from="localModel",
                model_kind=model_data["model_kind"],
                model_brand="",
                model_status=3,
                is_finetune_model=model_data["is_finetune_model"],
                can_finetune_model=model_data["can_finetune_model"],
                builtin_flag=True,
                user_id=admin_account.id,
                tenant_id=admin_account.current_tenant_id,
                prompt_keys="",
                model_url="",
                model_dir="",
                deleted_flag=0,
            )

            db.session.add(new_model)
            db.session.commit()

            new_tag_binding = TagBinding(
                target_id=new_model.id,
                type=Tag.Types.MODEL,
                name="通用",
                tenant_id=admin_account.current_tenant_id,
            )
            db.session.add(new_tag_binding)
            db.session.commit()
            click.echo(click.style(f'Created model: {model_data["name"]}', fg="green"))
            created_count += 1

        except Exception as e:
            click.echo(
                click.style(
                    f'Failed to process model {model_data["name"]}: {str(e)}', fg="red"
                )
            )
            error_count += 1
            db.session.rollback()

    click.echo(click.style("\nInitialization Summary:", fg="blue"))
    click.echo(click.style(f"Successfully created: {created_count}", fg="green"))
    click.echo(click.style(f"Errors: {error_count}", fg="red"))
    click.echo(click.style("Init built-in AMS models completed!", fg="green"))


@click.command("delete-ams-models", help="删除内置AMS模型清单，仅用于开发调试。")
@click.option("--force", is_flag=True, help="强制删除，不进行确认")
def delete_ams_models(force):
    """删除内置AMS模型清单，直接操作数据库"""
    click.echo("Preparing to delete ams built-in models...")

    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())

    ams_model_names = [model["name"] for model in ams_model_list]

    ams_models = (
        db.session.query(Lazymodel)
        .filter(
            Lazymodel.model_name.in_(ams_model_names),
            Lazymodel.deleted_flag == 0,
            Lazymodel.tenant_id == admin_account.current_tenant_id,
        )
        .all()
    )

    if not ams_models:
        click.echo(click.style("No AMS built-in models found to delete.", fg="yellow"))
        return

    click.echo(
        click.style(f"\nFound {len(ams_models)} AMS built-in models:", fg="blue")
    )
    for model in ams_models:
        click.echo(f"  - {model.model_name} ({model.model_kind})")

    if not force:
        if not click.confirm("\nAre you sure you want to delete these models?"):
            click.echo(click.style("Operation cancelled.", fg="yellow"))
            return

    deleted_count = 0
    error_count = 0

    for model in ams_models:
        try:
            # 软删除：设置deleted_flag为1
            model.deleted_flag = 1
            model.updated_at = db.func.now()

            db.session.commit()

            click.echo(click.style(f"Deleted model: {model.model_name}", fg="green"))
            deleted_count += 1

        except Exception as e:
            click.echo(
                click.style(
                    f"Failed to delete model {model.model_name}: {str(e)}", fg="red"
                )
            )
            error_count += 1
            db.session.rollback()

    click.echo(click.style("\nDeletion Summary:", fg="blue"))
    click.echo(click.style(f"Successfully deleted: {deleted_count}", fg="green"))
    click.echo(click.style(f"Errors: {error_count}", fg="red"))
    click.echo(click.style("Delete built-in AMS models completed!", fg="green"))


@click.command(
    "delete-builtin-models",
    help="删除所有内置模型（builtin_flag=True），仅用于开发调试。",
)
@click.option("--force", is_flag=True, help="强制删除，不进行确认")
@click.option(
    "--model-type",
    default="local",
    help="指定模型类型进行过滤（如：local, online等），默认为local",
)
def delete_builtin_models(force, model_type):
    """删除所有内置模型（builtin_flag=True），直接操作数据库"""
    click.echo("Preparing to delete all built-in models...")

    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())

    # 构建查询条件
    query = db.session.query(Lazymodel).filter(
        Lazymodel.builtin_flag == True,
        Lazymodel.deleted_flag == 0,
        Lazymodel.tenant_id == admin_account.current_tenant_id,
    )

    # 如果指定了模型类型，添加过滤条件
    if model_type:
        query = query.filter(Lazymodel.model_type == model_type)
        click.echo(click.style(f"Filtering by model type: {model_type}", fg="blue"))

    builtin_models = query.all()

    if not builtin_models:
        click.echo(click.style("No built-in models found to delete.", fg="yellow"))
        return

    click.echo(
        click.style(f"\nFound {len(builtin_models)} built-in models:", fg="blue")
    )
    for model in builtin_models:
        click.echo(f"  - {model.model_name} ({model.model_type}, {model.model_kind})")

    if not force:
        if not click.confirm(
            "\nAre you sure you want to delete these built-in models?"
        ):
            click.echo(click.style("Operation cancelled.", fg="yellow"))
            return

    deleted_count = 0
    error_count = 0

    for model in builtin_models:
        try:
            # 软删除：设置deleted_flag为1
            model.deleted_flag = 1
            model.updated_at = db.func.now()

            db.session.commit()

            click.echo(click.style(f"Deleted model: {model.model_name}", fg="green"))
            deleted_count += 1

        except Exception as e:
            click.echo(
                click.style(
                    f"Failed to delete model {model.model_name}: {str(e)}", fg="red"
                )
            )
            error_count += 1
            db.session.rollback()

    click.echo(click.style("\nDeletion Summary:", fg="blue"))
    click.echo(click.style(f"Successfully deleted: {deleted_count}", fg="green"))
    click.echo(click.style(f"Errors: {error_count}", fg="red"))
    click.echo(click.style("Delete built-in models completed!", fg="green"))


@click.command("init-db", help="初始化数据库实例")
@click.pass_context
def init_db(ctx):
    """新建数据库实例"""
    import pymysql

    click.echo(click.style("准备新建数据库实例 lazyplatform ...", fg="blue"))

    # 数据库连接配置（请根据实际情况修改）
    db_config = {
        "host": os.environ.get("DB_HOST", "db"),
        "user": os.environ.get("DB_USERNAME", "root"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "port": int(os.environ.get("DB_PORT", 4000)),
    }
    db_name = os.environ.get("DB_DATABASE", "lazyplatform")

    try:
        # 连接MySQL服务器
        conn = pymysql.connect(
            host=db_config["host"],
            user=db_config["user"],
            password=db_config["password"],
            port=db_config["port"],
        )
        conn.autocommit(True)
        cursor = conn.cursor()
        # 检查数据库是否已存在
        cursor.execute("SHOW DATABASES LIKE %s", (db_name,))
        result = cursor.fetchone()
        if result:
            click.echo(click.style(f"数据库 {db_name} 已存在，无需创建。", fg="yellow"))
        else:
            cursor.execute(f"CREATE DATABASE `{db_name}`;")
            click.echo(click.style(f"数据库 {db_name} 创建成功！", fg="green"))
        cursor.close()
        conn.close()
    except Exception as e:
        click.echo(click.style(f"创建数据库失败: {str(e)}", fg="red"))


@click.command("delete-db", help="删除数据库实例")
@click.pass_context
def delete_db(ctx):
    """删除数据库实例"""
    import pymysql

    click.echo(click.style("准备删除数据库实例 lazyplatform ...", fg="blue"))

    # 数据库连接配置（请根据实际情况修改）
    db_config = {
        "host": os.environ.get("DB_HOST", "db"),
        "user": os.environ.get("DB_USERNAME", "root"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "port": int(os.environ.get("DB_PORT", 4000)),
    }
    db_name = os.environ.get("DB_DATABASE", "lazyplatform")

    try:
        # 连接MySQL服务器
        conn = pymysql.connect(
            host=db_config["host"],
            user=db_config["user"],
            password=db_config["password"],
            port=db_config["port"],
        )
        conn.autocommit(True)
        cursor = conn.cursor()
        # 检查数据库是否存在
        cursor.execute("SHOW DATABASES LIKE %s", (db_name,))
        result = cursor.fetchone()
        if not result:
            click.echo(click.style(f"数据库 {db_name} 不存在，无需删除。", fg="yellow"))
        else:
            cursor.execute(f"DROP DATABASE `{db_name}`;")
            click.echo(click.style(f"数据库 {db_name} 删除成功！", fg="green"))
        cursor.close()
        conn.close()
    except Exception as e:
        click.echo(click.style(f"删除数据库失败: {str(e)}", fg="red"))


@click.command("init-all", help="初始化所有内置数据")
@click.pass_context
def init_all(ctx):
    click.echo("Preparing to built-in all data...")
    # ctx.invoke(upgrade_db)
    ctx.invoke(init)
    ctx.invoke(init_models)
    ctx.invoke(init_prompts)
    ctx.invoke(init_datasets)
    ctx.invoke(init_ams_models)
    ctx.invoke(init_scripts)
    ctx.invoke(init_mcp_service)
    ctx.invoke(init_apps)
    click.echo(click.style("Built-in all data completed!", fg="green"))


@click.command("batch-register-users", help="批量注册普通用户")
@click.option(
    "--name-file",
    required=True,
    type=click.Path(exists=True),
    help="用户名密码文件路径(每行内容格式为: 用户名,密码)",
)
@click.option(
    "--work_tenant_id", default="", show_default=True, help="加入默认工作空间"
)
def batch_register_users(name_file, work_tenant_id):
    """
    批量注册普通用户，用户名从指定文件读取，每行一个用户名。
    """
    import sys

    from core.account_manager import AccountService, TenantService
    from models.model_account import Account, RoleTypes

    users = []
    with open(name_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",", 1)
            if len(parts) != 2:
                click.echo(click.style(f"格式错误，跳过：{line}", fg="red"))
                continue
            name, password = parts[0].strip(), parts[1].strip()
            if not name or not password:
                click.echo(click.style(f"用户名或密码为空，跳过：{line}", fg="red"))
                continue
            users.append((name, password))

    if not users:
        click.echo(click.style("用户名文件为空或无有效数据，无需注册。", fg="yellow"))
        sys.exit(0)

    created = 0
    skipped = 0
    for name, password in users:
        # 检查是否已存在
        account = Account.query.filter_by(name=name).first()
        if account:
            click.echo(click.style(f"用户 {name} 已存在，跳过。", fg="yellow"))
            skipped += 1
            continue
        try:
            # 创建账号
            account = AccountService.create_account(name, "", "", password)
            # 创建个人空间
            TenantService.create_private_tenant(account)
            if work_tenant_id:
                # 加入指定租户
                default_tenant = TenantService.get_tenant_by_id(work_tenant_id)
                if default_tenant:
                    TenantService.update_tenant_member(
                        default_tenant.id, account.id, RoleTypes.NORMAL
                    )
            click.echo(click.style(f"用户 {name} 注册成功。", fg="green"))
            created += 1
        except Exception as e:
            click.echo(click.style(f"用户 {name} 注册失败: {e}", fg="red"))

    click.echo(
        click.style(
            f"批量注册完成，成功: {created}，已存在: {skipped}，总计: {len(users)}",
            fg="blue",
        )
    )


@click.command('init-apps', help='初始化内置应用')
@click.option("--offline-only", is_flag=True, help="只内置无需联网的APP")
def init_apps(offline_only):
    click.echo('开始初始化内置应用...')
    # 获取管理员账户
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    root_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'built_in_apps')
    apps_dir = os.path.join(root_dir, 'apps')
    file_paths = [
        os.path.join(apps_dir, f)
        for f in os.listdir(apps_dir)
        if os.path.isfile(os.path.join(apps_dir, f))
    ]

    local_apps_dir = os.path.join(root_dir, 'online_apps')
    if not offline_only and os.path.exists(local_apps_dir):
        file_paths.extend([
            os.path.join(local_apps_dir, f)
            for f in os.listdir(local_apps_dir)
            if os.path.isfile(os.path.join(local_apps_dir, f))
        ])

    for path in file_paths:
        client = AppService()
        with open(path, 'r', encoding='utf-8') as f:
            draft_workflow = json.load(f)
            logging.info(f"开始内置应用：{draft_workflow.get('name', '')}")

        if draft_workflow.get('name', '') == '周报生成助手':
            EMAIL_PASSWORD = os.getenv("MCP_EMAIL_PASSWORD", "")
            EMAIL_TYPE = os.getenv("MCP_EMAIL_TYPE", "")
            EMAIL_USER = os.getenv("MCP_EMAIL_USER", "")
            if not (EMAIL_USER and EMAIL_PASSWORD and EMAIL_TYPE):
                continue

        if db.session.query(App).filter(App.tenant_id==admin_account.current_tenant_id, App.created_by==admin_account.id, App.name==draft_workflow.get("name", "")).first():
            logging.info(f"{draft_workflow.get('name', '')}已存在")
            continue

        nodes = draft_workflow.get("graph", {}).get('nodes', [])
        resources = draft_workflow.get("graph", {}).get('resources', [])

        all_nodes = []
        all_resources = []
        all_nodes.extend(nodes)
        all_resources.extend(resources)

        # 查询子模块
        for node in nodes:
            data = node.get("data", {})
            kind = data.get("payload__kind", "")
            if kind == "SubGraph":
                sub_graph_data = data.get("config__patent_graph", {})
                sub_graph_nodes = sub_graph_data.get("nodes", [])
                sub_graph_resources = sub_graph_data.get("resources", [])
                all_nodes.extend(sub_graph_nodes)
                all_resources.extend(sub_graph_resources)

        try:
            # 初始化组件
            service_map = get_all_infersevice()
            for node in all_nodes:
                data = node.get("data", {})
                kind = data.get("payload__kind", "")

                if kind in [
                    "OnlineLLM", "VQA", "SD", "STT", "TTS", "Intention", 
                    "FunctionCall", "SqlCall", "OCR", "QustionRewrite", "parameterextractor"
                ]:
                    handle_llm_data(data, service_map)

            # 初始化资源
            mcp_service_map = get_all_mcpservices()
            for resource in all_resources:
                data = resource.get("data", {})
                # 初始化知识库
                if data.get("payload__kind", "") == "Document":
                    bk_id, kb_apth = add_document_resource(admin_account, root_dir, resource)
                    data["payload__dataset_path"] = [kb_apth]
                    data["payload__knowledge_id"] = [bk_id]

                    activated_groups = data.get("payload__activated_groups", [])
                    for group in activated_groups:
                        embed = group.get("embed", {})
                        if embed:
                            handle_llm_data(embed, service_map)

                    node_group = data.get("payload__node_group", [])
                    for group in node_group:
                        embed = group.get("embed", {})
                        if embed:
                            handle_llm_data(embed, service_map)

                        llm = group.get("llm", {})
                        if llm:
                            handle_llm_data(llm, service_map)

                # 初始化工具
                if data.get("payload__kind", "") == "HttpTool":
                    tool_info = add_tool_resource(admin_account, root_dir, resource)
                    for item in [resource, data]:
                        item["provider_id"] = tool_info["provider_id"]
                        item["tool_api_id"] = tool_info["tool_api_id"]
                        item["tool_field_input_ids"] = tool_info["tool_field_input_ids"]
                        item["tool_field_output_ids"] = tool_info["tool_field_output_ids"]
                # 初始化数据库
                if data.get("payload__kind", "") == "SqlManager":
                    database_id = add_database_resource(admin_account, root_dir, resource)
                    for item in [resource, data]:
                        item["payload__database_id"] = database_id

                # 初始化MCP工具
                if data.get("payload__kind", "") == "MCPTool":
                    mcp_server_name = data.get("mcp_server_info", {}).get("name", "")
                    mcp_tool_name = data.get("mcp_child_tool_info", {}).get("name", "")
                    mcp_server_info = mcp_service_map.get(mcp_server_name, {})

                    if mcp_server_info:
                        mcp_server_id = mcp_server_info["id"]
                        tool_infos = get_all_mcptools(admin_account, mcp_server_id)
                        mcp_tool_info = tool_infos.get(mcp_tool_name, {})
                        for item in [resource, data]:
                            item["payload__mcp_server_id"] = mcp_server_id
                            item["payload__mcp_tool_id"] = mcp_tool_info.get("id", "")
                            item["provider_id"] = mcp_server_id
                            item["mcp_server_info"] = mcp_server_info
                            item["mcp_child_tool_info"] = mcp_tool_info
                            item["user_id"] = admin_account.id
                            item["tenant_id"] = admin_account.current_tenant_id
                            item["user_name"] = admin_account.name

            app = client.create_app(admin_account, draft_workflow)
            app.status = "normal"
            # app.enable_backflow = True
            TagService(admin_account).update_tag_binding(Tag.Types.APP, app.id, draft_workflow.get("tags", []))

            workflow = Workflow.new_empty(admin_account, True, app_id=app.id)
            workflow.nested_update_graph(admin_account, draft_workflow.get('graph', {}))
            db.session.add(workflow)

            workflowserver = WorkflowService()
            workflow = publish_workflow(workflowserver, app, admin_account)
            # 数据回流
            # if app.enable_backflow:
            #     RefluxHelper(admin_account).create_backflow(app, workflow=workflow)
            db.session.add(workflow)
            db.session.commit()
            logging.info(f"内置应用：{draft_workflow.get('name', '')}完成")
        except Exception as e:
            logging.error(click.style(f"内置应用：{draft_workflow.get('name', '')}失败: {e}"))

    click.echo(f"内置APP完成")


@click.command('init-mcp-service', help='初始化MCP服务')
@click.option("--offline-only", is_flag=True, help="只内置无需联网的MCP服务")
def init_mcp_service(offline_only):
    logging.info("开始初始化MCP服务")
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    if not offline_only:
        REFERENCE_MCP_SERVER_INFO.extend(REFERENCE_ONLIEN_MCP_SERVER_INFO)

    DEPLOY_MCP_ENV = os.getenv("DEPLOY_MCP_ENV", "docker")
    for data in REFERENCE_MCP_SERVER_INFO:
        transport_type = data["transport_type"]
        if transport_type == "SSE":
            env_url_info = data.pop("env_url", {})
            new_http_url = env_url_info.get(DEPLOY_MCP_ENV)
            if new_http_url:
                data["http_url"] = new_http_url

        data["icon"] = data.get("icon") or "/app/upload/tool.jpg"
        service = McpServerService(admin_account)
        tool_service = McpToolService(admin_account)
        try:
            mcp_server_name = data.get("name", "")
            if mcp_server_name == "邮件发送":
                EMAIL_PASSWORD = os.getenv("MCP_EMAIL_PASSWORD", "")
                EMAIL_TYPE = os.getenv("MCP_EMAIL_TYPE", "")
                EMAIL_USER = os.getenv("MCP_EMAIL_USER", "")
                if EMAIL_USER and EMAIL_PASSWORD and EMAIL_TYPE:
                    data["stdio_env"]["EMAIL_USER"] = EMAIL_USER
                    data["stdio_env"]["EMAIL_PASSWORD"] = EMAIL_PASSWORD
                    data["stdio_env"]["EMAIL_TYPE"] = EMAIL_TYPE
                else:
                    continue

            if McpServer.query.filter_by(
                name=data.get("name"), tenant_id=admin_account.current_tenant_id
            ).first():
                logging.info(f"MCP服务【{data.get('name')}】已存在")
                continue

            # 重复创建的MCP服务会抛出异常
            mcp_server = service.create_server(data)
            mcp_server_id = mcp_server.id
            TagService(admin_account).update_tag_binding(Tag.Types.MCP, mcp_server_id, ["测试"])
            
            for x in tool_service.sync_tools_from_server(mcp_server_id):
                logging.info(x)
            service.update_test_state(mcp_server_id, TestState.SUCCESS)
            service.publish_server(mcp_server_id, "正式发布")
            service.enable_server(mcp_server_id, True)

            logging.info(f'初始化MCP服务【{data.get("name", "")}】完成')
        except Exception as e:
            logging.error(e)
    
    logging.info("初始化MCP服务完成")


@click.command('init-infer-service', help='初始化推理服务')
def init_infer_service():
    admin_account = AccountService.load_user(user_id=Account.get_administrator_id())
    infer_service = InferService()
    for service_info in REFERENCE_INFER_SERVICE_INFO:
        model_type = service_info["model_type"]
        model_name = service_info["model_name"]
        services = service_info["services"]

        service_group = InferModelServiceGroup.query.filter(
            InferModelServiceGroup.model_name == model_name,
            InferModelServiceGroup.tenant_id == admin_account.current_tenant_id,
        ).first()
        if service_group:
            logging.info("推理服务已存在")
            break

        model = db.session.query(Lazymodel).filter(Lazymodel.model_name==model_name).first()
        model_id = model.id
        create_service_group_res = infer_service.create_infer_model_service_group(model_type, model_id, model_name, services)
        if not create_service_group_res:
            logging.error("创建推理服务失败")
        
        # service_group = InferModelServiceGroup.query.filter(
        #     InferModelServiceGroup.model_name == model_name,
        #     InferModelServiceGroup.tenant_id == admin_account.current_tenant_id,
        # ).first()
        # start_service_group_result = infer_service.start_service_group(service_group.id)
        # if not start_service_group_result:
        #     logging.error("启动推理服务失败")


def register_commands(app):
    app.cli.add_command(reset_password)
    app.cli.add_command(upgrade_db)
    app.cli.add_command(init)
    app.cli.add_command(test_redis)
    app.cli.add_command(init_models)
    app.cli.add_command(init_prompts)
    app.cli.add_command(delete_prompts)
    app.cli.add_command(update_prompts)
    app.cli.add_command(init_datasets)
    app.cli.add_command(init_ams_models)
    app.cli.add_command(delete_ams_models)
    app.cli.add_command(init_scripts)
    app.cli.add_command(delete_builtin_models)
    app.cli.add_command(init_all)
    app.cli.add_command(init_db)
    app.cli.add_command(delete_db)
    app.cli.add_command(batch_register_users)
    app.cli.add_command(init_apps)
    app.cli.add_command(init_mcp_service)
    app.cli.add_command(init_infer_service)
