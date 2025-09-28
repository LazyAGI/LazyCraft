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

import logging

from flask_login import current_user

from models.model_account import Account, TenantAccountJoin
from utils.util_database import db

from .enums import Action, DetailProvider, Module
from .model import OperationLog


class LogService(DetailProvider):

    def add(self, module: Module, action: Action, **kwargs):
        """记录用户的操作日志。

        根据传入的模块和动作信息创建操作日志记录，并保存到数据库中。
        如果没有当前用户信息，则不记录日志。

        Args:
            module (Module): 操作的模块枚举。
            action (Action): 操作的动作枚举。
            **kwargs: 其他详细信息参数，可包含current_user或user_id。

        Returns:
            None

        Raises:
            Exception: 当数据库操作失败时可能抛出异常。
        """

        if kwargs.get("current_user"):
            user_id = str(
                kwargs.pop("current_user").id
            )  # 注册/登录接口中, current_user是没有信息的
        elif kwargs.get("user_id"):
            user_id = str(kwargs.pop("user_id"))
        else:
            if current_user is not None and hasattr(current_user, "id"):
                user_id = str(current_user.id)
            else:
                return  # 内部调用，不记录日志
        logging.info(f"当前用户ID: {user_id}")

        # 获取详细信息的模板并填充
        detail_message = self.get_detail(module, action, **kwargs)

        # 创建日志条目并保存到数据库
        log_entry = OperationLog(
            user_id=user_id,
            module=module.value,  # 保存为模块的字符串值
            action=action.value.split("#")[0],  # 保存为操作的字符串值,并去掉序号
            details=detail_message,
        )
        db.session.add(log_entry)
        db.session.commit()

    def get(
        self,
        start_date=None,
        end_date=None,
        details=None,
        page=1,
        per_page=10,
        tenant_id=None,
        user_name=None,
        module=None,
        action=None,
        account_id=None,
    ):
        """获取用户的操作日志。

        根据传入的筛选条件查询操作日志记录，支持分页和多种过滤条件。
        使用连接查询获取操作日志及相关用户信息。

        Args:
            start_date (datetime, optional): 开始日期。
            end_date (datetime, optional): 结束日期。
            details (str, optional): 关键字模糊查找。
            page (int, optional): 分页页码，默认为1。
            per_page (int, optional): 每页记录数，默认为10。
            tenant_id (str, optional): 租户ID。
            user_name (str, optional): 用户名称。
            module (str, optional): 操作模块。
            action (str, optional): 操作动作。
            account_id (str, optional): 账户ID。

        Returns:
            Pagination: Flask-SQLAlchemy分页对象，包含查询结果和分页信息。

        Raises:
            Exception: 当数据库查询出错时抛出异常。
        """
        try:

            # 使用连接查询获取符合条件的操作日志及相关用户信息
            query = (
                db.session.query(
                    OperationLog.id,
                    Account.name.label("username"),
                    OperationLog.module,
                    OperationLog.action,
                    OperationLog.details,
                    OperationLog.created_at,
                )
                .join(Account, OperationLog.user_id == Account.id)
                .join(TenantAccountJoin, Account.id == TenantAccountJoin.account_id)
                .distinct()
            )

            # if tenant_id:
            #     query = query.filter(TenantAccountJoin.tenant_id == tenant_id)
            if start_date:
                query = query.filter(OperationLog.created_at >= start_date)
            if end_date:
                query = query.filter(OperationLog.created_at < end_date)
            if details:
                query = query.filter(OperationLog.details.like(f"%{details}%"))

            if user_name:
                # query = query.filter(Account.name.like(f'%{user_name}%'))
                query = query.filter(Account.name == user_name)
            if module:
                query = query.filter(OperationLog.module == module)
            if action:
                query = query.filter(OperationLog.action == action)
            if account_id:
                query = query.filter(OperationLog.user_id == account_id)

            # 分页查询
            logs = query.order_by(OperationLog.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )

            return logs
        except Exception as e:
            # 更通用的数据库查询错误处理
            logging.error(f"数据库查询出错: {e}")
            return None
