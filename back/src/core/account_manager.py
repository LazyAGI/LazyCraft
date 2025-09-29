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
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from core.languages import language_timezone_mapping
from libs.helper import RateLimiter, TokenManager
from libs.http_exception import CommonError
from libs.passport import PassportService
from libs.password import compare_password, hash_password
from libs.timetools import TimeTools
from models.model_account import (Account, AccountIntegrate, QuotaRequest,
                                  QuotaStatus, QuotaType, RoleTypes, Tenant,
                                  TenantAccountJoin, TenantStatus)
from parts.message.model import NotificationModule
from parts.message.service import NotificationService
from utils.util_database import db
from utils.util_redis import redis_client


# 常量定义
class Constants:
    """应用常量定义。"""

    # 缓存相关
    LOGIN_CACHE_PREFIX = "account_login"
    LOGIN_TOKEN_EXPIRY_DAYS = 30
    LOGIN_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60 * 30  # 30天

    # 频率限制
    RESET_PASSWORD_MAX_ATTEMPTS = 5
    RESET_PASSWORD_TIME_WINDOW = 60 * 60  # 1小时
    LOGIN_MAX_ATTEMPTS = 3
    LOGIN_TIME_WINDOW = 60  # 1分钟

    # 密码相关
    PASSWORD_SALT_LENGTH = 16

    # 默认设置
    DEFAULT_LANGUAGE = "zh-Hans"
    DEFAULT_THEME = "light"
    DEFAULT_TIMEZONE = "UTC"
    DEFAULT_STATUS = "active"

    # 配额相关
    DEFAULT_STORAGE_QUOTA = 0  # GB
    DEFAULT_GPU_QUOTA = 0
    BYTES_PER_GB = 1024 * 1024 * 1024

    # 活动时间间隔
    ACTIVE_TIME_THRESHOLD_MINUTES = 10


logger = logging.getLogger(__name__)


def handle_database_errors(operation_name: str):
    """数据库操作错误处理装饰器。

    Args:
        operation_name (str): 操作名称，用于日志记录。

    Returns:
        decorator: 装饰器函数。
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                db.session.rollback()
                error_msg = f"{operation_name}失败: {str(e)}"
                logger.error(error_msg, exc_info=True)
                raise CommonError(error_msg)

        return wrapper

    return decorator


def _get_login_cache_key(*, account_id: str, token: str) -> str:
    """生成登录缓存键。

    Args:
        account_id (str): 账户ID。
        token (str): 登录令牌。

    Returns:
        str: 格式化的缓存键字符串。

    Raises:
        None
    """
    return f"{Constants.LOGIN_CACHE_PREFIX}:{account_id}:{token}"


class PasswordManager:
    """密码管理器类。

    提供密码加密、验证等相关功能的统一接口。
    """

    @staticmethod
    def generate_salt() -> str:
        """生成密码盐值。

        Returns:
            str: Base64编码的盐值字符串。

        Raises:
            None
        """
        salt = secrets.token_bytes(Constants.PASSWORD_SALT_LENGTH)
        return base64.b64encode(salt).decode()

    @staticmethod
    def hash_password_with_salt(
        password: str, salt: Optional[str] = None
    ) -> Tuple[str, str]:
        """使用盐值加密密码。

        Args:
            password (str): 原始密码。
            salt (str, optional): 盐值，如果为None则自动生成。

        Returns:
            Tuple[str, str]: 包含(加密后的密码, 盐值)的元组。

        Raises:
            ValueError: 当密码为空时抛出。
        """
        if not password:
            raise ValueError("密码不能为空")

        if salt is None:
            salt = PasswordManager.generate_salt()
        else:
            # 如果传入的是base64编码的盐值，需要解码
            if isinstance(salt, str):
                salt_bytes = base64.b64decode(salt)
            else:
                salt_bytes = salt

        # 使用bytes类型的盐值进行加密
        if isinstance(salt, str):
            salt_bytes = base64.b64decode(salt)
        else:
            salt_bytes = salt

        password_hashed = hash_password(password, salt_bytes)
        base64_password_hashed = base64.b64encode(password_hashed).decode()

        # 确保返回的盐值是base64编码的字符串
        if isinstance(salt, bytes):
            salt = base64.b64encode(salt).decode()

        return base64_password_hashed, salt

    @staticmethod
    def verify_password(password: str, hashed_password: str, salt: str) -> bool:
        """验证密码是否正确。

        Args:
            password (str): 原始密码。
            hashed_password (str): 已加密的密码。
            salt (str): 盐值。

        Returns:
            bool: 密码是否正确。

        Raises:
            None
        """
        try:
            return compare_password(password, hashed_password, salt)
        except Exception as e:
            logger.error(f"密码验证失败: {e}")
            return False


class RegisterService:
    """用户注册服务类。

    提供用户注册相关的功能和方法。
    """

    @classmethod
    def register(cls, email: str, phone: str, name: str, password: str) -> Account:
        """注册新用户账户。

        创建新的用户账户，包括数据验证、密码加密和数据库事务处理。

        Args:
            email (str): 用户邮箱地址。
            phone (str): 用户手机号码。
            name (str): 用户名称。
            password (str): 用户密码（明文）。

        Returns:
            Account: 创建成功的账户对象。

        Raises:
            CommonError: 当邮箱/手机号/用户名已被注册或其他注册失败情况时抛出。
        """
        db.session.begin_nested()
        try:
            account = AccountService.create_account(name, email, phone, password)
            return account
        except Exception as e:
            db.session.rollback()
            raise CommonError(f"注册失败: {e}") from e


class AccountService:
    """账户服务类。

    提供账户管理的核心功能，包括创建、登录、密码重置、
    权限管理等功能。包含登录和密码重置的频率限制器。
    """

    reset_password_rate_limiter = RateLimiter(
        prefix="reset_password_rate_limit",
        max_attempts=Constants.RESET_PASSWORD_MAX_ATTEMPTS,
        time_window=Constants.RESET_PASSWORD_TIME_WINDOW,
    )

    login_rate_limiter = RateLimiter(
        prefix="login_rate_limiter",
        max_attempts=Constants.LOGIN_MAX_ATTEMPTS,
        time_window=Constants.LOGIN_TIME_WINDOW,
    )

    @staticmethod
    def load_user(user_id: str) -> Account:
        """加载用户信息。

        根据用户ID加载用户账户信息，包括当前租户设置和最后活动时间更新。

        Args:
            user_id (str): 用户唯一标识符。

        Returns:
            Account: 用户账户对象，包含当前租户信息。

        Raises:
            CommonError: 当用户不存在或被锁定时抛出。
        """
        account = Account.query.filter_by(id=user_id).first()
        if not account:
            raise CommonError("用户不存在")
        if account.is_banned:
            raise CommonError("用户被锁定")

        current_tenant = TenantAccountJoin.query.filter_by(
            account_id=account.id, current=True
        ).first()
        if current_tenant:
            account.current_tenant_id = current_tenant.tenant_id
        else:
            available_ta = (
                TenantAccountJoin.query.filter_by(account_id=account.id)
                .order_by(TenantAccountJoin.id.asc())
                .first()
            )

            account.current_tenant_id = available_ta.tenant_id
            available_ta.current = True
            db.session.commit()

        # 更新最后活动时间
        current_time = TimeTools.now_datetime_china()
        if current_time - account.last_active_at > timedelta(
            minutes=Constants.ACTIVE_TIME_THRESHOLD_MINUTES
        ):
            account.last_active_at = current_time
            db.session.commit()

        return account

    @staticmethod
    def get_account_jwt_token(account: Account, days: int = None) -> str:
        """生成账户JWT令牌。

        Args:
            account (Account): 账户对象。
            days (int, optional): 令牌有效期天数，默认使用常量值。

        Returns:
            str: JWT令牌字符串。

        Raises:
            Exception: 当令牌生成失败时抛出。
        """
        if days is None:
            days = Constants.LOGIN_TOKEN_EXPIRY_DAYS

        exp = timedelta(days=days)
        payload = {
            "user_id": account.id,
            "exp": TimeTools.now_datetime_china() + exp,
            "iss": "SELF_HOSTED",
            "sub": "Console API Passport",
        }
        return PassportService().issue(payload)

    @staticmethod
    def validate_name_email_phone(
        name: Optional[str], email: Optional[str], phone: Optional[str]
    ) -> None:
        """验证用户名/邮箱/手机号是否存在。

        Args:
            name (str, optional): 用户名。
            email (str, optional): 邮箱地址。
            phone (str, optional): 手机号码。

        Returns:
            None

        Raises:
            CommonError: 当参数全部为空或已被注册时抛出。
        """
        if not any([name, email, phone]):
            raise CommonError("参数name/email/phone不能全部为空")

        validators = [
            (name, "name", "用户名已经被注册"),
            (email, "email", "邮箱已经被注册"),
            (phone, "phone", "手机号已经被注册"),
        ]

        for value, field, error_msg in validators:
            if value:
                kwargs = {field: value}
                if Account.query.filter_by(**kwargs).first():
                    raise CommonError(error_msg)

    @classmethod
    def _common_authenticate_validate(cls, account):
        if not account:
            raise CommonError("用户不存在")
        if account.is_banned:
            raise CommonError("账号被锁定")

    @classmethod
    def authenticate_by_password(
        cls,
        name: Optional[str],
        email: Optional[str],
        phone: Optional[str],
        password: str,
    ) -> Account:
        """通过用户名/邮箱/手机号 + 密码 进行认证。

        Args:
            name (str, optional): 用户名。
            email (str, optional): 邮箱地址。
            phone (str, optional): 手机号码。
            password (str): 密码。

        Returns:
            Account: 验证成功的账户对象。

        Raises:
            CommonError: 当认证失败时抛出。
        """
        # 参数验证
        if not any([name, email, phone]):
            raise CommonError("必须提供用户名/邮箱/手机号")

        if not password:
            raise CommonError("必须填写密码")

        # 查找账户
        account = cls._find_account_by_identifier(name, email, phone)
        if not account:
            raise CommonError("用户不存在，请先注册!")

        # 通用验证
        cls._common_authenticate_validate(account)

        # 频率限制检查
        if cls.login_rate_limiter.is_rate_limited(account.id):
            raise CommonError("密码验证失败超过三次，请稍后再试!")

        # 密码验证
        if account.password is None or not PasswordManager.verify_password(
            password, account.password, account.password_salt
        ):
            cls.login_rate_limiter.increment_rate_limit(account.id)
            raise CommonError("密码错误，请重新输入!")

        return account

    @classmethod
    def _find_account_by_identifier(
        cls, name: Optional[str], email: Optional[str], phone: Optional[str]
    ) -> Optional[Account]:
        """根据标识符查找账户。

        Args:
            name (str, optional): 用户名。
            email (str, optional): 邮箱地址。
            phone (str, optional): 手机号码。

        Returns:
            Account: 找到的账户对象，如果没找到则返回None。

        Raises:
            None
        """
        if name:
            return Account.query.filter_by(name=name).first()
        elif email:
            return Account.query.filter_by(email=email).first()
        elif phone:
            return Account.query.filter_by(phone=phone).first()
        return None

    @classmethod
    def authenticate_by_sms(cls, phone, code) -> Account:
        """通过短信进行认证"""
        account = Account.query.filter_by(phone=phone).first()

        if not account:
            raise CommonError("该手机号未注册")

        cls._common_authenticate_validate(account)
        return account

    @staticmethod
    def update_account_password(
        account: Account, password: str, new_password: str
    ) -> Account:
        """修改账号的密码。

        Args:
            account (Account): 账户对象。
            password (str): 当前密码。
            new_password (str): 新密码。

        Returns:
            Account: 更新后的账户对象。

        Raises:
            CommonError: 当原密码错误时抛出。
            ValueError: 当新密码为空时抛出。
        """
        # 验证原密码
        if account.password and not PasswordManager.verify_password(
            password, account.password, account.password_salt
        ):
            raise CommonError("原密码错误")

        # 生成新密码的加密信息
        hashed_password, salt = PasswordManager.hash_password_with_salt(new_password)
        account.password = hashed_password
        account.password_salt = salt

        try:
            db.session.commit()
            logger.info(f"用户 {account.id} 密码更新成功")
        except Exception as e:
            db.session.rollback()
            logger.error(f"密码更新失败: {e}")
            raise CommonError("密码更新失败")

        return account

    @staticmethod
    def create_account(
        name: str, email: str, phone: str, password: str, **kwargs
    ) -> Account:
        """创建账号。

        Args:
            name (str): 用户名。
            email (str): 邮箱地址。
            phone (str): 手机号码。
            password (str): 密码。
            **kwargs: 其他账户属性。

        Returns:
            Account: 创建成功的账户对象。

        Raises:
            CommonError: 当账户创建失败时抛出。
            ValueError: 当必需参数为空时抛出。
        """
        try:
            account = Account()
            account.email = email
            account.phone = phone or ""
            account.name = name

            # 设置其他属性
            for key, value in kwargs.items():
                setattr(account, key, value)

            # 设置密码
            if password is not None:
                hashed_password, salt = PasswordManager.hash_password_with_salt(
                    password
                )
                account.password = hashed_password
                account.password_salt = salt

            # 设置默认值
            account.interface_language = Constants.DEFAULT_LANGUAGE
            account.interface_theme = Constants.DEFAULT_THEME
            account.timezone = language_timezone_mapping.get(
                account.interface_language, Constants.DEFAULT_TIMEZONE
            )
            account.initialized_at = TimeTools.now_datetime_china()
            account.status = Constants.DEFAULT_STATUS

            db.session.add(account)
            db.session.commit()

            logger.info(f"账户创建成功: {account.id}")
            return account

        except Exception as e:
            db.session.rollback()
            logger.error(f"账户创建失败: {e}")
            raise CommonError(f"账户创建失败: {e}")

    @staticmethod
    def update_account(account: Account, **kwargs) -> Account:
        """更新账号字段。

        根据传入的关键字参数更新账户的相应字段。

        Args:
            account (Account): 要更新的账户对象。
            **kwargs: 要更新的字段及其值。

        Returns:
            Account: 更新后的账户对象。

        Raises:
            AttributeError: 当传入的字段名不存在时抛出。
            CommonError: 当数据库更新失败时抛出。
        """
        try:
            for key, value in kwargs.items():
                if hasattr(account, key):
                    setattr(account, key, value)
                else:
                    raise AttributeError(f"Invalid key: {key}")

            db.session.commit()
            logger.info(f"账户 {account.id} 信息更新成功")
            return account

        except Exception as e:
            db.session.rollback()
            logger.error(f"账户更新失败: {e}")
            raise CommonError(f"账户更新失败: {e}")

    @staticmethod
    def update_last_login(account, *, ip_address):
        """Update last login time and ip"""
        account.last_login_at = TimeTools.now_datetime_china()
        account.last_login_ip = ip_address or ""
        db.session.add(account)
        db.session.commit()

    @staticmethod
    def login(account: Account, *, ip_address: Optional[str] = None) -> str:
        """用户登录。

        Args:
            account (Account): 账户对象。
            ip_address (str, optional): 登录IP地址。

        Returns:
            str: 登录令牌。

        Raises:
            Exception: 当登录处理失败时抛出。
        """
        try:
            if ip_address:
                AccountService.update_last_login(account, ip_address=ip_address)

            token = AccountService.get_account_jwt_token(account)
            redis_client.set(
                _get_login_cache_key(account_id=account.id, token=token),
                "1",
                ex=Constants.LOGIN_TOKEN_EXPIRY_SECONDS,
            )

            logger.info(f"用户 {account.id} 登录成功")
            return token

        except Exception as e:
            logger.error(f"登录处理失败: {e}")
            raise

    @staticmethod
    def logout(*, account: Account, token: str):
        redis_client.delete(_get_login_cache_key(account_id=account.id, token=token))

    @staticmethod
    def load_logged_in_account(*, account_id: str, token: str):
        if not redis_client.get(
            _get_login_cache_key(account_id=account_id, token=token)
        ):
            return None
        return AccountService.load_user(account_id)

    @classmethod
    def send_reset_password_email(cls, account):
        if cls.reset_password_rate_limiter.is_rate_limited(account.email):
            raise CommonError(f"忘记密码邮件太频繁，请稍后重试: {account.email}")

        from tasks.mail_reset_password_task import \
            send_reset_password_mail_task

        token = TokenManager.generate_token(account, "reset_password")
        send_reset_password_mail_task.delay(
            language=account.interface_language, to=account.email, token=token
        )
        cls.reset_password_rate_limiter.increment_rate_limit(account.email)
        return token

    @classmethod
    def delete_reset_password_token(cls, token: str):
        TokenManager.revoke_token(token, "reset_password")

    @classmethod
    def get_reset_password_data(cls, token: str):
        return TokenManager.get_token_data(token, "reset_password")

    @staticmethod
    def link_account_integrate(provider: str, open_id: str, account: Account):
        """Link account integrate"""
        account_integrate = AccountIntegrate.query.filter_by(
            account_id=account.id, provider=provider
        ).first()
        if account_integrate:
            if account_integrate.open_id != open_id:
                account_integrate.open_id = open_id
                account_integrate.updated_at = datetime.now(timezone.utc).replace(
                    tzinfo=None
                )
                db.session.commit()
        else:
            AccountIntegrate.query.filter_by(
                provider=provider, open_id=open_id
            ).delete()  # 解绑以前的
            account_integrate = AccountIntegrate(
                account_id=account.id, provider=provider, open_id=open_id
            )
            db.session.add(account_integrate)
            db.session.commit()


class TenantService:

    @classmethod
    def init(cls, default_password):
        """初始化账号和租户"""
        super_id = Account.get_administrator_id()
        admin_id = Account.get_admin_id()
        default_tenant_id = Tenant.get_default_id()

        # 初始化超管
        administrator = Account.query.filter_by(id=super_id).first()
        if not administrator:
            administrator = AccountService.create_account(
                "administrator", "", "", default_password, id=super_id
            )
            cls.create_private_tenant(administrator)
        # 初始化所有租户的默认管理员
        admin = Account.query.filter_by(id=admin_id).first()
        if not admin:
            admin = AccountService.create_account(
                "admin", "", "", default_password, id=admin_id
            )
            cls.create_private_tenant(admin)
        # 所有的租户,默认加上admin作为管理员
        default_tenant = Tenant.query.filter_by(id=default_tenant_id).first()
        if not default_tenant:
            default_tenant = cls.create_tenant(
                "默认用户组", admin, id=default_tenant_id, gpu_quota=1000000, storage_quota=1000000
            )
        return default_tenant

    @classmethod
    def create_tenant(cls, name: str, account: Account, **kwargs) -> Tenant:
        """创建租户/用户组。

        Args:
            name (str): 租户名称。
            account (Account): 创建者账户。
            **kwargs: 其他租户属性。

        Returns:
            Tenant: 创建的租户对象。

        Raises:
            CommonError: 当租户创建失败时抛出。
        """
        try:
            default_status = kwargs.get("status", TenantStatus.NORMAL)

            # 设置默认配额
            storage_quota = Constants.DEFAULT_STORAGE_QUOTA
            gpu_quota = Constants.DEFAULT_GPU_QUOTA

            if default_status == TenantStatus.NORMAL:
                # 普通租户使用默认配额
                storage_quota = Constants.DEFAULT_STORAGE_QUOTA
                gpu_quota = Constants.DEFAULT_GPU_QUOTA

            tenant = Tenant(name=name)
            tenant.encrypt_public_key = ""
            tenant.status = default_status
            tenant.storage_quota = storage_quota
            tenant.gpu_quota = gpu_quota

            # 设置其他属性
            for key, value in kwargs.items():
                setattr(tenant, key, value)

            db.session.add(tenant)
            db.session.flush()
            db.session.commit()

            # 默认添加管理员（非私有租户）
            if tenant.status != TenantStatus.PRIVATE:
                admin_id = Account.get_admin_id()
                cls.update_tenant_member(tenant.id, admin_id, RoleTypes.ADMIN)

            logger.info(f"租户创建成功: {tenant.id}, 名称: {name}")
            return tenant

        except Exception as e:
            db.session.rollback()
            logger.error(f"租户创建失败: {e}")
            raise CommonError(f"租户创建失败: {e}")

    @classmethod
    def create_private_tenant(cls, account):
        """个人空间的ID 与用户ID 是相同的"""
        name = "内置空间" if account.is_administrator else "个人空间"
        # 设置个人空间的ID与账号ID一致, 方便理解
        tenant = cls.create_tenant(
            name, account, status=TenantStatus.PRIVATE, id=account.id
        )
        # Create new tenant member for invited tenant
        cls.update_tenant_member(tenant.id, account.id, RoleTypes.OWNER)
        cls.switch_tenant(account, tenant.id)

    @classmethod
    def update_tenant_member(cls, tenant_id, account_id, role):
        """添加关系"""
        ta = (
            db.session.query(TenantAccountJoin)
            .filter(
                TenantAccountJoin.tenant_id == tenant_id,
                TenantAccountJoin.account_id == account_id,
            )
            .first()
        )
        if ta:
            if ta.role != role:
                ta.role = role
                db.session.commit()
                return True
            else:
                return False
        else:
            ta = TenantAccountJoin(
                tenant_id=tenant_id, account_id=account_id, role=role
            )
            db.session.add(ta)
            db.session.commit()
            return True

    @classmethod
    def get_all_tenants(cls, args, operator, search_user):
        """获取整个系统中的租户
        如果 operator != None, 则只查询操作者所在的租户.
        如果 search_user != None, 还需要只过滤出该用户所在的租户.
        """
        filters = []
        filters.append(Tenant.status == TenantStatus.NORMAL)

        if not operator.is_super:
            # 查询当前用户可见的租户
            sub_queryset = (
                db.session.query(Tenant)
                .join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id)
                .where(*filters)
                .filter(TenantAccountJoin.account_id == operator.id)
            )
            can_see_ids = {t.id for t in sub_queryset}
            filters.append(Tenant.id.in_(can_see_ids))

        if args.get("search_name"):
            filters.append(Tenant.name.ilike(f"%{args['search_name']}%"))

        if search_user:
            filters.append(TenantAccountJoin.account_id == search_user.id)
            if search_user.is_super:
                # 查询管理员用户时，查询admin的租户，但是要把有owner的租户去掉，仅剩admin自建组
                remove_sub_queryset = (
                    db.session.query(Tenant)
                    .join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id)
                    .filter(TenantAccountJoin.role == RoleTypes.OWNER)
                )
                remove_ids = {t.id for t in remove_sub_queryset}
                filters.append(Tenant.id.notin_(remove_ids))
                filters.append(TenantAccountJoin.role == RoleTypes.ADMIN)
            else:
                # 查询非管理员用户时，只查询owner的租户
                filters.append(TenantAccountJoin.role == RoleTypes.OWNER)
        else:
            # 去重，否则会查到admin和owner两条记录
            filters.append(TenantAccountJoin.account_id == operator.id)

        queryset = (
            db.session.query(Tenant, TenantAccountJoin.role)
            .select_from(Tenant)
            .join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id)
            .where(*filters)
        )

        total = queryset.count()
        queryset = (
            queryset.order_by(Tenant.created_at.desc())
            .limit(args["limit"])
            .offset((args["page"] - 1) * args["limit"])
        )
        pagination = {
            "page": args["page"],
            "per_page": args["limit"],
            "total": total,
            "items": queryset,
            "has_next": args["page"] * args["limit"] < total,
        }

        ret_list = []
        for account, role in pagination["items"]:
            account.role = "super" if operator.is_super else role
            ret_list.append(account)

        pagination["items"] = ret_list
        return pagination

    @classmethod
    def get_account_tenants(cls, account, include_private=True):
        """获取账号加入的租户, 不需要翻页"""
        queryset = (
            db.session.query(Tenant, TenantAccountJoin.role)
            .select_from(Tenant)
            .join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id)
            .filter(TenantAccountJoin.account_id == account.id)
        )
        if not include_private:
            queryset = queryset.filter(Tenant.status == TenantStatus.NORMAL)

        queryset = queryset.order_by(Tenant.created_at.asc())

        ret_list = []
        for tenant, role in queryset:
            tenant.role = role
            ret_list.append(tenant)
        return ret_list

    @classmethod
    def switch_tenant(cls, account: Account, tenant_id):
        """切换用户的租户"""
        ta = (
            db.session.query(TenantAccountJoin)
            .join(Tenant, TenantAccountJoin.tenant_id == Tenant.id)
            .filter(
                TenantAccountJoin.account_id == account.id,
                TenantAccountJoin.tenant_id == tenant_id,
            )
            .first()
        )

        if not ta:
            raise CommonError("用户不在该组内")
        else:
            TenantAccountJoin.query.filter(
                TenantAccountJoin.account_id == account.id,
                TenantAccountJoin.tenant_id != tenant_id,
            ).update({"current": False})
            ta.current = True
            # Set the current tenant for the account
            account.current_tenant_id = ta.tenant_id
            db.session.commit()

    @classmethod
    def get_all_members(cls, args, tenant_id, only_self=None):
        """获取整个系统中所有的用户(除了administrator)
        如果 tenant_id != None, 则只查询该租户下的所有用户;
        """
        if only_self:
            queryset = db.session.query(Account).filter(Account.id == only_self)
        else:
            if tenant_id is None:
                queryset = db.session.query(Account).filter(
                    Account.id != Account.get_administrator_id()
                )
            else:
                queryset = (
                    db.session.query(Account, TenantAccountJoin.role)
                    .select_from(Account)
                    .join(TenantAccountJoin, Account.id == TenantAccountJoin.account_id)
                    .filter(TenantAccountJoin.tenant_id == tenant_id)
                    .filter(Account.id != Account.get_administrator_id())
                )

            if args.get("search_name"):
                queryset = queryset.filter(
                    Account.name.ilike(f"%{args['search_name']}%")
                )
            if args.get("search_email"):
                queryset = queryset.filter(
                    Account.email.ilike(f"%{args['search_email']}%")
                )
            if args.get("search_phone"):
                queryset = queryset.filter(
                    Account.phone.ilike(f"%{args['search_phone']}%")
                )

        queryset = queryset.order_by(Account.created_at.desc())
        total = queryset.count()
        pagination = {
            "page": args["page"],
            "per_page": args["limit"],
            "total": total,
            "items": queryset.limit(args["limit"]).offset(
                (args["page"] - 1) * args["limit"]
            ),
            "has_next": args["page"] * args["limit"] < total,
        }

        ret_list = []
        if tenant_id is None or only_self:
            for account in pagination["items"]:
                ret_list.append(account)
        else:
            for account, role in pagination["items"]:
                account.role = role
                ret_list.append(account)

        pagination["items"] = ret_list
        return pagination

    @classmethod
    def get_tenant_by_id(cls, tenant_id):
        return db.session.query(Tenant).filter_by(id=tenant_id).first()

    @classmethod
    def get_tenant_accounts_summary(cls, tenant_id):
        """获取租户下的用户统计数据"""

        def get_queryset(*args):
            role_list = args
            queryset = (
                db.session.query(Account, TenantAccountJoin.role)
                .select_from(Account)
                .join(TenantAccountJoin, Account.id == TenantAccountJoin.account_id)
                .filter(TenantAccountJoin.tenant_id == tenant_id)
                .filter(TenantAccountJoin.role.in_(role_list))
                # .filter(TenantAccountJoin.account_id.notin_(Account.get_super_ids()))
            )
            total = queryset.count()
            user_list = []
            for account, role in queryset.limit(3):
                user_list.append(account.name)
            return total, user_list

        result = {}
        total, user_list = get_queryset(RoleTypes.ADMIN)
        result["admin_users"] = {"total": total, "user_list": user_list}

        total, user_list = get_queryset(RoleTypes.NORMAL, RoleTypes.READONLY)
        result["normal_users"] = {"total": total, "user_list": user_list}

        total, user_list = get_queryset(RoleTypes.OWNER)
        if len(user_list) == 0:
            user_list.append("admin")
        result["owner_users"] = {"total": 1, "user_list": user_list}
        return result

    @classmethod
    def get_tenant_accounts(cls, tenant_id, filters=None):
        """获取租户下的用户列表"""
        queryset = (
            db.session.query(Account, TenantAccountJoin.role)
            .select_from(Account)
            .join(TenantAccountJoin, Account.id == TenantAccountJoin.account_id)
            .filter(TenantAccountJoin.tenant_id == tenant_id)
            .filter(Account.id != Account.get_administrator_id())
        )

        ret_list = []
        for account, role in queryset:
            if filters is not None:
                if role not in filters:
                    continue
            ret_list.append(
                {
                    "id": account.id,
                    "name": account.name,
                    "role": role,
                }
            )
        return ret_list

    @classmethod
    def check_tenant_storage(cls, current_user):
        if current_user.is_administrator:
            return True
        tenant = (
            db.session.query(Tenant)
            .filter_by(id=current_user.current_tenant_id)
            .first()
        )
        return tenant.is_space_available

    @classmethod
    def get_personal_space_resources(cls, account_id=None):
        """获取个人空间资源配置信息"""
        account = Account.default_getone(account_id)

        # 获取个人空间
        current_tenants = TenantAccountJoin.query.filter_by(account_id=account.id)
        # 获取current_tenant的tenant_id集合
        tenant_id_set = {ta.tenant_id for ta in current_tenants}
        personal_tenant = (
            db.session.query(Tenant)
            .filter(Tenant.id.in_(tenant_id_set), Tenant.status == TenantStatus.PRIVATE)
            .first()
        )

        if not personal_tenant:
            raise CommonError("个人空间不存在的")

        result = {
            "tenant_id": personal_tenant.id,
            "gpu_quota": personal_tenant.gpu_quota,
            "gpu_used": personal_tenant.gpu_used,
            "storage_quota": personal_tenant.storage_quota,
            "storage_used": round(
                personal_tenant.storage_used_bytes / 1024 / 1024 / 1024, 3
            ),  # 转换为GB
        }
        return result

    @classmethod
    def update_personal_space_gpu_quota(
        cls, *, gpu_quota, storage_quota, operator, tenant_id
    ):
        """更新个人空间的GPU配额
        Args:
            gpu_quota: GPU配额数量
            operator: 操作者（当前用户）
            account_id: 要修改的用户ID（可选）
        """
        if not operator.is_super:
            raise CommonError("只有超级管理员可以修改个人空间资源配额")

        # 根据tenant_id查询Tenant
        tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()

        if not tenant:
            raise CommonError("个人空间不存在")

        # 验证存储空间配额
        if (storage_quota * 1024 * 1024 * 1024) < tenant.storage_used_bytes:
            raise CommonError("存储配额不能小于已使用的存储空间")

        # 更新配额
        tenant.gpu_quota = gpu_quota
        tenant.storage_quota = storage_quota
        db.session.commit()

        return tenant


class QuotaService:
    def __init__(self, account):
        # 传入account的好处, 是后续如果业务改为需要租户ID, 不需要再修改大量函数入参
        self.user_id = account.id
        self.user_name = account.name
        self.tenant_id = account.current_tenant_id
        self.current_user = account

    def check_quota_request(self, data):
        filters = []
        if data.get("status"):
            filters.append(QuotaRequest.status == data.get("status"))
        if data.get("request_type"):
            filters.append(QuotaRequest.request_type == data.get("request_type"))
        if data.get("tenant_id"):
            filters.append(QuotaRequest.tenant_id == data.get("tenant_id"))

        cnt = db.session.query(QuotaRequest).filter(*filters).count()

        return cnt

    def create_quota_request(self, request_type, amount, reason, tenant_id, user_id):
        request = QuotaRequest(
            request_type=request_type,
            requested_amount=amount,
            reason=reason,
            tenant_id=tenant_id,
            account_id=user_id,
            status=QuotaStatus.PENDING,
        )
        db.session.add(request)
        db.session.commit()
        # 发送通知给管理员
        tenant = Tenant.query.filter_by(id=tenant_id).first()
        tenant_name = tenant.name if tenant else ""
        quota_type_display = (
            "存储配额" if request_type == QuotaType.STORAGE else "显卡配额"
        )
        msg = f"{self.user_name}申请{tenant_name}工作空间{quota_type_display}"
        NotificationService.create_notification(
            user_id=Account.get_admin_id(),
            source_id=request.id,
            module=NotificationModule.QUOTA_REQUEST,
            user_body=msg,
            # notify_user1_id=Account.get_admin_id(),  # 通知管理员
            # notify_user1_body=msg
        )

        return request

    def get_quota_requests(self, data):
        # 构建基础查询，关联QuotaRequest、Tenant和Account表
        query = (
            db.session.query(
                QuotaRequest,
                Tenant.name.label("tenant_name"),
                Account.name.label("account_name"),
            )
            .join(Tenant, Tenant.id == QuotaRequest.tenant_id)
            .join(Account, Account.id == QuotaRequest.account_id)
        )

        filters = []
        tenant_name = data.get("tenant_name")
        account_name = data.get("account_name")

        if data.get("request_type"):
            filters.append(QuotaRequest.request_type == data.get("request_type"))

        if tenant_name:
            filters.append(Tenant.name.ilike(f"%{tenant_name}%"))

        if account_name:
            filters.append(Account.name.ilike(f"%{account_name}%"))

        if data.get("status"):
            filters.append(QuotaRequest.status == data.get("status"))

        if filters:
            query = query.filter(*filters)

        query = query.order_by(QuotaRequest.created_at.desc())

        # 执行分页查询
        pagination = query.paginate(
            page=data["page"],
            per_page=data["page_size"],
            error_out=False,
        )

        # 转换结果格式
        results = []
        for quota_request, tenant_name, account_name in pagination.items:
            result = {
                "id": quota_request.id,
                "request_type": quota_request.request_type,
                "requested_amount": quota_request.requested_amount,
                "approved_amount": quota_request.approved_amount,
                "reason": quota_request.reason,
                "status": quota_request.status,
                "created_at": quota_request.created_at,
                "updated_at": quota_request.updated_at,
                "tenant_name": tenant_name,
                "account_name": account_name,
                "tenant_id": quota_request.tenant_id,
                "account_id": quota_request.account_id,
                "processed_at": quota_request.processed_at,
                "reject_reason": quota_request.reject_reason,
            }
            # 特殊处理官方账号
            # if quota_request.user_id == Account.get_administrator_id():
            # result['account_name'] = "Lazy LLM官方"
            results.append(result)

        return {
            "items": results,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "per_page": pagination.per_page,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
            "page": pagination.page,
        }

    def get_quota_request_detail(self, data):
        # 构建基础查询，关联QuotaRequest、TenantAccountJoin、Tenant和Account表
        query = (
            db.session.query(
                QuotaRequest,
                Tenant.name.label("tenant_name"),
                Account.name.label("account_name"),
            )
            .join(
                TenantAccountJoin, TenantAccountJoin.tenant_id == QuotaRequest.tenant_id
            )
            .join(Tenant, Tenant.id == TenantAccountJoin.tenant_id)
            .join(Account, Account.id == TenantAccountJoin.account_id)
        )

        filters = []
        filters.append(QuotaRequest.id == data.get("request_id"))

        if filters:
            query = query.filter(*filters)

        quota_data = query.first()
        if not quota_data:
            raise CommonError("申请记录不存在")
        quota_request = quota_data.QuotaRequest

        result = {
            "id": quota_request.id,
            "request_type": quota_request.request_type,
            "requested_amount": quota_request.requested_amount,
            "approved_amount": quota_request.approved_amount,
            "reason": quota_request.reason,
            "status": quota_request.status,
            "created_at": (
                quota_request.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if quota_request.created_at
                else None
            ),
            "updated_at": (
                quota_request.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                if quota_request.updated_at
                else None
            ),
            "tenant_name": quota_data.tenant_name,
            "account_name": quota_data.account_name,
            "tenant_id": quota_request.tenant_id,
            "account_id": quota_request.account_id,
            "processed_at": (
                quota_request.processed_at.strftime("%Y-%m-%d %H:%M:%S")
                if quota_request.processed_at
                else None
            ),
            "reject_reason": quota_request.reject_reason,
        }
        return result

    def approve_quota_request(self, request_id, approved_amount):
        request = QuotaRequest.query.get(request_id)
        if not request:
            raise ValueError("申请记录不存在")

        request.approved_amount = approved_amount
        request.status = QuotaStatus.APPROVED
        request.processed_at = TimeTools.now_datetime_china()
        quota_display = ""
        # 更新租户配额
        if request.request_type == QuotaType.STORAGE:
            self.update_tenant_quota(None, approved_amount, request.tenant_id)
            quota_display = f"{approved_amount}G存储"
        elif request.request_type == QuotaType.GPU:
            self.update_tenant_quota(approved_amount, None, request.tenant_id)
            quota_display = f"{approved_amount}张GPU配额"

        db.session.commit()

        # 清除自己对该条的未读通知
        NotificationService(self.current_user).inter_mark_as_read(
            source_id=request.id,
            user_id=self.user_id,
            module=NotificationModule.QUOTA_REQUEST,
        )
        # 如果申请者是管理员，则不再发送审批结果通知
        if request.account_id == Account.get_admin_id():
            return request

        # 发送回执通知给申请者
        tenant = Tenant.query.filter_by(id=request.tenant_id).first()
        tenant_name = tenant.name if tenant else ""
        msg = f"您的配额申请已审批通过，获得{tenant_name}工作空间的{quota_display}"
        NotificationService.create_notification(
            user_id=request.account_id,
            source_id=request.id,
            module=NotificationModule.QUOTA_REQUEST,
            user_body=msg,
        )
        # NotificationService.update_user_notification(
        #     user_id=request.account_id,
        #     source_id=request.id,
        #     source_type=NotificationModule.QUOTA_REQUEST,
        #     user_body=msg
        # )
        return request

    def reject_quota_request(self, request_id, reject_reason):
        request = QuotaRequest.query.get(request_id)
        if not request:
            raise ValueError("申请记录不存在")

        request.status = QuotaStatus.REJECTED
        request.reject_reason = reject_reason
        request.processed_at = TimeTools.now_datetime_china()
        db.session.commit()

        # 清除自己对该条的未读通知
        NotificationService(self.current_user).inter_mark_as_read(
            source_id=request.id,
            user_id=self.user_id,
            module=NotificationModule.QUOTA_REQUEST,
        )
        # 如果申请者是管理员，则不再发送审批结果通知
        if request.account_id == Account.get_admin_id():
            return request

        # 发送回执通知给申请者
        quota_display = "存储配额" if request == QuotaType.STORAGE else "显卡配额"
        tenant = Tenant.query.filter_by(id=request.tenant_id).first()
        tenant_name = tenant.name if tenant else ""
        msg = f"您{tenant_name}工作空间的{quota_display}申请已被驳回"
        NotificationService.create_notification(
            user_id=request.account_id,
            source_id=request.id,
            module=NotificationModule.QUOTA_REQUEST,
            user_body=msg,
        )
        # NotificationService.update_user_notification(
        #     user_id=request.account_id,
        #     source_id=request.id,
        #     source_type=NotificationModule.QUOTA_REQUEST,
        #     user_body=msg
        # )
        return request

    def get_space_resources(self, account_id, tenant_id):
        """获取工作空间资源配置信息"""
        tenant = db.session.query(Tenant).get(tenant_id)
        if not tenant:
            raise CommonError("工作空间不存在")

        result = {
            "tenant_id": tenant.id,
            "gpu_quota": tenant.gpu_quota,
            "gpu_used": tenant.gpu_used,
            "storage_quota": tenant.storage_quota,
            "storage_used": round(
                tenant.storage_used_bytes / 1024 / 1024 / 1024, 3
            ),  # 转换为GB
        }
        return result

    @classmethod
    def update_tenant_quota(
        cls, gpu_quota: Optional[int], storage_quota: Optional[int], tenant_id: str
    ) -> Tenant:
        """更新工作空间的配额。

        Args:
            gpu_quota (int, optional): GPU配额增量。
            storage_quota (int, optional): 存储空间配额增量（GB）。
            tenant_id (str): 工作空间ID。

        Returns:
            Tenant: 更新后的租户对象。

        Raises:
            CommonError: 当工作空间不存在或配额验证失败时抛出。
        """
        try:
            tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()
            if not tenant:
                raise CommonError("工作空间不存在")

            # 更新GPU配额
            if gpu_quota is not None:
                new_gpu_quota = tenant.gpu_quota + gpu_quota
                if new_gpu_quota < tenant.gpu_used:
                    raise CommonError("GPU配额不能小于已使用的GPU数量")
                tenant.gpu_quota = new_gpu_quota

            # 更新存储空间配额
            if storage_quota is not None:
                new_storage_quota = tenant.storage_quota + storage_quota
                storage_quota_bytes = storage_quota * Constants.BYTES_PER_GB
                if storage_quota_bytes < tenant.storage_used_bytes:
                    raise CommonError("存储配额不能小于已使用的存储空间")
                tenant.storage_quota = new_storage_quota

            db.session.commit()
            logger.info(f"租户 {tenant_id} 配额更新成功")
            return tenant

        except Exception as e:
            db.session.rollback()
            logger.error(f"配额更新失败: {e}")
            raise
