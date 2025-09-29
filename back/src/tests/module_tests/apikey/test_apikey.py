from flask import Flask, current_app

from configs import lazy_config
from parts.apikey.apikey_service import ApikeyService
from utils import (util_celery, util_database, util_login, util_mail,
                   util_migrate, util_redis, util_storage)
from utils.util_database import db

app = Flask(__name__)


def init_all():
    # 创建一个Flask应用程序用于测试
    app.config.from_mapping(lazy_config.model_dump())
    util_database.init_app(app)
    util_migrate.init(app, db)
    util_redis.init_app(app)
    util_storage.init_app(app)
    util_celery.init_app(app)
    util_login.init_app(app)
    util_mail.init_app(app)


def test_query(user_id: str):
    with app.test_request_context():
        result = ApikeyService.query(user_id)  # 根据当前用户查询其名下的apikey
        print(result)


def test_create_new(
    user_id: str, user_name: str, tenant_id: str, description: str, expire_date: str
):
    with app.test_request_context():
        instance = ApikeyService.create_new(
            user_id, user_name, tenant_id, description, expire_date
        )  # 创建一个新的apikey
        print(instance)


def test_delete_api_key(id: int, user_id: str):
    with app.test_request_context():
        instance = ApikeyService.delete_api_key(id, user_id)
        print(instance)


def test_check_api_key(api_key: str):
    with app.test_request_context():
        instance = ApikeyService.check_api_key(api_key)  # 检查API
        print(instance)


if __name__ == "__main__":
    init_all()

    # try:
    #     test_create_new("00000000-0000-0000-0000-000000000001","admin","00000000-0000-0000-0000-000000000001","test description {i}","2025-6-8")
    # except Exception as e:
    #     print(f"Error creating database tables: {e}")
    # try:
    #     test_create_new("00000000-0000-0000-0000-000000000001","admin","00000000-0000-0000-0000-000000000001","test description {i}","2024-12-")
    # except Exception as e:
    #     print(f"Error creating database tables: {e}")

    # test_create_new("00000000-0000-0000-0000-000000000001","admin","00000000-0000-0000-0000-000000000001","test description {i}","2025-12-31")

    # #test_delete_api_key(2,"00000000-0000-0000-0000-000000000002")

    # # 测试查询功能
    # test_query("00000000-0000-0000-0000-000000000001")

    test_check_api_key("daee437f76a28f2ced50aed762104c90")
