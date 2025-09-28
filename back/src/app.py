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
import os
import sys
import time
import warnings
from appcmd import register_commands
from datetime import datetime
from logging.handlers import RotatingFileHandler
from zoneinfo import ZoneInfo

from flask import Flask, Response, g, request
from flask_cors import CORS
from werkzeug.exceptions import Unauthorized

from configs import lazy_config
from core import contexts
from core.account_manager import AccountService
from libs.passport import PassportService
from parts.models_hub.websocket_handle import \
    init_websocket as model_hub_websocket
from parts.tools.websocket_handle import init_websocket
from utils import (util_celery, util_database, util_login, util_mail,
                   util_migrate, util_redis, util_storage)
from utils.util_database import db
from utils.util_login import login_manager

warnings.simplefilter("ignore", ResourceWarning)

# fix windows platform
if os.name == "nt":
    os.system('tzutil /s "UTC"')
else:
    os.environ["TIMEZONE"] = "UTC"
    time.tzset()


def shanghai_time(*args):
    shanghai = ZoneInfo("Asia/Shanghai")
    return datetime.now(shanghai).timetuple()


class MyApp:
    def __init__(self):
        self.app = self.create_flask_app_with_configs()
        self.initialize_logger(self.app)
        self.initialize_extensions(self.app)
        self.register_blueprints(self.app)
        register_commands(self.app)
        init_websocket(self.app)
        model_hub_websocket(self.app)
        self.initialize_app_restart()

    def create_flask_app_with_configs(self) -> Flask:
        app = Flask(__name__)
        app.config.from_mapping(lazy_config.model_dump())
        app.secret_key = os.getenv("LAZY_PLATFORM_KEY")
        # app.config['SQLALCHEMY_ECHO'] = True
        return app

    def initialize_logger(self, app):
        log_handlers = None
        log_file = os.getenv("LOG_FILE")
        if log_file:
            log_dir = os.path.dirname(log_file)
            os.makedirs(log_dir, exist_ok=True)
            log_handlers = [
                RotatingFileHandler(
                    filename=log_file, maxBytes=1024 * 1024 * 1024, backupCount=5
                ),
                logging.StreamHandler(sys.stdout),
            ]
        else:
            log_handlers = [logging.StreamHandler(sys.stdout)]

        logging.Formatter.converter = shanghai_time
        logging.basicConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            format=os.getenv(
                "LOG_FORMAT",
                "%(asctime)s.%(msecs)03d %(levelname)s [%(threadName)s] [%(filename)s:%(lineno)d] - %(message)s",
            ),
            datefmt=os.getenv("LOG_DATEFORMAT", "%Y-%m-%d %H:%M:%S"),
            handlers=log_handlers,
            force=True,
        )
        app.logger.handlers = logging.getLogger().handlers
        app.logger.setLevel(logging.getLogger().level)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    def initialize_extensions(self, app):
        # Since the application instance is now created, pass it to each Flask
        # extension instance to bind it to the Flask application instance (app)
        util_database.init_app(app)
        util_migrate.init(app, db)
        util_redis.init_app(app)
        util_storage.init_app(app)
        util_celery.init_app(app)
        util_login.init_app(app)
        util_mail.init_app(app)

    def register_blueprints(self, app):
        # register blueprint routers
        from parts.urls import bp as console_app_bp

        CORS(
            console_app_bp,
            resources={r"/*": {"origins": "*"}},
            supports_credentials=True,
            allow_headers=["Content-Type", "Authorization", "TempToken"],
            methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
            expose_headers=["X-Version", "X-Env"],
        )
        app.register_blueprint(console_app_bp)  # /console/api

    def initialize_app_restart(self):
        """初始化应用重启功能。
        
        在程序启动时重启所有已启动的应用。
        """
        try:
            # 在应用上下文中执行重启操作
            with self.app.app_context():
                from parts.app.app_restart_service import AppRestartService
                
                restart_service = AppRestartService()
                result = restart_service.restart_all_running_apps()
                
                logging.info(f"应用重启初始化完成: {result}")
                
        except Exception as e:
            logging.error(f"应用重启初始化失败: {e}")


# Flask-Login configuration
@login_manager.request_loader
def load_user_from_request(request_from_flask_login):
    """Load user based on the request."""
    if request.blueprint not in [
        "console",
        "inner_api",
        "new_console",
        "new_inner_api",
    ]:
        return None
    # Check if the user_id contains a dot, indicating the old format
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        auth_token = request.args.get("_token")
        if not auth_token:
            raise Unauthorized("Invalid Authorization token.")
    else:
        if " " not in auth_header:
            raise Unauthorized(
                "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
            )
        auth_scheme, auth_token = auth_header.split(None, 1)
        auth_scheme = auth_scheme.lower()
        if auth_scheme != "bearer":
            raise Unauthorized(
                "Invalid Authorization header format. Expected 'Bearer <api-key>' format."
            )

    decoded = PassportService().verify(auth_token)
    user_id = decoded.get("user_id")

    _account = AccountService.load_logged_in_account(
        account_id=user_id, token=auth_token
    )
    if _account:
        contexts.tenant_id.set(_account.current_tenant_id)
    return _account


@login_manager.unauthorized_handler
def unauthorized_handler():
    """Handle unauthorized requests."""
    return Response(
        json.dumps({"code": "unauthorized", "message": "Unauthorized."}),
        status=401,
        content_type="application/json",
    )


# create app
app = MyApp().app
celery = app.extensions["celery"]


@app.before_request
def before_request():
    g.start_time = time.time()
    app.logger.info(
        f"Request started: {request.method} {request.path} from {request.remote_addr}"
    )


@app.after_request
def after_request(response):
    """Add Version headers to the response."""
    response.set_cookie("remember_token", "", expires=0)
    response.headers.add("X-Version", "")
    response.headers.add("X-Env", "")
    return response


if __name__ == "__main__":
    # from gevent.pywsgi import WSGIServer
    # http_server = WSGIServer(("0.0.0.0", 8087), app)
    # http_server.serve_forever()
    app.run(host="0.0.0.0", port=8087)
