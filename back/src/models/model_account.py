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

import functools
import uuid
from enum import Enum

from flask_login import UserMixin
from sqlalchemy.sql import func

from models import StringUUID
from utils.util_database import db


class TenantStatus:
    NORMAL = "normal"
    PRIVATE = "private"  # 个人空间


class AccountStatus:
    ACTIVE = "active"
    BANNED = "banned"
    DELETED = "deleted"


class RoleTypes:
    ADMIN = "admin"  # 管理员: 对同组其他人的可读写、可删除
    OWNER = "owner"  # 创建者: 对同组其他人的可读写、可删除
    NORMAL = "normal"  # 对同组其他人的可读写、不可删
    READONLY = "readonly"  # 对同组其他人的只读

    @staticmethod
    def can_be_set(role):
        return role in (
            "admin",
            "normal",
            "readonly",
        )


class Account(UserMixin, db.Model):
    __tablename__ = "accounts"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="account_pkey"),
        db.Index("account_name_idx", "name"),
        db.Index("account_email_idx", "email"),
        db.Index("account_phone_idx", "phone"),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(255), nullable=True)
    password = db.Column(db.String(255), nullable=True)
    password_salt = db.Column(db.String(255), nullable=True)
    avatar = db.Column(db.String(255))
    interface_language = db.Column(db.String(255))
    timezone = db.Column(db.String(255))
    last_login_at = db.Column(db.DateTime)
    last_login_ip = db.Column(db.String(255))
    last_active_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    status = db.Column(
        db.String(16), nullable=False, server_default=db.text("'active'")
    )
    initialized_at = db.Column(db.DateTime)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )

    @property
    def safe_phone(self):
        if self.phone:
            return self.phone[0:3] + "******" + self.phone[-2:]
        return ""

    @classmethod
    def default_getone(cls, account_id):
        account = db.session.get(cls, account_id)
        if account is None:
            raise ValueError("该用户不存在")
        return account

    @classmethod
    def get_administrator_id(cls):
        return "00000000-0000-0000-0000-000000000000"

    @classmethod
    def get_admin_id(cls):
        return "00000000-0000-0000-0000-000000000001"

    @classmethod
    def get_super_ids(cls):
        return (
            cls.get_administrator_id(),
            cls.get_admin_id(),
        )

    @property
    def is_banned(self):
        return self.status in [AccountStatus.BANNED, AccountStatus.DELETED]

    @property
    def is_super(self):
        """是否超级管理员"""
        return self.id in self.__class__.get_super_ids()

    @property
    def is_administrator(self):
        return self.id == self.__class__.get_administrator_id()

    @property
    def is_admin(self):
        return self.id == self.__class__.get_admin_id()

    def get_role_in_tenant(self, tenant_id):
        ta = (
            db.session.query(TenantAccountJoin)
            .filter_by(tenant_id=tenant_id, account_id=self.id)
            .first()
        )
        return ta.role if ta else None

    def can_admin_in_tenant(self, tenant_id):
        """是否当前租户管理员(包括创建者)"""
        return self.get_role_in_tenant(tenant_id) in (RoleTypes.OWNER, RoleTypes.ADMIN)

    def can_write_in_tenant(self, tenant_id):
        """对组内资源可读写"""
        return self.get_role_in_tenant(tenant_id) in (
            RoleTypes.OWNER,
            RoleTypes.ADMIN,
            RoleTypes.NORMAL,
        )

    @property
    def current_tenant(self):
        return self._current_tenant

    @current_tenant.setter
    def current_tenant(self, value):
        tenant = value
        ta = TenantAccountJoin.query.filter_by(
            tenant_id=tenant.id, account_id=self.id
        ).first()
        if ta:
            tenant.current_role = ta.role
        else:
            tenant = None
        self._current_tenant = tenant

    @property
    def current_tenant_id(self):
        return self.current_tenant.id

    @current_tenant_id.setter
    def current_tenant_id(self, value: str):
        try:
            tenant_account_join = (
                db.session.query(Tenant, TenantAccountJoin)
                .filter(Tenant.id == value)
                .filter(TenantAccountJoin.tenant_id == Tenant.id)
                .filter(TenantAccountJoin.account_id == self.id)
                .one_or_none()
            )

            if tenant_account_join:
                tenant, ta = tenant_account_join
                tenant.current_role = ta.role
            else:
                tenant = None
        except Exception:
            tenant = None
        self._current_tenant = tenant

    @functools.cached_property
    def private_tenant(self):
        return (
            db.session.query(Tenant)
            .join(TenantAccountJoin, Tenant.id == TenantAccountJoin.tenant_id)
            .filter(TenantAccountJoin.account_id == self.id)
            .filter(Tenant.status == TenantStatus.PRIVATE)
            .first()
        )

    @property
    def current_role(self):
        if self.current_tenant:
            return self.current_tenant.current_role
        return None

    @classmethod
    def get_by_openid(cls, provider: str, open_id: str):
        account_integrate = (
            db.session.query(AccountIntegrate)
            .filter(
                AccountIntegrate.provider == provider,
                AccountIntegrate.open_id == open_id,
            )
            .one_or_none()
        )
        if account_integrate:
            return (
                db.session.query(Account)
                .filter(Account.id == account_integrate.account_id)
                .one_or_none()
            )
        return None


class Tenant(db.Model):
    __tablename__ = "tenants"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="tenant_pkey"),)

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    encrypt_public_key = db.Column(db.Text)
    plan = db.Column(db.String(255), nullable=False, server_default=db.text("'basic'"))
    status = db.Column(
        db.String(255), nullable=False, server_default=db.text("'normal'")
    )
    custom_config = db.Column(db.Text)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    storage_quota = db.Column(
        db.Integer, nullable=False, server_default="0"
    )  # 新增字段：存储配额
    storage_used_bytes = db.Column(
        db.BigInteger, nullable=False, server_default="0"
    )  # 存储字节数   # 新增字段：已使用存储空间
    # 算力配额
    gpu_quota = db.Column(
        db.Integer, nullable=False, server_default="0", comment="GPU算力配额(张)"
    )
    gpu_used = db.Column(
        db.Integer, nullable=False, server_default="0", comment="已使用GPU算力(张)"
    )
    enable_ai = db.Column(db.Boolean, nullable=False, default=False)  # 是否启用AI能力

    @classmethod
    def get_default_id(cls):
        return "00000000-0000-0000-0000-000000000010"

    def get_accounts(self) -> list[Account]:
        return (
            db.session.query(Account)
            .filter(
                Account.id == TenantAccountJoin.account_id,
                TenantAccountJoin.tenant_id == self.id,
            )
            .all()
        )

    def get_admin_accounts(self) -> list[Account]:
        return (
            db.session.query(Account)
            .filter(
                Account.id == TenantAccountJoin.account_id,
                TenantAccountJoin.tenant_id == self.id,
                TenantAccountJoin.role.in_([RoleTypes.OWNER, RoleTypes.ADMIN]),
            )
            .all()
        )

    def get_normal_accounts(self) -> list[Account]:
        return (
            db.session.query(Account)
            .filter(
                Account.id == TenantAccountJoin.account_id,
                TenantAccountJoin.tenant_id == self.id,
                TenantAccountJoin.role.in_([RoleTypes.NORMAL, RoleTypes.READONLY]),
            )
            .all()
        )

    # 计算存储使用量（GB）
    @property
    def storage_used(self):
        return round(
            self.storage_used_bytes / 1024 / 1024 / 1024, 3
        )  # 转换为 GB，保留三位小数

    # 计算存储配额转换为字节数
    @property
    def storage_quota_bytes(self):
        return self.storage_quota * 1024 * 1024 * 1024  # 转换为字节数

    # 判断是否有足够空间
    @property
    def is_space_available(self):
        return (
            self.storage_quota_bytes > self.storage_used_bytes
        )  # 判断存储配额是否大于已使用空间

    # 判断gpu是否足够
    def check_gpu_available(self, add_count):
        if self.gpu_quota and self.gpu_quota > 0:
            if self.gpu_used + add_count > self.gpu_quota:
                if self.status == TenantStatus.PRIVATE:
                    name = "个人空间"
                else:
                    name = "组内"
                raise ValueError(
                    f"{name}已消耗{self.gpu_used}张显卡,当前再无余额。请联系超级管理员开放更多资源。"
                )

    # 保存已使用的存储
    @classmethod
    def save_used_storage(cls, tenant_id, used_bytes):
        tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()
        if tenant:
            tenant.storage_used_bytes += used_bytes
            db.session.commit()

    # 还原已使用的存储
    @classmethod
    def restore_used_storage(cls, tenant_id, used_bytes):
        tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()
        if tenant:
            tenant.storage_used_bytes -= used_bytes
            tenant.storage_used_bytes = max(0, tenant.storage_used_bytes)
            db.session.commit()

    # 数据过滤或增强等，会操作原文件，所以需要更新已使用的存储
    @classmethod
    def update_used_storage(cls, tenant_id, before_used_bytes, after_used_bytes):
        tenant = db.session.query(Tenant).filter_by(id=tenant_id).first()
        if tenant:
            tenant.storage_used_bytes -= before_used_bytes
            tenant.storage_used_bytes = max(0, tenant.storage_used_bytes)
            tenant.storage_used_bytes += after_used_bytes
            db.session.commit()

    # 计算剩余GPU配额
    @property
    def gpu_quota_available(self):
        return self.gpu_quota - self.gpu_used if self.gpu_quota else 0

    # 检查GPU配额是否足够，并返回详细信息
    def check_gpu_quota(self, required_gpus):
        if not self.gpu_quota or self.gpu_quota <= 0:
            raise ValueError(
                f"当前组内/个人空间已消耗{self.gpu_used}张显卡，无GPU算力配额。请联系超级管理员开放更多资源。"
            )

        if self.gpu_used + required_gpus > self.gpu_quota:
            remaining = self.gpu_quota - self.gpu_used
            raise ValueError(
                f"当前组内/个人空间已消耗{self.gpu_used}张显卡，仅剩{remaining}张可用，不足{required_gpus}张。请联系超级管理员开放更多资源。"
            )

    # GPU使用量增加
    @classmethod
    def increment_gpu_usage(cls, tenant_id, gpu_count):
        tenant = db.session.query(cls).filter_by(id=tenant_id).first()
        if tenant:
            tenant.check_gpu_quota(gpu_count)  # 先检查配额
            tenant.gpu_used += gpu_count
            db.session.commit()

    # GPU使用量减少
    @classmethod
    def decrement_gpu_usage(cls, tenant_id, gpu_count):
        tenant = db.session.query(cls).filter_by(id=tenant_id).first()
        if tenant:
            tenant.gpu_used = max(0, tenant.gpu_used - gpu_count)  # 确保不会出现负数
            db.session.commit()


class TenantAccountJoin(db.Model):
    __tablename__ = "tenant_account_joins"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="tenant_account_join_pkey"),
        db.Index("tenant_account_join_account_id_idx", "account_id"),
        db.Index("tenant_account_join_tenant_id_idx", "tenant_id"),
        db.UniqueConstraint(
            "tenant_id", "account_id", name="unique_tenant_account_join"
        ),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(StringUUID, nullable=False)
    account_id = db.Column(StringUUID, nullable=False)
    current = db.Column(db.Boolean, nullable=False, server_default=db.text("0"))
    role = db.Column(db.String(16), nullable=False, server_default="normal")
    invited_by = db.Column(StringUUID, nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP")
    )


class Cooperation(db.Model):
    __tablename__ = "cooperation"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="cooperation_pkey"),
        db.Index("cooperation_tenant_id_idx", "tenant_id"),
        db.Index("cooperation_created_by_idx", "created_by"),
    )

    class Types(str, Enum):
        KNOWLEDGE = "knowledgebase"  # 知识库
        DATASET = "dataset"  # 数据集
        APP = "app"  # 应用

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    target_type = db.Column(db.String(16), nullable=False)
    target_id = db.Column(db.String(40), nullable=False)

    enable = db.Column(db.Boolean, nullable=False, default=False)  # 是否启用
    accounts = db.Column(db.Text, nullable=True)
    tenant_id = db.Column(StringUUID, nullable=False)
    created_by = db.Column(StringUUID, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())

    @property
    def accounts_as_list(self):
        return self.accounts.split(",") if self.accounts else []

    def set_accounts(self, accounts):
        self.accounts = ",".join(accounts or [])


class AccountIntegrate(db.Model):
    __tablename__ = "account_integrates"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="account_integrate_pkey"),
        db.UniqueConstraint("account_id", "provider", name="unique_account_provider"),
        db.UniqueConstraint("provider", "open_id", name="unique_provider_open_id"),
    )

    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    account_id = db.Column(StringUUID, nullable=False)
    provider = db.Column(db.String(16), nullable=False)
    open_id = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class QuotaType:
    STORAGE = "storage"
    GPU = "gpu"


class QuotaStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class QuotaRequest(db.Model):
    __tablename__ = "quota_requests"
    __table_args__ = (db.PrimaryKeyConstraint("id", name="quota_requests_pkey"),)
    id = db.Column(StringUUID, default=lambda: str(uuid.uuid4()))
    request_type = db.Column(db.String(20), comment="'storage' or 'gpu'")  # 申请类型
    requested_amount = db.Column(
        db.Integer, comment="申请配额(gpu单位张，存储单位GB)"
    )  # 申请配额
    approved_amount = db.Column(
        db.Integer, comment="批准配额(gpu单位张，存储单位GB)"
    )  # 批准配额
    reason = db.Column(db.Text, comment="申请理由")  # 申请理由
    tenant_id = db.Column(StringUUID, comment="工作区ID")  # 外键，关联到工作区
    account_id = db.Column(StringUUID, comment="申请人ID")  # 外键，关联到用户
    status = db.Column(
        db.String(20),
        default="pending",
        comment="状态：pending/approved/rejected/expired",
    )  # 状态
    created_at = db.Column(
        db.DateTime, default=func.now(), comment="创建时间"
    )  # 创建时间
    updated_at = db.Column(
        db.DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )  # 更新时间
    processed_at = db.Column(db.DateTime, comment="处理时间")  # 处理时间
    reject_reason = db.Column(db.Text, comment="驳回理由")  # 驳回理由

    # tenant = db.relationship('Tenant', backref='quota_requests', comment='关联的工作区')
    # account = db.relationship('Account', backref='quota_requests', comment='关联的申请人')
