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

"""
忘记密码功能模块

该模块实现了完整的密码重置功能，包括：
- 发送密码重置邮件
- 验证重置令牌有效性
- 执行密码重置操作
- 管理员强制密码重置

安全特性：
- 令牌时效性验证
- 密码强度检查
- 操作日志记录
- 权限验证
- 输入参数验证

API端点：
- POST /forgot-password: 发送重置邮件
- POST /forgot-password/validity: 验证令牌
- POST /forgot-password/resets: 重置密码
- POST /forgot-password/admin-resets: 管理员重置
"""

import base64
import logging
import os
import secrets
from typing import Dict, Any, Optional

from flask import request
from flask_login import current_user
from flask_restful import reqparse

from core.account_manager import AccountService
from core.restful import Resource
from libs.helper import email as email_validate
from libs.password import hash_password
from models.model_account import Account
from parts.logs import Action, LogService, Module
from parts.urls import api
from utils.util_database import db

from .error import InvalidEmailError, InvalidTokenError, PasswordMismatchError

# 配置日志
logger = logging.getLogger(__name__)

# 常量定义
ADMIN_RESET_TOKEN = "admin_reset_password"
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


class PasswordValidator:
    """密码验证器类"""
    
    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        验证密码强度。
        
        Args:
            password: 待验证的密码
            
        Returns:
            bool: 密码是否符合强度要求
        """
        if not password or len(password.strip()) < MIN_PASSWORD_LENGTH:
            return False
        if len(password) > MAX_PASSWORD_LENGTH:
            return False
        return True
    
    @staticmethod
    def validate_password_confirmation(password: str, confirmation: str) -> bool:
        """
        验证密码确认一致性。
        
        Args:
            password: 原始密码
            confirmation: 确认密码
            
        Returns:
            bool: 密码是否一致
        """
        return str(password).strip() == str(confirmation).strip()


class PasswordHasher:
    """密码哈希处理器类"""
    
    @staticmethod
    def generate_password_hash(password: str) -> tuple[str, str]:
        """
        生成密码哈希和盐值。
        
        Args:
            password: 原始密码
            
        Returns:
            tuple: (base64编码的密码哈希, base64编码的盐值)
        """
        salt = secrets.token_bytes(16)
        base64_salt = base64.b64encode(salt).decode()
        
        password_hashed = hash_password(password, salt)
        base64_password_hashed = base64.b64encode(password_hashed).decode()
        
        return base64_password_hashed, base64_salt


class ForgotPasswordSendEmailApi(Resource):
    """发送密码重置邮件API"""

    def post(self) -> Dict[str, Any]:
        """
        发送密码重置邮件。

        向用户注册邮箱发送包含重置链接的邮件。在调试模式下，
        响应中会包含重置令牌用于测试目的。

        Request Body:
            email (str): 用户注册邮箱地址

        Returns:
            dict: 包含操作结果的字典
                - result (str): 操作结果状态
                - token (str, optional): 调试模式下的重置令牌

        Raises:
            InvalidEmailError: 邮箱格式无效
            ValueError: 邮箱未注册

        Example:
            POST /forgot-password
            {
                "email": "user@example.com"
            }
        """
        try:
            args = self._parse_and_validate_email_request()
            email = args["email"]
            
            logger.info(f"接收到密码重置邮件发送请求，邮箱: {email}")
            
            # 查找用户账户
            account = self._find_account_by_email(email)
            if not account:
                logger.warning(f"密码重置请求失败：邮箱未注册 - {email}")
                raise ValueError("该邮箱未注册，请填写正确的邮箱")
            
            # 发送重置邮件
            token = AccountService.send_reset_password_email(account=account)
            logger.info(f"密码重置邮件发送成功，用户: {account.name}, 邮箱: {email}")
            
            # 记录操作日志
            LogService().add(
                Module.USER_MANAGEMENT,
                Action.CHANGE_PASSWORD,
                name=account.name,
                current_user=account,
                details=f"发送密码重置邮件到 {email}"
            )
            
            # 构建响应
            response = {"result": "success"}
            if self._is_debug_mode():
                response["token"] = token
                logger.debug(f"调试模式：返回重置令牌 {token[:10]}...")
            
            return response
            
        except (InvalidEmailError, ValueError):
            raise
        except Exception as e:
            logger.error(f"发送密码重置邮件时发生未知错误: {str(e)}")
            raise ValueError("发送密码重置邮件失败，请稍后重试")

    def _parse_and_validate_email_request(self) -> Dict[str, str]:
        """解析和验证邮件请求参数"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "email", 
            type=str, 
            required=True, 
            location="json",
            help="邮箱地址是必需的"
        )
        args = parser.parse_args()
        
        email = args["email"].strip().lower() if args["email"] else ""
        if not email_validate(email):
            raise InvalidEmailError()
        
        return {"email": email}

    def _find_account_by_email(self, email: str) -> Optional[Account]:
        """根据邮箱查找用户账户"""
        return Account.query.filter_by(email=email).first()

    def _is_debug_mode(self) -> bool:
        """检查是否为调试模式"""
        return os.environ.get("DEBUG", "False").lower() == "true"


class ForgotPasswordCheckApi(Resource):
    """验证密码重置令牌API"""

    def post(self) -> Dict[str, Any]:
        """
        验证密码重置令牌的有效性。

        检查用户提供的重置令牌是否有效且未过期。
        返回令牌状态和关联的邮箱地址。

        Request Body:
            token (str): 密码重置令牌

        Returns:
            dict: 包含验证结果的字典
                - is_valid (bool): 令牌是否有效
                - email (str or None): 关联的邮箱地址

        Example:
            POST /forgot-password/validity
            {
                "token": "reset_token_string"
            }
        """
        try:
            args = self._parse_token_request()
            token = args["token"]
            
            logger.info(f"接收到令牌验证请求，令牌: {token[:10]}...")
            
            # 验证令牌
            reset_data = AccountService.get_reset_password_data(token)
            
            if reset_data is None:
                logger.warning(f"令牌验证失败：无效或已过期的令牌 {token[:10]}...")
                return {"is_valid": False, "email": None}
            
            email = reset_data.get("email")
            logger.info(f"令牌验证成功，关联邮箱: {email}")
            
            return {"is_valid": True, "email": email}
            
        except Exception as e:
            logger.error(f"令牌验证时发生错误: {str(e)}")
            return {"is_valid": False, "email": None}

    def _parse_token_request(self) -> Dict[str, str]:
        """解析令牌请求参数"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "token", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="重置令牌是必需的"
        )
        return parser.parse_args()


class ForgotPasswordResetApi(Resource):
    """执行密码重置API"""

    def post(self) -> Dict[str, str]:
        """
        重置用户密码。

        使用有效的重置令牌更新用户密码。验证新密码的强度和一致性，
        生成新的密码哈希，更新数据库并记录操作日志。

        Request Body:
            token (str): 密码重置令牌（管理员重置时可为特殊值）
            new_password (str): 新密码
            password_confirm (str): 新密码确认

        Returns:
            dict: 包含操作结果的字典
                - result (str): 操作结果状态

        Raises:
            PasswordMismatchError: 密码确认不一致
            InvalidTokenError: 令牌无效或已过期
            ValueError: 密码强度不足或其他验证错误

        Example:
            POST /forgot-password/resets
            {
                "token": "reset_token_string",
                "new_password": "new_secure_password",
                "password_confirm": "new_secure_password"
            }
        """
        try:
            args = self._parse_reset_request()
            token = args["token"]
            new_password = args["new_password"]
            password_confirm = args["password_confirm"]
            
            logger.info(f"接收到密码重置请求，令牌: {token[:10] if token else 'N/A'}...")
            
            # 验证密码
            self._validate_password_requirements(new_password, password_confirm)
            
            # 处理令牌验证（除非是管理员重置）
            reset_data = self._validate_and_process_token(token)
            
            # 执行密码重置
            account = self._execute_password_reset(reset_data, new_password)
            
            # 记录操作日志
            self._log_password_reset(account)
            
            logger.info(f"密码重置成功，用户: {account.name}")
            return {"result": "success"}
            
        except (PasswordMismatchError, InvalidTokenError, ValueError):
            raise
        except Exception as e:
            logger.error(f"密码重置时发生未知错误: {str(e)}")
            raise ValueError("密码重置失败，请稍后重试")

    def _parse_reset_request(self) -> Dict[str, str]:
        """解析密码重置请求参数"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "token", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="重置令牌是必需的"
        )
        parser.add_argument(
            "new_password", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="新密码是必需的"
        )
        parser.add_argument(
            "password_confirm", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="密码确认是必需的"
        )
        return parser.parse_args()

    def _validate_password_requirements(self, password: str, confirmation: str) -> None:
        """验证密码要求"""
        # 检查密码一致性
        if not PasswordValidator.validate_password_confirmation(password, confirmation):
            raise PasswordMismatchError()
        
        # 检查密码强度
        if not PasswordValidator.validate_password_strength(password):
            raise ValueError(f"密码长度必须在 {MIN_PASSWORD_LENGTH} 到 {MAX_PASSWORD_LENGTH} 字符之间")

    def _validate_and_process_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证和处理重置令牌"""
        # 管理员重置特殊处理
        if self._is_admin_reset(token):
            logger.info("检测到管理员密码重置操作")
            return None
        
        # 普通令牌验证
        reset_data = AccountService.get_reset_password_data(token)
        if reset_data is None:
            logger.warning(f"密码重置失败：无效令牌 {token[:10]}...")
            raise InvalidTokenError()
        
        # 删除已使用的令牌
        AccountService.delete_reset_password_token(token)
        logger.info("重置令牌验证成功并已删除")
        
        return reset_data

    def _is_admin_reset(self, token: str) -> bool:
        """检查是否为管理员重置操作"""
        return (current_user.is_authenticated and 
                getattr(current_user, "is_admin", False) and 
                token == ADMIN_RESET_TOKEN)

    def _execute_password_reset(self, reset_data: Optional[Dict[str, Any]], new_password: str) -> Account:
        """执行密码重置操作"""
        # 生成新密码哈希
        password_hash, salt = PasswordHasher.generate_password_hash(new_password)
        
        # 查找用户账户
        if reset_data:
            email = reset_data.get("email")
            account = Account.query.filter_by(email=email).first()
        else:
            # 管理员重置情况下，从当前用户获取
            account = current_user
        
        if not account:
            raise ValueError("用户账户不存在")
        
        # 更新密码
        account.password = password_hash
        account.password_salt = salt
        db.session.commit()
        
        return account

    def _log_password_reset(self, account: Account) -> None:
        """记录密码重置操作日志"""
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.CHANGE_PASSWORD,
            name=account.name,
            current_user=account,
            details="通过忘记密码功能重置密码"
        )


class ForgotPasswordAdminResetApi(Resource):
    """管理员强制密码重置API"""

    def post(self) -> Dict[str, str]:
        """
        管理员强制重置用户密码。

        允许具有管理员权限的用户为任意指定用户重置密码，
        无需密码重置令牌。操作会被详细记录在审计日志中。

        Request Body:
            name (str): 目标用户名
            new_password (str): 新密码
            password_confirm (str): 新密码确认

        Returns:
            dict: 包含操作结果的字典
                - result (str): 操作结果状态

        Raises:
            PasswordMismatchError: 密码确认不一致
            ValueError: 权限不足、用户不存在或密码强度不足

        Example:
            POST /forgot-password/admin-resets
            {
                "name": "target_user",
                "new_password": "new_secure_password",
                "password_confirm": "new_secure_password"
            }
        """
        try:
            args = self._parse_admin_reset_request()
            username = args["name"]
            new_password = args["new_password"]
            password_confirm = args["password_confirm"]
            
            logger.info(f"接收到管理员密码重置请求，目标用户: {username}, 操作员: {current_user.name}")
            
            # 验证管理员权限
            self._validate_admin_permission()
            
            # 验证密码要求
            self._validate_password_requirements(new_password, password_confirm)
            
            # 查找目标用户
            target_account = self._find_target_account(username)
            
            # 执行密码重置
            self._execute_admin_password_reset(target_account, new_password)
            
            # 记录操作日志
            self._log_admin_password_reset(target_account)
            
            logger.info(f"管理员密码重置成功，目标用户: {username}, 操作员: {current_user.name}")
            return {"result": "success"}
            
        except (PasswordMismatchError, ValueError):
            raise
        except Exception as e:
            logger.error(f"管理员密码重置时发生未知错误: {str(e)}")
            raise ValueError("管理员密码重置失败，请稍后重试")

    def _parse_admin_reset_request(self) -> Dict[str, str]:
        """解析管理员重置请求参数"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "name", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="用户名是必需的"
        )
        parser.add_argument(
            "new_password", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="新密码是必需的"
        )
        parser.add_argument(
            "password_confirm", 
            type=str, 
            required=True, 
            nullable=False, 
            location="json",
            help="密码确认是必需的"
        )
        return parser.parse_args()

    def _validate_admin_permission(self) -> None:
        """验证管理员权限"""
        if not (current_user.is_authenticated and getattr(current_user, "is_admin", False)):
            logger.warning(f"非管理员用户尝试执行管理员密码重置操作: {getattr(current_user, 'name', 'Anonymous')}")
            raise ValueError("只有管理员才能重置用户密码")

    def _validate_password_requirements(self, password: str, confirmation: str) -> None:
        """验证密码要求"""
        # 检查密码一致性
        if not PasswordValidator.validate_password_confirmation(password, confirmation):
            raise PasswordMismatchError()
        
        # 检查密码强度
        if not PasswordValidator.validate_password_strength(password):
            raise ValueError(f"密码长度必须在 {MIN_PASSWORD_LENGTH} 到 {MAX_PASSWORD_LENGTH} 字符之间")

    def _find_target_account(self, username: str) -> Account:
        """查找目标用户账户"""
        account = Account.query.filter_by(name=username).first()
        if not account:
            logger.warning(f"管理员密码重置失败：用户不存在 - {username}")
            raise ValueError("目标用户不存在")
        return account

    def _execute_admin_password_reset(self, account: Account, new_password: str) -> None:
        """执行管理员密码重置"""
        # 生成新密码哈希
        password_hash, salt = PasswordHasher.generate_password_hash(new_password)
        
        # 更新密码
        account.password = password_hash
        account.password_salt = salt
        db.session.commit()

    def _log_admin_password_reset(self, target_account: Account) -> None:
        """记录管理员密码重置操作日志"""
        LogService().add(
            Module.USER_MANAGEMENT,
            Action.CHANGE_PASSWORD,
            name=target_account.name,
            current_user=current_user,
            details=f"管理员 {current_user.name} 强制重置了用户 {target_account.name} 的密码"
        )


# =============================================================================
# API 路由注册
# =============================================================================

# 注册API端点
api.add_resource(ForgotPasswordSendEmailApi, "/forgot-password")
api.add_resource(ForgotPasswordCheckApi, "/forgot-password/validity")
api.add_resource(ForgotPasswordResetApi, "/forgot-password/resets")
api.add_resource(ForgotPasswordAdminResetApi, "/forgot-password/admin-resets")